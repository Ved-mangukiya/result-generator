/* ═══════════════════════════════════════════════
   TESTS.JS — Small Test Tracker UI & Logic
   ═══════════════════════════════════════════════ */

let _testsStandardId = null;
let _testsList = [];
let _currentTestMarksData = null;

let _currentTestsTab = 'individual'; // 'individual', 'cycles', 'school'

async function renderTests(params = {}) {
  setPageTitle('Test Scheduler', 'Test Scheduler');
  _testsStandardId = params.standardId || null;

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Test Scheduler</h1>
        <p>Record weekly unit tests or schedule complete exam timetables (cycles) across multiple subjects.</p>
      </div>
      <div class="page-header-actions" id="tests-header-actions" style="display:none">
        <button class="btn btn-outline btn-sm" id="btn-ai-schedule" onclick="showAISchedulerModal()" style="margin-right:8px">🤖 AI Auto-Scheduler</button>
        <button class="btn btn-primary btn-sm" id="btn-create-test" onclick="triggerTestCreationAction()">➕ Create Test</button>
      </div>
    </div>

    <!-- Class Selector -->
    <div class="card mb-6">
      <div class="card-body" style="padding:var(--space-5)">
        <div class="flex gap-4 flex-wrap items-center">
          <div class="form-group" style="flex:1;min-width:200px">
            <label class="form-label">Select Class</label>
            <select class="form-control" id="tests-std-select" onchange="loadTestsTabContent(this.value)">
              <option value="">— Select a class to manage exams —</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- ERP Navigation Tabs -->
    <div class="tabs mb-6" id="tests-tabs" style="display:none">
      <button class="btn ${_currentTestsTab === 'individual' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tests-individual" onclick="switchTestsTab('individual')">📑 Individual Tests</button>
      <button class="btn ${_currentTestsTab === 'cycles' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tests-cycles" onclick="switchTestsTab('cycles')">🗓 Grouped Test Cycles</button>
      <button class="btn ${_currentTestsTab === 'school' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tests-school" onclick="switchTestsTab('school')">🏫 School Exams</button>
    </div>

    <!-- Tests List Container -->
    <div id="tests-container">
      <div class="empty-state" style="height:350px">
        <div class="empty-state-icon">📝</div>
        <h3>Select a Class</h3>
        <p>Choose a class from the dropdown above to manage tests.</p>
      </div>
    </div>`;

  await loadTestsStandardDropdown();
  if (_testsStandardId) {
    document.getElementById('tests-std-select').value = _testsStandardId;
    await loadTestsTabContent(_testsStandardId);
  }
}

async function loadTestsTabContent(standardId) {
  if (!standardId) {
    document.getElementById('tests-header-actions').style.display = 'none';
    document.getElementById('tests-tabs').style.display = 'none';
    document.getElementById('tests-container').innerHTML = `
      <div class="empty-state" style="height:350px">
        <div class="empty-state-icon">📝</div>
        <h3>Select a Class</h3>
        <p>Choose a class from the dropdown above to manage tests.</p>
      </div>`;
    return;
  }
  
  _testsStandardId = parseInt(standardId);
  document.getElementById('tests-header-actions').style.display = 'block';
  document.getElementById('tests-tabs').style.display = 'flex';
  
  await switchTestsTab(_currentTestsTab);
}

function triggerTestCreationAction() {
  if (_currentTestsTab === 'individual') {
    showCreateTestModal();
  } else if (_currentTestsTab === 'cycles') {
    showCreateTestCycleModal();
  } else {
    showAddSchoolExamModal();
  }
}

async function switchTestsTab(tab) {
  _currentTestsTab = tab;
  
  const btnInd = document.getElementById('btn-tests-individual');
  const btnCyc = document.getElementById('btn-tests-cycles');
  const btnSch = document.getElementById('btn-tests-school');
  const btnCreate = document.getElementById('btn-create-test');
  const btnAI = document.getElementById('btn-ai-schedule');
  
  if (btnInd) btnInd.className = `btn ${tab === 'individual' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnCyc) btnCyc.className = `btn ${tab === 'cycles' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnSch) btnSch.className = `btn ${tab === 'school' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  
  if (btnCreate) {
    if (tab === 'school') {
      btnCreate.textContent = '➕ Add School Exam';
      btnCreate.style.display = 'block';
    } else {
      btnCreate.textContent = tab === 'individual' ? '➕ Create Test' : '➕ Schedule Test Cycle';
      btnCreate.style.display = 'block';
    }
  }
  if (btnAI) {
    btnAI.style.display = tab === 'school' ? 'none' : 'inline-block';
  }
  
  const container = document.getElementById('tests-container');
  if (!container) return;
  
  if (tab === 'individual') {
    await loadTestsForClass(_testsStandardId);
  } else if (tab === 'cycles') {
    await loadTestCyclesForClass(_testsStandardId);
  } else {
    await loadSchoolExamsForClass(_testsStandardId);
  }
}

async function loadTestsStandardDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('tests-std-select');
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

async function loadTestsForClass(standardId) {
  if (!standardId) {
    document.getElementById('tests-header-actions').style.display = 'none';
    document.getElementById('tests-container').innerHTML = `
      <div class="empty-state" style="height:350px">
        <div class="empty-state-icon">📝</div>
        <h3>Select a Class</h3>
        <p>Choose a class from the dropdown above to manage small tests.</p>
      </div>`;
    return;
  }

  _testsStandardId = parseInt(standardId);
  document.getElementById('tests-header-actions').style.display = 'block';

  const container = document.getElementById('tests-container');
  container.innerHTML = `
    <div class="empty-state">
      <div class="animate-pulse" style="font-size:2rem">📝</div>
      <p class="text-muted text-sm mt-2">Loading tests...</p>
    </div>`;

  try {
    _testsList = await API.tests.list(_testsStandardId);
    
    if (_testsList.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="height:300px">
          <div class="empty-state-icon">📋</div>
          <h3>No Tests Recorded</h3>
          <p>Create your first test (e.g. 25 marks, 30 marks) to record student marks for this class.</p>
          <button class="btn btn-primary mt-2" onclick="showCreateTestModal()">➕ Create Test</button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="grid grid-auto gap-4">
        ${_testsList.map(test => {
          let statusColor = 'var(--text-muted)';
          if (test.status === 'Scheduled') statusColor = '#93c5fd';
          else if (test.status === 'Ongoing') statusColor = '#fbbf24';
          else if (test.status === 'Completed') statusColor = '#4ade80';
          else if (test.status === 'Cancelled') statusColor = '#f87171';

          return `
          <div class="card hover-lift stagger-item" style="border: 1px solid var(--border-medium); border-left: 4px solid var(--primary-light);">
            <div class="card-body p-4 flex flex-col justify-between" style="height: 100%;">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="badge badge-primary">${test.subject_name}</span>
                  <span class="badge badge-gold" style="font-weight: 700;">Max: ${test.max_marks}</span>
                </div>
                <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary);" class="mb-1">${test.name}</h3>
                <p class="text-xs text-muted mb-2">📅 Test Date: ${Format.date(test.test_date)}</p>
                
                <div class="flex gap-2 flex-wrap mb-3" style="align-items:center">
                  <span class="badge" style="background:rgba(255,255,255,0.05); border: 1px solid var(--border); font-size:0.65rem">${test.exam_mode || 'Offline'}</span>
                  <span class="badge" style="background:rgba(255,255,255,0.05); color:${statusColor}; font-size:0.65rem; border: 1px solid ${statusColor}40">${test.status || 'Scheduled'}</span>
                  
                  ${test.notice_generated === 1 
                    ? `<span class="badge" style="background:rgba(34,197,94,0.1); color:#4ade80; font-size:0.65rem">✓ Notice Generated</span>`
                    : `<span class="badge" style="background:rgba(245,158,11,0.15); color:#fbbf24; font-size:0.65rem; cursor:pointer; border:1px dashed #fbbf24" onclick="navigateToPrefilledReminder(${test.id})" title="Click to prefill & generate Timetable/Notice PDF">⚠️ No Notice Generated</span>`}
                </div>
                
                ${test.syllabus ? `<p class="text-xs text-secondary mb-2" style="background:rgba(0,0,0,0.1); padding:6px; border-radius:var(--radius); font-style:italic">📖 ${test.syllabus}</p>` : ''}
              </div>
              
              <div class="divider" style="margin: var(--space-2) 0;"></div>
              
              <div>
                <div class="grid grid-2 gap-2 mb-3">
                  <button class="btn btn-outline btn-sm w-full" onclick="showTestMarksEntry(${test.id})" style="padding: var(--space-2) 0;">📝 Enter Marks</button>
                  <button class="btn btn-outline btn-sm w-full" onclick="showTestImportModal(${test.id})" style="padding: var(--space-2) 0;">📥 Import Excel</button>
                </div>
                
                <div class="flex justify-between items-center gap-1">
                  <button class="btn btn-ghost btn-icon-sm" onclick="showTestWhatsAppModal(${test.id})" title="Share to WhatsApp">💬</button>
                  <a class="btn btn-ghost btn-icon-sm" href="/api/tests/${test.id}/export/pdf" target="_blank" title="Export PDF Report" download>📄</a>
                  <a class="btn btn-ghost btn-icon-sm" href="/api/tests/${test.id}/export/excel" target="_blank" title="Export Excel Sheet" download>📊</a>
                  <div style="margin-left: auto;" class="flex gap-1">
                    <button class="btn btn-ghost btn-icon-sm" onclick="showEditTestModal(${test.id})" title="Edit Details">✏️</button>
                    <button class="btn btn-ghost btn-icon-sm" onclick="confirmDeleteTest(${test.id}, '${test.name}')" title="Delete Test">🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        }).join('')}
      </div>`;
    
    staggerAnimateItems(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error Loading Tests</h3><p>${err.message}</p></div>`;
    Toast.error('Load Failed', err.message);
  }
}

function navigateToPrefilledReminder(testId) {
  const test = _testsList.find(t => t.id === testId);
  if (!test) return;
  if (window.Router) {
    window.Router.navigate('reminders', {
      testId: test.id,
      standardId: test.standard_id,
      testDate: test.test_date,
      subjectName: test.subject_name,
      syllabus: test.syllabus || ''
    });
  }
}

// ─── Create/Edit Test Modal ───────────────────────
async function showCreateTestModal() {
  if (!_testsStandardId) return;
  const subjects = await API.subjects.list(_testsStandardId);

  if (subjects.length === 0) {
    Toast.warning('No Subjects', 'Please add subjects to this class first from the Boards & Classes tab.');
    return;
  }

  const selectHTML = subjects.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('');

  createModal('create-test-modal', '➕ Create New Test',
    `<form id="test-form">
      <div class="form-group mb-4">
        <label class="form-label">Test Name <span class="required">*</span></label>
        <input type="text" class="form-control" id="test-name" placeholder="e.g. Weekly Test 1, Ch-3 Quiz" required>
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Subject <span class="required">*</span></label>
          <select class="form-control" id="test-subject" required>
            ${selectHTML}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Maximum Marks <span class="required">*</span></label>
          <input type="number" class="form-control" id="test-max-marks" placeholder="e.g. 25, 30, 50, 100" min="1" value="25" required>
        </div>
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Test Date</label>
          <input type="date" class="form-control" id="test-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Exam Mode</label>
          <select class="form-control" id="test-exam-mode">
            <option value="Offline">Offline (Written)</option>
            <option value="Online">Online (MCQ)</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Syllabus / Chapters Covered</label>
        <textarea class="form-control" id="test-syllabus" rows="2" placeholder="e.g. Ch-1 Electric Charges, Ch-2 Electrostatics"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Test Status</label>
        <select class="form-control" id="test-status">
          <option value="Scheduled">Scheduled</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>
    </form>`,
    `<button class="btn btn-outline" onclick="closeModal('create-test-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="saveTest()">💾 Create Test</button>`,
    'modal-md'
  );
}

async function showEditTestModal(testId) {
  const test = _testsList.find(t => t.id === testId);
  if (!test) return;

  const subjects = await API.subjects.list(test.standard_id);
  const selectHTML = subjects.map(sub => `
    <option value="${sub.id}" ${sub.id === test.subject_id ? 'selected' : ''}>${sub.name}</option>
  `).join('');

  createModal('edit-test-modal', '✏️ Edit Test Details',
    `<form id="edit-test-form">
      <div class="form-group mb-4">
        <label class="form-label">Test Name <span class="required">*</span></label>
        <input type="text" class="form-control" id="edit-test-name" value="${test.name}" required>
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Subject <span class="required">*</span></label>
          <select class="form-control" id="edit-test-subject" required>
            ${selectHTML}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Maximum Marks <span class="required">*</span></label>
          <input type="number" class="form-control" id="edit-test-max-marks" value="${test.max_marks}" min="1" required>
        </div>
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Test Date</label>
          <input type="date" class="form-control" id="edit-test-date" value="${test.test_date || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Exam Mode</label>
          <select class="form-control" id="edit-test-exam-mode">
            <option value="Offline" ${test.exam_mode === 'Offline' ? 'selected' : ''}>Offline (Written)</option>
            <option value="Online" ${test.exam_mode === 'Online' ? 'selected' : ''}>Online (MCQ)</option>
            <option value="Hybrid" ${test.exam_mode === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
          </select>
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Syllabus / Chapters Covered</label>
        <textarea class="form-control" id="edit-test-syllabus" rows="2">${test.syllabus || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Test Status</label>
        <select class="form-control" id="edit-test-status">
          <option value="Scheduled" ${test.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
          <option value="Ongoing" ${test.status === 'Ongoing' ? 'selected' : ''}>Ongoing</option>
          <option value="Completed" ${test.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${test.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
    </form>`,
    `<button class="btn btn-outline" onclick="closeModal('edit-test-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="saveTest(${testId})">💾 Save Changes</button>`,
    'modal-md'
  );
}

async function saveTest(testId = null) {
  const isEdit = !!testId;
  const prefix = isEdit ? 'edit-test' : 'test';
  
  const name = getVal(`${prefix}-name`);
  const subject_id = getVal(`${prefix}-subject`);
  const max_marks = getVal(`${prefix}-max-marks`);
  const test_date = getVal(`${prefix}-date`);
  const syllabus = getVal(`${prefix}-syllabus`);
  const exam_mode = getVal(`${prefix}-exam-mode`);
  const status = getVal(`${prefix}-status`);

  if (!name || !subject_id || !max_marks) {
    Toast.error('Validation Error', 'Please fill all required fields.');
    return;
  }

  const data = {
    standard_id: _testsStandardId,
    subject_id: parseInt(subject_id),
    name,
    max_marks: parseFloat(max_marks),
    test_date,
    syllabus,
    exam_mode,
    status,
    notice_generated: isEdit ? (_testsList.find(t => t.id === testId)?.notice_generated || 0) : 0
  };

  try {
    if (isEdit) {
      await API.tests.update(testId, data);
      closeModal('edit-test-modal');
      Toast.success('Test Updated', `Test details saved successfully.`);
    } else {
      await API.tests.add(data);
      closeModal('create-test-modal');
      Toast.success('Test Created', `Test was created successfully.`);
    }
    await loadTestsForClass(_testsStandardId);
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

async function confirmDeleteTest(testId, testName) {
  const ok = await Confirm.show(
    `Delete test: ${testName}?`, 
    'All student scores and remarks for this small test will be permanently deleted.', 
    'Delete Test'
  );
  if (!ok) return;

  try {
    await API.tests.delete(testId);
    Toast.success('Test Deleted', 'The test record was removed.');
    await loadTestsForClass(_testsStandardId);
  } catch (err) {
    Toast.error('Delete Failed', err.message);
  }
}

// ─── Rapid Marks Entry Grid (Spreadsheet Style) ──────
async function showTestMarksEntry(testId) {
  Spinner.show('Loading marks grid...');
  try {
    const { test, marks } = await API.tests.getMarks(testId);
    _currentTestMarksData = { test, marks };
    Spinner.hide();

    // Create rapid input grid HTML
    const tableRows = marks.map((m, idx) => {
      const isAbsent = m.is_absent === 1;
      const val = m.obtained_marks !== null ? m.obtained_marks : '';
      
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

      const rowStyle = !isElected ? 'style="opacity: 0.55; background: var(--bg-elevated);"' : '';
      
      let inputHTML = '';
      if (isElected) {
        inputHTML = `
          <input type="number" 
                 class="form-control test-marks-input" 
                 data-idx="${idx}" 
                 id="tm-input-${m.student_id}" 
                 value="${val}" 
                 min="0" 
                 max="${test.max_marks}" 
                 step="0.5" 
                 placeholder="Marks (Max ${test.max_marks})" 
                 onchange="validateGridMark(${m.student_id}, ${test.max_marks})"
                 ${isAbsent ? 'disabled' : ''}>`;
      } else {
        inputHTML = `
          <div style="display:flex; align-items:center; gap:8px">
            <span class="badge badge-gray" style="font-size:0.7rem; text-transform:none">Not Chosen</span>
            <input type="number" class="form-control test-marks-input" style="display:none" data-idx="${idx}" id="tm-input-${m.student_id}" disabled value="">
          </div>`;
      }

      return `
        <tr data-student-id="${m.student_id}" data-is-elected="${isElected}" ${rowStyle}>
          <td style="padding:var(--space-2) var(--space-4); text-align:center;"><span class="badge badge-gray">${m.roll_number}</span></td>
          <td style="padding:var(--space-2) var(--space-4); font-weight:600;">${m.student_name}</td>
          <td style="padding:var(--space-2) var(--space-4);">
            ${inputHTML}
          </td>
          <td style="padding:var(--space-2) var(--space-4); text-align:center;">
            <label class="toggle">
              <input type="checkbox" id="tm-absent-${m.student_id}" ${isAbsent ? 'checked' : ''} onchange="toggleGridAbsent(${m.student_id})" ${!isElected ? 'disabled' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td style="padding:var(--space-2) var(--space-4);">
            <input type="text" class="form-control test-remarks-input" id="tm-remarks-${m.student_id}" value="${m.remarks || ''}" placeholder="${isElected ? 'Remarks (optional)' : 'Not enrolled'}" ${!isElected ? 'disabled' : ''}>
          </td>
        </tr>`;
    }).join('');

    createModal('test-marks-grid-modal', `📝 Rapid Marks Grid — ${test.name}`,
      `<div style="margin-bottom:var(--space-4);" class="flex justify-between items-center bg-surface p-3 rounded">
        <div>
          <span class="badge badge-primary">${test.subject_name}</span>
          <span class="badge badge-gold">Max Marks: ${test.max_marks}</span>
        </div>
        <p class="text-xs text-muted">💡 Use <kbd>Enter</kbd> or <kbd>↓</kbd> / <kbd>↑</kbd> arrow keys to navigate rows quickly like a spreadsheet.</p>
      </div>
      <div style="max-height:550px; overflow-y:auto; border: 1px solid var(--border); border-radius: var(--radius)">
        <table class="marks-table" style="width:100%; border-collapse:collapse;">
          <thead style="position: sticky; top: 0; z-index: 10;">
            <tr>
              <th style="width:12%; text-align:center;">Roll No.</th>
              <th style="text-align:left;">Student Name</th>
              <th style="width:25%; text-align:left;">Obtained Marks</th>
              <th style="width:15%; text-align:center;">Absent</th>
              <th style="width:25%; text-align:left;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>`,
      `<button class="btn btn-outline" onclick="closeModal('test-marks-grid-modal')">Cancel</button>
       <button class="btn btn-primary" onclick="saveGridMarks(${testId})">💾 Save Test Marks</button>`,
      'modal-xl'
    );

    // Setup spreadsheet navigation keyboard listeners
    setupGridKeyboardNavigation();
  } catch (err) {
    Spinner.hide();
    Toast.error('Load Failed', err.message);
  }
}

function validateGridMark(studentId, maxMarks) {
  const input = document.getElementById(`tm-input-${studentId}`);
  if (!input) return;
  const val = parseFloat(input.value);
  if (val > maxMarks) {
    input.value = maxMarks;
    Toast.warning('Exceeded Maximum', `Marks cannot exceed test maximum: ${maxMarks}`);
  }
  if (val < 0) {
    input.value = 0;
  }
}

function toggleGridAbsent(studentId) {
  const absent = document.getElementById(`tm-absent-${studentId}`).checked;
  const input = document.getElementById(`tm-input-${studentId}`);
  if (input) {
    input.disabled = absent;
    if (absent) input.value = '';
  }
}

function setupGridKeyboardNavigation() {
  const inputs = $$('.test-marks-input');
  
  inputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
      const idx = parseInt(input.dataset.idx);
      let targetIdx = null;

      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        targetIdx = idx + 1;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        targetIdx = idx - 1;
      }

      if (targetIdx !== null && targetIdx >= 0 && targetIdx < inputs.length) {
        const nextInput = inputs.find(inp => parseInt(inp.dataset.idx) === targetIdx);
        if (nextInput && !nextInput.disabled) {
          nextInput.focus();
          nextInput.select();
        } else if (nextInput && nextInput.disabled) {
          // If disabled, skip it
          const step = (targetIdx > idx) ? 1 : -1;
          let searchIdx = targetIdx + step;
          while (searchIdx >= 0 && searchIdx < inputs.length) {
            const skipInput = inputs.find(inp => parseInt(inp.dataset.idx) === searchIdx);
            if (skipInput && !skipInput.disabled) {
              skipInput.focus();
              skipInput.select();
              break;
            }
            searchIdx += step;
          }
        }
      }
    });
  });
}

async function saveGridMarks(testId) {
  const rows = $$('#test-marks-grid-modal tbody tr');
  const marks = [];

  for (const row of rows) {
    const student_id = parseInt(row.dataset.studentId);
    const isElected = row.dataset.isElected === 'true';
    const isAbsent = isElected ? document.getElementById(`tm-absent-${student_id}`).checked : false;
    const obtained_marks = isElected ? document.getElementById(`tm-input-${student_id}`).value : '';
    const remarks = isElected ? document.getElementById(`tm-remarks-${student_id}`).value.trim() : '';

    if (!isElected) {
      marks.push({
        student_id,
        obtained_marks: null,
        is_absent: false,
        remarks: ''
      });
    } else {
      marks.push({
        student_id,
        obtained_marks: isAbsent ? null : (obtained_marks !== '' ? parseFloat(obtained_marks) : null),
        is_absent: isAbsent,
        remarks
      });
    }
  }

  Spinner.show('Saving test marks...');
  try {
    await API.tests.saveMarks(testId, marks);
    Spinner.hide();
    closeModal('test-marks-grid-modal');
    Toast.success('Marks Saved', 'Test marks grid has been updated.');
    await loadTestsForClass(_testsStandardId);
  } catch (err) {
    Spinner.hide();
    Toast.error('Save Failed', err.message);
  }
}

// ─── Excel Import Modal ────────────────────────────
function showTestImportModal(testId) {
  createModal('test-import-modal', '📥 Import Test Marks from Excel',
    `<div class="form-group mb-4">
       <p class="text-sm text-secondary mb-4">Upload an Excel sheet (.xlsx, .xls) containing student roll numbers and marks. We'll automatically match them.</p>
       <div class="file-upload-area" id="test-import-drop-zone">
         <input type="file" id="test-import-file-input" accept=".xlsx,.xls,.csv" onchange="processTestImport(${testId})">
         <div class="file-upload-icon">📊</div>
         <p class="file-upload-text">Drop your Excel/CSV here or click to select</p>
         <p class="file-upload-hint">Format requirements: column 1 with Roll Numbers, column 2 with Marks.</p>
       </div>
     </div>
     <div id="test-import-results" style="display:none;" class="card bg-surface p-3"></div>`,
    `<button class="btn btn-outline" onclick="closeModal('test-import-modal')">Close</button>`,
    'modal-md'
  );
}

async function processTestImport(testId) {
  const fileInput = document.getElementById('test-import-file-input');
  const file = fileInput.files[0];
  if (!file) return;

  const dropZone = document.getElementById('test-import-drop-zone');
  dropZone.innerHTML = `<div class="file-upload-icon animate-pulse">📊</div><p class="file-upload-text">Uploading and matching scores...</p>`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await API.tests.importMarks(testId, formData);
    
    dropZone.innerHTML = `
      <div class="file-upload-icon">✅</div>
      <p class="file-upload-text" style="color:var(--success)">File parsed successfully</p>
      <p class="file-upload-hint">${res.imported} scores matched and updated.</p>`;
    
    const resultsDiv = document.getElementById('test-import-results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
      <h4 class="mb-2" style="font-weight:700;">Import Log Details:</h4>
      <div style="max-height:150px; overflow-y:auto; font-size:0.8rem; line-height:1.6;">
        <p class="text-success">✔ Successfully Imported: <strong>${res.imported} students</strong></p>
        <p class="text-warning">⚠ Skipped / Not Matched: <strong>${res.skipped} rows</strong></p>
        ${res.errors.length > 0 
          ? `<p class="text-danger mt-2"><strong>Errors:</strong></p>
             <ul style="padding-left:1.2rem; color:var(--danger)">
               ${res.errors.map(e => `<li>Row ${e.row}: ${e.message}</li>`).join('')}
             </ul>` 
          : ''}
      </div>`;
    
    Toast.success('Import Successful', `${res.imported} scores uploaded.`);
    await loadTestsForClass(_testsStandardId);
  } catch (err) {
    dropZone.innerHTML = `
      <div class="file-upload-icon">❌</div>
      <p class="file-upload-text" style="color:var(--danger)">Import failed</p>
      <p class="file-upload-hint">${err.message}</p>`;
    Toast.error('Import Failed', err.message);
  }
}

// ─── WhatsApp Share Modal ─────────────────────────
async function showTestWhatsAppModal(testId) {
  Spinner.show('Loading report summary...');
  try {
    const { test, marks } = await API.tests.getMarks(testId);
    Spinner.hide();

    // Prepare student list
    const passMarkPct = 35;
    const scored = marks.map(m => {
      const pct = m.is_absent ? 0 : (m.obtained_marks || 0) / test.max_marks * 100;
      return { ...m, pct };
    }).sort((a,b) => b.pct - a.pct);

    // Build copyable summary text for WhatsApp
    const coaching = await API.coaching.get();
    
    // Class report
    let classMsg = `📊 *${coaching.name || 'Coaching Institute'}* \n`;
    classMsg += `📝 *Test Result: ${test.name}* \n`;
    classMsg += `📚 *Subject*: ${test.subject_name} (Max: ${test.max_marks}) \n`;
    classMsg += `📅 *Date*: ${Format.date(test.test_date)} \n\n`;
    classMsg += `🏆 *RANK LIST & PERFORMANCE:* \n`;
    
    scored.forEach((s, idx) => {
      const rankStr = s.is_absent ? 'AB' : `#${idx+1}`;
      const scoreStr = s.is_absent ? 'Absent' : `${s.obtained_marks}/${test.max_marks}`;
      const statusStr = s.is_absent ? '❌' : (s.pct >= passMarkPct ? '✅ Pass' : '❌ Fail');
      classMsg += `${rankStr}. *${s.student_name}* — ${scoreStr} (${statusStr})\n`;
    });
    
    classMsg += `\nShared for Parents view. Best Regards!`;

    // Dropdown options for single student selection
    const studentOptions = marks.map(s => `<option value="${s.student_id}">${s.student_name} (Roll: ${s.roll_number})</option>`).join('');

    createModal('whatsapp-modal', `💬 WhatsApp Report Share`,
      `<div class="tabs mb-4">
         <button class="btn btn-primary btn-sm" id="tab-class-btn" onclick="toggleWhatsAppTab('class')">Group Report (Whole Class)</button>
         <button class="btn btn-outline btn-sm" id="tab-student-btn" onclick="toggleWhatsAppTab('student')">Single Parent Message</button>
       </div>
       
       <!-- Tab 1: Class Report -->
       <div id="wa-tab-class">
         <p class="text-xs text-muted mb-2">📋 Copy this text and paste directly into your Class WhatsApp Group.</p>
         <textarea class="form-control" id="wa-class-text" rows="12" style="font-family:monospace; font-size:0.8rem; background:var(--bg-elevated);" readonly>${classMsg}</textarea>
         <button class="btn btn-success btn-sm w-full mt-3" onclick="copyText('wa-class-text')">📋 Copy Class Report</button>
       </div>
       
       <!-- Tab 2: Student Report -->
       <div id="wa-tab-student" style="display:none;">
         <div class="form-group mb-3">
           <label class="form-label">Select Student</label>
           <select class="form-control" id="wa-student-select" onchange="generateIndividualWAMessage(${testId})">
             <option value="">— Select student —</option>
             ${studentOptions}
           </select>
         </div>
         <p class="text-xs text-muted mb-2">📋 Personalized message template for individual parent messaging:</p>
         <textarea class="form-control" id="wa-student-text" rows="6" style="font-family:monospace; font-size:0.8rem; background:var(--bg-elevated);" placeholder="Select a student to generate message..." readonly></textarea>
         <button class="btn btn-success btn-sm w-full mt-3" id="wa-copy-student-btn" onclick="copyText('wa-student-text')" disabled>📋 Copy Parent Message</button>
       </div>`,
      `<button class="btn btn-outline" onclick="closeModal('whatsapp-modal')">Close</button>`,
      'modal-md'
    );
  } catch (err) {
    Spinner.hide();
    Toast.error('Load Failed', err.message);
  }
}

function toggleWhatsAppTab(tab) {
  if (tab === 'class') {
    document.getElementById('wa-tab-class').style.display = 'block';
    document.getElementById('wa-tab-student').style.display = 'none';
    document.getElementById('tab-class-btn').className = 'btn btn-primary btn-sm';
    document.getElementById('tab-student-btn').className = 'btn btn-outline btn-sm';
  } else {
    document.getElementById('wa-tab-class').style.display = 'none';
    document.getElementById('wa-tab-student').style.display = 'block';
    document.getElementById('tab-class-btn').className = 'btn btn-outline btn-sm';
    document.getElementById('tab-student-btn').className = 'btn btn-primary btn-sm';
  }
}

async function generateIndividualWAMessage(testId) {
  const studentId = document.getElementById('wa-student-select').value;
  const txt = document.getElementById('wa-student-text');
  const btn = document.getElementById('wa-copy-student-btn');

  if (!studentId) {
    txt.value = '';
    btn.disabled = true;
    return;
  }

  const { test, marks } = await API.tests.getMarks(testId);
  const m = marks.find(s => s.student_id === parseInt(studentId));
  const coaching = await API.coaching.get();

  if (!m) return;

  // Calculate Rank
  const sorted = [...marks].map(s => {
    const pct = s.is_absent ? 0 : (s.obtained_marks || 0);
    return { ...s, pct };
  }).sort((a,b) => b.pct - a.pct);
  
  const rank = sorted.findIndex(s => s.student_id === parseInt(studentId)) + 1;
  const passMarkPct = 35;
  const isAbsent = m.is_absent === 1;
  const pct = isAbsent ? 0 : (m.obtained_marks || 0) / test.max_marks * 100;
  const statusStr = isAbsent ? 'Absent (AB)' : (pct >= passMarkPct ? 'PASS' : 'FAIL');

  let msg = `Dear Parent, \n`;
  msg += `Here are the small test performance details for *${m.student_name}* at *${coaching.name || 'Coaching Institute'}*:\n\n`;
  msg += `📝 *Test*: ${test.name}\n`;
  msg += `📚 *Subject*: ${test.subject_name}\n`;
  msg += `📊 *Marks Secured*: ${isAbsent ? 'Absent' : `${m.obtained_marks} / ${test.max_marks}`}\n`;
  if (!isAbsent) {
    msg += `📈 *Percentage*: ${pct.toFixed(1)}%\n`;
    msg += `🏆 *Class Rank*: #${rank} in class\n`;
  }
  msg += `✅ *Result Status*: *${statusStr}*\n\n`;
  msg += `Please review and feel free to connect for any progress updates. Best regards!`;

  txt.value = msg;
  btn.disabled = false;
}

function copyText(elementId) {
  const el = document.getElementById(elementId);
  if (!el || !el.value) return;
  el.select();
  document.execCommand('copy');
  Toast.success('Copied to Clipboard', 'You can now paste it directly into WhatsApp.');
}

// Expose globals
window.renderTests = renderTests;
window.loadTestsForClass = loadTestsForClass;
window.showCreateTestModal = showCreateTestModal;
window.showEditTestModal = showEditTestModal;
window.saveTest = saveTest;
window.confirmDeleteTest = confirmDeleteTest;
window.showTestMarksEntry = showTestMarksEntry;
window.validateGridMark = validateGridMark;
window.toggleGridAbsent = toggleGridAbsent;
window.saveGridMarks = saveGridMarks;
window.showTestImportModal = showTestImportModal;
window.processTestImport = processTestImport;
window.showTestWhatsAppModal = showTestWhatsAppModal;
window.toggleWhatsAppTab = toggleWhatsAppTab;
window.generateIndividualWAMessage = generateIndividualWAMessage;
window.copyText = copyText;

// ─── Grouped Test Cycles Timetables ───────────────
async function loadTestCyclesForClass(standardId) {
  const container = document.getElementById('tests-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="animate-pulse" style="font-size:2rem">🗓</div>
      <p class="text-muted text-sm mt-2">Loading test cycles...</p>
    </div>`;
  
  try {
    const cycles = await API.testCycles.list(standardId);
    
    if (cycles.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="height:300px">
          <div class="empty-state-icon">🗓</div>
          <h3>No Grouped Test Cycles</h3>
          <p>Schedule a complete series/exam cycle (e.g. "Weekly Test Series 1" or "First Semester Midsem") for multiple subjects at once.</p>
          <button class="btn btn-primary mt-2" onclick="showCreateTestCycleModal()">➕ Schedule Test Cycle</button>
        </div>`;
      return;
    }
    
    container.innerHTML = `
      <div class="grid grid-auto gap-4">
        ${cycles.map(c => {
          const pct = c.total_tests > 0 ? Math.round((c.completed_tests / c.total_tests) * 100) : 0;
          return `
            <div class="card hover-lift stagger-item" style="border: 1px solid var(--border-medium); border-left: 4px solid var(--primary); height:100%; display:flex; flex-direction:column; justify-content:space-between">
              <div class="card-body p-4 flex flex-col justify-between" style="height: 100%;">
                <div>
                  <div class="flex justify-between items-start mb-2">
                    <span class="badge badge-primary">${c.total_tests} Subjects</span>
                    <span class="badge badge-gold">Max: ${c.max_marks}</span>
                  </div>
                  <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-primary);" class="mb-1">${c.title}</h3>
                  <div class="flex items-center gap-2 mt-2 mb-4">
                    <div style="flex:1;background:var(--border-medium);height:6px;border-radius:3px;overflow:hidden">
                      <div style="background:var(--success);width:${pct}%;height:100%"></div>
                    </div>
                    <span class="text-xs text-muted font-semibold">${c.completed_tests}/${c.total_tests} Graded (${pct}%)</span>
                  </div>
                </div>
                
                <div class="divider" style="margin: var(--space-2) 0;"></div>
                
                <div class="flex justify-between items-center mt-2">
                  <button class="btn btn-outline btn-sm" onclick="viewTestCycleDetails(${c.id})">🔍 View Details</button>
                  <button class="btn btn-ghost btn-icon-sm" onclick="confirmDeleteTestCycle(${c.id}, '${c.title.replace(/'/g, "\\'")}')" title="Delete Cycle">🗑️</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error Loading Cycles</h3><p>${err.message}</p></div>`;
  }
}

