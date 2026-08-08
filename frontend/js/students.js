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
    _studentsStandardId = parseInt(params.standardId);
    localStorage.setItem('tuition_erp_students_standard_id', _studentsStandardId);
  } else {
    const cachedStd = localStorage.getItem('tuition_erp_students_standard_id');
    _studentsStandardId = (cachedStd && cachedStd !== 'null') ? parseInt(cachedStd) : null;
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
        <button class="btn btn-outline btn-sm" onclick="resequenceRollNumbers()">${Icons?.render?.('refresh',{size:14}) || ''} Resequence Rolls</button>
        <button class="btn btn-outline btn-sm" onclick="Router.navigate('import')">${Icons?.render?.('import',{size:14}) || ''} Import Excel</button>
        <button class="btn btn-outline btn-sm" onclick="showDirectGridAdmissionModal()">${Icons?.render?.('chart',{size:14}) || ''} Direct Grid Entry</button>
        <button class="btn btn-primary btn-sm" onclick="showAddStudentModal()">${Icons?.render?.('add',{size:14}) || ''} Add Student</button>
      </div>
    </div>

    <!-- ERP Navigation Tabs -->
    <div class="tabs mb-6">
      <button class="btn ${_currentStudentsTab === 'directory' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tab-directory" onclick="switchStudentsTab('directory')">${Icons?.render?.('students',{size:14}) || ''} Student Directory</button>
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
  const btnAdm = document.getElementById('btn-tab-admissions');
  const btnFees = document.getElementById('btn-tab-fees');
  const btnGrad = document.getElementById('btn-tab-graduated');
  
  if (btnDir) btnDir.className = `btn ${tab === 'directory' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnAdm) btnAdm.className = `btn ${tab === 'admissions' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnFees) btnFees.className = `btn ${tab === 'fees' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnGrad) btnGrad.className = `btn ${tab === 'graduated' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  
  const container = document.getElementById('students-tab-content');
  if (!container) return;
  
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
            <label class="form-label">Total Course Fees (₹)</label>
            <input type="number" class="form-control" id="st-total-fees" value="${s?.total_fees ?? 0}" min="0" placeholder="e.g. 15000">
          </div>
          <div class="form-group">
            <label class="form-label">Admission Date</label>
            <input type="date" class="form-control" id="st-admission-date" value="${s?.admission_date || new Date().toISOString().split('T')[0]}">
          </div>
        </div>
        <div class="form-group mb-4">
          <label class="form-label">Enrollment Status</label>
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
    } else {
      const res = await API.students.add(data);
      id = res.id;
      
      // Resequence if requested
      if (rollMode === 'resequence') {
        await API.students.resequence(parseInt(standardId));
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
    Toast.success(studentId ? 'Student Updated' : 'Student Added', name);
    await loadStudents();
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

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

async function loadFeesTab(standardId) {
  if (!standardId) return;
  _studentsStandardId = parseInt(standardId);
  localStorage.setItem('tuition_erp_students_standard_id', _studentsStandardId);
  const container = document.getElementById('fees-tab-body');
  if (!container) return;
  container.innerHTML = `<div class="empty-state"><div style="font-size:2rem">${Icons?.render?.('fees',{size:36}) || ''}</div><p class="text-muted text-sm mt-2">Loading fees ledger…</p></div>`;
  
  try {
    const students = await API.students.list(standardId);
    
    const totalExpected  = students.reduce((s, st) => s + (parseFloat(st.total_fees) || 0), 0);
    const totalCollected = students.reduce((s, st) => s + (parseFloat(st.paid_fees) || 0), 0);
    const totalOutstanding = Math.max(0, totalExpected - totalCollected);

    const fmt = (n) => '₹' + (parseFloat(n)||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});

    const standard = await API.standards?.get?.(standardId).catch(() => null);
    
    container.innerHTML = `
      <!-- Summary Row -->
      <div class="grid grid-3 gap-4 mb-5">
        <div class="stat-card hover-lift" style="border-left:4px solid var(--gold);">
          <div class="stat-card-value" style="font-size:1.5rem;">${fmt(totalExpected)}</div>
          <div class="stat-card-label">Total Fees Expected</div>
        </div>
        <div class="stat-card hover-lift" style="border-left:4px solid var(--success);">
          <div class="stat-card-value" style="font-size:1.5rem;color:var(--success);">${fmt(totalCollected)}</div>
          <div class="stat-card-label">Total Collected</div>
        </div>
        <div class="stat-card hover-lift" style="border-left:4px solid var(--danger);">
          <div class="stat-card-value" style="font-size:1.5rem;color:var(--danger);">${fmt(totalOutstanding)}</div>
          <div class="stat-card-label">Total Outstanding</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Student Tuition Fee Accounts</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="badge badge-primary">${students.length} Students</span>
            <button class="btn btn-primary btn-sm" onclick="downloadBulkLedgerPDF(${standardId})" title="Download all student ledgers in one PDF">
              ${Icons?.render?.('download',{size:13}) || ''} Bulk Ledger PDF
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(s => {
                  const total = parseFloat(s.total_fees) || 0;
                  const paid  = parseFloat(s.paid_fees) || 0;
                  const bal   = Math.max(0, total - paid);
                  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
                  let statusBadge = '';
                  if (paid >= total && total > 0) statusBadge = `<span class="badge badge-success">Fully Paid</span>`;
                  else if (paid > 0) statusBadge = `<span class="badge badge-warning">Partial</span>`;
                  else statusBadge = `<span class="badge badge-danger">Unpaid</span>`;
                  return `
                    <tr>
                      <td><span class="badge badge-gray">${s.roll_number}</span></td>
                      <td class="td-primary">${s.name}</td>
                      <td>${fmt(total)}</td>
                      <td class="text-success font-semibold">${fmt(paid)}</td>
                      <td class="${bal > 0 ? 'text-danger' : 'text-success'} font-semibold">${fmt(bal)}</td>
                      <td>${statusBadge}</td>
                      <td>
                        <div class="td-actions">
                          <button class="btn btn-outline btn-sm" onclick="showRecordPaymentModal(${s.id}, ${JSON.stringify(s.name).replace(/"/g, '&quot;')})" title="Record a new payment">
                            ${Icons?.render?.('fees',{size:13}) || ''} Record Payment
                          </button>
                          <button class="btn btn-ghost btn-sm" onclick="showStudentLedgerModal(${s.id}, ${JSON.stringify(s.name).replace(/"/g, '&quot;')})" title="View full ledger">
                            ${Icons?.render?.('results',{size:13}) || ''} Ledger
                          </button>
                          <button class="btn btn-ghost btn-icon-sm" onclick="downloadStudentLedgerPDF(${s.id})" title="Download PDF ledger">
                            ${Icons?.render?.('download',{size:13}) || ''}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
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
  Spinner.show('Generating fee ledger PDF…');
  try {
    const a = document.createElement('a');
    a.href = `/api/fees/student/${studentId}/ledger-pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => Spinner.hide(), 1500);
  }
}

async function downloadBulkLedgerPDF(standardId) {
  Spinner.show('Generating bulk fee ledger PDF… This may take a moment.');
  try {
    const a = document.createElement('a');
    a.href = `/api/fees/standard/${standardId}/bulk-ledger-pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => Spinner.hide(), 2500);
  }
}


