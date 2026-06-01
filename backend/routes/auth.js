const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const admin = db.prepare('SELECT * FROM admin WHERE email = ?').get(email);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.adminId = admin.id;
  req.session.email = admin.email;

  const profile = db.prepare('SELECT * FROM coaching_profile').get();
  res.json({ success: true, onboarding_complete: profile?.onboarding_complete === 1 });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ error: 'Not authenticated' });
  const profile = db.prepare('SELECT * FROM coaching_profile').get();
  res.json({ email: req.session.email, onboarding_complete: profile?.onboarding_complete === 1 });
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
