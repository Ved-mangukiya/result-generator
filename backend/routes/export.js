const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { generateSinglePDF, generateBulkPDF, buildResultCardHTML } = require('../services/pdfService');
const { exportClassToExcel } = require('../services/excelService');
const { calculateStudentResult, calculateRanks } = require('../services/gradeService');

// GET /api/export/results/:standardId — get computed results for entire class
router.get('/results/:standardId', (req, res) => {
  const standard = db.prepare(`SELECT s.*, b.name as board_name, b.id as board_id_val, b.short_name as board_short
    FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?`).get(req.params.standardId);
  if (!standard) return res.status(404).json({ error: 'Standard not found' });

  const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(req.params.standardId);
  const students = db.prepare('SELECT * FROM students WHERE standard_id = ? ORDER BY CAST(roll_number AS INTEGER) ASC, roll_number ASC').all(req.params.standardId);

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
    const html = await buildResultCardHTML(req.params.studentId, templatePath);
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
    const html = await buildResultCardHTML(req.params.studentId, templatePath);
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

    const { filename, outputPath } = await generateSinglePDF(parseInt(req.params.studentId), templatePath);
    res.download(outputPath, filename, (err) => {
      if (err) console.error('Download error:', err);
      // Clean up after download
      try { fs.unlinkSync(outputPath); } catch(e) {}
    });
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

    const { filename, outputPath } = await generateBulkPDF(parseInt(req.params.standardId), parseInt(templateId));
    res.download(outputPath, filename, (err) => {
      if (err) console.error('Download error:', err);
      try { fs.unlinkSync(outputPath); } catch(e) {}
    });
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
    const coachingName = (coaching?.name || 'Result').replace(/[^a-zA-Z0-9]/g, '_');
    const stdName = standard.display_name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${coachingName}_${stdName}_Results.xlsx`;
    const outputPath = path.join(__dirname, '../../exports', filename);

    exportClassToExcel(parseInt(req.params.standardId), outputPath);
    res.download(outputPath, filename, (err) => {
      if (err) console.error('Download error:', err);
      try { fs.unlinkSync(outputPath); } catch(e) {}
    });
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
    
    res.download(outputPath, filename, (err) => {
      if (err) console.error('Download error:', err);
      // Clean up after download
      try { fs.unlinkSync(outputPath); } catch(e) {}
    });
  } catch (err) {
    console.error('Reminder PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
