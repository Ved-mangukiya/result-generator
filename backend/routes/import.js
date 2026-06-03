const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { parseFilePreview, importStudentsFromExcel } = require('../services/excelService');

// POST /api/import/parse — upload file and get column preview
router.post('/parse', (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = parseFilePreview(req.file.path);
    res.json({ ...result, file_path: req.file.path });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

// POST /api/import/execute — execute import with column mapping
router.post('/execute', (req, res) => {
  const { file_path, standard_id, mapping, sort_by } = req.body;
  if (!file_path || !standard_id || !mapping) {
    return res.status(400).json({ error: 'file_path, standard_id, and mapping required' });
  }

  try {
    const result = importStudentsFromExcel(file_path, parseInt(standard_id), mapping, sort_by);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// GET /api/import/template — Download Excel template for student info import
router.get('/template', (req, res) => {
  try {
    const XLSX = require('xlsx');
    const headers = [
      'Student Name', 
      "Father's Name", 
      "Mother's Name", 
      'Date of Birth (YYYY-MM-DD)', 
      'Admission Date (YYYY-MM-DD)', 
      'Enrollment Status (Active/Completed/Terminated)', 
      'Total Course Fees (INR)', 
      'Remarks'
    ];
    const sampleData = [
      headers,
      ['Ananya Sharma', 'Rajesh Sharma', 'Sunita Sharma', '2008-05-15', '2026-06-01', 'Active', '15000', 'Regular batch'],
      ['Aditya Patel', 'Vikram Patel', 'Meena Patel', '2008-09-20', '2026-06-01', 'Active', '18000', 'Scholarship batch']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    
    worksheet['!cols'] = [
      { wch: 25 }, // Student Name
      { wch: 25 }, // Father's Name
      { wch: 25 }, // Mother's Name
      { wch: 25 }, // Date of Birth
      { wch: 25 }, // Admission Date
      { wch: 45 }, // Enrollment Status
      { wch: 25 }, // Total Course Fees
      { wch: 30 }  // Remarks
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Template');

    const filename = 'Student_Import_Template.xlsx';
    const outputPath = path.join(__dirname, '../../exports', filename);

    const exportsDir = path.dirname(outputPath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    XLSX.writeFile(workbook, outputPath);
    res.download(outputPath, filename, (err) => {
      if (err) console.error('Template download error:', err);
      try { fs.unlinkSync(outputPath); } catch(e) {}
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate template: ' + err.message });
  }
});

// GET /api/import/dashboard-stats
router.get('/dashboard-stats', (req, res) => {
  const totalBoards = db.prepare('SELECT COUNT(*) as count FROM boards').get().count;
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  const totalStandards = db.prepare('SELECT COUNT(*) as count FROM standards').get().count;

  const standards = db.prepare(`SELECT s.id, s.display_name, b.id as board_id FROM standards s JOIN boards b ON s.board_id = b.id`).all();
  const classStats = standards.map(std => {
    const students = db.prepare('SELECT * FROM students WHERE standard_id = ?').all(std.id);
    const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(std.id);
    const { calculateStudentResult } = require('../services/gradeService');

    let passCount = 0, failCount = 0, distCount = 0;
    for (const student of students) {
      const marksRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(student.id);
      const marksMap = {};
      marksRows.forEach(m => { marksMap[m.subject_id] = m; });
      const result = calculateStudentResult(student, subjects, marksMap, std.board_id);
      if (result.finalStatus === 'Fail') failCount++;
      else if (result.finalStatus === 'Distinction' || result.finalStatus === 'A1' || result.finalStatus === 'A2') { distCount++; passCount++; }
      else passCount++;
    }

    return { standard_id: std.id, standard_name: std.display_name, total: students.length, pass: passCount, fail: failCount, distinction: distCount };
  });

  const recentActivity = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10').all();

  res.json({ totalBoards, totalStudents, totalStandards, classStats, recentActivity });
});

module.exports = router;
