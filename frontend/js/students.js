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
        <button class="btn btn-outline btn-sm" onclick="resequenceRollNumbers()">🔢 Resequence Rolls</button>
        <button class="btn btn-outline btn-sm" onclick="Router.navigate('import')">📥 Import Excel</button>
        <button class="btn btn-outline btn-sm" onclick="showDirectGridAdmissionModal()">📊 Direct Grid Entry</button>
        <button class="btn btn-primary btn-sm" onclick="showAddStudentModal()">➕ Add Student</button>
      </div>
    </div>

    <!-- ERP Navigation Tabs -->
    <div class="tabs mb-6">
      <button class="btn ${_currentStudentsTab === 'directory' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tab-directory" onclick="switchStudentsTab('directory')">👥 Student Directory</button>
      <button class="btn ${_currentStudentsTab === 'admissions' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tab-admissions" onclick="switchStudentsTab('admissions')">🏛 Admissions &amp; Status</button>
      <button class="btn ${_currentStudentsTab === 'fees' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-tab-fees" onclick="switchStudentsTab('fees')">💰 Fees &amp; Ledger</button>
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
  
  if (btnDir) btnDir.className = `btn ${tab === 'directory' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnAdm) btnAdm.className = `btn ${tab === 'admissions' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnFees) btnFees.className = `btn ${tab === 'fees' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  
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
                value="${_studentsSearch}" oninput="debounce(searchStudents, 300)(this.value)">
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
        <div id="students-body">
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
          </div>
        </div>
      </div>
      
      <div id="admissions-tab-body">
        <div class="empty-state" style="height:250px">
          <div class="empty-state-icon">🏛</div>
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
          </div>
        </div>
      </div>

      <div id="fees-tab-body">
        <div class="empty-state" style="height:250px">
          <div class="empty-state-icon">💰</div>
          <h3>Select a Class</h3>
          <p>Choose a class from the dropdown above to manage fee balances, ledgers, and payments.</p>
        </div>
      </div>
    `;
    await loadFeesDropdown();
  }
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
    
    _studentsList = await API.students.list(stdId, search);
    if (batchId) {
      _studentsList = _studentsList.filter(s => s.batch_id == batchId);
    }
    
    document.getElementById('student-count').textContent = _studentsList.length;
    
    if (_studentsList.length === 0) {
      body.innerHTML = `
        <div class="empty-state" style="padding:var(--space-12)">
          <div class="empty-state-icon">👤</div>
          <h3>No Students Found</h3>
          <p>${search ? `No students matching "${search}".` : 'No students enrolled yet. Add manually or import from Excel.'}</p>
          <div class="flex gap-3 justify-center">
            <button class="btn btn-primary" onclick="showAddStudentModal()">➕ Add Manually</button>
            <button class="btn btn-outline" onclick="Router.navigate('import')">📥 Import Excel</button>
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
                      ${s.photo_path ? `<img src="/${s.photo_path}" alt="${s.name}">` : s.name[0].toUpperCase()}
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
                      <button class="btn btn-outline btn-sm" onclick="showMarksEntry(${s.id})">📝 Marks</button>
                      <button class="btn btn-ghost btn-icon-sm" onclick="showEditStudentModal(${s.id})" title="Edit">✏</button>
                      <button class="btn btn-ghost btn-icon-sm" onclick="confirmDeleteStudent(${s.id}, '${s.name}')" title="Delete">🗑</button>
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

function searchStudents(val) {
  _studentsSearch = val;
  localStorage.setItem('tuition_erp_students_search', val);
  loadStudents();
}

function filterByStandard(val, skipLoad = false) {
  _studentsStandardId = val ? parseInt(val) : null;
  localStorage.setItem('tuition_erp_students_standard_id', _studentsStandardId);
  const batchSelect = document.getElementById('student-filter-batch');
  if (val) {
    API.batches.list(val).then(batches => {
      batchSelect.innerHTML = '<option value="">All Batches</option>' + batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
      batchSelect.style.display = 'block';
      if (!skipLoad) loadStudents();
    }).catch(() => { if (!skipLoad) loadStudents(); });
  } else {
    batchSelect.style.display = 'none';
    batchSelect.value = '';
    if (!skipLoad) loadStudents();
  }
}

function filterByBatch(val) {
  loadStudents();
}

function showAddStudentModal() {
  createModal('add-student-modal', '➕ Add New Student',
    buildStudentForm(null),
    `<button class="btn btn-outline" onclick="closeModal('add-student-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="saveStudent(null)">💾 Save Student</button>`,
    'modal-lg'
  );
  initStudentForm(null);
}

