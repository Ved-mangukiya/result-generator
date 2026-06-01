/* ═══════════════════════════════════════════════
   STUDENTS.JS — Student CRUD + Marks Entry
   ═══════════════════════════════════════════════ */

let _studentsStandardId = null;
let _studentsList = [];
let _studentsSearch = '';

let _currentStudentsTab = 'directory'; // 'directory', 'admissions', 'fees'

async function renderStudents(params = {}) {
  setPageTitle('Admissions & Fees', 'Admissions & Fees');
  _studentsStandardId = params.standardId || null;
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Admissions &amp; Fees</h1>
        <p>Manage student profiles, enrollment statuses, and tuition fee ledgers.</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" onclick="resequenceRollNumbers()">🔢 Resequence Rolls</button>
        <button class="btn btn-outline btn-sm" onclick="Router.navigate('import')">📥 Import Excel</button>
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
    const search = document.getElementById('student-search')?.value || '';
    
    _studentsList = await API.students.list(stdId, search);
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
              <th>Attendance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${_studentsList.map(s => `
              <tr>
                <td>
                  <div class="student-avatar" style="width:36px;height:42px;border-radius:var(--radius-sm)">
                    ${s.photo_path ? `<img src="/${s.photo_path}" alt="${s.name}">` : s.name[0].toUpperCase()}
                  </div>
                </td>
                <td><span class="badge badge-gray">${s.roll_number}</span></td>
                <td class="td-primary">${s.name}</td>
                <td>${s.father_name || '—'}</td>
                <td class="text-sm">${s.standard_name || '—'}</td>
                <td><span class="badge badge-primary">${s.board_short || '—'}</span></td>
                <td>${s.attendance_pct !== null ? s.attendance_pct + '%' : '—'}</td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-outline btn-sm" onclick="showMarksEntry(${s.id})">📝 Marks</button>
                    <button class="btn btn-ghost btn-icon-sm" onclick="showEditStudentModal(${s.id})" title="Edit">✏</button>
                    <button class="btn btn-ghost btn-icon-sm" onclick="confirmDeleteStudent(${s.id}, '${s.name}')" title="Delete">🗑</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    Toast.error('Failed to load students', err.message);
  }
}

function searchStudents(val) {
  _studentsSearch = val;
  loadStudents();
}

function filterByStandard(val) {
  _studentsStandardId = val || null;
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
        <div class="form-grid mb-4">
          <div class="form-group">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input type="text" class="form-control" id="st-name" value="${s?.name || ''}" placeholder="Student's full name">
          </div>
          <div class="form-group">
            <label class="form-label">Roll Number <span class="required">*</span></label>
            <input type="text" class="form-control" id="st-roll" value="${s?.roll_number || ''}" placeholder="e.g. 2024001">
          </div>
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
          <div class="form-group">
            <label class="form-label">Attendance %</label>
            <input type="number" class="form-control" id="st-attendance" value="${s?.attendance_pct ?? ''}" min="0" max="100" placeholder="e.g. 87.5">
          </div>
        </div>
        
        <p class="form-section-title">Class Assignment</p>
        <div class="form-group mb-4">
          <label class="form-label">Board & Class <span class="required">*</span></label>
          <select class="form-control" id="st-standard" onchange="autoFillNextRoll(this.value)">
            <option value="">— Select Class —</option>
          </select>
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
    
    if (!s && _studentsStandardId) {
      sel.value = _studentsStandardId;
      autoFillNextRoll(_studentsStandardId);
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

async function saveStudent(studentId) {
  const name = getVal('st-name');
  const roll = getVal('st-roll');
  const standardId = getVal('st-standard');
  
  if (!name || !roll || !standardId) {
    Toast.error('Required Fields', 'Name, roll number, and class are required.');
    return;
  }
  
  const data = {
    name, roll_number: roll,
    father_name: getVal('st-father'),
    mother_name: getVal('st-mother'),
    dob: getVal('st-dob'),
    remarks: getVal('st-remarks'),
    attendance_pct: getVal('st-attendance') ? parseFloat(getVal('st-attendance')) : null,
    standard_id: parseInt(standardId),
    admission_date: getVal('st-admission-date'),
    status: getVal('st-status') || 'Active',
    total_fees: parseFloat(getVal('st-total-fees')) || 0
  };
  
  try {
    let id = studentId;
    if (studentId) {
      await API.students.update(studentId, data);
    } else {
      const res = await API.students.add(data);
      id = res.id;
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
            const isAbsent = m.is_absent === 1;
            const intVal = m.internal_marks ?? '';
            const extVal = m.external_marks ?? '';
            const totalVal = m.total_marks ?? '';
            return `<tr data-subject-id="${sub.id}" data-marks-type="${sub.marks_type}" data-max="${sub.max_marks}" data-int-max="${sub.internal_max || 0}" data-ext-max="${sub.external_max || sub.max_marks}">
              <td style="padding:var(--space-2) var(--space-3)">
                <div style="font-weight:600;color:var(--text-primary);font-size:0.8125rem">${sub.name}</div>
                <div class="text-xs text-muted">${sub.is_compulsory ? 'Compulsory' : 'Optional'} · Max ${sub.max_marks}</div>
              </td>
              <td style="text-align:center;padding:var(--space-2) var(--space-3);color:var(--text-muted)">${sub.max_marks}</td>
              ${hasSplit ? (sub.marks_type === 'split'
                ? `<td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" id="int-${sub.id}" value="${intVal}" min="0" max="${sub.internal_max}" placeholder="Int" onchange="calcRowTotal(${sub.id})" ${isAbsent?'disabled':''}></td>
                   <td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" id="ext-${sub.id}" value="${extVal}" min="0" max="${sub.external_max}" placeholder="Ext" onchange="calcRowTotal(${sub.id})" ${isAbsent?'disabled':''}></td>`
                : '<td></td><td></td>') : ''}
              <td style="padding:var(--space-2) var(--space-3)">
                ${sub.marks_type === 'split'
                  ? `<span class="marks-total-cell" id="total-${sub.id}">${(intVal !== '' && extVal !== '') ? (parseFloat(intVal||0) + parseFloat(extVal||0)) : (totalVal !== '' ? totalVal : '—')}</span>`
                  : `<input type="number" class="form-control marks-input" id="total-${sub.id}" value="${totalVal}" min="0" max="${sub.max_marks}" placeholder="Marks" onchange="calcRowPct(${sub.id})" ${isAbsent?'disabled':''}>`}
              </td>
              <td style="padding:var(--space-2) var(--space-3);text-align:center">
                <span class="marks-pct-cell" id="pct-${sub.id}">${calcPct(sub.marks_type === 'split' ? (parseFloat(intVal||0)+parseFloat(extVal||0)) : parseFloat(totalVal), sub.max_marks)}</span>
              </td>
              <td style="padding:var(--space-2) var(--space-3);text-align:center">
                <label class="toggle"><input type="checkbox" id="absent-${sub.id}" ${isAbsent?'checked':''} onchange="toggleAbsent(${sub.id})"><span class="toggle-slider"></span></label>
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
    const isAbsent = document.getElementById(`absent-${subId}`)?.checked || false;
    
    let total = null, internal = null, external = null;
    if (!isAbsent) {
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
    createModal('preview-modal', '👁 Result Card Preview', 
      `<div style="background:white;border-radius:var(--radius-lg);overflow:hidden;min-height:600px">
        <iframe id="preview-iframe" style="width:100%;height:800px;border:none" srcdoc="${html.replace(/"/g, '&quot;')}"></iframe>
      </div>`,
      `<button class="btn btn-outline" onclick="closeModal('preview-modal')">Close</button>
       <a href="${API.export.pdfSingle(studentId)}" class="btn btn-primary" target="_blank">⬇ Download PDF</a>`,
      'modal-full'
    );
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

// ─── Tuition ERP Page Views ───────────────────────
async function loadAdmissionsTab(standardId) {
  if (!standardId) return;
  _studentsStandardId = parseInt(standardId);
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

window.loadAdmissionsTab = loadAdmissionsTab;
window.updateStudentAdmissionStatus = updateStudentAdmissionStatus;
window.loadFeesTab = loadFeesTab;
window.showRecordPaymentModal = showRecordPaymentModal;
window.submitFeePayment = submitFeePayment;
window.showStudentLedgerModal = showStudentLedgerModal;
window.deleteFeePayment = deleteFeePayment;
window.loadAdmissionsDropdown = loadAdmissionsDropdown;
window.loadFeesDropdown = loadFeesDropdown;
