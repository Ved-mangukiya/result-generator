/* ═══════════════════════════════════════════════
   PROMOTIONS.JS — Complete Rewrite
   6 Premium Templates · Live Preview · Sidebar Layout
   Color Themes · Photo Support · Custom Headline
   ═══════════════════════════════════════════════ */

let _promoStandardId     = null;
let _promoCycles         = [];
let _promoSelectedCycleId = null;
let _promoFilter         = '3';
let _promoTemplate       = '1';
let _promoOrientation    = 'landscape';
let _promoColorTheme     = 'navy-gold';
let _promoHeadline       = '';
let _promoIncludePhotos  = true;
let _promoIncludeLogo    = true;
let _promoIncludeStats   = true;
let _promoCurrentData    = null;    // { students, cycle, standard }

/* ─── Template Definitions ───────────────────────── */
const PROMO_TEMPLATES = [
  {
    id: '1', name: 'Classic Gold',
    desc: 'Elegant cream background with gold accents and serif headlines',
    orientation: 'landscape', icon: '✦',
    gradient: 'linear-gradient(135deg,#1B2A4A,#C9A96E)',
  },
  {
    id: '2', name: 'Dark Elite',
    desc: 'Dark navy background with glowing gold name plates',
    orientation: 'landscape', icon: '◈',
    gradient: 'linear-gradient(135deg,#0F1C35,#1B2A4A)',
  },
  {
    id: '3', name: 'Podium 3D',
    desc: 'Three-tier podium display with rank badges',
    orientation: 'landscape', icon: '▲',
    gradient: 'linear-gradient(135deg,#2d3561,#c05c7e)',
  },
  {
    id: '4', name: 'Magazine Style',
    desc: 'Editorial typography with bold layout',
    orientation: 'portrait', icon: '◉',
    gradient: 'linear-gradient(135deg,#f5f7fa,#e0e5ec)',
  },
  {
    id: '5', name: 'Certificate',
    desc: 'Formal certificate design great for printing',
    orientation: 'portrait', icon: '◎',
    gradient: 'linear-gradient(135deg,#FDFAF4,#F5EDD8)',
  },
  {
    id: '6', name: 'Social Card',
    desc: 'Square format for WhatsApp & social media sharing',
    orientation: 'square', icon: '▣',
    gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
  },
];

/* ─── Color Theme Definitions ────────────────────── */
const PROMO_COLOR_THEMES = [
  { id: 'navy-gold',   name: 'Navy & Gold',    primary: '#1B2A4A', accent: '#C9A96E', bg: '#FDFAF4' },
  { id: 'dark-teal',   name: 'Dark Teal',      primary: '#0F2027', accent: '#2EB8A0', bg: '#0F2027' },
  { id: 'maroon-gold', name: 'Maroon & Gold',  primary: '#7C1D1D', accent: '#D4AF37', bg: '#FFF8F0' },
  { id: 'royal-blue',  name: 'Royal Blue',     primary: '#1a237e', accent: '#42a5f5', bg: '#F5F8FF' },
  { id: 'forest',      name: 'Forest Green',   primary: '#0f4c2e', accent: '#4CAF50', bg: '#F1F8F2' },
  { id: 'violet',      name: 'Deep Violet',    primary: '#4A1A6B', accent: '#CE93D8', bg: '#F9F0FF' },
];

/* ═══════════════════════════════════════════════
   MAIN PAGE RENDER
   ═══════════════════════════════════════════════ */

