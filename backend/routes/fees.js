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

// ══════════════════════════════════════════════════════════════════════════════
//   FEE PDF DOWNLOADS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/fees/student/:studentId/ledger-pdf
router.get('/student/:studentId/ledger-pdf', async (req, res) => {
  try {
    const { generateStudentLedgerPDF } = require('../services/feesPdfService');
    const { filename, outputPath } = await generateStudentLedgerPDF(parseInt(req.params.studentId));

    const student = db.prepare('SELECT name FROM students WHERE id = ?').get(req.params.studentId);
    const coaching = db.prepare('SELECT name FROM coaching_profile').get() || {};
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2,'0') + '-' + String(now.getMinutes()).padStart(2,'0');
    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g,'_');
    const studentClean  = (student?.name || 'Student').replace(/[^a-zA-Z0-9]/g,'_');
    const dlName = `${coachingClean}_${studentClean}_FeeLedger_${dateStr}_${timeStr}.pdf`;

    res.download(outputPath, dlName, err => {
      if (err) console.error('Ledger PDF download error:', err);
      try { require('fs').unlinkSync(outputPath); } catch(e) {}
    });
  } catch (err) {
    console.error('Ledger PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fees/payments/:paymentId/receipt-pdf
router.get('/payments/:paymentId/receipt-pdf', async (req, res) => {
  try {
    const { generatePaymentReceiptPDF } = require('../services/feesPdfService');
    const { filename, outputPath } = await generatePaymentReceiptPDF(parseInt(req.params.paymentId));

    const payment = db.prepare('SELECT * FROM fee_payments WHERE id = ?').get(req.params.paymentId);
    const student  = payment ? db.prepare('SELECT name FROM students WHERE id = ?').get(payment.student_id) : null;
    const coaching = db.prepare('SELECT name FROM coaching_profile').get() || {};
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g,'_');
    const studentClean  = (student?.name || 'Student').replace(/[^a-zA-Z0-9]/g,'_');
    const dlName = `${coachingClean}_Receipt_${studentClean}_${String(req.params.paymentId).padStart(4,'0')}_${dateStr}.pdf`;

    res.download(outputPath, dlName, err => {
      if (err) console.error('Receipt PDF download error:', err);
      try { require('fs').unlinkSync(outputPath); } catch(e) {}
    });
  } catch (err) {
    console.error('Receipt PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fees/standard/:standardId/bulk-ledger-pdf
router.get('/standard/:standardId/bulk-ledger-pdf', async (req, res) => {
  try {
    const { generateBulkLedgerPDF } = require('../services/feesPdfService');
    const { filename, outputPath } = await generateBulkLedgerPDF(parseInt(req.params.standardId));

    const standard = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(req.params.standardId);
    const coaching  = db.prepare('SELECT name FROM coaching_profile').get() || {};
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2,'0') + '-' + String(now.getMinutes()).padStart(2,'0');
    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g,'_');
    const stdClean      = (standard?.display_name || 'Class').replace(/[^a-zA-Z0-9]/g,'_');
    const dlName = `${coachingClean}_${stdClean}_BulkFeeLedger_${dateStr}_${timeStr}.pdf`;

    res.download(outputPath, dlName, err => {
      if (err) console.error('Bulk ledger PDF download error:', err);
      try { require('fs').unlinkSync(outputPath); } catch(e) {}
    });
  } catch (err) {
    console.error('Bulk ledger PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

