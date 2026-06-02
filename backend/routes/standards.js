const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');
const subjectsData = require('../data/subjects.json');

const STREAMS = [
  'General',
  'Science (PCM)',
  'Science (PCB)',
  'Science (PCMB)',
  'Commerce with Maths',
  'Commerce without Maths',
  'Commerce (GSEB)',
  'Arts / Humanities',
  'Vocational',
  'Custom'
];

// GET /api/standards/streams
router.get('/streams', (req, res) => {
  res.json(STREAMS);
});

// GET /api/standards/:id
router.get('/:id', (req, res) => {
  const standard = db.prepare(`
    SELECT s.*, b.name as board_name, b.short_name as board_short, b.id as board_id_val
    FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?
  `).get(req.params.id);
  if (!standard) return res.status(404).json({ error: 'Standard not found' });
  res.json(standard);
});

// POST /api/standards — create a standard under a board
router.post('/', (req, res) => {
  const { board_id, standard_number, stream, display_name, subjects } = req.body;
  if (!board_id || !standard_number) return res.status(400).json({ error: 'board_id and standard_number required' });

  const streamVal = stream || 'General';
  const displayName = display_name || buildDisplayName(standard_number, streamVal);

  // Check duplicate
  const existing = db.prepare('SELECT id FROM standards WHERE board_id = ? AND standard_number = ? AND stream = ?').get(board_id, standard_number, streamVal);
  if (existing) return res.status(409).json({ error: 'This standard/stream combination already exists for this board' });

  const result = db.prepare('INSERT INTO standards (board_id, standard_number, stream, display_name) VALUES (?, ?, ?, ?)').run(board_id, standard_number, streamVal, displayName);
  const standardId = result.lastInsertRowid;

  // Auto-seed subjects
  const insertSubject = db.prepare(`INSERT INTO subjects (standard_id, name, max_marks, marks_type, internal_max, external_max, is_compulsory, is_language, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  if (subjects && Array.isArray(subjects) && subjects.length > 0) {
    const seedSubjects = db.transaction(() => {
      subjects.forEach((s, i) => {
        insertSubject.run(
          standardId, 
          s.name, 
          s.max_marks || 100, 
          s.marks_type || 'total', 
          s.internal_max || 0, 
          s.external_max || s.max_marks || 100, 
          s.is_compulsory ? 1 : 0, 
          s.is_language ? 1 : 0, 
          i
        );
      });
    });
    seedSubjects();
  } else {
    // Auto-seed subjects based on standard number and stream template
    const board = db.prepare('SELECT short_name FROM boards WHERE id = ?').get(board_id);
    const boardShort = board ? board.short_name : '';
    const subjectTemplate = getSubjectTemplate(standard_number, streamVal, boardShort);
    if (subjectTemplate) {
      const seedSubjects = db.transaction(() => {
        subjectTemplate.subjects.forEach((s, i) => {
          insertSubject.run(standardId, s.name, s.max_marks || 100, s.marks_type || 'total', s.internal_max || 0, s.external_max || s.max_marks || 100, s.is_compulsory ? 1 : 0, s.is_language ? 1 : 0, i);
        });
      });
      seedSubjects();
    }
  }

  logActivity('STANDARD_ADD', `Standard added: ${displayName}`);
  res.json({ success: true, id: standardId });
});

// DELETE /api/standards/:id
router.delete('/:id', (req, res) => {
  const std = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(req.params.id);
  if (!std) return res.status(404).json({ error: 'Standard not found' });
  db.prepare('DELETE FROM standards WHERE id = ?').run(req.params.id);
  logActivity('STANDARD_DELETE', `Standard deleted: ${std.display_name}`);
  res.json({ success: true });
});

// GET /api/standards/:id/result-settings
router.get('/:id/result-settings', (req, res) => {
  let settings = db.prepare('SELECT * FROM result_card_settings WHERE standard_id = ?').get(req.params.id);
  if (!settings) {
    // Return defaults
    settings = {
      standard_id: parseInt(req.params.id),
      template_id: 1, primary_color: '', accent_color: '',
      show_rank: 1, show_percentile: 0, show_attendance: 1, show_remarks: 1,
      show_photo: 1, show_parent_names: 1, show_dob: 1, show_split_marks: 1,
      show_grade: 1, show_pass_fail: 1, paper_size: 'A4 Portrait',
      result_categories: '["A1","A2","B1","B2","C1","C2","D","Fail"]'
    };
  }
  res.json(settings);
});

// PUT /api/standards/:id/result-settings
router.put('/:id/result-settings', (req, res) => {
  const s = req.body;
  const existing = db.prepare('SELECT id FROM result_card_settings WHERE standard_id = ?').get(req.params.id);

  if (existing) {
    db.prepare(`UPDATE result_card_settings SET template_id=?, primary_color=?, accent_color=?,
      show_rank=?, show_percentile=?, show_attendance=?, show_remarks=?, show_photo=?,
      show_parent_names=?, show_dob=?, show_split_marks=?, show_grade=?, show_pass_fail=?,
      paper_size=?, result_categories=? WHERE standard_id=?`).run(
      s.template_id, s.primary_color, s.accent_color,
      s.show_rank?1:0, s.show_percentile?1:0, s.show_attendance?1:0, s.show_remarks?1:0, s.show_photo?1:0,
      s.show_parent_names?1:0, s.show_dob?1:0, s.show_split_marks?1:0, s.show_grade?1:0, s.show_pass_fail?1:0,
      s.paper_size, JSON.stringify(s.result_categories), req.params.id
    );
  } else {
    db.prepare(`INSERT INTO result_card_settings (standard_id, template_id, primary_color, accent_color,
      show_rank, show_percentile, show_attendance, show_remarks, show_photo, show_parent_names, show_dob,
      show_split_marks, show_grade, show_pass_fail, paper_size, result_categories) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      req.params.id, s.template_id, s.primary_color, s.accent_color,
      s.show_rank?1:0, s.show_percentile?1:0, s.show_attendance?1:0, s.show_remarks?1:0, s.show_photo?1:0,
      s.show_parent_names?1:0, s.show_dob?1:0, s.show_split_marks?1:0, s.show_grade?1:0, s.show_pass_fail?1:0,
      s.paper_size, JSON.stringify(s.result_categories)
    );
  }
  res.json({ success: true });
});

