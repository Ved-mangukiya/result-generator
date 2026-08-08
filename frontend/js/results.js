/* ═══════════════════════════════════════════════
   RESULTS.JS — Result Generation, Preview & Compare
   ═══════════════════════════════════════════════ */

let _resultsStandardId = null;
let _resultsBatchId = null;
let _resultsFinalData = null;
let _resultsTestCycles = [];
let _resultsStandaloneTests = [];
let _activeBoxType = 'cycle'; // default to 'cycle' or 'test'
let _activeBoxId = null;
let _expandedStudents = new Set();
let _chartInstances = {}; // track Chart.js instances to destroy on re-render

// Colours for student comparison (up to 5 students)
const COMPARE_COLORS = [
  { fill: 'rgba(59,130,246,0.18)', stroke: '#3b82f6',  solid: '#3b82f6'  },
  { fill: 'rgba(239,68,68,0.18)',  stroke: '#ef4444',  solid: '#ef4444'  },
  { fill: 'rgba(16,185,129,0.18)', stroke: '#10b981',  solid: '#10b981'  },
  { fill: 'rgba(245,158,11,0.18)', stroke: '#f59e0b',  solid: '#f59e0b'  },
  { fill: 'rgba(139,92,246,0.18)', stroke: '#8b5cf6',  solid: '#8b5cf6'  },
];

/* ═══════════════════════════════════════════════
   PAGE RENDER
   ═══════════════════════════════════════════════ */

async function renderResults(params = {}) {
  setPageTitle('Results', 'Results');
  _resultsStandardId = params.standardId || null;

  // Inject inline styles for editable cells
  if (!document.getElementById('results-inline-styles')) {
    const style = document.createElement('style');
    style.id = 'results-inline-styles';
    style.textContent = `
      .pointer-edit-cell {
        cursor: pointer;
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        transition: all 0.2s ease;
        display: inline-block;
        min-width: 32px;
        text-align: center;
      }
      .pointer-edit-cell:hover {
        background: var(--border);
        box-shadow: 0 0 0 1px var(--border-medium);
      }
    `;
    document.head.appendChild(style);
  }

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Results Panel</h1>
        <p>View computed results, compare test series, and export PDFs</p>
      </div>
    </div>

    <!-- Class Selector + Action Bar -->
    <div class="card mb-6">
      <div class="card-body" style="padding:var(--space-5)">
        <div class="flex gap-4 flex-wrap items-center">
          <div class="form-group" style="flex:1;min-width:200px">
            <label class="form-label">Select Class</label>
            <select class="form-control" id="results-std-select" onchange="onResultsStandardChange(this.value)">
              <option value="">— Select a class to view results —</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;min-width:200px;display:none" id="results-batch-filter-wrap">
            <label class="form-label">Select Batch</label>
            <select class="form-control" id="results-batch-select" onchange="onResultsBatchChange(this.value)">
              <option value="">— All Batches —</option>
            </select>
          </div>
          <div id="results-actions" class="flex gap-2 flex-wrap" style="margin-top:20px;display:none">
            <button class="btn btn-outline btn-sm" onclick="showResultSettings()">${Icons?.render?.('settings',{size:14}) || ''} Card Settings</button>
            <button class="btn btn-outline btn-sm" id="btn-compare-series" onclick="openCompareSeriesModal()" style="display:none">${Icons?.render?.('compare',{size:14}) || ''} Compare Series</button>
            <button class="btn btn-outline btn-sm" id="btn-compare-students" onclick="openCompareStudentsModal()">${Icons?.render?.('students',{size:14}) || ''} Compare Students</button>
            <button class="btn btn-outline btn-sm" onclick="showPerformanceInsights()">${Icons?.render?.('chart',{size:14}) || ''} Performance Insights</button>
            <button class="btn btn-outline btn-sm" onclick="downloadClassExcel()">${Icons?.render?.('excel',{size:14}) || ''} Export Excel</button>
            <button class="btn btn-primary btn-sm" onclick="downloadBulkPDF()">${Icons?.render?.('pdf',{size:14}) || ''} Bulk PDF</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Container -->
    <div id="results-container">
      <div class="empty-state" style="height:400px">
        <div class="empty-state-icon">${Icons?.render?.('results',{size:48}) || ''}</div>
        <h3>Select a Class</h3>
        <p>Choose a class from the dropdown above to see results and export options.</p>
      </div>
    </div>`;

  await loadResultsStandardDropdown();
  const sel = document.getElementById('results-std-select');
  if (sel) {
    if (_resultsStandardId && [...sel.options].some(o => o.value == _resultsStandardId)) {
      sel.value = _resultsStandardId;
      await onResultsStandardChange(_resultsStandardId);
    } else if (sel.options.length > 1) {
      sel.selectedIndex = 1;
      await onResultsStandardChange(sel.value);
    }
  }
}

async function loadResultsStandardDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('results-std-select');
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
  } catch { }
}

async function onResultsStandardChange(standardId) {
  _resultsStandardId = standardId ? parseInt(standardId) : null;
  _resultsBatchId = null; // reset batch selection
  
  const batchWrap = document.getElementById('results-batch-filter-wrap');
  const batchSelect = document.getElementById('results-batch-select');
  if (batchWrap && batchSelect) {
    if (_resultsStandardId) {
      try {
        const batches = await API.batches.list(_resultsStandardId);
        if (batches.length > 0) {
          batchSelect.innerHTML = '<option value="">— All Batches —</option>' + batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
          batchWrap.style.display = 'block';
        } else {
          batchWrap.style.display = 'none';
          batchSelect.value = '';
        }
      } catch (e) {
        batchWrap.style.display = 'none';
        batchSelect.value = '';
      }
    } else {
      batchWrap.style.display = 'none';
      batchSelect.value = '';
    }
  }
  
  await loadResultsForClass(_resultsStandardId);
}

async function onResultsBatchChange(batchId) {
  _resultsBatchId = batchId ? parseInt(batchId) : null;
  await loadResultsForClass(_resultsStandardId);
}

async function loadResultsForClass(standardId) {
  if (!standardId) return;
  _resultsStandardId = parseInt(standardId);
  _expandedStudents.clear();

  const container = document.getElementById('results-container');
  container.innerHTML = `<div class="empty-state"><div class="animate-pulse" style="font-size:2rem">${Icons?.render?.('chart',{size:32}) || ''}</div><p class="text-muted text-sm mt-2">Loading exam cycles and tests...</p></div>`;

  try {
    const actionsEl = document.getElementById('results-actions');
    actionsEl.style.display = 'flex';

    const [finalData, testCycles, tests] = await Promise.all([
      API.export.results(standardId, _resultsBatchId),
      API.testCycles.list(standardId),
      API.tests.list(standardId, _resultsBatchId)
    ]);

    _resultsFinalData = finalData;
    _resultsTestCycles = testCycles;
    _resultsStandaloneTests = tests.filter(t => !t.cycle_id);

    // Default active box type when loading new class results
    if (_activeBoxType === 'final' || !_activeBoxType) {
      if (testCycles.length > 0) {
        _activeBoxType = 'cycle';
        _activeBoxId = testCycles[0].id;
      } else if (_resultsStandaloneTests.length > 0) {
        _activeBoxType = 'test';
        _activeBoxId = _resultsStandaloneTests[0].id;
      } else {
        _activeBoxType = null;
        _activeBoxId = null;
      }
    }

    // Show/hide Compare Series button
    const btnSeries = document.getElementById('btn-compare-series');
    if (btnSeries) btnSeries.style.display = testCycles.length >= 2 ? '' : 'none';

    renderExamBoxes();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${Icons?.render?.('warning',{size:32}) || ''}</div><h3>Error Loading Results</h3><p>${err.message}</p></div>`;
    Toast.error('Results Error', err.message);
  }
}

/* ═══════════════════════════════════════════════
   EXAM BOX GRID (replaces horizontal scroll row)
   ═══════════════════════════════════════════════ */

