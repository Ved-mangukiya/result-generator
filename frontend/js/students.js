/* ═══════════════════════════════════════════════
   STUDENTS.JS — Student CRUD + Marks Entry
   ═══════════════════════════════════════════════ */

let _studentsStandardId = null;
let _studentsList = [];
let _studentsSearch = '';

let _currentStudentsTab = 'directory'; // 'directory', 'admissions', 'fees'

async function renderStudents(params = {}) {
  setPageTitle('Admissions & Fees', 'Admissions & Fees');
  
  if (params.standardId) {
    const parsed = parseInt(params.standardId);
    _studentsStandardId = !isNaN(parsed) ? parsed : null;
    if (_studentsStandardId) localStorage.setItem('tuition_erp_students_standard_id', _studentsStandardId);
  } else {
    const cachedStd = localStorage.getItem('tuition_erp_students_standard_id');
    const parsed = parseInt(cachedStd);
    _studentsStandardId = (!isNaN(parsed) && cachedStd !== 'null' && cachedStd !== 'undefined') ? parsed : null;
  }
  
  _studentsSearch = localStorage.getItem('tuition_erp_students_search') || '';
  _currentStudentsTab = localStorage.getItem('tuition_erp_students_tab') || 'directory';
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Admissions &amp; Fees</h1>
        <p>Manage student profiles, enrollment statuses, and tuition fee ledgers.</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" onclick="showCredentialExportModal()">📇 Credential Slips</button>
        <button class="btn btn-outline btn-sm" onclick="resequenceRollNumbers()">${Icons?.render?.('refresh',{size:14}) || ''} Resequence Rolls</button>
        <button class="btn btn-outline btn-sm" onclick="Router.navigate('import')">${Icons?.render?.('import',{size:14}) || ''} Import Excel</button>
        <button class="btn btn-outline btn-sm" onclick="showDirectGridAdmissionModal()">${Icons?.render?.('chart',{size:14}) || ''} Direct Grid Entry</button>
        <button class="btn btn-primary btn-sm" onclick="showAddStudentModal()">${Icons?.render?.('add',{size:14}) || ''} Add Student</button>
      </div>
    </div>

    <!-- ERP Navigation Tabs -->
    <div class="tabs mb-6">
      <button class="btn ${_currentStudentsTab === 'directory' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tab-directory" onclick="switchStudentsTab('directory')">${Icons?.render?.('students',{size:14}) || ''} Student Directory</button>
      <button class="btn ${_currentStudentsTab === 'credentials' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tab-credentials" onclick="switchStudentsTab('credentials')">🔑 Portal Credentials</button>
      <button class="btn ${_currentStudentsTab === 'admissions' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tab-admissions" onclick="switchStudentsTab('admissions')">${Icons?.render?.('school',{size:14}) || ''} Admissions &amp; Status</button>
      <button class="btn ${_currentStudentsTab === 'fees' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tab-fees" onclick="switchStudentsTab('fees')">${Icons?.render?.('fees',{size:14}) || ''} Fees &amp; Ledger</button>
      <button class="btn ${_currentStudentsTab === 'graduated' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tab-graduated" onclick="switchStudentsTab('graduated')">${Icons?.render?.('school',{size:14}) || ''} Graduated Records</button>
    </div>

    <div id="students-tab-content">
      <!-- Injected dynamically -->
    </div>
  `;

  await switchStudentsTab(_currentStudentsTab);
}

async function switchStudentsTab(tab) {
  _currentStudentsTab = tab;
  localStorage.setItem('tuition_erp_students_tab', tab);
  
  const btnDir = document.getElementById('btn-tab-directory');
  const btnCred = document.getElementById('btn-tab-credentials');
  const btnAdm = document.getElementById('btn-tab-admissions');
  const btnFees = document.getElementById('btn-tab-fees');
  const btnGrad = document.getElementById('btn-tab-graduated');
  
  if (btnDir) btnDir.className = `btn ${tab === 'directory' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnCred) btnCred.className = `btn ${tab === 'credentials' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnAdm) btnAdm.className = `btn ${tab === 'admissions' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnFees) btnFees.className = `btn ${tab === 'fees' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnGrad) btnGrad.className = `btn ${tab === 'graduated' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  
  const container = document.getElementById('students-tab-content');
  if (!container) return;

  if (tab === 'credentials') {
    container.innerHTML = `
      <!-- Credentials Sub-tab Switcher -->
      <div class="flex gap-2 mb-4">
        <button class="btn ${_credActiveSubTab === 'students' ? 'btn-primary' : 'btn-outline'} btn-sm" id="subtab-cred-students" onclick="switchCredentialsSubTab('students')">
          🎓 Student &amp; Parent Credentials
        </button>
        <button class="btn ${_credActiveSubTab === 'teachers' ? 'btn-primary' : 'btn-outline'} btn-sm" id="subtab-cred-teachers" onclick="switchCredentialsSubTab('teachers')">
          👨‍🏫 Faculty &amp; Teacher Credentials
        </button>
      </div>

      <!-- Toolbar -->
      <div class="card mb-4" id="cred-toolbar-card">
        <div class="card-body" style="padding:var(--space-4)">
          <div class="flex gap-3 flex-wrap items-center justify-between">
            <div class="flex gap-3 flex-wrap items-center" style="flex:1;">
              <div class="search-input-wrap" style="flex:1;min-width:220px">
                <span class="search-icon">🔍</span>
                <input type="text" class="form-control" id="cred-search" placeholder="Search by name, roll, or username..." 
                  oninput="debouncedSearchCredentials(this.value)">
              </div>
              <div id="cred-student-filters" class="flex gap-2" style="${_credActiveSubTab === 'teachers' ? 'display:none;' : 'display:flex;'}">
                <select class="form-control" style="width:220px" id="cred-filter-std" onchange="filterCredentialsStandard(this.value)">
                  <option value="all">All Classes</option>
                </select>
                <select class="form-control" style="width:180px; display:none" id="cred-filter-batch" onchange="filterCredentialsBatch(this.value)">
                  <option value="all">All Batches</option>
                </select>
              </div>
            </div>
            
            <div class="flex gap-2" id="cred-action-buttons">
              ${_credActiveSubTab === 'students' ? `
                <button class="btn btn-teal btn-sm" onclick="showBulkCredentialGeneratorModal()" style="background:linear-gradient(135deg,#d97706,#b45309);color:white;border:none;font-weight:700;">
                  ⚡ Bulk Generator / Randomizer
                </button>
                <button class="btn btn-outline btn-sm" onclick="showCredentialExportModal()">
                  📇 Export All Slips (PDF)
                </button>
              ` : `
                <button class="btn btn-primary btn-sm" onclick="showAddFacultyModal()">
                  ➕ Add Faculty Member
                </button>
              `}
            </div>
          </div>
        </div>
      </div>

      <!-- Credentials Live Table -->
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <div>
            <h3 style="margin:0;" id="cred-table-title">${_credActiveSubTab === 'students' ? 'Student &amp; Parent Web Portal Credentials' : 'Faculty &amp; Teacher Web Portal Credentials'}</h3>
            <p class="text-xs text-muted" style="margin:0;" id="cred-table-desc">Edit login IDs or passwords in realtime. Changes sync instantly with database.</p>
          </div>
          <span class="badge badge-primary" id="cred-count">0</span>
        </div>
        <div class="card-body" id="credentials-body" style="padding: var(--space-6);">
          <div class="empty-state" style="padding:var(--space-12)">
            <div class="animate-pulse" style="font-size:2.5rem">🔑</div>
            <p class="text-muted text-sm mt-2">Loading credentials...</p>
          </div>
        </div>
      </div>
    `;
    if (_credActiveSubTab === 'students') {
      await loadCredentialsStandardsDropdown();
    }
    await loadCredentialsData();
    return;
  }
  
  if (tab === 'directory') {
    container.innerHTML = `
      <!-- Filters -->
      <div class="card mb-4">
        <div class="card-body" style="padding:var(--space-4)">
          <div class="flex gap-3 flex-wrap">
            <div class="search-input-wrap" style="flex:1;min-width:200px">
              <span class="search-icon">🔍</span>
              <input type="text" class="form-control" id="student-search" placeholder="Search by name or roll number..." 
                value="${_studentsSearch}" oninput="debouncedSearchStudents(this.value)">
            </div>
            <select class="form-control" style="width:260px" id="student-filter-std" onchange="filterByStandard(this.value)">
              <option value="">All Classes</option>
            </select>
            <select class="form-control" style="width:260px; display:none" id="student-filter-batch" onchange="filterByBatch(this.value)">
              <option value="">All Batches</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Students List -->
      <div class="card">
        <div class="card-header">
          <h3>Student Records</h3>
          <span class="badge badge-primary" id="student-count">0</span>
        </div>
        <div class="card-body" id="students-body" style="padding: var(--space-6);">
          <div class="empty-state" style="padding:var(--space-12)">
            <div class="animate-pulse" style="font-size:2.5rem">👥</div>
            <p class="text-muted text-sm mt-2">Loading students...</p>
          </div>
        </div>
      </div>
    `;
    await loadStandardsDropdown();
    if (_studentsStandardId) {
      document.getElementById('student-filter-std').value = _studentsStandardId;
      await filterByStandard(_studentsStandardId, true);
    }
    await loadStudents();
  } else if (tab === 'admissions') {
    container.innerHTML = `
      <!-- Filters -->
      <div class="card mb-4">
        <div class="card-body" style="padding:var(--space-4)">
          <div class="flex gap-3 flex-wrap items-center">
            <label class="form-label mb-0" style="font-weight:600">Select Class:</label>
            <select class="form-control" style="width:260px" id="admission-filter-std" onchange="loadAdmissionsTab(this.value)">
              <option value="">— Select Class —</option>
            </select>
            <div class="search-input-wrap" style="flex:1;min-width:200px">
              <span class="search-icon">🔍</span>
              <input type="text" class="form-control" id="admission-search" placeholder="Search by student name or roll number..." oninput="filterAdmissionsTable(this.value)">
            </div>
          </div>
        </div>
      </div>
      
      <div id="admissions-tab-body">
        <div class="empty-state" style="height:250px">
          <div class="empty-state-icon">${Icons?.render?.('boards',{size:36}) || ''}</div>
          <h3>Select a Class</h3>
          <p>Choose a class from the dropdown above to view enrollment and admissions status tracking.</p>
        </div>
      </div>
    `;
    await loadAdmissionsDropdown();
  } else if (tab === 'fees') {
    container.innerHTML = `
      <!-- Filters -->
      <div class="card mb-4">
        <div class="card-body" style="padding:var(--space-4)">
          <div class="flex gap-3 flex-wrap items-center">
            <label class="form-label mb-0" style="font-weight:600">Select Class:</label>
            <select class="form-control" style="width:260px" id="fees-filter-std" onchange="loadFeesTab(this.value)">
              <option value="">— Select Class —</option>
            </select>
            <div class="search-input-wrap" style="flex:1;min-width:200px">
              <span class="search-icon">🔍</span>
              <input type="text" class="form-control" id="fees-search" placeholder="Search by student name or roll number..." oninput="filterFeesTable(this.value)">
            </div>
          </div>
        </div>
      </div>

      <div id="fees-tab-body">
        <div class="empty-state" style="height:250px">
          <div class="empty-state-icon">${Icons?.render?.('fees',{size:36}) || ''}</div>
          <h3>Select a Class</h3>
          <p>Choose a class from the dropdown above to manage fee balances, ledgers, and payments.</p>
        </div>
      </div>
    `;
    await loadFeesDropdown();
  } else if (tab === 'graduated') {
    container.innerHTML = `
      <!-- Filters -->
      <div class="card mb-4">
        <div class="card-body" style="padding:var(--space-4)">
          <div class="flex gap-3 flex-wrap">
            <div class="search-input-wrap" style="flex:1;min-width:200px">
              <span class="search-icon">🔍</span>
              <input type="text" class="form-control" id="graduated-search" placeholder="Search by graduated student name..." 
                value="${_graduatedStudentsSearch}" oninput="debouncedSearchGraduatedStudents(this.value)">
            </div>
            <select class="form-control" style="width:260px" id="graduated-filter-std" onchange="filterGraduatedByStandard(this.value)">
              <option value="">All Classes</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Graduated List -->
      <div class="card">
        <div class="card-header">
          <h3>Graduated Students History</h3>
          <span class="badge badge-success" id="graduated-count">0</span>
        </div>
        <div class="card-body" id="graduated-body" style="padding: var(--space-6);">
          <div class="empty-state" style="padding:var(--space-12)">
            <div class="animate-pulse" style="font-size:2.5rem">🎓</div>
            <p class="text-muted text-sm mt-2">Loading graduated students...</p>
          </div>
        </div>
      </div>
    `;
    await loadGraduatedStandardsDropdown();
    await loadGraduatedStudents();
  }
}

let _graduatedStudentsList = [];
let _graduatedStudentsSearch = '';
let _graduatedStandardId = null;

async function loadGraduatedStudents() {
  try {
    const body = document.getElementById('graduated-body');
    const stdId = document.getElementById('graduated-filter-std')?.value || _graduatedStandardId;
    const search = document.getElementById('graduated-search')?.value || '';
    
    _graduatedStudentsList = await API.students.list(stdId, null, search, 'Completed');
    
    document.getElementById('graduated-count').textContent = _graduatedStudentsList.length;
    
    if (_graduatedStudentsList.length === 0) {
      body.innerHTML = `
        <div class="empty-state" style="padding:var(--space-12)">
          <div class="empty-state-icon">${Icons?.render?.('school',{size:36}) || ''}</div>
          <h3>No Graduated Students</h3>
          <p>No historical records match the active criteria.</p>
        </div>`;
      return;
    }
    
    body.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Roll No.</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Board</th>
              <th>Admission Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
             ${_graduatedStudentsList.map(s => {
                return `
                <tr>
                  <td>
                    <div class="student-avatar" style="width:36px;height:42px;border-radius:var(--radius-sm)">
                      ${s.photo_path ? `<img src="/${getPhotoThumbPath(s.photo_path)}" alt="${s.name}">` : s.name[0].toUpperCase()}
                    </div>
                  </td>
                  <td><span class="badge badge-gray">${s.roll_number}</span></td>
                  <td class="td-primary">${s.name}</td>
                  <td class="text-sm">${s.standard_name || '—'}</td>
                  <td><span class="badge badge-primary">${s.board_short || '—'}</span></td>
                  <td>${Format.date(s.admission_date)}</td>
                  <td>
                    <div class="td-actions">
                      <button class="btn btn-ghost btn-icon-sm" onclick="showStudentLedgerModal(${s.id}, '${s.name.replace(/'/g, "\\'")}')" title="View Fee Ledger">${Icons?.render?.('fees',{size:14}) || ''}</button>
                      <button class="btn btn-outline btn-sm" onclick="revertGraduation(${s.id}, '${s.name.replace(/'/g, "\\'")}')" style="font-size:0.75rem; padding: 2px 6px;">Restore Active</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    Toast.error('Failed to load graduated students', err.message);
  }
}

async function revertGraduation(studentId, name) {
  const ok = await Confirm.show('Undo Graduation?', `Are you sure you want to revert graduation for ${name}? This will restore them as an Active current student.`, 'Restore Student', 'btn-primary', Icons?.render?.('school',{size:28}) || '');
  if (!ok) return;

  try {
    const student = await API.students.get(studentId);
    student.status = 'Active';
    await API.students.update(studentId, student);
    Toast.success('Student Restored', `${name} is now marked as Active.`);
    await loadGraduatedStudents();
  } catch (err) {
    Toast.error('Restore Failed', err.message);
  }
}

async function loadGraduatedStandardsDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('graduated-filter-std');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Classes</option>';
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
  } catch {}
}

const debouncedSearchGraduatedStudents = debounce((val) => {
  _graduatedStudentsSearch = val;
  loadGraduatedStudents();
}, 300);

function filterGraduatedByStandard(val) {
  _graduatedStandardId = val ? parseInt(val) : null;
  loadGraduatedStudents();
}

// ─── Credentials Hub Tab Helpers ─────────────────────────────────────────────
let _credentialsList = [];
let _teachersCredList = [];
let _credActiveSubTab = 'students';
let _credSearch = '';
let _credStandardId = 'all';
let _credBatchId = 'all';

function switchCredentialsSubTab(subtab) {
  _credActiveSubTab = subtab;
  _credSearch = '';
  const searchInp = document.getElementById('cred-search');
  if (searchInp) searchInp.value = '';

  const btnStudents = document.getElementById('subtab-cred-students');
  const btnTeachers = document.getElementById('subtab-cred-teachers');
  if (btnStudents) btnStudents.className = `btn ${subtab === 'students' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnTeachers) btnTeachers.className = `btn ${subtab === 'teachers' ? 'btn-primary' : 'btn-outline'} btn-sm`;

  const studentFilters = document.getElementById('cred-student-filters');
  if (studentFilters) studentFilters.style.display = subtab === 'students' ? 'flex' : 'none';

  const actionButtons = document.getElementById('cred-action-buttons');
  if (actionButtons) {
    actionButtons.innerHTML = subtab === 'students' ? `
      <button class="btn btn-teal btn-sm" onclick="showBulkCredentialGeneratorModal()" style="background:linear-gradient(135deg,#d97706,#b45309);color:white;border:none;font-weight:700;">
        ⚡ Bulk Generator / Randomizer
      </button>
      <button class="btn btn-outline btn-sm" onclick="showCredentialExportModal()">
        📇 Export All Slips (PDF)
      </button>
    ` : `
      <button class="btn btn-primary btn-sm" onclick="showAddFacultyModal()">
        ➕ Add Faculty Member
      </button>
    `;
  }

  const tableTitle = document.getElementById('cred-table-title');
  const tableDesc = document.getElementById('cred-table-desc');
  if (tableTitle) tableTitle.textContent = subtab === 'students' ? 'Student & Parent Web Portal Credentials' : 'Faculty & Teacher Web Portal Credentials';
  if (tableDesc) tableDesc.textContent = subtab === 'students' 
    ? 'Edit login IDs or passwords in realtime. Changes sync instantly with database.' 
    : 'Manage teacher usernames, passwords, phone numbers, and portal credentials with instant database sync.';

  loadCredentialsData();
}
window.switchCredentialsSubTab = switchCredentialsSubTab;

async function loadCredentialsStandardsDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('cred-filter-std');
    if (!sel) return;
    sel.innerHTML = '<option value="all">All Classes</option>';
    for (const board of boards) {
      const standards = await API.boards.getStandards(board.id);
      if (standards.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = board.short_name;
        standards.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.display_name;
          if (String(s.id) === String(_credStandardId)) opt.selected = true;
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      }
    }
  } catch(e) {
    console.error('Error loading credentials standards:', e);
  }
}

const debouncedSearchCredentials = debounce((val) => {
  _credSearch = val;
  loadCredentialsData();
}, 250);
window.debouncedSearchCredentials = debouncedSearchCredentials;

function filterCredentialsStandard(val) {
  _credStandardId = val;
  const batchSel = document.getElementById('cred-filter-batch');
  if (val && val !== 'all') {
    API.batches.list(val).then(batches => {
      if (batchSel) {
        batchSel.innerHTML = '<option value="all">All Batches</option>' + (batches || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        batchSel.style.display = 'block';
      }
      loadCredentialsData();
    }).catch(() => loadCredentialsData());
  } else {
    if (batchSel) {
      batchSel.style.display = 'none';
      batchSel.value = 'all';
    }
    _credBatchId = 'all';
    loadCredentialsData();
  }
}
window.filterCredentialsStandard = filterCredentialsStandard;

function filterCredentialsBatch(val) {
  _credBatchId = val;
  loadCredentialsData();
}
window.filterCredentialsBatch = filterCredentialsBatch;

async function loadCredentialsData() {
  const body = document.getElementById('credentials-body');
  if (!body) return;

  if (_credActiveSubTab === 'teachers') {
    try {
      const res = await API.teachers.list();
      let teachers = res.teachers || [];

      if (_credSearch && _credSearch.trim() !== '') {
        const q = _credSearch.trim().toLowerCase();
        teachers = teachers.filter(t => 
          (t.name && t.name.toLowerCase().includes(q)) ||
          (t.username && t.username.toLowerCase().includes(q)) ||
          (t.email && t.email.toLowerCase().includes(q)) ||
          (t.phone && t.phone.toLowerCase().includes(q)) ||
          (t.subjects_taught && t.subjects_taught.toLowerCase().includes(q))
        );
      }

      _teachersCredList = teachers;
      const countEl = document.getElementById('cred-count');
      if (countEl) countEl.textContent = teachers.length;

      if (teachers.length === 0) {
        body.innerHTML = `
          <div class="empty-state" style="padding:var(--space-12)">
            <div class="empty-state-icon">👩‍🏫</div>
            <h3>No Faculty Credentials Found</h3>
            <p>${_credSearch ? `No faculty accounts match "${_credSearch}".` : 'No faculty records created yet. Click "Add Faculty Member" to create one.'}</p>
          </div>`;
        return;
      }

      renderFacultyCredentialsTable();
    } catch (err) {
      body.innerHTML = `<div class="empty-state text-danger"><p>Failed to load faculty credentials: ${err.message}</p></div>`;
    }
    return;
  }

  // Students Subtab
  try {
    _credentialsList = await API.students.listCredentials(_credStandardId, _credBatchId, _credSearch);
    const countEl = document.getElementById('cred-count');
    if (countEl) countEl.textContent = _credentialsList.length;

    if (_credentialsList.length === 0) {
      body.innerHTML = `
        <div class="empty-state" style="padding:var(--space-12)">
          <div class="empty-state-icon">🔑</div>
          <h3>No Student Credentials Found</h3>
          <p>${_credSearch ? `No students match "${_credSearch}".` : 'No active student records available.'}</p>
        </div>`;
      return;
    }

    renderCredentialsTable();
  } catch(err) {
    body.innerHTML = `<div class="empty-state text-danger"><p>Failed to load credentials: ${err.message}</p></div>`;
  }
}
window.loadCredentialsData = loadCredentialsData;

function renderCredentialsTable() {
  const body = document.getElementById('credentials-body');
  if (!body) return;

  const portalUrl = window.location.origin;

  body.innerHTML = `
    <div class="table-wrap">
      <table class="table" style="vertical-align:middle;">
        <thead>
          <tr>
            <th style="width:50px;">Roll</th>
            <th style="min-width:170px;">Student Name</th>
            <th style="min-width:140px;">Class / Batch</th>
            <th style="min-width:190px;">Username / Login ID</th>
            <th style="min-width:200px;">Portal Password</th>
            <th style="min-width:150px; text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${_credentialsList.map(st => `
            <tr id="cred-row-${st.id}">
              <td>
                <span class="badge badge-gray font-mono font-bold">#${st.roll_number || st.id}</span>
              </td>
              <td>
                <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">${st.name}</div>
                <div class="text-xs text-muted">Roll: #${st.roll_number || '—'}</div>
              </td>
              <td class="text-sm">
                <div>${st.standard_name || 'Class'}</div>
                <div class="text-xs text-muted">${st.batch_name || 'All Batches'}</div>
              </td>
              <td>
                <div style="position:relative; display:flex; align-items:center;">
                  <input type="text" class="form-control form-control-sm font-mono font-bold" 
                    id="cred-user-${st.id}"
                    value="${st.parent_username || st.roll_number}" 
                    style="color:#38bdf8; background:rgba(0,0,0,0.04); border:1px solid #cbd5e1; padding-right:28px;"
                    onchange="updateStudentCredentialInline(${st.id}, 'username', this.value, this)"
                    title="Click to edit username. Press Enter or click away to save.">
                  <span id="cred-user-status-${st.id}" style="position:absolute; right:8px; font-size:0.8rem; pointer-events:none;"></span>
                </div>
              </td>
              <td>
                <div style="position:relative; display:flex; align-items:center; gap:4px;">
                  <input type="password" class="form-control form-control-sm font-mono font-bold" 
                    id="cred-pass-${st.id}"
                    value="${st.parent_password || 'parent123'}" 
                    style="color:#10b981; background:rgba(0,0,0,0.04); border:1px solid #cbd5e1; padding-right:32px;"
                    onchange="updateStudentCredentialInline(${st.id}, 'password', this.value, this)"
                    title="Click to edit password. Press Enter or click away to save.">
                  <button type="button" class="btn btn-ghost btn-icon-sm" style="position:absolute; right:4px; opacity:0.65;" 
                    onclick="togglePasswordVisibility('cred-pass-${st.id}', this)" title="Show/Hide Password">
                    👁️
                  </button>
                </div>
              </td>
              <td style="text-align:center;">
                <div class="flex gap-1 justify-center items-center">
                  <button class="btn btn-ghost btn-icon-sm" onclick="copyStudentCredentialsToClipboard('${st.name.replace(/'/g, "\\'")}', '${st.roll_number}', document.getElementById('cred-user-${st.id}').value, document.getElementById('cred-pass-${st.id}').value, '${portalUrl}')" title="Copy Login Details">
                    📋
                  </button>
                  <button class="btn btn-ghost btn-icon-sm" onclick="downloadStudentCredentialSlip(${st.id}, '${st.name.replace(/'/g, "\\'")}', '${st.roll_number}')" title="Download Credential Slip (PDF)">
                    📥
                  </button>
                  <button class="btn btn-ghost btn-icon-sm" onclick="shareStudentCredentialsWhatsApp('${st.name.replace(/'/g, "\\'")}', '${st.roll_number}', document.getElementById('cred-user-${st.id}').value, document.getElementById('cred-pass-${st.id}').value, '${portalUrl}')" title="Share via WhatsApp">
                    📱
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFacultyCredentialsTable() {
  const body = document.getElementById('credentials-body');
  if (!body) return;

  const portalUrl = window.location.origin;

  body.innerHTML = `
    <div class="table-wrap">
      <table class="table" style="vertical-align:middle;">
        <thead>
          <tr>
            <th style="min-width:180px;">Faculty Member</th>
            <th style="min-width:180px;">Login Username</th>
            <th style="min-width:180px;">Email Address</th>
            <th style="min-width:190px;">Portal Password</th>
            <th style="min-width:130px;">Phone</th>
            <th style="min-width:140px;">Assigned Classes</th>
            <th style="min-width:170px; text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${_teachersCredList.map(t => {
            const safePass = t.plain_password || 'teacher123';
            const safeUser = t.username || t.email.split('@')[0];

            return `
              <tr id="fac-cred-row-${t.id}">
                <td>
                  <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">${t.name}</div>
                  <div class="text-xs text-muted">${t.subjects_taught || 'Faculty'}</div>
                </td>
                <td>
                  <div style="position:relative; display:flex; align-items:center;">
                    <input type="text" class="form-control form-control-sm font-mono font-bold" 
                      id="fac-user-inp-${t.id}"
                      value="${safeUser}" 
                      style="color:#38bdf8; background:rgba(0,0,0,0.04); border:1px solid #cbd5e1;"
                      onchange="updateTeacherCredentialHub(${t.id}, 'username', this.value, this)"
                      title="Click to edit username. Auto-saves to database.">
                  </div>
                </td>
                <td>
                  <div style="position:relative; display:flex; align-items:center;">
                    <input type="email" class="form-control form-control-sm font-mono" 
                      id="fac-email-inp-${t.id}"
                      value="${t.email}" 
                      style="background:rgba(0,0,0,0.04); border:1px solid #cbd5e1;"
                      onchange="updateTeacherCredentialHub(${t.id}, 'email', this.value, this)"
                      title="Click to edit email. Auto-saves to database.">
                  </div>
                </td>
                <td>
                  <div style="position:relative; display:flex; align-items:center; gap:4px;">
                    <input type="password" class="form-control form-control-sm font-mono font-bold" 
                      id="fac-pass-inp-${t.id}"
                      value="${safePass}" 
                      style="color:#10b981; background:rgba(0,0,0,0.04); border:1px solid #cbd5e1; padding-right:32px;"
                      onchange="updateTeacherCredentialHub(${t.id}, 'password', this.value, this)"
                      title="Click to edit password. Auto-saves to database.">
                    <button type="button" class="btn btn-ghost btn-icon-sm" style="position:absolute; right:4px; opacity:0.65;" 
                      onclick="togglePasswordVisibility('fac-pass-inp-${t.id}', this)" title="Show/Hide Password">
                      👁️
                    </button>
                  </div>
                </td>
                <td>
                  <div class="font-mono text-sm">${t.phone || '—'}</div>
                </td>
                <td>
                  <span class="badge badge-gray text-xs">${t.assigned_standards || 'All Classes'}</span>
                </td>
                <td style="text-align:center;">
                  <div class="flex gap-1 justify-center items-center">
                    <button class="btn btn-outline btn-sm" onclick="showEditFacultyModal(${t.id})" title="Full Edit Faculty &amp; Credentials">
                      ✏️ Edit
                    </button>
                    <button class="btn btn-ghost btn-icon-sm" onclick="showFacultyPermissionsModal(${t.id}, '${t.name.replace(/'/g, "\\'")}')" title="Access Permissions">
                      🔑
                    </button>
                    <button class="btn btn-ghost btn-icon-sm" onclick="copyFacultyCredentialsToClipboard('${t.name.replace(/'/g, "\\'")}', document.getElementById('fac-user-inp-${t.id}').value, document.getElementById('fac-email-inp-${t.id}').value, document.getElementById('fac-pass-inp-${t.id}').value, '${portalUrl}')" title="Copy Login Details">
                      📋
                    </button>
                    <button class="btn btn-ghost btn-icon-sm" onclick="shareFacultyCredentialsWhatsApp('${t.name.replace(/'/g, "\\'")}', document.getElementById('fac-user-inp-${t.id}').value, document.getElementById('fac-email-inp-${t.id}').value, document.getElementById('fac-pass-inp-${t.id}').value, '${t.phone || ''}', '${portalUrl}')" title="Share via WhatsApp">
                      📱
                    </button>
                    <button class="btn btn-ghost btn-icon-sm" onclick="deleteFacultyAccount(${t.id})" style="color:var(--danger);" title="Delete Faculty Account">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function updateTeacherCredentialHub(teacherId, field, val, inputEl) {
  const userInp = document.getElementById(`fac-user-inp-${teacherId}`);
  const emailInp = document.getElementById(`fac-email-inp-${teacherId}`);
  const passInp = document.getElementById(`fac-pass-inp-${teacherId}`);
  if (!userInp || !passInp) return;

  const username = userInp.value.trim();
  const email = emailInp ? emailInp.value.trim() : '';
  const password = passInp.value.trim();

  if (!username || !password) {
    Toast.warning('Validation Error', 'Username and Password cannot be empty.');
    return;
  }

  try {
    inputEl.style.borderColor = '#fbbf24';
    await API.teachers.updateCredentials(teacherId, {
      username,
      email,
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
window.updateTeacherCredentialHub = updateTeacherCredentialHub;

function shareFacultyCredentialsWhatsApp(name, username, email, password, phone, portalUrl) {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  const text = `👨‍🏫 *APEX TUITION ERP — FACULTY PORTAL LOGIN*\n\nHello *${name}*,\nHere are your faculty portal login credentials:\n\n🌐 *Portal URL:* ${portalUrl}\n👤 *Username:* ${username}\n📧 *Email:* ${email}\n🔑 *Password:* ${password}\n\nPlease sign in to take attendance, enter test marks, and manage schedules.`;
  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
window.shareFacultyCredentialsWhatsApp = shareFacultyCredentialsWhatsApp;

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btnEl.style.opacity = '1';
  } else {
    input.type = 'password';
    btnEl.style.opacity = '0.65';
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

async function updateStudentCredentialInline(studentId, field, val, inputEl) {
  const userInp = document.getElementById(`cred-user-${studentId}`);
  const passInp = document.getElementById(`cred-pass-${studentId}`);
  if (!userInp || !passInp) return;

  const username = userInp.value.trim();
  const password = passInp.value.trim();

  if (!username || !password) {
    Toast.warning('Validation Error', 'Username and Password cannot be empty.');
    return;
  }

  try {
    inputEl.style.borderColor = '#fbbf24';
    await API.students.updateCredentials(studentId, {
      parent_username: username,
      parent_password: password
    });

    inputEl.style.borderColor = '#10b981';
    Toast.success('Saved to Database', `Updated credentials for student #${studentId}`);
    setTimeout(() => {
      if (inputEl) inputEl.style.borderColor = '#cbd5e1';
    }, 1500);
  } catch(err) {
    inputEl.style.borderColor = '#ef4444';
    Toast.error('Save Failed', err.message);
  }
}
window.updateStudentCredentialInline = updateStudentCredentialInline;

function copyStudentCredentialsToClipboard(name, roll, username, password, portalUrl) {
  const text = `🎓 APEX TUITION PORTAL LOGIN\nStudent: ${name} (Roll: #${roll})\n🌐 Portal URL: ${portalUrl}\n👤 Username: ${username}\n🔑 Password: ${password}`;
  navigator.clipboard.writeText(text).then(() => {
    Toast.success('Copied!', `Login info for ${name} copied to clipboard.`);
  }).catch(() => {
    Toast.info('Login Info', `Username: ${username} | Password: ${password}`);
  });
}
window.copyStudentCredentialsToClipboard = copyStudentCredentialsToClipboard;

function showBulkCredentialGeneratorModal() {
  const stdId = _credStandardId || 'all';

  const modalHtml = `
    <div class="modal-overlay" id="bulk-cred-gen-modal" style="z-index:99999;">
      <div class="modal modal-md animate-scale-in" style="max-width:560px;">
        <div class="modal-header" style="background:linear-gradient(135deg,#0f172a,#1e293b); color:white;">
          <div>
            <h3 style="color:white; margin:0; font-size:1.15rem;">⚡ Bulk Credential Generator &amp; Randomizer</h3>
            <p style="font-size:0.75rem; color:#94a3b8; margin:0;">Mass-generate customized or randomized passwords and login IDs</p>
          </div>
          <button class="modal-close" style="color:white;" onclick="document.getElementById('bulk-cred-gen-modal').remove()">✕</button>
        </div>
        
        <div class="modal-body" style="padding:20px;">
          <!-- Target Class -->
          <div class="form-group mb-3">
            <label class="form-label font-bold">Apply To Class / Standard</label>
            <select class="form-control" id="gen-modal-std">
              <option value="all">🌐 All Active Students (${_credentialsList.length} Students)</option>
              ${document.getElementById('cred-filter-std')?.innerHTML || ''}
            </select>
          </div>

          <!-- Generation Pattern -->
          <div class="form-group mb-3">
            <label class="form-label font-bold">Credential &amp; Password Pattern</label>
            <select class="form-control" id="gen-modal-pattern" onchange="onCredentialPatternChange(this.value)">
              <option value="roll_default">📌 Roll Number + Default Password ("parent123")</option>
              <option value="name_pin">🎲 Student First Name + Random 4-digit PIN (e.g. "aarav@4821")</option>
              <option value="random_alpha">🔒 Roll Number + Random Alpha-Numeric Passcode (e.g. "9kX2pL")</option>
              <option value="unique_digits">🔢 Roll Number + 6-Digit Secure Number PIN (e.g. "749201")</option>
              <option value="custom_prefix">🏷️ Custom Institute Prefix + Custom Master Password</option>
            </select>
          </div>

          <!-- Custom Options (Hidden by default) -->
          <div id="gen-custom-fields" style="display:none; background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:14px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div class="form-group mb-0">
                <label class="form-label text-xs font-bold">Username Prefix</label>
                <input type="text" class="form-control form-control-sm" id="gen-custom-prefix" value="APEX" placeholder="e.g. APEX">
              </div>
              <div class="form-group mb-0">
                <label class="form-label text-xs font-bold">Master Password</label>
                <input type="text" class="form-control form-control-sm" id="gen-custom-pass" value="welcome2026" placeholder="e.g. welcome2026">
              </div>
            </div>
          </div>

          <!-- Preview Callout -->
          <div style="background:#fffbeb; border-left:4px solid #f59e0b; padding:10px 14px; border-radius:4px; font-size:0.8rem; color:#92400e; margin-bottom:14px;" id="gen-pattern-preview">
            Preview: Username: <strong>101</strong> · Password: <strong>parent123</strong>
          </div>
        </div>

        <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; padding:14px 20px;">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('bulk-cred-gen-modal').remove()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="applyBulkCredentials()" style="background:linear-gradient(135deg,#d97706,#b45309); border:none; font-weight:700;">
            ⚡ Generate &amp; Apply to Database
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
window.showBulkCredentialGeneratorModal = showBulkCredentialGeneratorModal;

function onCredentialPatternChange(pattern) {
  const customFields = document.getElementById('gen-custom-fields');
  const preview = document.getElementById('gen-pattern-preview');
  if (!preview) return;

  if (pattern === 'custom_prefix') {
    if (customFields) customFields.style.display = 'block';
    preview.innerHTML = `Preview: Username: <strong>APEX_101</strong> · Password: <strong>welcome2026</strong>`;
  } else {
    if (customFields) customFields.style.display = 'none';
    if (pattern === 'roll_default') preview.innerHTML = `Preview: Username: <strong>101</strong> · Password: <strong>parent123</strong>`;
    else if (pattern === 'name_pin') preview.innerHTML = `Preview: Username: <strong>aarav_101</strong> · Password: <strong>aarav@4821</strong>`;
    else if (pattern === 'random_alpha') preview.innerHTML = `Preview: Username: <strong>101</strong> · Password: <strong>9kX2pL</strong>`;
    else if (pattern === 'unique_digits') preview.innerHTML = `Preview: Username: <strong>101</strong> · Password: <strong>749201</strong>`;
  }
}
window.onCredentialPatternChange = onCredentialPatternChange;

async function applyBulkCredentials() {
  const stdId = document.getElementById('gen-modal-std')?.value || 'all';
  const pattern = document.getElementById('gen-modal-pattern')?.value || 'roll_default';
  const customPrefix = document.getElementById('gen-custom-prefix')?.value || 'APEX';
  const customPass = document.getElementById('gen-custom-pass')?.value || 'parent123';

  Spinner.show('Mass-generating credentials in database...');
  try {
    const res = await API.students.bulkGenerateCredentials({
      standard_id: stdId,
      pattern,
      custom_prefix: customPrefix,
      custom_password: customPass
    });

    document.getElementById('bulk-cred-gen-modal')?.remove();
    Spinner.hide();
    Toast.success('Credentials Updated!', `Successfully updated ${res.count} student credentials.`);
    await loadCredentialsData();
  } catch(err) {
    Spinner.hide();
    Toast.error('Bulk Generation Failed', err.message);
  }
}
window.applyBulkCredentials = applyBulkCredentials;

async function loadStandardsDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('student-filter-std');
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
  } catch {}
}

async function loadStudents() {
  try {
    const body = document.getElementById('students-body');
    const stdId = document.getElementById('student-filter-std')?.value || _studentsStandardId;
    const batchId = document.getElementById('student-filter-batch')?.value || '';
    const search = document.getElementById('student-search')?.value || '';
    
    _studentsList = await API.students.list(stdId, batchId, search);
    
    document.getElementById('student-count').textContent = _studentsList.length;
    
    if (_studentsList.length === 0) {
      body.innerHTML = `
        <div class="empty-state" style="padding:var(--space-12)">
          <div class="empty-state-icon">${Icons?.render?.('students',{size:36}) || ''}</div>
          <h3>No Students Found</h3>
          <p>${search ? `No students matching "${search}".` : 'No students enrolled yet. Add manually or import from Excel.'}</p>
          <div class="flex gap-3 justify-center">
            <button class="btn btn-primary" onclick="showAddStudentModal()">${Icons?.render?.('add',{size:14}) || ''} Add Manually</button>
            <button class="btn btn-outline" onclick="Router.navigate('import')">${Icons?.render?.('import',{size:14}) || ''} Import Excel</button>
          </div>
        </div>`;
      return;
    }
    
    body.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Roll No.</th>
              <th>Student Name</th>
              <th>Father's Name</th>
              <th>Class</th>
              <th>Board</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
             ${_studentsList.map(s => {
                let electivesHTML = '';
                if (s.elective_subjects) {
                  try {
                    const parsed = typeof s.elective_subjects === 'string'
                      ? JSON.parse(s.elective_subjects)
                      : s.elective_subjects;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      electivesHTML = `<div style="margin-top:4px; display:flex; gap:3px; flex-wrap:wrap">` + 
                        parsed.map(el => `<span class="badge badge-gold" style="font-size:0.6rem; padding:1px 5px; text-transform:none">${el.name}</span>`).join('') + 
                        `</div>`;
                    }
                  } catch(e) {}
                }
                return `
                <tr>
                  <td>
                    <div class="student-avatar" style="width:36px;height:42px;border-radius:var(--radius-sm)">
                      ${s.photo_path ? `<img src="/${getPhotoThumbPath(s.photo_path)}" alt="${s.name}">` : s.name[0].toUpperCase()}
                    </div>
                  </td>
                  <td><span class="badge badge-gray">${s.roll_number}</span></td>
                  <td class="td-primary">${s.name}</td>
                  <td>${s.father_name || '—'}</td>
                  <td class="text-sm">
                    <div>${s.standard_name || '—'}</div>
                    <div class="text-muted text-xs">${s.batch_name || ''}</div>
                    ${electivesHTML}
                  </td>
                  <td><span class="badge badge-primary">${s.board_short || '—'}</span></td>
                  <td>
                    <div class="td-actions">
                      <button class="btn btn-ghost btn-icon-sm" onclick="downloadStudentCredentialSlip(${s.id}, '${s.name.replace(/'/g, "\\'")}', '${s.roll_number}')" title="Download Login Credential Slip (PDF)">📇</button>
                      <button class="btn btn-ghost btn-icon-sm" onclick="showEditStudentModal(${s.id})" title="Edit">${Icons?.render?.('edit',{size:14}) || ''}</button>
                      <button class="btn btn-ghost btn-icon-sm" onclick="confirmDeleteStudent(${s.id}, '${s.name}')" title="Delete">${Icons?.render?.('delete',{size:14}) || ''}</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    Toast.error('Failed to load students', err.message);
  }
}

const debouncedSearchStudents = debounce((val) => {
  _studentsSearch = val;
  localStorage.setItem('tuition_erp_students_search', val);
  loadStudents();
}, 300);
window.debouncedSearchStudents = debouncedSearchStudents;

function searchStudents(val) {
  debouncedSearchStudents(val);
}

function filterByStandard(val, skipLoad = false) {
  _studentsStandardId = val ? parseInt(val) : null;
  localStorage.setItem('tuition_erp_students_standard_id', _studentsStandardId);
  const batchSelect = document.getElementById('student-filter-batch');
  if (val) {
    return API.batches.list(val).then(batches => {
      batchSelect.innerHTML = '<option value="">All Batches</option>' + batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
      batchSelect.style.display = 'block';
      if (!skipLoad) loadStudents();
    }).catch(() => { if (!skipLoad) loadStudents(); });
  } else {
    batchSelect.style.display = 'none';
    batchSelect.value = '';
    if (!skipLoad) loadStudents();
    return Promise.resolve();
  }
}

function filterByBatch(val) {
  loadStudents();
}

function showAddStudentModal() {
  createModal('add-student-modal', `${Icons?.render?.('add',{size:16}) || ''} Add New Student`,
    buildStudentForm(null),
    `<button class="btn btn-outline" onclick="closeModal('add-student-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="saveStudent(null)">${Icons?.render?.('save',{size:14}) || ''} Save Student</button>`,
    'modal-lg'
  );
  initStudentForm(null);
}

async function showEditStudentModal(studentId) {
  const student = await API.students.get(studentId).catch(err => { Toast.error('Load Failed', err.message); return null; });
  if (!student) return;
  
  createModal('edit-student-modal', `${Icons?.render?.('edit',{size:16}) || ''} Edit Student`,
    buildStudentForm(student),
    `<button class="btn btn-outline" onclick="closeModal('edit-student-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="saveStudent(${studentId})">${Icons?.render?.('save',{size:14}) || ''} Save Changes</button>`,
    'modal-lg'
  );
  initStudentForm(student);
}

function parseStudentName(nameStr) {
  let firstName = '';
  let fatherName = '';
  let surname = '';
  if (!nameStr) return { firstName, fatherName, surname };
  if (nameStr.includes('.')) {
    const parts = nameStr.split('.');
    firstName = parts[0] || '';
    fatherName = parts[1] || '';
    surname = parts[2] || '';
  } else {
    const parts = nameStr.trim().split(/\s+/);
    firstName = parts[0] || '';
    if (parts.length > 2) {
      fatherName = parts.slice(1, parts.length - 1).join(' ');
      surname = parts[parts.length - 1] || '';
    } else if (parts.length === 2) {
      surname = parts[1] || '';
    }
  }
  return { firstName, fatherName, surname };
}

function buildStudentForm(s) {
  const { firstName, fatherName: parsedFather, surname } = parseStudentName(s?.name || '');
  const father_name = s?.father_name || parsedFather || '';
  const mother_name = s?.mother_name || '';

  return `
    <div class="flex gap-6">
      <!-- Photo -->
      <div class="photo-uploader">
        <div class="photo-preview-circle" id="photo-preview-wrap">
          <input type="file" id="student-photo-file" accept="image/*" onchange="previewPhoto(this)">
          ${s?.photo_path ? `<img src="/${getPhotoThumbPath(s.photo_path)}" id="photo-preview-img">` : `<div class="photo-placeholder-text" id="photo-preview-img">📷<br><small>Click to upload</small></div>`}
        </div>
        <span class="text-xs text-muted">Student Photo</span>
        <span class="text-xs text-muted">(Optional)</span>
      </div>

      <div class="flex-1">
        <p class="form-section-title">Personal Details</p>
        <input type="hidden" id="st-roll" value="${s?.roll_number || ''}">
        
        <div class="form-grid mb-4">
          <div class="form-group">
            <label class="form-label">First Name <span class="required">*</span></label>
            <input type="text" class="form-control" id="st-firstname" value="${firstName}" placeholder="First Name">
          </div>
          <div class="form-group">
            <label class="form-label">Surname / Last Name <span class="required">*</span></label>
            <input type="text" class="form-control" id="st-surname" value="${surname}" placeholder="Surname">
          </div>
        </div>
        
        <div class="form-grid mb-4">
          <div class="form-group">
            <label class="form-label">Father's Name <span class="required">*</span></label>
            <input type="text" class="form-control" id="st-father" value="${father_name}" placeholder="Father's Name">
          </div>
          <div class="form-group">
            <label class="form-label">Mother's Name <span class="required">*</span></label>
            <input type="text" class="form-control" id="st-mother" value="${mother_name}" placeholder="Mother's Name">
          </div>
        </div>
        
        <div class="form-grid mb-4">
          <div class="form-group">
            <label class="form-label">Date of Birth</label>
            <input type="date" class="form-control" id="st-dob" value="${s?.dob || ''}">
          </div>
        </div>
        
        <p class="form-section-title">Class Assignment</p>
        <div class="form-grid mb-4">
          <div class="form-group">
            <label class="form-label">Board & Class <span class="required">*</span></label>
            <select class="form-control" id="st-standard" onchange="onStudentStandardChange(this.value, null, '${s?.batch_id || ''}')">
              <option value="">— Select Class —</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Batch</label>
            <select class="form-control" id="st-batch">
              <option value="">— All Batches —</option>
            </select>
          </div>
        </div>

        <div id="st-electives-section" style="margin-top:15px; display:none; margin-bottom: 1.5rem">
          <label class="form-label" style="font-weight:600">Optional / Elective Subjects Selection</label>
          <div id="st-electives-list" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; border:1px solid var(--border); border-radius:var(--radius); padding:10px; background:var(--bg-surface);">
          </div>
          <span class="form-hint mt-1" style="font-size:0.72rem">💡 Elective subjects left unchecked will be grayed out in marks entry and excluded from percentage calculation.</span>
        </div>
        
        <p class="form-section-title">Tuition ERP & Admission Details</p>
        <div class="form-grid mb-4">
          <div class="form-group">
            <label class="form-label font-bold">Total Course Fees (₹) <span class="required">*</span></label>
            <input type="number" class="form-control font-mono font-bold" id="st-total-fees" value="${s?.total_fees ?? 0}" min="0" placeholder="e.g. 25000">
            <div id="st-fees-hint" class="form-hint" style="font-size:0.72rem; color:var(--text-muted); margin-top:3px;">
              Default class fee auto-fills upon class selection. Customize freely for scholarships or poor parent concessions.
            </div>
          </div>
          <div class="form-group">
            <label class="form-label font-bold">Admission Date</label>
            <input type="date" class="form-control" id="st-admission-date" value="${s?.admission_date || new Date().toISOString().split('T')[0]}">
          </div>
        </div>
        <div class="form-group mb-4">
          <label class="form-label font-bold">Enrollment Status</label>
          <select class="form-control" id="st-status">
            <option value="Active" ${(s?.status || 'Active') === 'Active' ? 'selected' : ''}>Active (Enrolled)</option>
            <option value="Completed" ${s?.status === 'Completed' ? 'selected' : ''}>Completed (Graduated)</option>
            <option value="Terminated" ${s?.status === 'Terminated' ? 'selected' : ''}>Terminated (Left Coaching)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Remarks (shown on result card)</label>
          <textarea class="form-control" id="st-remarks" rows="2" placeholder="e.g. Excellent performance! Keep it up.">${s?.remarks || ''}</textarea>
        </div>
      </div>
    </div>`;
}


async function onStudentStandardChange(standardId, student = null, currentBatchId = '') {
  if (!standardId) {
    const section = document.getElementById('st-electives-section');
    if (section) section.style.display = 'none';
    return;
  }
  await autoFillNextRoll(standardId);
  await renderElectiveSubjectsChecklist(standardId, student);
  
  // Auto-populate default fees from standard if adding a new student or fee is 0
  const feesInput = document.getElementById('st-total-fees');
  const feeHint = document.getElementById('st-fees-hint');
  try {
    const std = await API.standards.get(standardId);
    if (std && std.default_fees !== undefined) {
      if (!student || !student.total_fees || parseFloat(student.total_fees) === 0) {
        if (feesInput) feesInput.value = std.default_fees || 0;
      }
      if (feeHint) {
        feeHint.innerHTML = `Standard default fee: <strong>₹${(parseFloat(std.default_fees) || 0).toLocaleString('en-IN')}</strong> (Adjust freely for concessions/scholarships).`;
      }
    }
  } catch (e) {}

  // Load batches
  const batchSelect = document.getElementById('st-batch');
  if (batchSelect) {
    try {
      const batches = await API.batches.list(standardId);
      batchSelect.innerHTML = '<option value="">— All Batches —</option>' + batches.map(b => `<option value="${b.id}" ${currentBatchId == b.id ? 'selected' : ''}>${b.name}</option>`).join('');
    } catch (e) {
      batchSelect.innerHTML = '<option value="">— All Batches —</option>';
    }
  }
}

async function renderElectiveSubjectsChecklist(standardId, student) {
  const listContainer = document.getElementById('st-electives-list');
  const section = document.getElementById('st-electives-section');
  if (!listContainer || !section) return;

  try {
    const subjects = await API.subjects.list(standardId);

    if (subjects.length === 0) {
      section.style.display = 'none';
      listContainer.innerHTML = '';
      return;
    }

    // Get already-enrolled subject IDs for existing student
    let enrolledIds = null; // null = "new student, default all checked"
    if (student) {
      enrolledIds = [];
      if (student.elective_subjects) {
        try {
          const parsed = typeof student.elective_subjects === 'string'
            ? JSON.parse(student.elective_subjects)
            : student.elective_subjects;
          // Support both array of ids and {enrolledSubjectIds:[...]} format
          if (Array.isArray(parsed)) {
            enrolledIds = parsed.map(el => typeof el === 'object' ? (el.id || el) : el).map(Number);
          } else if (parsed && Array.isArray(parsed.enrolledSubjectIds)) {
            enrolledIds = parsed.enrolledSubjectIds.map(Number);
          }
        } catch (e) {
          console.error('Error parsing student electives:', e);
          enrolledIds = subjects.map(s => s.id); // default all enrolled on parse error
        }
      } else {
        // Existing student with no elective data — default all enrolled
        enrolledIds = subjects.map(s => s.id);
      }
    }

    // Build the checklist with select-all controls
    const labelStyle = `display:flex; align-items:center; gap:8px; font-size:0.82rem; cursor:pointer; padding:7px 10px; border-radius:8px; transition:background 0.15s ease; margin-bottom:0;`;
    
    listContainer.innerHTML = `
      <div style="grid-column:1/-1; display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; padding-bottom:8px; border-bottom:1px solid var(--border);">
        <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted);">
          Subject Enrollment (${subjects.length} subjects)
        </span>
        <div style="display:flex; gap:6px;">
          <button type="button" onclick="selectAllSubjects(true)" class="btn btn-outline btn-xs" style="font-size:10px;">
            Select All
          </button>
          <button type="button" onclick="selectAllSubjects(false)" class="btn btn-outline btn-xs" style="font-size:10px;">
            Deselect All
          </button>
        </div>
      </div>
      ${subjects.map(sub => {
        // New student: all checked. Existing student: check enrolledIds
        const isChecked = enrolledIds === null ? true : enrolledIds.includes(sub.id);
        const typeLabel = sub.is_compulsory ? 'Compulsory' : 'Elective';
        const typeBadgeStyle = sub.is_compulsory
          ? 'background:rgba(27,42,74,0.08);color:rgba(27,42,74,0.55);'
          : 'background:rgba(201,169,110,0.12);color:#9a7040;';
        return `
          <label class="st-sub-label" style="${labelStyle}" onmouseover="this.style.background='rgba(201,169,110,0.06)'" onmouseout="this.style.background='transparent'">
            <input type="checkbox" value="${sub.id}" data-name="${sub.name}" data-compulsory="${sub.is_compulsory}" 
              class="st-elective-cb" ${isChecked ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer;accent-color:var(--navy);"
              onchange="updateSubjectEnrollmentVisual(this)">
            <div style="flex:1; min-width:0;">
              <div style="font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sub.name}</div>
              <div style="display:flex; gap:4px; margin-top:2px;">
                <span style="font-size:9.5px; padding:1px 6px; border-radius:4px; font-weight:600; ${typeBadgeStyle}">${typeLabel}</span>
                <span style="font-size:9.5px; color:var(--text-muted);">${sub.max_marks}m</span>
              </div>
            </div>
            <span id="enroll-status-${sub.id}" style="font-size:9.5px; font-weight:700; ${isChecked ? 'color:#2d7a55;' : 'color:rgba(27,42,74,0.35);'}">
              ${isChecked ? 'Enrolled' : 'Excluded'}
            </span>
          </label>`;
      }).join('')}
    `;

    section.style.display = 'block';
  } catch (err) {
    console.error('Failed to load standard subjects for electives:', err);
    section.style.display = 'none';
  }
}

async function initStudentForm(s) {
  // Load standards into dropdown
  const sel = document.getElementById('st-standard');
  try {
    const boards = await API.boards.list();
    for (const board of boards) {
      const standards = await API.boards.getStandards(board.id);
      if (standards.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = board.short_name + ' — ' + board.name;
        standards.forEach(std => {
          const opt = document.createElement('option');
          opt.value = std.id;
          opt.textContent = std.display_name;
          if (s && s.standard_id === std.id) opt.selected = true;
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      }
    }
    
    if (s) {
      await renderElectiveSubjectsChecklist(s.standard_id, s);
      const batchSelect = document.getElementById('st-batch');
      if (batchSelect) {
        try {
          const batches = await API.batches.list(s.standard_id);
          batchSelect.innerHTML = '<option value="">— All Batches —</option>' + batches.map(b => `<option value="${b.id}" ${s.batch_id == b.id ? 'selected' : ''}>${b.name}</option>`).join('');
        } catch (e) {
          batchSelect.innerHTML = '<option value="">— All Batches —</option>';
        }
      }
    } else if (_studentsStandardId) {
      sel.value = _studentsStandardId;
      await onStudentStandardChange(_studentsStandardId, null);
    }
  } catch {}
}

function previewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const wrap = document.getElementById('photo-preview-wrap');
    
    // Remove placeholder text if present
    const placeholder = wrap.querySelector('.photo-placeholder-text');
    if (placeholder) placeholder.remove();
    
    let img = wrap.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.id = 'photo-preview-img';
      // Insert img before the input element to keep the selected file
      wrap.insertBefore(img, wrap.firstChild);
    }
    img.src = e.target.result;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover';
  };
  reader.readAsDataURL(file);
}

function toggleStudentRollMode(mode) {
  const rollInput = document.getElementById('st-roll');
  const hintEl = document.getElementById('st-roll-hint');
  const standardId = document.getElementById('st-standard').value;
  
  if (mode === 'resequence') {
    rollInput.value = 'Auto-Resequence';
    rollInput.disabled = true;
    if (hintEl) hintEl.innerHTML = '⚠️ Saving will automatically sort all students in this class alphabetically by name and resequence their roll numbers.';
  } else {
    rollInput.disabled = false;
    if (hintEl) hintEl.innerHTML = 'Adds the student with the next sequential roll number without changing others.';
    if (standardId) {
      autoFillNextRoll(standardId);
    } else {
      rollInput.value = '';
    }
  }
}

async function saveStudent(studentId) {
  const firstname = getVal('st-firstname');
  const surname = getVal('st-surname');
  const father = getVal('st-father');
  const mother = getVal('st-mother');
  let roll = getVal('st-roll');
  const standardId = getVal('st-standard');
  const rollMode = document.querySelector('input[name="st-roll-mode"]:checked')?.value || 'append';
  
  if (!studentId && rollMode === 'resequence') {
    roll = 'TEMP_' + Date.now();
  }
  
  if (!firstname || !surname || !father || !mother || !standardId) {
    Toast.error('Required Fields', 'First Name, Surname, Father\'s Name, Mother\'s Name and Class are required.');
    return;
  }
  
  // Collect enrolled subject checkboxes
  const electiveCBs = $$('.st-elective-cb');
  const enrolledSubjectIds = [];
  electiveCBs.forEach(cb => {
    if (cb.checked) {
      enrolledSubjectIds.push(parseInt(cb.value));
    }
  });
  const elective_subjects = { enrolledSubjectIds };

  const data = {
    first_name: firstname.trim(),
    father_name: father.trim(),
    surname: surname.trim(),
    mother_name: mother.trim(),
    roll_number: roll || null,
    dob: getVal('st-dob'),
    remarks: getVal('st-remarks'),
    attendance_pct: null,
    standard_id: parseInt(standardId),
    batch_id: getVal('st-batch') ? parseInt(getVal('st-batch')) : null,
    admission_date: getVal('st-admission-date'),
    status: getVal('st-status') || 'Active',
    total_fees: parseFloat(getVal('st-total-fees')) || 0,
    elective_subjects
  };
  
  try {
    let id = studentId;
    if (studentId) {
      await API.students.update(studentId, data);
      Toast.success('Student Saved', 'Student details updated successfully.');
    } else {
      const res = await API.students.add(data);
      id = res.id;
      
      // Resequence if requested
      if (rollMode === 'resequence') {
        await API.students.resequence(parseInt(standardId));
      }

      if (res.credentials) {
        showEnrollmentCredentialsModal(res.id, `${data.first_name} ${data.surname}`, res.credentials.username || roll, standardId, res.credentials);
      }
    }
    
    // Upload photo if selected
    const photoFile = document.getElementById('student-photo-file')?.files[0];
    if (photoFile && id) {
      const form = new FormData();
      form.append('photo', photoFile);
      await API.upload.photo(id, form).catch(() => Toast.warning('Photo Upload', 'Student saved but photo upload failed.'));
    }
    
    closeModal(studentId ? 'edit-student-modal' : 'add-student-modal');
    Toast.success(studentId ? 'Student Updated' : 'Student Added', `${data.first_name} ${data.surname}`);
    await loadStudents();
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

function downloadStudentCredentialSlip(studentId, name, roll) {
  Spinner.show('Generating Credential Slip PDF...');
  try {
    const url = API.export.credentialSlipSingle(studentId);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Credential_Slip_${roll || studentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => Spinner.hide(), 1500);
    Toast.success('Downloading Slip', `Credential slip for ${name || 'Student'} is downloading.`);
  } catch(err) {
    Spinner.hide();
    Toast.error('Download Failed', err.message);
  }
}
window.downloadStudentCredentialSlip = downloadStudentCredentialSlip;

function showEnrollmentCredentialsModal(studentId, studentName, rollNo, standardId, credentials) {
  const username = credentials.username || rollNo;
  const password = credentials.password || 'parent123';
  const portalUrl = window.location.origin;

  const modalHtml = `
    <div class="modal-overlay" id="enroll-cred-modal-overlay" style="z-index:99999;">
      <div class="modal modal-md animate-scale-in" style="max-width:540px;">
        <div class="modal-header" style="background:linear-gradient(135deg,#0f172a,#1e293b); color:white; border-bottom:2px solid var(--gold);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.5rem;">🎓</span>
            <div>
              <h3 style="color:white; margin:0; font-size:1.15rem;">Student Enrolled Successfully!</h3>
              <p style="font-size:0.75rem; color:#94a3b8; margin:0;">Login credentials have been automatically generated</p>
            </div>
          </div>
          <button class="modal-close" style="color:white;" onclick="document.getElementById('enroll-cred-modal-overlay').remove()">✕</button>
        </div>
        
        <div class="modal-body" style="padding:20px;">
          <!-- Student Banner -->
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:800; font-size:1.05rem; color:var(--text-primary);">${studentName}</div>
              <div style="font-size:0.8rem; color:var(--text-muted);">Roll Number: <strong>#${rollNo}</strong></div>
            </div>
            <span class="badge badge-success">✓ Active Admission</span>
          </div>

          <!-- Credentials Card -->
          <div style="background:linear-gradient(135deg,#0f172a,#1e293b); color:white; border-radius:10px; padding:18px; border:1.5px solid #d97706; margin-bottom:18px; box-shadow:0 6px 18px rgba(0,0,0,0.15);">
            <div style="font-size:0.75rem; font-weight:800; color:#fbbf24; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px;">
              🔐 Student &amp; Parent Web Portal Login
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
              <div style="background:rgba(255,255,255,0.08); padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.12);">
                <div style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase;">Username / Login ID</div>
                <div style="font-size:1.05rem; font-weight:800; font-family:monospace; color:#38bdf8;">${username}</div>
              </div>
              <div style="background:rgba(255,255,255,0.08); padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.12);">
                <div style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase;">Default Password</div>
                <div style="font-size:1.05rem; font-weight:800; font-family:monospace; color:#4ade80;">${password}</div>
              </div>
            </div>
            <div style="font-size:0.72rem; color:#94a3b8;">
              🌐 Portal Address: <span style="color:#ffffff; font-family:monospace;">${portalUrl}</span>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="btn btn-primary w-full flex items-center justify-center gap-2" style="font-weight:700; padding:11px;" onclick="downloadStudentCredentialSlip(${studentId}, '${studentName.replace(/'/g, "\\'")}', '${rollNo}')">
              📥 Download Official Credential Slip (PDF)
            </button>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <button class="btn btn-outline flex items-center justify-center gap-2" onclick="shareStudentCredentialsWhatsApp('${studentName.replace(/'/g, "\\'")}', '${rollNo}', '${username}', '${password}', '${portalUrl}')">
                📱 Share on WhatsApp
              </button>
              <button class="btn btn-outline flex items-center justify-center gap-2" onclick="printStudentCredentialSlipPopup(${studentId})">
                🖨️ Print Slip
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="padding:12px 20px;">
          <button type="button" class="btn btn-ghost w-full text-center" onclick="document.getElementById('enroll-cred-modal-overlay').remove()">Done / Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
window.showEnrollmentCredentialsModal = showEnrollmentCredentialsModal;

function shareStudentCredentialsWhatsApp(studentName, rollNo, username, password, portalUrl) {
  const msg = `*🎓 Welcome to Apex Tuition Classes!*\n\nDear Parent/Student,\nAdmission for *${studentName}* (Roll: ${rollNo}) is confirmed.\n\n*Your Web Portal Login Details:*\n🌐 *Portal URL:* ${portalUrl}\n👤 *Username:* ${username}\n🔑 *Password:* ${password}\n\nYou can track live attendance, test marks, exam timetables, fee receipts, and notices on the portal.\n\nThank you!`;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}
window.shareStudentCredentialsWhatsApp = shareStudentCredentialsWhatsApp;

function printStudentCredentialSlipPopup(studentId) {
  const url = API.export.credentialSlipSingle(studentId);
  window.open(url, '_blank');
}
window.printStudentCredentialSlipPopup = printStudentCredentialSlipPopup;

async function confirmDeleteStudent(id, name) {
  const ok = await Confirm.show(`Delete ${name}?`, 'All marks and records for this student will be permanently deleted.', 'Delete Student');
  if (!ok) return;
  try {
    await API.students.delete(id);
    Toast.success('Student Deleted', name);
    await loadStudents();
  } catch (err) {
    Toast.error('Delete Failed', err.message);
  }
}

// ─── Marks Entry Modal ────────────────────────────
async function showMarksEntry(studentId) {
  const student = await API.students.get(studentId);
  const subjects = await API.subjects.list(student.standard_id);
  const marksData = await API.students.getMarks(studentId);
  
  const electiveIds = [];
  if (student.elective_subjects) {
    try {
      const parsed = typeof student.elective_subjects === 'string'
        ? JSON.parse(student.elective_subjects)
        : student.elective_subjects;
      if (Array.isArray(parsed)) {
        electiveIds.push(...parsed.map(el => typeof el === 'object' ? el.id : el));
      }
    } catch(e) {}
  }

  const marksMap = {};
  marksData.forEach(m => { marksMap[m.subject_id] = m; });
  
  const hasSplit = subjects.some(s => s.marks_type === 'split');
  
  createModal('marks-modal', `${Icons?.render?.('marks',{size:16}) || ''} Marks Entry — ${student.name} (Roll: ${student.roll_number})`,
    `<div style="overflow-x:auto">
      <table class="marks-table" style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding:var(--space-3) var(--space-3);font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border)">Subject</th>
            <th style="padding:var(--space-3) var(--space-3);font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border)">Max</th>
            ${hasSplit ? `<th style="padding:var(--space-3) var(--space-3);font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border)">Int.</th>
            <th style="padding:var(--space-3) var(--space-3);font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border)">Ext.</th>` : ''}
            <th style="padding:var(--space-3) var(--space-3);font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border)">Total</th>
            <th style="padding:var(--space-3) var(--space-3);font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border)">%</th>
            <th style="padding:var(--space-3) var(--space-3);font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border)">Absent</th>
          </tr>
        </thead>
        <tbody id="marks-table-body">
          ${subjects.map(sub => {
            const m = marksMap[sub.id] || {};
            const isSelected = isStudentEnrolled(student, sub.id, sub.is_compulsory);
            const isAbsent = m.is_absent === 1;
            const intVal = m.internal_marks ?? '';
            const extVal = m.external_marks ?? '';
            const totalVal = m.total_marks ?? '';
            
            const rowStyle = !isSelected ? 'style="background: var(--bg-elevated); opacity: 0.55;"' : '';
            const electiveBadge = isSelected 
              ? `<span class="badge badge-success" style="font-size:0.65rem; text-transform:none">Enrolled</span>` 
              : `<span class="badge badge-gray" style="font-size:0.65rem; text-transform:none">Not Enrolled</span>`;

            return `<tr data-subject-id="${sub.id}" data-marks-type="${sub.marks_type}" data-max="${sub.max_marks}" data-int-max="${sub.internal_max || 0}" data-ext-max="${sub.external_max || sub.max_marks}" data-is-selected="${isSelected}" ${rowStyle}>
              <td style="padding:var(--space-2) var(--space-3)">
                <div style="display:flex; align-items:center; gap:8px">
                  <div style="font-weight:600;color:var(--text-primary);font-size:0.8125rem">${sub.name}</div>
                  ${electiveBadge}
                </div>
                <div class="text-xs text-muted">${sub.is_compulsory ? 'Compulsory' : 'Optional'} · Max ${sub.max_marks}</div>
              </td>
              <td style="text-align:center;padding:var(--space-2) var(--space-3);color:var(--text-muted)">${sub.max_marks}</td>
              ${hasSplit ? (sub.marks_type === 'split'
                ? `<td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" id="int-${sub.id}" value="${intVal}" min="0" max="${sub.internal_max}" placeholder="Int" onchange="calcRowTotal(${sub.id})" ${(!isSelected || isAbsent) ? 'disabled' : ''}></td>
                   <td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" id="ext-${sub.id}" value="${extVal}" min="0" max="${sub.external_max}" placeholder="Ext" onchange="calcRowTotal(${sub.id})" ${(!isSelected || isAbsent) ? 'disabled' : ''}></td>`
                : '<td></td><td></td>') : ''}
              <td style="padding:var(--space-2) var(--space-3)">
                ${sub.marks_type === 'split'
                  ? `<span class="marks-total-cell" id="total-${sub.id}">${(intVal !== '' && extVal !== '') ? (parseFloat(intVal||0) + parseFloat(extVal||0)) : (totalVal !== '' ? totalVal : '—')}</span>`
                  : `<input type="number" class="form-control marks-input" id="total-${sub.id}" value="${totalVal}" min="0" max="${sub.max_marks}" placeholder="Marks" onchange="calcRowPct(${sub.id})" ${(!isSelected || isAbsent) ? 'disabled' : ''}>`}
              </td>
              <td style="padding:var(--space-2) var(--space-3);text-align:center">
                <span class="marks-pct-cell" id="pct-${sub.id}">${calcPct(sub.marks_type === 'split' ? (parseFloat(intVal||0)+parseFloat(extVal||0)) : parseFloat(totalVal), sub.max_marks)}</span>
              </td>
              <td style="padding:var(--space-2) var(--space-3);text-align:center">
                <label class="toggle"><input type="checkbox" id="absent-${sub.id}" ${isAbsent?'checked':''} onchange="toggleAbsent(${sub.id})" ${!isSelected ? 'disabled' : ''}><span class="toggle-slider"></span></label>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModal('marks-modal')">Cancel</button>
     <button class="btn btn-success btn-sm" onclick="showMarksPreview(${studentId})">${Icons?.render?.('eye',{size:14}) || ''} Preview Card</button>
     <button class="btn btn-primary" onclick="saveMarks(${studentId}, ${JSON.stringify(subjects.map(s=>s.id))})">${Icons?.render?.('save',{size:14}) || ''} Save Marks</button>`,
     'modal-xl'
  );
}

function calcPct(obtained, max) {
  if (!max || obtained === '' || obtained === null || isNaN(obtained)) return '—';
  return (parseFloat(obtained) / max * 100).toFixed(1) + '%';
}

function calcRowTotal(subjectId) {
  const row = document.querySelector(`tr[data-subject-id="${subjectId}"]`);
  const intEl = document.getElementById(`int-${subjectId}`);
  const extEl = document.getElementById(`ext-${subjectId}`);
  if (!intEl || !extEl) return;
  
  const intMax = parseFloat(row.dataset.intMax || 0);
  const extMax = parseFloat(row.dataset.extMax || 0);
  const max = parseFloat(row.dataset.max || 100);
  
  // Validate
  if (intEl.value > intMax) { intEl.value = intMax; Toast.warning('Limit', `Max internal marks: ${intMax}`); }
  if (extEl.value > extMax) { extEl.value = extMax; Toast.warning('Limit', `Max external marks: ${extMax}`); }
  
  const total = (parseFloat(intEl.value||0) + parseFloat(extEl.value||0));
  document.getElementById(`total-${subjectId}`).textContent = total || '—';
  document.getElementById(`pct-${subjectId}`).textContent = calcPct(total, max);
}

function calcRowPct(subjectId) {
  const row = document.querySelector(`tr[data-subject-id="${subjectId}"]`);
  const totalEl = document.getElementById(`total-${subjectId}`);
  const max = parseFloat(row.dataset.max || 100);
  if (totalEl.value > max) { totalEl.value = max; Toast.warning('Limit', `Max marks: ${max}`); }
  document.getElementById(`pct-${subjectId}`).textContent = calcPct(parseFloat(totalEl.value), max);
}

function toggleAbsent(subjectId) {
  const absent = document.getElementById(`absent-${subjectId}`).checked;
  const fields = [`int-${subjectId}`, `ext-${subjectId}`, `total-${subjectId}`];
  fields.forEach(fId => {
    const el = document.getElementById(fId);
    if (el && el.tagName === 'INPUT') el.disabled = absent;
  });
}

async function saveMarks(studentId, subjectIds) {
  const marks = [];
  
  for (const subId of subjectIds) {
    const row = document.querySelector(`tr[data-subject-id="${subId}"]`);
    if (!row) continue;
    
    const type = row.dataset.marksType;
    const isSelected = row.dataset.isSelected === 'true';
    const isAbsent = document.getElementById(`absent-${subId}`)?.checked || false;
    
    let total = null, internal = null, external = null;
    if (isSelected && !isAbsent) {
      if (type === 'split') {
        internal = parseFloat(document.getElementById(`int-${subId}`)?.value) || null;
        external = parseFloat(document.getElementById(`ext-${subId}`)?.value) || null;
        total = (internal !== null && external !== null) ? internal + external : null;
      } else {
        total = parseFloat(document.getElementById(`total-${subId}`)?.value) || null;
      }
    }
    
    marks.push({ subject_id: subId, total_marks: total, internal_marks: internal, external_marks: external, is_absent: isAbsent });
  }
  
  try {
    await API.students.saveMarks(studentId, marks);
    closeModal('marks-modal');
    Toast.success('Marks Saved', 'All marks have been recorded.');
    await loadStudents();
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

async function showMarksPreview(studentId) {
  Spinner.show('Generating result preview...');
  try {
    const html = await API.export.previewStudent(studentId);
    Spinner.hide();
    const overlay = createModal('preview-modal', `${Icons?.render?.('eye',{size:16}) || ''} Result Card Preview`, 
      `<div id="preview-viewport-container" style="display:flex; justify-content:center; align-items:center; background:#0f172a; padding:20px; transition:all 0.3s ease; overflow:auto; max-height:700px; border-radius:var(--radius)">
         <iframe id="preview-iframe" style="width:210mm; height:297mm; max-height:650px; background:white; border:none; box-shadow:0 10px 25px rgba(0,0,0,0.5); transition:all 0.3s ease" srcdoc="${html.replace(/"/g, '&quot;')}"></iframe>
       </div>`,
      `<button class="btn btn-outline" onclick="closeModal('preview-modal')">Close</button>
       <a href="${API.export.pdfSingle(studentId)}" class="btn btn-primary" target="_blank">${Icons?.render?.('download',{size:14}) || ''} Download PDF</a>`,
      'modal-xl'
    );
    overlay.classList.add('modal-fullscreen-overlay');
  } catch (err) {
    Spinner.hide();
    Toast.error('Preview Failed', err.message);
  }
}

async function autoFillNextRoll(standardId) {
  if (!standardId) return;
  try {
    const res = await API.students.getNextRoll(standardId);
    const rollEl = document.getElementById('st-roll');
    if (rollEl) {
      rollEl.value = res.next_roll || '';
    }
  } catch (err) {
    console.error('Error fetching next roll number:', err);
  }
}

async function resequenceRollNumbers() {
  const stdId = document.getElementById('student-filter-std')?.value || _studentsStandardId;
  if (!stdId) {
    Toast.warning('Select Class', 'Please select a specific class first to re-sequence roll numbers.');
    return;
  }
  
  const ok = await Confirm.show('Resequence Roll Numbers?', 
    'This will sort all students in this class alphabetically by name and reassign roll numbers from 1 onwards. Continue?', 
    'Resequence', 'btn-primary', Icons?.render?.('refresh',{size:28}) || '');
  if (!ok) return;
  
  Spinner.show('Resequencing...');
  try {
    await API.students.resequence(stdId);
    Spinner.hide();
    Toast.success('Success', 'Roll numbers re-sequenced alphabetically.');
    await loadStudents();
  } catch (err) {
    Spinner.hide();
    Toast.error('Resequence Failed', err.message);
  }
}

function updateSubjectEnrollmentVisual(cb) {
  const statusSpan = document.getElementById(`enroll-status-${cb.value}`);
  if (statusSpan) {
    statusSpan.textContent = cb.checked ? 'Enrolled' : 'Excluded';
    statusSpan.style.color = cb.checked ? '#2d7a55' : 'rgba(27,42,74,0.35)';
  }
}

function selectAllSubjects(checked) {
  const cbs = document.querySelectorAll('.st-elective-cb');
  cbs.forEach(cb => {
    cb.checked = checked;
    updateSubjectEnrollmentVisual(cb);
  });
}

window.renderStudents = renderStudents;
window.loadStudents = loadStudents;
window.searchStudents = searchStudents;
window.filterByStandard = filterByStandard;
window.showAddStudentModal = showAddStudentModal;
window.showEditStudentModal = showEditStudentModal;
window.previewPhoto = previewPhoto;
window.saveStudent = saveStudent;
window.confirmDeleteStudent = confirmDeleteStudent;
window.showMarksEntry = showMarksEntry;
window.calcRowTotal = calcRowTotal;
window.calcRowPct = calcRowPct;
window.toggleAbsent = toggleAbsent;
window.saveMarks = saveMarks;
window.showMarksPreview = showMarksPreview;
window.autoFillNextRoll = autoFillNextRoll;
window.resequenceRollNumbers = resequenceRollNumbers;
window.onStudentStandardChange = onStudentStandardChange;
window.renderElectiveSubjectsChecklist = renderElectiveSubjectsChecklist;
window.updateSubjectEnrollmentVisual = updateSubjectEnrollmentVisual;
window.selectAllSubjects = selectAllSubjects;
window.toggleStudentRollMode = toggleStudentRollMode;
window.downloadStudentLedgerPDF = downloadStudentLedgerPDF;
window.downloadBulkLedgerPDF = downloadBulkLedgerPDF;
window.loadGraduatedStudents = loadGraduatedStudents;
window.revertGraduation = revertGraduation;
window.filterGraduatedByStandard = filterGraduatedByStandard;
window.debouncedSearchGraduatedStudents = debouncedSearchGraduatedStudents;

// ─── Tuition ERP Page Views ───────────────────────
async function loadAdmissionsTab(standardId) {
  if (!standardId) return;
  _studentsStandardId = parseInt(standardId);
  localStorage.setItem('tuition_erp_students_standard_id', _studentsStandardId);
  const container = document.getElementById('admissions-tab-body');
  if (!container) return;
  container.innerHTML = `<div class="empty-state"><div class="animate-pulse" style="font-size:2rem">🏛</div><p class="text-muted text-sm mt-2">Loading admissions data...</p></div>`;
  
  try {
    const students = await API.students.list(standardId);
    
    const active = students.filter(s => s.status === 'Active').length;
    const completed = students.filter(s => s.status === 'Completed').length;
    const terminated = students.filter(s => s.status === 'Terminated').length;
    
    const projected = students.reduce((sum, s) => sum + (s.total_fees || 0), 0);
    const collected = students.reduce((sum, s) => sum + (s.paid_fees || 0), 0);
    const outstanding = Math.max(0, projected - collected);
    
    container.innerHTML = `
      <!-- Stats Strip -->
      <div class="grid grid-3 gap-4 mb-6">
        <div class="stat-card hover-lift" style="border-left: 4px solid var(--success)">
          <div class="stat-card-value">${active} Active</div>
          <div class="stat-card-label">Graduated: ${completed} | Left: ${terminated}</div>
        </div>
        <div class="stat-card hover-lift" style="border-left: 4px solid var(--primary)">
          <div class="stat-card-value">₹${collected}</div>
          <div class="stat-card-label">Collected Fees Revenue</div>
        </div>
        <div class="stat-card hover-lift" style="border-left: 4px solid var(--danger)">
          <div class="stat-card-value">₹${outstanding}</div>
          <div class="stat-card-label">Pending / Outstanding Fees (Total: ₹${projected})</div>
        </div>
      </div>
      
      <!-- Admissions Table -->
      <div class="card">
        <div class="card-header">
          <h3>Admission Enrollment Statuses</h3>
          <span class="badge badge-primary">${students.length} Total</span>
        </div>
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Admission Date</th>
                  <th>Course Fee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(s => `
                  <tr>
                    <td><span class="badge badge-gray">${s.roll_number}</span></td>
                    <td class="td-primary">${s.name}</td>
                    <td>${s.admission_date ? Format.date(s.admission_date) : '—'}</td>
                    <td>₹${s.total_fees || 0}</td>
                    <td>
                      <select class="form-control" style="width:140px;height:32px;padding:0 8px;font-size:0.8rem;" onchange="updateStudentAdmissionStatus(${s.id}, this.value)">
                        <option value="Active" ${s.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Completed" ${s.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Terminated" ${s.status === 'Terminated' ? 'selected' : ''}>Terminated</option>
                      </select>
                    </td>
                    <td>
                      <button class="btn btn-outline btn-sm" onclick="showEditStudentModal(${s.id})">${Icons?.render?.('edit',{size:14}) || ''} Edit</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${Icons?.render?.('warning',{size:32}) || ''}</div><h3>Error Loading Admissions</h3><p>${err.message}</p></div>`;
  }
}

async function updateStudentAdmissionStatus(studentId, newStatus) {
  try {
    const student = await API.students.get(studentId);
    student.status = newStatus;
    await API.students.update(studentId, student);
    Toast.success('Status Updated', `Updated status for ${student.name} to ${newStatus}.`);
    await loadAdmissionsTab(_studentsStandardId);
  } catch (err) {
    Toast.error('Update Failed', err.message);
  }
}

async function loadFeesTab(standardId, statusFilter = 'all') {
  if (!standardId) return;
  _studentsStandardId = parseInt(standardId);
  localStorage.setItem('tuition_erp_students_standard_id', _studentsStandardId);
  const container = document.getElementById('fees-tab-body');
  if (!container) return;
  container.innerHTML = `<div class="empty-state"><div style="font-size:2rem">${Icons?.render?.('fees',{size:36}) || ''}</div><p class="text-muted text-sm mt-2">Loading financial ledger accounts…</p></div>`;
  
  try {
    const allStudents = await API.students.list(standardId);
    
    const totalExpected    = allStudents.reduce((s, st) => s + (parseFloat(st.total_fees) || 0), 0);
    const totalCollected   = allStudents.reduce((s, st) => s + (parseFloat(st.paid_fees) || 0), 0);
    const totalOutstanding = Math.max(0, totalExpected - totalCollected);
    const collectionPct    = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 100;

    let fullyPaidCount = 0, partialCount = 0, unpaidCount = 0;
    allStudents.forEach(st => {
      const tot = parseFloat(st.total_fees) || 0;
      const paid = parseFloat(st.paid_fees) || 0;
      if (paid >= tot && tot > 0) fullyPaidCount++;
      else if (paid > 0) partialCount++;
      else unpaidCount++;
    });

    const fmt = (n) => '₹' + (parseFloat(n)||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});

    // Filter students by status
    let filteredStudents = allStudents;
    if (statusFilter === 'dues') {
      filteredStudents = allStudents.filter(s => (parseFloat(s.total_fees) || 0) > (parseFloat(s.paid_fees) || 0));
    } else if (statusFilter === 'settled') {
      filteredStudents = allStudents.filter(s => {
        const tot = parseFloat(s.total_fees) || 0;
        const paid = parseFloat(s.paid_fees) || 0;
        return paid >= tot && tot > 0;
      });
    }

    container.innerHTML = `
      <!-- Executive Financial Ledger Summary -->
      <div class="grid grid-3 gap-4 mb-5">
        <div class="stat-card hover-lift" style="border-left:4px solid #6366f1; background:linear-gradient(135deg, rgba(255,255,255,0.95), rgba(238,242,255,0.85));">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div class="stat-card-value" style="font-size:1.6rem; color:#3730a3;">${fmt(totalExpected)}</div>
              <div class="stat-card-label">Total Agreed Course Fees</div>
            </div>
            <span class="badge badge-primary font-mono">${allStudents.length} Accounts</span>
          </div>
        </div>

        <div class="stat-card hover-lift" style="border-left:4px solid #10b981; background:linear-gradient(135deg, rgba(255,255,255,0.95), rgba(236,253,245,0.85));">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div class="stat-card-value" style="font-size:1.6rem; color:#065f46;">${fmt(totalCollected)}</div>
              <div class="stat-card-label">Total Realized Revenue</div>
            </div>
            <span class="badge badge-success font-bold font-mono">${collectionPct}% Paid</span>
          </div>
        </div>

        <div class="stat-card hover-lift" style="border-left:4px solid #ef4444; background:linear-gradient(135deg, rgba(255,255,255,0.95), rgba(254,242,242,0.85));">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div class="stat-card-value" style="font-size:1.6rem; color:#991b1b;">${fmt(totalOutstanding)}</div>
              <div class="stat-card-label">Total Outstanding Dues</div>
            </div>
            <span class="badge badge-danger font-mono font-bold">${unpaidCount + partialCount} Pending</span>
          </div>
        </div>
      </div>

      <!-- Ledger Filter Bar & Action Hub -->
      <div class="card mb-4" style="padding:14px 20px; background:var(--bg-surface);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="loadFeesTab(${standardId}, 'all')">
              📑 All Accounts (${allStudents.length})
            </button>
            <button class="btn ${statusFilter === 'dues' ? 'btn-danger' : 'btn-outline'} btn-sm" onclick="loadFeesTab(${standardId}, 'dues')">
              🔴 Pending Dues (${unpaidCount + partialCount})
            </button>
            <button class="btn ${statusFilter === 'settled' ? 'btn-success' : 'btn-outline'} btn-sm" onclick="loadFeesTab(${standardId}, 'settled')">
              🟢 Fully Settled (${fullyPaidCount})
            </button>
          </div>

          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-outline btn-sm" onclick="downloadBulkLedgerPDF(${standardId})" title="Download all student ledgers in one consolidated PDF">
              ${Icons?.render?.('download',{size:14}) || ''} 🖨️ Consolidated Class Ledger PDF
            </button>
          </div>
        </div>
      </div>

      <!-- Traditional Student Account Ledger Table -->
      <div class="card">
        <div class="card-header" style="background:linear-gradient(135deg, rgba(27,42,74,0.04), rgba(27,42,74,0.01)); border-bottom:1.5px solid var(--border-medium);">
          <div>
            <h3 style="margin:0; font-size:1.1rem; color:var(--navy);">📖 Student Tuition Account Books (खाता बही)</h3>
            <p class="text-xs text-muted" style="margin-top:2px;">Individual student course fee agreements, running transaction balances, and payment vouchers.</p>
          </div>
          <span class="badge badge-primary font-mono font-bold">${filteredStudents.length} Displayed</span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-wrap" style="border:none; border-radius:0;">
            <table>
              <thead>
                <tr style="background:rgba(241,245,249,0.85);">
                  <th style="width:75px; text-align:center;">Roll No</th>
                  <th>Student &amp; Guardian Info</th>
                  <th style="text-align:right;">Course Fee (₹)</th>
                  <th style="text-align:right; color:#16a34a;">Paid (Credit)</th>
                  <th style="text-align:right; color:#dc2626;">Dues (Debit)</th>
                  <th style="width:140px; text-align:center;">Progress</th>
                  <th style="text-align:center;">Ledger Status</th>
                  <th style="width:230px; text-align:center;">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredStudents.length > 0 ? filteredStudents.map(s => {
                  const total = parseFloat(s.total_fees) || 0;
                  const paid  = parseFloat(s.paid_fees) || 0;
                  const bal   = Math.max(0, total - paid);
                  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
                  
                  let statusBadge = '';
                  if (paid >= total && total > 0) {
                    statusBadge = `<span class="badge badge-success" style="font-size:0.72rem;">🟢 Settled</span>`;
                  } else if (paid > 0) {
                    statusBadge = `<span class="badge badge-warning" style="font-size:0.72rem;">🟡 Installments (${paidPct}%)</span>`;
                  } else {
                    statusBadge = `<span class="badge badge-danger" style="font-size:0.72rem;">🔴 Due (0%)</span>`;
                  }

                  const sNameEsc = s.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                  return `
                    <tr class="stagger-item">
                      <td style="text-align:center;">
                        <span class="badge badge-primary font-mono font-bold">${s.roll_number || '—'}</span>
                      </td>
                      <td class="td-primary">
                        <div style="font-weight:700; color:var(--navy); font-size:0.92rem;">${s.first_name ? `${s.first_name} ${s.surname || ''}` : s.name}</div>
                        <div class="text-xs text-muted">Father: <strong>${s.father_name || 'N/A'}</strong> | Ph: ${s.phone || s.father_phone || '—'}</div>
                      </td>
                      <td style="text-align:right; font-family:monospace; font-weight:700;">
                        <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                          <span>${fmt(total)}</span>
                          <button class="btn btn-ghost btn-icon-sm" onclick="showAdjustStudentFeeModal(${s.id}, '${sNameEsc}', ${total})" title="Adjust Course Fee / Grant Concession" style="padding:2px; height:20px; width:20px;">
                            ✏️
                          </button>
                        </div>
                      </td>
                      <td style="text-align:right; font-family:monospace; font-weight:700; color:#16a34a;">
                        ${fmt(paid)}
                      </td>
                      <td style="text-align:right; font-family:monospace; font-weight:800; color:${bal > 0 ? '#dc2626' : '#16a34a'};">
                        ${fmt(bal)}
                      </td>
                      <td style="text-align:center; padding:10px 14px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                          <div class="progress-bar" style="flex:1; height:6px; background:#e2e8f0;">
                            <div class="progress-bar-fill" style="width:${paidPct}%; background:${paidPct >= 100 ? '#10b981' : (paidPct >= 50 ? '#3b82f6' : '#f59e0b')};"></div>
                          </div>
                          <span style="font-size:0.72rem; font-weight:700; font-family:monospace; color:var(--navy);">${paidPct}%</span>
                        </div>
                      </td>
                      <td style="text-align:center;">
                        ${statusBadge}
                      </td>
                      <td>
                        <div class="td-actions" style="justify-content:center;">
                          <button class="btn btn-primary btn-sm" onclick="showRecordPaymentModal(${s.id}, '${sNameEsc}', ${bal})" title="Record fee payment">
                            <span>💳 + Pay</span>
                          </button>
                          <button class="btn btn-outline btn-sm" onclick="showStudentLedgerModal(${s.id}, '${sNameEsc}')" title="Open complete account ledger journal">
                            <span>📖 Khata</span>
                          </button>
                          <button class="btn btn-ghost btn-icon-sm" onclick="downloadStudentLedgerPDF(${s.id})" title="Download Student Ledger Statement PDF">
                            📥
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="8" class="text-center text-muted" style="padding:var(--space-12);">
                      <div style="font-size:2.5rem; margin-bottom:8px;">💳</div>
                      <div style="font-weight:700; font-size:1rem; color:var(--navy);">No Student Accounts Found</div>
                      <p class="text-xs text-muted mt-1">Try changing the status filter or admit new students into this class.</p>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${Icons?.render?.('warning',{size:32}) || ''}</div><h3>Error Loading Fees</h3><p>${err.message}</p></div>`;
  }
}

async function downloadStudentLedgerPDF(studentId) {
  Spinner.show('Generating fee ledger statement PDF…');
  try {
    const url = `/api/fees/student/${studentId}/ledger-pdf`;
    await downloadBlobFile(url, `Student_FeeLedger_${studentId}.pdf`);
    Toast.success('PDF Ready', 'Fee ledger statement downloaded successfully.');
  } catch (err) {
    Toast.error('Download Failed', err.message);
  } finally {
    Spinner.hide();
  }
}

async function downloadBulkLedgerPDF(standardId) {
  Spinner.show('Generating consolidated class ledger PDF…');
  try {
    const url = `/api/fees/standard/${standardId}/bulk-ledger-pdf`;
    await downloadBlobFile(url, `Class_FeeLedger_${standardId}.pdf`);
    Toast.success('PDF Ready', 'Bulk class ledger statement downloaded.');
  } catch (err) {
    Toast.error('Download Failed', err.message);
  } finally {
    Spinner.hide();
  }
}

function showAdjustStudentFeeModal(studentId, name, currentFee) {
  createModal('adjust-fee-modal', `💰 Adjust Agreed Course Fee — ${name}`,
    `<div class="form-group mb-4">
      <label class="form-label font-bold">Total Agreed Course Fee (₹) <span class="required">*</span></label>
      <input type="number" class="form-control font-mono font-bold" id="adj-total-fees" value="${currentFee || 0}" min="0" required style="font-size:1.15rem; padding:10px 14px;">
      <div class="form-hint mt-2">Modify the total course fee agreement for concessions, scholarships, or special parent accommodations. The outstanding balance will re-calculate automatically.</div>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModal('adjust-fee-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="submitAdjustStudentFee(${studentId})">💾 Save Adjusted Fee</button>`,
    'modal-sm'
  );
}

async function submitAdjustStudentFee(studentId) {
  const newFee = parseFloat(document.getElementById('adj-total-fees')?.value) || 0;
  try {
    const student = await API.students.get(studentId);
    student.total_fees = newFee;
    await API.students.update(studentId, student);
    closeModal('adjust-fee-modal');
    Toast.success('Fee Agreement Updated', `Agreed fee updated to ₹${newFee.toLocaleString('en-IN')}`);
    if (_studentsStandardId) await loadFeesTab(_studentsStandardId);
  } catch (err) {
    Toast.error('Update Failed', err.message);
  }
}

function showRecordPaymentModal(studentId, name, currentDue = 0) {
  const due = Math.max(0, parseFloat(currentDue) || 0);
  const halfDue = Math.round(due / 2);

  createModal('record-payment-modal', `💳 Record Fee Payment Voucher — ${name}`,
    `<form id="payment-form">
      ${due > 0 ? `
        <div class="alert alert-info mb-4" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px;">
          <span>Current Outstanding Balance: <strong style="color:#dc2626; font-size:1rem; font-family:monospace;">₹${due.toLocaleString('en-IN')}</strong></span>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn btn-xs btn-primary" onclick="document.getElementById('p-amount').value = ${due}">Full: ₹${due}</button>
            ${halfDue > 0 && halfDue < due ? `<button type="button" class="btn btn-xs btn-outline" onclick="document.getElementById('p-amount').value = ${halfDue}">Half: ₹${halfDue}</button>` : ''}
          </div>
        </div>
      ` : ''}

      <div class="form-group mb-4">
        <label class="form-label font-bold">Payment Amount (₹) <span class="required">*</span></label>
        <input type="number" class="form-control font-mono font-bold" id="p-amount" placeholder="e.g. 5000" required min="1" value="${due > 0 ? due : ''}" style="font-size:1.2rem; padding:10px 14px;">
        <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('p-amount').value = 1000">+ ₹1,000</button>
          <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('p-amount').value = 2000">+ ₹2,000</button>
          <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('p-amount').value = 5000">+ ₹5,000</button>
          <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('p-amount').value = 10000">+ ₹10,000</button>
        </div>
      </div>

      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label font-bold">Payment Date <span class="required">*</span></label>
          <input type="date" class="form-control font-bold" id="p-date" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
        <div class="form-group">
          <label class="form-label font-bold">Payment Method <span class="required">*</span></label>
          <select class="form-control" id="p-method" required>
            <option value="Cash">💵 Cash</option>
            <option value="UPI">📱 UPI (GPay / PhonePe / Paytm / BHIM)</option>
            <option value="Bank Transfer">🏦 Bank Transfer / NEFT / RTGS</option>
            <option value="Cheque">📜 Cheque</option>
            <option value="Debit Card">💳 Debit / Credit Card</option>
          </select>
        </div>
      </div>

      <div class="form-group mb-4">
        <label class="form-label font-bold">Voucher / Transaction Remarks</label>
        <input type="text" class="form-control" id="p-remarks" placeholder="e.g. Term-1 installment receipt / Cheque #88412">
      </div>

      <div style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" id="p-download-receipt" checked style="cursor:pointer;">
        <label for="p-download-receipt" class="text-xs" style="cursor:pointer; margin:0; font-weight:600;">Download Official PDF Receipt automatically after recording</label>
      </div>
    </form>`,
    `<button class="btn btn-outline" onclick="closeModal('record-payment-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="submitFeePayment(${studentId})">💾 Record &amp; Generate Voucher</button>`,
    'modal-md'
  );
}

async function submitFeePayment(studentId) {
  const amount = getVal('p-amount');
  const payment_date = getVal('p-date');
  const payment_method = getVal('p-method');
  const remarks = getVal('p-remarks');
  const autoDownload = document.getElementById('p-download-receipt')?.checked;
  
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0 || !payment_date || !payment_method) {
    Toast.error('Validation Error', 'Amount, date, and method are required.');
    return;
  }
  
  try {
    const res = await API.fees.addPayment(studentId, {
      amount: parseFloat(amount),
      payment_date,
      payment_method,
      remarks
    });
    closeModal('record-payment-modal');
    Toast.success('Payment Recorded', `Recorded transaction voucher of ₹${amount} successfully.`);
    
    if (autoDownload && res.paymentId) {
      downloadReceiptPDF(res.paymentId);
    }

    if (_studentsStandardId) await loadFeesTab(_studentsStandardId);
  } catch (err) {
    Toast.error('Failed to save payment', err.message);
  }
}

async function downloadReceiptPDF(paymentId) {
  try {
    const url = `/api/fees/payments/${paymentId}/receipt-pdf`;
    await downloadBlobFile(url, `Receipt_Voucher_${paymentId}.pdf`);
  } catch (e) {
    console.error('Receipt download error:', e);
  }
}

async function showStudentLedgerModal(studentId, name) {
  Spinner.show('Loading student financial ledger account...');
  try {
    const data = await API.fees.getLedger(studentId);
    Spinner.hide();
    
    const fmt = (n) => '₹' + (parseFloat(n)||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
    const totalFees = parseFloat(data.student.total_fees) || 0;
    const paidFees  = parseFloat(data.student.paid_fees) || 0;
    const balance   = Math.max(0, totalFees - paidFees);

    let runningBalance = totalFees;
    // Calculate running balances in chronological order
    const chronPayments = [...data.payments].reverse().map((p, idx) => {
      runningBalance -= parseFloat(p.amount) || 0;
      return { ...p, voucherNo: `VCH-${String(idx + 1).padStart(4, '0')}`, balanceAfter: Math.max(0, runningBalance) };
    }).reverse();

    const rows = chronPayments.map(p => `
      <tr>
        <td class="font-mono font-bold" style="padding:10px 14px; text-align:center;">${p.voucherNo}</td>
        <td style="padding:10px 14px;" class="font-bold">${Format.date(p.payment_date)}</td>
        <td style="padding:10px 14px;">${p.remarks || 'Tuition Fee Installment'}</td>
        <td style="padding:10px 14px;"><span class="badge badge-gray font-mono">${p.payment_method}</span></td>
        <td style="padding:10px 14px; text-align:right; font-family:monospace; color:#16a34a; font-weight:800;">+ ${fmt(p.amount)}</td>
        <td style="padding:10px 14px; text-align:right; font-family:monospace; font-weight:700; color:${p.balanceAfter > 0 ? '#dc2626' : '#16a34a'};">${fmt(p.balanceAfter)}</td>
        <td style="padding:10px 14px; text-align:center;">
          <div style="display:flex; gap:6px; justify-content:center;">
            <button class="btn btn-ghost btn-icon-sm" onclick="downloadReceiptPDF(${p.id})" title="Download Voucher Receipt PDF">🧾</button>
            <button class="btn btn-ghost btn-icon-sm" onclick="deleteFeePayment(${p.id}, ${studentId}, '${name.replace(/'/g, "\\'").replace(/`/g,"'")}', ${p.amount})" title="Delete Payment Entry" style="color:var(--danger)">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
    
    createModal('ledger-modal', `📖 Financial Account Ledger (खाता बही) — ${name}`,
      `<div class="grid grid-3 gap-4 mb-5" style="background:var(--bg-surface); padding:16px; border-radius:12px; border:1px solid var(--border-medium);">
        <div>
          <div class="text-xs text-muted font-bold uppercase">Agreed Course Fees (Debit)</div>
          <div style="font-size:1.4rem; font-weight:900; color:#3730a3; font-family:monospace;">${fmt(totalFees)}</div>
        </div>
        <div>
          <div class="text-xs text-muted font-bold uppercase">Total Received (Credit)</div>
          <div style="font-size:1.4rem; font-weight:900; color:#16a34a; font-family:monospace;">${fmt(paidFees)}</div>
        </div>
        <div>
          <div class="text-xs text-muted font-bold uppercase">Current Net Outstanding Due</div>
          <div style="font-size:1.4rem; font-weight:900; color:${balance > 0 ? '#dc2626' : '#16a34a'}; font-family:monospace;">${fmt(balance)}</div>
        </div>
      </div>
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h4 style="margin:0; font-size:0.95rem; color:var(--navy);">📑 Chronological Journal Entries</h4>
        <span class="badge badge-info">${data.payments.length} Vouchers Logged</span>
      </div>

      <div class="table-wrap" style="max-height:350px; overflow-y:auto; border:1px solid var(--border-medium); border-radius:10px;">
        <table>
          <thead>
            <tr style="background:#f8fafc;">
              <th style="width:90px; text-align:center;">Voucher #</th>
              <th>Date</th>
              <th>Particulars</th>
              <th>Mode</th>
              <th style="text-align:right;">Credit (Paid)</th>
              <th style="text-align:right;">Balance (Due)</th>
              <th style="width:90px; text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 ? '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:32px;">No payment vouchers recorded in this student ledger yet.</td></tr>' : rows}
          </tbody>
        </table>
      </div>`,
      `<div style="display:flex; gap:8px; justify-content:space-between; width:100%; flex-wrap:wrap;">
        <button class="btn btn-outline" onclick="closeModal('ledger-modal')">Close</button>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary" onclick="downloadStudentLedgerPDF(${studentId})">📥 Download Ledger PDF</button>
          <button class="btn btn-outline" onclick="closeModal('ledger-modal'); showRecordPaymentModal(${studentId}, '${name.replace(/'/g,"'")}', ${balance})">💳 + Record Payment</button>
        </div>
      </div>`,
      'modal-lg'
    );
  } catch (err) {
    Spinner.hide();
    Toast.error('Ledger Error', err.message);
  }
}

async function deleteFeePayment(paymentId, studentId, name, amount) {
  const ok = await Confirm.show(`Delete payment voucher?`, `Are you sure you want to delete this payment of ₹${amount}? The outstanding ledger balance will increase accordingly.`, 'Delete Voucher');
  if (!ok) return;
  
  try {
    await API.fees.deletePayment(paymentId);
    closeModal('ledger-modal');
    Toast.success('Voucher Deleted', 'Fee payment has been removed from ledger.');
    if (_studentsStandardId) await loadFeesTab(_studentsStandardId);
  } catch (err) {
    Toast.error('Delete Failed', err.message);
  }
}

window.showAdjustStudentFeeModal = showAdjustStudentFeeModal;
window.submitAdjustStudentFee = submitAdjustStudentFee;
window.downloadReceiptPDF = downloadReceiptPDF;
window.loadFeesTab = loadFeesTab;
window.showRecordPaymentModal = showRecordPaymentModal;
window.submitFeePayment = submitFeePayment;
window.showStudentLedgerModal = showStudentLedgerModal;
window.deleteFeePayment = deleteFeePayment;
window.downloadStudentLedgerPDF = downloadStudentLedgerPDF;
window.downloadBulkLedgerPDF = downloadBulkLedgerPDF;

async function loadAdmissionsDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('admission-filter-std');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Class —</option>';
    for (const board of boards) {
      const standards = await API.boards.getStandards(board.id);
      if (standards.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = board.short_name;
        standards.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.display_name;
          if (_studentsStandardId === s.id) opt.selected = true;
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      }
    }
    if (_studentsStandardId && [...sel.options].some(o => o.value == _studentsStandardId)) {
      sel.value = _studentsStandardId;
      await loadAdmissionsTab(_studentsStandardId);
    } else if (sel.options.length > 1) {
      sel.selectedIndex = 1;
      await loadAdmissionsTab(sel.value);
    }
  } catch (err) {
    console.error('Error loading admissions dropdown:', err);
  }
}

