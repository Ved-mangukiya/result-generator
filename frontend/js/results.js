/* ═══════════════════════════════════════════════
   RESULTS.JS — Result Generation & Preview
   ═══════════════════════════════════════════════ */

let _resultsStandardId = null;
let _resultsFinalData = null;
let _resultsTestCycles = [];
let _resultsStandaloneTests = [];
let _activeBoxType = 'final'; // 'final', 'cycle', 'test'
let _activeBoxId = null;

async function renderResults(params = {}) {
  setPageTitle('Results', 'Results');
  _resultsStandardId = params.standardId || null;

  // Inject custom premium styles for interactive cells if not present
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
        <h1>Results</h1>
        <p>View computed results, preview cards, and export PDFs</p>
      </div>
    </div>

    <!-- Class Selector -->
    <div class="card mb-6">
      <div class="card-body" style="padding:var(--space-5)">
        <div class="flex gap-4 flex-wrap items-center">
          <div class="form-group" style="flex:1;min-width:200px">
            <label class="form-label">Select Class</label>
            <select class="form-control" id="results-std-select" onchange="loadResultsForClass(this.value)">
              <option value="">— Select a class to view results —</option>
            </select>
          </div>
          <div id="results-actions" class="flex gap-2 flex-wrap" style="margin-top:20px;display:none!important">
            <button class="btn btn-outline btn-sm" onclick="showResultSettings()">⚙ Card Settings</button>
            <button class="btn btn-outline btn-sm" onclick="downloadClassExcel()">📊 Export Excel</button>
            <button class="btn btn-primary btn-sm" onclick="downloadBulkPDF()">📥 Bulk PDF</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Table -->
    <div id="results-container">
      <div class="empty-state" style="height:400px">
        <div class="empty-state-icon">📋</div>
        <h3>Select a Class</h3>
        <p>Choose a class from the dropdown above to see results and export options.</p>
      </div>
    </div>`;

  await loadResultsStandardDropdown();
  if (_resultsStandardId) {
    document.getElementById('results-std-select').value = _resultsStandardId;
    await loadResultsForClass(_resultsStandardId);
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

async function loadResultsForClass(standardId) {
  if (!standardId) return;
  _resultsStandardId = parseInt(standardId);

  const container = document.getElementById('results-container');
  container.innerHTML = `<div class="empty-state"><div class="animate-pulse" style="font-size:2rem">📊</div><p class="text-muted text-sm mt-2">Loading exam cycles and tests...</p></div>`;

  try {
    // Show action buttons
    const actionsEl = document.getElementById('results-actions');
    actionsEl.style.display = 'flex';

    // Fetch data in parallel
    const [finalData, testCycles, tests] = await Promise.all([
      API.export.results(standardId),
      API.testCycles.list(standardId),
      API.tests.list(standardId)
    ]);

    _resultsFinalData = finalData;
    _resultsTestCycles = testCycles;
    _resultsStandaloneTests = tests.filter(t => !t.cycle_id);

    renderExamBoxes();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error Loading Results</h3><p>${err.message}</p></div>`;
    Toast.error('Results Error', err.message);
  }
}

