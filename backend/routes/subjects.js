const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/subjects/predefined
router.get('/predefined', (req, res) => {
  try {
    const subjectsData = require('../data/subjects.json');
    res.json(subjectsData.subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subjects/default?standard_number=X&stream=Y&board_id=Z
router.get('/default', (req, res) => {
  const { standard_number, stream, board_id } = req.query;
  if (!standard_number) return res.status(400).json({ error: 'standard_number required' });

  try {
    let boardShort = '';
    if (board_id) {
      const board = db.prepare('SELECT short_name FROM boards WHERE id = ?').get(board_id);
      if (board) boardShort = board.short_name;
    }

    const subjectsData = require('../data/subjects.json').subjects;
    const num = parseInt(standard_number);
    let template = null;

    if (num >= 1 && num <= 5) template = subjectsData['1_5'];
    else if (num >= 6 && num <= 8) template = subjectsData['6_8'];
    else if (num >= 9 && num <= 10) {
      if (boardShort === 'CBSE') template = subjectsData['9_10_CBSE'];
      else template = subjectsData['9_10_STATE'] || subjectsData['9_10_CBSE'];
    } else if (num >= 11 && num <= 12) {
      if (boardShort === 'GSEB' && stream && stream.toLowerCase().includes('commerce')) {
        template = subjectsData['11_12_Commerce_GSEB'] || subjectsData['11_12_Commerce_NoMaths'];
      } else {
        const streamMap = {
          'Science (PCM)': subjectsData['11_12_Science_PCM'],
          'Science (PCB)': subjectsData['11_12_Science_PCB'],
          'Science (PCMB)': subjectsData['11_12_Science_PCMB'],
          'Commerce with Maths': subjectsData['11_12_Commerce_Maths'],
          'Commerce without Maths': subjectsData['11_12_Commerce_NoMaths'],
          'Commerce (GSEB)': subjectsData['11_12_Commerce_GSEB'],
          'Arts / Humanities': subjectsData['11_12_Arts'],
          'Vocational': subjectsData['11_12_Vocational'],
        };
        template = streamMap[stream] || subjectsData['11_12_Science_PCM'];
      }
    }

    res.json(template ? template.subjects : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subjects/all-names — All unique subject names in the DB (for autocomplete)
router.get('/all-names', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT name FROM subjects ORDER BY name ASC').all();
    res.json(rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
  const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(standard_id);
  logActivity('SUBJECT_ADD', `Added subject "${name}" to ${std ? std.display_name : 'Class'}`);
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
