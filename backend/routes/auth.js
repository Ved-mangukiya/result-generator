const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');

// POST /api/auth/login — Multi-role authentication (Admin, Teacher, Parent)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Username / Roll No and password required' });

  const queryUser = email.trim();

  // 1. Check Admin Table
  const admin = db.prepare('SELECT * FROM admin WHERE LOWER(email) = LOWER(?)').get(queryUser);
  if (admin) {
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (valid) {
      req.session.adminId = admin.id;
      req.session.role = 'admin';
      req.session.email = admin.email;
      const profile = db.prepare('SELECT * FROM coaching_profile').get();
      return req.session.save(() => res.json({ success: true, role: 'admin', onboarding_complete: profile?.onboarding_complete === 1 }));
    }
  }

  // 2. Check Teacher Table
  const cleanPhone = queryUser.replace(/[\s\-\+]/g, '').replace(/^91/, '');
  const teacher = db.prepare(`
    SELECT * FROM teachers 
    WHERE LOWER(email) = LOWER(?)
       OR LOWER(username) = LOWER(?)
       OR LOWER(name) = LOWER(?)
       OR (phone != '' AND REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+91', ''), '+', '') = ?)
  `).get(queryUser, queryUser, queryUser, cleanPhone);

  if (teacher) {
    let valid = false;
    if (teacher.plain_password && teacher.plain_password.trim() === password.trim()) {
      valid = true;
    }
    if (!valid && teacher.password_hash) {
      try {
        valid = await bcrypt.compare(password, teacher.password_hash);
      } catch (e) {}
    }
    // Fallback default passwords
    if (!valid && (password === 'teacher123' || password === 'teacher@123')) {
      valid = true;
    }

    if (valid) {
      let perms = [];
      try { perms = JSON.parse(teacher.permissions || '[]'); } catch { perms = []; }
      req.session.teacherId = teacher.id;
      req.session.role = 'teacher';
      req.session.name = teacher.name;
      req.session.email = teacher.email;
      req.session.permissions = perms;
      return req.session.save(() => res.json({ success: true, role: 'teacher', teacher, permissions: perms, onboarding_complete: true }));
    }
  }

  // 3. Check Student Table (Parent Login via Roll Number or Username)
  const student = db.prepare(`
    SELECT * FROM students 
    WHERE LOWER(roll_number) = LOWER(?) OR LOWER(parent_username) = LOWER(?) OR LOWER(first_name || ' ' || surname) = LOWER(?)
  `).get(queryUser, queryUser, queryUser);

  if (student) {
    let valid = false;
    if (student.parent_password && student.parent_password.trim() === password.trim()) {
      valid = true;
    }
    if (!valid && student.parent_password_hash) {
      valid = await bcrypt.compare(password, student.parent_password_hash);
    }
    // Fallback default password
    if (!valid && (password === 'parent123' || password.toLowerCase() === student.roll_number.toLowerCase())) {
      valid = true;
    }

    if (valid) {
      req.session.studentId = student.id;
      req.session.role = 'parent';
      req.session.name = student.name;
      return req.session.save(() => res.json({ success: true, role: 'parent', student_id: student.id, student, onboarding_complete: true }));
    }
  }

  return res.status(401).json({ error: 'Invalid email, roll number, or password' });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  if (!email.includes('@') || email.length < 5) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const existing = db.prepare('SELECT id FROM admin WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO admin (email, password_hash) VALUES (?, ?)').run(email, hash);

    req.session.adminId = result.lastInsertRowid;
    req.session.role = 'admin';
    req.session.email = email;

    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session save failed' });
      const profile = db.prepare('SELECT * FROM coaching_profile').get();
      res.json({ success: true, role: 'admin', onboarding_complete: profile?.onboarding_complete === 1 });
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session.adminId) {
    const profile = db.prepare('SELECT * FROM coaching_profile').get();
    return res.json({ role: 'admin', email: req.session.email, onboarding_complete: profile?.onboarding_complete === 1 });
  } else if (req.session.teacherId) {
    // Re-fetch fresh permissions from DB in case admin updated them
    const teacher = db.prepare('SELECT name, email, permissions FROM teachers WHERE id = ?').get(req.session.teacherId);
    let perms = [];
    try { perms = JSON.parse(teacher?.permissions || '[]'); } catch { perms = []; }
    return res.json({ role: 'teacher', name: req.session.name, email: req.session.email, teacher_id: req.session.teacherId, permissions: perms, onboarding_complete: true });
  } else if (req.session.studentId) {
    return res.json({ role: 'parent', name: req.session.name, student_id: req.session.studentId, onboarding_complete: true });
  }
  return res.status(401).json({ error: 'Not authenticated' });
});

// PUT /api/auth/change-password
router.put('/change-password', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ error: 'Not authenticated' });
  const { current_password, new_password } = req.body;

  const admin = db.prepare('SELECT * FROM admin WHERE id = ?').get(req.session.adminId);
  const valid = await bcrypt.compare(current_password, admin.password_hash);
  if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(new_password, 10);
  db.prepare('UPDATE admin SET password_hash = ? WHERE id = ?').run(hash, req.session.adminId);
  res.json({ success: true });
});

module.exports = router;
