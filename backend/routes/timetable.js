const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// ─── Helpers ───────────────────────────────────────────────────────────────

function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minsToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Check overlap between two time ranges
function overlaps(startA, endA, startB, endB) {
  const sA = timeToMins(startA), eA = timeToMins(endA);
  const sB = timeToMins(startB), eB = timeToMins(endB);
  return sA < eB && sB < eA;
}

// ─── Timetable Config ──────────────────────────────────────────────────────

// GET /api/timetable/config/:standard_id
router.get('/config/:standard_id', (req, res) => {
  try {
    const { batch_id } = req.query;
    let config = db.prepare('SELECT * FROM timetable_configs WHERE standard_id = ? AND (batch_id = ? OR batch_id IS NULL)')
      .get(req.params.standard_id, batch_id || null);
    if (!config) {
      config = {
        standard_id: req.params.standard_id,
        batch_id: batch_id || null,
        lectures_per_day: 6,
        slot_duration_mins: 60,
        start_time: '08:00',
        end_time: '15:00',
        break_duration_mins: 20,
        working_days: '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'
      };
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/timetable/config/:standard_id
router.put('/config/:standard_id', (req, res) => {
  try {
    const { batch_id, lectures_per_day, slot_duration_mins, start_time, end_time, break_duration_mins, working_days } = req.body;
    const existing = db.prepare('SELECT id FROM timetable_configs WHERE standard_id = ? AND (batch_id = ? OR batch_id IS NULL)')
      .get(req.params.standard_id, batch_id || null);
    if (existing) {
      db.prepare(`UPDATE timetable_configs SET lectures_per_day=?, slot_duration_mins=?, start_time=?, end_time=?, break_duration_mins=?, working_days=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(lectures_per_day || 6, slot_duration_mins || 60, start_time || '08:00', end_time || '15:00', break_duration_mins || 20, typeof working_days === 'string' ? working_days : JSON.stringify(working_days), existing.id);
    } else {
      db.prepare(`INSERT INTO timetable_configs (standard_id, batch_id, lectures_per_day, slot_duration_mins, start_time, end_time, break_duration_mins, working_days) VALUES (?,?,?,?,?,?,?,?)`)
        .run(req.params.standard_id, batch_id || null, lectures_per_day || 6, slot_duration_mins || 60, start_time || '08:00', end_time || '15:00', break_duration_mins || 20, typeof working_days === 'string' ? working_days : JSON.stringify(working_days));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Timetable Slots ───────────────────────────────────────────────────────

// GET /api/timetable — List slots with optional filters
router.get('/', (req, res) => {
  const { standard_id, batch_id, teacher_id, teacher_name } = req.query;
  try {
    let query = `
      SELECT tt.*, t.name as teacher_fullname, t.email as teacher_email,
             s.display_name as class_name, b.short_name as board_short
      FROM timetable tt
      LEFT JOIN teachers t ON tt.teacher_id = t.id
      LEFT JOIN standards s ON tt.standard_id = s.id
      LEFT JOIN boards b ON s.board_id = b.id
    `;
    const params = [];
    const clauses = [];

    if (standard_id) { clauses.push('tt.standard_id = ?'); params.push(standard_id); }
    if (batch_id) { clauses.push('tt.batch_id = ?'); params.push(batch_id); }
    if (teacher_id) { clauses.push('tt.teacher_id = ?'); params.push(teacher_id); }
    if (teacher_name) { clauses.push('LOWER(tt.teacher_name) LIKE LOWER(?)'); params.push(`%${teacher_name}%`); }

    if (clauses.length > 0) query += ' WHERE ' + clauses.join(' AND ');
    query += " ORDER BY CASE tt.day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END, tt.start_time ASC, tt.id ASC";

    const slots = db.prepare(query).all(...params);
    res.json({ slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable — Add slot with conflict detection
router.post('/', (req, res) => {
  const { standard_id, batch_id, day_of_week, time_slot, start_time, end_time, subject_name, subject_id, teacher_name, teacher_id, room_no } = req.body;
  if (!standard_id || !day_of_week || !subject_name) {
    return res.status(400).json({ error: 'standard_id, day_of_week, and subject_name are required' });
  }

  try {
    const conflicts = [];

    // Check class conflict: same class, same day, overlapping time
    if (start_time && end_time) {
      const classSlots = db.prepare('SELECT * FROM timetable WHERE standard_id = ? AND day_of_week = ? AND start_time != "" AND end_time != ""').all(standard_id, day_of_week);
      for (const slot of classSlots) {
        if (overlaps(start_time, end_time, slot.start_time, slot.end_time)) {
          conflicts.push({ type: 'class', message: `Class conflict with ${slot.subject_name} (${slot.start_time}–${slot.end_time})`, slot });
        }
      }

      // Check teacher conflict: same teacher, same day, overlapping time in ANY class
      if (teacher_id) {
        const teacherSlots = db.prepare('SELECT tt.*, s.display_name as class_name FROM timetable tt LEFT JOIN standards s ON tt.standard_id = s.id WHERE tt.teacher_id = ? AND tt.day_of_week = ? AND tt.start_time != "" AND tt.end_time != ""').all(teacher_id, day_of_week);
        for (const slot of teacherSlots) {
          if (overlaps(start_time, end_time, slot.start_time, slot.end_time)) {
            conflicts.push({ type: 'teacher', message: `Teacher conflict: ${teacher_name || 'Teacher'} is already teaching ${slot.subject_name} in ${slot.class_name} (${slot.start_time}–${slot.end_time})`, slot });
          }
        }
      }
    }

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Scheduling conflict detected', conflicts });
    }

    const computedTimeSlot = (start_time && end_time) ? `${start_time}–${end_time}` : (time_slot || '');

    const result = db.prepare(`
      INSERT INTO timetable (standard_id, batch_id, day_of_week, time_slot, start_time, end_time, subject_name, subject_id, teacher_name, teacher_id, room_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(standard_id, batch_id || null, day_of_week, computedTimeSlot, start_time || '', end_time || '', subject_name, subject_id || null, teacher_name || '', teacher_id || null, room_no || 'Room 101');

    logActivity('TIMETABLE_ADD', `Added slot: ${subject_name} (${day_of_week} ${computedTimeSlot})`);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/timetable/:id — Update a slot
router.put('/:id', (req, res) => {
  const { day_of_week, start_time, end_time, subject_name, subject_id, teacher_name, teacher_id, room_no } = req.body;
  try {
    const time_slot = (start_time && end_time) ? `${start_time}–${end_time}` : req.body.time_slot || '';
    db.prepare(`
      UPDATE timetable SET day_of_week=?, time_slot=?, start_time=?, end_time=?, subject_name=?, subject_id=?, teacher_name=?, teacher_id=?, room_no=?
      WHERE id=?
    `).run(day_of_week, time_slot, start_time || '', end_time || '', subject_name, subject_id || null, teacher_name || '', teacher_id || null, room_no || '', req.params.id);
    logActivity('TIMETABLE_UPDATE', `Updated timetable slot #${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timetable/clear/:standard_id — Clear all slots for a class
// IMPORTANT: Must come BEFORE /:id to avoid Express matching "clear" as an id
router.delete('/clear/:standard_id', (req, res) => {
  try {
    const { batch_id } = req.query;
    if (batch_id) {
      db.prepare('DELETE FROM timetable WHERE standard_id = ? AND batch_id = ?').run(req.params.standard_id, batch_id);
    } else {
      db.prepare('DELETE FROM timetable WHERE standard_id = ?').run(req.params.standard_id);
    }
    logActivity('TIMETABLE_CLEAR', `Cleared timetable for class #${req.params.standard_id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timetable/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM timetable WHERE id = ?').run(req.params.id);
    logActivity('TIMETABLE_DELETE', `Deleted timetable slot #${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable/automate — Auto-generate timetable for a class
router.post('/automate', (req, res) => {
  const { standard_id, batch_id, start_time, end_time, slot_duration_mins, break_duration_mins, lectures_per_day, working_days, clear_existing } = req.body;
  if (!standard_id) return res.status(400).json({ error: 'standard_id required' });

  try {
    const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(standard_id);
    if (!standard) return res.status(404).json({ error: 'Class not found' });

    // Get subject list
    const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order ASC').all(standard_id);
    if (subjects.length === 0) return res.status(400).json({ error: 'No subjects found for this class. Please add subjects first.' });

    // Get teacher assignments for this class
    const assignments = db.prepare(`
      SELECT tsa.*, t.name as teacher_name, t.id as tid, subj.name as subject_name_actual
      FROM teacher_subject_assignments tsa
      JOIN teachers t ON tsa.teacher_id = t.id
      LEFT JOIN subjects subj ON tsa.subject_id = subj.id
      WHERE tsa.standard_id = ?
    `).all(standard_id);

    // Build teacher→subject map
    const teacherForSubject = {};
    for (const a of assignments) {
      const key = a.subject_id || a.subject_name;
      if (key && !teacherForSubject[key]) {
        teacherForSubject[key] = { id: a.tid, name: a.teacher_name };
      }
    }

    const days = working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysArr = typeof days === 'string' ? JSON.parse(days) : days;
    const durationMins = slot_duration_mins || 60;
    const breakMins = break_duration_mins || 20;
    const lecturesPerDay = lectures_per_day || 6;
    const classStartMins = timeToMins(start_time || '08:00');

    // Determine subject weights by educational logic
    const classNum = standard.standard_number;
    const stream = (standard.stream || '').toLowerCase();

    const CORE_SUBJECTS = ['mathematics', 'math', 'maths', 'science', 'physics', 'chemistry', 'biology', 'accounts', 'accountancy', 'economics'];
    const LANG_SUBJECTS = ['english', 'hindi', 'gujarati', 'language', 'literature', 'sanskrit'];
    const SOCIAL_SUBJECTS = ['social science', 'social studies', 'history', 'geography', 'civics', 'politics', 'sociology'];
    const LIGHT_SUBJECTS = ['pt', 'physical education', 'drawing', 'arts', 'craft', 'music', 'value education', 'moral science', 'gk', 'general knowledge'];

    function getWeight(subName) {
      const n = subName.toLowerCase();
      if (LIGHT_SUBJECTS.some(k => n.includes(k))) {
        return classNum >= 11 ? 0 : 1; // Exclude for senior classes
      }
      if (CORE_SUBJECTS.some(k => n.includes(k))) return 5;
      if (LANG_SUBJECTS.some(k => n.includes(k))) return 3;
      if (SOCIAL_SUBJECTS.some(k => n.includes(k))) return 3;
      return 3; // Default
    }

    // Build weighted subject pool for the week
    const eligibleSubjects = subjects.filter(s => getWeight(s.name) > 0);
    if (eligibleSubjects.length === 0) return res.status(400).json({ error: 'No eligible subjects found for auto-generation.' });

    const totalSlotsPerWeek = daysArr.length * lecturesPerDay;
    const totalWeight = eligibleSubjects.reduce((sum, s) => sum + getWeight(s.name), 0);

    // Assign slots proportionally
    let subjectPool = [];
    for (const subj of eligibleSubjects) {
      const count = Math.max(1, Math.round((getWeight(subj.name) / totalWeight) * totalSlotsPerWeek));
      for (let i = 0; i < count; i++) subjectPool.push(subj);
    }

    // Shuffle pool
    for (let i = subjectPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [subjectPool[i], subjectPool[j]] = [subjectPool[j], subjectPool[i]];
    }

    // Pad or trim to exact slots needed
    while (subjectPool.length < totalSlotsPerWeek) {
      subjectPool.push(...eligibleSubjects.slice(0, totalSlotsPerWeek - subjectPool.length));
    }
    subjectPool = subjectPool.slice(0, totalSlotsPerWeek);

    // Clear existing if requested
    if (clear_existing) {
      if (batch_id) {
        db.prepare('DELETE FROM timetable WHERE standard_id = ? AND batch_id = ?').run(standard_id, batch_id);
      } else {
        db.prepare('DELETE FROM timetable WHERE standard_id = ?').run(standard_id);
      }
    }

    // Insert slots day by day
    const insertStmt = db.prepare(`
      INSERT INTO timetable (standard_id, batch_id, day_of_week, time_slot, start_time, end_time, subject_name, subject_id, teacher_name, teacher_id, room_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction(() => {
      let poolIdx = 0;
      let createdCount = 0;
      for (const day of daysArr) {
        let currentMins = classStartMins;
        for (let i = 0; i < lecturesPerDay; i++) {
          if (poolIdx >= subjectPool.length) break;
          // Add break after half the lectures
          if (i === Math.floor(lecturesPerDay / 2)) {
            currentMins += breakMins;
          }
          const subj = subjectPool[poolIdx++];
          const slotStart = minsToTime(currentMins);
          const slotEnd = minsToTime(currentMins + durationMins);
          const timeSlotStr = `${slotStart}–${slotEnd}`;

          // Find teacher for this subject
          const teacherAssign = teacherForSubject[subj.id] || teacherForSubject[subj.name] || null;

          insertStmt.run(
            standard_id,
            batch_id || null,
            day,
            timeSlotStr,
            slotStart,
            slotEnd,
            subj.name,
            subj.id,
            teacherAssign ? teacherAssign.name : '',
            teacherAssign ? teacherAssign.id : null,
            'Room 101'
          );
          currentMins += durationMins;
          createdCount++;
        }
      }
      return createdCount;
    });

    const count = insertAll();
    logActivity('TIMETABLE_AUTO', `Auto-generated ${count} slots for ${standard.display_name}`);
    res.json({ success: true, slots_created: count, message: `Auto-generated ${count} lecture slots for ${standard.display_name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
