const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const { db, logActivity } = require('../db/database');
const { getPassMark } = require('../services/gradeService');

// Multer storage for test imports
const importsDir = path.join(__dirname, '../../uploads/imports');
if (!fs.existsSync(importsDir)) fs.mkdirSync(importsDir, { recursive: true });

const upload = multer({
  dest: importsDir,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// GET /api/tests — List all tests for a standard
router.get('/', (req, res) => {
  const { standard_id } = req.query;
  if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });

  try {
    const tests = db.prepare(`
      SELECT t.*, s.name as subject_name 
      FROM tests t 
      JOIN subjects s ON t.subject_id = s.id 
      WHERE t.standard_id = ? 
      ORDER BY t.test_date DESC, t.created_at DESC
    `).all(standard_id);
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests — Create a new test
router.post('/', (req, res) => {
  const { standard_id, subject_id, name, max_marks, test_date } = req.body;
  if (!standard_id || !subject_id || !name || !max_marks) {
    return res.status(400).json({ error: 'standard_id, subject_id, name, and max_marks are required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO tests (standard_id, subject_id, name, max_marks, test_date) 
      VALUES (?, ?, ?, ?, ?)
    `).run(standard_id, subject_id, name, parseFloat(max_marks), test_date || null);

    const testId = result.lastInsertRowid;

    // Log activity
    const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(standard_id);
    logActivity('TEST_CREATE', `Created test "${name}" for ${std ? std.display_name : 'Class ID ' + standard_id}`);

    res.json({ success: true, id: testId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tests/:id — Update a test's metadata
router.put('/:id', (req, res) => {
  const { name, max_marks, test_date, subject_id } = req.body;
  if (!name || !max_marks || !subject_id) {
    return res.status(400).json({ error: 'name, max_marks, and subject_id are required' });
  }

  try {
    db.prepare(`
      UPDATE tests 
      SET name = ?, max_marks = ?, test_date = ?, subject_id = ?
      WHERE id = ?
    `).run(name, parseFloat(max_marks), test_date || null, subject_id, req.params.id);

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
    const test = db.prepare('SELECT name FROM tests WHERE id = ?').get(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    db.prepare('DELETE FROM tests WHERE id = ?').run(req.params.id);

    logActivity('TEST_DELETE', `Deleted test: ${test.name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/:id/marks — Get student list & marks for grid entry
router.get('/:id/marks', (req, res) => {
  try {
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const marks = db.prepare(`
      SELECT s.id as student_id, s.name as student_name, s.roll_number,
             tm.obtained_marks, tm.is_absent, tm.remarks
      FROM students s
      LEFT JOIN test_marks tm ON s.id = tm.student_id AND tm.test_id = ?
      WHERE s.standard_id = ?
      ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.roll_number ASC
    `).all(req.params.id, test.standard_id);

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
    const test = db.prepare('SELECT t.name, s.display_name FROM tests t JOIN standards s ON t.standard_id = s.id WHERE t.id = ?').get(req.params.id);
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
      SELECT t.*, s.name as subject_name, std.display_name as standard_name 
      FROM tests t 
      JOIN subjects s ON t.subject_id = s.id 
      JOIN standards std ON t.standard_id = std.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const coaching = db.prepare('SELECT name FROM coaching_profile').get() || {};
    const marks = db.prepare(`
      SELECT s.name as student_name, s.roll_number, tm.obtained_marks, tm.is_absent, tm.remarks
      FROM students s
      LEFT JOIN test_marks tm ON s.id = tm.student_id AND tm.test_id = ?
      WHERE s.standard_id = ?
      ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.roll_number ASC
    `).all(req.params.id, test.standard_id);

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

    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
    const testClean = test.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${coachingClean}_${testClean}_Marks.xlsx`;
    const outputPath = path.join(__dirname, '../../exports', filename);

    XLSX.writeFile(workbook, outputPath);
    res.download(outputPath, filename, (err) => {
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
      SELECT t.*, s.name as subject_name, std.display_name as standard_name, std.board_id
      FROM tests t 
      JOIN subjects s ON t.subject_id = s.id 
      JOIN standards std ON t.standard_id = std.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const coaching = db.prepare('SELECT * FROM coaching_profile').get() || {};
    const marks = db.prepare(`
      SELECT s.name as student_name, s.roll_number, tm.obtained_marks, tm.is_absent, tm.remarks
      FROM students s
      LEFT JOIN test_marks tm ON s.id = tm.student_id AND tm.test_id = ?
      WHERE s.standard_id = ?
      ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.roll_number ASC
    `).all(req.params.id, test.standard_id);

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
        body { font-family: 'Inter', sans-serif; background: #ffffff; color: #1e293b; padding: 15mm 15mm; }
        
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 5mm; margin-bottom: 6mm; }
        .coaching-logo { width: 60px; height: 60px; object-fit: contain; }
        .logo-placeholder { width: 60px; height: 60px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
        .coaching-info { text-align: right; }
        .coaching-name { font-size: 1.5rem; font-weight: 800; color: #1e3a8a; }
        .coaching-tagline { font-size: 0.75rem; color: #64748b; margin-top: 1px; }
        .coaching-contact { font-size: 0.75rem; color: #94a3b8; margin-top: 3px; }
        
        .test-title-section { text-align: center; margin-bottom: 6mm; }
        .test-title { font-size: 1.25rem; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
        .test-meta { font-size: 0.85rem; color: #64748b; margin-top: 2px; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-bottom: 8mm; }
        .stat-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 3mm; text-align: center; background: #f8fafc; }
        .stat-val { font-size: 1.15rem; font-weight: 700; color: #1e3a8a; }
        .stat-label { font-size: 0.7rem; text-transform: uppercase; color: #64748b; margin-top: 1px; font-weight: 600; letter-spacing: 0.05em; }
        
        .marks-table { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 0.8rem; }
        .marks-table th { background: #1e3a8a; color: white; padding: 2.5mm; text-align: left; font-weight: 600; font-size: 0.75rem; border: 1px solid #1e3a8a; }
        .marks-table td { padding: 2.2mm 2.5mm; border: 1px solid #e2e8f0; text-align: left; }
        .marks-table tr:nth-child(even) { background: #f8fafc; }
        .marks-table .center { text-align: center; }
        .marks-table .bold { font-weight: 700; }
        
        .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; }
        .badge-pass { background: #dcfce7; color: #15803d; }
        .badge-fail { background: #fee2e2; color: #b91c1c; }
        .badge-absent { background: #fef3c7; color: #d97706; }
        
        .footer { margin-top: 10mm; display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4mm; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoSrc ? `<img src="${logoSrc}" class="coaching-logo" />` : '<div class="logo-placeholder">🏫</div>'}
        <div class="coaching-info">
          <div class="coaching-name">${coaching.name || 'Coaching Institute'}</div>
          <div class="coaching-tagline">${coaching.tagline || ''}</div>
          <div class="coaching-contact">${coaching.phone || ''} | ${coaching.website || ''}</div>
        </div>
      </div>
      
      <div class="test-title-section">
        <div class="test-title">${test.name} — Marks Report</div>
        <div class="test-meta">Class: ${test.standard_name} | Subject: ${test.subject_name} | Date: ${test.test_date || '-'}</div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val">${marks.length}</div>
          <div class="stat-label">Students</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${avgMarks}/${test.max_marks}</div>
          <div class="stat-label">Class Average</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${passRate}%</div>
          <div class="stat-label">Pass Percentage</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${topScorer.marks}/${test.max_marks} (${topScorer.name.split(' ')[0]})</div>
          <div class="stat-label">Top Scorer</div>
        </div>
      </div>
      
      <table class="marks-table">
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">Rank</th>
            <th style="width: 15%;">Roll No.</th>
            <th>Student Name</th>
            <th style="width: 18%; text-align: center;">Marks Obtained</th>
            <th style="width: 15%; text-align: center;">Percentage</th>
            <th style="width: 12%; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${scoredStudents.map(m => {
            const statusClass = m.isAbsent ? 'badge-absent' : (m.pct >= passMarkPct ? 'badge-pass' : 'badge-fail');
            const statusText = m.isAbsent ? 'Absent' : (m.pct >= passMarkPct ? 'Pass' : 'Fail');
            
            return `
              <tr>
                <td class="center bold" style="color: #1e3a8a;">#${rankMap[m.roll_number]}</td>
                <td>${m.roll_number}</td>
                <td class="bold">${m.student_name}</td>
                <td class="center">${m.isAbsent ? 'AB' : m.obtained + ' / ' + test.max_marks}</td>
                <td class="center">${m.isAbsent ? '—' : m.pct.toFixed(1) + '%'}</td>
                <td class="center"><span class="badge ${statusClass}">${statusText}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div>Generated by Result Generator</div>
        <div>Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}</div>
      </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const filename = `${(coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_')}_${test.name.replace(/[^a-zA-Z0-9]/g, '_')}_MarksReport.pdf`;
    const outputPath = path.join(__dirname, '../../exports', filename);

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
      });

      res.download(outputPath, filename, (err) => {
        if (err) console.error('PDF export error:', err);
        try { fs.unlinkSync(outputPath); } catch(e) {}
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
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

        // Find student by standard and roll
        const student = db.prepare('SELECT id FROM students WHERE standard_id = ? AND roll_number = ?').get(test.standard_id, roll);
        
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