async function renderPromotions(params = {}) {
  setPageTitle('Promotions', 'Promotions');

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Promotions &amp; Awards</h1>
        <p>Design beautiful top-scorer posters with live preview and one-click PDF download</p>
      </div>
    </div>

    <!-- Main Layout: Sidebar Controls + Preview -->
    <div style="display:grid; grid-template-columns:340px 1fr; gap:24px; align-items:start;">

      <!-- ══ LEFT SIDEBAR CONTROLS ══ -->
      <div style="display:flex; flex-direction:column; gap:16px;">

        <!-- Step 1: Class & Cycle -->
        <div class="card" style="animation:fadeInUp 0.3s ease both;">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="font-size:0.9rem;">
              ${Icons?.render?.('boards',{size:15}) || ''} Class &amp; Test Series
            </h3>
          </div>
          <div class="card-body" style="padding:14px 18px; display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
              <label class="form-label">Class</label>
              <select class="form-control" id="promo-std-select" onchange="loadPromoCycles(this.value)">
                <option value="">— Pick a class —</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Test Series</label>
              <select class="form-control" id="promo-cycle-select" onchange="onPromoCycleChange(this.value)" disabled>
                <option value="">— Select class first —</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Show Top</label>
              <select class="form-control" id="promo-filter" onchange="_promoFilter=this.value; refreshPromoPreview()">
                <option value="3">Top 3 Students</option>
                <option value="5">Top 5 Students</option>
                <option value="10">Top 10 Students</option>
                <option value="15">Top 15 Students</option>
                <option value="20">Top 20 Students</option>
                <option value="all">All Students</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 2: Template Selection -->
        <div class="card" style="animation:fadeInUp 0.4s ease both;">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="font-size:0.9rem;">${Icons?.render?.('templates',{size:15}) || ''} Template</h3>
          </div>
          <div class="card-body" style="padding:12px 14px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              ${PROMO_TEMPLATES.map(t => `
                <div class="promo-tmpl-card ${_promoTemplate === t.id ? 'selected' : ''}"
                     onclick="selectPromoTemplate('${t.id}')" id="tmpl-card-${t.id}"
                     style="border-radius:10px; border:1.5px solid ${_promoTemplate === t.id ? 'var(--gold)' : 'var(--border)'};
                            padding:10px; cursor:pointer; transition:all 0.2s ease; background:rgba(255,255,255,0.6);">
                  <div style="height:36px; border-radius:6px; background:${t.gradient}; margin-bottom:7px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.9); font-size:15px;">${t.icon}</div>
                  <div style="font-size:11.5px; font-weight:700; color:var(--navy);">${t.name}</div>
                  <div style="font-size:10px; color:var(--text-muted); line-height:1.3; margin-top:2px;">${t.orientation}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Step 3: Color Theme -->
        <div class="card" style="animation:fadeInUp 0.45s ease both;">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="font-size:0.9rem;">${Icons?.render?.('chart',{size:15}) || ''} Color Theme</h3>
          </div>
          <div class="card-body" style="padding:12px 18px;">
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${PROMO_COLOR_THEMES.map(ct => `
                <div onclick="selectPromoColorTheme('${ct.id}')" id="ct-${ct.id}"
                     title="${ct.name}"
                     style="width:32px; height:32px; border-radius:8px;
                            background:linear-gradient(135deg,${ct.primary},${ct.accent});
                            cursor:pointer; border:${_promoColorTheme === ct.id ? '3px solid var(--navy)' : '2px solid transparent'};
                            box-shadow:${_promoColorTheme === ct.id ? '0 0 0 2px rgba(255,255,255,0.7),0 0 10px rgba(27,42,74,0.2)' : 'none'};
                            transition:all 0.2s ease;"></div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Step 4: Content Options -->
        <div class="card" style="animation:fadeInUp 0.5s ease both;">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="font-size:0.9rem;">Content Options</h3>
          </div>
          <div class="card-body" style="padding:12px 18px; display:flex; flex-direction:column; gap:10px;">
            <div class="form-group">
              <label class="form-label">Custom Headline</label>
              <input type="text" class="form-control" id="promo-headline"
                     placeholder="e.g. Congratulations Class 10!"
                     value="${_promoHeadline}"
                     oninput="_promoHeadline=this.value; refreshPromoPreview()">
            </div>
            <label class="toggle-group" style="padding:6px 0; cursor:pointer;">
              <span class="toggle">
                <input type="checkbox" id="promo-include-photos" ${_promoIncludePhotos ? 'checked' : ''}
                       onchange="_promoIncludePhotos=this.checked; refreshPromoPreview()">
                <span class="toggle-slider"></span>
              </span>
              <span class="toggle-label" style="font-size:13px;">Include Student Photos</span>
            </label>
            <label class="toggle-group" style="padding:6px 0; cursor:pointer;">
              <span class="toggle">
                <input type="checkbox" id="promo-include-logo" ${_promoIncludeLogo ? 'checked' : ''}
                       onchange="_promoIncludeLogo=this.checked; refreshPromoPreview()">
                <span class="toggle-slider"></span>
              </span>
              <span class="toggle-label" style="font-size:13px;">Include Coaching Logo</span>
            </label>
            <label class="toggle-group" style="padding:6px 0; cursor:pointer;">
              <span class="toggle">
                <input type="checkbox" id="promo-include-stats" ${_promoIncludeStats ? 'checked' : ''}
                       onchange="_promoIncludeStats=this.checked; refreshPromoPreview()">
                <span class="toggle-slider"></span>
              </span>
              <span class="toggle-label" style="font-size:13px;">Include Class Stats Bar</span>
            </label>
          </div>
        </div>

        <!-- Download Actions -->
        <div id="promo-download-area" style="display:none; animation:fadeInUp 0.55s ease both;">
          <button class="btn btn-primary w-full btn-lg" onclick="downloadPromoPDF()" style="margin-bottom:10px;">
            ${Icons?.render?.('download',{size:16}) || ''} Download Poster PDF
          </button>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="copyPromoText()" style="font-size:12px;">
              ${Icons?.render?.('copy',{size:13}) || ''} Copy WhatsApp Text
            </button>
            <button class="btn btn-outline btn-sm" onclick="refreshPromoPreview()" style="font-size:12px;">
              ${Icons?.render?.('refresh',{size:13}) || ''} Refresh Preview
            </button>
          </div>
        </div>

      </div><!-- /LEFT SIDEBAR -->

      <!-- ══ RIGHT PREVIEW PANEL ══ -->
      <div>
        <div class="card" style="animation:fadeInUp 0.35s ease both;">
          <div class="card-header">
            <h3>${Icons?.render?.('eye',{size:18}) || ''} Live Preview</h3>
            <div style="display:flex; gap:8px; align-items:center;">
              <span class="badge badge-gold" id="promo-template-badge">Template ${_promoTemplate}</span>
              <span class="badge badge-gray" id="promo-preview-count"></span>
            </div>
          </div>
          <div class="card-body" style="padding:0;">
            <div id="promo-preview-container"
                 style="min-height:500px; background:#111; border-radius:0 0 var(--radius-2xl) var(--radius-2xl);
                        display:flex; align-items:center; justify-content:center; overflow:auto; padding:24px;">
              <div class="empty-state" style="color:rgba(255,255,255,0.5);">
                <div style="margin-bottom:12px; opacity:0.4;">
                  ${Icons?.render?.('templates',{size:48}) || ''}
                </div>
                <h3 style="color:rgba(255,255,255,0.6); font-size:1rem;">Select a class and test series to preview your poster</h3>
                <p style="color:rgba(255,255,255,0.35); font-size:0.85rem;">Choose options in the sidebar to generate a live preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /grid -->
  `;

  // Load classes dropdown
  await loadPromoStandardsDropdown();
}

/* ─── Standards Dropdown ──────────────────────────── */
async function loadPromoStandardsDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('promo-std-select');
    if (!sel) return;
    for (const board of boards) {
      const standards = await API.boards.getStandards(board.id);
      if (standards.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = board.name + ' · ' + board.short_name;
        standards.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.display_name;
          if (_promoStandardId && s.id == _promoStandardId) opt.selected = true;
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      }
    }
    if (_promoStandardId) {
      await loadPromoCycles(_promoStandardId);
    }
  } catch (err) {
    console.error('Failed to load standards:', err);
  }
}