async function loadFeesDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('fees-filter-std');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Class —</option>';
    for (const board of boards) {
      const standards = await API.boards.getStandards(board.id);
      if (standards.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = board.short_name;
        standards.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.display_name;
          if (_studentsStandardId === s.id) opt.selected = true;
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      }
    }
    if (_studentsStandardId && [...sel.options].some(o => o.value == _studentsStandardId)) {
      sel.value = _studentsStandardId;
      await loadFeesTab(_studentsStandardId);
    } else if (sel.options.length > 1) {
      sel.selectedIndex = 1;
      await loadFeesTab(sel.value);
    }
  } catch (err) {
    console.error('Error loading fees dropdown:', err);
  }
}

async function showDirectGridAdmissionModal() {
  createModal('direct-grid-admission-modal', `${Icons?.render?.('chart',{size:16}) || ''} Direct Grid Admission Entry`,
    `<div style="padding:var(--space-2)">
      <div class="flex gap-4 mb-4 flex-wrap">
        <div class="form-group" style="flex:1;min-width:200px">
          <label class="form-label" style="font-weight:600">Select Class <span class="required">*</span></label>
          <select class="form-control" id="grid-adm-standard" onchange="loadGridAdmissionBatches(this.value)">
            <option value="">— Select Class —</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:200px">
          <label class="form-label" style="font-weight:600">Select Batch</label>
          <select class="form-control" id="grid-adm-batch">
            <option value="">— Select Batch (Optional) —</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:200px">
          <label class="form-label" style="font-weight:600">Enter Key Action</label>
          <select class="form-control" id="grid-enter-action">
            <option value="right" selected>➡️ Right Then Next Row</option>
            <option value="down">⬇️ Down Then Next Col</option>
          </select>
        </div>
      </div>
      <div style="max-height:450px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-elevated)" class="mb-4">
        <table style="width:100%; border-collapse:collapse" class="marks-table">
          <thead style="position:sticky; top:0; z-index:10; background:var(--bg-surface)">
            <tr style="border-bottom:1px solid var(--border)">
              <th style="padding:8px; text-align:center; width:8%">Roll No.</th>
              <th style="padding:8px; text-align:left; width:16%">First Name *</th>
              <th style="padding:8px; text-align:left; width:16%">Surname *</th>
              <th style="padding:8px; text-align:left; width:12%">Date of Birth</th>
              <th style="padding:8px; text-align:left; width:15%">Father's Name *</th>
              <th style="padding:8px; text-align:left; width:15%">Mother's Name *</th>
              <th style="padding:8px; text-align:left; width:9%">Total Fees</th>
              <th style="padding:8px; text-align:left; width:9%">Paid Fees</th>
            </tr>
          </thead>
          <tbody id="grid-adm-tbody">
            <!-- Populated with rows -->
          </tbody>
        </table>
      </div>
      <div class="flex justify-between items-center bg-surface p-3 rounded" style="border:1px solid var(--border)">
        <button class="btn btn-outline btn-sm" onclick="addGridAdmissionRow()">${Icons?.render?.('add',{size:14}) || ''} Add Row</button>
        <p class="text-xs text-muted" style="margin:0">💡 Press <kbd>Enter</kbd> or <kbd>Tab</kbd> on the last cell to append a new row. Use Arrow keys to navigate. Press <kbd>Ctrl + S</kbd> to Save. Copy/Paste from Excel supported.</p>
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModal('direct-grid-admission-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="saveDirectGridAdmissions()">${Icons?.render?.('save',{size:14}) || ''} Bulk Save Admissions</button>`,
    'modal-xl'
  );

  // Clear tbody
  document.getElementById('grid-adm-tbody').innerHTML = '';
  
  // Add 5 default rows
  for (let i = 0; i < 5; i++) {
    addGridAdmissionRow();
  }
  
  // Bind excel paste and keys navigation
  const tbody = document.getElementById('grid-adm-tbody');
  setupGridExcelCopyPaste(tbody, addGridAdmissionRow);
  setupSpreadsheetKeyboardNavigation(tbody, addGridAdmissionRow);
  
  // Load standard and batches
  await loadGridAdmissionStandardsDropdown(_studentsStandardId);
  
  // Bind Ctrl+S shortcut inside modal
  if (!window._gridAdmSaveShortcutBound) {
    window._gridAdmSaveShortcutBound = true;
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        const modal = document.getElementById('direct-grid-admission-modal');
        if (modal && modal.style.display !== 'none') {
          e.preventDefault();
          saveDirectGridAdmissions();
        }
      }
    });
  }
}