async function showCreateTestCycleModal() {
  if (!_testsStandardId) return;
  const subjects = await API.subjects.list(_testsStandardId);
  if (subjects.length === 0) {
    Toast.warning('No Subjects', 'Please add subjects to this class first from the Boards & Classes tab.');
    return;
  }
  
  const subjectsHTML = subjects.map(sub => `
    <div style="display:grid;grid-template-columns:30px 1fr 140px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" class="cycle-subj-check" data-sub-id="${sub.id}" data-sub-name="${sub.name.replace(/'/g, "\\'")}" id="chk-${sub.id}" checked>
      <label for="chk-${sub.id}" style="font-weight:600;font-size:0.875rem;cursor:pointer">${sub.name}</label>
      <input type="date" class="form-control cycle-subj-date" id="date-${sub.id}" value="${new Date().toISOString().split('T')[0]}" style="height:32px;font-size:0.8rem">
    </div>
  `).join('');
  
  createModal('create-cycle-modal', '🗓 Schedule Grouped Test Cycle',
    `<form id="cycle-form">
      <div class="form-group mb-4">
        <label class="form-label">Exam Cycle Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="cycle-title" placeholder="e.g. Weekly Series 1, First Semester Midsem" required>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Maximum Marks for all subjects <span class="required">*</span></label>
        <input type="number" class="form-control" id="cycle-max-marks" value="50" min="1" required>
      </div>
      
      <p class="form-section-title">Select Subjects &amp; Schedule Dates</p>
      <div style="max-height:250px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:0 12px">
        ${subjectsHTML}
      </div>
    </form>`,
    `<button class="btn btn-outline" onclick="closeModal('create-cycle-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="submitTestCycle()">💾 Schedule Exam Cycle</button>`,
    'modal-md'
  );
}

