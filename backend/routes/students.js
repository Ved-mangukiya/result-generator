const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/students?standard_id=X&search=Y
router.get('/', (req, res) => {
  const { standard_id, search } = req.query;
  let query = `SELECT s.*, st.display_name as standard_name, b.short_name as board_short
    FROM students s 
    JOIN standards st ON s.standard_id = st.id
    JOIN boards b ON st.board_id = b.id`;
  const params = [];

  if (standard_id) {
    query += ' WHERE s.standard_id = ?';
    params.push(standard_id);
    if (search) {
      query += ' AND (s.name LIKE ? OR s.roll_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
  } else if (search) {
    query += ' WHERE (s.name LIKE ? OR s.roll_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY s.roll_number ASC';
  const students = db.prepare(query).all(...params);
  res.json(students);
});

// GET /api/students/:id
router.get('/:id', (req, res) => {
  const student = db.prepare(`SELECT s.*, st.display_name as standard_name, st.stream, 
    b.name as board_name, b.short_name as board_short, b.id as board_id
    FROM students s 
    JOIN standards st ON s.standard_id = st.id 
    JOIN boards b ON st.board_id = b.id
    WHERE s.id = ?`).get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// POST /api/students
router.post('/', (req, res) => {
  const { standard_id, name, roll_number, father_name, mother_name, dob, remarks, attendance_pct } = req.body;
  if (!standard_id || !name || !roll_number) return res.status(400).json({ error: 'standard_id, name, roll_number required' });

  // Check duplicate roll in same standard
  const existing = db.prepare('SELECT id FROM students WHERE standard_id = ? AND roll_number = ?').get(standard_id, roll_number);
  if (existing) return res.status(409).json({ error: `Roll number ${roll_number} already exists in this class` });

  const result = db.prepare(`INSERT INTO students (standard_id, name, roll_number, father_name, mother_name, dob, remarks, attendance_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(standard_id, name, roll_number, father_name || '', mother_name || '', dob || '', remarks || '', attendance_pct || null);
  
  logActivity('STUDENT_ADD', `Student added: ${name} (Roll: ${roll_number})`);
  res.json({ success: true, id: result.lastInsertRowid });
});

// PUT /api/students/:id
router.put('/:id', (req, res) => {
  const { name, roll_number, father_name, mother_name, dob, remarks, attendance_pct, standard_id } = req.body;
  
  // Check roll number conflict (exclude self)
  const existing = db.prepare('SELECT id FROM students WHERE standard_id = ? AND roll_number = ? AND id != ?').get(standard_id, roll_number, req.params.id);
  if (existing) return res.status(409).json({ error: `Roll number ${roll_number} already exists in this class` });

  db.prepare(`UPDATE students SET name=?, roll_number=?, father_name=?, mother_name=?, dob=?, remarks=?, attendance_pct=?, standard_id=?
    WHERE id=?`).run(name, roll_number, father_name || '', mother_name || '', dob || '', remarks || '', attendance_pct || null, standard_id, req.params.id);
  
  logActivity('STUDENT_UPDATE', `Student updated: ${name}`);
  res.json({ success: true });
});

// DELETE /api/students/:id
router.delete('/:id', (req, res) => {
  const student = db.prepare('SELECT name, roll_number FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  logActivity('STUDENT_DELETE', `Student deleted: ${student.name} (Roll: ${student.roll_number})`);
  res.json({ success: true });
});

// GET /api/students/:id/marks
router.get('/:id/marks', (req, res) => {
  const marks = db.prepare(`SELECT m.*, s.name as subject_name, s.max_marks, s.marks_type, s.internal_max, s.external_max, s.is_compulsory
    FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ?`).all(req.params.id);
  res.json(marks);
});

// POST /api/students/:id/marks — batch upsert marks
router.post('/:id/marks', (req, res) => {
  const { marks } = req.body; // array of { subject_id, total_marks, internal_marks, external_marks, is_absent }
  if (!Array.isArray(marks)) return res.status(400).json({ error: 'marks must be array' });

  const upsert = db.prepare(`INSERT INTO marks (student_id, subject_id, total_marks, internal_marks, external_marks, is_absent)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, subject_id) DO UPDATE SET
      total_marks = excluded.total_marks,
      internal_marks = excluded.internal_marks,
      external_marks = excluded.external_marks,
      is_absent = excluded.is_absent`);

  const doUpsert = db.transaction(() => {
    for (const m of marks) {
      upsert.run(req.params.id, m.subject_id, m.total_marks ?? null, m.internal_marks ?? null, m.external_marks ?? null, m.is_absent ? 1 : 0);
    }
  });
  doUpsert();
  logActivity('MARKS_SAVE', `Marks saved for student ID ${req.params.id}`);
  res.json({ success: true });
});

// GET /api/students/:id/result — computed result
router.get('/:id/result', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const standard = db.prepare(`SELECT s.*, b.id as board_id_val FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?`).get(student.standard_id);
  const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(student.standard_id);
  const marksRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(student.id);
  const marksMap = {};
  marksRows.forEach(m => { marksMap[m.subject_id] = m; });

  const { calculateStudentResult } = require('../services/gradeService');
  const result = calculateStudentResult(student, subjects, marksMap, standard.board_id_val);
  res.json(result);
});

module.exports = router;
