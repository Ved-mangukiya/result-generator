const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// Helper to recalculate overall attendance percentage for a student
function updateStudentAttendancePct(studentId) {
  try {
    const records = db.prepare(`
      SELECT status FROM attendance WHERE student_id = ?
    `).all(studentId);

    if (records.length === 0) return;

    let presentCount = 0;
    records.forEach(r => {
      if (r.status === 'Present' || r.status === 'Late') {
        presentCount++;
      }
    });

    const pct = Math.round((presentCount / records.length) * 100 * 10) / 10;
    db.prepare('UPDATE students SET attendance_pct = ? WHERE id = ?').run(pct, studentId);
  } catch (err) {
    console.error('Error updating student attendance pct:', err);
  }
}

// POST /api/attendance — Save or update batch attendance
router.post('/', (req, res) => {
  try {
    const { standard_id, batch_id, subject_id, attendance_date, marked_by, records } = req.body;

    if (!standard_id || !attendance_date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Missing required parameters (standard_id, attendance_date, records array)' });
    }

    const checkStmt = db.prepare(`
      SELECT id FROM attendance 
      WHERE student_id = ? AND attendance_date = ? 
      AND (subject_id IS ? OR subject_id = ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE attendance 
      SET status = ?, remarks = ?, marked_by = ? 
      WHERE id = ?
    `);

    const insertStmt = db.prepare(`
      INSERT INTO attendance (student_id, standard_id, batch_id, subject_id, attendance_date, status, remarks, marked_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const saveTx = db.transaction((recs) => {
      for (const item of recs) {
        const existing = checkStmt.get(item.student_id, attendance_date, subject_id || null, subject_id || null);
        if (existing) {
          updateStmt.run(item.status || 'Present', item.remarks || '', marked_by || 'Teacher', existing.id);
        } else {
          insertStmt.run(
            item.student_id,
            standard_id,
            batch_id || null,
            subject_id || null,
            attendance_date,
            item.status || 'Present',
            item.remarks || '',
            marked_by || 'Teacher'
          );
        }
        updateStudentAttendancePct(item.student_id);
      }
    });

    saveTx(records);
    logActivity('Mark Attendance', `Attendance saved for standard #${standard_id} on ${attendance_date} (${records.length} students)`);

    res.json({ success: true, message: `Attendance saved for ${records.length} students.` });
  } catch (err) {
    console.error('Error saving attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance — Fetch attendance records for standard/batch/date
router.get('/', (req, res) => {
  try {
    const { standard_id, batch_id, subject_id, attendance_date } = req.query;

    if (!standard_id || !attendance_date) {
      return res.status(400).json({ error: 'standard_id and attendance_date parameters are required' });
    }

    let query = `
      SELECT a.*, s.first_name, s.father_name, s.surname, s.name, s.roll_number
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.standard_id = ? AND a.attendance_date = ?
    `;
    const params = [standard_id, attendance_date];

    if (batch_id) {
      query += ' AND a.batch_id = ?';
      params.push(batch_id);
    }

    if (subject_id) {
      query += ' AND a.subject_id = ?';
      params.push(subject_id);
    } else {
      query += ' AND a.subject_id IS NULL';
    }

    const records = db.prepare(query).all(...params);
    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/student/:student_id — Complete attendance log & stats for Parent Portal
router.get('/student/:student_id', (req, res) => {
  try {
    const studentId = req.params.student_id;
    const student = db.prepare(`
      SELECT s.*, std.display_name as class_name 
      FROM students s 
      JOIN standards std ON s.standard_id = std.id 
      WHERE s.id = ?
    `).get(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const records = db.prepare(`
      SELECT a.*, sub.name as subject_name
      FROM attendance a
      LEFT JOIN subjects sub ON a.subject_id = sub.id
      WHERE a.student_id = ?
      ORDER BY a.attendance_date DESC
    `).all(studentId);

    let total = records.length;
    let present = 0, absent = 0, late = 0, excused = 0;

    records.forEach(r => {
      if (r.status === 'Present') present++;
      else if (r.status === 'Absent') absent++;
      else if (r.status === 'Late') late++;
      else if (r.status === 'Excused') excused++;
    });

    const pct = total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 100;

    res.json({
      student,
      stats: { total, present, absent, late, excused, percentage: pct },
      records
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/summary — Overall today summary stats
router.get('/summary', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const summary = db.prepare(`
      SELECT 
        status, COUNT(*) as count 
      FROM attendance 
      WHERE attendance_date = ? 
      GROUP BY status
    `).all(date);

    const result = { date, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    summary.forEach(s => {
      const k = s.status.toLowerCase();
      if (result.hasOwnProperty(k)) {
        result[k] = s.count;
      }
      result.total += s.count;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