async function submitTestCycle() {
  const title = getVal('cycle-title');
  const max_marks = getVal('cycle-max-marks');
  if (!title || !max_marks) {
    Toast.error('Validation Error', 'Title and maximum marks are required.');
    return;
  }
  
  const tests = [];
  const checks = $$('.cycle-subj-check');
  checks.forEach(chk => {
    if (chk.checked) {
      const subject_id = parseInt(chk.dataset.subId);
      const subject_name = chk.dataset.subName;
      const test_date = document.getElementById(`date-${subject_id}`).value;
      tests.push({ subject_id, subject_name, test_date });
    }
  });
  
  if (tests.length === 0) {
    Toast.warning('No Subjects', 'Please check at least one subject to schedule.');
    return;
  }
  
  try {
    await API.testCycles.create({
      standard_id: _testsStandardId,
      title,
      max_marks: parseFloat(max_marks),
      tests
    });
    closeModal('create-cycle-modal');
    Toast.success('Cycle Scheduled', `Successfully scheduled "${title}" grouped test cycle.`);
    await loadTestCyclesForClass(_testsStandardId);
  } catch (err) {
    Toast.error('Scheduling Failed', err.message);
  }
}

async function viewTestCycleDetails(cycleId) {
  Spinner.show('Loading cycle details...');
  try {
    const { cycle, tests } = await API.testCycles.get(cycleId);
    Spinner.hide();
    
    const rows = tests.map(t => `
      <tr>
        <td style="padding:8px 12px;font-weight:600;text-align:left">${t.subject_name}</td>
        <td style="padding:8px 12px">${Format.date(t.test_date)}</td>
        <td style="padding:8px 12px"><span class="badge ${t.marks_count > 0 ? 'badge-success' : 'badge-gold'}">${t.marks_count > 0 ? 'Graded (' + t.marks_count + ')' : 'Pending'}</span></td>
        <td style="padding:8px 12px">
          <div class="td-actions" style="justify-content:center">
            <button class="btn btn-outline btn-sm" onclick="closeModal('cycle-details-modal'); showTestMarksEntry(${t.id})">📝 Enter Marks</button>
            <button class="btn btn-ghost btn-icon-sm" onclick="closeModal('cycle-details-modal'); showTestWhatsAppModal(${t.id})" title="Share to WhatsApp">💬</button>
          </div>
        </td>
      </tr>
    `).join('');
    
    createModal('cycle-details-modal', `🗓 Exam Cycle Details — ${cycle.title}`,
      `<div class="bg-surface p-4 rounded mb-4" style="border:1px solid var(--border)">
        <h4 style="font-weight:700;font-size:1.1rem" class="mb-1">${cycle.title} Timetable Schedule</h4>
        <p class="text-xs text-muted">Groups related subject tests under a single exam cycle. Evaluating student performance collectively.</p>
      </div>
      <div class="table-wrap">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 12px">Subject</th>
              <th style="padding:8px 12px">Exam Date</th>
              <th style="padding:8px 12px">Status</th>
              <th style="padding:8px 12px">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>`,
      `<button class="btn btn-primary" onclick="closeModal('cycle-details-modal')">Close</button>`,
      'modal-lg'
    );
  } catch (err) {
    Spinner.hide();
    Toast.error('Load Details Failed', err.message);
  }
}