function renderExamBoxes() {
  const container = document.getElementById('results-container');

  const boxes = [];

  _resultsTestCycles.forEach(c => {
    boxes.push({
      type: 'cycle', id: c.id,
      icon: Icons?.render?.('calendar',{size:20}) || '', title: c.title,
      subtitle: `${c.total_tests || 0} Tests · Max ${c.max_marks}m`,
      total: c.total_tests || 0,
      completed: c.completed_tests || 0
    });
  });

  _resultsStandaloneTests.forEach(t => {
    boxes.push({
      type: 'test', id: t.id,
      icon: Icons?.render?.('pdf',{size:20}) || '', title: t.name,
      subtitle: `${t.subject_name} · Max ${t.max_marks}m`,
      total: null, completed: null
    });
  });

  const boxesHTML = boxes.map(b => {
    const isActive = _activeBoxType === b.type && _activeBoxId === b.id;
    const progressHTML = (b.total !== null && b.total > 0) ? `
      <div class="exam-box-progress">
        <div class="exam-box-progress-bar">
          <div class="exam-box-progress-fill" style="width:${Math.round((b.completed / b.total) * 100)}%"></div>
        </div>
        <span class="exam-box-progress-label">${b.completed}/${b.total}</span>
      </div>` : '';

    return `
      <div class="exam-box-card ${isActive ? 'active' : ''}"
           onclick="selectExamBox('${b.type}', ${b.id})"
           title="${b.title}">
        <span class="exam-box-icon">${b.icon}</span>
        <div class="exam-box-title">${b.title}</div>
        <div class="exam-box-sub">${b.subtitle}</div>
        ${progressHTML}
      </div>`;
  }).join('');

  container.innerHTML = `
    <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;">
      Select Exam / Test Series
    </p>
    <div class="exam-box-grid">
      ${boxesHTML}
    </div>
    <div id="results-table-container"></div>`;

  loadActiveExamTable();
}

function selectExamBox(type, id) {
  _activeBoxType = type;
  _activeBoxId = id;
  _expandedStudents.clear();
  _destroyCharts();
  renderExamBoxes();
}

/* ═══════════════════════════════════════════════
   ACTIVE EXAM TABLE LOADER
   ═══════════════════════════════════════════════ */

