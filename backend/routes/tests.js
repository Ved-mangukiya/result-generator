const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const { db, logActivity } = require('../db/database');
const { getPassMark, isStudentEnrolled, recalculateOverallMarksForClass } = require('../services/gradeService');

function findMatchingCycleId(standardId, testName, explicitCycleId = null) {
  if (explicitCycleId !== undefined && explicitCycleId !== null && explicitCycleId !== '') {
    return parseInt(explicitCycleId);
  }
  try {
    const cycles = db.prepare('SELECT id, title FROM test_cycles WHERE standard_id = ?').all(standardId);
    const sortedCycles = cycles.sort((a, b) => b.title.length - a.title.length);
    const normalizedName = testName.toLowerCase();
    for (const cycle of sortedCycles) {
      const normalizedTitle = cycle.title.toLowerCase();
      if (normalizedName.includes(normalizedTitle) || normalizedTitle.includes(normalizedName)) {
        return cycle.id;
      }
    }
  } catch (e) {
    console.error('Error auto-matching cycle:', e);
  }
  return null;
}

// Multer storage for test imports
const importsDir = path.join(__dirname, '../../uploads/imports');
if (!fs.existsSync(importsDir)) fs.mkdirSync(importsDir, { recursive: true });

const upload = multer({
  dest: importsDir,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// GET /api/tests — List all tests for a standard
router.get('/', (req, res) => {
  const { standard_id, batch_id } = req.query;
  if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });

  try {
    let query = `
      SELECT t.*, s.name as subject_name, bt.name as batch_name,
             (SELECT COUNT(*) FROM test_marks tm WHERE tm.test_id = t.id) as marks_count
      FROM tests t 
      JOIN subjects s ON t.subject_id = s.id 
      LEFT JOIN batches bt ON t.batch_id = bt.id
      WHERE t.standard_id = ? 
    `;
    const params = [standard_id];

    if (batch_id && batch_id !== '' && batch_id !== 'null' && batch_id !== 'undefined') {
      query += ` AND (t.batch_id = ? OR t.batch_id IS NULL) `;
      params.push(batch_id);
    }

    query += ` ORDER BY t.test_date DESC, t.created_at DESC`;
    
    const tests = db.prepare(query).all(...params);
    const todayStr = new Date().toISOString().split('T')[0];
    const enrichedTests = tests.map(t => {
      let status = t.status;
      const isPast = t.test_date && t.test_date !== '' && t.test_date <= todayStr;
      if (t.marks_count > 0 || isPast) {
        status = 'Completed';
      }
      return { ...t, status };
    });
    res.json(enrichedTests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests — Create a new test
router.post('/', (req, res) => {
  const { standard_id, batch_id, subject_id, name, max_marks, test_date, syllabus, exam_mode, status, notice_generated, cycle_id } = req.body;
  if (!standard_id || !subject_id || !name || !max_marks) {
    return res.status(400).json({ error: 'standard_id, subject_id, name, and max_marks are required' });
  }

  try {
    const matched_cycle_id = findMatchingCycleId(standard_id, name, cycle_id);
    const result = db.prepare(`
      INSERT INTO tests (standard_id, batch_id, subject_id, name, max_marks, test_date, syllabus, exam_mode, status, notice_generated, cycle_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      standard_id, 
      batch_id || null,
      subject_id, 
      name, 
      parseFloat(max_marks), 
      test_date || null,
      syllabus || '',
      exam_mode || 'Offline',
      status || 'Scheduled',
      notice_generated ? 1 : 0,
      matched_cycle_id
    );

    const testId = result.lastInsertRowid;

    // Log activity
    const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(standard_id);
    logActivity('TEST_CREATE', `Created test "${name}" for ${std ? std.display_name : 'Class ID ' + standard_id}`);

    res.json({ success: true, id: testId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/bulk — Bulk create tests
router.post('/bulk', (req, res) => {
  const { tests } = req.body;
  if (!Array.isArray(tests) || tests.length === 0) {
    return res.status(400).json({ error: 'tests array is required and cannot be empty' });
  }

  try {
    const insertTest = db.prepare(`
      INSERT INTO tests (standard_id, batch_id, subject_id, name, max_marks, test_date, syllabus, exam_mode, status, notice_generated, cycle_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const createdIds = [];

    const runTransaction = db.transaction(() => {
      for (const t of tests) {
        const { standard_id, batch_id, subject_id, name, max_marks, test_date, syllabus, exam_mode, status, notice_generated, cycle_id } = t;
        const matched_cycle_id = findMatchingCycleId(standard_id, name, cycle_id);
        const result = insertTest.run(
          standard_id,
          batch_id || null,
          subject_id,
          name,
          parseFloat(max_marks) || 100,
          test_date || null,
          syllabus || '',
          exam_mode || 'Offline',
          status || 'Scheduled',
          notice_generated ? 1 : 0,
          matched_cycle_id
        );
        createdIds.push(result.lastInsertRowid);
      }
    });

    runTransaction();

    if (tests.length > 0) {
      const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(tests[0].standard_id);
      logActivity('TEST_BULK_CREATE', `Bulk created ${tests.length} tests for ${std ? std.display_name : 'Class'}`);
    }

    res.json({ success: true, count: tests.length, ids: createdIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tests/:id — Update a test's metadata
router.put('/:id', (req, res) => {
  const { name, max_marks, test_date, subject_id, syllabus, exam_mode, status, notice_generated, cycle_id, batch_id } = req.body;
  if (!name || !max_marks || !subject_id) {
    return res.status(400).json({ error: 'name, max_marks, and subject_id are required' });
  }

  try {
    const currentTest = db.prepare('SELECT standard_id FROM tests WHERE id = ?').get(req.params.id);
    const standard_id = currentTest ? currentTest.standard_id : null;
    const matched_cycle_id = standard_id ? findMatchingCycleId(standard_id, name, cycle_id) : null;

    db.prepare(`
      UPDATE tests 
      SET name = ?, max_marks = ?, test_date = ?, subject_id = ?, syllabus = ?, exam_mode = ?, status = ?, notice_generated = ?, cycle_id = ?, batch_id = ?
      WHERE id = ?
    `).run(
      name, 
      parseFloat(max_marks), 
      test_date || null, 
      subject_id, 
      syllabus || '',
      exam_mode || 'Offline',
      status || 'Scheduled',
      notice_generated ? 1 : 0,
      matched_cycle_id,
      batch_id || null,
      req.params.id
    );

    if (standard_id) {
      recalculateOverallMarksForClass(standard_id);
    }

    const test = db.prepare('SELECT t.name, s.display_name FROM tests t JOIN standards s ON t.standard_id = s.id WHERE t.id = ?').get(req.params.id);
    logActivity('TEST_UPDATE', `Updated test "${test ? test.name : 'Unknown'}" for ${test ? test.display_name : 'Unknown'}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tests/:id — Delete a test and cascading marks
router.delete('/:id', (req, res) => {
  try {
    const test = db.prepare('SELECT name, standard_id FROM tests WHERE id = ?').get(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    db.prepare('DELETE FROM tests WHERE id = ?').run(req.params.id);

    if (test.standard_id) {
      recalculateOverallMarksForClass(test.standard_id);
    }

    logActivity('TEST_DELETE', `Deleted test: ${test.name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/:id/marks — Get student list & marks for grid entry
router.get('/:id/marks', (req, res) => {
  try {
    const test = db.prepare(`
      SELECT t.*, s.is_compulsory, s.name as subject_name 
      FROM tests t 
      JOIN subjects s ON t.subject_id = s.id 
      WHERE t.id = ?
    `).get(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const marks = db.prepare(`
      SELECT s.id as student_id, s.name as student_name, s.roll_number, s.elective_subjects,
             tm.obtained_marks, tm.is_absent, tm.remarks
      FROM students s
      LEFT JOIN test_marks tm ON s.id = tm.student_id AND tm.test_id = ?
      WHERE s.standard_id = ? AND (? IS NULL OR s.batch_id = ?)
      ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.roll_number ASC
    `).all(req.params.id, test.standard_id, test.batch_id, test.batch_id);

    const todayStr = new Date().toISOString().split('T')[0];
    const marksCount = marks.filter(m => m.obtained_marks !== null && m.obtained_marks !== undefined).length;
    const isPast = test.test_date && test.test_date !== '' && test.test_date <= todayStr;
    if (marksCount > 0 || isPast) {
      test.status = 'Completed';
    }

    res.json({ test, marks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/:id/marks — Batch save test marks
router.post('/:id/marks', (req, res) => {
  const { marks } = req.body; // array of { student_id, obtained_marks, is_absent, remarks }
  if (!Array.isArray(marks)) return res.status(400).json({ error: 'marks must be an array' });

  try {
    const upsert = db.prepare(`
      INSERT INTO test_marks (test_id, student_id, obtained_marks, is_absent, remarks)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(test_id, student_id) DO UPDATE SET
        obtained_marks = excluded.obtained_marks,
        is_absent = excluded.is_absent,
        remarks = excluded.remarks
    `);

    const runTransaction = db.transaction(() => {
      for (const m of marks) {
        upsert.run(
          parseInt(req.params.id),
          m.student_id,
          m.is_absent ? null : (m.obtained_marks !== '' && m.obtained_marks !== null ? parseFloat(m.obtained_marks) : null),
          m.is_absent ? 1 : 0,
          m.remarks || ''
        );
      }
    });

    runTransaction();
    const test = db.prepare('SELECT t.name, t.standard_id, s.display_name FROM tests t JOIN standards s ON t.standard_id = s.id WHERE t.id = ?').get(req.params.id);
    if (test && test.standard_id) {
      recalculateOverallMarksForClass(test.standard_id);
    }
    logActivity('TEST_MARKS_SAVE', `Saved marks for test "${test ? test.name : 'Unknown'}" (${test ? test.display_name : 'Unknown'})`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/:id/export/excel — Export test results to Excel
router.get('/:id/export/excel', (req, res) => {
  try {
    const test = db.prepare(`
      SELECT t.*, s.is_compulsory, s.name as subject_name, std.display_name as standard_name 
      FROM tests t 
      JOIN subjects s ON t.subject_id = s.id 
      JOIN standards std ON t.standard_id = std.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const coaching = db.prepare('SELECT name FROM coaching_profile').get() || {};
    const rawMarks = db.prepare(`
      SELECT s.name as student_name, s.roll_number, s.elective_subjects, tm.obtained_marks, tm.is_absent, tm.remarks
      FROM students s
      LEFT JOIN test_marks tm ON s.id = tm.student_id AND tm.test_id = ?
      WHERE s.standard_id = ? AND (? IS NULL OR s.batch_id = ?)
      ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.roll_number ASC
    `).all(req.params.id, test.standard_id, test.batch_id, test.batch_id);

    const marks = rawMarks.filter(m => isStudentEnrolled(m, test.subject_id, test.is_compulsory));

    // Calculate Ranks & pass rate
    const scoredStudents = marks.map(m => {
      const pct = m.is_absent ? 0 : (m.obtained_marks || 0) / test.max_marks * 100;
      return { ...m, pct };
    }).sort((a,b) => b.pct - a.pct);

    const rankMap = {};
    scoredStudents.forEach((s, idx) => {
      rankMap[s.roll_number] = s.is_absent ? '-' : idx + 1;
    });

    const headers = ['Rank', 'Roll No.', 'Student Name', 'Marks Obtained', 'Out of', 'Percentage (%)', 'Status', 'Remarks'];
    const rows = [
      [`${coaching.name || 'Coaching Institute'} — Test Marks Sheet`],
      [`Class: ${test.standard_name} | Subject: ${test.subject_name}`],
      [`Test Name: ${test.name} | Max Marks: ${test.max_marks} | Date: ${test.test_date || '-'}`],
      [],
      headers
    ];

    marks.forEach(m => {
      const status = m.is_absent 
        ? 'Absent' 
        : (m.obtained_marks !== null && (m.obtained_marks / test.max_marks * 100 >= 35) ? 'Pass' : 'Fail');
      const pct = m.is_absent 
        ? '—' 
        : (m.obtained_marks !== null ? ((m.obtained_marks / test.max_marks) * 100).toFixed(1) + '%' : '—');
      
      rows.push([
        rankMap[m.roll_number] || '-',
        m.roll_number,
        m.student_name,
        m.is_absent ? 'AB' : (m.obtained_marks ?? '—'),
        test.max_marks,
        pct,
        status,
        m.remarks || ''
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Marks');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');

    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
    const stdClean = (test.standard_name || '').replace(/[^a-zA-Z0-9]/g, '_');
    const testClean = test.name.replace(/[^a-zA-Z0-9]/g, '_');
    const downloadFilename = `${coachingClean}_${stdClean}_${testClean}_TestMarks_${dateStr}_${timeStr}.xlsx`;
    const outputPath = path.join(__dirname, '../../exports', downloadFilename);

    XLSX.writeFile(workbook, outputPath);
    res.download(outputPath, downloadFilename, (err) => {
      if (err) console.error('Excel export error:', err);
      try { fs.unlinkSync(outputPath); } catch(e) {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/:id/export/pdf — Export test results class sheet to PDF
router.get('/:id/export/pdf', async (req, res) => {
  try {
    const test = db.prepare(`
      SELECT t.*, s.is_compulsory, s.name as subject_name, std.display_name as standard_name, std.board_id
      FROM tests t 
      JOIN subjects s ON t.subject_id = s.id 
      JOIN standards std ON t.standard_id = std.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const coaching = db.prepare('SELECT * FROM coaching_profile').get() || {};
    const rawMarks = db.prepare(`
      SELECT s.name as student_name, s.roll_number, s.elective_subjects, tm.obtained_marks, tm.is_absent, tm.remarks
      FROM students s
      LEFT JOIN test_marks tm ON s.id = tm.student_id AND tm.test_id = ?
      WHERE s.standard_id = ? AND (? IS NULL OR s.batch_id = ?)
      ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.roll_number ASC
    `).all(req.params.id, test.standard_id, test.batch_id, test.batch_id);

    const marks = rawMarks.filter(m => isStudentEnrolled(m, test.subject_id, test.is_compulsory));

    // Calculate Stats
    const passMarkPct = 35; // Default passing limit for small tests
    let totalScored = 0;
    let passCount = 0;
    let failCount = 0;
    let absentCount = 0;
    let topScorer = { name: '—', marks: 0 };

    const scoredStudents = marks.map(m => {
      const obtained = m.obtained_marks || 0;
      const isAbsent = m.is_absent === 1;
      const pct = isAbsent ? 0 : (obtained / test.max_marks * 100);
      
      if (isAbsent) {
        absentCount++;
      } else {
        totalScored++;
        if (pct >= passMarkPct) passCount++;
        else failCount++;

        if (obtained > topScorer.marks) {
          topScorer = { name: m.student_name, marks: obtained };
        }
      }
      return { ...m, pct, isAbsent, obtained };
    }).sort((a,b) => b.pct - a.pct);

    const rankMap = {};
    scoredStudents.forEach((s, idx) => {
      rankMap[s.roll_number] = s.isAbsent ? '-' : idx + 1;
    });

    const avgMarks = totalScored > 0
      ? (scoredStudents.reduce((sum, s) => sum + (s.isAbsent ? 0 : s.obtained), 0) / totalScored).toFixed(1)
      : 0;
    const passRate = totalScored > 0 ? Math.round((passCount / totalScored) * 100) : 0;

    let logoSrc = '';
    if (coaching.logo_path && fs.existsSync(path.join(__dirname, '../../', coaching.logo_path))) {
      const logoData = fs.readFileSync(path.join(__dirname, '../../', coaching.logo_path));
      const ext = path.extname(coaching.logo_path).slice(1).toLowerCase();
      logoSrc = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${logoData.toString('base64')}`;
    }

    // Build beautiful HTML report
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #0f172a; padding: 15mm; }
        
        .report-container { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
        .top-bar { height: 8px; background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899); width: 100%; }
        
        .header { display: flex; align-items: center; justify-content: space-between; padding: 6mm 8mm; border-bottom: 1px solid #e2e8f0; background: #ffffff; }
        .header-left { display: flex; align-items: center; gap: 4mm; }
        .coaching-logo { width: 50px; height: 50px; object-fit: contain; border-radius: 8px; }
        .logo-placeholder { width: 50px; height: 50px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
        .coaching-info { display: flex; flex-direction: column; }
        .coaching-name { font-size: 1.25rem; font-weight: 800; color: #1e293b; letter-spacing: -0.025em; }
        .coaching-contact { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
        
        .test-title-section { text-align: right; }
        .test-title { font-size: 1.1rem; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
        .test-meta { font-size: 0.8rem; color: #475569; font-weight: 500; }
        .test-date { font-size: 0.75rem; color: #94a3b8; }

        .stats-ribbon { display: flex; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 4mm 8mm; justify-content: space-between; }
        .stat-item { display: flex; flex-direction: column; }
        .stat-val { font-size: 1.1rem; font-weight: 800; color: #0f172a; }
        .stat-label { font-size: 0.65rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; }
        
        .table-container { padding: 0 8mm 8mm 8mm; }
        .marks-table { width: 100%; border-collapse: collapse; margin-top: 6mm; font-size: 0.8rem; }
        .marks-table th { background: #f8fafc; color: #475569; padding: 3mm; text-align: left; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e1; }
        .marks-table td { padding: 2.5mm 3mm; border-bottom: 1px solid #e2e8f0; text-align: left; color: #334155; }
        .marks-table tr.row-fail { background-color: #fef2f2; }
        .marks-table tr.row-pass:hover { background-color: #f8fafc; }
        .marks-table .center { text-align: center; }
        .marks-table .bold { font-weight: 600; color: #0f172a; }
        
        .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em; }
        .badge-pass { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge-fail { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .badge-absent { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        
        .rank-circle { width: 22px; height: 22px; border-radius: 50%; background: #e2e8f0; color: #475569; display: inline-flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; }
        .rank-1 { background: #fef08a; color: #854d0e; }
        .rank-2 { background: #e2e8f0; color: #334155; }
        .rank-3 { background: #fed7aa; color: #9a3412; }
        
        .footer { margin-top: 6mm; display: flex; justify-content: space-between; font-size: 0.7rem; color: #94a3b8; padding: 0 8mm; }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="top-bar"></div>
        <div class="header">
          <div class="header-left">
            ${logoSrc ? `<img src="${logoSrc}" class="coaching-logo" />` : '<div class="logo-placeholder">🏫</div>'}
            <div class="coaching-info">
              <div class="coaching-name">${coaching.name || 'Coaching Institute'}</div>
              <div class="coaching-contact">${coaching.phone || ''} ${coaching.website ? '| ' + coaching.website : ''}</div>
            </div>
          </div>
          <div class="test-title-section">
            <div class="test-title">${test.name}</div>
            <div class="test-meta">${test.standard_name} • ${test.subject_name}</div>
            <div class="test-date">Date: ${test.test_date || 'Not Scheduled'}</div>
          </div>
        </div>
        
        <div class="stats-ribbon">
          <div class="stat-item">
            <div class="stat-val">${marks.length}</div>
            <div class="stat-label">Total Students</div>
          </div>
          <div class="stat-item">
            <div class="stat-val">${avgMarks} <span style="font-size:0.75rem;color:#64748b">/ ${test.max_marks}</span></div>
            <div class="stat-label">Class Average</div>
          </div>
          <div class="stat-item">
            <div class="stat-val" style="color: ${passRate >= 50 ? '#166534' : '#991b1b'}">${passRate}%</div>
            <div class="stat-label">Pass Rate</div>
          </div>
          <div class="stat-item" style="text-align:right">
            <div class="stat-val">${topScorer.marks} <span style="font-size:0.75rem;color:#64748b">(${topScorer.name.split(' ')[0]})</span></div>
            <div class="stat-label">Highest Score</div>
          </div>
        </div>
        
        <div class="table-container">
          <table class="marks-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">Rank</th>
                <th style="width: 15%;">Roll No.</th>
                <th>Student Name</th>
                <th style="width: 15%; text-align: center;">Score</th>
                <th style="width: 15%; text-align: center;">Percentage</th>
                <th style="width: 12%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${scoredStudents.map(m => {
                const isPass = m.pct >= passMarkPct;
                const statusClass = m.isAbsent ? 'badge-absent' : (isPass ? 'badge-pass' : 'badge-fail');
                const statusText = m.isAbsent ? 'Absent' : (isPass ? 'Pass' : 'Fail');
                const rowClass = m.isAbsent ? '' : (isPass ? 'row-pass' : 'row-fail');
                
                const rank = rankMap[m.roll_number];
                let rankHTML = `<div class="rank-circle">${rank}</div>`;
                if (rank === 1) rankHTML = `<div class="rank-circle rank-1">1</div>`;
                if (rank === 2) rankHTML = `<div class="rank-circle rank-2">2</div>`;
                if (rank === 3) rankHTML = `<div class="rank-circle rank-3">3</div>`;
                if (m.isAbsent) rankHTML = '-';
                
                return `
                  <tr class="${rowClass}">
                    <td class="center">${rankHTML}</td>
                    <td style="font-family:monospace;color:#64748b">${m.roll_number}</td>
                    <td class="bold">${m.student_name}</td>
                    <td class="center bold" style="color:${m.isAbsent ? '#94a3b8' : '#0f172a'}">${m.isAbsent ? 'AB' : m.obtained}</td>
                    <td class="center" style="color:#475569">${m.isAbsent ? '—' : m.pct.toFixed(1) + '%'}</td>
                    <td class="center"><span class="badge ${statusClass}">${statusText}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="footer">
        <div>Generated by Result Generator</div>
        <div>Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}</div>
      </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');

    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
    const stdClean = (test.standard_name || '').replace(/[^a-zA-Z0-9]/g, '_');
    const testClean = test.name.replace(/[^a-zA-Z0-9]/g, '_');
    const rawDownloadFilename = `${coachingClean}_${stdClean}_${testClean}_MarksReport_${dateStr}_${timeStr}.pdf`;
    const cleanFilename = rawDownloadFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

    let pdfBuffer;
    try {
      const page = await browser.newPage();
      try {
        await page.setContent(html, { waitUntil: ['load', 'networkidle0'], timeout: 15000 });
      } catch (e) {
        await page.setContent(html, { waitUntil: 'load' });
      }
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
    } finally {
      await browser.close().catch(() => {});
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('Test PDF export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/:id/export/excel — Export test results class sheet to Excel (.xlsx)
router.get('/:id/export/excel', (req, res) => {
  try {
    const test = db.prepare(`
      SELECT t.*, s.is_compulsory, s.name as subject_name, std.display_name as standard_name, std.board_id
      FROM tests t 
      JOIN subjects s ON t.subject_id = s.id 
      JOIN standards std ON t.standard_id = std.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const coaching = db.prepare('SELECT name FROM coaching_profile').get() || {};
    const rawMarks = db.prepare(`
      SELECT s.name as student_name, s.roll_number, s.elective_subjects, tm.obtained_marks, tm.is_absent, tm.remarks
      FROM students s
      LEFT JOIN test_marks tm ON s.id = tm.student_id AND tm.test_id = ?
      WHERE s.standard_id = ? AND (? IS NULL OR s.batch_id = ?)
      ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.roll_number ASC
    `).all(req.params.id, test.standard_id, test.batch_id, test.batch_id);

    const marks = rawMarks.filter(m => isStudentEnrolled(m, test.subject_id, test.is_compulsory));
    const passMarkPct = 35;

    const dataRows = [
      ['Roll No', 'Student Name', `Marks Obtained (Max: ${test.max_marks})`, 'Percentage (%)', 'Result Status', 'Remarks']
    ];

    marks.forEach(m => {
      const isAbsent = m.is_absent === 1;
      const obtained = isAbsent ? 'AB' : (m.obtained_marks !== null && m.obtained_marks !== undefined ? m.obtained_marks : '—');
      const pct = isAbsent ? '0%' : (m.obtained_marks !== null && m.obtained_marks !== undefined ? `${((m.obtained_marks / test.max_marks) * 100).toFixed(1)}%` : '—');
      let status = 'Unrecorded';
      if (isAbsent) status = 'Absent';
      else if (m.obtained_marks !== null && m.obtained_marks !== undefined) {
        status = (m.obtained_marks / test.max_marks * 100) >= passMarkPct ? 'Pass' : 'Fail';
      }

      dataRows.push([
        m.roll_number || '',
        m.student_name || '',
        obtained,
        pct,
        status,
        m.remarks || ''
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Test Marks');

    const excelBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');

    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
    const stdClean = (test.standard_name || '').replace(/[^a-zA-Z0-9]/g, '_');
    const testClean = test.name.replace(/[^a-zA-Z0-9]/g, '_');
    const downloadFilename = `${coachingClean}_${stdClean}_${testClean}_Marks_${dateStr}_${timeStr}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', excelBuf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    return res.end(excelBuf);
  } catch (err) {
    console.error('Test Excel export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/:id/import — Upload Excel file and import test marks
router.post('/:id/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      return res.status(400).json({ error: 'Excel file is empty or missing data rows' });
    }

    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const dataRows = rows.slice(1).filter(row => row.some(cell => cell !== ''));

    // Find Roll No and Marks column indexes
    const rollIndex = headers.findIndex(h => h.includes('roll') || h.includes('id') || h.includes('number'));
    const marksIndex = headers.findIndex(h => h.includes('mark') || h.includes('obtain') || h.includes('score') || h.includes('val') || h.includes(test.name.toLowerCase()));

    if (rollIndex === -1) {
      return res.status(400).json({ error: 'Could not find a roll number column in Excel (header should contain "roll", "id" or "number")' });
    }
    if (marksIndex === -1) {
      return res.status(400).json({ error: 'Could not find a marks column in Excel (header should contain "mark", "obtain", "score" or match the test name)' });
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    const upsert = db.prepare(`
      INSERT INTO test_marks (test_id, student_id, obtained_marks, is_absent)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(test_id, student_id) DO UPDATE SET
        obtained_marks = excluded.obtained_marks,
        is_absent = excluded.is_absent
    `);

    const importTransaction = db.transaction(() => {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const roll = String(row[rollIndex]).trim();
        const markVal = String(row[marksIndex]).trim().toUpperCase();

        if (!roll) {
          skipped++;
          continue;
        }

        // Find student by standard and roll and batch
        const student = db.prepare('SELECT id FROM students WHERE standard_id = ? AND roll_number = ? AND (? IS NULL OR batch_id = ?)').get(test.standard_id, roll, test.batch_id, test.batch_id);
        
        if (!student) {
          errors.push({ row: i + 2, message: `Student with Roll Number "${roll}" not found in this class` });
          skipped++;
          continue;
        }

        const isAbsent = ['AB', 'ABS', 'ABSENT', 'A'].includes(markVal);
        let obtained = null;

        if (!isAbsent && markVal !== '') {
          obtained = parseFloat(markVal);
          if (isNaN(obtained)) {
            errors.push({ row: i + 2, message: `Invalid marks value "${markVal}"` });
            skipped++;
            continue;
          }
          if (obtained > test.max_marks) {
            obtained = test.max_marks;
          }
        }

        upsert.run(test.id, student.id, obtained, isAbsent ? 1 : 0);
        imported++;
      }
    });

    importTransaction();
    recalculateOverallMarksForClass(test.standard_id);

    // Delete temp upload file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    logActivity('TEST_MARKS_IMPORT', `Imported marks from Excel for test: ${test.name}`);
    res.json({ success: true, imported, skipped, errors });
  } catch (err) {
    // Delete temp file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
