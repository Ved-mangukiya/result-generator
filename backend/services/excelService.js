const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { calculateStudentResult, calculateRanks } = require('./gradeService');

/**
 * Parse uploaded Excel/CSV file and return headers + first few rows for column mapping
 */
function parseFilePreview(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length === 0) return { headers: [], preview: [] };

  const headers = rows[0].map(h => String(h).trim());
  const preview = rows.slice(1, 6).map(row =>
    headers.reduce((obj, h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; return obj; }, {})
  );

  return { headers, preview, totalRows: rows.length - 1 };
}

/**
 * Import students from Excel using column mapping
 * mapping: { name: colName, roll_number: colName, father_name: colName, ... marks: { subjectId: colName } }
 */
function importStudentsFromExcel(filePath, standardId, mapping) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) return { imported: 0, skipped: 0, errors: [] };

  const headers = rows[0].map(h => String(h).trim());
  const dataRows = rows.slice(1).filter(row => row.some(cell => cell !== ''));

  const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(standardId);

  let imported = 0;
  let skipped = 0;
  const errors = [];

  const insertStudent = db.prepare(`
    INSERT OR IGNORE INTO students (standard_id, name, roll_number, father_name, mother_name, dob, remarks, attendance_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const upsertMark = db.prepare(`
    INSERT INTO marks (student_id, subject_id, total_marks, internal_marks, external_marks)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(student_id, subject_id) DO UPDATE SET
      total_marks = excluded.total_marks,
      internal_marks = excluded.internal_marks,
      external_marks = excluded.external_marks
  `);

  const importAll = db.transaction(() => {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowObj = headers.reduce((obj, h, idx) => { obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : ''; return obj; }, {});

      const name = mapping.name ? (rowObj[mapping.name] || '') : '';
      const roll = mapping.roll_number ? (rowObj[mapping.roll_number] || '') : '';

      if (!name || !roll) {
        skipped++;
        continue;
      }

      // Check for duplicate roll
      const existing = db.prepare('SELECT id FROM students WHERE standard_id = ? AND roll_number = ?').get(standardId, roll);
      if (existing) {
        errors.push({ row: i + 2, message: `Roll number ${roll} already exists — skipped` });
        skipped++;
        continue;
      }

      const result = insertStudent.run(
        standardId,
        name,
        roll,
        mapping.father_name ? (rowObj[mapping.father_name] || '') : '',
        mapping.mother_name ? (rowObj[mapping.mother_name] || '') : '',
        mapping.dob ? (rowObj[mapping.dob] || '') : '',
        mapping.remarks ? (rowObj[mapping.remarks] || '') : '',
        mapping.attendance ? (parseFloat(rowObj[mapping.attendance]) || null) : null
      );

      const studentId = result.lastInsertRowid;

      // Insert marks
      if (mapping.marks && studentId) {
        for (const subject of subjects) {
          const col = mapping.marks[subject.id];
          if (!col) continue;

          const subject_obj = subjects.find(s => s.id === subject.id);
          if (!subject_obj) continue;

          if (subject_obj.marks_type === 'split') {
            const intCol = mapping.internal_marks?.[subject.id];
            const extCol = mapping.external_marks?.[subject.id];
            const intVal = intCol ? (parseFloat(rowObj[intCol]) || null) : null;
            const extVal = extCol ? (parseFloat(rowObj[extCol]) || null) : null;
            const total = (intVal !== null && extVal !== null) ? intVal + extVal : (parseFloat(rowObj[col]) || null);
            upsertMark.run(studentId, subject.id, total, intVal, extVal);
          } else {
            const val = parseFloat(rowObj[col]) || null;
            upsertMark.run(studentId, subject.id, val, null, null);
          }
        }
      }
      imported++;
    }
  });

  importAll();
  return { imported, skipped, errors };
}

/**
 * Export class results to Excel
 */
function exportClassToExcel(standardId, outputPath) {
  const standard = db.prepare(`
    SELECT s.*, b.name as board_name, b.id as board_id_val, b.short_name as board_short
    FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?
  `).get(standardId);

  const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(standardId);
  const students = db.prepare('SELECT * FROM students WHERE standard_id = ? ORDER BY roll_number').all(standardId);

  const { calculateStudentResult, calculateRanks } = require('./gradeService');

  // Build mark maps
  const studentResults = students.map(student => {
    const marksRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(student.id);
    const marksMap = {};
    marksRows.forEach(m => { marksMap[m.subject_id] = m; });
    const result = calculateStudentResult(student, subjects, marksMap, standard.board_id_val);
    return { student, ...result };
  });

  const rankMap = calculateRanks(studentResults);

  // Headers
  const headers = ['Rank', 'Roll No.', 'Student Name', 'Father Name'];
  for (const sub of subjects) {
    if (sub.marks_type === 'split') {
      headers.push(`${sub.name} (Int)`, `${sub.name} (Ext)`, `${sub.name} (Total)`);
    } else {
      headers.push(sub.name);
    }
  }
  headers.push('Total Marks', 'Max Marks', 'Percentage (%)', 'Grade', 'Result');

  const rows = [headers];

  for (const sr of studentResults) {
    const { student, subjectResults, totalObtained, totalMaxMarks, overallPct, overallGrade, finalStatus } = sr;
    const rank = rankMap[student.id] || '-';
    const row = [rank, student.roll_number, student.name, student.father_name];

    for (const sub of subjects) {
      const sr2 = subjectResults.find(s => s.subject_id === sub.id);
      if (sr2) {
        if (sub.marks_type === 'split') {
          row.push(sr2.internal_marks ?? '', sr2.external_marks ?? '', sr2.obtained ?? '');
        } else {
          row.push(sr2.obtained ?? '');
        }
      } else {
        if (sub.marks_type === 'split') row.push('', '', '');
        else row.push('');
      }
    }
    row.push(totalObtained, totalMaxMarks, overallPct !== null ? overallPct.toFixed(2) : '', overallGrade, finalStatus);
    rows.push(row);
  }

  // Summary row
  const summaryRow = ['', '', 'CLASS SUMMARY', ''];
  for (const sub of subjects) {
    if (sub.marks_type === 'split') summaryRow.push('', '', '');
    else summaryRow.push('');
  }
  const passCount = studentResults.filter(r => r.finalStatus !== 'Fail' && r.finalStatus !== 'Pending').length;
  const failCount = studentResults.filter(r => r.finalStatus === 'Fail').length;
  const distCount = studentResults.filter(r => r.finalStatus === 'Distinction' || r.finalStatus === 'A1' || r.finalStatus === 'A2').length;
  const avgPct = studentResults.length > 0
    ? (studentResults.reduce((s, r) => s + (r.overallPct || 0), 0) / studentResults.length).toFixed(2)
    : 0;

  summaryRow.push('', '', avgPct, '', `Pass: ${passCount} | Fail: ${failCount} | Dist: ${distCount}`);
  rows.push([], summaryRow);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

  XLSX.writeFile(workbook, outputPath);
  return outputPath;
}

module.exports = { parseFilePreview, importStudentsFromExcel, exportClassToExcel };
