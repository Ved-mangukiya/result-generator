/* ═══════════════════════════════════════════════
   STUDENTS.JS — Student CRUD + Marks Entry
   ═══════════════════════════════════════════════ */

let _studentsStandardId = null;
let _studentsList = [];
let _studentsSearch = '';

async function renderStudents(params = {}) {
  setPageTitle('Students', 'Students');
  _studentsStandardId = params.standardId || null;
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Students</h1>
        <p>Manage student records and enter marks</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" onclick="Router.navigate('import')">📥 Import Excel</button>
        <button class="btn btn-primary btn-sm" onclick="showAddStudentModal()">➕ Add Student</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-4">
      <div class="card-body" style="padding:var(--space-4)">
        <div class="flex gap-3 flex-wrap">
          <div class="search-input-wrap" style="flex:1;min-width:200px">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-control" id="student-search" placeholder="Search by name or roll number..." 
              oninput="debounce(searchStudents, 300)(this.value)">
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
    </div>`;
  
  await loadStandardsDropdown();
  if (_studentsStandardId) {
    document.getElementById('student-filter-std').value = _studentsStandardId;
  }
  await loadStudents();
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
          <select class="form-control" id="st-standard">
            <option value="">— Select Class —</option>
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
    }
  } catch {}
}

function previewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const wrap = document.getElementById('photo-preview-wrap');
    let img = wrap.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.id = 'photo-preview-img';
      wrap.innerHTML = '';
      wrap.appendChild(img);
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'student-photo-file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (ev) => previewPhoto(ev.target);
      fileInput.style.cssText = 'position:absolute;inset:0;opacity:0;cursor:pointer';
      wrap.appendChild(fileInput);
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
    standard_id: parseInt(standardId)
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