async function confirmDeleteTestCycle(cycleId, title) {
  const ok = await Confirm.show(`Delete exam cycle "${title}"?`, `This will permanently delete the cycle group and ALL marks/quizzes scheduled under it.`, 'Delete Cycle');
  if (!ok) return;
  
  try {
    await API.testCycles.delete(cycleId);
    Toast.success('Cycle Deleted', `Grouped test cycle "${title}" has been deleted.`);
    await loadTestCyclesForClass(_testsStandardId);
  } catch (err) {
    Toast.error('Delete Failed', err.message);
  }
}

window.loadTestCyclesForClass = loadTestCyclesForClass;
window.showCreateTestCycleModal = showCreateTestCycleModal;
window.submitTestCycle = submitTestCycle;
window.viewTestCycleDetails = viewTestCycleDetails;
window.confirmDeleteTestCycle = confirmDeleteTestCycle;
window.navigateToPrefilledReminder = navigateToPrefilledReminder;

// ─── School Exams Timetables CRUD ─────────────────
async function loadSchoolExamsForClass(standardId) {
  const container = document.getElementById('tests-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="animate-pulse" style="font-size:2rem">🏫</div>
      <p class="text-muted text-sm mt-2">Loading school exams...</p>
    </div>`;

  try {
    const exams = await API.schoolExams.list(standardId);

    if (exams.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="height:300px">
          <div class="empty-state-icon">🏫</div>
          <h3>No School Exams Logged</h3>
          <p>Add the upcoming school exam timetable for this class. The AI Auto-Scheduler will use this data to automatically align coaching prep tests before school exams!</p>
          <button class="btn btn-primary mt-2" onclick="showAddSchoolExamModal()">➕ Add School Exam</button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="card animate-fade-in">
        <div class="table-wrap">
          <table style="width:100%; border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left; padding:12px">Exam/Test Name</th>
                <th style="text-align:left; padding:12px">Subject</th>
                <th style="padding:12px">School Exam Date</th>
                <th style="padding:12px">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${exams.map(e => `
                <tr class="stagger-item">
                  <td style="padding:12px; font-weight:600; text-align:left">${e.exam_name}</td>
                  <td style="padding:12px; text-align:left"><span class="badge badge-primary">${e.subject_name}</span></td>
                  <td style="padding:12px">${Format.date(e.exam_date)}</td>
                  <td style="padding:12px">
                    <button class="btn btn-ghost btn-icon-sm" onclick="confirmDeleteSchoolExam(${e.id}, '${e.exam_name.replace(/'/g, "\\'")}')" title="Delete School Exam">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    
    staggerAnimateItems(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error Loading School Exams</h3><p>${err.message}</p></div>`;
  }
}

async function showAddSchoolExamModal() {
  if (!_testsStandardId) return;
  const subjects = await API.subjects.list(_testsStandardId);
  if (subjects.length === 0) {
    Toast.warning('No Subjects', 'Please add subjects to this class first.');
    return;
  }

  const subjectsHTML = subjects.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('');

  createModal('add-school-exam-modal', '🏫 Add School Exam Schedule',
    `<form id="school-exam-form">
      <div class="form-group mb-4">
        <label class="form-label">School Exam Name <span class="required">*</span></label>
        <input type="text" class="form-control" id="school-exam-name" placeholder="e.g. Unit Test 1, Semester Exam, Board Exam" required>
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Subject <span class="required">*</span></label>
          <select class="form-control" id="school-exam-subject" required>
            ${subjectsHTML}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">School Exam Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="school-exam-date" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
      </div>
    </form>`,
    `<button class="btn btn-outline" onclick="closeModal('add-school-exam-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="submitSchoolExam()">💾 Add Exam</button>`,
    'modal-md'
  );
}

