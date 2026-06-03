const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/school-exams
router.get('/', (req, res) => {
  const { standard_id } = req.query;
  try {
    let exams;
    if (standard_id) {
      exams = db.prepare(`
        SELECT se.*, s.name as subject_name, std.display_name as standard_name
        FROM school_exams se
        JOIN subjects s ON se.subject_id = s.id
        JOIN standards std ON se.standard_id = std.id
        WHERE se.standard_id = ?
        ORDER BY se.exam_date ASC
      `).all(standard_id);
    } else {
      exams = db.prepare(`
        SELECT se.*, s.name as subject_name, std.display_name as standard_name
        FROM school_exams se
        JOIN subjects s ON se.subject_id = s.id
        JOIN standards std ON se.standard_id = std.id
        ORDER BY se.exam_date ASC
      `).all();
    }
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/school-exams
router.post('/', (req, res) => {
  const { standard_id, subject_id, exam_name, exam_date, cycle_id } = req.body;
  if (!standard_id || !subject_id || !exam_name || !exam_date) {
    return res.status(400).json({ error: 'standard_id, subject_id, exam_name, and exam_date are required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO school_exams (standard_id, subject_id, exam_name, exam_date, cycle_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(standard_id, subject_id, exam_name, exam_date, cycle_id || null);

    const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(standard_id);
    const sub = db.prepare('SELECT name FROM subjects WHERE id = ?').get(subject_id);
    logActivity('SCHOOL_EXAM_CREATE', `Added school exam "${exam_name}" for ${std ? std.display_name : 'Class'} (${sub ? sub.name : 'Subject'}) on ${exam_date}`);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/school-exams/:id
router.delete('/:id', (req, res) => {
  try {
    const exam = db.prepare('SELECT exam_name FROM school_exams WHERE id = ?').get(req.params.id);
    if (!exam) return res.status(404).json({ error: 'School exam not found' });

    db.prepare('DELETE FROM school_exams WHERE id = ?').run(req.params.id);
    logActivity('SCHOOL_EXAM_DELETE', `Deleted school exam: ${exam.exam_name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
