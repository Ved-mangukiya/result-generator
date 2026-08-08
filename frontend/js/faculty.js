/* ═══════════════════════════════════════════════
   FACULTY.JS — Faculty Management (Admin)
   Manage teachers, their subject-class assignments,
   and credential exports.
   ═══════════════════════════════════════════════ */

const FacultyModule = (() => {
  let _teachers = [];
  let _boards = [];
  let _allStandards = [];
  let _selectedTeacherId = null;

  async function renderFacultyPage(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>👩‍🏫 Faculty Management</h1>
          <p>Add faculty members, assign which subjects they teach in each class, and manage their login credentials.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="FacultyModule.showAddTeacherModal()">➕ Add Faculty Member</button>
        </div>
      </div>

      <div class="tabs mb-6">
        <button class="btn btn-primary btn-sm" id="fac-tab-btn-directory" onclick="FacultyModule.switchTab('directory')">📋 Faculty Directory</button>
        <button class="btn btn-outline btn-sm" id="fac-tab-btn-assignments" onclick="FacultyModule.switchTab('assignments')">📚 Subject Assignments</button>
        <button class="btn btn-outline btn-sm" id="fac-tab-btn-credentials" onclick="FacultyModule.switchTab('credentials')">🔐 Credentials</button>
      </div>

      <div id="fac-tab-directory"></div>
      <div id="fac-tab-assignments" style="display:none;"></div>
      <div id="fac-tab-credentials" style="display:none;"></div>
    `;

    // Load data
    await Promise.all([loadTeachers(), loadBoards()]);
    renderDirectoryTab();
  }

  function switchTab(tab) {
    ['directory', 'assignments', 'credentials'].forEach(t => {
      document.getElementById(`fac-tab-${t}`).style.display = t === tab ? '' : 'none';
      const btn = document.getElementById(`fac-tab-btn-${t}`);
      if (btn) {
        btn.classList.toggle('btn-primary', t === tab);
        btn.classList.toggle('btn-outline', t !== tab);
      }
    });
    if (tab === 'assignments') renderAssignmentsTab();
    if (tab === 'credentials') renderCredentialsTab();
  }

  async function loadTeachers() {
    try {
      const res = await API.request('/teachers');
      _teachers = res.teachers || [];
    } catch (e) { _teachers = []; }
  }

  async function loadBoards() {
    try {
      _boards = await API.boards.list();
      const res = await API.getStandards();
      _allStandards = res.standards || [];
    } catch (e) { _boards = []; _allStandards = []; }
  }

  // ─── Directory Tab ────────────────────────────────────────────────────────

  function renderDirectoryTab() {
    const el = document.getElementById('fac-tab-directory');
    if (!el) return;

    if (_teachers.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" style="font-size:3rem;">👩‍🏫</div>
          <h3>No Faculty Added Yet</h3>
          <p>Click "Add Faculty Member" to add your first teacher.</p>
          <button class="btn btn-primary mt-4" onclick="FacultyModule.showAddTeacherModal()">➕ Add Faculty Member</button>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:var(--space-4);">
        ${_teachers.map(t => renderTeacherCard(t)).join('')}
      </div>`;
  }

  function renderTeacherCard(t) {
    const initials = t.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return `
      <div class="card" style="padding:var(--space-5); position:relative;">
        <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4);">
          <div style="width:48px;height:48px;background:linear-gradient(135deg,var(--navy),var(--primary));border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:1.1rem;flex-shrink:0;">
            ${initials}
          </div>
          <div>
            <div class="font-bold" style="font-size:1rem;">${t.name}</div>
            <div class="text-muted text-xs">${t.email}</div>
          </div>
        </div>
        ${t.phone ? `<div class="text-sm mb-2">📞 ${t.phone}</div>` : ''}
        <div class="text-sm text-muted mb-4">Joined: ${t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : 'N/A'}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="FacultyModule.viewAssignments(${t.id}, '${t.name.replace(/'/g, "\\'")}')">📚 Assignments</button>
          <button class="btn btn-outline btn-sm" onclick="FacultyModule.showEditTeacherModal(${t.id})">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="FacultyModule.deleteTeacher(${t.id}, '${t.name.replace(/'/g, "\\'")}')">🗑️</button>
        </div>
      </div>`;
  }

  // ─── Assignments Tab ──────────────────────────────────────────────────────

  async function renderAssignmentsTab() {
    const el = document.getElementById('fac-tab-assignments');
    if (!el) return;

    el.innerHTML = `
      <div class="card p-6">
        <h3 class="mb-4">📚 Teacher Subject–Class Assignment Manager</h3>
        <p class="text-sm text-muted mb-6">
          For each teacher, specify exactly which subjects they teach in which class.<br>
          <em>Example: Prof. Sharma teaches Mathematics &amp; Physics in Class 11th Science, but only Mathematics in Class 12th Science.</em>
        </p>

        <div class="form-grid mb-6">
          <div class="form-group">
            <label class="form-label">Select Faculty Member <span class="required">*</span></label>
            <select id="assign-teacher-sel" class="form-control" onchange="FacultyModule.onAssignTeacherChange()">
              <option value="">-- Select Faculty --</option>
              ${_teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="teacher-assignments-panel">
          <div class="empty-state" style="height:200px;">
            <p class="text-muted">Select a faculty member to manage their subject assignments.</p>
          </div>
        </div>
      </div>`;
  }

  async function onAssignTeacherChange() {
    const teacherId = document.getElementById('assign-teacher-sel')?.value;
    if (!teacherId) return;
    _selectedTeacherId = teacherId;
    await renderTeacherAssignmentPanel(teacherId);
  }

  async function renderTeacherAssignmentPanel(teacherId) {
    const panel = document.getElementById('teacher-assignments-panel');
    if (!panel) return;
    panel.innerHTML = '<div class="text-muted text-sm">Loading...</div>';

    let assignments = [];
    try {
      const res = await API.request(`/teachers/${teacherId}/assignments`);
      assignments = res.assignments || [];
    } catch (e) {}

    const teacher = _teachers.find(t => t.id == teacherId);

    panel.innerHTML = `
      <div class="mb-5">
        <h4 class="mb-3 font-bold">➕ Add New Subject–Class Assignment for ${teacher?.name || 'Faculty'}</h4>
        <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr 1fr auto; align-items:flex-end; gap:12px;">
          <div class="form-group mb-0">
            <label class="form-label">Board</label>
            <select id="new-assign-board" class="form-control" onchange="FacultyModule.onNewAssignBoardChange()">
              <option value="">-- Board --</option>
              ${_boards.map(b => `<option value="${b.id}">${b.name} (${b.short_name})</option>`).join('')}
            </select>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Class / Standard</label>
            <select id="new-assign-standard" class="form-control" onchange="FacultyModule.onNewAssignStandardChange()">
              <option value="">-- Select Board First --</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Batch <span class="text-muted text-xs">(optional)</span></label>
            <select id="new-assign-batch" class="form-control">
              <option value="">All Batches</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Subject</label>
            <select id="new-assign-subject" class="form-control">
              <option value="">-- Select Class First --</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="FacultyModule.addAssignment(${teacherId})">Assign</button>
        </div>
      </div>

      <h4 class="mb-3 font-bold">📋 Current Assignments (${assignments.length})</h4>
      ${assignments.length === 0 ? `<p class="text-muted text-sm">No assignments yet. Add above.</p>` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Board</th><th>Class</th><th>Batch</th><th>Subject</th><th>Action</th></tr>
            </thead>
            <tbody>
              ${assignments.map(a => `
                <tr>
                  <td><span class="badge badge-gray">${a.board_short || 'Board'}</span></td>
                  <td class="td-primary">${a.class_name}</td>
                  <td><span class="badge badge-outline">${a.batch_name || 'All Batches'}</span></td>
                  <td>${a.subject_name_full || a.subject_name || 'All Subjects'}</td>
                  <td>
                    <button class="btn btn-ghost btn-icon-sm text-danger" onclick="FacultyModule.removeAssignment(${teacherId}, ${a.id})">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  }

  async function onNewAssignBoardChange() {
    const boardId = document.getElementById('new-assign-board')?.value;
    const stdSel = document.getElementById('new-assign-standard');
    if (!stdSel) return;

    if (!boardId) {
      stdSel.innerHTML = '<option value="">-- Select Board First --</option>';
      document.getElementById('new-assign-batch').innerHTML = '<option value="">All Batches</option>';
      document.getElementById('new-assign-subject').innerHTML = '<option value="">-- Select Class First --</option>';
      return;
    }

    try {
      const res = await API.getStandards(boardId);
      const standards = res.standards || [];
      stdSel.innerHTML = `<option value="">-- Select Class --</option>${standards.map(s => `<option value="${s.id}">${s.display_name}</option>`).join('')}`;
    } catch (e) {
      stdSel.innerHTML = '<option value="">-- Error Loading Classes --</option>';
    }
    document.getElementById('new-assign-batch').innerHTML = '<option value="">All Batches</option>';
    document.getElementById('new-assign-subject').innerHTML = '<option value="">-- Select Class First --</option>';
  }

  async function onNewAssignStandardChange() {
    const standardId = document.getElementById('new-assign-standard')?.value;
    const subjSel = document.getElementById('new-assign-subject');
    const batchSel = document.getElementById('new-assign-batch');
    if (!subjSel) return;

    if (!standardId) {
      subjSel.innerHTML = '<option value="">-- Select Class First --</option>';
      if (batchSel) batchSel.innerHTML = '<option value="">All Batches</option>';
      return;
    }

    // Load batches for class
    try {
      const res = await API.batches.list(standardId);
      const batches = res.batches || [];
      if (batchSel) {
        batchSel.innerHTML = `<option value="">All Batches</option>${batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}`;
      }
    } catch (e) {}

    // Load subjects for class
    let subjects = [];
    try {
      subjects = await API.subjects.list(standardId);
    } catch (e) {}

    subjSel.innerHTML = `
      <option value="">-- All Subjects (General) --</option>
      ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}`;
  }

  async function addAssignment(teacherId) {
    const standardId = document.getElementById('new-assign-standard')?.value;
    const batchId = document.getElementById('new-assign-batch')?.value || null;
    const subjectEl = document.getElementById('new-assign-subject');
    const subjectId = subjectEl?.value || null;
    const subjectName = subjectId ? subjectEl.options[subjectEl.selectedIndex]?.text : 'All Subjects';

    if (!standardId) {
      Toast.warning('Required', 'Please select a class first.');
      return;
    }

    try {
      await API.request(`/teachers/${teacherId}/assignments`, 'POST', {
        standard_id: parseInt(standardId),
        batch_id: batchId ? parseInt(batchId) : null,
        subject_id: subjectId ? parseInt(subjectId) : null,
        subject_name: subjectName
      });
      Toast.success('Assigned!', `Teacher assigned to teach ${subjectName} in this class.`);
      await renderTeacherAssignmentPanel(teacherId);
    } catch (err) {
      if (err.status === 409) {
        Toast.warning('Already Assigned', 'This assignment already exists.');
      } else {
        Toast.error('Error', err.message);
      }
    }
  }

  async function removeAssignment(teacherId, assignmentId) {
    if (!confirm('Remove this subject assignment?')) return;
    try {
      await API.request(`/teachers/${teacherId}/assignments/${assignmentId}`, 'DELETE');
      Toast.success('Removed', 'Assignment removed.');
      await renderTeacherAssignmentPanel(teacherId);
    } catch (err) {
      Toast.error('Error', err.message);
    }
  }

  function viewAssignments(teacherId, teacherName) {
    switchTab('assignments');
    setTimeout(() => {
      const sel = document.getElementById('assign-teacher-sel');
      if (sel) { sel.value = teacherId; FacultyModule.onAssignTeacherChange(); }
    }, 100);
  }

  // ─── Credentials Tab ─────────────────────────────────────────────────────

  function renderCredentialsTab() {
    const el = document.getElementById('fac-tab-credentials');
    if (!el) return;

    if (_teachers.length === 0) {
      el.innerHTML = `<div class="empty-state"><h3>No Faculty Added Yet</h3></div>`;
      return;
    }

    el.innerHTML = `
      <div class="card p-6">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-5);">
          <h3>🔐 Faculty Login Credentials</h3>
          <button class="btn btn-primary btn-sm" onclick="FacultyModule.exportCredentialsPDF()">📄 Export All Credentials PDF</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Faculty Name</th><th>Login Username</th><th>Default Password</th></tr>
            </thead>
            <tbody>
              ${_teachers.map((t, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td class="td-primary">${t.name}</td>
                  <td><span class="badge badge-gray" style="font-family:monospace;">${t.email}</span></td>
                  <td><span class="badge" style="font-family:monospace; background:rgba(46,184,160,0.15); color:var(--teal);">teacher@123</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function exportCredentialsPDF() {
    const printWin = window.open('', '_blank');
    if (!printWin) { Toast.error('Popup Blocked', 'Allow popups to view PDF.'); return; }

    printWin.document.write(`
      <!DOCTYPE html><html>
      <head><title>Faculty Credentials</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #1B2A4A; }
        h2 { text-align: center; color: #1B2A4A; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #CBD5E1; padding: 10px 12px; text-align: left; }
        th { background: #1B2A4A; color: white; }
        tr:nth-child(even) { background: #F8FAFC; }
        .code { font-family: monospace; font-weight: bold; background: #E2E8F0; padding: 2px 6px; border-radius: 4px; }
        @media print { .no-print { display: none; } }
      </style></head>
      <body>
        <div class="no-print" style="text-align:right; margin-bottom:15px;">
          <button onclick="window.print()" style="padding:8px 20px; background:#1B2A4A; color:white; border:none; border-radius:6px; cursor:pointer;">🖨️ Print PDF</button>
        </div>
        <h2>EduTrack ERP — Faculty Login Credentials</h2>
        <table>
          <thead><tr><th>#</th><th>Faculty Name</th><th>Login Username</th><th>Default Password</th></tr></thead>
          <tbody>
            ${_teachers.map((t, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${t.name}</strong></td>
                <td><span class="code">${t.email}</span></td>
                <td><span class="code">teacher@123</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p style="margin-top:20px; font-size:11px; color:#94A3B8; text-align:center;">Generated ${new Date().toLocaleDateString()} — Confidential</p>
      </body></html>`);
    printWin.document.close();
  }

  // ─── Add / Edit Teacher Modals ────────────────────────────────────────────

  function showAddTeacherModal() {
    // Create modal overlay
    const existing = document.getElementById('fac-add-teacher-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'fac-add-teacher-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:var(--card-bg);border-radius:16px;padding:32px;width:100%;max-width:480px;box-shadow:var(--shadow-xl);border:1px solid var(--border-color);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
          <h3 style="margin:0;">➕ Add Faculty Member</h3>
          <button onclick="document.getElementById('fac-add-teacher-modal')?.remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">×</button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input type="text" id="fac-name" class="form-control" placeholder="e.g. Prof. Rajesh Sharma" autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="text" id="fac-phone" class="form-control" placeholder="+91 98XXXXXXXX">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email / Username <span class="text-muted text-xs">(auto-generated if blank)</span></label>
          <input type="email" id="fac-email" class="form-control" placeholder="Auto-generated from name">
        </div>
        <div class="form-group">
          <label class="form-label">Custom Password <span class="text-muted text-xs">(default: teacher@123)</span></label>
          <input type="text" id="fac-password" class="form-control" placeholder="teacher@123">
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-outline" onclick="document.getElementById('fac-add-teacher-modal')?.remove()">Cancel</button>
          <button class="btn btn-primary" onclick="FacultyModule.saveNewTeacher()">Save Faculty</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('fac-name')?.focus();
  }

  async function saveNewTeacher() {
    const name = document.getElementById('fac-name')?.value?.trim();
    if (!name) { Toast.warning('Required', 'Please enter faculty name.'); return; }
    const email = document.getElementById('fac-email')?.value?.trim() || '';
    const phone = document.getElementById('fac-phone')?.value?.trim() || '';
    const password = document.getElementById('fac-password')?.value?.trim() || 'teacher@123';

    try {
      const res = await API.request('/teachers', 'POST', { name, email, phone, password });
      Toast.success('Faculty Added!', `${name} added. Username: ${res.email}`);
      document.getElementById('fac-add-teacher-modal')?.remove();
      await loadTeachers();
      renderDirectoryTab();
    } catch (err) {
      Toast.error('Error', err.message);
    }
  }

  async function deleteTeacher(id, name) {
    if (!confirm(`Remove ${name} from faculty? This will also remove their login access.`)) return;
    try {
      await API.request(`/teachers/${id}`, 'DELETE');
      Toast.success('Removed', `${name} removed from faculty.`);
      await loadTeachers();
      renderDirectoryTab();
    } catch (err) {
      Toast.error('Error', err.message);
    }
  }

  // Expose public API
  return {
    renderFacultyPage,
    switchTab,
    onAssignTeacherChange,
    onNewAssignBoardChange,
    onNewAssignStandardChange,
    viewAssignments,
    addAssignment,
    removeAssignment,
    showAddTeacherModal,
    saveNewTeacher,
    deleteTeacher,
    exportCredentialsPDF,
    showEditTeacherModal: (id) => Toast.info('Coming Soon', 'Edit functionality will be added.'),
  };
})();

window.FacultyModule = FacultyModule;
