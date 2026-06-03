const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { HOLIDAYS } = require('../utils/holidays');

// GET /api/calendar-notes
// Returns all custom notes, holidays, school exams, coaching tests, and test cycles ranges
router.get('/', (req, res) => {
  try {
    const notes = db.prepare('SELECT * FROM calendar_notes').all();

    const schoolExams = db.prepare(`
      SELECT se.id, se.standard_id, se.exam_name, se.exam_date, s.name as subject_name, std.display_name as standard_name, se.cycle_id
      FROM school_exams se
      JOIN subjects s ON se.subject_id = s.id
      JOIN standards std ON se.standard_id = std.id
      WHERE se.exam_date IS NOT NULL AND se.exam_date != ''
    `).all();

    const coachingTests = db.prepare(`
      SELECT t.id, t.standard_id, t.name, t.test_date, s.name as subject_name, std.display_name as standard_name, t.cycle_id
      FROM tests t
      JOIN subjects s ON t.subject_id = s.id
      JOIN standards std ON t.standard_id = std.id
      WHERE t.test_date IS NOT NULL AND t.test_date != ''
    `).all();

    const testCycles = db.prepare(`
      SELECT tc.id, tc.standard_id, tc.title, std.display_name as standard_name,
             MIN(t.test_date) as start_date, MAX(t.test_date) as end_date,
             COUNT(t.id) as test_count
      FROM test_cycles tc
      JOIN standards std ON tc.standard_id = std.id
      JOIN tests t ON t.cycle_id = tc.id
      WHERE t.test_date IS NOT NULL AND t.test_date != ''
      GROUP BY tc.id
    `).all();

    res.json({
      success: true,
      notes,
      holidays: HOLIDAYS,
      schoolExams,
      coachingTests,
      testCycles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar-notes
// Add, edit or delete a note for a specific date
router.post('/', (req, res) => {
  const { date, content } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const cleanedDate = date.trim();
  const cleanedContent = content ? content.trim() : '';

  try {
    if (!cleanedContent) {
      // If content is empty, delete note
      db.prepare('DELETE FROM calendar_notes WHERE note_date = ?').run(cleanedDate);
      res.json({ success: true, message: 'Note deleted' });
    } else {
      // Upsert note (insert or replace)
      db.prepare(`
        INSERT INTO calendar_notes (note_date, content) 
        VALUES (?, ?)
        ON CONFLICT(note_date) DO UPDATE SET content = excluded.content
      `).run(cleanedDate, cleanedContent);
      res.json({ success: true, message: 'Note saved' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