async function submitSchoolExam() {
  const exam_name = getVal('school-exam-name');
  const subject_id = getVal('school-exam-subject');
  const exam_date = getVal('school-exam-date');

  if (!exam_name || !subject_id || !exam_date) {
    Toast.error('Validation Error', 'Please fill all required fields.');
    return;
  }

  try {
    await API.schoolExams.add({
      standard_id: _testsStandardId,
      subject_id: parseInt(subject_id),
      exam_name,
      exam_date
    });
    closeModal('add-school-exam-modal');
    Toast.success('Exam Added', 'School exam added to timetable.');
    await loadSchoolExamsForClass(_testsStandardId);
  } catch (err) {
    Toast.error('Failed to Add', err.message);
  }
}

async function confirmDeleteSchoolExam(id, name) {
  const ok = await Confirm.show(`Delete school exam: ${name}?`, 'This will remove the school exam date and it will no longer align in the auto-scheduler.', 'Delete Exam');
  if (!ok) return;

  try {
    await API.schoolExams.delete(id);
    Toast.success('Deleted', 'School exam schedule was removed.');
    await loadSchoolExamsForClass(_testsStandardId);
  } catch (err) {
    Toast.error('Failed to Delete', err.message);
  }
}

// ─── AI Auto-Scheduler ────────────────────────────
let _aiSubjects = [];
let _aiSchoolExams = [];
let _aiGeneratedTests = [];