function showRecordPaymentModal(studentId, name) {
  createModal('record-payment-modal', `${Icons?.render?.('fees',{size:16}) || ''} Record Fee Payment — ${name}`,
    `<form id="payment-form">
      <div class="form-group mb-4">
        <label class="form-label">Payment Amount (₹) <span class="required">*</span></label>
        <input type="number" class="form-control" id="p-amount" placeholder="e.g. 5000" required min="1">
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Payment Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="p-date" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Payment Method <span class="required">*</span></label>
          <select class="form-control" id="p-method" required>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
            <option value="Bank Transfer">Bank Transfer / NetBanking</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Remarks</label>
        <input type="text" class="form-control" id="p-remarks" placeholder="e.g. Inst-2 payment receipt #442">
      </div>
    </form>`,
    `<button class="btn btn-outline" onclick="closeModal('record-payment-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="submitFeePayment(${studentId})">${Icons?.render?.('save',{size:14}) || ''} Record Transaction</button>`,
    'modal-sm'
  );
}

async function submitFeePayment(studentId) {
  const amount = getVal('p-amount');
  const payment_date = getVal('p-date');
  const payment_method = getVal('p-method');
  const remarks = getVal('p-remarks');
  
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0 || !payment_date || !payment_method) {
    Toast.error('Validation Error', 'Amount, date, and method are required.');
    return;
  }
  
  try {
    await API.fees.addPayment(studentId, {
      amount: parseFloat(amount),
      payment_date,
      payment_method,
      remarks
    });
    closeModal('record-payment-modal');
    Toast.success('Payment Recorded', `Recorded transaction of ₹${amount} successfully.`);
    await loadFeesTab(_studentsStandardId);
  } catch (err) {
    Toast.error('Failed to save payment', err.message);
  }
}

