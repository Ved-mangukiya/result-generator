const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { calculateStudentResult, calculateRanks } = require('./gradeService');

const EXPORTS_DIR = path.join(__dirname, '../../exports');
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

async function getBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
}

/**
 * Render a result card template to HTML string with all student data injected
 */
async function buildResultCardHTML(studentId, templatePath) {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
  if (!student) throw new Error('Student not found');

  const standard = db.prepare(`
    SELECT s.*, b.name as board_name, b.id as board_id_val, b.short_name as board_short
    FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?
  `).get(student.standard_id);

  const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(student.standard_id);
  const marksRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(studentId);
  const marksMap = {};
  marksRows.forEach(m => { marksMap[m.subject_id] = m; });

  const result = calculateStudentResult(student, subjects, marksMap, standard.board_id_val);

  // Get rank
  const allStudents = db.prepare('SELECT * FROM students WHERE standard_id = ?').all(student.standard_id);
  const allResults = allStudents.map(s => {
    const mRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(s.id);
    const mMap = {};
    mRows.forEach(m => { mMap[m.subject_id] = m; });
    return { student_id: s.id, ...calculateStudentResult(s, subjects, mMap, standard.board_id_val) };
  });
  const rankMap = calculateRanks(allResults);
  const rank = rankMap[studentId] || '-';

  const coaching = db.prepare('SELECT * FROM coaching_profile').get() || {};
  const settings = db.prepare('SELECT * FROM result_card_settings WHERE standard_id = ?').get(student.standard_id) || {};

  let templateHTML = fs.readFileSync(templatePath, 'utf8');
  const hasPctCol = templateHTML.includes('<th>%</th>');

  // Build photo src
  let photoSrc = '';
  if (student.photo_path && fs.existsSync(path.join(__dirname, '../../', student.photo_path))) {
    const photoData = fs.readFileSync(path.join(__dirname, '../../', student.photo_path));
    const ext = path.extname(student.photo_path).slice(1).toLowerCase();
    photoSrc = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${photoData.toString('base64')}`;
  }

  let logoSrc = '';
  if (coaching.logo_path && fs.existsSync(path.join(__dirname, '../../', coaching.logo_path))) {
    const logoData = fs.readFileSync(path.join(__dirname, '../../', coaching.logo_path));
    const ext = path.extname(coaching.logo_path).slice(1).toLowerCase();
    logoSrc = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${logoData.toString('base64')}`;
  }

  // Build marks table rows
  let marksRows2 = '';
  for (const sr of result.subjectResults) {
    // Skip optional subjects with no marks recorded (e.g. GSEB SPCC/Computer electives)
    if (!sr.is_compulsory && sr.obtained === null && !sr.is_absent) {
      continue;
    }
    marksRows2 += `<tr>
      <td>${sr.subject_name}${sr.is_compulsory ? '' : ' <span class="optional-tag">Opt</span>'}</td>
      <td>${sr.max_marks}</td>
      ${(settings.show_split_marks !== 0)
        ? (sr.marks_type === 'split'
          ? `<td>${sr.internal_marks ?? '-'}</td><td>${sr.external_marks ?? '-'}</td>`
          : `<td>—</td><td>—</td>`)
        : ''}
      <td>${sr.is_absent ? 'ABSENT' : (sr.obtained ?? '-')}</td>
      ${hasPctCol ? `<td>${sr.is_absent ? '—' : (sr.percentage !== null ? Math.round(sr.percentage) + '%' : '—')}</td>` : ''}
      ${settings.show_grade !== 0 ? `<td style="color:${sr.grade_color}">${sr.grade}</td>` : ''}
      ${settings.show_pass_fail !== 0 ? `<td class="pf-cell ${sr.pass_fail?.toLowerCase()}">${sr.pass_fail ?? '-'}</td>` : ''}
    </tr>`;
  }

  const data = {
    COACHING_NAME: coaching.name || 'Coaching Institute',
    COACHING_TAGLINE: coaching.tagline || '',
    COACHING_ADDRESS: coaching.address || '',
    COACHING_PHONE: coaching.phone || '',
    COACHING_WEBSITE: coaching.website || '',
    COACHING_LOGO: logoSrc ? `<img src="${logoSrc}" alt="Logo" class="coaching-logo" />` : '<div class="logo-placeholder"></div>',
    STUDENT_NAME: student.name || '',
    STUDENT_ROLL: student.roll_number || '',
    STUDENT_DOB: settings.show_dob !== 0 ? (student.dob || '—') : '',
    FATHER_NAME: settings.show_parent_names !== 0 ? (student.father_name || '—') : '',
    MOTHER_NAME: settings.show_parent_names !== 0 ? (student.mother_name || '—') : '',
    BOARD_NAME: standard?.board_name || '',
    BOARD_SHORT: standard?.board_short || '',
    STANDARD_DISPLAY: standard?.display_name || '',
    STUDENT_PHOTO: photoSrc
      ? `<img src="${photoSrc}" alt="Photo" class="student-photo" />`
      : '<div class="photo-placeholder"><span>Photo</span></div>',
    MARKS_TABLE_ROWS: marksRows2,
    SHOW_SPLIT_HEADER: (settings.show_split_marks !== 0) ? 'table-cell' : 'none',
    SHOW_GRADE_COL: (settings.show_grade !== 0) ? 'table-cell' : 'none',
    SHOW_PF_COL: (settings.show_pass_fail !== 0) ? 'table-cell' : 'none',
    TOTAL_OBTAINED: result.totalObtained ?? '—',
    TOTAL_MAX: result.totalMaxMarks ?? '—',
    OVERALL_PCT: (result.overallPct !== null && result.overallPct !== undefined) ? result.overallPct.toFixed(2) + '%' : '—',
    OVERALL_GRADE: result.overallGrade || '—',
    OVERALL_GRADE_COLOR: result.overallGradeColor || '#1a1a1a',
    FINAL_STATUS: result.finalStatus || '—',
    RANK: settings.show_rank !== 0 ? rank : '',
    TOTAL_STUDENTS: allStudents.length,
    REMARKS: settings.show_remarks !== 0 ? (student.remarks || '') : '',
    ATTENDANCE: settings.show_attendance !== 0 ? (student.attendance_pct !== null && student.attendance_pct !== undefined ? student.attendance_pct + '%' : '—') : '',
    PRIMARY_COLOR: settings.primary_color || coaching.primary_color || '#7a6130',
    ACCENT_COLOR: settings.accent_color || '#d4af37',
    ACADEMIC_YEAR: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
  };

  // Replace all placeholders with strict guards against undefined/null values/strings
  for (const [key, value] of Object.entries(data)) {
    let cleanVal = value;
    if (cleanVal === null || cleanVal === undefined || cleanVal === 'undefined' || cleanVal === 'null') {
      cleanVal = '';
    }
    templateHTML = templateHTML.split(`{{${key}}}`).join(cleanVal);
  }

  // Inject dynamic CSS variables and display classes for valid HTML
  const dynamicStyles = `
  <style>
    :root {
      --primary-color: ${data.PRIMARY_COLOR || '#1a365d'};
      --overall-grade-color: ${data.OVERALL_GRADE_COLOR || '#1a1a1a'};
    }
    .split-col { display: ${data.SHOW_SPLIT_HEADER} !important; }
    .grade-col { display: ${data.SHOW_GRADE_COL} !important; }
    .pf-col { display: ${data.SHOW_PF_COL} !important; }
  </style>
  </head>`;
  
  templateHTML = templateHTML.replace('</head>', dynamicStyles);
  const paperSizeClass = settings.paper_size === 'A5 Portrait' ? 'size-a5' : 'size-a4';
  templateHTML = templateHTML.replace('class="page"', `class="page ${paperSizeClass}"`);

  return templateHTML;
}

