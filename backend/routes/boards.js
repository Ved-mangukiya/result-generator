const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');
const gradesData = require('../data/grades.json');
const boardsData = require('../data/boards.json');

// GET /api/boards — list all boards
router.get('/', (req, res) => {
  const boards = db.prepare('SELECT * FROM boards ORDER BY is_custom ASC, name ASC').all();
  res.json(boards);
});

// GET /api/boards/preloaded — return pre-loaded board list for adding
router.get('/preloaded', (req, res) => {
  res.json(boardsData.boards);
});

// POST /api/boards — add a board (pre-loaded or custom)
router.post('/', (req, res) => {
  const { name, short_name, is_custom } = req.body;
  if (!name || !short_name) return res.status(400).json({ error: 'Name and short name required' });

  // Check duplicate
  const existing = db.prepare('SELECT id FROM boards WHERE short_name = ?').get(short_name);
  if (existing) return res.status(409).json({ error: 'Board already exists' });

  const result = db.prepare('INSERT INTO boards (name, short_name, is_custom) VALUES (?, ?, ?)').run(name, short_name, is_custom ? 1 : 0);
  const boardId = result.lastInsertRowid;

  // Seed grade scale for this board
  const scaleKey = gradesData.boardGradeMap[short_name] || 'STATE';
  const scale = gradesData.grades[scaleKey];
  const insertGrade = db.prepare(`INSERT INTO grade_scales (board_id, label, min_pct, max_pct, color, result_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const seedGrades = db.transaction(() => {
    scale.forEach((g, i) => insertGrade.run(boardId, g.label, g.min_pct, g.max_pct, g.color, g.result_status, i));
  });
  seedGrades();

  logActivity('BOARD_ADD', `Board added: ${name}`);
  res.json({ success: true, id: boardId });
});

// DELETE /api/boards/:id
router.delete('/:id', (req, res) => {
  const board = db.prepare('SELECT name FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id);
  logActivity('BOARD_DELETE', `Board deleted: ${board.name}`);
  res.json({ success: true });
});

// GET /api/boards/:id/grades — get grade scale for a board
router.get('/:id/grades', (req, res) => {
  const grades = db.prepare('SELECT * FROM grade_scales WHERE board_id = ? ORDER BY sort_order ASC').all(req.params.id);
  res.json(grades);
});

// PUT /api/boards/:id/grades — update grade scale
router.put('/:id/grades', (req, res) => {
  const { grades } = req.body;
  if (!Array.isArray(grades)) return res.status(400).json({ error: 'grades must be array' });

  const deleteOld = db.prepare('DELETE FROM grade_scales WHERE board_id = ?');
  const insertNew = db.prepare(`INSERT INTO grade_scales (board_id, label, min_pct, max_pct, color, result_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const update = db.transaction(() => {
    deleteOld.run(req.params.id);
    grades.forEach((g, i) => insertNew.run(req.params.id, g.label, g.min_pct, g.max_pct, g.color || '#4caf69', g.result_status || 'Pass', i));
  });
  update();
  logActivity('GRADE_UPDATE', `Grade scale updated for board ID ${req.params.id}`);
  res.json({ success: true });
});

// GET /api/boards/:id/standards
router.get('/:id/standards', (req, res) => {
  const standards = db.prepare(`
    SELECT s.*, COUNT(st.id) as student_count 
    FROM standards s LEFT JOIN students st ON st.standard_id = s.id
    WHERE s.board_id = ? GROUP BY s.id ORDER BY s.standard_number ASC, s.stream ASC
  `).all(req.params.id);
  res.json(standards);
});

module.exports = router;
