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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions'
    ]
  });
}

/**
 * Render a result card template to HTML string with all student data injected
 */
async function buildResultCardHTML(studentId, templatePath, cycleId = null) {
  let student;
  if (studentId && studentId !== 'mock' && studentId !== 'null' && studentId !== 'undefined') {
    student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
  }

  if (!student) {
    student = {
      id: 9999,
      standard_id: 1,
      name: 'Ananya Sharma',
      roll_number: '21',
      father_name: 'Rajesh Sharma',
      mother_name: 'Sunita Sharma',
      dob: '2010-05-15',
      photo_path: 'uploads/photos/mock_student.png',
      remarks: 'Outstanding performance! Keep up the brilliant effort.',
      attendance_pct: 95.8,
      status: 'Active'
    };
  }

  let standard;
  if (student.standard_id) {
    standard = db.prepare(`
      SELECT s.*, b.name as board_name, b.id as board_id_val, b.short_name as board_short
      FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?
    `).get(student.standard_id);
  }

  if (!standard) {
    standard = db.prepare(`
      SELECT s.*, b.name as board_name, b.id as board_id_val, b.short_name as board_short
      FROM standards s JOIN boards b ON s.board_id = b.id LIMIT 1
    `).get();
  }

  if (!standard) {
    standard = {
      id: 1,
      board_id_val: 1,
      board_name: 'Central Board of Secondary Education',
      board_short: 'CBSE',
      display_name: 'Class 10 General',
      standard_number: 10,
      stream: 'General'
    };
  }

  let subjects;
  if (cycleId) {
    const cycleTests = db.prepare(`
      SELECT t.id as test_id, t.max_marks, s.id as subject_id, s.name as subject_name, s.is_compulsory, s.sort_order
      FROM tests t
      JOIN subjects s ON t.subject_id = s.id
      WHERE t.cycle_id = ?
      ORDER BY s.sort_order, s.name
    `).all(cycleId);

    subjects = cycleTests.map(t => ({
      id: t.test_id,
      name: t.subject_name,
      max_marks: t.max_marks,
      marks_type: 'total',
      is_compulsory: t.is_compulsory,
      is_language: 0
    }));
  } else {
    subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(standard.id);
    if (subjects.length === 0) {
      subjects = [
        { id: 101, name: 'English', max_marks: 100, marks_type: 'total', is_compulsory: 1 },
        { id: 102, name: 'Mathematics', max_marks: 100, marks_type: 'total', is_compulsory: 1 },
        { id: 103, name: 'Science', max_marks: 100, marks_type: 'total', is_compulsory: 1 },
        { id: 104, name: 'Social Science', max_marks: 100, marks_type: 'total', is_compulsory: 1 },
        { id: 105, name: 'Hindi', max_marks: 100, marks_type: 'total', is_compulsory: 1 }
      ];
    }
  }

  const marksMap = {};
  if (studentId !== 'mock' && student.id && student.id !== 9999) {
    if (cycleId) {
      const marksRows = db.prepare(`
        SELECT tm.test_id, tm.obtained_marks, tm.is_absent
        FROM test_marks tm
        JOIN tests t ON tm.test_id = t.id
        WHERE tm.student_id = ? AND t.cycle_id = ?
      `).all(student.id, cycleId);
      marksRows.forEach(m => {
        marksMap[m.test_id] = {
          subject_id: m.test_id,
          total_marks: m.obtained_marks,
          internal_marks: 0,
          external_marks: m.obtained_marks,
          is_absent: m.is_absent
        };
      });
    } else {
      const marksRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(student.id);
      marksRows.forEach(m => { marksMap[m.subject_id] = m; });
    }
  }

  // Seed marksMap with mockup grades if they are missing ONLY for mock student previews
  if (studentId === 'mock' || !student.id || student.id === 9999) {
    subjects.forEach(sub => {
      if (!marksMap[sub.id]) {
        const obtained = Math.round(sub.max_marks * (0.85 + Math.random() * 0.12));
        marksMap[sub.id] = {
          subject_id: sub.id,
          total_marks: obtained,
          internal_marks: sub.marks_type === 'split' ? Math.round(sub.internal_max * 0.9) : 0,
          external_marks: sub.marks_type === 'split' ? Math.round(sub.external_max * 0.9) : obtained,
          is_absent: 0
        };
      }
    });
  }

  const result = calculateStudentResult(student, subjects, marksMap, standard.board_id_val);

  // Get rank (only within student's batch if they belong to one)
  let allStudents;
  if (student.batch_id !== null && studentId !== 'mock') {
    allStudents = db.prepare('SELECT * FROM students WHERE standard_id = ? AND batch_id = ?').all(standard.id, student.batch_id);
  } else {
    allStudents = db.prepare('SELECT * FROM students WHERE standard_id = ?').all(standard.id);
  }
  let rank = '1';
  if (allStudents.length > 0 && studentId !== 'mock') {
    const allResults = allStudents.map(s => {
      const mMap = {};
      if (cycleId) {
        const marksRows = db.prepare(`
          SELECT tm.test_id, tm.obtained_marks, tm.is_absent
          FROM test_marks tm
          JOIN tests t ON tm.test_id = t.id
          WHERE tm.student_id = ? AND t.cycle_id = ?
        `).all(s.id, cycleId);
        marksRows.forEach(m => {
          mMap[m.test_id] = {
            subject_id: m.test_id,
            total_marks: m.obtained_marks,
            internal_marks: 0,
            external_marks: m.obtained_marks,
            is_absent: m.is_absent
          };
        });
      } else {
        const mRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(s.id);
        mRows.forEach(m => { mMap[m.subject_id] = m; });
      }
      return { student_id: s.id, ...calculateStudentResult(s, subjects, mMap, standard.board_id_val) };
    });
    const rankMap = calculateRanks(allResults);
    rank = rankMap[student.id] || '-';
  } else {
    allStudents = [student];
  }

  const coaching = db.prepare('SELECT * FROM coaching_profile').get() || {};
  const settings = db.prepare('SELECT * FROM result_card_settings WHERE standard_id = ?').get(standard.id) || {};

  let resolvedTemplatePath = templatePath;
  if (!resolvedTemplatePath || typeof resolvedTemplatePath === 'number' || (!String(resolvedTemplatePath).includes('/') && !String(resolvedTemplatePath).includes('\\'))) {
    const tid = resolvedTemplatePath || 1;
    resolvedTemplatePath = path.join(__dirname, `../../templates/template${tid}.html`);
  }
  if (!fs.existsSync(resolvedTemplatePath)) {
    resolvedTemplatePath = path.join(__dirname, `../../templates/template1.html`);
  }
  let templateHTML = fs.readFileSync(resolvedTemplatePath, 'utf8');
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

  let signatureSrc = '';
  if (coaching.signature_path && fs.existsSync(path.join(__dirname, '../../', coaching.signature_path))) {
    const sigData = fs.readFileSync(path.join(__dirname, '../../', coaching.signature_path));
    const ext = path.extname(coaching.signature_path).slice(1).toLowerCase();
    signatureSrc = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${sigData.toString('base64')}`;
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
    STUDENT_DOB: (() => {
      if (settings.show_dob === 0) return '';
      const dob = student.dob;
      if (!dob) return '—';
      try {
        const dobStr = String(dob).trim();
        if (/^\d{5}(\.\d+)?$/.test(dobStr)) {
          const serial = parseFloat(dobStr);
          const d = new Date((serial - 25569) * 86400000);
          if (isNaN(d)) return dob;
          const dd = String(d.getUTCDate()).padStart(2, '0');
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const yyyy = d.getUTCFullYear();
          return `${dd}/${mm}/${yyyy}`;
        }
        const d = new Date(dobStr + (dobStr.includes('T') ? '' : 'T00:00:00'));
        if (isNaN(d)) return dob;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      } catch { return dob; }
    })(),
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
    SIGNATURE_IMG: signatureSrc
      ? `<img src="${signatureSrc}" alt="Signature" class="signature-img" style="max-height: 44px; max-width: 130px; object-fit: contain;" />`
      : '<div class="sig-line-blank" style="height: 30px;"></div>',
    SIGNATORY_NAME: coaching.signatory_name || '',
    SIGNATORY_TITLE: coaching.signatory_title || 'Director',
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
    @page { size: A4 portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box !important; }
    html, body {
      width: 210mm !important;
      height: 297mm !important;
      max-width: 210mm !important;
      max-height: 297mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page {
      width: 210mm !important;
      height: 297mm !important;
      max-width: 210mm !important;
      max-height: 297mm !important;
      box-sizing: border-box !important;
      margin: 0 auto !important;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      page-break-after: always !important;
    }
    :root {
      --primary-color: ${data.PRIMARY_COLOR || '#1a365d'};
      --overall-grade-color: ${data.OVERALL_GRADE_COLOR || '#1a1a1a'};
    }
    .split-col { display: ${data.SHOW_SPLIT_HEADER} !important; }
    .grade-col { display: ${data.SHOW_GRADE_COL} !important; }
    .pf-col { display: ${data.SHOW_PF_COL} !important; }
    
    /* Strict Green/Red/Orange overrides for pass, fail, and absent */
    .pf-cell.pass, .pass, .pf-cell.pass *, .pass * { color: #2e7d32 !important; }
    .pf-cell.fail, .fail, .pf-cell.fail *, .fail * { color: #c62828 !important; }
    .pf-cell.absent, .absent, .pf-cell.absent *, .absent * { color: #ea580c !important; }
  </style>
  </head>`;

  templateHTML = templateHTML.replace('</head>', dynamicStyles);
  const paperSizeClass = settings.paper_size === 'A5 Portrait' ? 'size-a5' : 'size-a4';
  templateHTML = templateHTML.replace('class="page"', `class="page ${paperSizeClass}"`);

  const clientColoringScript = `
  <script>
  (function() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const text = node.nodeValue.trim().toUpperCase();
      if (text === 'PASS' || text === 'FAIL' || text === 'ABSENT' || text === 'PASSED' || text === 'FAILED') {
        let color = '#2e7d32'; // green for PASS
        if (text === 'FAIL' || text === 'FAILED') color = '#c62828'; // red for FAIL
        else if (text === 'ABSENT') color = '#ea580c'; // orange for ABSENT
        
        let el = node.parentElement;
        while (el && el !== document.body) {
          const style = el.getAttribute('style') || '';
          if (el.classList.contains('result-status-box') || 
              el.classList.contains('rp-value') ||
              el.classList.contains('rc-value') ||
              el.classList.contains('sr-value') ||
              el.classList.contains('sr-v') ||
              el.classList.contains('srb-v') ||
              el.classList.contains('summary-val') ||
              el.classList.contains('rs-value') ||
              el.classList.contains('sz-result') ||
              el.classList.contains('sa-result') ||
              el.classList.contains('sum-result-bubble') ||
              el.classList.contains('result-card') ||
              style.includes('var(--overall-grade-color)')) {
            
            el.style.setProperty('color', color, 'important');
            if (el.style.borderColor || style.includes('border-color')) {
              el.style.setProperty('border-color', color, 'important');
            }
            // Check if there is an outer result status box parent and color its border too
            let parentBox = el.parentElement;
            if (parentBox && (parentBox.classList.contains('result-status-box') || parentBox.getAttribute('style')?.includes('border-color'))) {
              parentBox.style.setProperty('border-color', color, 'important');
              parentBox.style.setProperty('color', color, 'important');
            }
          }
          el = el.parentElement;
        }
      }
    });
  })();
  </script>
  </body>`;

  templateHTML = templateHTML.replace('</body>', clientColoringScript);

  return templateHTML;
}

/**
 * Generate PDF for a single student
 */
async function generateSinglePDF(studentId, templatePath, cycleId = null) {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
  if (!student) throw new Error('Student not found');
  const settings = db.prepare('SELECT * FROM result_card_settings WHERE standard_id = ?').get(student.standard_id) || {};
  const paperFormat = settings.paper_size === 'A5 Portrait' ? 'A5' : 'A4';

  const html = await buildResultCardHTML(studentId, templatePath, cycleId);

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
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
  } finally {
    await browser.close();
  }

  return { filename, outputPath };
}

