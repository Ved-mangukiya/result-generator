/* ═══════════════════════════════════════════════
   PROMOTIONS.JS — Top Scorers & Promotional Graphics
   ═══════════════════════════════════════════════ */

let _promoStandardId = null;
let _promoCycleId = null;
let _activePromoTemplate = '1'; // '1' = Navy Gold, '2' = Scoreboard Table, '3' = Ivory Navy Gold

async function renderPromotions(params = {}) {
  setPageTitle('Promotions & Top Scorers', 'Promotions');
  _promoStandardId = params.standardId || null;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Promotions</h1>
        <p>Generate beautiful "Top Scorers" graphics for a test series to share on WhatsApp or print.</p>
      </div>
    </div>

    <!-- Controls -->
    <div class="card mb-6">
      <div class="card-body">
        <div class="grid grid-5 gap-4">
          <div class="form-group">
            <label class="form-label">Select Class</label>
            <select class="form-control" id="promo-std-select" onchange="loadPromoCycles(this.value)">
              <option value="">— Select a class —</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Select Test Series</label>
            <select class="form-control" id="promo-cycle-select" disabled onchange="previewPromoTopScorers()">
              <option value="">— Select class first —</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Top Scorers Filter</label>
            <select class="form-control" id="promo-filter-select" onchange="previewPromoTopScorers()">
              <option value="3">Top 3 Students</option>
              <option value="5">Top 5 Students</option>
              <option value="10">Top 10 Students</option>
              <option value="A1">All 'A1' Grade (91%+)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Paper Size</label>
            <select class="form-control" id="promo-size-select" onchange="previewPromoTopScorers()">
              <option value="A4">A4 Size Poster</option>
              <option value="A5">A5 Flyer Size</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Orientation</label>
            <select class="form-control" id="promo-orientation-select" onchange="previewPromoTopScorers()">
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div id="promo-preview-container">
      <div class="empty-state" style="height:350px">
        <div class="empty-state-icon">${Icons?.render?.('pdf',{size:32}) || '📄'}</div>
        <h3>Select a Test Series</h3>
        <p>Choose a class and a test series above to generate promotional graphics.</p>
      </div>
    </div>
  `;

  await loadPromoStandardDropdown();
  if (_promoStandardId) {
    document.getElementById('promo-std-select').value = _promoStandardId;
    await loadPromoCycles(_promoStandardId);
  }
}

async function loadPromoStandardDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('promo-std-select');
    for (const board of boards) {
      const standards = await API.boards.getStandards(board.id);
      if (standards.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = board.short_name;
        standards.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.display_name;
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadPromoCycles(standardId) {
  const cycSel = document.getElementById('promo-cycle-select');
  if (!standardId) {
    cycSel.innerHTML = '<option value="">— Select class first —</option>';
    cycSel.disabled = true;
    return;
  }
  
  _promoStandardId = parseInt(standardId);
  try {
    const cycles = await API.testCycles.list(_promoStandardId);
    if (cycles.length === 0) {
      cycSel.innerHTML = '<option value="">— No test series found —</option>';
      cycSel.disabled = true;
    } else {
      cycSel.innerHTML = '<option value="">— Select Test Series —</option>' + 
        cycles.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
      cycSel.disabled = false;
    }
  } catch (err) {
    Toast.error('Load Failed', err.message);
  }
}

async function previewPromoTopScorers() {
  const cycleId = document.getElementById('promo-cycle-select').value;
  const filter = document.getElementById('promo-filter-select').value;
  const size = document.getElementById('promo-size-select').value;
  const orientation = document.getElementById('promo-orientation-select').value;
  const container = document.getElementById('promo-preview-container');
  
  if (!cycleId) {
    container.innerHTML = `
      <div class="empty-state" style="height:350px">
        <div class="empty-state-icon">${Icons?.render?.('pdf',{size:32}) || '📄'}</div>
        <h3>Select a Test Series</h3>
      </div>`;
    return;
  }

  _promoCycleId = parseInt(cycleId);
  container.innerHTML = `<div class="empty-state"><div class="animate-pulse" style="font-size:2rem">${Icons?.render?.('tests',{size:32}) || '📊'}</div><p>Calculating Top Scorers & Generating Preview...</p></div>`;

  try {
    const cycleRes = await fetch(`/api/test-cycles/${cycleId}/results`);
    if (!cycleRes.ok) throw new Error('Failed to fetch test series results');
    const data = await cycleRes.json();
    
    let students = [...data.students];
    students.sort((a, b) => (b.pct || 0) - (a.pct || 0));
    
    if (filter === 'A1') {
      students = students.filter(s => s.pct >= 91);
    } else {
      const topN = parseInt(filter) || 3;
      students = students.slice(0, topN);
    }

    if (students.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="height:350px">
          <div class="empty-state-icon">⚠️</div>
          <h3>No Top Performers Found</h3>
          <p>No student scores matched the selected filter (perhaps marks have not been fully entered yet).</p>
        </div>`;
      return;
    }

    let previewHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    const scaleFactor = size === 'A5' ? 'scale(0.8)' : 'scale(1)';

    if (_activePromoTemplate === '2') {
      // 📋 Achievement Board (Table format)
      const rowsHTML = students.map((s, idx) => {
        const rank = idx < 3 ? medals[idx] : `#${idx + 1}`;
        const pctVal = s.pct ? parseFloat(s.pct).toFixed(1) + '%' : '—';
        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 10px; font-weight:900; text-align:center; font-size:1.1rem; color:#d4af37">${rank}</td>
            <td style="padding: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #d4af37; background: #2a2a2a; display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:0.75rem; font-weight:700">
                ${s.photo_path ? `<img src="/${s.photo_path}" style="width:100%; height:100%; object-fit:cover;">` : s.name[0].toUpperCase()}
              </div>
            </td>
            <td style="padding: 10px; font-weight:600;">${s.name}</td>
            <td style="padding: 10px; font-weight:700; color:#d4af37">${s.total} <span style="font-size:0.8rem; color:#9ca3af">/ ${s.maxTotal}</span></td>
            <td style="padding: 10px;"><span style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-size:0.8rem; font-weight:700">${pctVal}</span></td>
          </tr>
        `;
      }).join('');

      previewHTML = `
        <div class="promo-preview-board ${orientation}" style="width: 100%; max-width: ${orientation === 'landscape' ? '580px' : '440px'}; margin: 0 auto; aspect-ratio: ${orientation === 'landscape' ? '1.414 / 1' : '1 / 1.414'}; background: linear-gradient(135deg, #0b0f19 0%, #111827 100%); border: 2px solid #d4af37; border-radius: 12px; padding: 25px 15px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; box-shadow: 0 15px 35px rgba(0,0,0,0.5); position:relative; overflow:hidden; transform: ${scaleFactor}; transform-origin: center center;">
          <div style="position:absolute; top:8px; left:8px; right:8px; bottom:8px; border:1px solid rgba(212,175,55,0.3); border-radius:8px; pointer-events:none"></div>
          <div style="text-align: center; margin-bottom: 20px; width: 100%; z-index:2">
            <div style="font-size: 0.8rem; font-weight: 800; color: #d4af37; letter-spacing: 2px; text-transform: uppercase; margin-bottom:4px">TOP PERFORMERS</div>
            <div style="font-size: 1.5rem; font-weight: 900; color: white; letter-spacing: 1px; margin-bottom:6px">ACHIEVEMENT BOARD</div>
            <div style="font-size: 0.75rem; font-weight: 700; color: #9ca3af; text-transform: uppercase">${data.cycle.title}</div>
          </div>
          <div style="width: 100%; overflow-y: auto; flex:1; z-index:2">
            <table style="width: 100%; border-collapse: collapse; color: white; font-size:0.8rem">
              <thead>
                <tr style="border-bottom: 1.5px solid #d4af37; background: rgba(212,175,55,0.1); color:#d4af37; font-weight:700">
                  <th style="padding: 8px; text-align:center">Rank</th>
                  <th style="padding: 8px; text-align:left">Photo</th>
                  <th style="padding: 8px; text-align:left">Name</th>
                  <th style="padding: 8px; text-align:left">Marks</th>
                  <th style="padding: 8px; text-align:left">Pct</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (_activePromoTemplate === '3') {
      // 👑 Ivory Navy Gold (Premium Light Theme)
      const cardsHTML = students.map((s, idx) => {
        const rank = idx < 3 ? medals[idx] : `#${idx + 1}`;
        const pctVal = s.pct ? parseFloat(s.pct).toFixed(1) + '%' : '—';
        return `
          <div style="background: white; border: 2px solid #1b2a4a; border-top: 6px solid #d4af37; border-radius: 12px; padding: 15px 10px; width: 110px; text-align: center; position: relative; box-shadow: 0 8px 20px rgba(27,42,74,0.06); box-sizing: border-box">
            <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #1b2a4a; color: #faf8f5; font-weight: 900; font-size: 0.8rem; padding: 1px 8px; border-radius: 10px; border: 1.5px solid #d4af37">${rank}</div>
            <div style="width: 50px; height: 50px; border-radius: 50%; border: 2.5px solid #d4af37; margin: 10px auto 8px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#faf8f5; font-size:1.15rem; font-weight:700; color:#1b2a4a">
              ${s.photo_path ? `<img src="/${s.photo_path}" style="width:100%; height:100%; object-fit:cover;">` : s.name[0].toUpperCase()}
            </div>
            <div style="font-size: 0.75rem; font-weight: 800; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color:#1b2a4a" title="${s.name}">${s.name}</div>
            <div style="font-size: 0.95rem; font-weight: 900; color: #d4af37;">${s.total}</div>
            <div style="font-size: 0.65rem; color: #64748b; margin-top:-2px">/ ${s.maxTotal}</div>
            <div style="font-size: 0.68rem; font-weight: 700; background: rgba(27,42,74,0.05); color:#1b2a4a; padding: 1px 6px; border-radius: 6px; margin-top: 5px; display:inline-block; border: 1px solid rgba(27,42,74,0.1)">${pctVal}</div>
          </div>
        `;
      }).join('');

      previewHTML = `
        <div class="promo-preview-board ${orientation}" style="width: 100%; max-width: ${orientation === 'landscape' ? '580px' : '440px'}; margin: 0 auto; aspect-ratio: ${orientation === 'landscape' ? '1.414 / 1' : '1 / 1.414'}; background: #faf8f5; border: 3px double #d4af37; border-radius: 12px; padding: 25px 15px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 15px 35px rgba(27,42,74,0.1); position:relative; overflow:hidden; transform: ${scaleFactor}; transform-origin: center center;">
          <div style="position: absolute; width: 150%; height: 150%; top: -25%; left: -25%; background: radial-gradient(circle at center, rgba(212,175,55,0.06) 0%, transparent 60%); pointer-events: none"></div>
          <div style="text-align: center; margin-bottom: 20px; z-index:2">
            <div style="font-size: 0.75rem; font-weight: 800; color: #1b2a4a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 3px; border-bottom: 1.5px solid #d4af37; display:inline-block; padding-bottom:2px">Academic Excellence</div>
            <div style="font-size: 1.7rem; font-weight: 900; color: #1b2a4a; letter-spacing: 1px; margin-top: 4px; margin-bottom: 4px; font-family:'Playfair Display', serif">TOP SCORERS</div>
            <div style="font-size: 0.8rem; font-weight: 700; color: #d4af37; text-transform: uppercase; letter-spacing:0.05em">${data.cycle.title}</div>
          </div>
          <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; z-index:2; width: 100%;">
            ${cardsHTML}
          </div>
        </div>
      `;
    } else {
      // 🥇 Certificate Style (Dark Navy)
      const cardsHTML = students.map((s, idx) => {
        const rank = idx < 3 ? medals[idx] : `#${idx + 1}`;
        const pctVal = s.pct ? parseFloat(s.pct).toFixed(1) + '%' : '—';
        return `
          <div style="background: rgba(255,255,255,0.04); border: 1.5px solid rgba(212, 175, 55, 0.25); border-radius: 12px; padding: 15px 10px; width: 110px; text-align: center; position: relative; backdrop-filter: blur(5px); box-shadow: 0 8px 20px rgba(0,0,0,0.3)">
            <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #d4af37; color: #111; font-weight: 900; font-size: 0.8rem; padding: 1px 8px; border-radius: 10px;">${rank}</div>
            <div style="width: 50px; height: 50px; border-radius: 50%; border: 2.5px solid #d4af37; margin: 10px auto 8px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#2a2a2a; font-size:1.1rem; font-weight:700">
              ${s.photo_path ? `<img src="/${s.photo_path}" style="width:100%; height:100%; object-fit:cover;">` : s.name[0].toUpperCase()}
            </div>
            <div style="font-size: 0.75rem; font-weight: 800; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color:#f3f4f6" title="${s.name}">${s.name}</div>
            <div style="font-size: 0.95rem; font-weight: 900; color: #d4af37;">${s.total}</div>
            <div style="font-size: 0.65rem; color: #9ca3af; margin-top:-2px">/ ${s.maxTotal}</div>
            <div style="font-size: 0.7rem; font-weight: 700; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 6px; margin-top: 5px; display:inline-block">${pctVal}</div>
          </div>
        `;
      }).join('');

      previewHTML = `
        <div class="promo-preview-board ${orientation}" style="width: 100%; max-width: ${orientation === 'landscape' ? '580px' : '440px'}; margin: 0 auto; aspect-ratio: ${orientation === 'landscape' ? '1.414 / 1' : '1 / 1.414'}; background: linear-gradient(135deg, #111827 0%, #1f2937 100%); border: 2px solid rgba(212, 175, 55, 0.4); border-radius: 12px; padding: 25px 15px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 15px 35px rgba(0,0,0,0.5); position:relative; overflow:hidden; transform: ${scaleFactor}; transform-origin: center center;">
          <div style="position: absolute; width: 150%; height: 150%; top: -25%; left: -25%; background: radial-gradient(circle at center, rgba(212,175,55,0.08) 0%, transparent 60%); pointer-events: none"></div>
          <div style="text-align: center; margin-bottom: 20px; z-index:2">
            <div style="font-size: 0.8rem; font-weight: 800; color: #d4af37; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 3px">CONGRATULATIONS</div>
            <div style="font-size: 1.8rem; font-weight: 900; color: white; letter-spacing: 1px; margin-bottom: 4px; text-shadow: 0 4px 10px rgba(0,0,0,0.4)">TOP SCORERS</div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #9ca3af">${data.cycle.title}</div>
          </div>
          <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; z-index:2; width: 100%;">
            ${cardsHTML}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="grid grid-3-9 gap-6">
        <!-- Controls Column -->
        <div style="display:flex; flex-direction:column; gap:16px">
          <div class="card" style="border:1px solid var(--border)">
            <div class="card-header" style="background:var(--bg-elevated); padding: 12px 16px">
              <h3 style="font-size:0.9rem">🎨 Theme / Style Selector</h3>
            </div>
            <div class="card-body" style="padding:16px; display:flex; flex-direction:column; gap:12px">
              
              <!-- Theme Option 1 -->
              <div class="promo-template-card ${_activePromoTemplate === '1' ? 'selected' : ''}" 
                   onclick="selectPromoTemplate('1')" 
                   style="border:2px solid ${_activePromoTemplate === '1' ? 'var(--accent)' : 'var(--border)'}; border-radius:var(--radius); padding:12px; cursor:pointer; background:${_activePromoTemplate === '1' ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-surface)'}; transition:all 0.2s ease">
                <div style="font-weight:700; margin-bottom:4px; font-size:0.85rem; display:flex; align-items:center; gap:6px; color: ${_activePromoTemplate === '1' ? 'var(--accent)' : 'var(--text-primary)'}">
                  <span>🥇</span> Certificate Style (Dark Navy)
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted)">Showcases top students side-by-side inside card boxes on a sleek dark canvas.</div>
              </div>
              
              <!-- Theme Option 2 -->
              <div class="promo-template-card ${_activePromoTemplate === '2' ? 'selected' : ''}" 
                   onclick="selectPromoTemplate('2')" 
                   style="border:2px solid ${_activePromoTemplate === '2' ? 'var(--accent)' : 'var(--border)'}; border-radius:var(--radius); padding:12px; cursor:pointer; background:${_activePromoTemplate === '2' ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-surface)'}; transition:all 0.2s ease">
                <div style="font-weight:700; margin-bottom:4px; font-size:0.85rem; display:flex; align-items:center; gap:6px; color: ${_activePromoTemplate === '2' ? 'var(--accent)' : 'var(--text-primary)'}">
                  <span>📋</span> Achievement Board (Slate Table)
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted)">Displays rankings inside an elegant tabulated scoreboard, suited for longer rank lists.</div>
              </div>

              <!-- Theme Option 3 -->
              <div class="promo-template-card ${_activePromoTemplate === '3' ? 'selected' : ''}" 
                   onclick="selectPromoTemplate('3')" 
                   style="border:2px solid ${_activePromoTemplate === '3' ? 'var(--accent)' : 'var(--border)'}; border-radius:var(--radius); padding:12px; cursor:pointer; background:${_activePromoTemplate === '3' ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-surface)'}; transition:all 0.2s ease">
                <div style="font-weight:700; margin-bottom:4px; font-size:0.85rem; display:flex; align-items:center; gap:6px; color: ${_activePromoTemplate === '3' ? 'var(--accent)' : 'var(--text-primary)'}">
                  <span>✨</span> Premium Ivory Gold (Light Theme)
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted)">A high-end white-ivory textured background with gold-foil frames and royal navy lettering.</div>
              </div>
              
            </div>
          </div>
          
          <button class="btn btn-primary w-full" onclick="generatePromoPDF()" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; font-weight:700">
            ${Icons?.render?.('pdf',{size:16}) || '📄'} Download Poster PDF
          </button>
          
          <div class="alert alert-info" style="padding:10px; font-size:0.72rem; line-height:1.4">
            ℹ️ Pro-tip: Open this PDF poster inside your browser or IDM cleanly. To share on WhatsApp status, convert or take a quick screenshot!
          </div>
        </div>
        
        <!-- Live Preview Column -->
        <div style="display:flex; flex-direction:column; gap:10px; align-items:center">
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); align-self:flex-start">
            👁 Live Poster Preview (${size} - ${orientation})
          </p>
          <div style="width:100%; border:1px solid var(--border); border-radius:var(--radius); padding:20px; background:${_activePromoTemplate === '3' ? '#f4f2ee' : '#0b0f19'}; display:flex; align-items:center; justify-content:center; min-height:480px">
            ${previewHTML}
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `<div class="empty-state">⚠️ Error: ${err.message}</div>`;
  }
}

function selectPromoTemplate(templateId) {
  _activePromoTemplate = templateId;
  previewPromoTopScorers();
}

function generatePromoPDF() {
  if (!_promoCycleId) return;
  const filter = document.getElementById('promo-filter-select').value;
  const size = document.getElementById('promo-size-select').value;
  const orientation = document.getElementById('promo-orientation-select').value;
  
  API.export.downloadToken().then(res => {
    const token = res.token;
    window.open(`/api/promotions/generate-pdf?cycleId=${_promoCycleId}&filter=${filter}&theme=${_activePromoTemplate}&size=${size}&orientation=${orientation}&token=${token}`, '_blank');
  }).catch(() => {
    window.open(`/api/promotions/generate-pdf?cycleId=${_promoCycleId}&filter=${filter}&theme=${_activePromoTemplate}&size=${size}&orientation=${orientation}`, '_blank');
  });
}

window.renderPromotions = renderPromotions;
window.selectPromoTemplate = selectPromoTemplate;
window.generatePromoPDF = generatePromoPDF;
window.previewPromoTopScorers = previewPromoTopScorers;
