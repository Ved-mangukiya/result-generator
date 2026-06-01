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
  const { name, tagline, address, phone, website, primary_color, onboarding_complete, weekly_tests_count, has_midsem, has_final, signatory_name } = req.body;
  const existing = db.prepare('SELECT id FROM coaching_profile').get();

  const w_count = weekly_tests_count !== undefined ? parseInt(weekly_tests_count) : 40;
  const midsem = has_midsem !== undefined ? parseInt(has_midsem) : 1;
  const final = has_final !== undefined ? parseInt(has_final) : 1;

  if (existing) {
    db.prepare(`UPDATE coaching_profile SET 
      name = ?, tagline = ?, address = ?, phone = ?, website = ?, primary_color = ?,
      onboarding_complete = ?, weekly_tests_count = ?, has_midsem = ?, has_final = ?,
      signatory_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`).run(
        name, tagline, address, phone, website, primary_color, 
        onboarding_complete ? 1 : 0, w_count, midsem, final,
        signatory_name || '', existing.id
      );
  } else {
    db.prepare(`INSERT INTO coaching_profile (name, tagline, address, phone, website, primary_color, onboarding_complete, weekly_tests_count, has_midsem, has_final, signatory_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        name, tagline, address, phone, website, primary_color, 
        onboarding_complete ? 1 : 0, w_count, midsem, final, signatory_name || ''
      );
  }
  logActivity('PROFILE_UPDATE', `Coaching profile updated: ${name}`);
  res.json({ success: true });
});

// POST /api/coaching/logo — handled by upload route
module.exports = router;
