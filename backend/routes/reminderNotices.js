const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// Valid reminder types — all 42 notice types supported by the frontend
const VALID_TYPES = [
  // Academic & Exam
  'exam_schedule', 'test_reminder', 'result_announcement', 'achievement',
  'syllabus_update', 'ptm', 'homework', 'practical_lab', 'extra_class', 'book_distribution',
  // College & University
  'sem_exam', 'atkt_backlog', 'campus_placement', 'project_submission',
  'convocation', 'dean_advisory', 'library_fine', 'hostel_notice', 'mid_sem', 'youth_fest',
  // Fees & Admin
  'fee_due', 'fee_overdue', 'fee_receipt', 'hall_ticket', 'document_submission', 'id_card',
  // Conduct
  'attendance_warning', 'discipline_warning', 'mobile_ban', 'uniform_code',
  // Holidays & Events
  'vacation', 'holiday', 'weather_emergency', 'picnic_tour', 'annual_event', 'batch_start',
  // Services
  'time_change', 'faculty_absence', 'parent_complaint', 'doubt_desk', 'transport_notice', 'general'
];

// ─── GET /api/reminder-notices — List all notices ──────────────────────────
router.get('/', (req, res) => {
  try {
    const { type, status, target } = req.query;
    let query = 'SELECT * FROM reminder_notices';
    const clauses = [];
    const params = [];
    if (type) { clauses.push('type = ?'); params.push(type); }
    if (status) { clauses.push('status = ?'); params.push(status); }
    if (target && target !== 'All') { clauses.push('(target = ? OR target = "All")'); params.push(target); }
    if (clauses.length > 0) query += ' WHERE ' + clauses.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const notices = db.prepare(query).all(...params);
    // Parse content_json for each
    notices.forEach(n => {
      try { n.content = JSON.parse(n.content_json || '{}'); } catch { n.content = {}; }
    });
    res.json({ notices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/reminder-notices/:id ─────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const notice = db.prepare('SELECT * FROM reminder_notices WHERE id = ?').get(req.params.id);
    if (!notice) return res.status(404).json({ error: 'Notice not found' });
    try { notice.content = JSON.parse(notice.content_json || '{}'); } catch { notice.content = {}; }
    res.json(notice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/reminder-notices — Create a new notice ─────────────────────
router.post('/', (req, res) => {
  try {
    const { type, title, content, target, target_id, target_name, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (type && !VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid notice type' });
    const contentJson = typeof content === 'string' ? content : JSON.stringify(content || {});
    const result = db.prepare(`
      INSERT INTO reminder_notices (type, title, content_json, target, target_id, target_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type || 'general', title, contentJson, target || 'All', target_id || null, target_name || '', status || 'Draft');
    logActivity('NOTICE_CREATE', `Created ${type || 'general'} notice: "${title}"`);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/reminder-notices/:id — Update a notice ──────────────────────
router.put('/:id', (req, res) => {
  try {
    const { type, title, content, target, target_id, target_name, status, published_at } = req.body;
    const contentJson = typeof content === 'string' ? content : JSON.stringify(content || {});
    db.prepare(`
      UPDATE reminder_notices
      SET type=?, title=?, content_json=?, target=?, target_id=?, target_name=?, status=?, published_at=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(type || 'general', title, contentJson, target || 'All', target_id || null, target_name || '', status || 'Draft', published_at || null, req.params.id);
    logActivity('NOTICE_UPDATE', `Updated notice ID #${req.params.id}: "${title}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/reminder-notices/:id/publish — Publish a notice ─────────────
router.post('/:id/publish', (req, res) => {
  try {
    const notice = db.prepare('SELECT title FROM reminder_notices WHERE id = ?').get(req.params.id);
    if (!notice) return res.status(404).json({ error: 'Notice not found' });
    db.prepare("UPDATE reminder_notices SET status='Published', published_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(req.params.id);
    logActivity('NOTICE_PUBLISH', `Published notice: "${notice.title}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/reminder-notices/:id — Delete a notice ────────────────────
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM reminder_notices WHERE id = ?').run(req.params.id);
    logActivity('NOTICE_DELETE', `Deleted notice ID #${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
