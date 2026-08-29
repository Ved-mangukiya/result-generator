const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { generateSinglePDF, generateBulkPDF, buildResultCardHTML } = require('../services/pdfService');
const { exportClassToExcel } = require('../services/excelService');
const { generateToken } = require('../services/tokenService');
const { calculateStudentResult, calculateRanks } = require('../services/gradeService');

// GET /api/export/download-token — get temporary download token
router.get('/download-token', (req, res) => {
  try {
    const token = generateToken(req.session.adminId || 1);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/results/:standardId — get computed results for entire class
router.get('/results/:standardId', (req, res) => {
  const standard = db.prepare(`SELECT s.*, b.name as board_name, b.id as board_id_val, b.short_name as board_short
    FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?`).get(req.params.standardId);
  if (!standard) return res.status(404).json({ error: 'Standard not found' });

  const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(req.params.standardId);
  
  const { batch_id } = req.query;
  let studentsQuery = 'SELECT * FROM students WHERE standard_id = ?';
  const studentsParams = [req.params.standardId];
  if (batch_id) {
    studentsQuery += ' AND batch_id = ?';
    studentsParams.push(batch_id);
  }
  studentsQuery += ' ORDER BY CAST(roll_number AS INTEGER) ASC, roll_number ASC';
  const students = db.prepare(studentsQuery).all(...studentsParams);

  const studentResults = students.map(student => {
    const marksRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(student.id);
    const marksMap = {};
    marksRows.forEach(m => { marksMap[m.subject_id] = m; });
    const result = calculateStudentResult(student, subjects, marksMap, standard.board_id_val);
    return { student, ...result, student_id: student.id };
  });

  const rankMap = calculateRanks(studentResults);
  const withRanks = studentResults.map(sr => ({ ...sr, rank: rankMap[sr.student.id] }));

  res.json({ standard, subjects, students: withRanks });
});

// GET /api/export/preview/:studentId — preview result card HTML
router.get('/preview/:studentId', async (req, res) => {
  try {
    const settings = db.prepare(`
      SELECT rcs.template_id FROM result_card_settings rcs 
      JOIN students st ON st.standard_id = rcs.standard_id 
      WHERE st.id = ?`).get(req.params.studentId);
    const templateId = settings?.template_id || 1;
    const templatePath = path.join(__dirname, `../../templates/template${templateId}.html`);
    const cycleId = req.query.cycle_id ? parseInt(req.query.cycle_id) : null;
    const html = await buildResultCardHTML(req.params.studentId, templatePath, cycleId);
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/preview/:studentId/template/:templateId — preview with specific template
router.get('/preview/:studentId/template/:templateId', async (req, res) => {
  try {
    const templatePath = path.join(__dirname, `../../templates/template${req.params.templateId}.html`);
    if (!fs.existsSync(templatePath)) return res.status(404).json({ error: 'Template not found' });
    const cycleId = req.query.cycle_id ? parseInt(req.query.cycle_id) : null;
    const html = await buildResultCardHTML(req.params.studentId, templatePath, cycleId);
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/export/pdf/single/:studentId
router.post('/pdf/single/:studentId', async (req, res) => {
  try {
    const settings = db.prepare(`SELECT rcs.template_id FROM result_card_settings rcs 
      JOIN students st ON st.standard_id = rcs.standard_id WHERE st.id = ?`).get(req.params.studentId);
    const templateId = req.body.template_id || settings?.template_id || 1;

    res.json({ message: 'PDF generation started...' });
    const { filename, outputPath } = await generateSinglePDF(parseInt(req.params.studentId), templateId);
    // For streaming approach, use a different endpoint
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/pdf/single/:studentId/download
router.get('/pdf/single/:studentId/download', async (req, res) => {
  try {
    const settings = db.prepare(`SELECT rcs.template_id FROM result_card_settings rcs 
      JOIN students st ON st.standard_id = rcs.standard_id WHERE st.id = ?`).get(req.params.studentId);
    const templateId = req.query.template_id || settings?.template_id || 1;
    const templatePath = path.join(__dirname, `../../templates/template${templateId}.html`);
    const cycleId = req.query.cycle_id ? parseInt(req.query.cycle_id) : null;

    const { filename, outputPath } = await generateSinglePDF(parseInt(req.params.studentId), templatePath, cycleId);

    const student = db.prepare('SELECT name, standard_id FROM students WHERE id = ?').get(req.params.studentId);
    const standard = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(student.standard_id);
    const coaching = db.prepare('SELECT name FROM coaching_profile').get() || {};
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');
    
    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
    const stdClean = (standard?.display_name || '').replace(/[^a-zA-Z0-9]/g, '_');
    const studentClean = student.name.replace(/[^a-zA-Z0-9]/g, '_');
    const downloadFilename = `${coachingClean}_${stdClean}_${studentClean}_ResultCard_${dateStr}_${timeStr}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

    const pdfBuf = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch(e) {}

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    return res.end(pdfBuf);
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/pdf/bulk/:standardId/download
router.get('/pdf/bulk/:standardId/download', async (req, res) => {
  try {
    const settings = db.prepare('SELECT template_id FROM result_card_settings WHERE standard_id = ?').get(req.params.standardId);
    const templateId = req.query.template_id || settings?.template_id || 1;
    const batchId = req.query.batch_id || null;
    const cycleId = req.query.cycle_id ? parseInt(req.query.cycle_id) : null;

    const { filename, outputPath } = await generateBulkPDF(parseInt(req.params.standardId), parseInt(templateId), batchId, cycleId);

    const standard = db.prepare('SELECT display_name FROM standards WHERE id = ?').get(req.params.standardId);
    const coaching = db.prepare('SELECT name FROM coaching_profile').get() || {};
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');
    
    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
    const stdClean = (standard?.display_name || '').replace(/[^a-zA-Z0-9]/g, '_');
    const downloadFilename = `${coachingClean}_${stdClean}_Bulk_ResultCards_${dateStr}_${timeStr}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

    const pdfBuf = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch(e) {}

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    return res.end(pdfBuf);
  } catch (err) {
    console.error('Bulk PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/excel/:standardId/download
router.get('/excel/:standardId/download', (req, res) => {
  try {
    const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(req.params.standardId);
    if (!standard) return res.status(404).json({ error: 'Standard not found' });

    const coaching = db.prepare('SELECT name FROM coaching_profile').get();
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');
    
    const coachingClean = (coaching?.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
    const stdClean = standard.display_name.replace(/[^a-zA-Z0-9]/g, '_');
    const downloadFilename = `${coachingClean}_${stdClean}_ClassResults_${dateStr}_${timeStr}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const outputPath = path.join(__dirname, '../../exports', downloadFilename);

    const batchId = req.query.batch_id || null;
    exportClassToExcel(parseInt(req.params.standardId), outputPath, batchId);

    const excelBuf = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch(e) {}

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', excelBuf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    return res.end(excelBuf);
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/export/reminder-pdf — Generate a printable notice / reminder PDF
router.post('/reminder-pdf', async (req, res) => {
  try {
    const { generateReminderPDF } = require('../services/pdfService');
    const { filename, outputPath } = await generateReminderPDF(req.body);
    
    // Auto-update notice generated status for test tracking
    if (req.body.test_id) {
      db.prepare('UPDATE tests SET notice_generated = 1 WHERE id = ?').run(req.body.test_id);
    }

    const coaching = db.prepare('SELECT name FROM coaching_profile').get() || {};
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');
    
    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
    const typeClean = (req.body.type || 'Notice').replace(/[^a-zA-Z0-9]/g, '_');
    const downloadFilename = `${coachingClean}_Notice_${typeClean}_${dateStr}_${timeStr}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    const pdfBuf = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch(e) {}

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    return res.end(pdfBuf);
  } catch (err) {
    console.error('Reminder PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/export/noticeboard-pdf — Generate a noticeboard bulletin result sheet
router.post('/noticeboard-pdf', async (req, res) => {
  try {
    const { generateNoticeboardPDF } = require('../services/pdfService');
    const { filename, outputPath } = await generateNoticeboardPDF(req.body);

    const coaching = db.prepare('SELECT name FROM coaching_profile').get() || {};
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');

    const coachingClean = (coaching.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
    const downloadFilename = `${coachingClean}_Noticeboard_${dateStr}_${timeStr}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

    const pdfBuf = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch(e) {}

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    return res.end(pdfBuf);
  } catch (err) {
    console.error('Noticeboard PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/credential-slip/:studentId — Generate and download single student credential slip PDF
router.get('/credential-slip/:studentId', async (req, res) => {
  try {
    const { generateCredentialSlipPDF } = require('../services/pdfService');
    const { filename, outputPath } = await generateCredentialSlipPDF(parseInt(req.params.studentId));

    const pdfBuf = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch(e) {}

    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    return res.end(pdfBuf);
  } catch (err) {
    console.error('Credential slip PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/credential-slip-bulk — Generate and download bulk credential slips PDF
router.get('/credential-slip-bulk', async (req, res) => {
  try {
    const { standard_id } = req.query;
    const { generateBulkCredentialSlipsPDF } = require('../services/pdfService');
    const { filename, outputPath } = await generateBulkCredentialSlipsPDF(standard_id || null);

    const pdfBuf = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch(e) {}

    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    return res.end(pdfBuf);
  } catch (err) {
    console.error('Bulk credential slip PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

