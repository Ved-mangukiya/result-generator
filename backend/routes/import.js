const express = require('express');
const router = express.Router();
const path = require('path');
const { db } = require('../db/database');
const { parseFilePreview, importStudentsFromExcel } = require('../services/excelService');

// POST /api/import/parse — upload file and get column preview
router.post('/parse', (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = parseFilePreview(req.file.path);
    res.json({ ...result, file_path: req.file.path });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

// POST /api/import/execute — execute import with column mapping
router.post('/execute', (req, res) => {
  const { file_path, standard_id, mapping } = req.body;
  if (!file_path || !standard_id || !mapping) {
    return res.status(400).json({ error: 'file_path, standard_id, and mapping required' });
  }

  try {
    const result = importStudentsFromExcel(file_path, parseInt(standard_id), mapping);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// GET /api/import/dashboard-stats
router.get('/dashboard-stats', (req, res) => {
  const totalBoards = db.prepare('SELECT COUNT(*) as count FROM boards').get().count;
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  const totalStandards = db.prepare('SELECT COUNT(*) as count FROM standards').get().count;

  const standards = db.prepare(`SELECT s.id, s.display_name, b.id as board_id FROM standards s JOIN boards b ON s.board_id = b.id`).all();
  const classStats = standards.map(std => {
    const students = db.prepare('SELECT * FROM students WHERE standard_id = ?').all(std.id);
    const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(std.id);
    const { calculateStudentResult } = require('../services/gradeService');

    let passCount = 0, failCount = 0, distCount = 0;
    for (const student of students) {
      const marksRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(student.id);
      const marksMap = {};
      marksRows.forEach(m => { marksMap[m.subject_id] = m; });
      const result = calculateStudentResult(student, subjects, marksMap, std.board_id);
      if (result.finalStatus === 'Fail') failCount++;
      else if (result.finalStatus === 'Distinction') { distCount++; passCount++; }
      else passCount++;
    }

    return { standard_id: std.id, standard_name: std.display_name, total: students.length, pass: passCount, fail: failCount, distinction: distCount };
  });

  const recentActivity = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10').all();

  res.json({ totalBoards, totalStudents, totalStandards, classStats, recentActivity });
});

module.exports = router;
