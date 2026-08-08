const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');
const { recalculateOverallMarksForClass } = require('../services/gradeService');

// GET /api/students?standard_id=X&batch_id=Y&search=Z&status=W
router.get('/', (req, res) => {
  const { standard_id, batch_id, search, status } = req.query;
  let query = `SELECT s.*, st.display_name as standard_name, b.short_name as board_short, bt.name as batch_name
    FROM students s 
    JOIN standards st ON s.standard_id = st.id
    JOIN boards b ON st.board_id = b.id
    LEFT JOIN batches bt ON s.batch_id = bt.id`;
  const params = [];
  const clauses = [];

  if (standard_id) {
    clauses.push('s.standard_id = ?');
    params.push(standard_id);
    if (batch_id && batch_id !== '' && batch_id !== 'null' && batch_id !== 'undefined') {
      clauses.push('s.batch_id = ?');
      params.push(batch_id);
    }
  }
  if (search) {
    clauses.push('(s.name LIKE ? OR s.roll_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  // Filter by status (default to Active if not specified)
  if (status) {
    if (status !== 'all') {
      clauses.push('s.status = ?');
      params.push(status);
    }
  } else {
    clauses.push('s.status = ?');
    params.push('Active');
  }

  if (clauses.length > 0) {
    query += ' WHERE ' + clauses.join(' AND ');
  }

  query += ' ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.roll_number ASC';
  const students = db.prepare(query).all(...params);
  res.json(students);
});

// POST /api/students/graduate-bulk
router.post('/graduate-bulk', (req, res) => {
  const { standard_id } = req.body;
  if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });

  try {
    let query = `UPDATE students SET status = 'Completed' WHERE status = 'Active'`;
    const params = [];
    if (standard_id !== 'all') {
      query += ` AND standard_id = ?`;
      params.push(standard_id);
    }

    const stmt = db.prepare(query);
    const result = stmt.run(...params);

    let logMsg = `Graduated ${result.changes} students in bulk`;
    if (standard_id !== 'all') {
      const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(standard_id);
      logMsg += ` for class ${std ? std.display_name : standard_id}`;
    }
    logActivity('STUDENTS_GRADUATE', logMsg);

    res.json({ success: true, count: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/next-roll?standard_id=X
router.get('/next-roll', (req, res) => {
  const { standard_id } = req.query;
  if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });
  
  try {
    const students = db.prepare('SELECT roll_number FROM students WHERE standard_id = ?').all(standard_id);
    let maxRoll = 0;
    for (const s of students) {
      const val = parseInt(s.roll_number);
      if (!isNaN(val) && val > maxRoll) {
        maxRoll = val;
      }
    }
    res.json({ next_roll: String(maxRoll + 1) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/resequence — Resequence roll numbers alphabetically by name
router.post('/resequence', (req, res) => {
  const { standard_id } = req.body;
  if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });

  try {
    const students = db.prepare('SELECT id, name FROM students WHERE standard_id = ? ORDER BY name COLLATE NOCASE').all(standard_id);
    const update = db.prepare('UPDATE students SET roll_number = ? WHERE id = ?');
    const runTransaction = db.transaction(() => {
      students.forEach((s, idx) => {
        update.run(String(idx + 1), s.id);
      });
    });
    runTransaction();

    const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(standard_id);
    logActivity('ROLL_RESEQUENCE', `Resequenced roll numbers for ${std ? std.display_name : 'Class ID ' + standard_id} alphabetically`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  let { standard_id, batch_id, first_name, father_name, surname, name, roll_number, mother_name, dob, remarks, attendance_pct, admission_date, status, total_fees, elective_subjects } = req.body;
  if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });

  // Handle new format (first_name, father_name, surname) or legacy name field
  let firstName = (first_name || '').trim();
  let fatherName = (father_name || '').trim();
  let surName = (surname || '').trim();

  // If old 'name' field is provided, parse it
  if (name && (!firstName || !surName)) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 3) {
      firstName = firstName || parts[0];
      fatherName = fatherName || parts.slice(1, -1).join(' ');
      surName = surName || parts[parts.length - 1];
    } else if (parts.length === 2) {
      firstName = firstName || parts[0];
      surName = surName || parts[1];
    } else if (parts.length === 1) {
      firstName = firstName || parts[0];
    }
  }

  if (!firstName) return res.status(400).json({ error: 'First name is required' });

  // Capitalize first letter of each name part
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  firstName = capitalize(firstName);
  if (fatherName) fatherName = fatherName.split(' ').map(capitalize).join(' ');
  if (surName) surName = capitalize(surName);
  
  // Build full name in format: FirstName FatherName Surname (with spaces, not dots)
  const fullName = [firstName, fatherName, surName].filter(Boolean).join(' ');

  let roll = roll_number;
  if (!roll) {
    try {
      const students = db.prepare('SELECT roll_number FROM students WHERE standard_id = ?').all(standard_id);
      let maxRoll = 0;
      for (const s of students) {
        const val = parseInt(s.roll_number);
        if (!isNaN(val) && val > maxRoll) {
          maxRoll = val;
        }
      }
      roll = String(maxRoll + 1);
    } catch (e) {
      roll = '1';
    }
  }

  // Check duplicate roll in same standard
  const existing = db.prepare('SELECT id FROM students WHERE standard_id = ? AND roll_number = ?').get(standard_id, roll);
  if (existing) return res.status(409).json({ error: `Roll number ${roll} already exists in this class` });

  const bcrypt = require('bcryptjs');
  const parentHash = bcrypt.hashSync('parent123', 10);

  const result = db.prepare(`INSERT INTO students (standard_id, batch_id, first_name, father_name, surname, name, roll_number, mother_name, dob, remarks, attendance_pct, admission_date, status, total_fees, elective_subjects, parent_username, parent_password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      standard_id, batch_id || null, firstName, fatherName, surName, fullName, roll, mother_name || '', dob || '', remarks || '', attendance_pct || 100,
      admission_date || '', status || 'Active', parseFloat(total_fees) || 0, JSON.stringify(elective_subjects || []), roll, parentHash
    );
  
  try {
    recalculateOverallMarksForClass(parseInt(standard_id));
  } catch(e) {
    console.error('Error recalculating overall marks on insert:', e);
  }
  
  const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(standard_id);
  logActivity('STUDENT_ADD', `Enrolled student ${fullName} (Roll: ${roll}) in ${std ? std.display_name : 'Class'}`);
  res.json({ 
    success: true, 
    id: result.lastInsertRowid, 
    credentials: { username: roll, password: 'parent123' } 
  });
});

// PUT /api/students/:id
router.put('/:id', (req, res) => {
  let { first_name, father_name, surname, name, roll_number, mother_name, dob, remarks, attendance_pct, standard_id, batch_id, admission_date, status, total_fees, elective_subjects } = req.body;
  
  const existingStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!existingStudent) return res.status(404).json({ error: 'Student not found' });

  // Handle fallback for partial updates
  if (first_name === undefined) first_name = existingStudent.first_name;
  if (father_name === undefined) father_name = existingStudent.father_name;
  if (surname === undefined) surname = existingStudent.surname;
  if (name === undefined) name = existingStudent.name;
  if (roll_number === undefined) roll_number = existingStudent.roll_number;
  if (mother_name === undefined) mother_name = existingStudent.mother_name;
  if (dob === undefined) dob = existingStudent.dob;
  if (remarks === undefined) remarks = existingStudent.remarks;
  if (attendance_pct === undefined) attendance_pct = existingStudent.attendance_pct;
  if (standard_id === undefined) standard_id = existingStudent.standard_id;
  if (batch_id === undefined) batch_id = existingStudent.batch_id;
  if (admission_date === undefined) admission_date = existingStudent.admission_date;
  if (status === undefined) status = existingStudent.status;
  if (total_fees === undefined) total_fees = existingStudent.total_fees;
  if (elective_subjects === undefined) {
    try {
      elective_subjects = typeof existingStudent.elective_subjects === 'string'
        ? JSON.parse(existingStudent.elective_subjects)
        : (existingStudent.elective_subjects || []);
    } catch (e) {
      elective_subjects = [];
    }
  }

  // Handle new format (first_name, father_name, surname) or legacy name field
  let firstName = (first_name || '').trim();
  let fatherName = (father_name || '').trim();
  let surName = (surname || '').trim();

  // If old 'name' field is provided, parse it
  if (name && (!firstName || !surName)) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 3) {
      firstName = firstName || parts[0];
      fatherName = fatherName || parts.slice(1, -1).join(' ');
      surName = surName || parts[parts.length - 1];
    } else if (parts.length === 2) {
      firstName = firstName || parts[0];
      surName = surName || parts[1];
    } else if (parts.length === 1) {
      firstName = firstName || parts[0];
    }
  }

  if (!firstName) return res.status(400).json({ error: 'First name is required' });

  // Capitalize first letter of each name part
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  firstName = capitalize(firstName);
  if (fatherName) fatherName = fatherName.split(' ').map(capitalize).join(' ');
  if (surName) surName = capitalize(surName);
  
  // Build full name in format: FirstName FatherName Surname (with spaces, not dots)
  const fullName = [firstName, fatherName, surName].filter(Boolean).join(' ');

  // Check roll number conflict (exclude self)
  const existing = db.prepare('SELECT id FROM students WHERE standard_id = ? AND roll_number = ? AND id != ?').get(standard_id, roll_number, req.params.id);
  if (existing) return res.status(409).json({ error: `Roll number ${roll_number} already exists in this class` });

  db.prepare(`UPDATE students SET first_name=?, father_name=?, surname=?, name=?, roll_number=?, mother_name=?, dob=?, remarks=?, attendance_pct=?, standard_id=?, batch_id=?, admission_date=?, status=?, total_fees=?, elective_subjects=?
    WHERE id=?`).run(
      firstName, fatherName, surName, fullName, roll_number, mother_name || '', dob || '', remarks || '', attendance_pct || null, standard_id, batch_id || null,
      admission_date || '', status || 'Active', parseFloat(total_fees) || 0, JSON.stringify(elective_subjects || []), req.params.id
    );
  
  try {
    recalculateOverallMarksForClass(parseInt(standard_id));
  } catch(e) {
    console.error('Error recalculating overall marks on update:', e);
  }
  
  logActivity('STUDENT_UPDATE', `Student updated: ${fullName}`);
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
  const student = db.prepare('SELECT s.name, std.display_name FROM students s JOIN standards std ON s.standard_id = std.id WHERE s.id = ?').get(req.params.id);
  logActivity('MARKS_SAVE', `Saved exam marks for ${student ? student.name : 'Unknown Student'} (${student ? student.display_name : 'Class'})`);
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
