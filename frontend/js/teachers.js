/**
 * Apex Tuition ERP — Teachers Portal Desk
 * Streamlined workflow for faculty to record attendance and enter test marks.
 */

let teachersState = {
  selectedStandardId: null,
  selectedTestId: null,
  standards: [],
  tests: []
};

async function renderTeachersPage(container) {
  try {
    const res = await API.getStandards();
    teachersState.standards = res.standards || [];
    if (teachersState.standards.length > 0 && !teachersState.selectedStandardId) {
      teachersState.selectedStandardId = teachersState.standards[0].id;
    }
  } catch (e) {
    console.error('Error loading standards for teacher desk:', e);
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Teachers Portal Desk</h1>
        <p>Faculty workspace for fast class attendance taking, test grading &amp; student monitoring.</p>
      </div>
      <div class="page-header-actions">
        <span class="badge badge-info" style="padding:6px 14px;">👩‍🏫 Faculty Role Active</span>
      </div>
    </div>

    <!-- Quick Navigation Tabs for Faculty -->
    <div class="tabs mb-6" id="teacher-tabs">
      <button class="tab-btn active" data-tab="quick-attendance">📋 Roll Call Attendance Desk</button>
      <button class="tab-btn" data-tab="test-grading">✏️ Test Marks Grading Desk</button>
      <button class="tab-btn" data-tab="class-overview">📊 Class Performance Overview</button>
    </div>

    <!-- Tab 1: Quick Attendance -->
    <div id="teacher-tab-quick-attendance" class="teacher-tab-content">
      <div id="teacher-att-container"></div>
    </div>

    <!-- Tab 2: Test Marks Grading Desk -->
    <div id="teacher-tab-test-grading" class="teacher-tab-content" style="display:none;">
      <div class="card mb-6" style="padding:var(--space-5);">
        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap:var(--space-4); align-items:end;">
          <div class="form-group">
            <label class="form-label font-bold">Select Class / Standard</label>
            <select id="teacher-grading-std-select" class="glass-select">
              ${teachersState.standards.map(s => `<option value="${s.id}" ${s.id == teachersState.selectedStandardId ? 'selected' : ''}>${s.display_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label font-bold">Select Scheduled Test</label>
            <select id="teacher-grading-test-select" class="glass-select">
              <option value="">Select Test...</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:var(--space-4) var(--space-6); border-bottom:1px solid rgba(201,169,110,0.18);">
          <div>
            <h3 style="font-size:1.05rem; color:var(--navy);" id="teacher-test-title-header">Test Marks Entry Sheet</h3>
            <span class="text-xs text-muted" id="teacher-test-sub-header">Select a test to begin grading</span>
          </div>
          <button class="btn btn-primary" id="teacher-save-marks-btn" disabled>
            💾 Submit Test Marks
          </button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:70px;">Roll No</th>
                <th>Student Name</th>
                <th style="width:140px;">Obtained Marks</th>
                <th style="width:100px;">Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody id="teacher-marks-tbody">
              <tr><td colspan="5" class="text-center text-muted" style="padding:var(--space-8)">Select a test from the dropdown above to view student list.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 3: Class Overview -->
    <div id="teacher-tab-class-overview" class="teacher-tab-content" style="display:none;">
      <div class="grid-2">
        <div class="card">
          <h3 class="mb-4">My Assigned Classes</h3>
          <div id="teacher-classes-list">
            ${teachersState.standards.map(s => `
              <div class="board-card mb-3" style="padding:var(--space-4); display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:700; font-size:1rem;">${s.display_name}</div>
                  <div class="text-xs text-muted">Active Standard</div>
                </div>
                <button class="btn btn-sm btn-glass open-std-att-btn" data-std-id="${s.id}">Take Attendance →</button>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <h3 class="mb-4">Faculty Today's Checklist</h3>
          <ul style="display:flex; flex-direction:column; gap:12px;">
            <li style="display:flex; align-items:center; gap:10px; font-size:0.875rem;">
              <span class="badge badge-success">✓</span> Conduct morning roll call attendance
            </li>
            <li style="display:flex; align-items:center; gap:10px; font-size:0.875rem;">
              <span class="badge badge-warning">!</span> Enter Sunday Unit Test Marks
            </li>
            <li style="display:flex; align-items:center; gap:10px; font-size:0.875rem;">
              <span class="badge badge-info">i</span> Check parent portal attendance logs
            </li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Attach tab events
  const tabBtns = container.querySelectorAll('#teacher-tabs .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const targetTab = e.target.dataset.tab;
      container.querySelectorAll('.teacher-tab-content').forEach(c => c.style.display = 'none');
      const targetDiv = container.querySelector(`#teacher-tab-${targetTab}`);
      if (targetDiv) targetDiv.style.display = 'block';

      if (targetTab === 'quick-attendance') {
        const attWrap = document.getElementById('teacher-att-container');
        if (attWrap && window.AttendanceModule) {
          window.AttendanceModule.renderAttendancePage(attWrap);
        }
      }
    });
  });

  // Render initial quick attendance inside Tab 1
  const attWrap = document.getElementById('teacher-att-container');
  if (attWrap && window.AttendanceModule) {
    window.AttendanceModule.renderAttendancePage(attWrap);
  }

  // Setup Test Grading listeners
  const stdSelect = document.getElementById('teacher-grading-std-select');
  if (stdSelect) {
    stdSelect.addEventListener('change', (e) => {
      teachersState.selectedStandardId = e.target.value;
      loadTeacherTestsForStandard();
    });
    loadTeacherTestsForStandard();
  }
}