async function loadActiveExamTable() {
  const tableContainer = document.getElementById('results-table-container');
  tableContainer.innerHTML = `<div class="empty-state" style="padding:var(--space-8)"><div class="animate-pulse" style="font-size:1.5rem">${Icons?.render?.('chart',{size:24}) || ''}</div><p class="text-muted text-sm mt-1">Loading results...</p></div>`;

  try {
    if (_activeBoxType === 'final') {
      renderFinalResultsCards();
    } else if (_activeBoxType === 'cycle') {
      const cycleData = await API.testCycles.results(_activeBoxId, _resultsBatchId);
      renderCycleResultsCards(cycleData);
    } else if (_activeBoxType === 'test') {
      const testData = await API.tests.getMarks(_activeBoxId);
      renderTestResultsTable(testData);
    }
  } catch (err) {
    tableContainer.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${Icons?.render?.('warning',{size:32}) || ''}</div><h3>Error Loading Table</h3><p>${err.message}</p></div>`;
  }
}

/* ═══════════════════════════════════════════════
   FINAL RESULTS — STUDENT CARD LAYOUT
   ═══════════════════════════════════════════════ */

function renderFinalResultsCards() {
  const { standard, subjects, students } = _resultsFinalData;
  const tableContainer = document.getElementById('results-table-container');

  if (!students || students.length === 0) {
    tableContainer.innerHTML = `<div class="empty-state"><h3>No Student Records</h3><p>There are no students enrolled in this class.</p></div>`;
    return;
  }

  const avgPct = students.length > 0
    ? (students.reduce((s, r) => s + (r.overallPct || 0), 0) / students.length).toFixed(1) : 0;
  const passCount = students.filter(s => s.finalStatus !== 'Fail' && s.finalStatus !== 'Pending').length;
  const failCount = students.filter(s => s.finalStatus === 'Fail').length;
  const pendingCount = students.filter(s => s.finalStatus === 'Pending').length;

  const statsBar = `
    <div class="results-summary-bar">
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon">${Icons?.render?.('students',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val">${students.length}</div><div class="results-stat-chip-lbl">Total Students</div></div>
      </div>
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon">${Icons?.render?.('chart',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val">${avgPct}%</div><div class="results-stat-chip-lbl">Class Average</div></div>
      </div>
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon" style="color:#15803d">${Icons?.render?.('check',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val" style="color:#15803d">${passCount}</div><div class="results-stat-chip-lbl">Passed</div></div>
      </div>
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon" style="color:#b91c1c">${Icons?.render?.('close',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val" style="color:#b91c1c">${failCount}</div><div class="results-stat-chip-lbl">Failed</div></div>
      </div>
      ${pendingCount > 0 ? `
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon" style="color:#b45309">${Icons?.render?.('clock',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val" style="color:#b45309">${pendingCount}</div><div class="results-stat-chip-lbl">Pending</div></div>
      </div>` : ''}
    </div>`;

  const cardsHTML = students.map(sr => {
    const rankClass = sr.rank <= 3 ? `rank-${sr.rank}` : '';
    const rankColor = sr.rank === 1 ? '#d4af37' : sr.rank === 2 ? '#9ca3af' : sr.rank === 3 ? '#cd7f32' : 'var(--accent-dark)';
    const isExpanded = _expandedStudents.has(sr.student.id);

    // Subject pills
    const subjectPillsHTML = subjects.map(sub => {
      const isSelected = isStudentEnrolled(sr.student, sub.id, sub.is_compulsory);
      const subRes = sr.subjectResults?.find(s => s.subject_id === sub.id);

      if (!isSelected) {
        return `<div class="rsc-subject-pill optional-skip">
          <span class="rsc-subject-name">${sub.name}</span>
          <span class="rsc-subject-score" style="font-size:0.75rem;color:var(--text-muted)">—</span>
          <span class="rsc-subject-max">Not enrolled</span>
        </div>`;
      }

      let pillClass = 'pending';
      let scoreDisplay = '—';
      let maxDisplay = `Max: ${sub.max_marks}`;
      let editAttr = '';

      if (sub.marks_type === 'split') {
        const intVal = subRes?.internal_marks !== null && subRes?.internal_marks !== undefined ? subRes.internal_marks : null;
        const extVal = subRes?.external_marks !== null && subRes?.external_marks !== undefined ? subRes.external_marks : null;
        const total = subRes?.obtained !== null && subRes?.obtained !== undefined ? subRes.obtained : null;
        if (total !== null) {
          pillClass = subRes?.pass_fail === 'FAIL' ? 'fail' : 'pass';
          scoreDisplay = `${intVal ?? '—'}+${extVal ?? '—'}=${total}`;
        }
        maxDisplay = `Int:${sub.internal_max} Ext:${sub.external_max}`;
        editAttr = `data-student-id="${sr.student.id}" data-subject-id="${sub.id}" data-part="total" data-max="${sub.max_marks}"`;
      } else {
        const totVal = subRes?.obtained !== null && subRes?.obtained !== undefined ? subRes.obtained : null;
        if (totVal !== null) {
          pillClass = subRes?.pass_fail === 'FAIL' ? 'fail' : 'pass';
          scoreDisplay = totVal;
        }
        editAttr = `data-student-id="${sr.student.id}" data-subject-id="${sub.id}" data-part="total" data-max="${sub.max_marks}"`;
      }

      return `<div class="rsc-subject-pill ${pillClass}" title="Double-click score to edit">
        <span class="rsc-subject-name">${sub.name}</span>
        <span class="rsc-subject-score editable-sub-cell pointer-edit-cell" ${editAttr}>${scoreDisplay}</span>
        <span class="rsc-subject-max">${maxDisplay}</span>
      </div>`;
    }).join('');

    const statusClass = getStatusClass(sr.finalStatus);
    const initials = sr.student.name.trim().split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

    return `
      <div class="results-student-card ${rankClass}" id="rsc-${sr.student.id}">
        <div class="rsc-header" onclick="toggleStudentExpand(${sr.student.id})">
          <div class="rsc-rank ${rankClass}" style="color:${rankColor}">#${sr.rank}</div>
          <div class="rsc-avatar">${initials}</div>
          <div class="rsc-info">
            <div class="rsc-name">${sr.student.name}</div>
            <div class="rsc-roll">Roll: ${sr.student.roll_number}</div>
          </div>
          <div class="rsc-stats">
            <div class="rsc-stat-item">
              <div class="rsc-stat-value">${sr.totalObtained}/${sr.totalMaxMarks}</div>
              <div class="rsc-stat-label">Marks</div>
            </div>
            <div class="rsc-stat-item">
              <div class="rsc-stat-value">${sr.overallPct !== null ? sr.overallPct.toFixed(1) + '%' : '—'}</div>
              <div class="rsc-stat-label">Percent</div>
            </div>
            <div class="rsc-grade" style="color:${sr.overallGradeColor || 'inherit'}">${sr.overallGrade}</div>
            <span class="badge ${statusClass}">${sr.finalStatus}</span>
            <div class="rsc-expand-btn">${isExpanded ? '▲' : '▼'}</div>
          </div>
        </div>
        <div class="rsc-body ${isExpanded ? 'open' : ''}" id="rsc-body-${sr.student.id}">
          <div class="rsc-subjects-grid">${subjectPillsHTML}</div>
          <div class="rsc-actions-row">
            <button class="btn btn-ghost btn-sm" onclick="previewStudentCard(${sr.student.id})">${Icons?.render?.('eye',{size:14}) || ''} Preview Card</button>
            <button class="btn btn-outline btn-sm" onclick="downloadSinglePDF(${sr.student.id})">${Icons?.render?.('pdf',{size:14}) || ''} Download PDF</button>
          </div>
        </div>
      </div>`;
  }).join('');

  tableContainer.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <h3 style="font-weight:700;font-size:1rem;">Overall Results — Student Results</h3>
      <div class="flex gap-2 flex-wrap">
        <button id="btn-toggle-expand-all" class="btn btn-outline btn-sm" onclick="toggleExpandAllStudents()">Expand All ▼</button>
      </div>
    </div>
    <div class="info-alert mb-4" style="background: var(--primary-light); border-left: 4px solid var(--primary); padding: 12px; border-radius: var(--radius-md); font-size: 0.85rem; line-height: 1.5; color: var(--text-primary);">
      💡 <strong>About Overall Results:</strong> This dashboard compiles cumulative aggregate scores across all completed test cycles and standalone tests for this standard. It tracks total performance to calculate students' final grades, overall aggregate percentages, and rankings.
    </div>
    ${statsBar}
    <div id="student-cards-list">${cardsHTML}</div>`;
}

function toggleStudentExpand(studentId) {
  const body = document.getElementById(`rsc-body-${studentId}`);
  const card = document.getElementById(`rsc-${studentId}`);
  if (!body) return;

  if (_expandedStudents.has(studentId)) {
    _expandedStudents.delete(studentId);
    body.classList.remove('open');
  } else {
    _expandedStudents.add(studentId);
    body.classList.add('open');
  }

  // Update arrow in header
  const btn = card?.querySelector('.rsc-expand-btn');
  if (btn) btn.textContent = _expandedStudents.has(studentId) ? '▲' : '▼';

  // Update toggle button text
  updateToggleExpandAllButtonText();
}

function updateToggleExpandAllButtonText() {
  const bodies = document.querySelectorAll('.rsc-body');
  if (bodies.length === 0) return;

  let hasClosed = false;
  bodies.forEach(body => {
    if (!body.classList.contains('open')) {
      hasClosed = true;
    }
  });

  const btnToggle = document.getElementById('btn-toggle-expand-all');
  if (btnToggle) {
    btnToggle.innerHTML = hasClosed ? 'Expand All ▼' : 'Collapse All ▲';
  }
}

function toggleExpandAllStudents() {
  const bodies = document.querySelectorAll('.rsc-body');
  if (bodies.length === 0) return;

  let hasClosed = false;
  bodies.forEach(body => {
    if (!body.classList.contains('open')) {
      hasClosed = true;
    }
  });

  const btnToggle = document.getElementById('btn-toggle-expand-all');

  if (hasClosed) {
    // Expand all
    bodies.forEach(body => {
      body.classList.add('open');
      const idStr = body.id.replace('rsc-body-', '');
      const id = isNaN(idStr) ? idStr : parseInt(idStr, 10);
      _expandedStudents.add(id);
    });
    document.querySelectorAll('.rsc-expand-btn').forEach(btn => {
      btn.textContent = '▲';
    });
    if (btnToggle) {
      btnToggle.innerHTML = 'Collapse All ▲';
    }
  } else {
    // Collapse all
    bodies.forEach(body => {
      body.classList.remove('open');
      const idStr = body.id.replace('rsc-body-', '');
      const id = isNaN(idStr) ? idStr : parseInt(idStr, 10);
      _expandedStudents.delete(id);
    });
    document.querySelectorAll('.rsc-expand-btn').forEach(btn => {
      btn.textContent = '▼';
    });
    if (btnToggle) {
      btnToggle.innerHTML = 'Expand All ▼';
    }
  }
}

/* ═══════════════════════════════════════════════
   CYCLE RESULTS — CARD LAYOUT
   ═══════════════════════════════════════════════ */

function renderCycleResultsCards(cycleData) {
  const { cycle, tests, students, testSummary } = cycleData;
  const tableContainer = document.getElementById('results-table-container');

  if (!students || students.length === 0) {
    tableContainer.innerHTML = `<div class="empty-state"><h3>No Student Records</h3><p>There are no students enrolled in this class.</p></div>`;
    return;
  }

  // Summary bar
  const validPcts = students.filter(s => s.pct !== null).map(s => parseFloat(s.pct));
  const avgPct = validPcts.length > 0 ? (validPcts.reduce((a, b) => a + b, 0) / validPcts.length).toFixed(1) : '—';

  const statsBar = `
    <div class="results-summary-bar">
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon">${Icons?.render?.('students',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val">${students.length}</div><div class="results-stat-chip-lbl">Students</div></div>
      </div>
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon">${Icons?.render?.('templates',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val">${tests.length}</div><div class="results-stat-chip-lbl">Subjects</div></div>
      </div>
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon">${Icons?.render?.('chart',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val">${avgPct}%</div><div class="results-stat-chip-lbl">Class Avg</div></div>
      </div>
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon">${Icons?.render?.('marks',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val">${cycle.max_marks}</div><div class="results-stat-chip-lbl">Max Marks</div></div>
      </div>
    </div>`;

  // Subject summary chips
  const subjSummaryHTML = (testSummary || []).map(ts => `
    <div style="background:var(--bg-surface);border:1px solid var(--border-medium);border-radius:var(--radius);padding:10px 14px;min-width:130px;">
      <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ts.subject_name}</div>
      <div style="font-size:1rem;font-weight:800;color:var(--text-primary)">${ts.avg !== null ? ts.avg : '—'}</div>
      <div style="font-size:0.68rem;color:var(--text-muted)">Avg · Pass: ${ts.passCount}/${ts.totalEntered}</div>
    </div>`).join('');

  // Sort students by total desc
  const sorted = [...students].sort((a, b) => (b.total || 0) - (a.total || 0));

  const cardsHTML = sorted.map((sr, idx) => {
    const rank = idx + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const rankColor = rank === 1 ? '#d4af37' : rank === 2 ? '#9ca3af' : rank === 3 ? '#cd7f32' : 'var(--accent-dark)';
    const isExpanded = _expandedStudents.has(sr.student_id);
    const initials = sr.name.trim().split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

    const subjectPillsHTML = tests.map(test => {
      const res = sr.testResults.find(r => r.test_id === test.id);
      const val = res && res.obtained !== null ? res.obtained : (res?.is_absent ? 'AB' : '—');
      const pct = (res && !res.is_absent && res.obtained !== null) ? (res.obtained / test.max_marks * 100) : null;
      const pillClass = res?.is_absent ? 'absent' : (pct !== null ? (pct >= 35 ? 'pass' : 'fail') : 'pending');
      const entered = res?.entered;

      return `<div class="rsc-subject-pill ${pillClass}" title="${test.subject_name}">
        <span class="rsc-subject-name">${test.subject_name}</span>
        <span class="rsc-subject-score editable-sub-cell pointer-edit-cell"
          data-student-id="${sr.student_id}" data-test-id="${test.id}" data-part="test" data-max="${test.max_marks}">${val}</span>
        <span class="rsc-subject-max">/ ${test.max_marks}</span>
      </div>`;
    }).join('');

    return `
      <div class="results-student-card ${rankClass}" id="rsc-${sr.student_id}">
        <div class="rsc-header" onclick="toggleStudentExpand(${sr.student_id})">
          <div class="rsc-rank ${rankClass}" style="color:${rankColor}">#${rank}</div>
          <div class="rsc-avatar">${initials}</div>
          <div class="rsc-info">
            <div class="rsc-name">${sr.name}</div>
            <div class="rsc-roll">Roll: ${sr.roll_number}</div>
          </div>
          <div class="rsc-stats">
            <div class="rsc-stat-item">
              <div class="rsc-stat-value">${sr.total}/${sr.maxTotal}</div>
              <div class="rsc-stat-label">Marks</div>
            </div>
            <div class="rsc-stat-item">
              <div class="rsc-stat-value">${sr.pct !== null ? sr.pct + '%' : '—'}</div>
              <div class="rsc-stat-label">Percent</div>
            </div>
            <div class="rsc-expand-btn">${isExpanded ? '▲' : '▼'}</div>
          </div>
        </div>
        <div class="rsc-body ${isExpanded ? 'open' : ''}" id="rsc-body-${sr.student_id}">
          <div class="rsc-subjects-grid">${subjectPillsHTML}</div>
        </div>
      </div>`;
  }).join('');

  tableContainer.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <div>
        <h3 style="font-weight:700;font-size:1rem;">Test Cycle: ${cycle.title}</h3>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${tests.length} subjects · Max ${cycle.max_marks} marks</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button id="btn-toggle-expand-all" class="btn btn-outline btn-sm" onclick="toggleExpandAllStudents()">Expand All ▼</button>
      </div>
    </div>
    ${statsBar}
    ${subjSummaryHTML ? `
    <div style="margin-bottom:20px;">
      <p style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:10px;">Subject Averages</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${subjSummaryHTML}</div>
    </div>` : ''}
    <div id="student-cards-list">${cardsHTML}</div>`;
}

/* ═══════════════════════════════════════════════
   STANDALONE TEST RESULTS — CLEAN TABLE
   ═══════════════════════════════════════════════ */

function renderTestResultsTable(testData) {
  const { test, marks } = testData;
  const tableContainer = document.getElementById('results-table-container');

  if (!marks || marks.length === 0) {
    tableContainer.innerHTML = `<div class="empty-state"><h3>No Student Records</h3><p>There are no students enrolled in this class.</p></div>`;
    return;
  }

  const passMarkPct = 35;
  const totalScored = marks.filter(m => !m.is_absent && m.obtained_marks !== null).length;
  const passCount = marks.filter(m => !m.is_absent && m.obtained_marks !== null && (m.obtained_marks / test.max_marks * 100 >= passMarkPct)).length;
  const passRate = totalScored > 0 ? Math.round((passCount / totalScored) * 100) : 0;
  const avgScore = totalScored > 0
    ? (marks.filter(m => !m.is_absent && m.obtained_marks !== null).reduce((s, m) => s + m.obtained_marks, 0) / totalScored).toFixed(1)
    : '—';

  const statsBar = `
    <div class="results-summary-bar">
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon">${Icons?.render?.('students',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val">${marks.length}</div><div class="results-stat-chip-lbl">Students</div></div>
      </div>
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon">${Icons?.render?.('chart',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val">${avgScore}</div><div class="results-stat-chip-lbl">Avg Score</div></div>
      </div>
      <div class="results-stat-chip">
        <span class="results-stat-chip-icon" style="color:#15803d">${Icons?.render?.('check',{size:16}) || ''}</span>
        <div><div class="results-stat-chip-val" style="color:#15803d">${passRate}%</div><div class="results-stat-chip-lbl">Pass Rate</div></div>
      </div>
    </div>`;

  const tableRows = marks.map(m => {
    const isElected = isStudentEnrolled(m, test.subject_id, test.is_compulsory);

    if (!isElected) {
      return `<tr style="opacity:0.65;background:var(--bg-elevated);">
        <td><span class="badge badge-gray">${m.roll_number}</span></td>
        <td class="td-primary">${m.student_name}</td>
        <td colspan="4" style="text-align:center;color:var(--text-muted);font-size:0.8rem">Not Enrolled in Elective Subject</td>
      </tr>`;
    }

    const val = m.is_absent ? 'AB' : (m.obtained_marks !== null ? m.obtained_marks : '—');
    const pct = m.is_absent ? '—' : (m.obtained_marks !== null ? ((m.obtained_marks / test.max_marks) * 100).toFixed(1) + '%' : '—');
    const statusText = m.is_absent ? 'Absent' : (m.obtained_marks !== null ? (m.obtained_marks / test.max_marks * 100 >= passMarkPct ? 'Pass' : 'Fail') : 'Pending');
    let statusClass = 'badge-gray';
    if (statusText === 'Pass') statusClass = 'badge-success';
    else if (statusText === 'Fail') statusClass = 'badge-danger';
    else if (statusText === 'Absent') statusClass = 'badge-warning';
    const valClass = val === 'AB' ? 'badge badge-warning' : '';

    return `<tr>
      <td><span class="badge badge-gray">${m.roll_number}</span></td>
      <td class="td-primary">${m.student_name}</td>
      <td style="text-align:center">
        <span class="editable-sub-cell pointer-edit-cell ${valClass}"
          data-student-id="${m.student_id}" data-test-id="${test.id}" data-part="test" data-max="${test.max_marks}">${val}</span>
      </td>
      <td style="text-align:center;font-weight:600">${pct}</td>
      <td style="text-align:center"><span class="badge ${statusClass}">${statusText}</span></td>
      <td>
        <span class="editable-remarks-cell pointer-edit-cell"
          data-student-id="${m.student_id}" data-test-id="${test.id}">${m.remarks || '—'}</span>
      </td>
    </tr>`;
  }).join('');

  tableContainer.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <div>
        <h3 style="font-weight:700;font-size:1rem;">${test.name}</h3>
        <span class="badge badge-primary" style="margin-top:4px">${test.subject_name}</span>
      </div>
    </div>
    ${statsBar}
    <div class="card">
      <div style="overflow-x:auto">
        <table style="table-layout:fixed;width:100%">
          <colgroup>
            <col style="width:90px"><col style="width:auto"><col style="width:130px">
            <col style="width:110px"><col style="width:90px"><col style="width:auto">
          </colgroup>
          <thead>
            <tr>
              <th>Roll No.</th><th>Name</th>
              <th style="text-align:center">Score (Max: ${test.max_marks})</th>
              <th style="text-align:center">Percentage</th>
              <th style="text-align:center">Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════
   INLINE EDIT — DOUBLE CLICK HANDLER
   ═══════════════════════════════════════════════ */

document.addEventListener('dblclick', (e) => {
  const cell = e.target.closest('.editable-sub-cell') || e.target.closest('.editable-remarks-cell');
  if (!cell) return;
  if (cell.querySelector('input')) return;

  const isRemarks = cell.classList.contains('editable-remarks-cell');
  const studentId = parseInt(cell.dataset.studentId);
  const subjectId = cell.dataset.subjectId ? parseInt(cell.dataset.subjectId) : null;
  const testId = cell.dataset.testId ? parseInt(cell.dataset.testId) : null;
  const part = cell.dataset.part;
  const maxVal = parseFloat(cell.dataset.max || 100);
  const currentValue = cell.textContent.trim();

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control inline-edit-input';
  input.value = currentValue === '—' ? '' : currentValue;
  if (isRemarks) {
    input.style.cssText = 'width:100%;padding:4px 8px;height:30px;border-radius:var(--radius-sm)';
  } else {
    input.style.cssText = 'width:70px;padding:2px 4px;display:inline-block;height:28px;text-align:center;font-weight:700;border-radius:var(--radius-sm)';
  }

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  let finished = false;

  async function finishEdit() {
    if (finished) return;
    finished = true;
    const newValue = input.value.trim();
    cell.innerHTML = newValue || '—';
    if (newValue === currentValue) { cell.textContent = currentValue; return; }

    try {
      if (isRemarks) {
        const marksRes = await API.tests.getMarks(testId);
        const existingMark = marksRes.marks.find(m => m.student_id === studentId);
        await API.tests.saveMarks(testId, [{
          student_id: studentId,
          obtained_marks: existingMark?.is_absent ? null : (existingMark?.obtained_marks ?? null),
          is_absent: !!existingMark?.is_absent,
          remarks: newValue
        }]);
      } else if (part === 'test') {
        const isAbsent = ['AB', 'ABS', 'ABSENT', 'A'].includes(newValue.toUpperCase());
        let obtained = null;
        if (!isAbsent && newValue !== '') {
          obtained = parseFloat(newValue);
          if (isNaN(obtained)) throw new Error('Enter a valid number or AB for absent');
          obtained = Math.max(0, Math.min(maxVal, obtained));
        }
        await API.tests.saveMarks(testId, [{ student_id: studentId, obtained_marks: obtained, is_absent: isAbsent, remarks: '' }]);
      } else {
        const isAbsent = ['AB', 'ABS', 'ABSENT', 'A'].includes(newValue.toUpperCase());
        let val = null;
        if (!isAbsent && newValue !== '') {
          val = parseFloat(newValue);
          if (isNaN(val)) throw new Error('Enter a valid number or AB for absent');
          val = Math.max(0, Math.min(maxVal, val));
        }
        const studentRow = _resultsFinalData?.students?.find(s => s.student.id === studentId);
        const subRes = studentRow?.subjectResults?.find(s => s.subject_id === subjectId);
        let total = val, internal = subRes?.internal_marks ?? null, external = subRes?.external_marks ?? null;
        if (part === 'int') { internal = val; total = (internal !== null && external !== null) ? internal + external : (internal ?? total); }
        else if (part === 'ext') { external = val; total = (internal !== null && external !== null) ? internal + external : (external ?? total); }
        await API.students.saveMarks(studentId, [{ subject_id: subjectId, total_marks: total, internal_marks: internal, external_marks: external, is_absent: isAbsent }]);
      }

      cell.style.backgroundColor = 'rgba(34,197,94,0.2)';
      cell.style.transition = 'background-color 0.1s ease';
      setTimeout(() => { cell.style.backgroundColor = ''; cell.style.transition = 'background-color 0.8s ease'; }, 200);
      Toast.success('Saved', 'Marks updated successfully');

      if (_activeBoxType === 'final') {
        _resultsFinalData = await API.export.results(_resultsStandardId);
      }
      loadActiveExamTable();
    } catch (err) {
      Toast.error('Save Error', err.message);
      cell.textContent = currentValue;
      if (currentValue === 'AB') cell.className = 'editable-sub-cell pointer-edit-cell badge badge-warning';
    }
  }

  input.addEventListener('blur', finishEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    else if (e.key === 'Escape') { finished = true; cell.textContent = currentValue; }
  });
});

/* ═══════════════════════════════════════════════
   COMPARE SERIES MODAL
   ═══════════════════════════════════════════════ */

function openCompareSeriesModal() {
  if (_resultsTestCycles.length < 2) {
    Toast.warning('Not Enough Cycles', 'You need at least 2 test cycles to compare.');
    return;
  }

  const cycleOptions = _resultsTestCycles.map(c => `<option value="${c.id}">${c.title}</option>`).join('');

  createModal('compare-series', `${Icons?.render?.('compare',{size:16}) || ''} Compare Test Series`,
    `<p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:20px">
      Compare subject-wise performance between two test cycles. See class averages side-by-side and individual student improvement.
    </p>
    <div class="compare-select-row">
      <div>
        <label class="form-label">Series A</label>
        <select class="form-control" id="cs-series-a">${cycleOptions}</select>
      </div>
      <div class="compare-vs-badge">VS</div>
      <div>
        <label class="form-label">Series B</label>
        <select class="form-control" id="cs-series-b">${_resultsTestCycles.length > 1 ? cycleOptions.replace('<option', '<option selected').replace('<option selected', '<option').replace('<option value="' + _resultsTestCycles[1].id + '">', '<option value="' + _resultsTestCycles[1].id + '" selected>') : cycleOptions}</select>
      </div>
    </div>
    <div id="compare-series-result" style="min-height:60px"></div>`,
    `<button class="btn btn-outline" onclick="closeModal('compare-series')">Cancel</button>
     <button class="btn btn-primary" onclick="runCompareSeriesAnalysis()">${Icons?.render?.('compare',{size:14}) || ''} Compare Now</button>`,
    'modal-xl'
  );

  // Set default B to second cycle
  setTimeout(() => {
    const selB = document.getElementById('cs-series-b');
    if (selB && _resultsTestCycles.length > 1) selB.value = _resultsTestCycles[1].id;
  }, 50);
}

async function runCompareSeriesAnalysis() {
  const idA = parseInt(document.getElementById('cs-series-a').value);
  const idB = parseInt(document.getElementById('cs-series-b').value);
  const resultDiv = document.getElementById('compare-series-result');

  if (idA === idB) { Toast.warning('Same Series', 'Please select two different test series.'); return; }

  resultDiv.innerHTML = `<div class="empty-state" style="padding:40px 0"><div class="animate-pulse" style="font-size:1.5rem">${Icons?.render?.('chart',{size:24}) || ''}</div><p class="text-muted text-sm mt-2">Fetching data...</p></div>`;

  try {
    const [dataA, dataB] = await Promise.all([
      API.testCycles.results(idA),
      API.testCycles.results(idB)
    ]);

    _destroyCharts();

    // Build subject-level averages from testSummary
    const summaryA = dataA.testSummary || [];
    const summaryB = dataB.testSummary || [];

    // Find common subjects by name
    const subjectNames = [...new Set([
      ...summaryA.map(s => s.subject_name),
      ...summaryB.map(s => s.subject_name)
    ])];

    const avgsA = subjectNames.map(name => {
      const s = summaryA.find(x => x.subject_name === name);
      return s?.avg !== null && s?.avg !== undefined ? parseFloat(s.avg) : null;
    });
    const avgsB = subjectNames.map(name => {
      const s = summaryB.find(x => x.subject_name === name);
      return s?.avg !== null && s?.avg !== undefined ? parseFloat(s.avg) : null;
    });

    // Build student improvement table
    // Match students by name (best effort cross-cycle match)
    const studentsA = dataA.students || [];
    const studentsB = dataB.students || [];
    const studentRows = studentsA.map(sa => {
      const sb = studentsB.find(s => s.name === sa.name || s.roll_number === sa.roll_number);
      const pctA = sa.pct !== null ? parseFloat(sa.pct) : null;
      const pctB = sb?.pct !== null && sb?.pct !== undefined ? parseFloat(sb.pct) : null;
      let delta = null, deltaClass = 'delta-same', deltaText = '—';
      if (pctA !== null && pctB !== null) {
        delta = (pctB - pctA).toFixed(1);
        deltaClass = delta > 0 ? 'delta-up' : (delta < 0 ? 'delta-down' : 'delta-same');
        deltaText = delta > 0 ? `▲ +${delta}%` : (delta < 0 ? `▼ ${delta}%` : `= ${delta}%`);
      }
      return { name: sa.name, roll: sa.roll_number, pctA, pctB, deltaText, deltaClass };
    });

    // Max marks for percentage calculation
    const maxA = dataA.cycle?.max_marks || 100;
    const maxB = dataB.cycle?.max_marks || 100;

    resultDiv.innerHTML = `
      <p class="compare-section-title">Subject-wise Class Average Comparison</p>
      <div class="compare-legend">
        <div class="compare-legend-item"><div class="compare-legend-dot" style="background:#3b82f6"></div>${dataA.cycle.title}</div>
        <div class="compare-legend-item"><div class="compare-legend-dot" style="background:#f59e0b"></div>${dataB.cycle.title}</div>
      </div>
      <div class="chart-container"><canvas id="cs-bar-chart"></canvas></div>

      <p class="compare-section-title">Student Progress: ${dataA.cycle.title} → ${dataB.cycle.title}</p>
      <div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border);">
        <table class="improve-table">
          <thead><tr>
            <th>Roll</th><th>Name</th>
            <th>% in ${dataA.cycle.title}</th>
            <th>% in ${dataB.cycle.title}</th>
            <th>Change</th>
          </tr></thead>
          <tbody>
            ${studentRows.map(r => `<tr>
              <td><span class="badge badge-gray">${r.roll}</span></td>
              <td style="font-weight:600;color:var(--text-primary)">${r.name}</td>
              <td>${r.pctA !== null ? r.pctA + '%' : '—'}</td>
              <td>${r.pctB !== null ? r.pctB + '%' : '—'}</td>
              <td><span class="${r.deltaClass}">${r.deltaText}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    // Draw grouped bar chart
    const ctx = document.getElementById('cs-bar-chart');
    if (ctx) {
      _chartInstances['cs-bar'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: subjectNames,
          datasets: [
            {
              label: dataA.cycle.title,
              data: avgsA,
              backgroundColor: 'rgba(59,130,246,0.7)',
              borderColor: '#3b82f6',
              borderWidth: 1.5,
              borderRadius: 6,
            },
            {
              label: dataB.cycle.title,
              data: avgsB,
              backgroundColor: 'rgba(245,158,11,0.7)',
              borderColor: '#f59e0b',
              borderWidth: 1.5,
              borderRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${ctx.raw !== null ? ctx.raw : 'N/A'}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: Math.max(maxA, maxB),
              grid: { color: 'rgba(0,0,0,0.06)' },
              ticks: { color: '#8c7e70', font: { size: 11 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#8c7e70', font: { size: 11 } }
            }
          }
        }
      });
    }
  } catch (err) {
    resultDiv.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${Icons?.render?.('warning',{size:32}) || ''}</div><h3>Error</h3><p>${err.message}</p></div>`;
    Toast.error('Compare Error', err.message);
  }
}

/* ═══════════════════════════════════════════════
   COMPARE STUDENTS MODAL
   ═══════════════════════════════════════════════ */

function openCompareStudentsModal() {
  if (!_resultsFinalData?.students || _resultsFinalData.students.length < 2) {
    Toast.warning('Not Enough Data', 'Load a class with at least 2 students first.');
    return;
  }

  const { students } = _resultsFinalData;

  const pickerItems = students.map(sr => `
    <label class="student-picker-item" id="spi-${sr.student.id}">
      <input type="checkbox" value="${sr.student.id}" onchange="updateStudentPickerItem(${sr.student.id}, this.checked)">
      <span class="student-picker-name">${sr.student.name}</span>
      <span class="student-picker-roll">Roll: ${sr.student.roll_number} · Rank #${sr.rank}</span>
    </label>`).join('');

  createModal('compare-students', `${Icons?.render?.('students',{size:16}) || ''} Compare Students`,
    `<p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:16px">
      Select 2–4 students to compare their subject-wise marks in detail. Charts will show radar and bar comparisons.
    </p>
    <div class="form-group mb-4">
      <label class="form-label">Search Students</label>
      <input type="text" class="form-control" placeholder="Type to filter..." oninput="filterStudentPicker(this.value)">
    </div>
    <div class="student-picker-list" id="student-picker-list">${pickerItems}</div>
    <p style="font-size:0.75rem;color:var(--text-muted);margin-top:8px" id="picker-selection-count">0 students selected (pick 2–4)</p>
    <div id="compare-students-result" style="min-height:60px;margin-top:20px"></div>`,
    `<button class="btn btn-outline" onclick="closeModal('compare-students')">Cancel</button>
     <button class="btn btn-primary" onclick="runCompareStudentsAnalysis()">${Icons?.render?.('students',{size:14}) || ''} Compare Now</button>`,
    'modal-xl'
  );
}

function updateStudentPickerItem(studentId, checked) {
  const item = document.getElementById(`spi-${studentId}`);
  if (item) item.classList.toggle('selected', checked);
  const checkedCount = document.querySelectorAll('#student-picker-list input:checked').length;
  const countEl = document.getElementById('picker-selection-count');
  if (countEl) {
    countEl.textContent = `${checkedCount} student${checkedCount !== 1 ? 's' : ''} selected (pick 2–4)`;
    countEl.style.color = (checkedCount >= 2 && checkedCount <= 4) ? 'var(--success)' : 'var(--text-muted)';
  }
}

function filterStudentPicker(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#student-picker-list .student-picker-item').forEach(item => {
    const name = item.querySelector('.student-picker-name')?.textContent.toLowerCase() || '';
    const roll = item.querySelector('.student-picker-roll')?.textContent.toLowerCase() || '';
    item.style.display = (!q || name.includes(q) || roll.includes(q)) ? '' : 'none';
  });
}