async function showAISchedulerModal() {
  if (!_testsStandardId) return;
  
  Spinner.show('Preparing scheduler...');
  try {
    const subjects = await API.subjects.list(_testsStandardId);
    const cycles = await API.testCycles.list(_testsStandardId);
    const schoolExams = await API.schoolExams.list(_testsStandardId);
    Spinner.hide();

    if (subjects.length === 0) {
      Toast.warning('No Subjects', 'Please add subjects to this class first.');
      return;
    }

    const subjectsHTML = subjects.map(sub => `
      <label style="display:flex; align-items:center; gap:8px; font-size:0.875rem; cursor:pointer">
        <input type="checkbox" class="ai-subj-check" data-sub-id="${sub.id}" data-sub-name="${sub.name.replace(/'/g, "\\'")}" checked>
        <span>${sub.name}</span>
      </label>
    `).join('');

    const cyclesHTML = `
      <option value="">— Individual Tests (No Cycle Group) —</option>
      ${cycles.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
    `;

    const todayStr = new Date().toISOString().split('T')[0];
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    const twoWeeksLaterStr = twoWeeksLater.toISOString().split('T')[0];

    createModal('ai-scheduler-modal', '🤖 AI Timetable Auto-Scheduler',
      `<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px" class="mb-4">
        <div>
          <p class="form-section-title" style="margin-top:0">1. Setup Parameters</p>
          <div class="form-grid mb-3">
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input type="date" class="form-control" id="ai-start-date" value="${todayStr}">
            </div>
            <div class="form-group">
              <label class="form-label">End Date</label>
              <input type="date" class="form-control" id="ai-end-date" value="${twoWeeksLaterStr}">
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Link to Test Cycle (Optional)</label>
            <select class="form-control" id="ai-cycle-select">
              ${cyclesHTML}
            </select>
            <span class="form-hint">Links created tests under this cycle grouping.</span>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Marks per Test</label>
            <input type="number" class="form-control" id="ai-max-marks" value="50" min="1">
          </div>

          <div class="form-group mb-4">
            <label class="toggle-group">
              <span class="toggle">
                <input type="checkbox" id="ai-align-school" checked>
                <span class="toggle-slider"></span>
              </span>
              <span class="toggle-label">⚡ Align with School Exam Schedule</span>
            </label>
            <span class="form-hint">If selected, slots subject prep tests 1–2 days before school exam dates.</span>
          </div>
        </div>

        <div>
          <p class="form-section-title" style="margin-top:0">2. Select Subjects</p>
          <div style="max-height:220px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius); padding:10px; display:flex; flex-direction:column; gap:8px">
            ${subjectsHTML}
          </div>
        </div>
      </div>
      
      <div id="ai-preview-section" style="display:none;" class="card bg-surface p-4 mb-4">
        <h4 style="font-weight:700" class="mb-2">📋 Auto-Generated Schedule Preview</h4>
        <div style="max-height:250px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius)">
          <table class="marks-table" style="width:100%; border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left; padding:8px">Subject</th>
                <th style="text-align:left; padding:8px">Test Name</th>
                <th style="padding:8px">Date</th>
                <th style="padding:8px; width:100px">Marks</th>
                <th style="padding:8px; width:60px">Remove</th>
              </tr>
            </thead>
            <tbody id="ai-preview-tbody"></tbody>
          </table>
        </div>
      </div>`,
      `<button class="btn btn-outline" onclick="closeModal('ai-scheduler-modal')">Cancel</button>
       <button class="btn btn-primary" id="ai-generate-btn" onclick="generateAISchedulePreview()">⚡ Generate Timetable</button>
       <button class="btn btn-success animate-fade-in" id="ai-save-btn" onclick="saveAISchedule()" style="display:none">💾 Bulk Save Schedule</button>`,
      'modal-lg'
    );

    _aiSubjects = subjects;
    _aiSchoolExams = schoolExams;
  } catch (err) {
    Spinner.hide();
    Toast.error('Initialization Failed', err.message);
  }
}