/**
 * Generate PDF for a single student
 */
async function generateSinglePDF(studentId, templatePath) {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
  if (!student) throw new Error('Student not found');
  const settings = db.prepare('SELECT * FROM result_card_settings WHERE standard_id = ?').get(student.standard_id) || {};
  const paperFormat = settings.paper_size === 'A5 Portrait' ? 'A5' : 'A4';

  const html = await buildResultCardHTML(studentId, templatePath);

  const standard = db.prepare(`SELECT s.display_name, b.short_name FROM standards s JOIN boards b ON s.board_id = b.id 
    JOIN students st ON st.standard_id = s.id WHERE st.id = ?`).get(studentId);
  const coaching = db.prepare('SELECT name FROM coaching_profile').get();

  const coachingName = (coaching?.name || 'Result').replace(/[^a-zA-Z0-9]/g, '_');
  const studentName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
  const stdName = (standard?.display_name || '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${coachingName}_${stdName}_${studentName}_Result.pdf`;
  const outputPath = path.join(EXPORTS_DIR, filename);

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: paperFormat,
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });
  } finally {
    await browser.close();
  }

  return { filename, outputPath };
}

/**
 * Generate bulk PDF for all students in a standard (one page per student + cover page)
 */
async function generateBulkPDF(standardId, templateId = 1) {
  const settings = db.prepare('SELECT * FROM result_card_settings WHERE standard_id = ?').get(standardId) || {};
  const paperFormat = settings.paper_size === 'A5 Portrait' ? 'A5' : 'A4';

  const standard = db.prepare(`
    SELECT s.*, b.name as board_name, b.short_name as board_short
    FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?
  `).get(standardId);
  const students = db.prepare('SELECT id FROM students WHERE standard_id = ? ORDER BY CAST(roll_number AS INTEGER) ASC, roll_number ASC').all(standardId);
  const coaching = db.prepare('SELECT * FROM coaching_profile').get() || {};
  const templatePath = path.join(__dirname, `../../templates/template${templateId}.html`);

  const coachingName = (coaching.name || 'Result').replace(/[^a-zA-Z0-9]/g, '_');
  const stdName = (standard?.display_name || '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${coachingName}_${stdName}_BulkResults.pdf`;
  const outputPath = path.join(EXPORTS_DIR, filename);

  // Build cover page HTML
  const coverHTML = `
    <html><head><style>
      body { font-family: 'Georgia', serif; background: #1a3a6b; color: white; display: flex; 
             align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
      h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
      h2 { font-size: 1.5rem; font-weight: normal; opacity: 0.8; }
      .meta { margin-top: 2rem; font-size: 1rem; opacity: 0.7; }
    </style></head><body>
      <div>
        <h1>${coaching.name || 'Result Generator'}</h1>
        <h2>${standard.display_name} — Result Sheet</h2>
        <div class="meta">
          Total Students: ${students.length}<br>
          Board: ${standard.board_name}<br>
          Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}
        </div>
      </div>
    </body></html>`;

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();

    // We'll collect all pages and merge
    const allPages = [];

    // Cover page
    await page.setContent(coverHTML, { waitUntil: 'networkidle0' });
    const coverBuffer = await page.pdf({ format: paperFormat, printBackground: true });
    allPages.push(coverBuffer);

    // Each student
    for (const { id: studentId } of students) {
      const html = await buildResultCardHTML(studentId, templatePath);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
      });
      allPages.push(buffer);
    }

    // For simplicity write last page (ideally we'd merge PDFs; use pdf-lib for full merge)
    // For now, generate a single combined HTML and print
    let combinedHTML = `<html><head><style>
      @page { margin: 10mm; }
      .page-break { page-break-after: always; }
    </style></head><body>`;

    // Cover section
    combinedHTML += `<div class="page-break" style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a3a6b;color:white;text-align:center;font-family:Georgia,serif;">
      <div>
        <h1 style="font-size:2.5rem">${coaching.name || 'Result Generator'}</h1>
        <h2 style="font-weight:normal;opacity:0.8">${standard.display_name} — Result Sheet</h2>
        <p style="opacity:0.7">Total Students: ${students.length} | Board: ${standard.board_name}</p>
      </div>
    </div>`;

    for (let i = 0; i < students.length; i++) {
      const cardHTML = await buildResultCardHTML(students[i].id, templatePath);
      // Extract just the body content from card HTML
      const bodyMatch = cardHTML.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : cardHTML;
      const styleMatch = cardHTML.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      const styles = styleMatch ? styleMatch.join('') : '';
      combinedHTML += `${styles}<div class="${i < students.length - 1 ? 'page-break' : ''}">${bodyContent}</div>`;
    }

    combinedHTML += '</body></html>';

    await page.setContent(combinedHTML, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: paperFormat,
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });
  } finally {
    await browser.close();
  }

  return { filename, outputPath };
}