async function runCompareStudentsAnalysis() {
  const checkedIds = [...document.querySelectorAll('#student-picker-list input:checked')].map(el => parseInt(el.value));

  if (checkedIds.length < 2) { Toast.warning('Select Students', 'Please select at least 2 students to compare.'); return; }
  if (checkedIds.length > 4) { Toast.warning('Too Many', 'Please select at most 4 students.'); return; }

  const resultDiv = document.getElementById('compare-students-result');
  const { subjects, students } = _resultsFinalData;

  const selected = checkedIds.map((id, idx) => {
    const sr = students.find(s => s.student.id === id);
    return { sr, color: COMPARE_COLORS[idx] };
  }).filter(x => x.sr);

  if (selected.length < 2) { Toast.warning('Data Missing', 'Could not find all selected students.'); return; }

  _destroyCharts();

  // Build subject score arrays
  const subjectLabels = subjects.map(s => s.name);

  // Build elective IDs per student
  const getScore = (sr, sub) => {
    const isSelected = isStudentEnrolled(sr.student, sub.id, sub.is_compulsory);
    if (!isSelected) return null;
    const subRes = sr.subjectResults?.find(s => s.subject_id === sub.id);
    if (!subRes || subRes.obtained === null || subRes.obtained === undefined) return 0;
    return subRes.obtained;
  };

  // Percentage scores for radar (0–100)
  const radarDatasets = selected.map(({ sr, color }) => ({
    label: sr.student.name,
    data: subjects.map(sub => {
      const score = getScore(sr, sub);
      if (score === null) return null;
      return sub.max_marks > 0 ? parseFloat(((score / sub.max_marks) * 100).toFixed(1)) : 0;
    }),
    fill: true,
    backgroundColor: color.fill,
    borderColor: color.stroke,
    borderWidth: 2,
    pointBackgroundColor: color.stroke,
    pointRadius: 4,
    spanGaps: true
  }));

  // Raw scores for bar chart
  const barDatasets = selected.map(({ sr, color }) => ({
    label: sr.student.name,
    data: subjects.map(sub => {
      const score = getScore(sr, sub);
      return score !== null ? score : 0;
    }),
    backgroundColor: color.solid + 'bb',
    borderColor: color.solid,
    borderWidth: 1.5,
    borderRadius: 5,
  }));

  // Stats table — find top scorer per subject
  const topPerSubject = subjects.map((sub, si) => {
    let max = -Infinity, topIdx = -1;
    selected.forEach(({ sr }, idx) => {
      const s = getScore(sr, sub);
      if (s !== null && s > max) { max = s; topIdx = idx; }
    });
    return topIdx;
  });

  const studentHeaderCells = selected.map(({ sr, color }) =>
    `<th><span class="compare-student-header-chip" style="color:${color.solid};border-color:${color.solid};background:${color.fill}">${sr.student.name}</span></th>`
  ).join('');

  const subjectTableRows = subjects.map((sub, si) => {
    const cells = selected.map(({ sr }, idx) => {
      const score = getScore(sr, sub);
      const isTop = topPerSubject[si] === idx && score !== null;
      return `<td class="${isTop ? 'top-score' : ''}">${score !== null ? `${score}/${sub.max_marks}` : '—'}</td>`;
    }).join('');
    return `<tr><td>${sub.name}</td>${cells}</tr>`;
  }).join('');

  const summaryRows = [
    ['Total Marks', selected.map(({sr}) => `${sr.totalObtained}/${sr.totalMaxMarks}`)],
    ['Percentage', selected.map(({sr}) => sr.overallPct !== null ? sr.overallPct.toFixed(1) + '%' : '—')],
    ['Grade', selected.map(({sr}) => sr.overallGrade)],
    ['Rank', selected.map(({sr}) => `#${sr.rank}`)],
    ['Status', selected.map(({sr}) => sr.finalStatus)],
  ].map(([label, vals]) => {
    const cells = vals.map(v => `<td>${v}</td>`).join('');
    return `<tr><td style="font-weight:700">${label}</td>${cells}</tr>`;
  }).join('');

  resultDiv.innerHTML = `
    <p class="compare-section-title">Radar Chart — Percentage per Subject</p>
    <div class="compare-legend">
      ${selected.map(({sr, color}) => `<div class="compare-legend-item"><div class="compare-legend-dot" style="background:${color.solid}"></div>${sr.student.name}</div>`).join('')}
    </div>
    <div class="chart-container" style="max-width:520px;margin:0 auto 20px"><canvas id="cs-radar-chart"></canvas></div>

    <p class="compare-section-title">Bar Chart — Raw Marks per Subject</p>
    <div class="chart-container"><canvas id="cs-bar2-chart"></canvas></div>

    <p class="compare-section-title">Overall Summary</p>
    <div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:20px">
      <table class="student-compare-table">
        <thead><tr><th>Metric</th>${studentHeaderCells}</tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>
    </div>

    <p class="compare-section-title">Subject-wise Marks</p>
    <div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)">
      <table class="student-compare-table">
        <thead><tr><th>Subject</th>${studentHeaderCells}</tr></thead>
        <tbody>${subjectTableRows}</tbody>
      </table>
    </div>
    <p style="font-size:0.72rem;color:var(--text-muted);margin-top:8px">🥇 Gold highlight = highest scorer in that subject</p>`;

  // Draw radar
  const radarCtx = document.getElementById('cs-radar-chart');
  if (radarCtx) {
    _chartInstances['cs-radar'] = new Chart(radarCtx, {
      type: 'radar',
      data: { labels: subjectLabels, datasets: radarDatasets },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true, max: 100,
            grid: { color: 'rgba(0,0,0,0.08)' },
            pointLabels: { color: '#8c7e70', font: { size: 10 } },
            ticks: { color: '#8c7e70', font: { size: 9 }, stepSize: 25, backdropColor: 'transparent' }
          }
        }
      }
    });
  }

  // Draw bar
  const barCtx = document.getElementById('cs-bar2-chart');
  if (barCtx) {
    _chartInstances['cs-bar2'] = new Chart(barCtx, {
      type: 'bar',
      data: { labels: subjectLabels, datasets: barDatasets },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: { color: '#8c7e70', font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#8c7e70', font: { size: 11 } }
          }
        }
      }
    });
  }
}