function buildDisplayName(num, stream) {
  const ordinals = { 1:'1st', 2:'2nd', 3:'3rd', 4:'4th', 5:'5th', 6:'6th', 7:'7th', 8:'8th', 9:'9th', 10:'10th', 11:'11th', 12:'12th' };
  const ord = ordinals[num] || `${num}th`;
  if (stream && stream !== 'General') return `${ord} Standard — ${stream}`;
  return `${ord} Standard`;
}

function getSubjectTemplate(stdNum, stream, boardShort = '') {
  const subjects = subjectsData.subjects;
  const num = parseInt(stdNum);
  if (num >= 1 && num <= 5) return subjects['1_5'];
  if (num >= 6 && num <= 8) return subjects['6_8'];
  if (num >= 9 && num <= 10) {
    if (boardShort === 'CBSE') return subjects['9_10_CBSE'];
    return subjects['9_10_STATE'] || subjects['9_10_CBSE'];
  }
  if (num >= 11 && num <= 12) {
    if (boardShort === 'GSEB' && stream.toLowerCase().includes('commerce')) {
      return subjects['11_12_Commerce_GSEB'] || subjects['11_12_Commerce_NoMaths'];
    }
    const streamMap = {
      'Science (PCM)': subjects['11_12_Science_PCM'],
      'Science (PCB)': subjects['11_12_Science_PCB'],
      'Science (PCMB)': subjects['11_12_Science_PCMB'],
      'Commerce with Maths': subjects['11_12_Commerce_Maths'],
      'Commerce without Maths': subjects['11_12_Commerce_NoMaths'],
      'Arts / Humanities': subjects['11_12_Arts'],
      'Vocational': subjects['11_12_Vocational'],
    };
    return streamMap[stream] || subjects['11_12_Science_PCM'];
  }
  return null;
}

module.exports = router;
