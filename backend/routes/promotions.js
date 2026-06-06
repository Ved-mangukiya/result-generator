const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

// ══════════════════════════════════════════════════
// GET /api/promotions/data — Fetch ranked student data for live preview
// ══════════════════════════════════════════════════
router.get('/data', (req, res) => {
  const { standard_id } = req.query;
  let cycle_id = req.query.cycle_id;
  let test_id = req.query.test_id;

  if (cycle_id && String(cycle_id).startsWith('cycle_')) {
    cycle_id = cycle_id.replace('cycle_', '');
  } else if (cycle_id && String(cycle_id).startsWith('test_')) {
    test_id = cycle_id.replace('test_', '');
    cycle_id = null;
  }

  if (!standard_id || (!cycle_id && !test_id)) {
    return res.status(400).json({ error: 'standard_id and cycle_id/test_id are required' });
  }

  try {
    let cycle = null;
    let tests = [];
    if (cycle_id) {
      cycle = db.prepare('SELECT * FROM test_cycles WHERE id = ?').get(cycle_id);
      if (!cycle) return res.status(404).json({ error: 'Test cycle not found' });
      tests = db.prepare('SELECT id, max_marks FROM tests WHERE cycle_id = ?').all(cycle_id);
    } else if (test_id) {
      const test = db.prepare('SELECT id, max_marks, name FROM tests WHERE id = ?').get(test_id);
      if (!test) return res.status(404).json({ error: 'Test not found' });
      cycle = { id: `test_${test.id}`, title: test.name, name: test.name, max_marks: test.max_marks };
      tests = [test];
    }
    if (tests.length === 0) return res.json({ students: [], cycle, maxTotal: 0 });

    const maxTotal = tests.reduce((s, t) => s + t.max_marks, 0);
    const testIds  = tests.map(t => t.id);

    const students = db.prepare('SELECT id, name, roll_number, photo_path FROM students WHERE standard_id = ?').all(standard_id);

    const marksList = db.prepare(`
      SELECT student_id, obtained_marks, is_absent FROM test_marks
      WHERE test_id IN (${testIds.join(',')})
    `).all();

    const byStudent = {};
    marksList.forEach(m => {
      if (!byStudent[m.student_id]) byStudent[m.student_id] = [];
      byStudent[m.student_id].push(m);
    });

    const results = students.map(s => {
      const mks = byStudent[s.id] || [];
      let obtained = 0;
      mks.forEach(m => {
        if (!m.is_absent && m.obtained_marks !== null) obtained += m.obtained_marks;
      });
      const pct = maxTotal > 0 ? (obtained / maxTotal) * 100 : 0;
      const grade = pct >= 91 ? 'A1' : pct >= 81 ? 'A2' : pct >= 71 ? 'B1' : pct >= 61 ? 'B2' : pct >= 51 ? 'C1' : pct >= 41 ? 'C2' : pct >= 33 ? 'D' : 'Fail';
      return { ...s, obtained, maxTotal, percentage: pct.toFixed(2), grade };
    });

    results.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
    res.json({ students: results, cycle, maxTotal });
  } catch (err) {
    console.error('Promotions data error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════
// POST /api/promotions/generate-pdf — New multi-template PDF generator
// ══════════════════════════════════════════════════
router.post('/generate-pdf', async (req, res) => {
  const { standard_id, template, color_theme, filter, headline, include_photos, include_logo, include_stats } = req.body;
  let cycle_id = req.body.cycle_id;
  let test_id = req.body.test_id;

  if (cycle_id && String(cycle_id).startsWith('cycle_')) {
    cycle_id = cycle_id.replace('cycle_', '');
  } else if (cycle_id && String(cycle_id).startsWith('test_')) {
    test_id = cycle_id.replace('test_', '');
    cycle_id = null;
  }

  if (!standard_id || (!cycle_id && !test_id)) return res.status(400).json({ error: 'standard_id and cycle_id/test_id required' });

  try {
    let cycle = null;
    let tests = [];
    if (cycle_id) {
      cycle = db.prepare('SELECT * FROM test_cycles WHERE id = ?').get(cycle_id);
      if (!cycle) return res.status(404).json({ error: 'Test cycle not found' });
      tests = db.prepare('SELECT id, max_marks FROM tests WHERE cycle_id = ?').all(cycle_id);
    } else if (test_id) {
      const test = db.prepare('SELECT id, max_marks, name FROM tests WHERE id = ?').get(test_id);
      if (!test) return res.status(404).json({ error: 'Test not found' });
      cycle = { id: `test_${test.id}`, title: test.name, name: test.name, max_marks: test.max_marks };
      tests = [test];
    }

    const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(standard_id);
    const profile  = db.prepare('SELECT * FROM coaching_profile LIMIT 1').get();
    if (tests.length === 0) return res.status(400).json({ error: 'No tests in this series' });

    const maxTotal = tests.reduce((s, t) => s + t.max_marks, 0);
    const testIds  = tests.map(t => t.id);

    const students = db.prepare('SELECT id, name, roll_number, photo_path FROM students WHERE standard_id = ?').all(standard_id);
    const marksList = db.prepare(`
      SELECT student_id, obtained_marks, is_absent FROM test_marks
      WHERE test_id IN (${testIds.join(',')})
    `).all();

    const byStudent = {};
    marksList.forEach(m => {
      if (!byStudent[m.student_id]) byStudent[m.student_id] = [];
      byStudent[m.student_id].push(m);
    });

    let results = students.map(s => {
      const mks = byStudent[s.id] || [];
      let obtained = 0;
      mks.forEach(m => { if (!m.is_absent && m.obtained_marks !== null) obtained += m.obtained_marks; });
      const pct = maxTotal > 0 ? (obtained / maxTotal) * 100 : 0;
      const grade = pct >= 91 ? 'A1' : pct >= 81 ? 'A2' : pct >= 71 ? 'B1' : pct >= 61 ? 'B2' : pct >= 51 ? 'C1' : pct >= 41 ? 'C2' : pct >= 33 ? 'D' : 'Fail';
      return { ...s, obtained, maxTotal, percentage: pct, grade };
    });
    results.sort((a, b) => b.percentage - a.percentage);

    // Apply filter
    const n = parseInt(filter);
    if (!isNaN(n) && filter !== 'all') results = results.slice(0, n);
    if (results.length === 0) return res.status(400).json({ error: 'No students matched the criteria. Make sure marks are entered.' });

    // Build photos as base64
    function imageToB64(relPath) {
      if (!relPath) return null;
      const full = path.join(__dirname, '../../', relPath);
      if (!fs.existsSync(full)) return null;
      const ext = path.extname(full).toLowerCase().replace('.', '');
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${fs.readFileSync(full).toString('base64')}`;
    }

    const logoB64 = include_logo ? imageToB64(profile?.logo_path) : null;
    results.forEach(r => { r.photoB64 = include_photos ? imageToB64(r.photo_path) : null; });

    // Build stats
    let avgPct = 0, passCount = 0;
    const allResults = students.map(s => {
      const mks = byStudent[s.id] || [];
      let obtained = 0;
      mks.forEach(m => { if (!m.is_absent && m.obtained_marks !== null) obtained += m.obtained_marks; });
      return maxTotal > 0 ? (obtained / maxTotal) * 100 : 0;
    });
    if (allResults.length > 0) {
      avgPct = allResults.reduce((a, b) => a + b, 0) / allResults.length;
      passCount = allResults.filter(p => p >= 33).length;
    }

    // Determine orientation
    const isPortrait = ['4','5'].includes(template);
    const isSquare   = template === '6';
    const isLandscape = !isPortrait && !isSquare;

    const htmlDoc = buildNewPromoHTML({
      results, cycle, standard, profile, logoB64,
      template: template || '1', color_theme: color_theme || 'navy-gold',
      headline: headline || `Top Scorers — ${standard?.display_name} — ${cycle.name || cycle.title}`,
      include_stats,
      avgPct, passCount, totalCount: students.length,
      isPortrait, isLandscape, isSquare,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlDoc, { waitUntil: 'networkidle0', timeout: 30000 });
      const pdfOpts = {
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      };
      if (isSquare) {
        pdfOpts.width  = '190mm';
        pdfOpts.height = '190mm';
      } else if (isPortrait) {
        pdfOpts.format    = 'A4';
        pdfOpts.landscape = false;
      } else {
        pdfOpts.format    = 'A4';
        pdfOpts.landscape = true;
      }
      const pdfBuffer = await page.pdf(pdfOpts);
      await browser.close();

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const coachingClean = (profile?.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
      const stdClean = (standard?.display_name || '').replace(/[^a-zA-Z0-9]/g, '_');
      const dlName = `${coachingClean}_${stdClean}_PromoBoard_${dateStr}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${dlName}"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (innerErr) {
      await browser.close();
      throw innerErr;
    }
  } catch (err) {
    console.error('Promo POST PDF Error:', err);
    res.status(500).json({ error: err.message });
  }
});

function buildNewPromoHTML({ results, cycle, standard, profile, logoB64, template, color_theme, headline, include_stats, avgPct, passCount, totalCount, isPortrait, isLandscape, isSquare }) {
  const THEMES = {
    'navy-gold':   { primary: '#1B2A4A', accent: '#C9A96E', bg: '#FDFAF4' },
    'dark-teal':   { primary: '#0F2027', accent: '#2EB8A0', bg: '#0F2027' },
    'maroon-gold': { primary: '#7C1D1D', accent: '#D4AF37', bg: '#FFF8F0' },
    'royal-blue':  { primary: '#1a237e', accent: '#42a5f5', bg: '#F5F8FF' },
    'forest':      { primary: '#0f4c2e', accent: '#4CAF50', bg: '#F1F8F2' },
    'violet':      { primary: '#4A1A6B', accent: '#CE93D8', bg: '#F9F0FF' },
  };
  const theme = THEMES[color_theme] || THEMES['navy-gold'];

  function avatar(r, size = 80) {
    if (r.photoB64) return `<img src="${r.photoB64}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:3px solid ${theme.accent};">`;
    const init = (r.name || '?')[0].toUpperCase();
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,${theme.primary},${theme.accent});display:flex;align-items:center;justify-content:center;color:white;font-size:${Math.round(size*0.38)}px;font-weight:900;border:3px solid ${theme.accent};">${init}</div>`;
  }

  const medals = ['🥇','🥈','🥉'];
  const coachingName = profile?.name || '';

  let bodyContent = '';

  // Template 1: Classic Gold Cards
  if (template === '1') {
    bodyContent = `
      <div style="padding:32px;background:linear-gradient(145deg,${theme.bg},${theme.bg === '#FDFAF4' ? '#F5EDD8' : theme.bg});min-height:100vh;position:relative;box-sizing:border-box;">
        <div style="position:absolute;inset:12px;border:1.5px solid rgba(201,169,110,0.4);border-radius:16px;pointer-events:none;"></div>
        ${['top-left','top-right','bottom-left','bottom-right'].map((pos) => {
          const [v,h] = pos.split('-');
          return `<div style="position:absolute;${v}:14px;${h}:14px;width:22px;height:22px;border-${v}:2px solid ${theme.accent};border-${h}:2px solid ${theme.accent};border-radius:${v === 'top' ? '3px 0 0 0' : '0 0 0 3px'};"></div>`;
        }).join('')}
        <div style="text-align:center;margin-bottom:28px;position:relative;z-index:1;">
          ${logoB64 ? `<img src="${logoB64}" style="height:52px;margin-bottom:8px;object-fit:contain;">` : ''}
          ${coachingName ? `<div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${theme.accent};margin-bottom:5px;">${coachingName}</div>` : ''}
          <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;color:${theme.primary};letter-spacing:-0.5px;">${headline}</div>
          ${cycle ? `<div style="font-size:11px;color:rgba(27,42,74,0.5);margin-top:4px;">${cycle.name || cycle.title}</div>` : ''}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;position:relative;z-index:1;">
          ${results.slice(0,10).map((r,i) => `
            <div style="background:rgba(255,255,255,0.75);border:1px solid rgba(201,169,110,0.28);border-radius:14px;padding:18px 14px;width:160px;text-align:center;box-shadow:0 4px 16px rgba(27,42,74,0.08);">
              <div style="display:flex;justify-content:center;margin-bottom:10px;">${avatar(r, 64)}</div>
              <div style="font-size:20px;margin-bottom:5px;">${medals[i] || '#' + (i+1)}</div>
              <div style="font-size:12.5px;font-weight:800;color:${theme.primary};line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${r.name}">${r.name}</div>
              <div style="font-size:10px;color:rgba(27,42,74,0.45);margin-top:2px;">Roll ${r.roll_number || '—'}</div>
              <div style="font-size:16px;font-weight:900;color:${theme.accent};margin-top:7px;">${parseFloat(r.percentage).toFixed(1)}%</div>
              <div style="font-size:10px;color:rgba(27,42,74,0.4);margin-top:2px;">${r.obtained}/${r.maxTotal}</div>
            </div>`).join('')}
        </div>
        ${include_stats ? `<div style="text-align:center;margin-top:22px;font-size:10.5px;color:rgba(27,42,74,0.4);padding-top:14px;border-top:1px solid rgba(201,169,110,0.2);">Class Avg: ${avgPct.toFixed(1)}% · Pass Rate: ${totalCount > 0 ? ((passCount/totalCount)*100).toFixed(0) : 0}% · ${results.length} Featured</div>` : ''}
      </div>`;
  }

  // Template 2: Dark Elite
  else if (template === '2') {
    bodyContent = `
      <div style="padding:32px;background:linear-gradient(145deg,#0A1628,#1B2A4A);min-height:100vh;position:relative;box-sizing:border-box;overflow:hidden;">
        <div style="position:absolute;top:-80px;right:-80px;width:350px;height:350px;border-radius:50%;background:radial-gradient(circle,rgba(201,169,110,0.12) 0%,transparent 70%);pointer-events:none;"></div>
        <div style="text-align:center;margin-bottom:28px;position:relative;z-index:1;">
          ${logoB64 ? `<img src="${logoB64}" style="height:48px;margin-bottom:8px;object-fit:contain;filter:brightness(0) invert(1) opacity(0.8);">` : ''}
          <div style="font-size:9px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${theme.accent || '#C9A96E'};margin-bottom:6px;opacity:0.8;">Excellence · Achievement · Pride</div>
          <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:900;color:white;">${headline}</div>
          <div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,${theme.accent || '#C9A96E'},transparent);margin:10px auto;"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;position:relative;z-index:1;">
          ${results.slice(0,10).map((r,i) => `
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(201,169,110,0.25);border-radius:14px;padding:16px;width:150px;text-align:center;position:relative;">
              ${i < 3 ? `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:20px;">${medals[i]}</div>` : `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:${theme.accent || '#C9A96E'};color:${theme.primary || '#1B2A4A'};width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;">${i+1}</div>`}
              <div style="margin-top:10px;display:flex;justify-content:center;">${avatar(r, 52)}</div>
              <div style="font-size:11.5px;font-weight:700;color:white;margin-top:7px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${r.name}">${r.name}</div>
              <div style="font-size:15px;font-weight:900;color:${theme.accent || '#C9A96E'};margin-top:5px;">${parseFloat(r.percentage).toFixed(1)}%</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // Template 3: Podium
  else if (template === '3') {
    const top3 = results.slice(0, 3);
    const rest  = results.slice(3, 10);
    const podiumOrder = [top3[1], top3[0], top3[2]];
    const heights = ['130px','170px','100px'];
    const avatarSizes = [52, 70, 44];
    bodyContent = `
      <div style="padding:28px;background:linear-gradient(145deg,#1a1a2e,#16213e,#0f3460);min-height:100vh;box-sizing:border-box;">
        <div style="text-align:center;margin-bottom:22px;position:relative;z-index:1;">
          ${logoB64 ? `<img src="${logoB64}" style="height:40px;margin-bottom:6px;object-fit:contain;filter:brightness(0) invert(1) opacity(0.7);">` : ''}
          <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:900;color:white;">${headline}</div>
        </div>
        <div style="display:flex;justify-content:center;align-items:flex-end;gap:24px;margin-bottom:24px;position:relative;z-index:1;">
          ${podiumOrder.map((s, pos) => {
            if (!s) return '<div style="width:160px;"></div>';
            const rank = pos === 1 ? 1 : pos === 0 ? 2 : 3;
            return `
              <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                <div style="display:flex;justify-content:center;">${avatar(s, avatarSizes[pos])}</div>
                <div style="font-size:11px;font-weight:700;color:white;text-align:center;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
                <div style="font-size:15px;font-weight:900;color:#FFD700;">${parseFloat(s.percentage).toFixed(1)}%</div>
                <div style="width:150px;height:${heights[pos]};background:linear-gradient(180deg,rgba(255,215,0,0.22),rgba(255,215,0,0.04));border:1px solid rgba(255,215,0,0.25);border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;">
                  <span style="font-size:26px;">${medals[rank-1]}</span>
                  <span style="font-size:12px;color:rgba(255,255,255,0.6);">Rank #${rank}</span>
                </div>
              </div>`;
          }).join('')}
        </div>
        ${rest.length > 0 ? `
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;position:relative;z-index:1;">
            ${rest.map((s,i) => `
              <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px 14px;display:flex;align-items:center;gap:10px;">
                <span style="font-size:12px;font-weight:800;color:rgba(255,215,0,0.8);">#${i+4}</span>
                ${avatar(s, 32)}
                <div>
                  <div style="font-size:11px;font-weight:700;color:white;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
                  <div style="font-size:10.5px;color:rgba(255,215,0,0.8);">${parseFloat(s.percentage).toFixed(1)}%</div>
                </div>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  }

  // Template 4: Magazine (Portrait)
  else if (template === '4') {
    bodyContent = `
      <div style="padding:0;background:white;min-height:100vh;box-sizing:border-box;font-family:'Inter',sans-serif;">
        <div style="background:${theme.primary};padding:20px 28px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${theme.accent};margin-bottom:3px;">Special Edition</div>
            <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:900;color:white;">${headline}</div>
          </div>
          ${logoB64 ? `<img src="${logoB64}" style="height:40px;object-fit:contain;filter:brightness(0) invert(1) opacity(0.8);">` : ''}
        </div>
        ${results[0] ? `<div style="background:linear-gradient(135deg,${theme.bg},white);padding:22px 28px;display:flex;gap:18px;align-items:center;border-bottom:1px solid rgba(27,42,74,0.08);">
          ${avatar(results[0], 80)}
          <div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${theme.accent};">Champion · Rank #1</div>
            <div style="font-size:24px;font-weight:900;color:${theme.primary};margin:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px;" title="${results[0].name}">${results[0].name}</div>
            <div style="font-size:12px;color:rgba(27,42,74,0.5);">Roll ${results[0].roll_number || '—'}</div>
            <div style="font-size:30px;font-weight:900;color:${theme.accent};margin-top:4px;">${parseFloat(results[0].percentage).toFixed(1)}%</div>
          </div>
        </div>` : ''}
        <div style="padding:16px 28px;">
          ${results.slice(1, 12).map((s,i) => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i < results.slice(1,12).length-1 ? 'border-bottom:1px solid rgba(27,42,74,0.07);' : ''}">
              <div style="width:26px;height:26px;border-radius:50%;background:${theme.primary};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${theme.accent};flex-shrink:0;">${i+2}</div>
              ${avatar(s, 36)}
              <div style="flex:1;min-width:0;">
                <div style="font-size:12.5px;font-weight:700;color:${theme.primary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
                <div style="font-size:10px;color:rgba(27,42,74,0.4);">Roll ${s.roll_number || '—'}</div>
              </div>
              <div style="font-size:14px;font-weight:900;color:${theme.accent};">${parseFloat(s.percentage).toFixed(1)}%</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // Template 5: Certificate (Portrait)
  else if (template === '5') {
    bodyContent = `
      <div style="padding:32px;background:${theme.bg};min-height:100vh;box-sizing:border-box;position:relative;font-family:'Playfair Display',serif;">
        <div style="position:absolute;inset:14px;border:2px solid ${theme.accent};border-radius:12px;pointer-events:none;opacity:0.6;"></div>
        <div style="position:absolute;inset:18px;border:1px solid ${theme.accent};border-radius:10px;pointer-events:none;opacity:0.3;"></div>
        <div style="text-align:center;margin-bottom:20px;position:relative;z-index:1;">
          ${logoB64 ? `<img src="${logoB64}" style="height:50px;margin-bottom:8px;object-fit:contain;">` : ''}
          <div style="font-size:9px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${theme.accent};font-family:'Inter',sans-serif;margin-bottom:8px;">Certificate of Academic Achievement</div>
          <div style="font-size:24px;font-weight:900;color:${theme.primary};">${headline}</div>
          <div style="width:80px;height:1.5px;background:${theme.accent};margin:10px auto;"></div>
          ${cycle ? `<div style="font-size:11px;color:rgba(27,42,74,0.5);font-family:'Inter',sans-serif;">${cycle.name || cycle.title}</div>` : ''}
        </div>
        <div style="position:relative;z-index:1;">
          ${results.slice(0, 10).map((s,i) => `
            <div style="display:flex;align-items:center;gap:14px;padding:11px 18px;${i % 2 === 0 ? `background:rgba(201,169,110,0.05);border-radius:8px;` : ''}">
              <div style="width:28px;font-size:20px;text-align:center;">${medals[i] || ''}</div>
              ${!medals[i] ? `<div style="width:28px;height:28px;border-radius:50%;background:${theme.primary};display:flex;align-items:center;justify-content:center;color:${theme.accent};font-size:12px;font-weight:800;font-family:'Inter',sans-serif;">${i+1}</div>` : ''}
              ${avatar(s, 44)}
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:${theme.primary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;" title="${s.name}">${s.name}</div>
                <div style="font-size:10.5px;color:rgba(27,42,74,0.45);font-family:'Inter',sans-serif;">Roll ${s.roll_number || '—'}</div>
              </div>
              <div style="font-size:20px;font-weight:900;color:${theme.accent};">${parseFloat(s.percentage).toFixed(1)}%</div>
            </div>`).join('')}
        </div>
        <div style="text-align:center;margin-top:20px;padding-top:14px;border-top:1px solid rgba(201,169,110,0.3);font-size:9.5px;color:rgba(27,42,74,0.38);font-family:'Inter',sans-serif;position:relative;z-index:1;">
          Generated by Apex Tuition ERP · ${new Date().toLocaleDateString('en-IN')}
        </div>
      </div>`;
  }

  // Template 6: Social Card (Square)
  else if (template === '6') {
    bodyContent = `
      <div style="width:600px;height:600px;padding:28px;background:linear-gradient(135deg,${theme.primary},${theme.accent});box-sizing:border-box;position:relative;overflow:hidden;font-family:'Inter',sans-serif;">
        <div style="position:absolute;top:-50px;right:-50px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.08);pointer-events:none;"></div>
        <div style="text-align:center;margin-bottom:20px;position:relative;z-index:1;">
          <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-bottom:5px;">Top Performers</div>
          <div style="font-size:18px;font-weight:900;color:white;line-height:1.2;">${headline}</div>
        </div>
        <div style="display:flex;justify-content:center;align-items:flex-end;gap:18px;margin-bottom:18px;position:relative;z-index:1;">
          ${results.slice(0, 3).map((s,i) => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
              ${avatar(s, [56, 72, 48][i])}
              <div style="font-size:20px;">${medals[i]}</div>
              <div style="font-size:10.5px;font-weight:700;color:white;text-align:center;max-width:120px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
              <div style="font-size:14px;font-weight:900;color:rgba(255,255,200,0.95);">${parseFloat(s.percentage).toFixed(1)}%</div>
            </div>`).join('')}
        </div>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:7px;position:relative;z-index:1;">
          ${results.slice(3, 9).map((s,i) => `
            <div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:6px 12px;text-align:center;">
              <span style="font-size:10.5px;font-weight:800;color:rgba(255,255,200,0.9);">#${i+4}</span>
              <span style="font-size:10.5px;font-weight:600;color:white;margin:0 4px;display:inline-block;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</span>
              <span style="font-size:10.5px;color:rgba(255,255,200,0.8);">${parseFloat(s.percentage).toFixed(1)}%</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  const pageSize = isSquare ? '@page{size:190mm 190mm;margin:0;}' : isPortrait ? '@page{size:A4 portrait;margin:0;}' : '@page{size:A4 landscape;margin:0;}';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  ${pageSize}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter','Segoe UI',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
</style>
</head>
<body>${bodyContent}</body></html>`;
}

// ══════════════════════════════════════════════════
// ORIGINAL GET /api/promotions/generate-pdf — Legacy support
// ══════════════════════════════════════════════════
router.get('/generate-pdf', async (req, res) => {

  const { cycleId, filter, includeStats } = req.query;
  if (!cycleId) return res.status(400).send('cycleId is required');

  try {
    const cycle = db.prepare('SELECT * FROM test_cycles WHERE id = ?').get(cycleId);
    if (!cycle) return res.status(404).send('Test series not found');

    const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(cycle.standard_id);
    const profile = db.prepare('SELECT * FROM coaching_profile LIMIT 1').get();

    // Fetch tests in cycle
    const tests = db.prepare('SELECT id, subject_id, max_marks FROM tests WHERE cycle_id = ?').all(cycleId);
    if (tests.length === 0) return res.status(400).send('No tests in this series');

    const testIds = tests.map(t => t.id);
    const maxTotalMarks = tests.reduce((sum, t) => sum + t.max_marks, 0);

    // Fetch all students in this standard
    const students = db.prepare('SELECT id, name, photo_path FROM students WHERE standard_id = ?').all(cycle.standard_id);

    // Fetch all test marks for this cycle
    const marksList = db.prepare(`
      SELECT student_id, obtained_marks, is_absent
      FROM test_marks
      WHERE test_id IN (${testIds.join(',')})
    `).all();

    // Map marks by student_id
    const marksByStudent = {};
    marksList.forEach(m => {
      if (!marksByStudent[m.student_id]) {
        marksByStudent[m.student_id] = [];
      }
      marksByStudent[m.student_id].push(m);
    });

    let results = students.map(s => {
      const sMarks = marksByStudent[s.id] || [];
      let totalObtained = 0;
      let appeared = 0;
      sMarks.forEach(m => {
        if (!m.is_absent && m.obtained_marks !== null) {
          totalObtained += m.obtained_marks;
          appeared++;
        }
      });

      const pct = maxTotalMarks > 0 ? (totalObtained / maxTotalMarks) * 100 : 0;
      const grade = pct >= 91 ? 'A1' : pct >= 81 ? 'A2' : pct >= 71 ? 'B1' : pct >= 61 ? 'B2' : pct >= 51 ? 'C1' : pct >= 41 ? 'C2' : pct >= 33 ? 'D' : 'Fail';
      return {
        student: s,
        obtained: totalObtained,
        max: maxTotalMarks,
        pct,
        grade,
        appeared
      };
    });

    results.sort((a, b) => b.obtained - a.obtained);

    // Apply filter
    if (filter === 'A1') {
      results = results.filter(r => r.grade === 'A1');
    } else if (filter === 'all') {
      // keep all
    } else {
      const topN = parseInt(filter) || 3;
      results = results.slice(0, topN);
    }

    if (results.length === 0) {
      return res.status(400).send('No students matched the criteria. Make sure marks are entered.');
    }

    // Compute class statistics (always from full student list)
    const gradeMap = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0, Fail: 0 };
    let sumPct = 0;
    let passCount = 0;
    let validCount = 0;

    students.forEach(s => {
      const sMarks = marksByStudent[s.id] || [];
      let totalObtained = 0;
      sMarks.forEach(m => {
        if (!m.is_absent && m.obtained_marks !== null) {
          totalObtained += m.obtained_marks;
        }
      });
      const pct = maxTotalMarks > 0 ? (totalObtained / maxTotalMarks) * 100 : 0;
      const grade = pct >= 91 ? 'A1' : pct >= 81 ? 'A2' : pct >= 71 ? 'B1' : pct >= 61 ? 'B2' : pct >= 51 ? 'C1' : pct >= 41 ? 'C2' : pct >= 33 ? 'D' : 'Fail';
      
      gradeMap[grade] = (gradeMap[grade] || 0) + 1;
      sumPct += pct;
      if (pct >= 33) passCount++;
      validCount++;
    });

    const avgPct = validCount > 0 ? (sumPct / validCount).toFixed(1) : '0';
    const passPct = validCount > 0 ? ((passCount / validCount) * 100).toFixed(1) : '0';

    // Build logo
    let logoSrc = '';
    if (profile && profile.logo_path) {
      const lpath = path.join(__dirname, '../../', profile.logo_path);
      if (fs.existsSync(lpath)) {
        const ext = path.extname(lpath).replace('.', '');
        const base64 = fs.readFileSync(lpath, 'base64');
        logoSrc = `data:image/${ext};base64,${base64}`;
      }
    }

    // Build student photo sources
    results.forEach(r => {
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
        const initials = r.student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        // SVG fallback with initials
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%231B2A4A' /><stop offset='100%' stop-color='%233B82C4' /></linearGradient></defs><rect width='120' height='120' fill='url(%23g)' /><text x='50%' y='50%' dy='.3em' text-anchor='middle' fill='white' font-size='50' font-family='sans-serif'>${initials}</text></svg>`;
        photoSrc = `data:image/svg+xml;charset=UTF-8,${svg}`;
      }
      r.photoSrc = photoSrc;
    });

    // PDF config
    const templateId = req.query.theme || '1';
    const size = req.query.size || 'A4';
    const orientation = req.query.orientation || (templateId === '2' ? 'portrait' : 'landscape');
    const isLandscape = orientation === 'landscape';
    const showStats = req.query.includeStats !== '0';

    // Build the full HTML document
    const htmlDoc = buildPromoHTML({
      results,
      cycle,
      standard,
      profile,
      logoSrc,
      templateId,
      size,
      isLandscape,
      showStats,
      gradeMap,
      avgPct,
      passPct,
      validCount,
      maxTotalMarks,
    });

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlDoc, { waitUntil: 'networkidle0' });

      let pdfOptions = {
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      };

      if (size === 'auto') {
        // Measure the height of the page contents dynamically
        const bodyHeight = await page.evaluate(() => {
          return Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          );
        });
        pdfOptions.width = isLandscape ? '1200px' : '900px';
        pdfOptions.height = `${Math.ceil(bodyHeight) + 40}px`; // Add small padding
        pdfOptions.pageRanges = '1'; // only one page
      } else if (size === 'A3') {
        pdfOptions.format = 'A3';
        pdfOptions.landscape = isLandscape;
      } else if (size === 'A2') {
        pdfOptions.width = isLandscape ? '594mm' : '420mm';
        pdfOptions.height = isLandscape ? '420mm' : '594mm';
      } else {
        pdfOptions.format = 'A4';
        pdfOptions.landscape = isLandscape;
      }

      const pdfBuffer = await page.pdf(pdfOptions);
      await browser.close();

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');

      const coachingClean = (profile?.name || 'Coaching').replace(/[^a-zA-Z0-9]/g, '_');
      const stdClean = (standard?.display_name || '').replace(/[^a-zA-Z0-9]/g, '_');
      const cycleClean = cycle.title.replace(/[^a-zA-Z0-9]/g, '_');
      const downloadFilename = `${coachingClean}_${stdClean}_PromoBoard_${cycleClean}_${dateStr}_${timeStr}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (innerErr) {
      await browser.close();
      throw innerErr;
    }

  } catch (err) {
    console.error('Promo PDF Error:', err);
    res.status(500).send('Error generating PDF: ' + err.message);
  }
});

// ══════════════════════════════════════════════════
// HTML BUILDER — Unified Multi-Theme Document
// ══════════════════════════════════════════════════

function buildPromoHTML({ results, cycle, standard, profile, logoSrc, templateId, size, isLandscape, showStats, gradeMap, avgPct, passPct, validCount, maxTotalMarks }) {
  const medals = ['🥇', '🥈', '🥉'];
  const coachingName = profile?.name || 'Coaching Institute';

  // Stats page HTML
  const statsPageHTML = showStats ? `
    <div class="pdf-page" style="page-break-after: always;">
      <div class="page-header">
        ${logoSrc ? `<img src="${logoSrc}" class="logo">` : ''}
        <div class="coaching-name">${coachingName}</div>
        <div class="series-title">CLASS PERFORMANCE REPORT</div>
        <div class="subtitle">${cycle.title} · ${standard.display_name}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-num">${validCount}</div>
          <div class="stat-lbl">Total Students</div>
        </div>
        <div class="stat-box">
          <div class="stat-num">${avgPct}%</div>
          <div class="stat-lbl">Class Average</div>
        </div>
        <div class="stat-box" style="color:var(--success)">
          <div class="stat-num" style="color:var(--success-text, #2d7a55)">${passPct}%</div>
          <div class="stat-lbl">Pass Rate</div>
        </div>
        <div class="stat-box">
          <div class="stat-num">${maxTotalMarks}</div>
          <div class="stat-lbl">Max Marks</div>
        </div>
      </div>

      <div class="section-title">Grade Distribution</div>
      <div class="grade-grid">
        ${Object.entries(gradeMap).filter(([, c]) => c > 0).map(([g, c]) => `
          <div class="grade-box">
            <div class="grade-count">${c}</div>
            <div class="grade-name">${g}</div>
          </div>`).join('')}
      </div>

      ${results[0] ? `
      <div class="section-title" style="margin-top:32px">Top Scorer</div>
      <div class="top-scorer-box">
        <span style="font-size:2rem">🥇</span>
        <div>
          <div class="ts-name">${results[0].student.name}</div>
          <div class="ts-marks">${results[0].obtained} / ${maxTotalMarks} · ${results[0].pct.toFixed(1)}%</div>
        </div>
      </div>` : ''}
    </div>` : '';

  // Students HTML — properly paginated with page-break-inside: avoid
  let studentsHTML = '';

  if (templateId === '2') {
    // Table layout — each row has page-break-inside: avoid
    const rows = results.map((r, i) => {
      const medal = i < 3 ? medals[i] : `#${i + 1}`;
      return `
        <tr class="student-row">
          <td class="rank-cell">${medal}</td>
          <td class="photo-cell"><img src="${r.photoSrc}" class="student-thumbnail" /></td>
          <td class="name-cell">${r.student.name}</td>
          <td class="marks-cell">${r.obtained}<span class="marks-max"> / ${r.max}</span></td>
          <td><span class="pct-cell">${r.pct.toFixed(1)}%</span></td>
          <td class="grade-cell grade-${r.grade}">${r.grade}</td>
        </tr>`;
    }).join('');

    studentsHTML = `
      <div class="pdf-page">
        <div class="page-header">
          ${logoSrc ? `<img src="${logoSrc}" class="logo">` : ''}
          <div class="coaching-name">${coachingName}</div>
          <div class="series-title">ACHIEVEMENT BOARD</div>
          <div class="subtitle">TOP PERFORMERS — ${cycle.title} · ${standard.display_name}</div>
        </div>
        <div class="table-container">
          <table class="promo-table">
            <thead>
              <tr>
                <th>Rank</th><th>Photo</th><th>Student Name</th>
                <th>Marks</th><th>Percentage</th><th>Grade</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;

  } else {
    // Card grid layout
    const cardsPerPage = getCardsPerPage(size, isLandscape, templateId);

    for (let pageStart = 0; pageStart < results.length; pageStart += cardsPerPage) {
      const pageResults = results.slice(pageStart, pageStart + cardsPerPage);
      const isLastPage = pageStart + cardsPerPage >= results.length;
      const colCount = pageResults.length <= 3 ? pageResults.length : Math.min(Math.ceil(Math.sqrt(pageResults.length)), 5);

      const cards = pageResults.map((r, localIdx) => {
        const globalIdx = pageStart + localIdx;
        const medal = globalIdx < 3 ? medals[globalIdx] : `#${globalIdx + 1}`;
        return `
          <div class="student-card" style="page-break-inside: avoid;">
            <div class="rank-badge">${medal}</div>
            <img src="${r.photoSrc}" class="student-photo" />
            <div class="student-name">${r.student.name}</div>
            <div class="student-marks">${r.obtained}<span class="marks-max"> / ${r.max}</span></div>
            <div class="student-pct">${r.pct.toFixed(1)}%</div>
            <div class="student-grade grade-${r.grade}">${r.grade}</div>
          </div>`;
      }).join('');

      studentsHTML += `
        <div class="pdf-page" style="${!isLastPage ? 'page-break-after: always;' : ''}">
          <div class="page-header">
            ${logoSrc ? `<img src="${logoSrc}" class="logo">` : ''}
            <div class="coaching-name">${coachingName}</div>
            <div class="series-title">CONGRATULATIONS!</div>
            <div class="subtitle">TOP SCORERS — ${cycle.title} · ${standard.display_name}${results.length > cardsPerPage ? ` (${pageStart + 1}–${Math.min(pageStart + cardsPerPage, results.length)})` : ''}</div>
          </div>
          <div class="students-grid">
            ${cards}
          </div>
        </div>`;
    }
  }

  // Page dimension CSS
  let pageDim = '';
  if (size === 'auto') {
    pageDim = `body { min-width: ${isLandscape ? '1100px' : '800px'}; }`;
  } else if (size === 'A3') {
    pageDim = isLandscape
      ? `@page { size: A3 landscape; } body { width: 420mm; }`
      : `@page { size: A3 portrait; } body { width: 297mm; }`;
  } else if (size === 'A2') {
    pageDim = isLandscape
      ? `@page { size: 594mm 420mm; }`
      : `@page { size: 420mm 594mm; }`;
  } else {
    pageDim = isLandscape
      ? `@page { size: A4 landscape; }`
      : `@page { size: A4 portrait; }`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

    ${pageDim}

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ==========================================
       THEME DESIGN TOKENS (Ivory, Indigo, Neon)
       ========================================== */

    /* Theme 1: Premium Glass Ivory (Apple-Style) */
    body.theme-1 {
      --bg-color: #FAF6EC;
      --text-color: #1B2A4A;
      --card-bg: rgba(255,255,255,0.55);
      --card-border: 1px solid rgba(201,169,110,0.25);
      --badge-bg: rgba(201,169,110,0.12);
      --badge-border: 1px solid rgba(201,169,110,0.25);
      --badge-color: #9a7040;
      --border-color: rgba(201,169,110,0.25);
      --title-color: #1B2A4A;
      --subtitle-color: rgba(27,42,74,0.6);
      --coaching-color: #C9A96E;
      --photo-border: 3px solid rgba(201,169,110,0.40);
      --stat-bg: rgba(255,255,255,0.70);
      --stat-num-color: #1B2A4A;
      --top-scorer-bg: rgba(201,169,110,0.12);
      --top-scorer-border: 1.5px solid rgba(201,169,110,0.28);
      --table-header-bg: rgba(27,42,74,0.06);
      --decor-gradient: radial-gradient(ellipse 70% 60% at 20% 10%, rgba(201,169,110,0.18) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 70% at 80% 80%, rgba(59,130,196,0.15) 0%, transparent 60%);
      --success: #2d7a55;
    }

    /* Theme 2: Royal Gold & Indigo (Prestigious Academy) */
    body.theme-2 {
      --bg-color: #0F1C35;
      --text-color: #FDFAF4;
      --card-bg: rgba(27,42,74,0.6);
      --card-border: 1px solid rgba(201,169,110,0.35);
      --badge-bg: rgba(201,169,110,0.18);
      --badge-border: 1px solid rgba(201,169,110,0.35);
      --badge-color: #E2C98A;
      --border-color: rgba(201,169,110,0.4);
      --title-color: #FDFAF4;
      --subtitle-color: rgba(253,250,244,0.7);
      --coaching-color: #D4B27A;
      --photo-border: 3px solid rgba(201,169,110,0.50);
      --stat-bg: rgba(27,42,74,0.5);
      --stat-num-color: #FDFAF4;
      --top-scorer-bg: rgba(201,169,110,0.18);
      --top-scorer-border: 1.5px solid rgba(201,169,110,0.4);
      --table-header-bg: rgba(255,255,255,0.06);
      --decor-gradient: radial-gradient(ellipse 70% 60% at 20% 10%, rgba(201,169,110,0.22) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 70% at 80% 80%, rgba(27,42,74,0.4) 0%, transparent 60%);
      --success: #2ecc71;
      --success-text: #2ecc71;
    }

    /* Theme 3: Aurora Neon Glow (Modern & Cool) */
    body.theme-3 {
      --bg-color: #0B0F19;
      --text-color: #E2E8F0;
      --card-bg: rgba(17,24,39,0.7);
      --card-border: 1px solid rgba(59,130,246,0.35);
      --badge-bg: rgba(56,189,248,0.1);
      --badge-border: 1px solid rgba(56,189,248,0.3);
      --badge-color: #38BDF8;
      --border-color: rgba(59,130,246,0.3);
      --title-color: #FFFFFF;
      --subtitle-color: rgba(226,232,240,0.7);
      --coaching-color: #38BDF8;
      --photo-border: 3px solid rgba(59,130,246,0.40);
      --stat-bg: rgba(17,24,39,0.7);
      --stat-num-color: #38BDF8;
      --top-scorer-bg: rgba(236,72,153,0.1);
      --top-scorer-border: 1.5px solid rgba(236,72,153,0.3);
      --table-header-bg: rgba(17,24,39,0.5);
      --decor-gradient: radial-gradient(ellipse 70% 60% at 20% 10%, rgba(59,130,246,0.2) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 70% at 80% 80%, rgba(236,72,153,0.15) 0%, transparent 60%);
      --success: #10b981;
      --success-text: #10b981;
    }

    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      background: var(--bg-color);
      color: var(--text-color);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pdf-page {
      position: relative;
      padding: 36px 40px 32px;
      background: var(--bg-color);
      overflow: hidden;
      page-break-inside: avoid;
    }

    /* Decorative background */
    .pdf-page::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--decor-gradient);
      pointer-events: none;
    }

    /* Page borders */
    .pdf-page::after {
      content: '';
      position: absolute;
      top: 16px; left: 16px; right: 16px; bottom: 16px;
      border: 1.5px solid var(--border-color);
      border-radius: 16px;
      pointer-events: none;
    }

    .page-header {
      text-align: center;
      margin-bottom: 28px;
      position: relative;
      z-index: 1;
    }

    .logo { max-height: 60px; margin: 0 auto 8px; display: block; object-fit: contain; }

    .coaching-name {
      font-size: 14px; font-weight: 700; letter-spacing: 2px;
      color: var(--coaching-color); text-transform: uppercase; margin-bottom: 4px;
    }

    .series-title {
      font-size: 28px; font-weight: 900; color: var(--title-color);
      letter-spacing: -0.5px; margin-bottom: 4px;
    }

    /* Theme 3 title glow */
    body.theme-3 .series-title {
      text-shadow: 0 0 15px rgba(56,189,248,0.5);
    }

    .subtitle {
      font-size: 13px; font-weight: 600; color: var(--subtitle-color);
      letter-spacing: 0.5px; text-transform: uppercase;
    }

    /* ── Stats Page ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
      position: relative; z-index: 1;
    }

    .stat-box {
      background: var(--stat-bg);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 18px 14px;
      text-align: center;
      color: var(--text-color);
    }

    .stat-num {
      font-size: 2rem; font-weight: 900; color: var(--stat-num-color); line-height: 1;
    }

    body.theme-3 .stat-num {
      text-shadow: 0 0 10px rgba(56,189,248,0.4);
    }

    .stat-lbl {
      font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--subtitle-color); margin-top: 6px;
    }

    .section-title {
      font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.10em; color: var(--subtitle-color);
      margin-bottom: 12px; position: relative; z-index: 1;
      opacity: 0.8;
    }

    .grade-grid {
      display: flex; gap: 10px; flex-wrap: wrap;
      position: relative; z-index: 1;
    }

    .grade-box {
      background: rgba(255,255,255,0.65);
      border: 1.5px solid rgba(0,0,0,0.10);
      border-radius: 12px;
      padding: 12px 16px;
      text-align: center;
      min-width: 70px;
    }

    body.theme-2 .grade-box, body.theme-3 .grade-box {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
    }

    .grade-count { font-size: 1.5rem; font-weight: 900; }
    .grade-name  { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; }

    body.theme-1 .grade-count, body.theme-1 .grade-name { color: #1B2A4A; }
    body.theme-2 .grade-count, body.theme-3 .grade-count { color: #FFFFFF !important; }
    body.theme-2 .grade-name, body.theme-3 .grade-name { color: var(--subtitle-color) !important; }

    .top-scorer-box {
      display: flex; align-items: center; gap: 16px;
      background: var(--top-scorer-bg);
      border: var(--top-scorer-border);
      border-radius: 14px;
      padding: 16px 20px;
      position: relative; z-index: 1;
    }

    .ts-name  { font-size: 1.1rem; font-weight: 800; color: var(--text-color); }
    .ts-marks { font-size: 0.85rem; color: var(--subtitle-color); margin-top: 4px; }

    /* ── Card Grid ── */
    .students-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      justify-content: center;
      position: relative; z-index: 1;
    }

    .student-card {
      background: var(--card-bg);
      border: var(--card-border);
      border-radius: 16px;
      padding: 20px 14px 16px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
      position: relative;
      color: var(--text-color);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      width: 175px;
      box-sizing: border-box;
    }

    .rank-badge {
      font-size: 1.4rem;
      margin-bottom: 10px;
      display: block;
    }

    .student-photo {
      width: 80px; height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: var(--photo-border);
      margin: 0 auto 10px;
      display: block;
      background: #eee;
    }

    .student-name {
      font-size: 13px; font-weight: 800; color: var(--text-color);
      margin-bottom: 6px; line-height: 1.3;
      word-break: break-word;
    }

    .student-marks {
      font-size: 18px; font-weight: 900; color: var(--badge-color);
    }

    .marks-max { font-size: 11px; color: var(--subtitle-color); font-weight: 400; opacity: 0.8; }

    .student-pct {
      font-size: 11px; font-weight: 700;
      background: var(--badge-bg);
      border: var(--badge-border);
      border-radius: 99px;
      padding: 3px 10px;
      display: inline-block;
      margin-top: 6px;
      color: var(--badge-color);
    }

    .student-grade {
      font-size: 11px; font-weight: 800;
      margin-top: 5px; letter-spacing: 0.04em;
    }

    /* Theme-specific grade typography colors */
    body.theme-1 .grade-A1 { color: #2d7a55; }
    body.theme-1 .grade-A2 { color: #3D9970; }
    body.theme-1 .grade-B1 { color: #2563a8; }
    body.theme-1 .grade-B2 { color: #3B82C4; }
    body.theme-1 .grade-C1 { color: #9a7228; }
    body.theme-1 .grade-C2 { color: #b08c3a; }
    body.theme-1 .grade-D { color: #b03025; }
    body.theme-1 .grade-Fail { color: #8b2017; }

    body.theme-2 .grade-A1, body.theme-2 .grade-A2 { color: #2ecc71; }
    body.theme-2 .grade-B1, body.theme-2 .grade-B2 { color: #3498db; }
    body.theme-2 .grade-C1, body.theme-2 .grade-C2 { color: #f1c40f; }
    body.theme-2 .grade-D { color: #e67e22; }
    body.theme-2 .grade-Fail { color: #e74c3c; }

    body.theme-3 .grade-A1, body.theme-3 .grade-A2 { color: #00f2fe; text-shadow: 0 0 5px rgba(0,242,254,0.5); }
    body.theme-3 .grade-B1, body.theme-3 .grade-B2 { color: #4facfe; text-shadow: 0 0 5px rgba(79,172,254,0.5); }
    body.theme-3 .grade-C1, body.theme-3 .grade-C2 { color: #ffafbd; text-shadow: 0 0 5px rgba(255,175,189,0.5); }
    body.theme-3 .grade-D { color: #ffc3a0; text-shadow: 0 0 5px rgba(255,195,160,0.5); }
    body.theme-3 .grade-Fail { color: #ff007f; text-shadow: 0 0 8px rgba(255,0,127,0.7); }

    /* ── Table Layout ── */
    .table-container { width: 100%; margin-top: 8px; position: relative; z-index: 1; }

    .promo-table { width: 100%; border-collapse: collapse; }

    .promo-table thead tr {
      background: var(--table-header-bg);
      border-bottom: 2px solid var(--border-color);
    }

    .promo-table th {
      padding: 10px 14px; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--subtitle-color); text-align: left;
    }

    .promo-table th:first-child { text-align: center; }

    .student-row {
      border-bottom: 1px solid var(--border-color);
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .promo-table td { padding: 10px 14px; vertical-align: middle; }

    .rank-cell { text-align: center; font-size: 18px; font-weight: 900; }
    .photo-cell { width: 54px; }
    .student-thumbnail { width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--border-color); object-fit: cover; background: #eee; }
    .name-cell { font-weight: 700; font-size: 13px; color: var(--text-color); }
    .marks-cell { font-weight: 800; font-size: 14px; color: var(--badge-color); }
    .marks-max { font-size: 10px; color: var(--subtitle-color); font-weight: 400; opacity: 0.8; }
    .pct-cell { background: var(--badge-bg); border: var(--badge-border); border-radius: 99px; padding: 3px 10px; font-weight: 700; font-size: 11px; color: var(--badge-color); display: inline-block; }
    .grade-cell { font-weight: 800; font-size: 13px; }
  </style>
</head>
<body class="theme-${templateId}">
  ${statsPageHTML}
  ${studentsHTML}
</body>
</html>`;
}

// Calculate how many student cards fit per page based on size
function getCardsPerPage(size, isLandscape, templateId) {
  if (size === 'auto') return 999; // all on one page
  if (size === 'A2') return isLandscape ? 20 : 15;
  if (size === 'A3') return isLandscape ? 12 : 9;
  // A4
  return isLandscape ? 8 : 6;
}

module.exports = router;
