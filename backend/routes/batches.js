const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/batches?standard_id=1
router.get('/', (req, res) => {
  const { standard_id } = req.query;
  if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });

  try {
    const batches = db.prepare('SELECT * FROM batches WHERE standard_id = ? ORDER BY id ASC').all(standard_id);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches
router.post('/', (req, res) => {
  const { standard_id, name } = req.body;
  if (!standard_id || !name) return res.status(400).json({ error: 'standard_id and name are required' });

  try {
    const existing = db.prepare('SELECT id FROM batches WHERE standard_id = ? AND name = ? COLLATE NOCASE').get(standard_id, name);
    if (existing) return res.status(409).json({ error: 'Batch with this name already exists in this class' });

    const result = db.prepare('INSERT INTO batches (standard_id, name) VALUES (?, ?)').run(standard_id, name);
    logActivity('BATCH_ADD', `Batch "${name}" added`);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/batches/:id
router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const existing = db.prepare('SELECT id FROM batches WHERE standard_id = ? AND name = ? COLLATE NOCASE AND id != ?').get(batch.standard_id, name, req.params.id);
    if (existing) return res.status(409).json({ error: 'Batch with this name already exists in this class' });

    db.prepare('UPDATE batches SET name = ? WHERE id = ?').run(name, req.params.id);
    logActivity('BATCH_UPDATE', `Batch "${batch.name}" renamed to "${name}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/batches/:id
router.delete('/:id', (req, res) => {
  try {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    db.transaction(() => {
      // Remove batch_id from students
      db.prepare('UPDATE students SET batch_id = NULL WHERE batch_id = ?').run(req.params.id);
      // Remove batch_id from tests
      db.prepare('UPDATE tests SET batch_id = NULL WHERE batch_id = ?').run(req.params.id);
      // Delete the batch
      db.prepare('DELETE FROM batches WHERE id = ?').run(req.params.id);
    })();

    logActivity('BATCH_DELETE', `Batch "${batch.name}" deleted`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