/* ═══════════════════════════════════════════════
   CHART CLEANUP
   ═══════════════════════════════════════════════ */

function _destroyCharts() {
  Object.values(_chartInstances).forEach(c => { try { c.destroy(); } catch(e) {} });
  _chartInstances = {};
}

/* ═══════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════ */

function getStatusClass(status) {
  if (status === 'Fail') return 'badge-danger';
  if (status === 'Pending') return 'badge-gray';
  return 'badge-success';
}

async function previewStudentCard(studentId) {
  Spinner.show('Generating preview...');
  try {
    const html = await API.export.previewStudent(studentId);
    Spinner.hide();
    const overlay = createModal('card-preview', `${Icons?.render?.('eye',{size:16}) || ''} Result Card Preview`,
      `<div id="preview-viewport-container" style="display:flex;justify-content:center;align-items:center;background:#0f172a;padding:20px;transition:all 0.3s ease;overflow:auto;max-height:700px;border-radius:var(--radius)">
         <iframe id="preview-iframe" style="width:210mm;height:297mm;max-height:650px;background:white;border:none;box-shadow:0 10px 25px rgba(0,0,0,0.5);transition:all 0.3s ease" srcdoc="${html.replace(/"/g, '&quot;')}"></iframe>
       </div>`,
      `<button class="btn btn-outline" onclick="closeModal('card-preview')">Close</button>
       <button class="btn btn-primary" onclick="downloadSinglePDF(${studentId})">${Icons?.render?.('download',{size:14}) || ''} Download PDF</button>`,
      'modal-xl'
    );
    overlay.classList.add('modal-fullscreen-overlay');
  } catch (err) {
    Spinner.hide();
    Toast.error('Preview Failed', err.message);
  }
}

