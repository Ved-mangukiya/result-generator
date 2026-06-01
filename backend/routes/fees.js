const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/fees/student/:studentId — Get fee details and payment logs
router.get('/student/:studentId', (req, res) => {
  const student = db.prepare(`
    SELECT id, name, roll_number, total_fees, paid_fees, standard_id
    FROM students WHERE id = ?
  `).get(req.params.studentId);

  if (!student) return res.status(404).json({ error: 'Student not found' });

  const payments = db.prepare(`
    SELECT * FROM fee_payments WHERE student_id = ? ORDER BY payment_date DESC, id DESC
  `).all(req.params.studentId);

  res.json({
    student,
    payments,
    outstanding: Math.max(0, (student.total_fees || 0) - (student.paid_fees || 0))
  });
});

// POST /api/fees/student/:studentId/payments — Record a new payment
router.post('/student/:studentId/payments', (req, res) => {
  const { amount, payment_date, payment_method, remarks } = req.body;
  const studentId = req.params.studentId;

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required' });
  }
  if (!payment_date) return res.status(400).json({ error: 'Payment date is required' });
  if (!payment_method) return res.status(400).json({ error: 'Payment method is required' });

  const student = db.prepare('SELECT name FROM students WHERE id = ?').get(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  // Insert payment
  const result = db.prepare(`
    INSERT INTO fee_payments (student_id, amount, payment_date, payment_method, remarks)
    VALUES (?, ?, ?, ?, ?)
  `).run(studentId, parseFloat(amount), payment_date, payment_method, remarks || '');

  // Recalculate student paid_fees
  db.prepare(`
    UPDATE students 
    SET paid_fees = (SELECT COALESCE(SUM(amount), 0) FROM fee_payments WHERE student_id = ?)
    WHERE id = ?
  `).run(studentId, studentId);

  logActivity('FEE_PAYMENT_RECORD', `Recorded payment of ₹${amount} for student ${student.name} via ${payment_method}`);
  res.json({ success: true, paymentId: result.lastInsertRowid });
});

// DELETE /api/fees/payments/:paymentId — Delete a payment
router.delete('/payments/:paymentId', (req, res) => {
  const payment = db.prepare('SELECT * FROM fee_payments WHERE id = ?').get(req.params.paymentId);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  const student = db.prepare('SELECT name FROM students WHERE id = ?').get(payment.student_id);

  // Delete payment
  db.prepare('DELETE FROM fee_payments WHERE id = ?').run(req.params.paymentId);

  // Recalculate student paid_fees
  db.prepare(`
    UPDATE students 
    SET paid_fees = (SELECT COALESCE(SUM(amount), 0) FROM fee_payments WHERE student_id = ?)
    WHERE id = ?
  `).run(payment.student_id, payment.student_id);

  logActivity('FEE_PAYMENT_DELETE', `Deleted payment ID ${payment.id} (₹${payment.amount}) for student ${student?.name || 'Unknown'}`);
  res.json({ success: true });
});

module.exports = router;
