const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/sync/export — Dump all database tables to JSON
router.get('/export', (req, res) => {
  try {
    const data = {
      admin: db.prepare('SELECT * FROM admin').all(),
      coaching_profile: db.prepare('SELECT * FROM coaching_profile').all(),
      boards: db.prepare('SELECT * FROM boards').all(),
      grade_scales: db.prepare('SELECT * FROM grade_scales').all(),
      standards: db.prepare('SELECT * FROM standards').all(),
      subjects: db.prepare('SELECT * FROM subjects').all(),
      students: db.prepare('SELECT * FROM students').all(),
      marks: db.prepare('SELECT * FROM marks').all(),
      test_cycles: db.prepare('SELECT * FROM test_cycles').all(),
      tests: db.prepare('SELECT * FROM tests').all(),
      test_marks: db.prepare('SELECT * FROM test_marks').all(),
      fee_payments: db.prepare('SELECT * FROM fee_payments').all(),
      result_card_settings: db.prepare('SELECT * FROM result_card_settings').all(),
      school_exams: db.prepare('SELECT * FROM school_exams').all()
    };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/import — Wipe and restore database from JSON
router.post('/import', (req, res) => {
  const data = req.body;
  if (!data) return res.status(400).json({ error: 'No data provided' });

  try {
    const importTransaction = db.transaction(() => {
      // Clear tables in dependency order
      const tables = [
        'school_exams', 'result_card_settings', 'fee_payments', 'test_marks',
        'tests', 'test_cycles', 'marks', 'students', 'subjects', 'standards',
        'grade_scales', 'boards', 'coaching_profile', 'admin'
      ];
      
      tables.forEach(t => {
        try {
          db.prepare(`DELETE FROM ${t}`).run();
        } catch (e) {
          // Table might not exist or be locked; ignore safe errors
        }
      });

      const insertRow = (table, row) => {
        const keys = Object.keys(row);
        const placeholders = keys.map(() => '?').join(', ');
        const columns = keys.join(', ');
        const stmt = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);
        stmt.run(...keys.map(k => row[k]));
      };

      if (Array.isArray(data.admin)) data.admin.forEach(r => insertRow('admin', r));
      if (Array.isArray(data.coaching_profile)) data.coaching_profile.forEach(r => insertRow('coaching_profile', r));
      if (Array.isArray(data.boards)) data.boards.forEach(r => insertRow('boards', r));
      if (Array.isArray(data.grade_scales)) data.grade_scales.forEach(r => insertRow('grade_scales', r));
      if (Array.isArray(data.standards)) data.standards.forEach(r => insertRow('standards', r));
      if (Array.isArray(data.subjects)) data.subjects.forEach(r => insertRow('subjects', r));
      if (Array.isArray(data.students)) data.students.forEach(r => insertRow('students', r));
      if (Array.isArray(data.marks)) data.marks.forEach(r => insertRow('marks', r));
      if (Array.isArray(data.test_cycles)) data.test_cycles.forEach(r => insertRow('test_cycles', r));
      if (Array.isArray(data.tests)) data.tests.forEach(r => insertRow('tests', r));
      if (Array.isArray(data.test_marks)) data.test_marks.forEach(r => insertRow('test_marks', r));
      if (Array.isArray(data.fee_payments)) data.fee_payments.forEach(r => insertRow('fee_payments', r));
      if (Array.isArray(data.result_card_settings)) data.result_card_settings.forEach(r => insertRow('result_card_settings', r));
      if (Array.isArray(data.school_exams)) data.school_exams.forEach(r => insertRow('school_exams', r));
    });

    importTransaction();
    logActivity('DB_SYNC_RESTORE', 'Database restored and synchronized successfully');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