async function showStudentLedgerModal(studentId, name) {
  Spinner.show('Loading student transaction ledger...');
  try {
    const data = await API.fees.getLedger(studentId);
    Spinner.hide();
    
    const fmt = (n) => '₹' + (parseFloat(n)||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
    const rows = data.payments.map(p => `
      <tr>
        <td style="padding:var(--space-2) var(--space-3)">${Format.date(p.payment_date)}</td>
        <td style="padding:var(--space-2) var(--space-3)" class="text-success font-semibold">${fmt(p.amount)}</td>
        <td style="padding:var(--space-2) var(--space-3)"><span class="badge badge-gray">${p.payment_method}</span></td>
        <td style="padding:var(--space-2) var(--space-3)">${p.remarks || '—'}</td>
        <td style="padding:var(--space-2) var(--space-3)">
          <div style="display:flex;gap:4px;">
            <a href="/api/fees/payments/${p.id}/receipt-pdf" target="_blank" class="btn btn-ghost btn-icon-sm" title="Download Receipt PDF">${Icons?.render?.('download',{size:13}) || ''}</a>
            <button class="btn btn-ghost btn-icon-sm" onclick="deleteFeePayment(${p.id}, ${studentId}, '${name.replace(/'/g, "\\'").replace(/`/g,"'")}', ${p.amount})" title="Delete Payment">${Icons?.render?.('delete',{size:13}) || ''}</button>
          </div>
        </td>
      </tr>
    `).join('');
    
    createModal('ledger-modal', `${Icons?.render?.('results',{size:16}) || ''} Student Fee Ledger — ${name}`,
      `<div class="grid grid-2 gap-4 mb-6 bg-surface p-4 rounded" style="border:1px solid var(--border)">
        <div>
          <div class="text-xs text-muted">Total Course Fees</div>
          <div style="font-size:1.4rem;font-weight:700;color:var(--text-primary)">₹${data.student.total_fees || 0}</div>
        </div>
        <div>
          <div class="text-xs text-muted">Outstanding Balance</div>
          <div style="font-size:1.4rem;font-weight:700;color:var(--danger)">₹${data.outstanding}</div>
        </div>
      </div>
      
      <h3>Transaction History Ledger</h3>
      <div class="table-wrap mt-2" style="max-height:350px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;padding:var(--space-2) var(--space-3)">Date</th>
              <th style="text-align:left;padding:var(--space-2) var(--space-3)">Amount Paid</th>
              <th style="text-align:left;padding:var(--space-2) var(--space-3)">Method</th>
              <th style="text-align:left;padding:var(--space-2) var(--space-3)">Remarks</th>
              <th style="padding:var(--space-2) var(--space-3)"></th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:var(--space-6)">No payments recorded yet.</td></tr>' : rows}
          </tbody>
        </table>
      </div>`,
      `<div style="display:flex;gap:8px;">
        <button class="btn btn-outline" onclick="closeModal('ledger-modal')">Close</button>
        <button class="btn btn-primary" onclick="downloadStudentLedgerPDF(${studentId})">${Icons?.render?.('download',{size:14}) || ''} Download Ledger PDF</button>
        <button class="btn btn-outline btn-sm" onclick="showRecordPaymentModal(${studentId}, '${name.replace(/'/g,"'")}')">${Icons?.render?.('fees',{size:14}) || ''} + Add Payment</button>
      </div>`,
      'modal-md'
    );
  } catch (err) {
    Spinner.hide();
    Toast.error('Ledger Error', err.message);
  }
}

async function deleteFeePayment(paymentId, studentId, name, amount) {
  const ok = await Confirm.show(`Delete payment?`, `Are you sure you want to delete this payment of ₹${amount}? This will increase outstanding balance.`, 'Delete Transaction');
  if (!ok) return;
  
  try {
    await API.fees.deletePayment(paymentId);
    closeModal('ledger-modal');
    Toast.success('Transaction Deleted', 'Fee payment has been removed.');
    await loadFeesTab(_studentsStandardId);
  } catch (err) {
    Toast.error('Delete Failed', err.message);
  }
}

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