/**
 * Generate PDF for a notice/reminder
 */
async function generateReminderPDF(payload) {
  const { type, title, message, columns, rows } = payload;
  const coaching = db.prepare('SELECT * FROM coaching_profile').get() || {};

  // Choose template based on notice type
  const templateMap = {
    vacation:       'reminder_vacation.html',
    exam_schedule:  'reminder_exam.html',
    starting_date:  'reminder_batch.html',
    general:        'reminder_general.html',
  };
  const templateFile = templateMap[type] || 'reminder_template.html';
  const templatePath = path.join(__dirname, '../../templates/', templateFile);
  let templateHTML = fs.readFileSync(templatePath, 'utf8');

  // Build logo src
  let logoSrc = '';
  if (coaching.logo_path && fs.existsSync(path.join(__dirname, '../../', coaching.logo_path))) {
    const logoData = fs.readFileSync(path.join(__dirname, '../../', coaching.logo_path));
    const ext = path.extname(coaching.logo_path).slice(1).toLowerCase();
    logoSrc = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${logoData.toString('base64')}`;
  }

  // Build signature src
  let signatureSrc = '';
  if (coaching.signature_path && fs.existsSync(path.join(__dirname, '../../', coaching.signature_path))) {
    const sigData = fs.readFileSync(path.join(__dirname, '../../', coaching.signature_path));
    const ext = path.extname(coaching.signature_path).slice(1).toLowerCase();
    signatureSrc = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${sigData.toString('base64')}`;
  }

  // Determine Type Emoji
  let emoji = '📢';
  if (type === 'vacation') emoji = '🌴';
  else if (type === 'exam_schedule') emoji = '📅';
  else if (type === 'starting_date') emoji = '🚀';

  // Build Details Table HTML
  let detailsTableHTML = '';
  if (columns && Array.isArray(columns) && columns.length > 0 && rows && Array.isArray(rows) && rows.length > 0) {
    detailsTableHTML = `<table class="details-table"><thead><tr>`;
    columns.forEach(col => {
      detailsTableHTML += `<th>${col}</th>`;
    });
    detailsTableHTML += `</tr></thead><tbody>`;
    rows.forEach(row => {
      detailsTableHTML += `<tr>`;
      row.forEach(val => {
        detailsTableHTML += `<td>${val}</td>`;
      });
      detailsTableHTML += `</tr>`;
    });
    detailsTableHTML += `</tbody></table>`;
  }

  const data = {
    COACHING_NAME: coaching.name || 'Coaching Institute',
    COACHING_TAGLINE: coaching.tagline || '',
    COACHING_ADDRESS: coaching.address || '',
    COACHING_PHONE: coaching.phone || '',
    COACHING_WEBSITE: coaching.website || '',
    COACHING_LOGO: logoSrc ? `<img src="${logoSrc}" alt="Logo" class="coaching-logo" />` : '<div class="logo-placeholder"></div>',
    TITLE: title || 'Notice',
    TYPE_EMOJI: emoji,
    MESSAGE: message || '',
    DETAILS_TABLE: detailsTableHTML,
    SIGNATURE_IMG: signatureSrc
      ? `<img src="${signatureSrc}" alt="Signature" class="signature-img" />`
      : '<div class="sig-line-blank"></div>',
    SIGNATORY_NAME: coaching.signatory_name || coaching.name || 'Authorized Signatory',
    PRIMARY_COLOR: coaching.primary_color || '#7a6130',
    ACADEMIC_YEAR: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
  };

  // Replace placeholders
  for (const [key, value] of Object.entries(data)) {
    templateHTML = templateHTML.split(`{{${key}}}`).join(value ?? '');
  }

  const filename = `Notice_${Date.now()}.pdf`;
  const outputPath = path.join(EXPORTS_DIR, filename);

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(templateHTML, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });
  } finally {
    await browser.close();
  }

  return { filename, outputPath };
}

module.exports = { generateSinglePDF, generateBulkPDF, buildResultCardHTML, generateReminderPDF };
