const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, logActivity } = require('../db/database');

// Helper to safely clear files in a directory
function clearDirectoryFiles(dirPath, allowedExtensions = null, keepFiles = []) {
  try {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) continue;
      if (keepFiles.includes(file)) continue;
      if (!allowedExtensions || allowedExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }
  } catch (e) {
    console.error(`Error clearing directory ${dirPath}:`, e.message);
  }
}

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
    const isAll = categories.includes('all');

    // 1. If full factory reset, create exactly 1 emergency pre-reset backup in data/
    if (isAll) {
      const dataDir = path.join(__dirname, '../../data');
      const backupsDir = path.join(__dirname, '../../backups');
      const exportsDir = path.join(__dirname, '../../exports');
      const uploadsDir = path.join(__dirname, '../../uploads');

      try {
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        // Collect all data before wipe
        const dump = {
          reset_at: new Date().toISOString(),
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
          school_exams: db.prepare('SELECT * FROM school_exams').all(),
          batches: db.prepare('SELECT * FROM batches').all(),
          calendar_notes: db.prepare('SELECT * FROM calendar_notes').all(),
          attendance: db.prepare('SELECT * FROM attendance').all(),
          reminders: db.prepare('SELECT * FROM reminders').all()
        };

        const backupFileName = 'backup_pre_reset.json';
        const backupFilePath = path.join(dataDir, backupFileName);
        fs.writeFileSync(backupFilePath, JSON.stringify(dump, null, 2), 'utf8');

        // Delete all old json / txt files in data/ except the 1 latest backup
        clearDirectoryFiles(dataDir, ['.json'], [backupFileName]);

        // Clean out backups folder and exports folder
        clearDirectoryFiles(backupsDir);
        clearDirectoryFiles(exportsDir);

        // Delete all uploaded images across all upload subdirectories
        const uploadSubdirs = ['logos', 'signatures', 'photos', 'imports'];
        uploadSubdirs.forEach(sub => {
          clearDirectoryFiles(path.join(uploadsDir, sub));
        });
      } catch (err) {
        console.error('Error during pre-reset file cleanup:', err);
      }
    }

    // 2. Perform database transaction reset
    const doReset = db.transaction(() => {
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
        deleted.attendance = db.prepare('DELETE FROM attendance').run().changes;
        deleted.reminders = db.prepare('DELETE FROM reminders').run().changes;
        deleted.batches = db.prepare('DELETE FROM batches').run().changes;
        deleted.school_exams = db.prepare('DELETE FROM school_exams').run().changes;
        deleted.calendar_notes = db.prepare('DELETE FROM calendar_notes').run().changes;
        deleted.activity_log = db.prepare('DELETE FROM activity_log').run().changes;
        
        try { db.prepare('DELETE FROM timetable').run(); } catch(e) {}
        try { db.prepare('DELETE FROM timetable_configs').run(); } catch(e) {}
        try { db.prepare('DELETE FROM teacher_subject_assignments').run(); } catch(e) {}
        try { db.prepare('DELETE FROM teachers').run(); } catch(e) {}

        // Reset coaching profile to un-onboarded state
        db.prepare('DELETE FROM coaching_profile').run();
        db.prepare(`INSERT INTO coaching_profile (id, name, tagline, logo_path, signature_path, address, phone, website, primary_color, onboarding_complete)
                    VALUES (1, '', '', '', '', '', '', '', '#7a6130', 0)`).run();
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
        deleted.attendance = db.prepare('DELETE FROM attendance').run().changes;
        
        // Clean uploaded student photos
        const photosDir = path.join(__dirname, '../../uploads/photos');
        clearDirectoryFiles(photosDir);
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
      message: `Reset complete. Removed: ${summary || 'everything'}. Single pre-reset backup saved in data/backup_pre_reset.json.`,
      backup_file: isAll ? 'data/backup_pre_reset.json' : null,
      deleted
    });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Reset failed: ' + err.message });
  }
});

module.exports = router;