async function downloadBulkPDF() {
  if (!_resultsStandardId) return;
  Spinner.show('Generating bulk PDF... This may take a moment.');
  try {
    const tokenRes = await API.export.downloadToken();
    const token = tokenRes.token;
    const activeCycleId = (_activeBoxType === 'cycle') ? _activeBoxId : null;
    const baseUrl = API.export.pdfBulk(_resultsStandardId, null, _resultsBatchId, activeCycleId);
    const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + `token=${token}`;
    const a = document.createElement('a');
    a.href = url; a.download = ''; a.click();
    setTimeout(() => Spinner.hide(), 3000);
    Toast.info('Downloading', 'Your bulk PDF is being generated and will download shortly.');
  } catch (err) {
    Spinner.hide();
    Toast.error('Export Failed', err.message);
  }
}

async function downloadClassExcel() {
  if (!_resultsStandardId) return;
  try {
    const tokenRes = await API.export.downloadToken();
    const token = tokenRes.token;
    const url = API.export.excel(_resultsStandardId, _resultsBatchId) + `?token=${token}`;
    window.location.href = url;
    Toast.success('Downloading', 'Excel export will download shortly.');
  } catch (err) {
    Toast.error('Export Failed', err.message);
  }
}

async function downloadSinglePDF(studentId) {
  Spinner.show('Generating result card PDF...');
  try {
    const tokenRes = await API.export.downloadToken();
    const token = tokenRes.token;
    const baseUrl = API.export.pdfSingle(studentId);
    const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + `token=${token}`;
    const a = document.createElement('a');
    a.href = url; a.download = ''; a.click();
    setTimeout(() => Spinner.hide(), 2000);
    Toast.success('Downloading', 'Your PDF result card is downloading.');
  } catch (err) {
    Spinner.hide();
    Toast.error('Download Failed', err.message);
  }
}
window.downloadSinglePDF = downloadSinglePDF;