async function showEditStudentModal(studentId) {
  const student = await API.students.get(studentId).catch(err => { Toast.error('Load Failed', err.message); return null; });
  if (!student) return;
  
  createModal('edit-student-modal', '✏️ Edit Student',
    buildStudentForm(student),
    `<button class="btn btn-outline" onclick="closeModal('edit-student-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="saveStudent(${studentId})">💾 Save Changes</button>`,
    'modal-lg'
  );
  initStudentForm(student);
}

function buildStudentForm(s) {
  return `
    <div class="flex gap-6">
      <!-- Photo -->
      <div class="photo-uploader">
        <div class="photo-preview-circle" id="photo-preview-wrap">
          <input type="file" id="student-photo-file" accept="image/*" onchange="previewPhoto(this)">
          ${s?.photo_path ? `<img src="/${s.photo_path}" id="photo-preview-img">` : `<div class="photo-placeholder-text" id="photo-preview-img">📷<br><small>Click to upload</small></div>`}
        </div>
        <span class="text-xs text-muted">Student Photo</span>
        <span class="text-xs text-muted">(Optional)</span>
      </div>

      <div class="flex-1">
        <p class="form-section-title">Personal Details</p>
        <input type="hidden" id="st-roll" value="${s?.roll_number || ''}">
        <div class="form-group mb-4">
          <label class="form-label">Full Name <span class="required">*</span></label>
          <input type="text" class="form-control" id="st-name" value="${s?.name || ''}" placeholder="Student's full name">
        </div>
        <div class="form-grid mb-4">
          <div class="form-group">
            <label class="form-label">Father's Name</label>
            <input type="text" class="form-control" id="st-father" value="${s?.father_name || ''}" placeholder="Father's full name">
          </div>
          <div class="form-group">
            <label class="form-label">Mother's Name</label>
            <input type="text" class="form-control" id="st-mother" value="${s?.mother_name || ''}" placeholder="Mother's full name">
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

    let chosenElectiveIds = [];
    if (student && student.elective_subjects) {
      try {
        const parsed = typeof student.elective_subjects === 'string'
          ? JSON.parse(student.elective_subjects)
          : student.elective_subjects;
        if (Array.isArray(parsed)) {
          chosenElectiveIds = parsed.map(el => typeof el === 'object' ? el.id : el);
        }
      } catch (e) {
        console.error('Error parsing student electives:', e);
      }
    }

    listContainer.innerHTML = subjects.map(sub => {
      const isCompulsory = sub.is_compulsory !== 0;
      if (isCompulsory) {
        return `
          <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:not-allowed; margin-bottom:0; opacity:0.75">
            <input type="checkbox" checked disabled style="cursor:not-allowed">
            <span>${sub.name} <span class="text-muted" style="font-size:0.7rem">(Compulsory · ${sub.max_marks}m)</span></span>
          </label>`;
      } else {
        const isChecked = student ? chosenElectiveIds.includes(sub.id) : true;
        return `
          <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer; margin-bottom:0">
            <input type="checkbox" value="${sub.id}" data-name="${sub.name}" class="st-elective-cb" ${isChecked ? 'checked' : ''} style="cursor:pointer">
            <span>${sub.name} <span class="text-gold" style="font-weight:600; font-size:0.7rem">(Elective · ${sub.max_marks}m)</span></span>
          </label>`;
      }
    }).join('');

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
  const name = getVal('st-name');
  let roll = getVal('st-roll');
  const standardId = getVal('st-standard');
  const rollMode = document.querySelector('input[name="st-roll-mode"]:checked')?.value || 'append';
  
  if (!studentId && rollMode === 'resequence') {
    roll = 'TEMP_' + Date.now();
  }
  
  if (!name || !standardId) {
    Toast.error('Required Fields', 'Name and class are required.');
    return;
  }
  
  // Collect elective subject checkboxes
  const electiveCBs = $$('.st-elective-cb');
  const elective_subjects = [];
  electiveCBs.forEach(cb => {
    if (cb.checked) {
      elective_subjects.push({
        id: parseInt(cb.value),
        name: cb.dataset.name
      });
    }
  });

  const data = {
    name, roll_number: roll || null,
    father_name: getVal('st-father'),
    mother_name: getVal('st-mother'),
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
  
  createModal('marks-modal', `📝 Marks Entry — ${student.name} (Roll: ${student.roll_number})`,
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
            const isOptional = sub.is_compulsory === 0;
            const isSelected = !isOptional || electiveIds.includes(sub.id);
            const isAbsent = m.is_absent === 1;
            const intVal = m.internal_marks ?? '';
            const extVal = m.external_marks ?? '';
            const totalVal = m.total_marks ?? '';
            
            const rowStyle = !isSelected ? 'style="background: var(--bg-elevated); opacity: 0.55;"' : '';
            const electiveBadge = isOptional 
              ? (isSelected 
                  ? `<span class="badge badge-success" style="font-size:0.65rem; text-transform:none">Chosen Elective</span>` 
                  : `<span class="badge badge-gray" style="font-size:0.65rem; text-transform:none">Not Chosen</span>`)
              : '';

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
     <button class="btn btn-success btn-sm" onclick="showMarksPreview(${studentId})">👁 Preview Card</button>
     <button class="btn btn-primary" onclick="saveMarks(${studentId}, ${JSON.stringify(subjects.map(s=>s.id))})">💾 Save Marks</button>`,
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
    const overlay = createModal('preview-modal', '👁 Result Card Preview', 
      `<div id="preview-viewport-container" style="display:flex; justify-content:center; align-items:center; background:#0f172a; padding:20px; transition:all 0.3s ease; overflow:auto; max-height:700px; border-radius:var(--radius)">
         <iframe id="preview-iframe" style="width:210mm; height:297mm; max-height:650px; background:white; border:none; box-shadow:0 10px 25px rgba(0,0,0,0.5); transition:all 0.3s ease" srcdoc="${html.replace(/"/g, '&quot;')}"></iframe>
       </div>`,
      `<button class="btn btn-outline" onclick="closeModal('preview-modal')">Close</button>
       <a href="${API.export.pdfSingle(studentId)}" class="btn btn-primary" target="_blank">⬇ Download PDF</a>`,
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
    'Resequence', 'btn-primary', '🔢');
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
window.toggleStudentRollMode = toggleStudentRollMode;

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
                    <button class="btn btn-outline btn-sm" onclick="showEditStudentModal(${s.id})">✏ Edit</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error Loading Admissions</h3><p>${err.message}</p></div>`;
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
  container.innerHTML = `<div class="empty-state"><div class="animate-pulse" style="font-size:2rem">💰</div><p class="text-muted text-sm mt-2">Loading fees ledger...</p></div>`;
  
  try {
    const students = await API.students.list(standardId);
    
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Student Tuition Fee Accounts</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Total Course Fee</th>
                <th>Total Paid</th>
                <th>Outstanding Balance</th>
                <th>Ledger Actions</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const total = s.total_fees || 0;
                const paid = s.paid_fees || 0;
                const bal = Math.max(0, total - paid);
                const balClass = bal > 0 ? 'text-danger font-semibold' : 'text-success font-semibold';
                return `
                  <tr>
                    <td><span class="badge badge-gray">${s.roll_number}</span></td>
                    <td class="td-primary">${s.name}</td>
                    <td>₹${total}</td>
                    <td class="text-success font-semibold">₹${paid}</td>
                    <td class="${balClass}">₹${bal}</td>
                    <td>
                      <div class="td-actions">
                        <button class="btn btn-outline btn-sm" onclick="showRecordPaymentModal(${s.id}, '${s.name.replace(/'/g, "\\'")}')">💰 Record Payment</button>
                        <button class="btn btn-ghost btn-sm" onclick="showStudentLedgerModal(${s.id}, '${s.name.replace(/'/g, "\\'")}')">📖 View Ledger</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error Loading Fees</h3><p>${err.message}</p></div>`;
  }
}