async function loadTeacherTestsForStandard() {
  const stdId = teachersState.selectedStandardId;
  const testSelect = document.getElementById('teacher-grading-test-select');
  if (!stdId || !testSelect) return;

  try {
    const res = await API.getTests(stdId);
    teachersState.tests = res.tests || [];

    testSelect.innerHTML = '<option value="">Select Scheduled Test...</option>' +
      teachersState.tests.map(t => `<option value="${t.id}">${t.name} (${t.subject_name || 'Subject'}) — Max: ${t.max_marks}</option>`).join('');

    testSelect.addEventListener('change', (e) => {
      teachersState.selectedTestId = e.target.value;
      loadTestGradingSheet();
    });
  } catch (err) {
    console.error('Error loading tests for teacher grading:', err);
  }
}

async function loadTestGradingSheet() {
  const testId = teachersState.selectedTestId;
  const tbody = document.getElementById('teacher-marks-tbody');
  const saveBtn = document.getElementById('teacher-save-marks-btn');

  if (!testId) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:var(--space-8)">Select a test from the dropdown above to view student list.</td></tr>`;
    if (saveBtn) saveBtn.disabled = true;
    return;
  }

  const selectedTest = teachersState.tests.find(t => t.id == testId);
  const titleHead = document.getElementById('teacher-test-title-header');
  const subHead = document.getElementById('teacher-test-sub-header');
  if (titleHead && selectedTest) titleHead.innerText = `${selectedTest.name} — Grading Sheet`;
  if (subHead && selectedTest) subHead.innerText = `Subject: ${selectedTest.subject_name || 'General'} | Max Marks: ${selectedTest.max_marks} | Date: ${selectedTest.test_date || 'N/A'}`;

  if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:var(--space-6)"><div class="spinner spinner-sm mx-auto"></div> Loading students...</td></tr>`;

  try {
    const testDetails = await API.getTestDetails(testId);
    const students = testDetails.students || [];

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:var(--space-8)">No students found for this test standard.</td></tr>`;
      if (saveBtn) saveBtn.disabled = true;
      return;
    }

    tbody.innerHTML = students.map(s => {
      const marksVal = s.obtained_marks !== null && s.obtained_marks !== undefined ? s.obtained_marks : '';
      const isAbsent = s.is_absent == 1;

      return `
        <tr>
          <td class="font-mono font-bold">${s.roll_number || '-'}</td>
          <td class="td-primary">${s.name}</td>
          <td>
            <input type="number" class="glass-input teacher-mark-input" data-student-id="${s.id}" value="${marksVal}" max="${selectedTest.max_marks}" min="0" step="0.5" ${isAbsent ? 'disabled' : ''} style="width:100px; text-align:center;">
          </td>
          <td>
            <label style="display:flex; align-items:center; gap:4px; font-size:0.75rem; cursor:pointer;">
              <input type="checkbox" class="teacher-absent-chk" data-student-id="${s.id}" ${isAbsent ? 'checked' : ''}> Absent
            </label>
          </td>
          <td>
            <input type="text" class="glass-input teacher-remark-input" data-student-id="${s.id}" value="${s.remarks || ''}" placeholder="Remarks..." style="padding:6px 10px; font-size:12.5px;">
          </td>
        </tr>
      `;
    }).join('');

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.onclick = () => submitTeacherTestMarks(testId);
    }
  } catch (err) {
    console.error('Error loading grading sheet:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${err.message}</td></tr>`;
  }
}

async function submitTeacherTestMarks(testId) {
  const saveBtn = document.getElementById('teacher-save-marks-btn');
  if (saveBtn) saveBtn.classList.add('btn-loading');

  try {
    const marksData = [];
    document.querySelectorAll('#teacher-marks-tbody tr').forEach(tr => {
      const markInput = tr.querySelector('.teacher-mark-input');
      const absentChk = tr.querySelector('.teacher-absent-chk');
      const remarkInput = tr.querySelector('.teacher-remark-input');

      if (markInput && absentChk) {
        const student_id = markInput.dataset.studentId;
        const is_absent = absentChk.checked ? 1 : 0;
        const obtained_marks = is_absent ? 0 : (markInput.value !== '' ? parseFloat(markInput.value) : null);
        const remarks = remarkInput ? remarkInput.value : '';

        marksData.push({ student_id, obtained_marks, is_absent, remarks });
      }
    });

    await API.saveTestMarks(testId, marksData);
    Utils.showToast('✅ Test marks submitted successfully!', 'success');
  } catch (err) {
    console.error('Error submitting test marks:', err);
    Utils.showToast('❌ Failed to save marks: ' + err.message, 'danger');
  } finally {
    if (saveBtn) saveBtn.classList.remove('btn-loading');
  }
}

window.TeachersModule = {
  renderTeachersPage
};