function renderExamBoxes() {
  const container = document.getElementById('results-container');
  
  const boxes = [];
  // 1. Final Exam Box
  boxes.push({
    type: 'final',
    id: null,
    icon: '🏆',
    title: 'Final Board Exam',
    subtitle: 'Overall Coaching Results'
  });

  // 2. Test Cycles
  _resultsTestCycles.forEach(c => {
    boxes.push({
      type: 'cycle',
      id: c.id,
      icon: '🗓',
      title: c.title,
      subtitle: `${c.total_tests} Tests · Max ${c.max_marks}m`
    });
  });

  // 3. Standalone Tests
  _resultsStandaloneTests.forEach(t => {
    boxes.push({
      type: 'test',
      id: t.id,
      icon: '📑',
      title: t.name,
      subtitle: `${t.subject_name} · Max ${t.max_marks}m`
    });
  });

  const boxesHTML = boxes.map(b => {
    const isActive = _activeBoxType === b.type && _activeBoxId === b.id;
    const borderStyle = isActive ? 'border-color: var(--primary-light); box-shadow: 0 0 12px rgba(37, 99, 235, 0.15); background: var(--bg-surface)' : 'background: var(--bg-surface)';
    const textStyle = isActive ? 'color: var(--primary-light)' : '';
    return `
      <div class="card hover-lift cursor-pointer p-4 stagger-item" onclick="selectExamBox('${b.type}', ${b.id})" style="border: 2px solid ${isActive ? 'var(--primary-light)' : 'var(--border)'}; ${borderStyle}; min-width: 220px; transition: all 0.2s ease">
        <div class="flex items-center gap-3">
          <div style="font-size: 1.5rem">${b.icon}</div>
          <div style="overflow:hidden">
            <h4 style="font-weight: 700; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${textStyle}">${b.title}</h4>
            <p class="text-xs text-muted" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.subtitle}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <h3 class="mb-3" style="font-weight:600; font-size:0.9rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em">Select Exam / Test Series to View & Edit Results:</h3>
    <div style="display:flex; gap:12px; overflow-x:auto; padding-bottom:12px;" class="mb-6">
      ${boxesHTML}
    </div>
    <div id="results-table-container">
      <!-- Active table will be loaded here -->
    </div>
  `;

  loadActiveExamTable();
}

function selectExamBox(type, id) {
  _activeBoxType = type;
  _activeBoxId = id;
  renderExamBoxes();
}

async function loadActiveExamTable() {
  const tableContainer = document.getElementById('results-table-container');
  tableContainer.innerHTML = `<div class="empty-state" style="padding:var(--space-8)"><div class="animate-pulse" style="font-size:1.5rem">📊</div><p class="text-muted text-sm mt-1">Loading selection results...</p></div>`;

  try {
    if (_activeBoxType === 'final') {
      renderFinalResultsTable();
    } else if (_activeBoxType === 'cycle') {
      const cycleData = await API.testCycles.results(_activeBoxId);
      renderCycleResultsTable(cycleData);
    } else if (_activeBoxType === 'test') {
      const testData = await API.tests.getMarks(_activeBoxId);
      renderTestResultsTable(testData);
    }
  } catch (err) {
    tableContainer.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error Loading Table</h3><p>${err.message}</p></div>`;
  }
}

function renderFinalResultsTable() {
  const { standard, subjects, students } = _resultsFinalData;
  const tableContainer = document.getElementById('results-table-container');

  if (students.length === 0) {
    tableContainer.innerHTML = `<div class="empty-state"><h3>No Student Records</h3><p>There are no students enrolled in this class.</p></div>`;
    return;
  }

  const avgPct = students.length > 0
    ? (students.reduce((s, r) => s + (r.overallPct || 0), 0) / students.length).toFixed(1)
    : 0;
  const passCount = students.filter(s => s.finalStatus !== 'Fail' && s.finalStatus !== 'Pending').length;
  const failCount = students.filter(s => s.finalStatus === 'Fail').length;

  const tableHeaders = `
    <tr>
      <th>Rank</th>
      <th>Roll No.</th>
      <th>Name</th>
      ${subjects.map(s => `<th title="${s.name}">${s.name.split(' ')[0]}</th>`).join('')}
      <th>Total</th>
      <th>%</th>
      <th>Grade</th>
      <th>Result</th>
      <th>Actions</th>
    </tr>
  `;

  const tableRows = students.map(sr => {
    const statusClass = getStatusClass(sr.finalStatus);
    return `
      <tr>
        <td style="font-weight:700;color:var(--accent)">#${sr.rank}</td>
        <td><span class="badge badge-gray">${sr.student.roll_number}</span></td>
        <td class="td-primary">${sr.student.name}</td>
        ${subjects.map(sub => {
          const subRes = sr.subjectResults?.find(s => s.subject_id === sub.id);
          const isOptional = sub.is_compulsory === 0;
          
          let electiveIds = [];
          if (sr.student.elective_subjects) {
            try {
              const parsed = typeof sr.student.elective_subjects === 'string'
                ? JSON.parse(sr.student.elective_subjects)
                : sr.student.elective_subjects;
              if (Array.isArray(parsed)) {
                electiveIds.push(...parsed.map(el => typeof el === 'object' ? el.id : el));
              }
            } catch(e) {}
          }
          const isSelected = !isOptional || electiveIds.includes(sub.id);

          if (!isSelected) return `<td style="background:var(--bg-elevated); opacity:0.65; text-align:center"><span style="font-size:0.7rem; color:var(--text-muted)">—</span></td>`;
          
          if (sub.marks_type === 'split') {
            const intVal = subRes?.internal_marks !== null && subRes?.internal_marks !== undefined ? subRes.internal_marks : '—';
            const extVal = subRes?.external_marks !== null && subRes?.external_marks !== undefined ? subRes.external_marks : '—';
            return `
              <td style="text-align:center">
                <span class="editable-sub-cell pointer-edit-cell" data-student-id="${sr.student.id}" data-subject-id="${sub.id}" data-part="int" data-max="${sub.internal_max}" title="Double click to edit Internal Marks">${intVal}</span>
                <span style="color:var(--border-medium)">/</span>
                <span class="editable-sub-cell pointer-edit-cell" data-student-id="${sr.student.id}" data-subject-id="${sub.id}" data-part="ext" data-max="${sub.external_max}" title="Double click to edit External Marks">${extVal}</span>
              </td>
            `;
          } else {
            const totVal = subRes?.obtained !== null && subRes?.obtained !== undefined ? subRes.obtained : '—';
            const valStyle = subRes?.pass_fail === 'FAIL' ? 'font-weight:700;color:var(--danger)' : '';
            return `
              <td style="text-align:center; ${valStyle}">
                <span class="editable-sub-cell pointer-edit-cell" data-student-id="${sr.student.id}" data-subject-id="${sub.id}" data-part="total" data-max="${sub.max_marks}" title="Double click to edit Marks">${totVal}</span>
              </td>
            `;
          }
        }).join('')}
        <td class="td-primary">${sr.totalObtained}/${sr.totalMaxMarks}</td>
        <td><span class="font-semibold" style="color:${sr.overallGradeColor || 'inherit'}">${sr.overallPct !== null ? sr.overallPct.toFixed(1) + '%' : '—'}</span></td>
        <td style="color:${sr.overallGradeColor || 'inherit'};font-weight:700">${sr.overallGrade}</td>
        <td><span class="badge ${statusClass}">${sr.finalStatus}</span></td>
        <td>
          <div class="td-actions">
            <button class="btn btn-ghost btn-icon-sm" onclick="previewStudentCard(${sr.student.id})" title="Preview Card">👁</button>
            <a class="btn btn-ghost btn-icon-sm" href="${API.export.pdfSingle(sr.student.id)}" title="Download PDF" download>📄</a>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tableContainer.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Final Coaching Board Exam Results</h3>
        <div class="flex gap-2">
          <span class="badge badge-primary">Avg: ${avgPct}%</span>
          <span class="badge badge-success">Pass: ${passCount}</span>
          <span class="badge badge-danger">Fail: ${failCount}</span>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>${tableHeaders}</thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCycleResultsTable(cycleData) {
  const { cycle, tests, students } = cycleData;
  const tableContainer = document.getElementById('results-table-container');

  if (students.length === 0) {
    tableContainer.innerHTML = `<div class="empty-state"><h3>No Student Records</h3><p>There are no students enrolled in this class.</p></div>`;
    return;
  }

  const tableHeaders = `
    <tr>
      <th>Roll No.</th>
      <th>Name</th>
      ${tests.map(t => `<th title="${t.subject_name}">${t.subject_name.split(' ')[0]}<br><small style="font-weight:400;color:var(--text-muted)">Max: ${t.max_marks}</small></th>`).join('')}
      <th>Total</th>
      <th>%</th>
    </tr>
  `;

  const tableRows = students.map(sr => {
    return `
      <tr>
        <td><span class="badge badge-gray">${sr.roll_number}</span></td>
        <td class="td-primary">${sr.name}</td>
        ${tests.map(test => {
          const res = sr.testResults.find(r => r.test_id === test.id);
          const isOptional = test.is_compulsory === 0;
          const val = res && res.obtained !== null ? res.obtained : (res?.is_absent ? 'AB' : '—');
          
          let electiveIds = [];
          if (sr.elective_subjects) {
            try {
              const parsed = typeof sr.elective_subjects === 'string'
                ? JSON.parse(sr.elective_subjects)
                : sr.elective_subjects;
              if (Array.isArray(parsed)) {
                electiveIds.push(...parsed.map(el => typeof el === 'object' ? el.id : el));
              }
            } catch(e) {}
          }
          const isElected = res ? res.entered || !isOptional : true; 
          
          if (!isElected) {
            return `<td style="background:var(--bg-elevated); opacity:0.65; text-align:center"><span style="font-size:0.7rem; color:var(--text-muted)">—</span></td>`;
          }

          const abClass = val === 'AB' ? 'badge badge-warning' : '';
          return `
            <td style="text-align:center">
              <span class="editable-sub-cell pointer-edit-cell ${abClass}" data-student-id="${sr.student_id}" data-test-id="${test.id}" data-part="test" data-max="${test.max_marks}" title="Double click to edit score">${val}</span>
            </td>
          `;
        }).join('')}
        <td class="td-primary">${sr.total}/${sr.maxTotal}</td>
        <td><span class="font-semibold">${sr.pct !== null ? sr.pct + '%' : '—'}</span></td>
      </tr>
    `;
  }).join('');

  tableContainer.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Grouped Test Cycle: ${cycle.title}</h3>
        <span class="badge badge-gold">Max Marks: ${cycle.max_marks}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>${tableHeaders}</thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTestResultsTable(testData) {
  const { test, marks } = testData;
  const tableContainer = document.getElementById('results-table-container');

  if (marks.length === 0) {
    tableContainer.innerHTML = `<div class="empty-state"><h3>No Student Records</h3><p>There are no students enrolled in this class.</p></div>`;
    return;
  }

  const passMarkPct = 35;
  const totalScored = marks.filter(m => !m.is_absent && m.obtained_marks !== null).length;
  const passCount = marks.filter(m => !m.is_absent && m.obtained_marks !== null && (m.obtained_marks / test.max_marks * 100 >= passMarkPct)).length;
  const passRate = totalScored > 0 ? Math.round((passCount / totalScored) * 100) : 0;

  const tableHeaders = `
    <tr>
      <th>Roll No.</th>
      <th>Name</th>
      <th style="width:25%; text-align:center">Score (Max: ${test.max_marks})</th>
      <th style="width:20%; text-align:center">Percentage</th>
      <th style="width:15%; text-align:center">Status</th>
      <th style="width:25%">Remarks</th>
    </tr>
  `;

  const tableRows = marks.map(m => {
    const isOptional = test.is_compulsory === 0;
    let chosenElectiveIds = [];
    if (m.elective_subjects) {
      try {
        const parsed = typeof m.elective_subjects === 'string'
          ? JSON.parse(m.elective_subjects)
          : m.elective_subjects;
        if (Array.isArray(parsed)) {
          chosenElectiveIds = parsed.map(el => typeof el === 'object' ? el.id : el);
        }
      } catch(e) {}
    }
    const isElected = !isOptional || chosenElectiveIds.includes(test.subject_id);

    if (!isElected) {
      return `
        <tr style="opacity: 0.65; background: var(--bg-elevated);">
          <td><span class="badge badge-gray">${m.roll_number}</span></td>
          <td class="td-primary">${m.student_name}</td>
          <td colspan="4" style="text-align:center; color:var(--text-muted); font-size:0.8rem">Not Enrolled in Elective Subject</td>
        </tr>
      `;
    }

    const val = m.is_absent ? 'AB' : (m.obtained_marks !== null ? m.obtained_marks : '—');
    const pct = m.is_absent ? '—' : (m.obtained_marks !== null ? ((m.obtained_marks / test.max_marks) * 100).toFixed(1) + '%' : '—');
    const statusText = m.is_absent ? 'Absent' : (m.obtained_marks !== null ? (m.obtained_marks / test.max_marks * 100 >= passMarkPct ? 'Pass' : 'Fail') : 'Pending');
    
    let statusClass = 'badge-gray';
    if (statusText === 'Pass') statusClass = 'badge-success';
    else if (statusText === 'Fail') statusClass = 'badge-danger';
    else if (statusText === 'Absent') statusClass = 'badge-warning';

    const valClass = val === 'AB' ? 'badge badge-warning' : '';

    return `
      <tr>
        <td><span class="badge badge-gray">${m.roll_number}</span></td>
        <td class="td-primary">${m.student_name}</td>
        <td style="text-align:center">
          <span class="editable-sub-cell pointer-edit-cell ${valClass}" data-student-id="${m.student_id}" data-test-id="${test.id}" data-part="test" data-max="${test.max_marks}" title="Double click to edit score">${val}</span>
        </td>
        <td style="text-align:center; font-weight:600">${pct}</td>
        <td style="text-align:center"><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          <span class="editable-remarks-cell pointer-edit-cell" data-student-id="${m.student_id}" data-test-id="${test.id}" title="Double click to edit remarks">${m.remarks || '—'}</span>
        </td>
      </tr>
    `;
  }).join('');

  tableContainer.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3>Standalone Test: ${test.name}</h3>
          <span class="badge badge-primary" style="margin-top:4px">${test.subject_name}</span>
        </div>
        <div class="flex gap-2">
          <span class="badge badge-success">Pass Rate: ${passRate}%</span>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>${tableHeaders}</thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// Inline Editing double-click handler
document.addEventListener('dblclick', (e) => {
  const cell = e.target.closest('.editable-sub-cell') || e.target.closest('.editable-remarks-cell');
  if (!cell) return;
  if (cell.querySelector('input')) return; // Already editing

  const isRemarks = cell.classList.contains('editable-remarks-cell');
  const studentId = parseInt(cell.dataset.studentId);
  const subjectId = cell.dataset.subjectId ? parseInt(cell.dataset.subjectId) : null;
  const testId = cell.dataset.testId ? parseInt(cell.dataset.testId) : null;
  const part = cell.dataset.part;
  const maxVal = parseFloat(cell.dataset.max || 100);
  
  const currentValue = cell.textContent.trim();

  let input;
  if (isRemarks) {
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control inline-edit-input';
    input.value = currentValue === '—' ? '' : currentValue;
    input.style.cssText = 'width:100%; padding:4px 8px; height:30px; border-radius:var(--radius-sm)';
  } else {
    input = document.createElement('input');
    input.type = 'text'; // Allow AB or numbers
    input.className = 'form-control inline-edit-input';
    input.value = currentValue === '—' ? '' : currentValue;
    input.style.cssText = 'width:70px; padding:2px 4px; display:inline-block; height:28px; text-align:center; font-weight:700; border-radius:var(--radius-sm)';
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

    if (newValue === currentValue) {
      cell.textContent = currentValue;
      return;
    }

    try {
      if (isRemarks) {
        // Save standalone test remarks
        const marksRes = await API.tests.getMarks(testId);
        const existingMark = marksRes.marks.find(m => m.student_id === studentId);
        const marksToSave = [{
          student_id: studentId,
          obtained_marks: existingMark?.is_absent ? null : (existingMark?.obtained_marks !== null && existingMark?.obtained_marks !== undefined ? existingMark.obtained_marks : null),
          is_absent: !!existingMark?.is_absent,
          remarks: newValue
        }];
        await API.tests.saveMarks(testId, marksToSave);
      } else if (part === 'test') {
        // Save test marks (cycles or standalone)
        const isAbsent = ['AB', 'ABS', 'ABSENT', 'A'].includes(newValue.toUpperCase());
        let obtained = null;
        if (!isAbsent && newValue !== '') {
          obtained = parseFloat(newValue);
          if (isNaN(obtained)) throw new Error('Enter a valid number or AB for absent');
          if (obtained > maxVal) obtained = maxVal;
          if (obtained < 0) obtained = 0;
        }
        const marksToSave = [{
          student_id: studentId,
          obtained_marks: obtained,
          is_absent: isAbsent,
          remarks: ''
        }];
        await API.tests.saveMarks(testId, marksToSave);
      } else {
        // Save final exam subject score
        const isAbsent = ['AB', 'ABS', 'ABSENT', 'A'].includes(newValue.toUpperCase());
        let val = null;
        if (!isAbsent && newValue !== '') {
          val = parseFloat(newValue);
          if (isNaN(val)) throw new Error('Enter a valid number or AB for absent');
          if (val > maxVal) val = maxVal;
          if (val < 0) val = 0;
        }

        const studentRow = _resultsFinalData.students.find(s => s.student.id === studentId);
        const subRes = studentRow?.subjectResults?.find(s => s.subject_id === subjectId);
        
        let total = val;
        let internal = subRes?.internal_marks ?? null;
        let external = subRes?.external_marks ?? null;
        
        if (part === 'int') {
          internal = val;
          total = (internal !== null && external !== null) ? internal + external : (internal ?? total);
        } else if (part === 'ext') {
          external = val;
          total = (internal !== null && external !== null) ? internal + external : (external ?? total);
        }

        const marksPayload = [{
          subject_id: subjectId,
          total_marks: total,
          internal_marks: internal,
          external_marks: external,
          is_absent: isAbsent
        }];
        
        await API.students.saveMarks(studentId, marksPayload);
      }

      // Success visual flash feedback
      cell.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
      cell.style.transition = 'background-color 0.1s ease';
      setTimeout(() => {
        cell.style.backgroundColor = '';
        cell.style.transition = 'background-color 0.8s ease';
      }, 200);

      Toast.success('Saved', 'Marks updated successfully');

      // Reload fresh calculations and redraw
      if (_activeBoxType === 'final') {
        _resultsFinalData = await API.export.results(_resultsStandardId);
      }
      loadActiveExamTable();

    } catch (err) {
      Toast.error('Save Error', err.message);
      cell.textContent = currentValue;
      if (currentValue === 'AB') {
        cell.className = 'editable-sub-cell pointer-edit-cell badge badge-warning';
      }
    }
  }

  input.addEventListener('blur', finishEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      finished = true;
      cell.textContent = currentValue;
      if (currentValue === 'AB') {
        cell.className = 'editable-sub-cell pointer-edit-cell badge badge-warning';
      }
    }
  });
});

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
    const overlay = createModal('card-preview', '👁 Result Card Preview',
      `<div id="preview-viewport-container" style="display:flex; justify-content:center; align-items:center; background:#0f172a; padding:20px; transition:all 0.3s ease; overflow:auto; max-height:700px; border-radius:var(--radius)">
         <iframe id="preview-iframe" style="width:210mm; height:297mm; max-height:650px; background:white; border:none; box-shadow:0 10px 25px rgba(0,0,0,0.5); transition:all 0.3s ease" srcdoc="${html.replace(/"/g, '&quot;')}"></iframe>
       </div>`,
      `<button class="btn btn-outline" onclick="closeModal('card-preview')">Close</button>
       <a class="btn btn-primary" href="${API.export.pdfSingle(studentId)}" download>⬇ Download PDF</a>`,
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
    const url = API.export.pdfBulk(_resultsStandardId);
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.click();
    setTimeout(() => Spinner.hide(), 3000);
    Toast.info('Downloading', 'Your bulk PDF is being generated and will download shortly.');
  } catch (err) {
    Spinner.hide();
    Toast.error('Export Failed', err.message);
  }
}

function downloadClassExcel() {
  if (!_resultsStandardId) return;
  const url = API.export.excel(_resultsStandardId);
  window.location.href = url;
  Toast.success('Downloading', 'Excel export will download shortly.');
}

async function showResultSettings() {
  if (!_resultsStandardId) return;
  const settings = await API.standards.getSettings(_resultsStandardId);
  const cats = typeof settings.result_categories === 'string'
    ? JSON.parse(settings.result_categories)
    : settings.result_categories || [];

  createModal('result-settings', '⚙ Result Card Settings',
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
     <button class="btn btn-primary" onclick="saveResultSettings(${_resultsStandardId})">💾 Save Settings</button>`,
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

window.renderResults = renderResults;
window.loadResultsForClass = loadResultsForClass;
window.previewStudentCard = previewStudentCard;
window.downloadBulkPDF = downloadBulkPDF;
window.downloadClassExcel = downloadClassExcel;
window.showResultSettings = showResultSettings;
window.selectQuickTemplate = selectQuickTemplate;
window.saveResultSettings = saveResultSettings;
