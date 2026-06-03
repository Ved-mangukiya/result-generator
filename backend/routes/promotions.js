const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Generate promotional PDF
router.get('/generate-pdf', async (req, res) => {
  const { cycleId, filter } = req.query;
  if (!cycleId) return res.status(400).send('cycleId is required');

  try {
    const cycle = db.prepare('SELECT * FROM test_cycles WHERE id = ?').get(cycleId);
    if (!cycle) return res.status(404).send('Test series not found');

    const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(cycle.standard_id);
    const profile = db.prepare('SELECT * FROM coaching_profile LIMIT 1').get();

    // Fetch tests in this cycle
    const tests = db.prepare('SELECT id, subject_id, max_marks FROM tests WHERE cycle_id = ?').all(cycleId);
    if (tests.length === 0) return res.status(400).send('No tests in this series');

    const testIds = tests.map(t => t.id);
    const testMarks = db.prepare(`
      SELECT student_id, sum(obtained_marks) as total_obtained, count(test_id) as tests_appeared
      FROM test_marks 
      WHERE test_id IN (${testIds.join(',')}) AND is_absent = 0
      GROUP BY student_id
    `).all();

    const maxTotalMarks = tests.reduce((sum, t) => sum + t.max_marks, 0);

    // Get students
    const studentsMap = {};
    const students = db.prepare('SELECT id, name, photo_path FROM students WHERE standard_id = ?').all(cycle.standard_id);
    students.forEach(s => studentsMap[s.id] = s);

    // Calculate percentage and rank
    let results = testMarks.map(tm => {
      const pct = (tm.total_obtained / maxTotalMarks) * 100;
      const grade = pct >= 91 ? 'A1' : pct >= 81 ? 'A2' : pct >= 71 ? 'B1' : pct >= 61 ? 'B2' : pct >= 51 ? 'C1' : pct >= 41 ? 'C2' : pct >= 33 ? 'D' : 'Fail';
      return {
        student: studentsMap[tm.student_id],
        obtained: tm.total_obtained,
        max: maxTotalMarks,
        pct: pct,
        grade: grade
      };
    }).filter(r => r.student);

    // Sort by marks desc
    results.sort((a, b) => b.obtained - a.obtained);

    // Filter
    if (filter === 'A1') {
      results = results.filter(r => r.grade === 'A1');
    } else {
      const topN = parseInt(filter) || 3;
      results = results.slice(0, topN);
    }

    if (results.length === 0) {
      return res.status(400).send('No students matched the criteria (maybe marks are not entered yet?)');
    }

    // Build HTML
    const templateId = req.query.theme || req.query.template || '1';
    let logoSrc = '';
    if (profile && profile.logo_path) {
      const lpath = path.join(__dirname, '../../', profile.logo_path);
      if (fs.existsSync(lpath)) {
        const ext = path.extname(lpath).replace('.', '');
        const base64 = fs.readFileSync(lpath, 'base64');
        logoSrc = `data:image/${ext};base64,${base64}`;
      }
    }

    let studentsHTML = '';
    results.forEach((r, idx) => {
      let photoSrc = '';
      if (r.student.photo_path) {
        const ppath = path.join(__dirname, '../../', r.student.photo_path);
        if (fs.existsSync(ppath)) {
          const ext = path.extname(ppath).replace('.', '');
          const base64 = fs.readFileSync(ppath, 'base64');
          photoSrc = `data:image/${ext};base64,${base64}`;
        }
      }
      if (!photoSrc) {
        // Initials fallback
        const initials = r.student.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
        photoSrc = `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23d4af37'/%3E%3Ctext x='50%25' y='50%25' dy='.3em' text-anchor='middle' fill='white' font-size='50' font-family='sans-serif'%3E${initials}%3C/text%3E%3C/svg%3E`;
      }

      const medals = ['🥇', '🥈', '🥉'];
      const rankBadge = idx < 3 ? medals[idx] : `#${idx + 1}`;

      if (templateId === '2') {
        studentsHTML += `
          <tr>
            <td class="rank-cell" style="text-align:center">${rankBadge}</td>
            <td class="photo-cell"><img src="${photoSrc}" class="student-thumbnail" /></td>
            <td class="name-cell">${r.student.name}</td>
            <td class="marks-cell">${r.obtained} <span class="marks-max">/ ${r.max}</span></td>
            <td><span class="pct-cell">${r.pct.toFixed(1)}%</span></td>
          </tr>
        `;
      } else {
        studentsHTML += `
          <div class="student-card">
            <div class="rank-badge">${rankBadge}</div>
            <img src="${photoSrc}" class="student-photo" />
            <div class="student-name">${r.student.name}</div>
            <div class="student-marks">${r.obtained} <span class="marks-max">/ ${r.max}</span></div>
            <div class="student-pct">${r.pct.toFixed(1)}%</div>
          </div>
        `;
      }
    });

    const templatePath = path.join(__dirname, `../../templates/promo_template${templateId}.html`);
    let htmlTemplate;
    if (fs.existsSync(templatePath)) {
      htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
    } else {
      htmlTemplate = templateId === '2' ? buildDefaultPromoTableHTML() : buildDefaultPromoHTML();
    }

    htmlTemplate = htmlTemplate
      .replace(/{{COACHING_NAME}}/g, profile?.name || 'Coaching Center')
      .replace(/{{SERIES_TITLE}}/g, cycle.title)
      .replace(/{{STANDARD_NAME}}/g, standard.display_name)
      .replace(/{{STUDENTS_GRID}}/g, studentsHTML)
      .replace(/{{COACHING_LOGO}}/g, logoSrc ? `<img src="${logoSrc}" class="logo" />` : '');

    // Launch puppeteer
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    
    // Inject dynamic page dimension styles
    const size = req.query.size || 'A4';
    const orientation = req.query.orientation || (templateId === '2' ? 'portrait' : 'landscape');
    const isLandscape = (orientation === 'landscape');
    
    let dimensionStyles = '';
    if (size === 'A5') {
      dimensionStyles = isLandscape 
        ? `<style>body { width: 210mm !important; height: 148mm !important; margin: 0 !important; box-sizing: border-box !important; }</style>`
        : `<style>body { width: 148mm !important; height: 210mm !important; margin: 0 !important; box-sizing: border-box !important; }</style>`;
    } else { // A4
      dimensionStyles = isLandscape
        ? `<style>body { width: 297mm !important; height: 210mm !important; margin: 0 !important; box-sizing: border-box !important; }</style>`
        : `<style>body { width: 210mm !important; height: 297mm !important; margin: 0 !important; box-sizing: border-box !important; }</style>`;
    }
    htmlTemplate = htmlTemplate.replace('</head>', `${dimensionStyles}</head>`);
    
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: size,
      landscape: isLandscape,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="TopScorers_${cycle.title.replace(/\s+/g, '_')}.pdf"`);
    res.send(Buffer.from(pdfBuffer));

  } catch (err) {
    console.error('Promo PDF Error:', err);
    res.status(500).send('Error generating promotional PDF: ' + err.message);
  }
});

function buildDefaultPromoHTML() {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&display=swap');
      body {
        margin: 0; padding: 0;
        font-family: 'Montserrat', sans-serif;
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        color: white;
        width: 297mm; height: 210mm; /* A4 Landscape */
        position: relative;
        overflow: hidden;
      }
      .bg-decoration {
        position: absolute;
        width: 150%; height: 150%;
        top: -25%; left: -25%;
        background: radial-gradient(circle at center, rgba(212,175,55,0.15) 0%, transparent 60%);
        z-index: 0;
      }
      .content {
        position: relative;
        z-index: 1;
        padding: 40px;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .header {
        text-align: center;
        margin-bottom: 40px;
      }
      .logo { max-height: 80px; margin-bottom: 10px; }
      .coaching-name { font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #d4af37; text-transform: uppercase; }
      .title { font-size: 48px; font-weight: 900; margin: 10px 0; text-shadow: 0 4px 10px rgba(0,0,0,0.5); }
      .subtitle { font-size: 20px; font-weight: 700; color: #9ca3af; }
      
      .students-grid {
        display: flex;
        justify-content: center;
        gap: 30px;
        flex-wrap: wrap;
        margin-top: 20px;
      }
      .student-card {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(212, 175, 55, 0.3);
        border-radius: 20px;
        padding: 25px 20px;
        text-align: center;
        width: 200px;
        position: relative;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      }
      .rank-badge {
        position: absolute;
        top: -15px; left: 50%;
        transform: translateX(-50%);
        background: #d4af37;
        color: #111;
        font-weight: 900;
        font-size: 24px;
        padding: 5px 15px;
        border-radius: 20px;
        box-shadow: 0 5px 15px rgba(212,175,55,0.4);
      }
      .student-photo {
        width: 120px; height: 120px;
        border-radius: 50%;
        object-fit: cover;
        border: 4px solid #d4af37;
        margin-bottom: 15px;
        margin-top: 10px;
      }
      .student-name { font-size: 20px; font-weight: 800; margin-bottom: 5px; }
      .student-marks { font-size: 28px; font-weight: 900; color: #d4af37; }
      .marks-max { font-size: 16px; color: #9ca3af; }
      .student-pct { font-size: 18px; font-weight: 700; background: rgba(255,255,255,0.1); display: inline-block; padding: 4px 12px; border-radius: 12px; margin-top: 10px; }
    </style>
  </head>
  <body>
    <div class="bg-decoration"></div>
    <div class="content">
      <div class="header">
        {{COACHING_LOGO}}
        <div class="coaching-name">{{COACHING_NAME}}</div>
        <div class="title">CONGRATULATIONS</div>
        <div class="subtitle">TOP SCORERS — {{SERIES_TITLE}} ({{STANDARD_NAME}})</div>
      </div>
      <div class="students-grid">
        {{STUDENTS_GRID}}
      </div>
    </div>
  </body>
  </html>
  `;
}

function buildDefaultPromoTableHTML() {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&display=swap');
      body {
        margin: 0; padding: 0;
        font-family: 'Montserrat', sans-serif;
        background: linear-gradient(135deg, #0b0f19 0%, #111827 100%);
        color: white;
        width: 210mm; height: 297mm;
        position: relative;
        overflow: hidden;
      }
      .border-gold {
        position: absolute;
        top: 15px; left: 15px; right: 15px; bottom: 15px;
        border: 2px solid #d4af37;
        border-radius: 12px;
      }
      .content {
        position: relative;
        padding: 50px 40px;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .header { text-align: center; margin-bottom: 30px; }
      .logo { max-height: 70px; margin-bottom: 10px; }
      .coaching-name { font-size: 20px; font-weight: 800; color: #d4af37; text-transform: uppercase; }
      .title { font-size: 38px; font-weight: 900; margin: 10px 0; color: white; }
      .subtitle { font-size: 16px; font-weight: 700; color: #9ca3af; }
      
      .table-container { width: 100%; margin-top: 10px; }
      .promo-table { width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.02); }
      .promo-table th { background: rgba(212,175,55,0.15); color: #d4af37; padding: 12px; border-bottom: 2px solid #d4af37; text-align: left; }
      .promo-table td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .rank-cell { font-weight: 900; font-size: 18px; text-align: center; }
      .student-thumbnail { width: 44px; height: 44px; border-radius: 50%; border: 2px solid #d4af37; object-fit: cover; }
      .name-cell { font-weight: 700; }
      .marks-cell { font-weight: 800; color: #d4af37; }
      .pct-cell { font-weight: 700; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="border-gold"></div>
    <div class="content">
      <div class="header">
        {{COACHING_LOGO}}
        <div class="coaching-name">{{COACHING_NAME}}</div>
        <div class="title">ACHIEVEMENT BOARD</div>
        <div class="subtitle">TOP PERFORMERS — {{SERIES_TITLE}} ({{STANDARD_NAME}})</div>
      </div>
      <div class="table-container">
        <table class="promo-table">
          <thead>
            <tr>
              <th style="text-align:center">Rank</th>
              <th>Photo</th>
              <th>Student Name</th>
              <th>Marks</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {{STUDENTS_GRID}}
          </tbody>
        </table>
      </div>
    </div>
  </body>
  </html>
  `;
}

module.exports = router;
