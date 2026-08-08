const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/test-cycles — List all test cycles for a standard
router.get('/', (req, res) => {
  const { standard_id } = req.query;
  if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });

  // Get cycles along with subject count and completion metrics
  const cycles = db.prepare(`
    SELECT tc.*,
           (SELECT COUNT(*) FROM tests t WHERE t.cycle_id = tc.id) as total_tests,
           (SELECT COUNT(DISTINCT t.id) FROM tests t 
            LEFT JOIN test_marks tm ON tm.test_id = t.id 
            WHERE t.cycle_id = tc.id AND 
              (tm.id IS NOT NULL OR (t.test_date IS NOT NULL AND t.test_date != '' AND t.test_date <= date('now', 'localtime')))
           ) as completed_tests
    FROM test_cycles tc 
    WHERE tc.standard_id = ? 
    ORDER BY tc.id DESC
  `).all(standard_id);

  res.json(cycles);
});

// GET /api/test-cycles/:id — Get details of a specific test cycle
router.get('/:id', (req, res) => {
  const cycle = db.prepare('SELECT * FROM test_cycles WHERE id = ?').get(req.params.id);
  if (!cycle) return res.status(404).json({ error: 'Test cycle not found' });

  const tests = db.prepare(`
    SELECT t.*, s.name as subject_name,
           (SELECT COUNT(*) FROM test_marks tm WHERE tm.test_id = t.id) as marks_count
    FROM tests t
    JOIN subjects s ON t.subject_id = s.id
    WHERE t.cycle_id = ?
    ORDER BY s.sort_order, s.name
  `).all(req.params.id);

  res.json({ cycle, tests });
});

// POST /api/test-cycles — Schedule a new test cycle
router.post('/', (req, res) => {
  const { standard_id, title, max_marks, tests } = req.body;

  if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const parsedMaxMarks = (max_marks !== undefined && max_marks !== null && !isNaN(max_marks)) ? parseFloat(max_marks) : 100;
  const testsArray = Array.isArray(tests) ? tests : [];

  const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(standard_id);
  if (!std) return res.status(404).json({ error: 'Standard not found' });

  const insertCycle = db.prepare(`
    INSERT INTO test_cycles (standard_id, title, max_marks) VALUES (?, ?, ?)
  `);

  const insertTest = db.prepare(`
    INSERT INTO tests (standard_id, subject_id, name, max_marks, test_date, cycle_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let cycleId = null;

  const createTransaction = db.transaction(() => {
    const cycleRes = insertCycle.run(standard_id, title, parsedMaxMarks);
    cycleId = cycleRes.lastInsertRowid;

    for (const test of testsArray) {
      insertTest.run(
        standard_id, 
        test.subject_id, 
        `${title} - ${test.subject_name || 'Test'}`, 
        parsedMaxMarks, 
        test.test_date || '', 
        cycleId
      );
    }
  });

  try {
    createTransaction();
    logActivity('TEST_CYCLE_CREATE', `Scheduled test cycle: ${title} for class ${std.display_name}`);
    res.json({ success: true, cycleId, id: cycleId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/test-cycles/:id — Delete a test cycle
router.delete('/:id', (req, res) => {
  const cycle = db.prepare('SELECT * FROM test_cycles WHERE id = ?').get(req.params.id);
  if (!cycle) return res.status(404).json({ error: 'Test cycle not found' });

  db.prepare('DELETE FROM test_cycles WHERE id = ?').run(req.params.id);

  logActivity('TEST_CYCLE_DELETE', `Deleted test cycle: ${cycle.title}`);
  res.json({ success: true });
});

// GET /api/test-cycles/:id/results — Per-student results for all tests in a cycle
router.get('/:id/results', (req, res) => {
  const cycle = db.prepare('SELECT * FROM test_cycles WHERE id = ?').get(req.params.id);
  if (!cycle) return res.status(404).json({ error: 'Test cycle not found' });

  const tests = db.prepare(`
    SELECT t.*, s.name as subject_name, s.sort_order
    FROM tests t
    JOIN subjects s ON t.subject_id = s.id
    WHERE t.cycle_id = ?
    ORDER BY s.sort_order, s.name
  `).all(req.params.id);

  const students = db.prepare(
    'SELECT * FROM students WHERE standard_id = ? ORDER BY CAST(roll_number AS INTEGER) ASC, roll_number ASC'
  ).all(cycle.standard_id);

  // Build marks map: { student_id: { test_id: { obtained, is_absent } } }
  const allMarks = db.prepare(`
    SELECT tm.student_id, tm.test_id, tm.obtained_marks, tm.is_absent
    FROM test_marks tm
    JOIN tests t ON tm.test_id = t.id
    WHERE t.cycle_id = ?
  `).all(req.params.id);

  const marksMap = {};
  for (const m of allMarks) {
    if (!marksMap[m.student_id]) marksMap[m.student_id] = {};
    marksMap[m.student_id][m.test_id] = { obtained: m.obtained_marks, is_absent: m.is_absent };
  }

  // Build per-student rows
  const rows = students.map(student => {
    const testResults = tests.map(test => {
      const m = marksMap[student.id]?.[test.id];
      return {
        test_id: test.id,
        subject_name: test.subject_name,
        max_marks: test.max_marks,
        obtained: m ? m.obtained : null,
        is_absent: m ? m.is_absent : false,
        entered: !!m
      };
    });

    const enteredResults = testResults.filter(r => r.entered && !r.is_absent && r.obtained !== null);
    const total = enteredResults.reduce((sum, r) => sum + (r.obtained || 0), 0);
    const maxTotal = enteredResults.reduce((sum, r) => sum + r.max_marks, 0);
    const pct = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : null;

    return {
      student_id: student.id,
      name: student.name,
      roll_number: student.roll_number,
      testResults,
      total,
      maxTotal,
      pct
    };
  });

  // Per-test summary stats
  const testSummary = tests.map(test => {
    const testMarks = allMarks.filter(m => m.test_id === test.id && !m.is_absent && m.obtained_marks !== null);
    const avg = testMarks.length > 0
      ? (testMarks.reduce((s, m) => s + m.obtained_marks, 0) / testMarks.length).toFixed(1)
      : null;
    const passCount = testMarks.filter(m => m.obtained_marks >= test.max_marks * 0.35).length;
    return {
      test_id: test.id,
      subject_name: test.subject_name,
      max_marks: test.max_marks,
      avg,
      passCount,
      totalEntered: testMarks.length
    };
  });

  res.json({ cycle, tests, students: rows, testSummary });
});

module.exports = router;
