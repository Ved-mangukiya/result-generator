const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

/**
 * POST /api/reset
 * Body: { categories: ['test_marks', 'tests', 'exam_marks', 'students', 'standards', 'all'] }
 */
router.post('/', (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'categories array is required' });
  }

  const valid = ['test_marks', 'tests', 'exam_marks', 'students', 'standards', 'all'];
  const invalid = categories.filter(c => !valid.includes(c));
  if (invalid.length) {
    return res.status(400).json({ error: `Invalid categories: ${invalid.join(', ')}` });
  }

  const deleted = {};

  try {
    const doReset = db.transaction(() => {
      const isAll = categories.includes('all');

      // Full factory reset
      if (isAll) {
        deleted.test_marks = db.prepare('DELETE FROM test_marks').run().changes;
        deleted.test_cycles = db.prepare('DELETE FROM test_cycles').run().changes;
        deleted.tests = db.prepare('DELETE FROM tests').run().changes;
        deleted.marks = db.prepare('DELETE FROM marks').run().changes;
        deleted.students = db.prepare('DELETE FROM students').run().changes;
        deleted.subjects = db.prepare('DELETE FROM subjects').run().changes;
        deleted.grade_scales = db.prepare('DELETE FROM grade_scales').run().changes;
        deleted.standards = db.prepare('DELETE FROM standards').run().changes;
        deleted.boards = db.prepare('DELETE FROM boards').run().changes;
        deleted.result_card_settings = db.prepare('DELETE FROM result_card_settings').run().changes;
        deleted.fee_payments = db.prepare('DELETE FROM fee_payments').run().changes;
        deleted.activity_log = db.prepare('DELETE FROM activity_log').run().changes;
        
        // Reset coaching profile to un-onboarded state
        db.prepare('DELETE FROM coaching_profile').run();
        db.prepare(`INSERT INTO coaching_profile (id, name, tagline, address, phone, website, primary_color, onboarding_complete)
                    VALUES (1, '', '', '', '', '', '#7a6130', 0)`).run();
        deleted.coaching_profile = 1;
        return;
      }

      // Selective resets — order matters (delete children before parents)
      if (categories.includes('test_marks')) {
        deleted.test_marks = db.prepare('DELETE FROM test_marks').run().changes;
      }

      if (categories.includes('tests')) {
        if (!categories.includes('test_marks')) {
          deleted.test_marks = db.prepare('DELETE FROM test_marks').run().changes;
        }
        deleted.test_cycles = db.prepare('DELETE FROM test_cycles').run().changes;
        deleted.tests = db.prepare('DELETE FROM tests').run().changes;
      }

      if (categories.includes('exam_marks')) {
        deleted.exam_marks = db.prepare('DELETE FROM marks').run().changes;
      }

      if (categories.includes('students')) {
        // Cascade: marks, test_marks, fee_payments all deleted via FK CASCADE
        deleted.students = db.prepare('DELETE FROM students').run().changes;
        deleted.result_card_settings = db.prepare('DELETE FROM result_card_settings').run().changes;
      }

      if (categories.includes('standards')) {
        // Cascade deletes students, subjects, marks, tests, test_cycles, result_card_settings
        deleted.standards = db.prepare('DELETE FROM standards').run().changes;
        deleted.grade_scales = db.prepare('DELETE FROM grade_scales').run().changes;
      }
    });

    doReset();

    const summary = Object.entries(deleted)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ');

    logActivity('DATA_RESET', `Admin performed data reset: ${categories.join(', ')} — removed: ${summary || 'no rows'}`);

    res.json({
      success: true,
      message: `Reset complete. Removed: ${summary || 'nothing'}`,
      deleted
    });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Reset failed: ' + err.message });
  }
});

module.exports = router;
