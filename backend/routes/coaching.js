const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/coaching
router.get('/', (req, res) => {
  const profile = db.prepare('SELECT * FROM coaching_profile').get();
  res.json(profile || {});
});

// PUT /api/coaching
router.put('/', (req, res) => {
  const { name, tagline, address, phone, website, primary_color, onboarding_complete } = req.body;
  const existing = db.prepare('SELECT id FROM coaching_profile').get();

  if (existing) {
    db.prepare(`UPDATE coaching_profile SET 
      name = ?, tagline = ?, address = ?, phone = ?, website = ?, primary_color = ?,
      onboarding_complete = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`).run(name, tagline, address, phone, website, primary_color, onboarding_complete ? 1 : 0, existing.id);
  } else {
    db.prepare(`INSERT INTO coaching_profile (name, tagline, address, phone, website, primary_color, onboarding_complete)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(name, tagline, address, phone, website, primary_color, onboarding_complete ? 1 : 0);
  }
  logActivity('PROFILE_UPDATE', `Coaching profile updated: ${name}`);
  res.json({ success: true });
});

// POST /api/coaching/logo — handled by upload route
module.exports = router;
