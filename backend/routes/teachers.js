const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, logActivity } = require('../db/database');

// GET /api/teachers — List all teachers with their assignments
router.get('/', (req, res) => {
  try {
    const teachers = db.prepare('SELECT id, name, email, phone, assigned_standards, subjects_taught, created_at FROM teachers ORDER BY id DESC').all();
    res.json({ teachers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teachers/:id — Get single teacher
router.get('/:id', (req, res) => {
  try {
    const teacher = db.prepare('SELECT id, name, email, phone, assigned_standards, subjects_taught, created_at FROM teachers WHERE id = ?').get(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teachers — Add new faculty account (Auto-generates login credentials)
router.post('/', async (req, res) => {
  try {
    let { name, email, phone, assigned_standards, subjects_taught, password } = req.body;
    if (!name) return res.status(400).json({ error: 'Teacher name is required' });

    // Auto-generate email/username if not provided
    if (!email || email.trim() === '') {
      const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const randNum = Math.floor(1000 + Math.random() * 9000);
      email = `${cleanName}${randNum}@edutrack.local`;
    }

    const defaultPass = password || 'teacher@123';
    const hash = await bcrypt.hash(defaultPass, 10);

    const existing = db.prepare('SELECT id FROM teachers WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) {
      return res.status(400).json({ error: `Faculty email/username '${email}' is already registered` });
    }

    const result = db.prepare(`
      INSERT INTO teachers (name, email, phone, password_hash, assigned_standards, subjects_taught)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, email, phone || '', hash, assigned_standards || 'All Classes', subjects_taught || 'General');

    logActivity('TEACHER_ADD', `Added Faculty: ${name} (${email})`);

    res.json({
      success: true,
      id: result.lastInsertRowid,
      name,
      email,
      credentials: { username: email, password: defaultPass }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teachers/:id — Update teacher info
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, assigned_standards, subjects_taught } = req.body;
    db.prepare(`
      UPDATE teachers SET name = ?, email = ?, phone = ?, assigned_standards = ?, subjects_taught = ?
      WHERE id = ?
    `).run(name, email, phone || '', assigned_standards || '', subjects_taught || '', req.params.id);
    logActivity('TEACHER_UPDATE', `Updated Faculty ID #${req.params.id}: ${name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/teachers/:id — Remove faculty account
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM teachers WHERE id = ?').run(req.params.id);
    logActivity('TEACHER_DELETE', `Deleted Faculty ID #${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Teacher Subject Assignments ───────────────────────────────────────────

// GET /api/teachers/assignments/by-standard/:standard_id — Get teachers assigned to a standard
// IMPORTANT: This must come BEFORE /:id routes to avoid Express matching "assignments" as an id
router.get('/assignments/by-standard/:standard_id', (req, res) => {
  try {
    const assignments = db.prepare(`
      SELECT tsa.*, t.name as teacher_name, t.email,
             subj.name as subject_name_full, bch.name as batch_name
      FROM teacher_subject_assignments tsa
      JOIN teachers t ON tsa.teacher_id = t.id
      LEFT JOIN subjects subj ON tsa.subject_id = subj.id
      LEFT JOIN batches bch ON tsa.batch_id = bch.id
      WHERE tsa.standard_id = ?
      ORDER BY t.name ASC, subj.name ASC
    `).all(req.params.standard_id);
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teachers/:id/assignments — List subject assignments for a teacher
router.get('/:id/assignments', (req, res) => {
  try {
    const assignments = db.prepare(`
      SELECT tsa.*, s.display_name as class_name, b.short_name as board_short,
             subj.name as subject_name_full, subj.id as subject_id_val,
             bch.name as batch_name
      FROM teacher_subject_assignments tsa
      JOIN standards s ON tsa.standard_id = s.id
      JOIN boards b ON s.board_id = b.id
      LEFT JOIN subjects subj ON tsa.subject_id = subj.id
      LEFT JOIN batches bch ON tsa.batch_id = bch.id
      WHERE tsa.teacher_id = ?
      ORDER BY s.standard_number ASC, subj.name ASC
    `).all(req.params.id);
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teachers/:id/assignments — Assign a teacher to a subject+class (+batch)
router.post('/:id/assignments', (req, res) => {
  try {
    const { standard_id, batch_id, subject_id, subject_name } = req.body;
    if (!standard_id) return res.status(400).json({ error: 'standard_id required' });

    // Check if assignment already exists
    const existing = db.prepare(`
      SELECT id FROM teacher_subject_assignments
      WHERE teacher_id = ? AND standard_id = ? 
      AND (batch_id = ? OR (batch_id IS NULL AND ? IS NULL))
      AND (subject_id = ? OR (subject_id IS NULL AND ? IS NULL))
    `).get(req.params.id, standard_id, batch_id || null, batch_id || null, subject_id || null, subject_id || null);

    if (existing) return res.status(409).json({ error: 'Assignment already exists' });

    const result = db.prepare(`
      INSERT INTO teacher_subject_assignments (teacher_id, standard_id, batch_id, subject_id, subject_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, standard_id, batch_id || null, subject_id || null, subject_name || '');

    const teacher = db.prepare('SELECT name FROM teachers WHERE id = ?').get(req.params.id);
    const standard = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(standard_id);
    logActivity('TEACHER_ASSIGN', `Assigned ${teacher?.name} to teach ${subject_name || 'All'} in ${standard?.display_name}`);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/teachers/:id/assignments/:assignmentId — Remove an assignment
router.delete('/:id/assignments/:assignmentId', (req, res) => {
  try {
    db.prepare('DELETE FROM teacher_subject_assignments WHERE id = ? AND teacher_id = ?').run(req.params.assignmentId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