function addGridAdmissionRow() {
  const tbody = document.getElementById('grid-adm-tbody');
  if (!tbody) return;
  const rowCount = tbody.children.length;
  const tr = document.createElement('tr');
  tr.dataset.rowIdx = rowCount;
  tr.innerHTML = `
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-roll" placeholder="Auto" data-row="${rowCount}" data-col="0" style="text-align:center; padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-firstname" placeholder="First Name" data-row="${rowCount}" data-col="1" style="font-weight:600; padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-surname" placeholder="Surname" data-row="${rowCount}" data-col="2" style="font-weight:600; padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-dob" placeholder="DD/MM/YYYY" data-row="${rowCount}" data-col="3" style="padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-father" placeholder="Father's Name" data-row="${rowCount}" data-col="4" style="padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-mother" placeholder="Mother's Name" data-row="${rowCount}" data-col="5" style="padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="number" class="form-control grid-adm-total-fees" placeholder="0" data-row="${rowCount}" data-col="6" style="padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="number" class="form-control grid-adm-paid-fees" placeholder="0" data-row="${rowCount}" data-col="7" style="padding:var(--space-1) var(--space-2)"></td>
  `;
  tbody.appendChild(tr);
}

async function loadGridAdmissionStandardsDropdown(selectedStandardId) {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('grid-adm-standard');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Class —</option>';
    for (const board of boards) {
      const standards = await API.boards.getStandards(board.id);
      if (standards.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = board.short_name;
        standards.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.display_name;
          if (selectedStandardId && parseInt(selectedStandardId) === s.id) {
            opt.selected = true;
          }
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      }
    }
    
    if (sel.value) {
      await loadGridAdmissionBatches(sel.value);
    }
  } catch {}
}

