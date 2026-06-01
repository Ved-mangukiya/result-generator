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
            JOIN test_marks tm ON tm.test_id = t.id 
            WHERE t.cycle_id = tc.id) as completed_tests
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
  if (!max_marks || isNaN(max_marks)) return res.status(400).json({ error: 'Valid max_marks is required' });
  if (!Array.isArray(tests) || tests.length === 0) return res.status(400).json({ error: 'tests must be a non-empty array' });

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
    const cycleRes = insertCycle.run(standard_id, title, parseFloat(max_marks));
    cycleId = cycleRes.lastInsertRowid;

    for (const test of tests) {
      insertTest.run(
        standard_id, 
        test.subject_id, 
        `${title} - ${test.subject_name || 'Test'}`, 
        parseFloat(max_marks), 
        test.test_date || '', 
        cycleId
      );
    }
  });

  try {
    createTransaction();
    logActivity('TEST_CYCLE_CREATE', `Scheduled test cycle: ${title} for class ${std.display_name}`);
    res.json({ success: true, cycleId });
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

module.exports = router;