/* ─── Load Test Cycles for Selected Class ─────────── */
async function loadPromoCycles(standardId) {
  _promoStandardId = standardId ? parseInt(standardId) : null;
  const sel = document.getElementById('promo-cycle-select');
  if (!sel) return;

  if (!standardId) {
    sel.innerHTML = '<option value="">— Select class first —</option>';
    sel.disabled = true;
    return;
  }

  sel.innerHTML = '<option value="">Loading…</option>';
  sel.disabled = true;

  try {
    const [cycles, tests] = await Promise.all([
      API.testCycles.list(standardId),
      API.tests.list(standardId)
    ]);
    _promoCycles = cycles;
    const standaloneTests = tests.filter(t => !t.cycle_id);

    sel.innerHTML = '<option value="">— Select test or series —</option>';

    if (cycles.length === 0 && standaloneTests.length === 0) {
      sel.innerHTML = '<option value="">No tests or cycles found for this class</option>';
      return;
    }

    if (cycles.length > 0) {
      const grpCycles = document.createElement('optgroup');
      grpCycles.label = 'Grouped Test Cycles';
      cycles.forEach(c => {
        const opt = document.createElement('option');
        opt.value = `cycle_${c.id}`;
        opt.textContent = `${c.title || c.name || 'Unnamed Series'} (${c.total_tests || 0} tests)`;
        grpCycles.appendChild(opt);
      });
      sel.appendChild(grpCycles);
    }
    
    if (standaloneTests.length > 0) {
      const grpTests = document.createElement('optgroup');
      grpTests.label = 'Individual Standalone Tests';
      standaloneTests.forEach(t => {
        const opt = document.createElement('option');
        opt.value = `test_${t.id}`;
        opt.textContent = `${t.name} (${t.subject_name || 'Test'})`;
        grpTests.appendChild(opt);
      });
      sel.appendChild(grpTests);
    }

    sel.disabled = false;

    if (_promoSelectedCycleId) {
      sel.value = _promoSelectedCycleId;
      await onPromoCycleChange(_promoSelectedCycleId);
    }
  } catch (err) {
    sel.innerHTML = '<option value="">Error loading test series</option>';
    Toast.error('Load Failed', err.message);
  }
}

/* ─── Cycle Selected ──────────────────────────────── */
async function onPromoCycleChange(cycleId) {
  _promoSelectedCycleId = cycleId || null;
  if (!_promoSelectedCycleId || !_promoStandardId) return;
  await refreshPromoPreview();
}

/* ─── Template Selection ──────────────────────────── */
function selectPromoTemplate(templateId) {
  _promoTemplate = templateId;
  document.querySelectorAll('.promo-tmpl-card').forEach(card => {
    const isSelected = card.id === `tmpl-card-${templateId}`;
    card.style.borderColor = isSelected ? 'var(--gold)' : 'var(--border)';
    card.style.boxShadow = isSelected ? '0 0 0 2px rgba(201,169,110,0.25)' : 'none';
    card.style.background = isSelected ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.6)';
  });
  const badge = document.getElementById('promo-template-badge');
  if (badge) {
    const tmpl = PROMO_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) badge.textContent = tmpl.name;
  }
  refreshPromoPreview();
}

/* ─── Color Theme Selection ───────────────────────── */
function selectPromoColorTheme(themeId) {
  _promoColorTheme = themeId;
  PROMO_COLOR_THEMES.forEach(ct => {
    const el = document.getElementById(`ct-${ct.id}`);
    if (!el) return;
    el.style.border = ct.id === themeId ? '3px solid var(--navy)' : '2px solid transparent';
    el.style.boxShadow = ct.id === themeId ? '0 0 0 2px rgba(255,255,255,0.7),0 0 10px rgba(27,42,74,0.2)' : 'none';
  });
  refreshPromoPreview();
}