async function showResultSettings() {
  if (!_resultsStandardId) return;
  const settings = await API.standards.getSettings(_resultsStandardId);
  const cats = typeof settings.result_categories === 'string'
    ? JSON.parse(settings.result_categories) : settings.result_categories || [];

  createModal('result-settings', `${Icons?.render?.('settings',{size:16}) || ''} Result Card Settings`,
    `<p class="form-section-title">Display Options</p>
    <div class="grid grid-2 gap-4 mb-6">
      ${[
      ['show_rank', 'Show Rank', settings.show_rank],
      ['show_attendance', 'Show Attendance', settings.show_attendance],
      ['show_remarks', 'Show Remarks', settings.show_remarks],
      ['show_photo', 'Show Photo', settings.show_photo],
      ['show_parent_names', 'Show Parent Names', settings.show_parent_names],
      ['show_dob', 'Show Date of Birth', settings.show_dob],
      ['show_split_marks', 'Show Int/Ext Split', settings.show_split_marks],
      ['show_grade', 'Show Grade', settings.show_grade],
      ['show_pass_fail', 'Show Pass/Fail', settings.show_pass_fail]
    ].map(opt => `
        <label class="toggle-group">
          <span class="toggle-label">${opt[1]}</span>
          <span class="toggle">
            <input type="checkbox" id="rs-${opt[0]}" ${opt[2] !== 0 ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </span>
        </label>
      `).join('')}
    </div>
    <div class="form-group mb-6">
      <label class="form-label">Paper Sizing</label>
      <select class="form-control" id="rs-paper_size" style="width:100%">
        <option value="A4 Portrait" ${settings.paper_size === 'A5 Portrait' ? '' : 'selected'}>A4 Portrait (Standard A4 Sheet)</option>
        <option value="A5 Portrait" ${settings.paper_size === 'A5 Portrait' ? 'selected' : ''}>A5 Portrait (Half A4 Sheet - Compact)</option>
      </select>
    </div>
    <p class="form-section-title">Template</p>
    <div class="flex gap-2 flex-wrap mb-4" id="template-quick-select">
      ${(typeof TEMPLATE_INFO !== 'undefined' ? TEMPLATE_INFO : []).map(t => `
        <button type="button" class="btn ${settings.template_id === t.id ? 'btn-primary' : 'btn-outline'} btn-sm"
          onclick="selectQuickTemplate(${t.id})" data-tid="${t.id}">${t.id}. ${t.name}</button>
      `).join('')}
    </div>
    <input type="hidden" id="rs-template" value="${settings.template_id || 1}">
    <p class="form-section-title">Color Override</p>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Primary Color</label>
        <input type="color" class="form-control" id="rs-primary-color" value="${settings.primary_color || '#7a6130'}" style="height:42px;cursor:pointer">
      </div>
      <div class="form-group">
        <label class="form-label">Accent Color</label>
        <input type="color" class="form-control" id="rs-accent-color" value="${settings.accent_color || '#d4af37'}" style="height:42px;cursor:pointer">
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModal('result-settings')">Cancel</button>
     <button class="btn btn-primary" onclick="saveResultSettings(${_resultsStandardId})">${Icons?.render?.('save',{size:14}) || ''} Save Settings</button>`,
    'modal-md'
  );
}

function selectQuickTemplate(id) {
  document.getElementById('rs-template').value = id;
  $$('#template-quick-select button').forEach(btn => {
    btn.className = `btn ${btn.dataset.tid == id ? 'btn-primary' : 'btn-outline'} btn-sm`;
  });
}

async function saveResultSettings(standardId) {
  const settings = {
    template_id: parseInt(document.getElementById('rs-template').value) || 1,
    primary_color: document.getElementById('rs-primary-color').value,
    accent_color: document.getElementById('rs-accent-color').value,
    show_rank: document.getElementById('rs-show_rank').checked,
    show_attendance: document.getElementById('rs-show_attendance').checked,
    show_remarks: document.getElementById('rs-show_remarks').checked,
    show_photo: document.getElementById('rs-show_photo').checked,
    show_parent_names: document.getElementById('rs-show_parent_names').checked,
    show_dob: document.getElementById('rs-show_dob').checked,
    show_split_marks: document.getElementById('rs-show_split_marks').checked,
    show_grade: document.getElementById('rs-show_grade').checked,
    show_pass_fail: document.getElementById('rs-show_pass_fail').checked,
    paper_size: document.getElementById('rs-paper_size').value,
    result_categories: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D', 'Fail', 'Distinction', 'First Class', 'Second Class', 'Pass']
  };

  try {
    await API.standards.saveSettings(standardId, settings);
    closeModal('result-settings');
    Toast.success('Settings Saved', 'Result card settings updated.');
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}



/* ═══════════════════════════════════════════════
   GLOBAL EXPORTS
   ═══════════════════════════════════════════════ */

function showPerformanceInsights() {
  if (!_resultsFinalData || !_resultsFinalData.students || _resultsFinalData.students.length === 0) {
    Toast.warning('No Data', 'No student results loaded.');
    return;
  }
  
  const students = [..._resultsFinalData.students];
  const subjects = _resultsFinalData.subjects;
  
  // 1. Toppers
  const sortedByPct = students.filter(s => s.overallPct !== null).sort((a,b) => b.overallPct - a.overallPct);
  const toppers = sortedByPct.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  
  // 2. Subject Stats
  const subjectStats = subjects.map(sub => {
    let totalScore = 0;
    let highestScore = 0;
    let highestScorer = '—';
    let count = 0;
    let passCount = 0;
    
    students.forEach(sr => {
      const subRes = sr.subjectResults?.find(s => s.subject_id === sub.id);
      if (subRes && subRes.obtained !== null && !subRes.is_absent) {
        const score = subRes.obtained;
        totalScore += score;
        count++;
        
        if (score > highestScore) {
          highestScore = score;
          highestScorer = sr.student.name;
        }
        
        if (subRes.pass_fail !== 'FAIL') {
          passCount++;
        }
      }
    });
    
    const avg = count > 0 ? (totalScore / count).toFixed(1) : '—';
    const passRate = count > 0 ? Math.round((passCount / count) * 100) : 0;
    
    return {
      name: sub.name,
      avg,
      max: sub.max_marks,
      highest: count > 0 ? `${highestScore} (${highestScorer.split(' ')[0]})` : '—',
      passRate
    };
  });
  
  const toppersHTML = toppers.map((t, idx) => `
    <div class="stat-card hover-lift" style="display:flex;align-items:center;gap:12px;border:1px solid var(--border);padding:12px;background:var(--bg-surface)">
      <div style="font-size:2rem;line-height:1">${medals[idx]}</div>
      <div style="flex:1">
        <div style="font-weight:700;color:var(--text-primary);font-size:0.95rem">${t.student.name}</div>
        <div class="text-xs text-muted mt-1">Roll Number: ${t.student.roll_number}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:1.1rem;font-weight:800;color:var(--accent)">${t.overallPct.toFixed(1)}%</div>
        <div class="text-xs text-muted mt-1">Rank #${idx + 1}</div>
      </div>
    </div>
  `).join('');
  
  const subjectRowsHTML = subjectStats.map(s => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px;font-weight:600;color:var(--text-primary)">${s.name}</td>
      <td style="padding:10px;text-align:center">${s.avg} / ${s.max}</td>
      <td style="padding:10px;text-align:center;font-weight:600;color:var(--success)">${s.highest}</td>
      <td style="padding:10px;text-align:center">
        <span class="badge ${s.passRate >= 75 ? 'badge-success' : s.passRate >= 50 ? 'badge-warning' : 'badge-danger'}">${s.passRate}%</span>
      </td>
    </tr>
  `).join('');
  
  createModal('performance-insights-modal', `Class Performance Insights — ${_resultsFinalData.standard.display_name}`,
    `<div style="display:flex;flex-direction:column;gap:20px">
      <div>
        <h3 style="font-size:0.9rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">🏆 Class Toppers</h3>
        <div class="grid grid-3 gap-3">
          ${toppersHTML || '<div class="text-muted text-sm">No toppers data available.</div>'}
        </div>
      </div>
      
      <div>
        <h3 style="font-size:0.9rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">📚 Subject Performance Stats</h3>
        <div class="table-wrap">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:2px solid var(--border)">
                <th style="padding:10px;text-align:left">Subject</th>
                <th style="padding:10px;text-align:center">Average Score</th>
                <th style="padding:10px;text-align:center">Highest Scorer</th>
                <th style="padding:10px;text-align:center">Subject Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              ${subjectRowsHTML}
            </tbody>
          </table>
        </div>
      </div>
    </div>`,
    `<button class="btn btn-primary" onclick="closeModal('performance-insights-modal')">Close</button>`,
    'modal-lg'
  );
}

window.renderResults = renderResults;
window.loadResultsForClass = loadResultsForClass;
window.selectExamBox = selectExamBox;
window.toggleStudentExpand = toggleStudentExpand;
window.toggleExpandAllStudents = toggleExpandAllStudents;
window.previewStudentCard = previewStudentCard;
window.downloadBulkPDF = downloadBulkPDF;
window.downloadClassExcel = downloadClassExcel;
window.showResultSettings = showResultSettings;
window.selectQuickTemplate = selectQuickTemplate;
window.saveResultSettings = saveResultSettings;
window.openCompareSeriesModal = openCompareSeriesModal;
window.runCompareSeriesAnalysis = runCompareSeriesAnalysis;
window.openCompareStudentsModal = openCompareStudentsModal;
window.updateStudentPickerItem = updateStudentPickerItem;
window.filterStudentPicker = filterStudentPicker;
window.runCompareStudentsAnalysis = runCompareStudentsAnalysis;
window.showPerformanceInsights = showPerformanceInsights;