async function loadGridAdmissionBatches(standardId) {
  const batchSelect = document.getElementById('grid-adm-batch');
  if (!batchSelect) return;
  batchSelect.innerHTML = '<option value="">— Select Batch (Optional) —</option>';
  if (!standardId) return;
  
  try {
    const batches = await API.batches.list(standardId);
    batches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      batchSelect.appendChild(opt);
    });
  } catch {}
}

async function saveDirectGridAdmissions() {
  const stdId = document.getElementById('grid-adm-standard').value;
  if (!stdId) {
    Toast.error('Required Class', 'Please select a Class.');
    return;
  }
  
  const batchId = document.getElementById('grid-adm-batch').value || null;
  const tbody = document.getElementById('grid-adm-tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const studentsToInsert = [];
  
  for (const tr of rows) {
    const firstnameInput = tr.querySelector('.grid-adm-firstname');
    const surnameInput = tr.querySelector('.grid-adm-surname');
    if (!firstnameInput || !surnameInput) continue;
    const firstname = firstnameInput.value.trim();
    const surname = surnameInput.value.trim();
    
    const roll = tr.querySelector('.grid-adm-roll').value.trim();
    const dobInput = tr.querySelector('.grid-adm-dob').value.trim();
    const father = tr.querySelector('.grid-adm-father').value.trim();
    const mother = tr.querySelector('.grid-adm-mother').value.trim();
    const totalFees = parseFloat(tr.querySelector('.grid-adm-total-fees').value) || 0;
    const paidFees = parseFloat(tr.querySelector('.grid-adm-paid-fees').value) || 0;
    
    if (!firstname && !surname && !father && !mother) continue; // skip blank rows
    
    if (!firstname || !surname || !father || !mother) {
      Toast.error('Validation Error', 'First Name, Surname, Father\'s Name and Mother\'s Name are required for all entered rows.');
      return;
    }
    
    let dobParsed = '';
    if (dobInput) {
      const parts = dobInput.split('/');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        dobParsed = `${y}-${m}-${d}`;
      } else {
        dobParsed = dobInput;
      }
    }

    studentsToInsert.push({
      first_name: firstname,
      father_name: father,
      surname: surname,
      mother_name: mother,
      roll_number: roll || null,
      dob: dobParsed,
      standard_id: parseInt(stdId),
      batch_id: batchId ? parseInt(batchId) : null,
      total_fees: totalFees,
      paid_fees: paidFees,
      status: 'Active',
      admission_date: new Date().toISOString().split('T')[0]
    });
  }
  
  if (studentsToInsert.length === 0) {
    Toast.error('No Data', 'Please enter at least one student.');
    return;
  }
  
  Spinner.show('Admitting students...');
  try {
    let successCount = 0;
    for (const stu of studentsToInsert) {
      try {
        const res = await API.students.add(stu);
        const studentId = res.id;
        successCount++;
        
        if (stu.paid_fees > 0 && studentId) {
          await API.fees.addPayment(studentId, {
            amount: stu.paid_fees,
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'Cash',
            remarks: 'Initial Admission Payment'
          });
        }
      } catch (err) {
        console.error('Failed to add student:', stu, err);
        Toast.error('Error', `Failed to add ${stu.first_name}: ${err.message}`);
      }
    }
    
    Spinner.hide();
    Toast.success('Bulk Admission Success', `${successCount} student(s) admitted successfully.`);
    closeModal('direct-grid-admission-modal');
    await loadStudents();
  } catch (err) {
    Spinner.hide();
    Toast.error('Bulk Admission Failed', err.message);
  }
}