/* ─── Refresh Live Preview ────────────────────────── */
async function refreshPromoPreview() {
  const container = document.getElementById('promo-preview-container');
  if (!container) return;

  if (!_promoStandardId || !_promoSelectedCycleId) {
    container.innerHTML = `
      <div class="empty-state" style="color:rgba(255,255,255,0.5);">
        <div style="margin-bottom:12px; opacity:0.4;">${Icons?.render?.('templates',{size:48}) || ''}</div>
        <h3 style="color:rgba(255,255,255,0.6); font-size:1rem;">Select a class and test series</h3>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="color:rgba(255,255,255,0.6); display:flex; flex-direction:column; align-items:center; gap:12px;">
      <div class="spinner spinner-lg" style="border-color:rgba(255,255,255,0.2); border-top-color:rgba(201,169,110,0.8);"></div>
      <p style="font-size:13px;">Generating preview…</p>
    </div>`;

  try {
    const [studentsRaw, standard] = await Promise.all([
      API.promotions.getData(_promoStandardId, _promoSelectedCycleId),
      API.standards?.get?.(_promoStandardId).catch(() => null),
    ]);

    let students = (studentsRaw?.students || studentsRaw || []).slice();

    // Sort by percentage descending
    students.sort((a, b) => (parseFloat(b.percentage) || 0) - (parseFloat(a.percentage) || 0));

    // Filter
    const n = parseInt(_promoFilter);
    if (!isNaN(n) && _promoFilter !== 'all') students = students.slice(0, n);

    _promoCurrentData = { students, standard, cycle: studentsRaw.cycle };

    // Count badge
    const countBadge = document.getElementById('promo-preview-count');
    if (countBadge) countBadge.textContent = `${students.length} students`;

    // Show download area
    const dlArea = document.getElementById('promo-download-area');
    if (dlArea) dlArea.style.display = 'block';

    // Build preview HTML
    const previewHtml = buildPromoPreviewHTML(students, _promoCurrentData.standard, _promoCurrentData.cycle);
    container.innerHTML = previewHtml;

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="color:rgba(255,255,255,0.5);">
        <div style="margin-bottom:12px; opacity:0.5;">${Icons?.render?.('warning',{size:36}) || ''}</div>
        <h3 style="color:rgba(255,255,255,0.5);">Preview Error</h3>
        <p style="color:rgba(255,255,255,0.35); font-size:0.85rem;">${err.message}</p>
      </div>`;
    console.error('Promo preview error:', err);
  }
}

/* ─── Build Preview HTML (client-side render) ─────── */
function buildPromoPreviewHTML(students, standard, cycle) {
  const theme = PROMO_COLOR_THEMES.find(ct => ct.id === _promoColorTheme) || PROMO_COLOR_THEMES[0];
  const tmpl  = PROMO_TEMPLATES.find(t => t.id === _promoTemplate) || PROMO_TEMPLATES[0];
  const headline = _promoHeadline || `Top Scorers — ${standard?.display_name || 'Class'} — ${cycle?.title || cycle?.name || 'Test Series'}`;
  
  const isLandscape = tmpl.orientation === 'landscape';
  const isSquare    = tmpl.orientation === 'square';
  const width  = isSquare ? '520px' : isLandscape ? '780px' : '520px';
  const height = isSquare ? '520px' : isLandscape ? '550px' : '740px';

  // Photo or avatar for each student
  function studentAvatar(s, size = 60) {
    if (_promoIncludePhotos && s.photo_path) {
      return `<img src="/${getPhotoThumbPath ? getPhotoThumbPath(s.photo_path) : s.photo_path}" 
                   alt="${s.name}" 
                   style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; border:2.5px solid ${theme.accent};">`;
    }
    return `<div style="width:${size}px; height:${size}px; border-radius:50%; 
                         background:linear-gradient(135deg,${theme.primary},${theme.accent}); 
                         display:flex; align-items:center; justify-content:center; 
                         color:white; font-size:${size * 0.35}px; font-weight:800; border:2.5px solid ${theme.accent};">
              ${(s.name || '?')[0].toUpperCase()}
            </div>`;
  }

  // Rank badge
  function rankBadge(rank) {
    const medals = ['🥇','🥈','🥉'];
    const medal = medals[rank - 1];
    if (medal) return `<span style="font-size:20px;">${medal}</span>`;
    return `<div style="width:28px;height:28px;border-radius:50%;background:${theme.primary};color:${theme.accent};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">${rank}</div>`;
  }

  // Template 1: Classic Gold — Card Grid Landscape
  if (_promoTemplate === '1') {
    return `<div style="
        width:${width}; min-height:${height};
        background:${theme.bg === '#FDFAF4' ? 'linear-gradient(145deg,#FDFAF4,#F5EDD8)' : theme.bg};
        font-family:'Inter',sans-serif;
        border-radius:16px; padding:28px;
        position:relative; overflow:hidden;
        box-shadow:0 24px 64px rgba(0,0,0,0.35);">
      <!-- Gold border frame -->
      <div style="position:absolute;inset:8px;border:1.5px solid rgba(201,169,110,0.4);border-radius:12px;pointer-events:none;"></div>
      <!-- Corner ornaments -->
      <div style="position:absolute;top:14px;left:14px;width:20px;height:20px;border-top:2px solid ${theme.accent};border-left:2px solid ${theme.accent};border-radius:3px 0 0 0;"></div>
      <div style="position:absolute;top:14px;right:14px;width:20px;height:20px;border-top:2px solid ${theme.accent};border-right:2px solid ${theme.accent};border-radius:0 3px 0 0;"></div>
      <div style="position:absolute;bottom:14px;left:14px;width:20px;height:20px;border-bottom:2px solid ${theme.accent};border-left:2px solid ${theme.accent};border-radius:0 0 0 3px;"></div>
      <div style="position:absolute;bottom:14px;right:14px;width:20px;height:20px;border-bottom:2px solid ${theme.accent};border-right:2px solid ${theme.accent};border-radius:0 0 3px 0;"></div>
      <!-- Headline -->
      <div style="text-align:center; margin-bottom:22px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${theme.accent};margin-bottom:5px;">
          ${standard?.coaching_name || 'EduTrack ERP'}
        </div>
        <div style="font-family:'Playfair Display',serif;font-size:clamp(18px,2vw,24px);font-weight:900;color:${theme.primary};letter-spacing:-0.5px;">
          ${headline}
        </div>
        ${cycle ? `<div style="font-size:10.5px;color:rgba(27,42,74,0.5);margin-top:3px;">${cycle.title || cycle.name || ''}</div>` : ''}
      </div>
      <!-- Student Cards -->
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
        ${students.slice(0, 10).map((s, i) => `
          <div style="
              background:rgba(255,255,255,0.75); backdrop-filter:blur(12px);
              border:1px solid rgba(201,169,110,0.30); border-radius:12px;
              padding:14px; width:130px; text-align:center;
              box-shadow:0 4px 16px rgba(27,42,74,0.08);">
            <div style="display:flex;justify-content:center;margin-bottom:8px;">${studentAvatar(s, 52)}</div>
            ${rankBadge(i + 1)}
            <div style="font-size:11.5px;font-weight:700;color:${theme.primary};margin-top:5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
            <div style="font-size:10px;color:rgba(27,42,74,0.5);margin-top:2px;">Roll ${s.roll_number || '—'}</div>
            <div style="font-size:14px;font-weight:800;color:${theme.accent};margin-top:5px;">${parseFloat(s.percentage || 0).toFixed(1)}%</div>
          </div>`).join('')}
      </div>
      ${_promoIncludeStats && students.length > 0 ? `
        <div style="margin-top:18px;text-align:center;font-size:10px;color:rgba(27,42,74,0.4);padding-top:12px;border-top:1px solid rgba(201,169,110,0.2);">
          Class Avg: ${(students.reduce((s,st) => s + parseFloat(st.percentage||0), 0) / students.length).toFixed(1)}% 
          · Top Scorer: ${students[0]?.name || '—'} (${parseFloat(students[0]?.percentage||0).toFixed(1)}%)
          · Participants: ${students.length}
        </div>` : ''}
    </div>`;
  }

  // Template 2: Dark Elite
  if (_promoTemplate === '2') {
    return `<div style="
        width:${width}; min-height:${height};
        background:linear-gradient(145deg,#0A1628,#1B2A4A);
        font-family:'Inter',sans-serif;
        border-radius:16px; padding:28px;
        position:relative; overflow:hidden;
        box-shadow:0 24px 64px rgba(0,0,0,0.55);">
      <!-- Teal glow -->
      <div style="position:absolute;top:-80px;right:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(201,169,110,0.12) 0%,transparent 70%);pointer-events:none;"></div>
      <div style="position:absolute;bottom:-60px;left:-60px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(27,42,74,0.5) 0%,transparent 70%);pointer-events:none;"></div>
      <!-- Stars -->
      ${[...Array(20)].map((_, i) => `<div style="position:absolute;width:${1+Math.random()}px;height:${1+Math.random()}px;border-radius:50%;background:white;opacity:${0.2+Math.random()*0.4};top:${Math.random()*100}%;left:${Math.random()*100}%;"></div>`).join('')}
      <!-- Header -->
      <div style="text-align:center;margin-bottom:22px;">
        <div style="font-size:9.5px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${theme.accent};margin-bottom:6px;opacity:0.8;">Excellence · Achievement · Pride</div>
        <div style="font-family:'Playfair Display',serif;font-size:clamp(17px,2.2vw,22px);font-weight:900;color:white;letter-spacing:-0.3px;">
          ${headline}
        </div>
        <div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,${theme.accent},transparent);margin:8px auto;"></div>
      </div>
      <!-- Students -->
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
        ${students.slice(0, 10).map((s, i) => `
          <div style="
              background:rgba(255,255,255,0.05); border:1px solid rgba(201,169,110,0.25);
              border-radius:12px; padding:12px 14px; width:125px; text-align:center;
              position:relative;">
            ${i < 3 ? `<div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:18px;">${['🥇','🥈','🥉'][i]}</div>` : `<div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:${theme.accent};color:${theme.primary};width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">${i+1}</div>`}
            <div style="margin-top:8px;display:flex;justify-content:center;">${studentAvatar(s, 44)}</div>
            <div style="font-size:11px;font-weight:700;color:white;margin-top:6px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
            <div style="font-size:13px;font-weight:900;color:${theme.accent};margin-top:4px;">${parseFloat(s.percentage||0).toFixed(1)}%</div>
          </div>`).join('')}
      </div>
      ${_promoIncludeStats ? `
        <div style="margin-top:16px;padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.06);text-align:center;">
          <span style="font-size:10px;color:rgba(255,255,255,0.4);">Class Average: <strong style="color:${theme.accent}">${(students.reduce((s,st)=>s+parseFloat(st.percentage||0),0)/Math.max(students.length,1)).toFixed(1)}%</strong>
          · Top: <strong style="color:white">${students[0]?.name || '—'}</strong>
          · ${students.length} Participants</span>
        </div>` : ''}
    </div>`;
  }

  // Template 3: Podium 3D
  if (_promoTemplate === '3') {
    const top3 = students.slice(0, 3);
    const rest  = students.slice(3, 10);
    return `<div style="
        width:${width}; min-height:${height};
        background:linear-gradient(145deg,#1a1a2e,#16213e,#0f3460);
        font-family:'Inter',sans-serif;
        border-radius:16px; padding:24px;
        box-shadow:0 24px 64px rgba(0,0,0,0.55);">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-family:'Playfair Display',serif;font-size:clamp(16px,2vw,21px);font-weight:900;color:white;">${headline}</div>
      </div>
      <!-- Podium -->
      <div style="display:flex;justify-content:center;align-items:flex-end;gap:16px;margin-bottom:20px;height:180px;">
        ${[top3[1], top3[0], top3[2]].map((s, pos) => {
          const heights = ['120px','160px','90px'];
          const medals  = ['🥈','🥇','🥉'];
          const heights2 = ['48px','64px','40px'];
          const ranks  = [2,1,3];
          if (!s) return '<div style="width:140px;"></div>';
          return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
              ${studentAvatar(s, parseInt(heights2[pos]))}
              <div style="font-size:10.5px;font-weight:700;color:white;text-align:center;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
              <div style="font-size:13px;font-weight:900;color:#FFD700;">${parseFloat(s.percentage||0).toFixed(1)}%</div>
              <div style="width:120px;height:${heights[pos]};
                          background:linear-gradient(180deg,rgba(255,215,0,0.25),rgba(255,215,0,0.05));
                          border:1px solid rgba(255,215,0,0.3); border-radius:8px 8px 0 0;
                          display:flex;align-items:center;justify-content:center;
                          font-size:28px;">${medals[pos]}<br><span style="font-size:12px;color:rgba(255,255,255,0.7);">#${ranks[pos]}</span></div>
            </div>`;
        }).join('')}
      </div>
      <!-- Other ranks -->
      ${rest.length > 0 ? `
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">
          ${rest.map((s, i) => `
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;font-weight:700;color:rgba(255,215,0,0.7);">#${i + 4}</span>
              ${studentAvatar(s, 28)}
              <div>
                <div style="font-size:10.5px;font-weight:700;color:white;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
                <div style="font-size:10px;color:rgba(255,215,0,0.7);">${parseFloat(s.percentage||0).toFixed(1)}%</div>
              </div>
            </div>`).join('')}
        </div>` : ''}
    </div>`;
  }

  // Template 4: Magazine Style (Portrait)
  if (_promoTemplate === '4') {
    return `<div style="
        width:${width}; min-height:${height};
        background:white; font-family:'Inter',sans-serif;
        border-radius:16px; overflow:hidden;
        box-shadow:0 24px 64px rgba(0,0,0,0.3);">
      <!-- Magazine header bar -->
      <div style="background:${theme.primary};padding:18px 24px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:9px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${theme.accent};margin-bottom:3px;">Special Edition</div>
          <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:white;">${headline}</div>
        </div>
        <div style="text-align:right;font-size:10px;color:rgba(255,255,255,0.5);">
          ${cycle?.title || cycle?.name || ''}<br>${new Date().toLocaleDateString('en-IN', {month:'long',year:'numeric'})}
        </div>
      </div>
      <!-- Hero student -->
      ${students[0] ? `
        <div style="background:linear-gradient(135deg,${theme.bg || '#FDFAF4'},white);padding:20px 24px;display:flex;gap:18px;align-items:center;border-bottom:1px solid rgba(27,42,74,0.08);">
          <div style="flex-shrink:0;">${studentAvatar(students[0], 80)}</div>
          <div>
            <div style="font-size:9.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${theme.accent};">Champion · Rank #1</div>
            <div style="font-size:22px;font-weight:900;color:${theme.primary};margin:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px;" title="${students[0].name}">${students[0].name}</div>
            <div style="font-size:13px;color:rgba(27,42,74,0.55);">Roll ${students[0].roll_number || '—'}</div>
            <div style="font-size:28px;font-weight:900;color:${theme.accent};margin-top:4px;">${parseFloat(students[0].percentage||0).toFixed(1)}%</div>
          </div>
        </div>` : ''}
      <!-- Other students in list -->
      <div style="padding:14px 24px;">
        ${students.slice(1, 10).map((s, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:8px 0;${i < students.slice(1,10).length-1 ? 'border-bottom:1px solid rgba(27,42,74,0.06);' : ''}">
            <div style="width:24px;height:24px;border-radius:50%;background:${theme.primary};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:${theme.accent};flex-shrink:0;">${i+2}</div>
            ${studentAvatar(s, 32)}
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;font-weight:700;color:${theme.primary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
              <div style="font-size:10px;color:rgba(27,42,74,0.45);">Roll ${s.roll_number || '—'}</div>
            </div>
            <div style="font-size:13px;font-weight:800;color:${theme.accent};">${parseFloat(s.percentage||0).toFixed(1)}%</div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  // Template 5: Certificate Style (Portrait)
  if (_promoTemplate === '5') {
    return `<div style="
        width:${width}; min-height:${height};
        background:${theme.bg || '#FDFAF4'};
        font-family:'Playfair Display',serif;
        border-radius:16px; padding:28px; position:relative;
        box-shadow:0 24px 64px rgba(0,0,0,0.3);">
      <!-- Double border -->
      <div style="position:absolute;inset:12px;border:2px solid ${theme.accent};border-radius:10px;pointer-events:none;opacity:0.6;"></div>
      <div style="position:absolute;inset:16px;border:1px solid ${theme.accent};border-radius:8px;pointer-events:none;opacity:0.3;"></div>
      <!-- Watermark -->
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0.04;font-size:100px;color:${theme.primary};font-weight:900;">✦</div>
      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${theme.accent};font-family:'Inter',sans-serif;margin-bottom:8px;">Certificate of Academic Achievement</div>
        <div style="font-size:22px;font-weight:900;color:${theme.primary};">${headline}</div>
        <div style="width:80px;height:1.5px;background:${theme.accent};margin:10px auto;"></div>
        ${cycle ? `<div style="font-size:11px;color:rgba(27,42,74,0.5);font-family:'Inter',sans-serif;">${cycle.title || cycle.name || ''}</div>` : ''}
      </div>
      <!-- Students list -->
      ${students.slice(0, 8).map((s, i) => `
        <div style="display:flex;align-items:center;gap:14px;padding:10px 16px;${i % 2 === 0 ? 'background:rgba(201,169,110,0.05);border-radius:8px;' : ''}">
          <div style="width:28px;font-size:18px;text-align:center;">${['🥇','🥈','🥉'][i] || `<span style="font-family:'Inter',sans-serif;font-size:12px;font-weight:700;color:${theme.accent};">#${i+1}</span>`}</div>
          ${studentAvatar(s, 40)}
          <div style="flex:1;">
            <div style="font-size:13.5px;font-weight:700;color:${theme.primary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;" title="${s.name}">${s.name}</div>
            <div style="font-size:10.5px;color:rgba(27,42,74,0.45);font-family:'Inter',sans-serif;margin-top:1px;">Roll ${s.roll_number || '—'}</div>
          </div>
          <div style="font-size:18px;font-weight:900;color:${theme.accent};">${parseFloat(s.percentage||0).toFixed(1)}%</div>
        </div>`).join('')}
      <!-- Footer seal -->
      <div style="text-align:center;margin-top:18px;padding-top:14px;border-top:1px solid rgba(201,169,110,0.3);">
        <div style="font-size:9.5px;color:rgba(27,42,74,0.38);font-family:'Inter',sans-serif;letter-spacing:1px;">Generated by EduTrack ERP · ${new Date().toLocaleDateString('en-IN')}</div>
      </div>
    </div>`;
  }

  // Template 6: Social Card (Square)
  if (_promoTemplate === '6') {
    const ctPrimary = theme.primary || '#667eea';
    const ctAccent  = theme.accent  || '#764ba2';
    return `<div style="
        width:${width}; height:${height};
        background:linear-gradient(135deg,${ctPrimary},${ctAccent});
        font-family:'Inter',sans-serif;
        border-radius:20px; padding:24px;
        position:relative; overflow:hidden;
        box-shadow:0 24px 64px rgba(0,0,0,0.5);">
      <!-- Background shapes -->
      <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.08);pointer-events:none;"></div>
      <div style="position:absolute;bottom:-50px;left:-50px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.05);pointer-events:none;"></div>
      <!-- Header -->
      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:4px;">Top Performers</div>
        <div style="font-size:17px;font-weight:900;color:white;line-height:1.2;">${headline}</div>
      </div>
      <!-- Podium row -->
      <div style="display:flex;justify-content:center;align-items:flex-end;gap:14px;margin-bottom:16px;">
        ${students.slice(0, 3).map((s, i) => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
            ${studentAvatar(s, [52,64,48][i])}
            <div style="font-size:16px;">${['🥈','🥇','🥉'][i]}</div>
            <div style="font-size:10px;font-weight:700;color:white;text-align:center;max-width:100px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
            <div style="font-size:14px;font-weight:900;color:rgba(255,255,200,0.9);">${parseFloat(s.percentage||0).toFixed(1)}%</div>
          </div>`).join('')}
      </div>
      <!-- Rest in row -->
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;">
        ${students.slice(3, 8).map((s, i) => `
          <div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:5px 10px;text-align:center;">
            <span style="font-size:10px;font-weight:800;color:rgba(255,255,200,0.9);">#${i+4}</span>
            <span style="font-size:10px;font-weight:600;color:white;margin:0 4px;display:inline-block;max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</span>
            <span style="font-size:10px;color:rgba(255,255,200,0.8);">${parseFloat(s.percentage||0).toFixed(1)}%</span>
          </div>`).join('')}
      </div>
      <div style="text-align:center;margin-top:14px;font-size:9px;color:rgba(255,255,255,0.4);">EduTrack ERP · ${new Date().toLocaleDateString('en-IN')}</div>
    </div>`;
  }

  return `<div style="color:white;padding:40px;text-align:center;">Template ${_promoTemplate} preview loading…</div>`;
}

/* ─── Download PDF / Print Poster ───────────────────── */
async function downloadPromoPDF() {
  if (!_promoStandardId || !_promoSelectedCycleId) {
    Toast.warning('Not Ready', 'Please select a class and test series first.');
    return;
  }

  Spinner.show('Generating poster PDF… Please wait.');

  try {
    const payload = {
      standard_id:    _promoStandardId,
      cycle_id:       _promoSelectedCycleId,
      template:       _promoTemplate,
      color_theme:    _promoColorTheme,
      filter:         _promoFilter,
      headline:       _promoHeadline,
      include_photos: _promoIncludePhotos,
      include_logo:   _promoIncludeLogo,
      include_stats:  _promoIncludeStats,
    };

    const res = await fetch('/api/promotions/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      const tmpl = PROMO_TEMPLATES.find(t => t.id === _promoTemplate);
      a.download = `Promo_${tmpl?.name || _promoTemplate}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Spinner.hide();
      Toast.success('PDF Downloaded', `${tmpl?.name || 'Poster'} PDF is ready!`);
      return;
    }
  } catch (err) {
    console.warn('Backend Puppeteer PDF export fallback triggered:', err);
  }

  // Fallback: Direct Print Window with High-Res Poster HTML
  try {
    const container = document.getElementById('promo-preview-container');
    if (!container || !container.firstElementChild) throw new Error('Preview container empty');
    
    const posterHtml = container.innerHTML;
    const printWin = window.open('', '_blank');
    if (!printWin) throw new Error('Popup blocked');

    printWin.document.write(`
      <!DOCTYPE html><html>
      <head>
        <title>Promotions Poster — EduTrack ERP</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
        <style>
          @page { size: auto; margin: 0; }
          body { margin: 0; padding: 20px; background: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Inter', sans-serif; }
          @media print {
            body { padding: 0; background: transparent; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:20px; text-align:center;">
          <button onclick="window.print()" style="padding:12px 30px; background:#C9A96E; color:#1B2A4A; border:none; border-radius:8px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 4px 14px rgba(201,169,110,0.4);">
            🖨️ Print / Save Poster PDF
          </button>
        </div>
        ${posterHtml}
      </body>
      </html>
    `);
    printWin.document.close();
    Spinner.hide();
    Toast.success('Print Ready', 'Opening printable poster view.');
  } catch (err) {
    Spinner.hide();
    Toast.error('PDF Failed', err.message);
  }
}

