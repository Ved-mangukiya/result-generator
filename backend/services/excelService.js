const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { calculateStudentResult, calculateRanks } = require('./gradeService');

function parseDateToISO(val) {
  if (!val) return '';
  val = String(val).trim();
  if (!val) return '';
  
  // Check if it's a numeric Excel serial date
  if (/^\d{5}(\.\d+)?$/.test(val)) {
    const serial = parseFloat(val);
    const d = new Date((serial - 25569) * 86400000);
    if (!isNaN(d)) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Check if it's YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // Check if it's DD/MM/YYYY or DD-MM-YYYY
  const dm = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dm) {
    const d = dm[1].padStart(2, '0');
    const m = dm[2].padStart(2, '0');
    const y = dm[3];
    return `${y}-${m}-${d}`;
  }
  // Try JS parsing
  const d = new Date(val);
  if (!isNaN(d)) {
    return d.toISOString().split('T')[0];
  }
  return val;
}

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

  const allRows = rows.slice(1).map(row =>
    headers.reduce((obj, h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; return obj; }, {})
  );

  return { headers, preview, allRows, totalRows: rows.length - 1 };
}

/**
 * Import students from Excel using column mapping
 * mapping: { name: colName, father_name: colName, ... }
 */
function importStudentsFromExcel(filePath, standardId, mapping, sortBy = 'first_name') {
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
    INSERT OR IGNORE INTO students (standard_id, name, roll_number, father_name, mother_name, dob, remarks, attendance_pct, admission_date, status, total_fees)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

      let name = mapping.name ? (rowObj[mapping.name] || '') : '';
      let father_name = mapping.father_name ? (rowObj[mapping.father_name] || '') : '';

      if (!name) {
        skipped++;
        continue;
      }

      // Format student name to FirstName.FatherName.Surname
      let firstName = '';
      let fName = father_name ? father_name.trim() : '';
      let lName = '';

      if (name.includes('.')) {
        const parts = name.split('.');
        firstName = parts[0] || '';
        if (parts[1]) fName = parts[1];
        if (parts[2]) lName = parts[2];
      } else {
        const parts = name.trim().split(/\s+/);
        firstName = parts[0] || '';
        if (parts.length > 2) {
          if (!fName) {
            fName = parts.slice(1, parts.length - 1).join(' ');
          }
          lName = parts[parts.length - 1] || '';
        } else if (parts.length === 2) {
          lName = parts[1] || '';
        }
      }
      name = `${firstName.trim()}.${fName.trim()}.${lName.trim()}`;
      father_name = fName.trim();

      // Assign a temporary unique roll number for insertion
      const tempRoll = `TEMP_IMP_${Date.now()}_${i}`;

      const result = insertStudent.run(
        standardId,
        name,
        tempRoll,
        father_name,
        mapping.mother_name ? (rowObj[mapping.mother_name] || '') : '',
        mapping.dob ? parseDateToISO(rowObj[mapping.dob]) : '',
        mapping.remarks ? (rowObj[mapping.remarks] || '') : '',
        null, // attendance is null
        mapping.admission_date ? parseDateToISO(rowObj[mapping.admission_date]) : '',
        mapping.status ? (rowObj[mapping.status] || 'Active') : 'Active',
        mapping.total_fees ? (parseFloat(rowObj[mapping.total_fees]) || 0) : 0
      );

      const studentId = result.lastInsertRowid;

      // Insert marks (if mapping.marks exists)
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

    // RESEQUENCE ALL STUDENTS IN THIS CLASS ACCORDING TO USER'S OPTION
    const allStudents = db.prepare('SELECT id, name, father_name FROM students WHERE standard_id = ?').all(standardId);
    
    allStudents.sort((a, b) => {
      let valA = '';
      let valB = '';
      
      const getParts = (nameStr) => {
        if (nameStr.includes('.')) return nameStr.split('.');
        return nameStr.trim().split(/\s+/);
      };

      if (sortBy === 'surname') {
        const partsA = getParts(a.name);
        const partsB = getParts(b.name);
        valA = partsA.length > 1 ? partsA[partsA.length - 1] : a.name;
        valB = partsB.length > 1 ? partsB[partsB.length - 1] : b.name;
      } else if (sortBy === 'father_name') {
        valA = a.father_name || getParts(a.name)[1] || '';
        valB = b.father_name || getParts(b.name)[1] || '';
      } else { // first_name / default
        valA = getParts(a.name)[0] || a.name;
        valB = getParts(b.name)[0] || b.name;
      }
      return valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true });
    });

    const updateRoll = db.prepare('UPDATE students SET roll_number = ? WHERE id = ?');
    allStudents.forEach((s, idx) => {
      updateRoll.run(String(idx + 1), s.id);
    });
  });

  importAll();
  return { imported, skipped, errors };
}

/**
 * Export class results to Excel
 */
function exportClassToExcel(standardId, outputPath, batchId = null) {
  const standard = db.prepare(`
    SELECT s.*, b.name as board_name, b.id as board_id_val, b.short_name as board_short
    FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?
  `).get(standardId);

  const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(standardId);
  
  let studentsQuery = 'SELECT * FROM students WHERE standard_id = ?';
  const studentsParams = [standardId];
  if (batchId) {
    studentsQuery += ' AND batch_id = ?';
    studentsParams.push(batchId);
  }
  studentsQuery += ' ORDER BY roll_number';
  const students = db.prepare(studentsQuery).all(...studentsParams);

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