window.loadAdmissionsTab = loadAdmissionsTab;
window.updateStudentAdmissionStatus = updateStudentAdmissionStatus;
window.loadFeesTab = loadFeesTab;
window.showRecordPaymentModal = showRecordPaymentModal;
window.submitFeePayment = submitFeePayment;
window.showStudentLedgerModal = showStudentLedgerModal;
window.deleteFeePayment = deleteFeePayment;
window.loadAdmissionsDropdown = loadAdmissionsDropdown;
window.loadFeesDropdown = loadFeesDropdown;
window.showDirectGridAdmissionModal = showDirectGridAdmissionModal;
window.addGridAdmissionRow = addGridAdmissionRow;
window.loadGridAdmissionBatches = loadGridAdmissionBatches;
window.saveDirectGridAdmissions = saveDirectGridAdmissions;

function filterAdmissionsTable(val) {
  const query = val.toLowerCase().trim();
  const rows = document.querySelectorAll('#admissions-tab-body tbody tr');
  rows.forEach(row => {
    const nameCell = row.querySelector('.td-primary')?.textContent || '';
    const rollCell = row.querySelector('.badge-gray')?.textContent || '';
    if (nameCell.toLowerCase().includes(query) || rollCell.toLowerCase().includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}
window.filterAdmissionsTable = filterAdmissionsTable;

function filterFeesTable(val) {
  const query = val.toLowerCase().trim();
  const rows = document.querySelectorAll('#fees-tab-body tbody tr');
  rows.forEach(row => {
    const nameCell = row.querySelector('.td-primary')?.textContent || '';
    const rollCell = row.querySelector('.badge-gray')?.textContent || '';
    if (nameCell.toLowerCase().includes(query) || rollCell.toLowerCase().includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}
window.filterFeesTable = filterFeesTable;

async function showCredentialExportModal() {
  let standards = [];
  try {
    const res = await API.getStandards();
    standards = res.standards || [];
  } catch (e) {}

  const modalHtml = `
    <div id="cred-export-modal-overlay" class="modal-overlay">
      <div class="modal modal-md">
        <div class="modal-header">
          <h3>📇 Export Student &amp; Parent Login Credentials</h3>
          <button class="modal-close" onclick="document.getElementById('cred-export-modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <p class="text-sm text-muted mb-4">Choose how you want to export login credentials for students and parents to distribute before classes start.</p>
          
          <div class="form-group mb-4">
            <label class="form-label">Select Class / Standard <span class="required">*</span></label>
            <select id="cred-export-standard-id" class="form-control">
              <option value="all">All Standards (All Students)</option>
              ${standards.map(s => `<option value="${s.id}">${s.display_name}</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="card p-4 text-center cursor-pointer hover:border-primary" onclick="generateCredentialsPDF('tabular')" style="border:2px solid var(--border); transition:all 0.2s ease;">
              <div style="font-size:2rem;" class="mb-2">📊</div>
              <h4 class="font-bold mb-1">Option 1: Bulk Credential Ledger PDF</h4>
              <p class="text-xs text-muted">A clean tabular A4 sheet listing Roll No, Name, Username, Default Password, and Login URL.</p>
            </div>

            <div class="card p-4 text-center cursor-pointer hover:border-primary" onclick="generateCredentialsPDF('slips')" style="border:2px solid var(--border); transition:all 0.2s ease;">
              <div style="font-size:2rem;" class="mb-2">📜</div>
              <h4 class="font-bold mb-1">Option 2: Individual Welcome Cards PDF</h4>
              <p class="text-xs text-muted">Official 1-page printable Welcome Slips for each student with logo, credentials &amp; login instructions.</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('cred-export-modal-overlay').remove()">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function generateCredentialsPDF(mode) {
  const stdId = document.getElementById('cred-export-standard-id')?.value || 'all';
  document.getElementById('cred-export-modal-overlay')?.remove();

  try {
    let url = `/api/students`;
    if (stdId !== 'all') {
      url += `?standard_id=${stdId}`;
    }
    const res = await API.request(url);
    const students = res.students || [];

    if (students.length === 0) {
      Toast.warning('No Students Found', 'Please add students first before exporting credentials.');
      return;
    }

    const coachingRes = await API.coaching.get().catch(() => ({}));
    if (mode === 'slips') {
      Spinner.show('Generating Bulk Credential Slips PDF...');
      const url = API.export.credentialSlipBulk(stdId);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bulk_Credential_Slips_${stdId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => Spinner.hide(), 2500);
      Toast.success('Downloading Slips', 'Bulk Credential Slips PDF is downloading.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      Toast.error('Popup Blocked', 'Please allow popups to view credential PDF.');
      return;
    }

    if (mode === 'tabular') {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${coachingName} — Student Credentials Roster</title>
          <style>
            body { font-family: 'DM Sans', Arial, sans-serif; padding: 30px; color: #1B2A4A; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #1B2A4A; padding-bottom: 15px; }
            h2 { margin: 0 0 5px 0; color: #1B2A4A; font-family: serif; }
            p { margin: 0; font-size: 13px; color: #64748B; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th, td { border: 1px solid #CBD5E1; padding: 10px 12px; text-align: left; }
            th { background: #1B2A4A; color: white; }
            tr:nth-child(even) { background: #F8FAFC; }
            .code { font-family: monospace; font-weight: bold; background: #E2E8F0; padding: 2px 6px; border-radius: 4px; }
            .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #94A3B8; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom:20px; text-align:right;">
            <button onclick="window.print()" style="padding:10px 20px; background:#1B2A4A; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">🖨️ Print / Download PDF</button>
          </div>
          <div class="header">
            <h2>${coachingName}</h2>
            <p>${coachingAddress} | Phone: ${coachingPhone}</p>
            <h3 style="margin-top:10px; color:#C9A96E;">📇 STUDENT &amp; PARENT PORTAL LOGIN ROSTER</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Full Name</th>
                <th>Father's Name</th>
                <th>Login Username</th>
                <th>Default Password</th>
                <th>Portal Web Address</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(st => `
                <tr>
                  <td><span class="code">${st.roll_number || 'TEMP'}</span></td>
                  <td><strong>${st.name}</strong></td>
                  <td>${st.father_name || '-'}</td>
                  <td><span class="code">${st.parent_username || st.roll_number}</span></td>
                  <td><span class="code">parent123</span></td>
                  <td>http://localhost:3000</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Generated on ${new Date().toLocaleDateString()} • Confidential Official Institute Document
          </div>
        </body>
        </html>
      `);
    } else {
      // Individual Welcome Cards (1 page per student)
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${coachingName} — Student Welcome Cards</title>
          <style>
            body { font-family: 'DM Sans', Arial, sans-serif; margin: 0; padding: 0; background: #F1F5F9; color: #1B2A4A; }
            .card-page { page-break-after: always; width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 40px; box-sizing: border-box; position: relative; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #1B2A4A; padding-bottom: 20px; margin-bottom: 30px; }
            .coaching-title { font-family: serif; font-size: 24px; font-weight: bold; color: #1B2A4A; margin: 0 0 4px 0; }
            .coaching-sub { font-size: 12px; color: #64748B; margin: 0; }
            .badge { background: #1B2A4A; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .stu-box { background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 12px; padding: 20px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .stu-box div { font-size: 14px; }
            .label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748B; display: block; margin-bottom: 2px; }
            .cred-card { background: linear-gradient(135deg, #1B2A4A, #243357); color: white; border-radius: 16px; padding: 25px; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(27,42,74,0.2); }
            .cred-title { font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: #C9A96E; font-weight: bold; margin-bottom: 15px; }
            .cred-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .val-box { background: rgba(255,255,255,0.12); padding: 12px 16px; border-radius: 10px; font-family: monospace; font-size: 16px; font-weight: bold; border: 1px solid rgba(255,255,255,0.2); }
            .steps-list { line-height: 1.8; font-size: 13.5px; color: #334155; margin-bottom: 30px; }
            .steps-list li { margin-bottom: 8px; }
            .use-cases { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .uc-card { background: #F1F5F9; padding: 14px; border-radius: 10px; font-size: 12px; }
            .uc-card strong { color: #1B2A4A; display: block; margin-bottom: 4px; font-size: 13px; }
            .footer { position: absolute; bottom: 40px; left: 40px; right: 40px; border-top: 1px solid #E2E8F0; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #94A3B8; }
            @media print { body { background: none; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="padding:20px; text-align:center; background:#1B2A4A;">
            <button onclick="window.print()" style="padding:12px 30px; background:#C9A96E; color:#1B2A4A; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:16px;">🖨️ Print All Welcome Cards (${students.length} Pages)</button>
          </div>
          ${students.map(st => `
            <div class="card-page">
              <div class="header">
                <div>
                  <h1 class="coaching-title">${coachingName}</h1>
                  <p class="coaching-sub">${coachingAddress} | Tel: ${coachingPhone}</p>
                </div>
                <span class="badge">OFFICIAL PARENT &amp; STUDENT WELCOME SLIP</span>
              </div>

              <div class="stu-box">
                <div><span class="label">Student Full Name</span><strong>${st.name}</strong></div>
                <div><span class="label">Roll Number</span><strong>${st.roll_number || 'TEMP'}</strong></div>
                <div><span class="label">Father's Name</span>${st.father_name || '-'}</div>
                <div><span class="label">Enrolled Status</span><span style="color:#2EB8A0;font-weight:bold;">Active Student</span></div>
              </div>

              <div class="cred-card">
                <div class="cred-title">🔐 YOUR OFFICIAL APP LOGIN CREDENTIALS</div>
                <div class="cred-grid">
                  <div>
                    <span class="label" style="color:rgba(255,255,255,0.7)">Username / Login ID</span>
                    <div class="val-box">${st.parent_username || st.roll_number}</div>
                  </div>
                  <div>
                    <span class="label" style="color:rgba(255,255,255,0.7)">Default Password</span>
                    <div class="val-box">parent123</div>
                  </div>
                </div>
              </div>

              <h3 style="margin-bottom:10px; color:#1B2A4A;">🚀 How to Access Your Student/Parent Portal:</h3>
              <ol class="steps-list">
                <li>Open web browser on your smartphone or computer and go to: <strong>http://localhost:3000</strong></li>
                <li>On the login card, select the <strong>👨‍👩‍👧 Parent / Student</strong> role pill.</li>
                <li>Enter your assigned <strong>Username</strong> and <strong>Password</strong> shown above.</li>
                <li>Press <strong>Sign In to Dashboard</strong> to immediately view your personal portal.</li>
              </ol>

              <h3 style="margin-bottom:12px; color:#1B2A4A;">💡 What You Can Track Live on the Portal:</h3>
              <div class="use-cases">
                <div class="uc-card">
                  <strong>✅ Daily Attendance Tracker</strong>
                  View live daily roll call status (Present, Absent, Late) logged by faculty.
                </div>
                <div class="uc-card">
                  <strong>🗓️ Lecture Timetable</strong>
                  Check weekly subject schedules, faculty names, and lecture room numbers.
                </div>
                <div class="uc-card">
                  <strong>📊 Exam Marks &amp; Bar Graphs</strong>
                  Track midterm and unit test scores, subject percentages, and distinction ranks.
                </div>
                <div class="uc-card">
                  <strong>📄 Printable Report Cards</strong>
                  Download official A4 performance report cards with 1-click PDF export.
                </div>
              </div>

              <div class="footer">
                <span>Direct Support: contact@edutrack.local</span>
                <span>${coachingName} © 2026</span>
              </div>
            </div>
          `).join('')}
        </body>
        </html>
      `);
    }
    printWin.document.close();
  } catch (err) {
    Toast.error('Export Error', err.message);
  }
}

window.showCredentialExportModal = showCredentialExportModal;
window.generateCredentialsPDF = generateCredentialsPDF;