/* ─── Copy WhatsApp Text ──────────────────────────── */
async function copyPromoText() {
  if (!_promoCurrentData) {
    Toast.warning('No Data', 'Please generate a preview first.');
    return;
  }
  const { students, standard, cycle } = _promoCurrentData;
  const lines = [
    `🏆 *${_promoHeadline || `Top Scorers — ${standard?.display_name}`}*`,
    `📚 ${cycle?.name || 'Test Series'}`,
    '',
    ...students.slice(0, 5).map((s, i) => `${['🥇','🥈','🥉','4️⃣','5️⃣'][i] || `${i+1}.`} ${s.name} — ${parseFloat(s.percentage||0).toFixed(1)}%`),
    '',
    `_Generated by EduTrack ERP_`,
  ];
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    Toast.success('Copied!', 'WhatsApp-ready text copied to clipboard.');
  } catch {
    Toast.info('Text Ready', lines.join('\n'));
  }
}

/* ─── Expose ──────────────────────────────────────── */
window.renderPromotions        = renderPromotions;
window.loadPromoCycles         = loadPromoCycles;
window.onPromoCycleChange      = onPromoCycleChange;
window.selectPromoTemplate     = selectPromoTemplate;
window.selectPromoColorTheme   = selectPromoColorTheme;
window.refreshPromoPreview     = refreshPromoPreview;
window.downloadPromoPDF        = downloadPromoPDF;
window.copyPromoText           = copyPromoText;