/**
 * Generate bulk PDF for all students in a standard (one page per student + cover page)
 */
async function generateBulkPDF(standardId, templateId = 1, batchId = null, cycleId = null) {
  const settings = db.prepare('SELECT * FROM result_card_settings WHERE standard_id = ?').get(standardId) || {};
  const paperFormat = settings.paper_size === 'A5 Portrait' ? 'A5' : 'A4';

  const standard = db.prepare(`
    SELECT s.*, b.name as board_name, b.short_name as board_short
    FROM standards s JOIN boards b ON s.board_id = b.id WHERE s.id = ?
  `).get(standardId);
  
  let studentsQuery = 'SELECT id FROM students WHERE standard_id = ?';
  const studentsParams = [standardId];
  if (batchId) {
    studentsQuery += ' AND batch_id = ?';
    studentsParams.push(batchId);
  }
  studentsQuery += ' ORDER BY CAST(roll_number AS INTEGER) ASC, roll_number ASC';
  const students = db.prepare(studentsQuery).all(...studentsParams);
  const coaching = db.prepare('SELECT * FROM coaching_profile').get() || {};
  const templatePath = path.join(__dirname, `../../templates/template${templateId}.html`);

  let cycle = null;
  if (cycleId) {
    cycle = db.prepare('SELECT * FROM test_cycles WHERE id = ?').get(cycleId);
  }
  const titleText = cycle ? `${standard.display_name} — ${cycle.title}` : `${standard.display_name} — Result Sheet`;

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
        <h2>${titleText}</h2>
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
      const html = await buildResultCardHTML(studentId, templatePath, cycleId);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
      allPages.push(buffer);
    }

    // For simplicity write last page (ideally we'd merge PDFs; use pdf-lib for full merge)
    // For now, generate a single combined HTML and print
    let combinedHTML = `<html><head><style>
      @page { margin: 0; }
      .page-break { page-break-after: always; }
    </style></head><body>`;

    // Cover section
    combinedHTML += `<div class="page-break" style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a3a6b;color:white;text-align:center;font-family:Georgia,serif;">
      <div>
        <h1 style="font-size:2.5rem">${coaching.name || 'Result Generator'}</h1>
        <h2 style="font-weight:normal;opacity:0.8">${titleText}</h2>
        <p style="opacity:0.7">Total Students: ${students.length} | Board: ${standard.board_name}</p>
      </div>
    </div>`;

    for (let i = 0; i < students.length; i++) {
      const cardHTML = await buildResultCardHTML(students[i].id, templatePath, cycleId);
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
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
  } finally {
    await browser.close();
  }

  return { filename, outputPath };
}