function generateAISchedulePreview() {
  const startDateStr = getVal('ai-start-date');
  const endDateStr = getVal('ai-end-date');
  const cycleIdVal = document.getElementById('ai-cycle-select').value;
  const cycleSelect = document.getElementById('ai-cycle-select');
  const cycleTitle = cycleIdVal ? cycleSelect.options[cycleSelect.selectedIndex].text : '';
  const alignSchool = document.getElementById('ai-align-school').checked;
  const maxMarksVal = parseFloat(getVal('ai-max-marks')) || 50;

  if (!startDateStr || !endDateStr) {
    Toast.error('Date Required', 'Please select both start and end dates.');
    return;
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (end < start) {
    Toast.error('Invalid Range', 'End date cannot be before start date.');
    return;
  }

  const selectedSubjects = [];
  $$('.ai-subj-check').forEach(chk => {
    if (chk.checked) {
      selectedSubjects.push({
        id: parseInt(chk.dataset.subId),
        name: chk.dataset.subName
      });
    }
  });

  if (selectedSubjects.length === 0) {
    Toast.warning('No Subjects', 'Please select at least one subject.');
    return;
  }

  const availableDates = [];
  let curr = new Date(start);
  while (curr <= end) {
    if (curr.getDay() !== 0) { // skip Sunday
      availableDates.push(new Date(curr));
    }
    curr.setDate(curr.getDate() + 1);
  }

  if (availableDates.length === 0) {
    Toast.error('No Days Available', 'The selected range has no available non-Sunday dates.');
    return;
  }

  const assignments = [];
  const occupiedDateStrings = new Set();

  const isSunday = (dStr) => {
    const d = new Date(dStr);
    return d.getDay() === 0;
  };

  const subtractDaysSkippingSundays = (dStr, days) => {
    let d = new Date(dStr);
    let count = 0;
    while (count < days) {
      d.setDate(d.getDate() - 1);
      if (d.getDay() !== 0) {
        count++;
      }
    }
    return d.toISOString().split('T')[0];
  };

  const remainingSubjects = [...selectedSubjects];
  
  if (alignSchool && _aiSchoolExams.length > 0) {
    const sortedExams = [..._aiSchoolExams].sort((a,b) => new Date(a.exam_date) - new Date(b.exam_date));
    
    for (const exam of sortedExams) {
      const idx = remainingSubjects.findIndex(s => s.id === exam.subject_id);
      if (idx !== -1) {
        const sub = remainingSubjects[idx];
        let targetDateStr = subtractDaysSkippingSundays(exam.exam_date, 1);
        
        let targetDate = new Date(targetDateStr);
        if (targetDate < start) {
          targetDateStr = startDateStr;
          targetDate = new Date(targetDateStr);
        }

        let offset = 0;
        let finalDateStr = targetDateStr;
        let finalDate = new Date(finalDateStr);
        while (occupiedDateStrings.has(finalDateStr) || isSunday(finalDateStr)) {
          offset++;
          const multiplier = (offset % 2 === 0) ? 1 : -1;
          const searchDays = Math.ceil(offset / 2) * multiplier;
          
          let testDate = new Date(targetDate);
          testDate.setDate(testDate.getDate() + searchDays);
          
          if (testDate >= start && testDate <= end) {
            finalDateStr = testDate.toISOString().split('T')[0];
          }
          if (offset > 30) {
            break;
          }
        }

        assignments.push({
          subject_id: sub.id,
          subject_name: sub.name,
          date: finalDateStr,
          reason: `Aligned with school exam on ${Format.date(exam.exam_date)}`
        });
        occupiedDateStrings.add(finalDateStr);
        remainingSubjects.splice(idx, 1);
      }
    }
  }

  const unoccupiedDates = availableDates.filter(d => !occupiedDateStrings.has(d.toISOString().split('T')[0]));
  
  if (remainingSubjects.length > 0) {
    if (unoccupiedDates.length === 0) {
      remainingSubjects.forEach((sub, i) => {
        const dateObj = availableDates[i % availableDates.length];
        const dateStr = dateObj.toISOString().split('T')[0];
        assignments.push({
          subject_id: sub.id,
          subject_name: sub.name,
          date: dateStr,
          reason: 'Distributed evenly'
        });
      });
    } else {
      const spacing = unoccupiedDates.length / remainingSubjects.length;
      remainingSubjects.forEach((sub, i) => {
        const dateIdx = Math.floor(i * spacing);
        const dateObj = unoccupiedDates[dateIdx % unoccupiedDates.length];
        const dateStr = dateObj.toISOString().split('T')[0];
        assignments.push({
          subject_id: sub.id,
          subject_name: sub.name,
          date: dateStr,
          reason: 'Distributed evenly'
        });
        occupiedDateStrings.add(dateStr);
      });
    }
  }

  assignments.sort((a,b) => new Date(a.date) - new Date(b.date));

  _aiGeneratedTests = assignments.map(a => {
    const prefix = cycleTitle ? cycleTitle : 'Topic Test';
    return {
      standard_id: _testsStandardId,
      subject_id: a.subject_id,
      subject_name: a.subject_name,
      name: `${prefix} - ${a.subject_name}`,
      max_marks: maxMarksVal,
      test_date: a.date,
      syllabus: '',
      exam_mode: 'Offline',
      status: 'Scheduled',
      cycle_id: cycleIdVal || null,
      reason: a.reason
    };
  });

  renderAISchedulePreviewTable();
}

function renderAISchedulePreviewTable() {
  const tbody = document.getElementById('ai-preview-tbody');
  tbody.innerHTML = '';

  if (_aiGeneratedTests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No tests generated.</td></tr>';
    return;
  }

  _aiGeneratedTests.forEach((t, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:8px; text-align:left">
        <span class="badge badge-primary">${t.subject_name}</span>
        <br><span class="text-xs text-muted" style="font-size:0.65rem">${t.reason || ''}</span>
      </td>
      <td style="padding:8px; text-align:left">
        <input type="text" class="form-control form-control-sm" value="${t.name}" oninput="_aiGeneratedTests[${idx}].name = this.value" style="height:30px; font-size:0.8rem">
      </td>
      <td style="padding:8px">
        <input type="date" class="form-control form-control-sm" value="${t.test_date}" onchange="_aiGeneratedTests[${idx}].test_date = this.value" style="height:30px; font-size:0.8rem; width:130px">
      </td>
      <td style="padding:8px">
        <input type="number" class="form-control form-control-sm" value="${t.max_marks}" oninput="_aiGeneratedTests[${idx}].max_marks = parseFloat(this.value) || 0" style="height:30px; font-size:0.8rem; width:80px">
      </td>
      <td style="padding:8px">
        <button class="btn btn-ghost btn-icon-sm" onclick="removeAIGeneratedTest(${idx})" title="Remove from schedule">❌</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  show('ai-preview-section');
  show('ai-save-btn');
  document.getElementById('ai-generate-btn').textContent = '⚡ Re-generate';
}

function removeAIGeneratedTest(idx) {
  _aiGeneratedTests.splice(idx, 1);
  renderAISchedulePreviewTable();
}

async function saveAISchedule() {
  if (_aiGeneratedTests.length === 0) {
    Toast.warning('Empty Schedule', 'There are no tests in the preview schedule to save.');
    return;
  }

  Spinner.show('Bulk creating tests...');
  try {
    const res = await API.tests.bulkAdd(_aiGeneratedTests);
    Spinner.hide();
    closeModal('ai-scheduler-modal');
    Toast.success('Schedule Saved', `Successfully bulk created ${res.count} coaching tests.`);
    
    if (_currentTestsTab === 'individual') {
      await loadTestsForClass(_testsStandardId);
    } else {
      await loadTestCyclesForClass(_testsStandardId);
    }
  } catch (err) {
    Spinner.hide();
    Toast.error('Save Failed', err.message);
  }
}

window.loadSchoolExamsForClass = loadSchoolExamsForClass;
window.showAddSchoolExamModal = showAddSchoolExamModal;
window.submitSchoolExam = submitSchoolExam;
window.confirmDeleteSchoolExam = confirmDeleteSchoolExam;
window.showAISchedulerModal = showAISchedulerModal;
window.generateAISchedulePreview = generateAISchedulePreview;
window.removeAIGeneratedTest = removeAIGeneratedTest;
window.saveAISchedule = saveAISchedule;
