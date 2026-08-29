const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, logActivity } = require('../db/database');

// GET /api/teachers — List all teachers with their credentials and assignments
router.get('/', (req, res) => {
  try {
    const teachers = db.prepare('SELECT id, name, username, email, phone, plain_password, assigned_standards, subjects_taught, permissions, created_at FROM teachers ORDER BY id DESC').all();
    // Parse permissions JSON for each teacher and ensure username/plain_password exist
    teachers.forEach(t => {
      try { t.permissions = JSON.parse(t.permissions || '[]'); } catch { t.permissions = []; }
      if (!t.username || t.username.trim() === '') {
        t.username = (t.email || '').split('@')[0] || (t.name || 'teacher').toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      if (!t.plain_password) t.plain_password = 'teacher123';
    });
    res.json({ teachers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teachers/:id — Get single teacher
router.get('/:id', (req, res) => {
  try {
    const teacher = db.prepare('SELECT id, name, username, email, phone, plain_password, assigned_standards, subjects_taught, permissions, created_at FROM teachers WHERE id = ?').get(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    try { teacher.permissions = JSON.parse(teacher.permissions || '[]'); } catch { teacher.permissions = []; }
    if (!teacher.username || teacher.username.trim() === '') {
      teacher.username = (teacher.email || '').split('@')[0] || (teacher.name || 'teacher').toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    if (!teacher.plain_password) teacher.plain_password = 'teacher123';
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teachers — Add new faculty account (Auto-generates or accepts login credentials)
router.post('/', async (req, res) => {
  try {
    let { name, username, email, phone, assigned_standards, subjects_taught, password } = req.body;
    if (!name) return res.status(400).json({ error: 'Teacher name is required' });

    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);

    if (!username || username.trim() === '') {
      username = `${cleanName}${randNum}`;
    } else {
      username = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }

    if (!email || email.trim() === '') {
      email = `${username}@edutrack.local`;
    } else {
      email = email.trim();
    }

    const defaultPass = password && password.trim() !== '' ? password.trim() : 'teacher123';
    const hash = await bcrypt.hash(defaultPass, 10);

    const existing = db.prepare('SELECT id FROM teachers WHERE LOWER(email) = LOWER(?) OR (username != \'\' AND LOWER(username) = LOWER(?))').get(email, username);
    if (existing) {
      return res.status(400).json({ error: `Faculty with email or username '${email}' is already registered` });
    }

    const result = db.prepare(`
      INSERT INTO teachers (name, username, email, phone, plain_password, password_hash, assigned_standards, subjects_taught)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, username, email, phone || '', defaultPass, hash, assigned_standards || 'All Classes', subjects_taught || 'General');

    logActivity('TEACHER_ADD', `Added Faculty: ${name} (User: ${username} | Email: ${email})`);

    res.json({
      success: true,
      id: result.lastInsertRowid,
      name,
      username,
      email,
      credentials: { username: username, email: email, password: defaultPass }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teachers/:id — Update teacher info & credentials
router.put('/:id', async (req, res) => {
  try {
    const { name, username, email, phone, password, assigned_standards, subjects_taught } = req.body;
    const current = db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Teacher not found' });

    let finalPass = current.plain_password || 'teacher123';
    let finalHash = current.password_hash;

    if (password && password.trim() !== '') {
      finalPass = password.trim();
      finalHash = await bcrypt.hash(finalPass, 10);
    }

    const finalUser = (username && username.trim() !== '') ? username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') : current.username;
    const finalEmail = (email && email.trim() !== '') ? email.trim() : (current.email || `${finalUser}@edutrack.local`);

    // Check if email or username already taken by another teacher
    const duplicate = db.prepare(`
      SELECT id, name FROM teachers 
      WHERE (LOWER(email) = LOWER(?) OR (username != '' AND LOWER(username) = LOWER(?))) 
        AND id != ?
    `).get(finalEmail, finalUser, req.params.id);

    if (duplicate) {
      return res.status(400).json({ error: `Username or Email is already taken by '${duplicate.name}'.` });
    }

    db.prepare(`
      UPDATE teachers 
      SET name = ?, username = ?, email = ?, phone = ?, plain_password = ?, password_hash = ?, assigned_standards = ?, subjects_taught = ?
      WHERE id = ?
    `).run(
      name || current.name,
      finalUser,
      finalEmail,
      phone !== undefined ? phone : current.phone,
      finalPass,
      finalHash,
      assigned_standards !== undefined ? assigned_standards : current.assigned_standards,
      subjects_taught !== undefined ? subjects_taught : current.subjects_taught,
      req.params.id
    );

    logActivity('TEACHER_UPDATE', `Updated Faculty #${req.params.id}: ${name || current.name} (User: ${finalUser})`);
    res.json({ success: true, teacher: { id: req.params.id, name: name || current.name, username: finalUser, email: finalEmail, plain_password: finalPass } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teachers/:id/credentials — Quick Real-time credential update (Admin only)
router.put('/:id/credentials', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    let finalUser = username ? username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') : teacher.username;
    let finalEmail = email ? email.trim() : teacher.email;
    let finalPass = password && password.trim() !== '' ? password.trim() : (teacher.plain_password || 'teacher123');
    let hash = await bcrypt.hash(finalPass, 10);

    // Check duplicate
    const duplicate = db.prepare(`
      SELECT id, name FROM teachers 
      WHERE (LOWER(email) = LOWER(?) OR (username != '' AND LOWER(username) = LOWER(?))) 
        AND id != ?
    `).get(finalEmail, finalUser, req.params.id);

    if (duplicate) {
      return res.status(400).json({ error: `Username or Email is already taken by '${duplicate.name}'.` });
    }

    db.prepare(`
      UPDATE teachers 
      SET username = ?, email = ?, plain_password = ?, password_hash = ?
      WHERE id = ?
    `).run(finalUser, finalEmail, finalPass, hash, req.params.id);

    logActivity('TEACHER_CREDENTIALS_UPDATE', `Updated credentials for Faculty ID #${req.params.id} (${teacher.name}): User=${finalUser}, Pass=${finalPass}`);
    res.json({ success: true, username: finalUser, email: finalEmail, password: finalPass });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teachers/:id/permissions — Update faculty permissions (Admin only)
router.put('/:id/permissions', (req, res) => {
  try {
    if (!req.session.adminId) return res.status(403).json({ error: 'Admin access required' });
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions must be an array' });
    const validPermissions = [
      'view_students', 'enter_marks', 'take_attendance', 'view_timetable',
      'edit_timetable', 'view_tests', 'create_tests', 'view_results',
      'view_reminders', 'manage_reminders', 'view_fees', 'manage_notices'
    ];
    const filtered = permissions.filter(p => validPermissions.includes(p));
    db.prepare('UPDATE teachers SET permissions = ? WHERE id = ?').run(JSON.stringify(filtered), req.params.id);
    const teacher = db.prepare('SELECT name FROM teachers WHERE id = ?').get(req.params.id);
    logActivity('TEACHER_PERMISSIONS', `Updated permissions for ${teacher?.name || 'Faculty'} ID #${req.params.id}: [${filtered.join(', ')}]`);
    res.json({ success: true, permissions: filtered });
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