/**
 * Generate PDF for a notice/reminder — supports all 42 types, digital & print modes
 */
async function generateReminderPDF(payload) {
  const { type, title, message, columns, rows, print_mode, timeline } = payload;
  const coaching = db.prepare('SELECT * FROM coaching_profile').get() || {};

  // Build logo src (base64)
  let logoSrc = '';
  if (coaching.logo_path && fs.existsSync(path.join(__dirname, '../../', coaching.logo_path))) {
    const logoData = fs.readFileSync(path.join(__dirname, '../../', coaching.logo_path));
    const ext = path.extname(coaching.logo_path).slice(1).toLowerCase();
    logoSrc = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${logoData.toString('base64')}`;
  }

  // Build signature src (base64)
  let signatureSrc = '';
  if (coaching.signature_path && fs.existsSync(path.join(__dirname, '../../', coaching.signature_path))) {
    const sigData = fs.readFileSync(path.join(__dirname, '../../', coaching.signature_path));
    const ext = path.extname(coaching.signature_path).slice(1).toLowerCase();
    signatureSrc = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${sigData.toString('base64')}`;
  }

  const isPrint = print_mode === 'print';
  const primaryColor = isPrint ? '#1a1a2e' : (coaching.primary_color || '#7a6130');
  const accentColor  = isPrint ? '#333333' : '#d4af37';
  const bgGradient   = isPrint ? '#ffffff' : `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)`;
  const headerBg     = isPrint ? '#ffffff' : primaryColor;
  const headerText   = isPrint ? primaryColor : '#ffffff';
  const borderStyle  = isPrint ? `border: 2px solid ${primaryColor}` : `border: 2px solid ${accentColor}`;

  // Notice type emoji/label lookup
  const TYPE_META = {
    exam_schedule: { emoji: '📅', label: 'Examination Schedule' },
    test_reminder: { emoji: '📝', label: 'Test Reminder' },
    result_announcement: { emoji: '🎉', label: 'Result Announcement' },
    achievement: { emoji: '🏆', label: 'Achievement & Toppers' },
    syllabus_update: { emoji: '📖', label: 'Syllabus Update' },
    ptm: { emoji: '🎓', label: 'Parent-Teacher Meeting' },
    homework: { emoji: '✍️', label: 'Homework Deadline' },
    practical_lab: { emoji: '🧪', label: 'Lab & Practical' },
    extra_class: { emoji: '⚡', label: 'Extra Class' },
    book_distribution: { emoji: '🎒', label: 'Book & Material' },
    sem_exam: { emoji: '🎓', label: 'Semester Exam' },
    atkt_backlog: { emoji: '📋', label: 'ATKT / Backlog Exam' },
    campus_placement: { emoji: '💼', label: 'Campus Placement' },
    project_submission: { emoji: '🔬', label: 'Project Submission' },
    convocation: { emoji: '🎓', label: 'Convocation Ceremony' },
    dean_advisory: { emoji: '🏛️', label: 'Dean / HOD Advisory' },
    library_fine: { emoji: '📚', label: 'Library Fine Alert' },
    hostel_notice: { emoji: '🏢', label: 'Hostel Notice' },
    mid_sem: { emoji: '📝', label: 'Mid-Semester Exam' },
    youth_fest: { emoji: '🎯', label: 'Youth Fest' },
    fee_due: { emoji: '💰', label: 'Fee Due Reminder' },
    fee_overdue: { emoji: '⚠️', label: 'Fee Overdue Notice' },
    fee_receipt: { emoji: '🧾', label: 'Payment Confirmation' },
    hall_ticket: { emoji: '🎫', label: 'Hall Ticket' },
    document_submission: { emoji: '📋', label: 'Document Submission' },
    id_card: { emoji: '🆔', label: 'ID Card Notice' },
    attendance_warning: { emoji: '⚠️', label: 'Attendance Warning' },
    discipline_warning: { emoji: '🚨', label: 'Discipline Notice' },
    mobile_ban: { emoji: '📱', label: 'Mobile Phone Ban' },
    uniform_code: { emoji: '👗', label: 'Dress Code Notice' },
    vacation: { emoji: '🌴', label: 'Vacation Notice' },
    holiday: { emoji: '🛑', label: 'Holiday Notice' },
    weather_emergency: { emoji: '🌧️', label: 'Weather Emergency' },
    picnic_tour: { emoji: '🚌', label: 'Educational Tour' },
    annual_event: { emoji: '🎭', label: 'Annual Event' },
    batch_start: { emoji: '🚀', label: 'New Batch Commencement' },
    time_change: { emoji: '🕐', label: 'Timing Change' },
    faculty_absence: { emoji: '👩‍🏫', label: 'Faculty Substitution' },
    parent_complaint: { emoji: '📩', label: 'Parent Inquiry' },
    doubt_desk: { emoji: '💡', label: 'Doubt Clearing Session' },
    transport_notice: { emoji: '🚐', label: 'Transport Alert' },
    general: { emoji: '📢', label: 'Official Announcement' },
  };
  const meta = TYPE_META[type] || { emoji: '📢', label: 'Notice' };

  // Build table HTML if columns/rows provided
  let tableHTML = '';
  if (columns && Array.isArray(columns) && columns.length > 0 && rows && Array.isArray(rows) && rows.length > 0) {
    const thStyle = `padding:10px 14px;text-align:left;font-size:0.82rem;font-weight:700;border-bottom:2px solid ${isPrint ? '#333' : accentColor};color:${isPrint ? '#1a1a2e' : primaryColor};background:${isPrint ? '#f5f5f5' : accentColor + '18'};`;
    const tdStyle = `padding:9px 14px;font-size:0.82rem;border-bottom:1px solid ${isPrint ? '#e0e0e0' : primaryColor + '18'};color:#1a1a2e;`;
    tableHTML = `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid ${isPrint ? '#ddd' : primaryColor + '30'};border-radius:8px;overflow:hidden;">
        <thead><tr>${columns.map(c => `<th style="${thStyle}">${c}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map((row, ri) => `<tr style="background:${ri % 2 === 0 ? '#fff' : (isPrint ? '#fafafa' : primaryColor + '06')}">${row.map(val => `<td style="${tdStyle}">${val || '—'}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>`;
  }

  // Build timeline HTML for vacation/holiday
  let timelineHTML = '';
  if (timeline && timeline.start && timeline.end) {
    const tlBg = isPrint ? '#f5f5f5' : 'linear-gradient(135deg,#e8f5e9,#f3e5f5)';
    timelineHTML = `
      <div style="background:${tlBg};border:1.5px solid ${isPrint ? '#ccc' : '#c8e6c9'};border-radius:12px;padding:20px;margin:20px 0;">
        <div style="font-weight:700;font-size:0.9rem;color:${isPrint ? '#1a1a2e' : '#2e7d32'};margin-bottom:16px;">📅 Vacation Timeline</div>
        <div style="display:flex;align-items:center;gap:0;flex-wrap:nowrap;">
          <div style="text-align:center;min-width:100px;">
            <div style="width:42px;height:42px;border-radius:50%;background:${isPrint ? '#333' : '#4caf50'};display:flex;align-items:center;justify-content:center;margin:0 auto 6px;color:white;font-size:1.3rem;">📚</div>
            <div style="font-size:0.7rem;font-weight:700;color:${isPrint ? '#333' : '#2e7d32'};">Last Class Day</div>
          </div>
          <div style="flex:1;height:4px;background:${isPrint ? '#999' : 'linear-gradient(90deg,#4caf50,#e91e63)'};min-width:30px;"></div>
          <div style="text-align:center;min-width:120px;">
            <div style="width:46px;height:46px;border-radius:50%;background:${isPrint ? '#555' : '#e91e63'};display:flex;align-items:center;justify-content:center;margin:0 auto 6px;color:white;font-size:1.5rem;">🌴</div>
            <div style="font-size:0.7rem;font-weight:700;color:${isPrint ? '#333' : '#c2185b'};">Vacation Starts</div>
            <div style="font-size:0.68rem;color:#666;margin-top:2px;">${timeline.start}</div>
          </div>
          <div style="flex:1;height:4px;background:${isPrint ? '#999' : 'linear-gradient(90deg,#e91e63,#ff9800)'};min-width:30px;position:relative;">
            <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:0.65rem;color:${isPrint ? '#555' : '#e65100'};white-space:nowrap;font-weight:700;">🎉 Holiday Period</div>
          </div>
          <div style="text-align:center;min-width:120px;">
            <div style="width:46px;height:46px;border-radius:50%;background:${isPrint ? '#777' : '#ff9800'};display:flex;align-items:center;justify-content:center;margin:0 auto 6px;color:white;font-size:1.5rem;">🚀</div>
            <div style="font-size:0.7rem;font-weight:700;color:${isPrint ? '#333' : '#e65100'};">Classes Reopen</div>
            <div style="font-size:0.68rem;color:#666;margin-top:2px;">${timeline.end}</div>
          </div>
          <div style="flex:1;height:4px;background:${isPrint ? '#999' : 'linear-gradient(90deg,#ff9800,#2196f3)'};min-width:30px;"></div>
          <div style="text-align:center;min-width:100px;">
            <div style="width:42px;height:42px;border-radius:50%;background:${isPrint ? '#1a1a2e' : '#2196f3'};display:flex;align-items:center;justify-content:center;margin:0 auto 6px;color:white;font-size:1.3rem;">📖</div>
            <div style="font-size:0.7rem;font-weight:700;color:${isPrint ? '#1a1a2e' : '#1565c0'};">Resume!</div>
          </div>
        </div>
      </div>`;
  }

  // Format message text (preserve line breaks)
  const formattedMessage = (message || '').split('\n').map(line => `<p style="margin:6px 0;color:#333;font-size:0.92rem;line-height:1.7;">${line || '&nbsp;'}</p>`).join('');

  // Build full self-contained HTML notice PDF
  const templateHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title || 'Notice'}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 210mm;
    height: 297mm;
    max-width: 210mm;
    max-height: 297mm;
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #ffffff;
    padding: 0;
    margin: 0;
    color: #1a1a2e;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .notice-page {
    width: 210mm;
    height: 297mm;
    max-width: 210mm;
    max-height: 297mm;
    margin: 0 auto;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
  }
  /* Header */
  .notice-header {
    background: ${headerBg};
    ${isPrint ? `border-bottom: 3px solid ${primaryColor};` : ''}
    padding: 24px 32px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    position: relative;
  }
  ${!isPrint ? `.notice-header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%);
    pointer-events: none;
  }` : ''}
  .coaching-logo {
    width: 64px; height: 64px; object-fit: contain;
    border-radius: 8px;
    background: rgba(255,255,255,0.15);
    padding: 4px;
  }
  .header-text { flex: 1; }
  .coaching-name {
    font-size: 1.3rem; font-weight: 800; letter-spacing: 0.3px;
    color: ${headerText};
    text-shadow: ${isPrint ? 'none' : '0 1px 3px rgba(0,0,0,0.3)'};
  }
  .coaching-tagline {
    font-size: 0.78rem; color: ${isPrint ? '#555' : 'rgba(255,255,255,0.82)'};
    margin-top: 2px;
  }
  .coaching-contact {
    font-size: 0.72rem; color: ${isPrint ? '#555' : 'rgba(255,255,255,0.72)'};
    margin-top: 4px;
  }
  .notice-type-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: ${isPrint ? '#f0f0f0' : 'rgba(255,255,255,0.2)'};
    color: ${isPrint ? primaryColor : 'white'};
    border: 1px solid ${isPrint ? '#ddd' : 'rgba(255,255,255,0.3)'};
    border-radius: 50px; padding: 4px 14px;
    font-size: 0.75rem; font-weight: 700;
    margin-top: 8px;
    display: inline-block;
  }
  /* Decorative strip */
  .accent-strip {
    height: 5px;
    background: ${isPrint ? '#1a1a2e' : `linear-gradient(90deg, ${accentColor}, ${primaryColor}, ${accentColor})`};
  }
  /* Body */
  .notice-body { padding: 28px 36px; flex: 1; }
  .notice-title-row {
    display: flex; align-items: flex-start; gap: 12px;
    margin-bottom: 20px; padding-bottom: 16px;
    border-bottom: 2px solid ${isPrint ? '#e0e0e0' : accentColor + '40'};
  }
  .notice-emoji {
    font-size: 2.2rem; line-height: 1;
    filter: ${isPrint ? 'grayscale(1)' : 'none'};
  }
  .notice-title-text h1 {
    font-size: 1.25rem; font-weight: 800;
    color: ${isPrint ? '#1a1a2e' : primaryColor};
    line-height: 1.3;
  }
  .notice-meta {
    font-size: 0.75rem;
    color: #666;
    margin-top: 4px;
  }
  .notice-content { margin: 16px 0; }
  /* Footer */
  .notice-footer {
    padding: 20px 36px;
    border-top: 2px solid ${isPrint ? '#e0e0e0' : accentColor + '40'};
    display: flex; justify-content: space-between; align-items: flex-end;
    margin-top: auto;
  }
  .signature-block { text-align: center; }
  .sig-label { font-size: 0.7rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .sig-line { width: 120px; height: 1px; background: #333; margin: 0 auto 4px; }
  .sig-name { font-size: 0.8rem; font-weight: 700; color: #333; }
  .sig-title-text { font-size: 0.72rem; color: #666; }
  .footer-right { text-align: right; font-size: 0.72rem; color: #888; }
</style>
</head>
<body>
<div class="notice-page">
  <!-- Header -->
  <div class="notice-header">
    ${logoSrc ? `<img src="${logoSrc}" class="coaching-logo" alt="Logo">` : `<div style="width:64px;height:64px;border-radius:8px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:2rem;">🏫</div>`}
    <div class="header-text">
      <div class="coaching-name">${coaching.name || 'Coaching Institute'}</div>
      ${coaching.tagline ? `<div class="coaching-tagline">${coaching.tagline}</div>` : ''}
      ${coaching.address || coaching.phone ? `<div class="coaching-contact">${[coaching.address, coaching.phone, coaching.website].filter(Boolean).join(' · ')}</div>` : ''}
      <div class="notice-type-badge">${meta.emoji} ${meta.label}</div>
    </div>
  </div>
  <div class="accent-strip"></div>

  <!-- Body -->
  <div class="notice-body">
    <div class="notice-title-row">
      <span class="notice-emoji">${meta.emoji}</span>
      <div class="notice-title-text">
        <h1>${title || 'Official Notice'}</h1>
        <div class="notice-meta">
          Academic Year: ${coaching.academic_year || (new Date().getFullYear() + '-' + (new Date().getFullYear() + 1))} &nbsp;·&nbsp;
          Date: ${new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'})}
        </div>
      </div>
    </div>

    <div class="notice-content">
      ${timelineHTML}
      ${formattedMessage}
      ${tableHTML}
    </div>
  </div>

  <!-- Footer -->
  <div class="notice-footer">
    <div class="footer-right" style="text-align:left;">
      <div style="font-size:0.75rem;color:#888;">This is an official communication from ${coaching.name || 'the institute'}.</div>
      <div style="font-size:0.72rem;color:#aaa;margin-top:2px;">Please retain for your records.</div>
    </div>
    <div class="signature-block">
      ${signatureSrc
        ? `<img src="${signatureSrc}" alt="Signature" style="max-height:48px;max-width:140px;object-fit:contain;margin-bottom:6px;">`
        : '<div class="sig-line"></div>'}
      <div class="sig-name">${coaching.signatory_name || coaching.name || 'Principal'}</div>
      <div class="sig-title-text">${coaching.signatory_title || 'Director'}</div>
    </div>
  </div>
</div>
</body>
</html>`;

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
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
  } finally {
    await browser.close();
  }

  return { filename, outputPath };
}

