/**
 * EduTrack ERP — Teachers Portal Desk
 * Streamlined workflow for faculty to record attendance and enter test marks.
 */

let teachersState = {
  selectedStandardId: null,
  selectedTestId: null,
  standards: [],
  tests: []
};

async function renderTeachersPage(container) {
  if (typeof setPageTitle === 'function') {
    setPageTitle('Teachers Portal Desk', 'Faculty Desk');
  }

  const isTeacher = window._currentUserRole === 'teacher';
  const quickAddBtn = document.getElementById('topbar-quick-add');
  if (isTeacher && quickAddBtn) {
    quickAddBtn.style.display = 'none';
  }

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
        ${!isTeacher ? `
          <button class="btn btn-primary btn-sm" id="add-faculty-btn" onclick="showAddFacultyModal()">
            <span>➕ Add New Faculty</span>
          </button>
        ` : ''}
        <span class="badge badge-info" style="padding:6px 14px; font-weight:700;">👩‍🏫 Faculty Portal Active</span>
      </div>
    </div>

    <!-- Quick Navigation Tabs for Faculty -->
    <div class="tabs mb-6" id="teacher-tabs">
      <button class="tab-btn active" data-tab="quick-attendance">📋 Roll Call Attendance Desk</button>
      <button class="tab-btn" data-tab="test-grading">✏️ Test Marks Grading Desk</button>
      <button class="tab-btn" data-tab="faculty-timetable">🗓️ Faculty Lecture Timetable</button>
      <button class="tab-btn" data-tab="class-overview">📊 Class Performance Overview</button>
      ${!isTeacher ? `<button class="tab-btn" data-tab="faculty-list">👩‍🏫 Faculty Directory &amp; Logins</button>` : ''}
    </div>

    <!-- Tab: Faculty Timetable -->
    <div id="teacher-tab-faculty-timetable" class="teacher-tab-content" style="display:none;">
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-5);">
          <h3>🗓️ Weekly Faculty Teaching Schedule</h3>
          <span class="badge badge-info">Monday — Saturday</span>
        </div>
        <div class="table-wrap">
          <table id="faculty-timetable-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Time Slot</th>
                <th>Subject</th>
                <th>Assigned Class</th>
                <th>Room No</th>
              </tr>
            </thead>
            <tbody id="faculty-timetable-tbody">
              <tr><td colspan="5" class="text-center text-muted" style="padding:24px;">Loading timetable schedule...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab: Faculty Directory & Logins -->
    <div id="teacher-tab-faculty-list" class="teacher-tab-content" style="display:none;">
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-5);">
          <div>
            <h3>👩‍🏫 Faculty Directory &amp; Access Controls</h3>
            <p class="text-xs text-muted" style="margin-top:2px;">Grant or restrict access rights for faculty members to enter marks, take attendance, view timetables, etc.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="showAddFacultyModal()">➕ Add Faculty</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th>Login Username / Email</th>
                <th>Phone</th>
                <th>Assigned Classes</th>
                <th>Permissions</th>
                <th style="width:160px;">Actions</th>
              </tr>
            </thead>
            <tbody id="faculty-directory-tbody">
              <tr><td colspan="6" class="text-center text-muted" style="padding:24px;">Loading faculty list...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
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
      } else if (targetTab === 'faculty-list') {
        loadFacultyDirectory();
      } else if (targetTab === 'faculty-timetable') {
        loadFacultyTimetable();
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

async function showAddFacultyModal() {
  const modalHtml = `
    <div id="add-faculty-modal-overlay" class="modal-overlay">
      <div class="modal modal-md">
        <div class="modal-header">
          <h3>➕ Add New Faculty Member</h3>
          <button class="modal-close" onclick="document.getElementById('add-faculty-modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <form id="add-faculty-form">
            <div class="form-group mb-3">
              <label class="form-label font-bold">Full Name <span class="required">*</span></label>
              <input type="text" id="fac-name" class="form-control" placeholder="e.g. Prof. Ramesh Verma" required
                oninput="autoSuggestFacultyUsername(this.value)">
            </div>
            <div class="form-grid mb-3" style="grid-template-columns: 1fr 1fr; gap:var(--space-3);">
              <div class="form-group">
                <label class="form-label font-bold">Login Username <span class="required">*</span></label>
                <input type="text" id="fac-username" class="form-control font-mono" placeholder="e.g. rameshv" required>
              </div>
              <div class="form-group">
                <label class="form-label font-bold">Phone Number</label>
                <input type="tel" id="fac-phone" class="form-control" placeholder="+91 9876543210">
              </div>
            </div>
            <div class="form-group mb-3">
              <label class="form-label font-bold">Email Address</label>
              <input type="email" id="fac-email" class="form-control" placeholder="e.g. ramesh@edutrack.local">
            </div>
            <div class="form-group mb-3">
              <label class="form-label font-bold">Assigned Classes / Standards</label>
              <input type="text" id="fac-standards" class="form-control" placeholder="e.g. Class 10, Class 12 Science" value="Class 10, Class 12">
            </div>
            <div class="form-group mb-3">
              <label class="form-label font-bold">Subjects Taught</label>
              <input type="text" id="fac-subjects" class="form-control" placeholder="e.g. Mathematics, Physics" value="Mathematics">
            </div>
            <div class="form-group mb-4">
              <div class="flex justify-between items-center mb-1">
                <label class="form-label font-bold" style="margin:0;">Portal Login Password <span class="required">*</span></label>
                <button type="button" class="btn btn-ghost btn-xs text-primary" onclick="generateFacultyRandomPassword('fac-password')">
                  🎲 Generate Random
                </button>
              </div>
              <div style="position:relative; display:flex; align-items:center;">
                <input type="text" id="fac-password" class="form-control font-mono font-bold" value="teacher123" required style="padding-right:36px;">
                <button type="button" class="btn btn-ghost btn-icon-sm" style="position:absolute; right:4px;" 
                  onclick="togglePasswordVisibility('fac-password', this)">👁️</button>
              </div>
            </div>
            <div class="modal-footer" style="padding-right:0; padding-left:0;">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('add-faculty-modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">➕ Create Faculty Account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('add-faculty-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const name = document.getElementById('fac-name').value.trim();
      const username = document.getElementById('fac-username').value.trim();
      const email = document.getElementById('fac-email').value.trim();
      const phone = document.getElementById('fac-phone').value.trim();
      const assigned_standards = document.getElementById('fac-standards').value.trim();
      const subjects_taught = document.getElementById('fac-subjects').value.trim();
      const password = document.getElementById('fac-password').value.trim();

      const res = await API.teachers.add({
        name, username, email, phone, assigned_standards, subjects_taught, password
      });

      document.getElementById('add-faculty-modal-overlay').remove();
      Toast.success('Faculty Created', `Login: ${res.username || res.credentials?.username} | Password: ${res.credentials?.password || password}`);
      loadFacultyDirectory();
    } catch (err) {
      Toast.error('Creation Failed', err.message);
    }
  });
}

function autoSuggestFacultyUsername(name) {
  const userInp = document.getElementById('fac-username');
  const emailInp = document.getElementById('fac-email');
  if (!userInp || !name) return;
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.length > 0 && (!userInp.dataset.userEdited || userInp.dataset.userEdited === 'false')) {
    userInp.value = clean;
    if (emailInp && (!emailInp.value || emailInp.value.includes('@edutrack.local'))) {
      emailInp.value = `${clean}@edutrack.local`;
    }
  }
}

function generateFacultyRandomPassword(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  inp.value = pass;
  Toast.info('Random Password Generated', pass);
}

window.showAddFacultyModal = showAddFacultyModal;
window.autoSuggestFacultyUsername = autoSuggestFacultyUsername;
window.generateFacultyRandomPassword = generateFacultyRandomPassword;

// ─── Faculty Directory & Permissions Management ────────────────────────────

async function loadFacultyDirectory() {
  const tbody = document.getElementById('faculty-directory-tbody');
  if (!tbody) return;

  try {
    const res = await API.teachers.list();
    const teachers = res.teachers || [];

    if (teachers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">No faculty accounts created yet. Click "Add Faculty" to create one.</td></tr>`;
      return;
    }

    const PERM_LABELS = {
      'view_students': '👥 Students',
      'take_attendance': '📋 Attendance',
      'enter_marks': '✏️ Marks',
      'view_timetable': '🗓️ Timetable',
      'edit_timetable': '⚙️ Edit Slots',
      'view_tests': '📝 Tests',
      'create_tests': '➕ Add Tests',
      'view_results': '📊 Results',
      'view_reminders': '📢 Notices',
      'manage_reminders': '📌 Publish',
    };

    const portalUrl = window.location.origin;

    tbody.innerHTML = teachers.map(t => {
      const perms = t.permissions || [];
      const permBadges = perms.length > 0
        ? perms.map(p => `<span class="badge badge-info" style="font-size:0.68rem; margin:1px;">${PERM_LABELS[p] || p}</span>`).join(' ')
        : `<span class="text-xs text-muted">Standard Desk</span>`;

      const safePass = t.plain_password || 'teacher123';
      const safeUser = t.username || t.email.split('@')[0];

      return `
        <tr id="faculty-row-${t.id}">
          <td>
            <div style="font-weight:700; color:var(--text-primary);">${t.name}</div>
            <div class="text-xs text-muted">${t.subjects_taught || 'General Faculty'}</div>
          </td>
          <td>
            <div style="position:relative; display:flex; align-items:center;">
              <input type="text" class="form-control form-control-sm font-mono font-bold"
                id="fac-user-${t.id}"
                value="${safeUser}"
                style="color:#38bdf8; background:rgba(0,0,0,0.04); border:1px solid #cbd5e1; max-width:140px;"
                onchange="updateFacultyCredentialInline(${t.id}, 'username', this.value, this)"
                title="Click to edit username. Auto-saves to database.">
            </div>
            <div class="text-xs text-muted mt-1 font-mono">${t.email}</div>
          </td>
          <td>
            <div style="position:relative; display:flex; align-items:center; gap:3px;">
              <input type="password" class="form-control form-control-sm font-mono font-bold"
                id="fac-pass-${t.id}"
                value="${safePass}"
                style="color:#10b981; background:rgba(0,0,0,0.04); border:1px solid #cbd5e1; max-width:130px; padding-right:26px;"
                onchange="updateFacultyCredentialInline(${t.id}, 'password', this.value, this)"
                title="Click to edit password. Auto-saves to database.">
              <button type="button" class="btn btn-ghost btn-icon-sm" style="position:absolute; right:3px; opacity:0.65;"
                onclick="togglePasswordVisibility('fac-pass-${t.id}', this)" title="Show/Hide Password">👁️</button>
            </div>
          </td>
          <td>
            <div class="font-mono text-sm">${t.phone || '—'}</div>
          </td>
          <td>
            <span class="badge badge-gray text-xs">${t.assigned_standards || 'All Classes'}</span>
          </td>
          <td>
            <div style="max-width:180px; display:flex; flex-wrap:wrap; gap:2px;">
              ${permBadges}
            </div>
          </td>
          <td>
            <div style="display:flex; gap:4px; align-items:center;">
              <button class="btn btn-outline btn-sm" onclick="showEditFacultyModal(${t.id})" title="Edit Faculty &amp; Credentials">
                ✏️ Edit
              </button>
              <button class="btn btn-ghost btn-icon-sm" onclick="showFacultyPermissionsModal(${t.id}, '${t.name.replace(/'/g, "\\'")}')" title="Manage Permissions">
                🔑
              </button>
              <button class="btn btn-ghost btn-icon-sm" onclick="copyFacultyCredentialsToClipboard('${t.name.replace(/'/g, "\\'")}', document.getElementById('fac-user-${t.id}').value, '${t.email}', document.getElementById('fac-pass-${t.id}').value, '${portalUrl}')" title="Copy Login Details">
                📋
              </button>
              <button class="btn btn-ghost btn-icon-sm" onclick="deleteFacultyAccount(${t.id})" style="color:var(--danger);" title="Delete Faculty Account">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load faculty: ${err.message}</td></tr>`;
  }
}

async function updateFacultyCredentialInline(teacherId, field, val, inputEl) {
  const userInp = document.getElementById(`fac-user-${teacherId}`);
  const passInp = document.getElementById(`fac-pass-${teacherId}`);
  if (!userInp || !passInp) return;

  const username = userInp.value.trim();
  const password = passInp.value.trim();

  if (!username || !password) {
    Toast.warning('Validation Error', 'Username and Password cannot be empty.');
    return;
  }

  try {
    inputEl.style.borderColor = '#fbbf24';
    await API.teachers.updateCredentials(teacherId, {
      username,
      password
    });

    inputEl.style.borderColor = '#10b981';
    Toast.success('Saved to Database', `Updated credentials for Faculty #${teacherId}`);
    setTimeout(() => {
      if (inputEl) inputEl.style.borderColor = '#cbd5e1';
    }, 1500);
  } catch(err) {
    inputEl.style.borderColor = '#ef4444';
    Toast.error('Save Failed', err.message);
  }
}
window.updateFacultyCredentialInline = updateFacultyCredentialInline;

async function showEditFacultyModal(teacherId) {
  try {
    const teacher = await API.teachers.get(teacherId);
    if (!teacher) throw new Error('Faculty details not found');

    const safePass = teacher.plain_password || 'teacher123';
    const safeUser = teacher.username || teacher.email.split('@')[0];

    const modalHtml = `
      <div id="edit-faculty-modal-overlay" class="modal-overlay">
        <div class="modal modal-md">
          <div class="modal-header">
            <h3>✏️ Edit Faculty &amp; Credentials — ${teacher.name}</h3>
            <button class="modal-close" onclick="document.getElementById('edit-faculty-modal-overlay').remove()">✕</button>
          </div>
          <div class="modal-body">
            <form id="edit-faculty-form">
              <div class="form-group mb-3">
                <label class="form-label font-bold">Full Name <span class="required">*</span></label>
                <input type="text" id="edit-fac-name" class="form-control" value="${teacher.name}" required>
              </div>
              <div class="form-grid mb-3" style="grid-template-columns: 1fr 1fr; gap:var(--space-3);">
                <div class="form-group">
                  <label class="form-label font-bold">Login Username <span class="required">*</span></label>
                  <input type="text" id="edit-fac-username" class="form-control font-mono font-bold" value="${safeUser}" required>
                </div>
                <div class="form-group">
                  <label class="form-label font-bold">Phone Number</label>
                  <input type="tel" id="edit-fac-phone" class="form-control" value="${teacher.phone || ''}">
                </div>
              </div>
              <div class="form-group mb-3">
                <label class="form-label font-bold">Email Address</label>
                <input type="email" id="edit-fac-email" class="form-control" value="${teacher.email}">
              </div>
              <div class="form-group mb-3">
                <label class="form-label font-bold">Assigned Classes / Standards</label>
                <input type="text" id="edit-fac-standards" class="form-control" value="${teacher.assigned_standards || 'All Classes'}">
              </div>
              <div class="form-group mb-3">
                <label class="form-label font-bold">Subjects Taught</label>
                <input type="text" id="edit-fac-subjects" class="form-control" value="${teacher.subjects_taught || ''}">
              </div>
              <div class="form-group mb-4">
                <div class="flex justify-between items-center mb-1">
                  <label class="form-label font-bold" style="margin:0;">Portal Login Password <span class="required">*</span></label>
                  <button type="button" class="btn btn-ghost btn-xs text-primary" onclick="generateFacultyRandomPassword('edit-fac-password')">
                    🎲 Generate Random
                  </button>
                </div>
                <div style="position:relative; display:flex; align-items:center;">
                  <input type="text" id="edit-fac-password" class="form-control font-mono font-bold" value="${safePass}" required style="padding-right:36px;">
                  <button type="button" class="btn btn-ghost btn-icon-sm" style="position:absolute; right:4px;" 
                    onclick="togglePasswordVisibility('edit-fac-password', this)">👁️</button>
                </div>
              </div>
              <div class="modal-footer" style="padding-right:0; padding-left:0;">
                <button type="button" class="btn btn-outline" onclick="document.getElementById('edit-faculty-modal-overlay').remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">💾 Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('edit-faculty-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const name = document.getElementById('edit-fac-name').value.trim();
        const username = document.getElementById('edit-fac-username').value.trim();
        const email = document.getElementById('edit-fac-email').value.trim();
        const phone = document.getElementById('edit-fac-phone').value.trim();
        const assigned_standards = document.getElementById('edit-fac-standards').value.trim();
        const subjects_taught = document.getElementById('edit-fac-subjects').value.trim();
        const password = document.getElementById('edit-fac-password').value.trim();

        await API.teachers.update(teacherId, {
          name, username, email, phone, assigned_standards, subjects_taught, password
        });

        document.getElementById('edit-faculty-modal-overlay').remove();
        Toast.success('Faculty Updated', `Details and credentials updated for ${name}.`);
        loadFacultyDirectory();
      } catch (err) {
        Toast.error('Update Failed', err.message);
      }
    });
  } catch (err) {
    Toast.error('Load Failed', err.message);
  }
}
window.showEditFacultyModal = showEditFacultyModal;

function copyFacultyCredentialsToClipboard(name, username, email, password, portalUrl) {
  const text = `👨‍🏫 APEX TUITION ERP — FACULTY LOGIN\nFaculty: ${name}\n🌐 Portal URL: ${portalUrl}\n👤 Username: ${username}\n📧 Email: ${email}\n🔑 Password: ${password}\n\nLogin directly at: ${portalUrl}`;
  navigator.clipboard.writeText(text).then(() => {
    Toast.success('Copied!', `Login credentials for ${name} copied to clipboard.`);
  }).catch(() => {
    Toast.info('Faculty Login Info', `Username: ${username} | Password: ${password}`);
  });
}
window.copyFacultyCredentialsToClipboard = copyFacultyCredentialsToClipboard;

async function loadFacultyTimetable() {
  const tbody = document.getElementById('faculty-timetable-tbody');
  if (!tbody) return;
  try {
    const res = await API.request('/timetable');
    const slots = res.slots || [];

    if (slots.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">No lecture slots scheduled in timetable.</td></tr>`;
      return;
    }

    tbody.innerHTML = slots.map(s => `
      <tr>
        <td><span class="badge badge-primary">${s.day_of_week}</span></td>
        <td class="font-mono font-bold">${s.time_slot || (s.start_time + ' - ' + s.end_time)}</td>
        <td class="td-primary">${s.subject_name}</td>
        <td>${s.class_name || 'Class'}</td>
        <td>${s.room_no || 'Hall A'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load schedule: ${err.message}</td></tr>`;
  }
}

async function showFacultyPermissionsModal(teacherId, teacherName) {
  let currentPerms = [];
  try {
    const teacher = await API.teachers.get(teacherId);
    currentPerms = teacher.permissions || [];
  } catch (err) {
    Toast.error('Error', 'Failed to load teacher permissions');
    return;
  }

  const ALL_PERMISSIONS = [
    { key: 'take_attendance',  label: '📋 Take Class Attendance', desc: 'Allow faculty to mark daily/lecture roll call attendance' },
    { key: 'enter_marks',      label: '✏️ Enter & Grade Test Marks', desc: 'Allow faculty to grade student tests & unit exams' },
    { key: 'view_students',    label: '👥 View Student Profiles', desc: 'Allow faculty to browse student details in their classes' },
    { key: 'view_timetable',   label: '🗓️ View Master Timetable', desc: 'Allow faculty to see full academy lecture timetable' },
    { key: 'edit_timetable',   label: '⚙️ Edit Timetable Slots', desc: 'Allow faculty to create or adjust timetable slots' },
    { key: 'view_tests',       label: '📝 View Exam Schedules', desc: 'Allow faculty to see upcoming test lists & syllabus' },
    { key: 'create_tests',     label: '➕ Create Scheduled Tests', desc: 'Allow faculty to add new tests for their assigned subjects' },
    { key: 'view_results',     label: '📊 View Student Results', desc: 'Allow faculty to view student result cards & ranks' },
    { key: 'view_reminders',   label: '📢 View Notices & Reminders', desc: 'Allow faculty to see published announcements' },
    { key: 'manage_reminders', label: '📌 Create & Publish Notices', desc: 'Allow faculty to compose and post notices to parents' },
  ];

  const modalHtml = `
    <div id="faculty-perm-modal" class="modal-overlay">
      <div class="modal modal-md">
        <div class="modal-header">
          <h3>🔑 Manage Permissions — ${teacherName}</h3>
          <button class="modal-close" onclick="document.getElementById('faculty-perm-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <p class="text-xs text-muted mb-4">Check the boxes below to grant specific access capabilities to <strong>${teacherName}</strong> when they sign in.</p>
          <form id="faculty-perm-form">
            <div style="display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; padding-right:6px;">
              ${ALL_PERMISSIONS.map(p => {
                const isChecked = currentPerms.includes(p.key);
                return `
                  <label style="display:flex; align-items:start; gap:12px; padding:10px 14px; border:1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}; border-radius:10px; background:${isChecked ? 'rgba(46,184,160,0.08)' : 'var(--bg-surface)'}; cursor:pointer; transition:all 0.2s ease;">
                    <input type="checkbox" name="fac-perm" value="${p.key}" ${isChecked ? 'checked' : ''} style="margin-top:3px; width:16px; height:16px;">
                    <div>
                      <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">${p.label}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">${p.desc}</div>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
            <div class="modal-footer" style="padding-right:0; padding-left:0; margin-top:16px;">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('faculty-perm-modal').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">💾 Save Permissions</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('faculty-perm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const checked = Array.from(document.querySelectorAll('input[name="fac-perm"]:checked')).map(cb => cb.value);
    try {
      await API.teacherPermissions.update(teacherId, checked);
      document.getElementById('faculty-perm-modal').remove();
      Toast.success('Permissions Updated', `Access rights saved for ${teacherName}.`);
      loadFacultyDirectory();
    } catch (err) {
      Toast.error('Save Failed', err.message);
    }
  });
}

async function deleteFacultyAccount(id) {
  showConfirm('Delete Faculty', 'Are you sure you want to remove this faculty account?', async () => {
    try {
      await API.teachers.delete(id);
      Toast.success('Faculty Deleted', 'Account removed.');
      loadFacultyDirectory();
    } catch (err) {
      Toast.error('Delete Failed', err.message);
    }
  });
}

window.showFacultyPermissionsModal = showFacultyPermissionsModal;
window.deleteFacultyAccount = deleteFacultyAccount;
window.loadFacultyDirectory = loadFacultyDirectory;
window.loadFacultyTimetable = loadFacultyTimetable;

window.TeachersModule = {
  renderTeachersPage
};
