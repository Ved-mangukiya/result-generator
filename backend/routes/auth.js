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

  // Force session save before responding
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ error: 'Session save failed' });
    }
    
    const profile = db.prepare('SELECT * FROM coaching_profile').get();
    res.json({ success: true, onboarding_complete: profile?.onboarding_complete === 1 });
  });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Validate email format simply
  if (!email.includes('@') || email.length < 5) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if admin already exists
    const existing = db.prepare('SELECT id FROM admin WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO admin (email, password_hash) VALUES (?, ?)').run(email, hash);

    req.session.adminId = result.lastInsertRowid;
    req.session.email = email;

    // Force session save before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      const profile = db.prepare('SELECT * FROM coaching_profile').get();
      res.json({ success: true, onboarding_complete: profile?.onboarding_complete === 1 });
    });
  } catch (err) {
    console.error('Registration error:', err);
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