async function generateCredentialSlipPDF(studentId) {
  const student = db.prepare('SELECT s.*, std.display_name as standard_name, b.name as batch_name FROM students s LEFT JOIN standards std ON s.standard_id = std.id LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?').get(studentId);
  if (!student) throw new Error('Student not found');

  const coaching = db.prepare('SELECT * FROM coaching_profile LIMIT 1').get() || {};

  let logoDataUri = '';
  if (coaching.logo_path) {
    const fullLogoPath = path.join(__dirname, '../../', coaching.logo_path);
    if (fs.existsSync(fullLogoPath)) {
      const ext = path.extname(fullLogoPath).slice(1) || 'png';
      logoDataUri = `data:image/${ext};base64,${fs.readFileSync(fullLogoPath).toString('base64')}`;
    }
  }

  let sigDataUri = '';
  if (coaching.signature_path) {
    const fullSigPath = path.join(__dirname, '../../', coaching.signature_path);
    if (fs.existsSync(fullSigPath)) {
      const ext = path.extname(fullSigPath).slice(1) || 'png';
      sigDataUri = `data:image/${ext};base64,${fs.readFileSync(fullSigPath).toString('base64')}`;
    }
  }

  const primaryColor = coaching.primary_color || '#1b2a4a';
  const issueDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Login Credential Slip — ${student.name}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 210mm;
      height: 297mm;
      max-width: 210mm;
      max-height: 297mm;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      background: #ffffff;
      color: #1e293b;
      margin: 0;
      padding: 0;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip-container {
      width: 210mm;
      height: 297mm;
      max-width: 210mm;
      max-height: 297mm;
      background: #ffffff;
      padding: 12mm 15mm;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-table {
      width: 100%;
      border-bottom: 2.5px solid ${primaryColor};
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .inst-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: ${primaryColor};
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .inst-tagline {
      font-size: 0.85rem;
      font-weight: 600;
      color: #d97706;
      margin-bottom: 5px;
    }
    .inst-contact {
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.4;
    }
    .doc-badge {
      display: inline-block;
      background: ${primaryColor};
      color: #ffffff;
      font-weight: 700;
      font-size: 0.82rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 16px;
      border-radius: 4px;
      margin-bottom: 18px;
    }
    .info-grid {
      display: table;
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 22px;
    }
    .info-row {
      display: table-row;
    }
    .info-cell {
      display: table-cell;
      padding: 6px 10px;
      font-size: 0.88rem;
      vertical-align: middle;
    }
    .info-label {
      font-weight: 700;
      color: #475569;
      width: 130px;
    }
    .info-val {
      font-weight: 600;
      color: #0f172a;
    }
    .cred-box {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 10px;
      padding: 22px;
      margin-bottom: 22px;
      box-shadow: 0 8px 24px rgba(15,23,42,0.15);
      border: 1.5px solid #d97706;
    }
    .cred-title {
      font-size: 0.85rem;
      font-weight: 800;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cred-url-row {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .cred-url-val {
      font-size: 0.95rem;
      font-weight: 700;
      color: #38bdf8;
      font-family: 'Consolas', 'Courier New', monospace;
      word-break: break-all;
      overflow-wrap: anywhere;
      margin-top: 2px;
    }
    .cred-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .cred-item {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 6px;
      padding: 12px 14px;
      word-break: break-all;
    }
    .cred-item-label {
      font-size: 0.72rem;
      color: #94a3b8;
      text-transform: uppercase;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .cred-item-val {
      font-size: 1.25rem;
      font-weight: 800;
      font-family: 'Consolas', 'Courier New', monospace;
      color: #38bdf8;
      word-break: break-all;
    }
    .features-list {
      background: #fdfdfd;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .features-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 0.8rem;
      color: #475569;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .guidelines {
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 30px;
      padding: 12px 16px;
      background: #fffbeb;
      border-left: 3.5px solid #f59e0b;
      border-radius: 4px;
    }
    .footer-sign {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 30px;
      border-top: 1px solid #cbd5e1;
      padding-top: 18px;
    }
    .sig-box {
      text-align: center;
      min-width: 170px;
    }
    .sig-img {
      max-height: 48px;
      max-width: 140px;
      object-fit: contain;
      margin-bottom: 4px;
    }
    .sig-line {
      height: 1px;
      background: #94a3b8;
      margin-bottom: 4px;
    }
    .sig-text {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        ${logoDataUri ? `<td style="width:75px; vertical-align:middle; padding-right:16px;"><img src="${logoDataUri}" style="width:65px; height:65px; object-fit:contain;"></td>` : ''}
        <td style="vertical-align:middle;">
          <div class="inst-title">${coaching.name || 'Apex Tuition Classes'}</div>
          ${coaching.tagline ? `<div class="inst-tagline">${coaching.tagline}</div>` : ''}
          <div class="inst-contact">
            ${coaching.address ? `${coaching.address} · ` : ''}
            ${coaching.phone ? `Phone: ${coaching.phone} · ` : ''}
            ${coaching.website ? `Website: ${coaching.website}` : ''}
          </div>
        </td>
        <td style="vertical-align:top; text-align:right;">
          <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Date: ${issueDate}</div>
          <div style="font-size:0.72rem; color:#94a3b8; margin-top:2px;">Academic Year: ${coaching.academic_year || '2026-2027'}</div>
        </td>
      </tr>
    </table>

    <div style="text-align:center;">
      <div class="doc-badge">Official Student &amp; Parent Portal Credential Slip</div>
    </div>

    <!-- Student Info -->
    <div class="info-grid">
      <div class="info-row">
        <div class="info-cell info-label">Student Name:</div>
        <div class="info-cell info-val" style="font-size:1rem; color:${primaryColor};">${student.name}</div>
        <div class="info-cell info-label">Roll Number:</div>
        <div class="info-cell info-val" style="font-family:monospace; font-size:1.05rem;">#${student.roll_number || '—'}</div>
      </div>
      <div class="info-row">
        <div class="info-cell info-label">Class / Standard:</div>
        <div class="info-cell info-val">${student.standard_name || 'Standard'}</div>
        <div class="info-cell info-label">Batch:</div>
        <div class="info-cell info-val">${student.batch_name || 'All Batches'}</div>
      </div>
      <div class="info-row">
        <div class="info-cell info-label">Father's Name:</div>
        <div class="info-cell info-val">${student.father_name || '—'}</div>
        <div class="info-cell info-label">Admission Date:</div>
        <div class="info-cell info-val">${student.admission_date || issueDate}</div>
      </div>
    </div>

    <!-- Credential Box -->
    <div class="cred-box">
      <div class="cred-title">🔐 Web Portal Login Credentials</div>
      
      <div class="cred-url-row">
        <div class="cred-item-label">🌐 Web Portal Address (Access from any Phone, Tablet or PC)</div>
        <div class="cred-url-val">${coaching.website || 'http://localhost:3000'}</div>
      </div>

      <div class="cred-grid">
        <div class="cred-item">
          <div class="cred-item-label">👤 Username / Login ID</div>
          <div class="cred-item-val">${student.parent_username || student.roll_number}</div>
          <div style="font-size:0.65rem; color:#94a3b8; margin-top:2px;">(Student Roll Number)</div>
        </div>
        <div class="cred-item">
          <div class="cred-item-label">🔑 Default Access Password</div>
          <div class="cred-item-val" style="color:#4ade80;">parent123</div>
          <div style="font-size:0.65rem; color:#94a3b8; margin-top:2px;">(Change after first sign in)</div>
        </div>
      </div>
    </div>

    <!-- Portal Features -->
    <div class="features-list">
      <div class="features-title">📱 Portal Access Features:</div>
      <div class="features-grid">
        <div class="feature-item">📊 <strong>Live Attendance:</strong> Real-time presence & roll logs</div>
        <div class="feature-item">📝 <strong>Weekly Tests:</strong> Marks & performance analytics</div>
        <div class="feature-item">🏆 <strong>Progress Reports:</strong> Official A4 download cards</div>
        <div class="feature-item">📢 <strong>Notices &amp; Holidays:</strong> Schedule notifications</div>
        <div class="feature-item">💳 <strong>Fee Receipts:</strong> Ledger & transaction history</div>
        <div class="feature-item">🗓️ <strong>Timetables:</strong> Lecture & exam schedules</div>
      </div>
    </div>

    <!-- Guidelines -->
    <div class="guidelines">
      <strong>⚠️ Important Instructions for Parents:</strong>
      <ol style="margin-left: 18px; margin-top: 4px;">
        <li>Keep your credentials safe and confidential. Do not share with unauthorized persons.</li>
        <li>You can sign in from any smartphone, tablet, or PC browser.</li>
        <li>Upon your initial sign-in, you may update your access password under profile settings.</li>
      </ol>
    </div>

    <!-- Footer Signatures -->
    <div class="footer-sign">
      <div style="font-size:0.75rem; color:#94a3b8;">
        <div>Issue Ref: ERP-CR-${student.id}-${Date.now().toString().slice(-4)}</div>
        <div>System Verified · Computer Generated Document</div>
      </div>
      <div class="sig-box">
        ${sigDataUri ? `<img src="${sigDataUri}" class="sig-img">` : '<div style="height:35px"></div>'}
        <div class="sig-line"></div>
        <div class="sig-text">${coaching.signatory_name || 'Authorized Signatory'}</div>
        <div style="font-size:0.7rem; color:#94a3b8;">${coaching.signatory_title || 'Director'}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const filename = `Credential_Slip_${student.roll_number}_${student.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const outputPath = path.join(EXPORTS_DIR, filename);

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
  } finally {
    await browser.close();
  }

  return { filename, outputPath };
}

async function generateBulkCredentialSlipsPDF(standardId = null) {
  let query = 'SELECT s.*, std.display_name as standard_name, b.name as batch_name FROM students s LEFT JOIN standards std ON s.standard_id = std.id LEFT JOIN batches b ON s.batch_id = b.id';
  const params = [];
  if (standardId && standardId !== 'all') {
    query += ' WHERE s.standard_id = ?';
    params.push(standardId);
  }
  query += ' ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.name ASC';
  const students = db.prepare(query).all(...params);

  if (students.length === 0) throw new Error('No students found to generate credential slips');

  const coaching = db.prepare('SELECT * FROM coaching_profile LIMIT 1').get() || {};

  let logoDataUri = '';
  if (coaching.logo_path) {
    const fullLogoPath = path.join(__dirname, '../../', coaching.logo_path);
    if (fs.existsSync(fullLogoPath)) {
      const ext = path.extname(fullLogoPath).slice(1) || 'png';
      logoDataUri = `data:image/${ext};base64,${fs.readFileSync(fullLogoPath).toString('base64')}`;
    }
  }

  let sigDataUri = '';
  if (coaching.signature_path) {
    const fullSigPath = path.join(__dirname, '../../', coaching.signature_path);
    if (fs.existsSync(fullSigPath)) {
      const ext = path.extname(fullSigPath).slice(1) || 'png';
      sigDataUri = `data:image/${ext};base64,${fs.readFileSync(fullSigPath).toString('base64')}`;
    }
  }

  const primaryColor = coaching.primary_color || '#1b2a4a';
  const issueDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const slipsHTML = students.map((student, idx) => `
    <div class="slip-container" ${idx < students.length - 1 ? 'style="page-break-after: always;"' : ''}>
      <table class="header-table">
        <tr>
          ${logoDataUri ? `<td style="width:75px; vertical-align:middle; padding-right:16px;"><img src="${logoDataUri}" style="width:65px; height:65px; object-fit:contain;"></td>` : ''}
          <td style="vertical-align:middle;">
            <div class="inst-title">${coaching.name || 'Apex Tuition Classes'}</div>
            ${coaching.tagline ? `<div class="inst-tagline">${coaching.tagline}</div>` : ''}
            <div class="inst-contact">
              ${coaching.address ? `${coaching.address} · ` : ''}
              ${coaching.phone ? `Phone: ${coaching.phone} · ` : ''}
              ${coaching.website ? `Website: ${coaching.website}` : ''}
            </div>
          </td>
          <td style="vertical-align:top; text-align:right;">
            <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Date: ${issueDate}</div>
            <div style="font-size:0.72rem; color:#94a3b8; margin-top:2px;">Academic Year: ${coaching.academic_year || '2026-2027'}</div>
          </td>
        </tr>
      </table>

      <div style="text-align:center;">
        <div class="doc-badge">Official Student &amp; Parent Portal Credential Slip</div>
      </div>

      <div class="info-grid">
        <div class="info-row">
          <div class="info-cell info-label">Student Name:</div>
          <div class="info-cell info-val" style="font-size:1rem; color:${primaryColor};">${student.name}</div>
          <div class="info-cell info-label">Roll Number:</div>
          <div class="info-cell info-val" style="font-family:monospace; font-size:1.05rem;">#${student.roll_number || '—'}</div>
        </div>
        <div class="info-row">
          <div class="info-cell info-label">Class / Standard:</div>
          <div class="info-cell info-val">${student.standard_name || 'Standard'}</div>
          <div class="info-cell info-label">Batch:</div>
          <div class="info-cell info-val">${student.batch_name || 'All Batches'}</div>
        </div>
        <div class="info-row">
          <div class="info-cell info-label">Father's Name:</div>
          <div class="info-cell info-val">${student.father_name || '—'}</div>
          <div class="info-cell info-label">Admission Date:</div>
          <div class="info-cell info-val">${student.admission_date || issueDate}</div>
        </div>
      </div>

      <div class="cred-box">
        <div class="cred-title">🔐 Web Portal Login Credentials</div>
        
        <div class="cred-url-row">
          <div class="cred-item-label">🌐 Web Portal Address (Access from any Phone, Tablet or PC)</div>
          <div class="cred-url-val">${coaching.website || 'http://localhost:3000'}</div>
        </div>

        <div class="cred-grid">
          <div class="cred-item">
            <div class="cred-item-label">👤 Username / Login ID</div>
            <div class="cred-item-val">${student.parent_username || student.roll_number}</div>
            <div style="font-size:0.65rem; color:#94a3b8; margin-top:2px;">(Student Roll Number)</div>
          </div>
          <div class="cred-item">
            <div class="cred-item-label">🔑 Default Access Password</div>
            <div class="cred-item-val" style="color:#4ade80;">parent123</div>
            <div style="font-size:0.65rem; color:#94a3b8; margin-top:2px;">(Change after first sign in)</div>
          </div>
        </div>
      </div>

      <div class="features-list">
        <div class="features-title">📱 Portal Access Features:</div>
        <div class="features-grid">
          <div class="feature-item">📊 <strong>Live Attendance:</strong> Real-time presence & roll logs</div>
          <div class="feature-item">📝 <strong>Weekly Tests:</strong> Marks & performance analytics</div>
          <div class="feature-item">🏆 <strong>Progress Reports:</strong> Official A4 download cards</div>
          <div class="feature-item">📢 <strong>Notices &amp; Holidays:</strong> Schedule notifications</div>
          <div class="feature-item">💳 <strong>Fee Receipts:</strong> Ledger & transaction history</div>
          <div class="feature-item">🗓️ <strong>Timetables:</strong> Lecture & exam schedules</div>
        </div>
      </div>

      <div class="guidelines">
        <strong>⚠️ Important Instructions for Parents:</strong>
        <ol style="margin-left: 18px; margin-top: 4px;">
          <li>Keep your credentials safe and confidential. Do not share with unauthorized persons.</li>
          <li>You can sign in from any smartphone, tablet, or PC browser.</li>
          <li>Upon your initial sign-in, you may update your access password under profile settings.</li>
        </ol>
      </div>

      <div class="footer-sign">
        <div style="font-size:0.75rem; color:#94a3b8;">
          <div>Issue Ref: ERP-CR-${student.id}-${Date.now().toString().slice(-4)}</div>
          <div>System Verified · Computer Generated Document</div>
        </div>
        <div class="sig-box">
          ${sigDataUri ? `<img src="${sigDataUri}" class="sig-img">` : '<div style="height:35px"></div>'}
          <div class="sig-line"></div>
          <div class="sig-text">${coaching.signatory_name || 'Authorized Signatory'}</div>
          <div style="font-size:0.7rem; color:#94a3b8;">${coaching.signatory_title || 'Director'}</div>
        </div>
      </div>
    </div>
  `).join('');

  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bulk Student Login Credential Slips</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      background: #ffffff;
      color: #1e293b;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip-container {
      width: 210mm;
      height: 297mm;
      max-width: 210mm;
      max-height: 297mm;
      background: #ffffff;
      padding: 12mm 15mm;
      position: relative;
      margin: 0 auto;
      box-sizing: border-box;
      overflow: hidden;
      page-break-inside: avoid;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .slip-container:last-child {
      page-break-after: auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2.5px solid ${primaryColor};
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .inst-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: ${primaryColor};
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .inst-tagline {
      font-size: 0.85rem;
      font-weight: 600;
      color: #d97706;
      margin-bottom: 5px;
    }
    .inst-contact {
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.4;
    }
    .doc-badge {
      display: inline-block;
      background: ${primaryColor};
      color: #ffffff;
      font-weight: 700;
      font-size: 0.82rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 16px;
      border-radius: 4px;
      margin-bottom: 18px;
    }
    .info-grid {
      display: table;
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 22px;
    }
    .info-row {
      display: table-row;
    }
    .info-cell {
      display: table-cell;
      padding: 6px 10px;
      font-size: 0.88rem;
      vertical-align: middle;
    }
    .info-label {
      font-weight: 700;
      color: #475569;
      width: 130px;
    }
    .info-val {
      font-weight: 600;
      color: #0f172a;
    }
    .cred-box {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 10px;
      padding: 22px;
      margin-bottom: 22px;
      box-shadow: 0 8px 24px rgba(15,23,42,0.15);
      border: 1.5px solid #d97706;
    }
    .cred-title {
      font-size: 0.85rem;
      font-weight: 800;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 14px;
    }
    .cred-url-row {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .cred-url-val {
      font-size: 0.95rem;
      font-weight: 700;
      color: #38bdf8;
      font-family: 'Consolas', 'Courier New', monospace;
      word-break: break-all;
      overflow-wrap: anywhere;
      margin-top: 2px;
    }
    .cred-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .cred-item {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 6px;
      padding: 12px 14px;
      word-break: break-all;
    }
    .cred-item-label {
      font-size: 0.72rem;
      color: #94a3b8;
      text-transform: uppercase;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .cred-item-val {
      font-size: 1.25rem;
      font-weight: 800;
      font-family: 'Consolas', 'Courier New', monospace;
      color: #38bdf8;
      word-break: break-all;
    }
    .features-list {
      background: #fdfdfd;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .features-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 0.8rem;
      color: #475569;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .guidelines {
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 30px;
      padding: 12px 16px;
      background: #fffbeb;
      border-left: 3.5px solid #f59e0b;
      border-radius: 4px;
    }
    .footer-sign {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 30px;
      border-top: 1px solid #cbd5e1;
      padding-top: 18px;
    }
    .sig-box {
      text-align: center;
      min-width: 170px;
    }
    .sig-img {
      max-height: 48px;
      max-width: 140px;
      object-fit: contain;
      margin-bottom: 4px;
    }
    .sig-line {
      height: 1px;
      background: #94a3b8;
      margin-bottom: 4px;
    }
    .sig-text {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${slipsHTML}
</body>
</html>`;

  const filename = `Bulk_Credential_Slips_${Date.now()}.pdf`;
  const outputPath = path.join(EXPORTS_DIR, filename);

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
  } finally {
    await browser.close();
  }

  return { filename, outputPath };
}

async function generateNoticeboardPDF(payload) {
  return generateReminderPDF({
    ...payload,
    type: 'general',
    title: payload.title || 'Noticeboard Results'
  });
}

module.exports = { 
  generateSinglePDF, 
  generateBulkPDF, 
  buildResultCardHTML, 
  generateReminderPDF, 
  generateNoticeboardPDF,
  generateCredentialSlipPDF,
  generateBulkCredentialSlipsPDF
};