function showRecordPaymentModal(studentId, name) {
  createModal('record-payment-modal', `💰 Record Fee Payment — ${name}`,
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
     <button class="btn btn-primary" onclick="submitFeePayment(${studentId})">💾 Record Transaction</button>`,
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
    
    const rows = data.payments.map(p => `
      <tr>
        <td style="padding:var(--space-2) var(--space-3)">${Format.date(p.payment_date)}</td>
        <td style="padding:var(--space-2) var(--space-3)" class="text-success font-semibold">₹${p.amount}</td>
        <td style="padding:var(--space-2) var(--space-3)"><span class="badge badge-gray">${p.payment_method}</span></td>
        <td style="padding:var(--space-2) var(--space-3)">${p.remarks || '—'}</td>
        <td style="padding:var(--space-2) var(--space-3)">
          <button class="btn btn-ghost btn-icon-sm" onclick="deleteFeePayment(${p.id}, ${studentId}, '${name.replace(/'/g, "\\'")}', ${p.amount})" title="Delete Payment">🗑</button>
        </td>
      </tr>
    `).join('');
    
    createModal('ledger-modal', `📖 Student Fee Ledger — ${name}`,
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
      `<button class="btn btn-primary" onclick="closeModal('ledger-modal')">Close</button>`,
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
    if (sel.value) await loadAdmissionsTab(sel.value);
  } catch {}
}

async function loadFeesDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('fees-filter-std');
    if (!sel) return;
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
    if (sel.value) await loadFeesTab(sel.value);
  } catch {}
}

async function showDirectGridAdmissionModal() {
  createModal('direct-grid-admission-modal', '📊 Direct Grid Admission Entry',
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
      </div>
      <div style="max-height:450px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-elevated)" class="mb-4">
        <table style="width:100%; border-collapse:collapse" class="marks-table">
          <thead style="position:sticky; top:0; z-index:10; background:var(--bg-surface)">
            <tr style="border-bottom:1px solid var(--border)">
              <th style="padding:8px; text-align:center; width:10%">Roll No.</th>
              <th style="padding:8px; text-align:left; width:30%">Student Name *</th>
              <th style="padding:8px; text-align:left; width:18%">Date of Birth</th>
              <th style="padding:8px; text-align:left; width:18%">Father's Name</th>
              <th style="padding:8px; text-align:left; width:18%">Mother's Name</th>
              <th style="padding:8px; text-align:left; width:12%">Total Fees</th>
              <th style="padding:8px; text-align:left; width:12%">Paid Fees</th>
            </tr>
          </thead>
          <tbody id="grid-adm-tbody">
            <!-- Populated with rows -->
          </tbody>
        </table>
      </div>
      <div class="flex justify-between items-center bg-surface p-3 rounded" style="border:1px solid var(--border)">
        <button class="btn btn-outline btn-sm" onclick="addGridAdmissionRow()">➕ Add Row</button>
        <p class="text-xs text-muted" style="margin:0">💡 Press <kbd>Enter</kbd> or <kbd>Tab</kbd> on the last cell to append a new row. Use Arrow keys to navigate. Press <kbd>Ctrl + S</kbd> to Save.</p>
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModal('direct-grid-admission-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="saveDirectGridAdmissions()">💾 Bulk Save Admissions</button>`,
    'modal-xl'
  );

  // Clear tbody
  document.getElementById('grid-adm-tbody').innerHTML = '';
  
  // Add 5 default rows
  for (let i = 0; i < 5; i++) {
    addGridAdmissionRow();
  }
  
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
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-name" placeholder="Full Name" data-row="${rowCount}" data-col="1" style="font-weight:600; padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-dob" placeholder="DD/MM/YYYY" data-row="${rowCount}" data-col="2" style="padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-father" placeholder="Father's Name" data-row="${rowCount}" data-col="3" style="padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="text" class="form-control grid-adm-mother" placeholder="Mother's Name" data-row="${rowCount}" data-col="4" style="padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="number" class="form-control grid-adm-total-fees" placeholder="0" data-row="${rowCount}" data-col="5" style="padding:var(--space-1) var(--space-2)"></td>
    <td style="padding:4px;"><input type="number" class="form-control grid-adm-paid-fees" placeholder="0" data-row="${rowCount}" data-col="6" style="padding:var(--space-1) var(--space-2)"></td>
  `;
  tbody.appendChild(tr);
  setupGridAdmissionKeyboardNavigation();
}

function setupGridAdmissionKeyboardNavigation() {
  // Clear any previous event listeners by cloning
  const newInputs = Array.from(document.querySelectorAll('#grid-adm-tbody input'));
  newInputs.forEach(input => {
    const cloned = input.cloneNode(true);
    input.replaceWith(cloned);
  });
  
  const inputs = Array.from(document.querySelectorAll('#grid-adm-tbody input'));
  inputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
      const row = parseInt(input.dataset.row);
      const col = parseInt(input.dataset.col);
      const maxRows = document.getElementById('grid-adm-tbody').children.length;
      
      let targetRow = row;
      let targetCol = col;
      let handled = false;
      
      if (e.key === 'ArrowUp') {
        targetRow = Math.max(0, row - 1);
        handled = true;
      } else if (e.key === 'ArrowDown') {
        targetRow = Math.min(maxRows - 1, row + 1);
        handled = true;
      } else if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (col === 0 && row > 0) {
            targetRow = row - 1;
            targetCol = 6;
            handled = true;
          } else if (col > 0) {
            targetCol = col - 1;
            handled = true;
          }
        } else {
          if (col === 6) {
            if (row === maxRows - 1) {
              e.preventDefault();
              addGridAdmissionRow();
              setTimeout(() => {
                const nextInput = document.querySelector(`#grid-adm-tbody input[data-row="${row + 1}"][data-col="0"]`);
                if (nextInput) {
                  nextInput.focus();
                  nextInput.select();
                }
              }, 10);
              return;
            } else {
              targetRow = row + 1;
              targetCol = 0;
              handled = true;
            }
          } else {
            targetCol = col + 1;
            handled = true;
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (row === maxRows - 1 && col === 6) {
          addGridAdmissionRow();
          setTimeout(() => {
            const nextInput = document.querySelector(`#grid-adm-tbody input[data-row="${row + 1}"][data-col="0"]`);
            if (nextInput) {
              nextInput.focus();
              nextInput.select();
            }
          }, 10);
          return;
        } else if (col === 6) {
          targetRow = row + 1;
          targetCol = 0;
          handled = true;
        } else {
          targetCol = col + 1;
          handled = true;
        }
      }
      
      if (handled) {
        e.preventDefault();
        const nextInput = document.querySelector(`#grid-adm-tbody input[data-row="${targetRow}"][data-col="${targetCol}"]`);
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    });
  });
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
    const nameInput = tr.querySelector('.grid-adm-name');
    if (!nameInput) continue;
    const name = nameInput.value.trim();
    if (!name) continue;
    
    const roll = tr.querySelector('.grid-adm-roll').value.trim();
    const dobInput = tr.querySelector('.grid-adm-dob').value.trim();
    const father = tr.querySelector('.grid-adm-father').value.trim();
    const mother = tr.querySelector('.grid-adm-mother').value.trim();
    const totalFees = parseFloat(tr.querySelector('.grid-adm-total-fees').value) || 0;
    const paidFees = parseFloat(tr.querySelector('.grid-adm-paid-fees').value) || 0;
    
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
      name,
      roll_number: roll || null,
      dob: dobParsed,
      father_name: father,
      mother_name: mother,
      total_fees: totalFees,
      paid_fees: paidFees
    });
  }
  
  if (studentsToInsert.length === 0) {
    Toast.warning('Empty Data', 'Please enter at least one student with a Name.');
    return;
  }
  
  Spinner.show('Creating students...');
  try {
    for (const student of studentsToInsert) {
      const data = {
        standard_id: parseInt(stdId),
        batch_id: batchId ? parseInt(batchId) : null,
        name: student.name,
        roll_number: student.roll_number,
        dob: student.dob,
        father_name: student.father_name,
        mother_name: student.mother_name,
        total_fees: student.total_fees,
        status: 'Active',
        admission_date: new Date().toISOString().split('T')[0]
      };
      
      const res = await API.students.add(data);
      const studentId = res.id;
      
      if (student.paid_fees > 0 && studentId) {
        await API.post(`/api/fees/student/${studentId}/payments`, {
          amount: student.paid_fees,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'Cash',
          remarks: 'Initial Admission Payment'
        });
      }
    }
    
    Spinner.hide();
    closeModal('direct-grid-admission-modal');
    Toast.success('Success', `Successfully admitted ${studentsToInsert.length} students!`);
    await loadStudents();
  } catch (err) {
    Spinner.hide();
    Toast.error('Save Failed', err.message);
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
