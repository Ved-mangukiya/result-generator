const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/subjects?standard_id=X
router.get('/', (req, res) => {
  const { standard_id } = req.query;
  if (!standard_id) return res.status(400).json({ error: 'standard_id required' });
  const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order ASC, id ASC').all(standard_id);
  res.json(subjects);
});

// POST /api/subjects
router.post('/', (req, res) => {
  const { standard_id, name, max_marks, marks_type, internal_max, external_max, is_compulsory, is_language } = req.body;
  if (!standard_id || !name) return res.status(400).json({ error: 'standard_id and name required' });

  const count = db.prepare('SELECT COUNT(*) as c FROM subjects WHERE standard_id = ?').get(standard_id).c;
  const result = db.prepare(`INSERT INTO subjects (standard_id, name, max_marks, marks_type, internal_max, external_max, is_compulsory, is_language, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    standard_id, name, max_marks || 100, marks_type || 'total',
    internal_max || 0, external_max || (max_marks || 100),
    is_compulsory ? 1 : 0, is_language ? 1 : 0, count
  );
  logActivity('SUBJECT_ADD', `Subject added: ${name}`);
  res.json({ success: true, id: result.lastInsertRowid });
});

// PUT /api/subjects/:id
router.put('/:id', (req, res) => {
  const { name, max_marks, marks_type, internal_max, external_max, is_compulsory, is_language, sort_order } = req.body;
  db.prepare(`UPDATE subjects SET name=?, max_marks=?, marks_type=?, internal_max=?, external_max=?, is_compulsory=?, is_language=?, sort_order=? WHERE id=?`).run(
    name, max_marks, marks_type, internal_max || 0, external_max || max_marks,
    is_compulsory ? 1 : 0, is_language ? 1 : 0, sort_order || 0, req.params.id
  );
  res.json({ success: true });
});

// DELETE /api/subjects/:id
router.delete('/:id', (req, res) => {
  const subj = db.prepare('SELECT name FROM subjects WHERE id = ?').get(req.params.id);
  if (!subj) return res.status(404).json({ error: 'Subject not found' });
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  logActivity('SUBJECT_DELETE', `Subject deleted: ${subj.name}`);
  res.json({ success: true });
});

// PUT /api/subjects/reorder — batch reorder
router.put('/reorder', (req, res) => {
  const { order } = req.body; // array of { id, sort_order }
  const update = db.prepare('UPDATE subjects SET sort_order = ? WHERE id = ?');
  const doReorder = db.transaction(() => {
    for (const item of order) update.run(item.sort_order, item.id);
  });
  doReorder();
  res.json({ success: true });
});

module.exports = router;
