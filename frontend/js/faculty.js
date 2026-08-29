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
    if (typeof setPageTitle === 'function') {
      setPageTitle('Faculty Management', 'Faculty Management');
    }

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
    const safeUser = t.username || (t.email ? t.email.split('@')[0] : 'teacher');
    const safePass = t.plain_password || 'teacher123';
    const portalUrl = window.location.origin;

    return `
      <div class="card" style="padding:var(--space-5); position:relative; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-3);">
            <div style="width:44px;height:44px;background:linear-gradient(135deg,var(--navy),var(--primary));border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:1rem;flex-shrink:0;">
              ${initials}
            </div>
            <div style="overflow:hidden;">
              <div class="font-bold text-truncate" style="font-size:0.95rem;">${t.name}</div>
              <div class="text-muted text-xs text-truncate">${t.subjects_taught || 'General Faculty'}</div>
            </div>
          </div>

          <div style="background:rgba(0,0,0,0.03); padding:8px 10px; border-radius:8px; margin-bottom:12px; font-size:0.8rem; border:1px solid rgba(0,0,0,0.06);">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span class="text-muted">Username:</span>
              <span class="font-mono font-bold" style="color:var(--primary);">${safeUser}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="text-muted">Password:</span>
              <span class="font-mono font-bold" style="color:#10b981;">${safePass}</span>
            </div>
            ${t.phone ? `<div style="display:flex; justify-content:space-between; margin-top:4px;"><span class="text-muted">Phone:</span><span class="font-mono">${t.phone}</span></div>` : ''}
          </div>
        </div>

        <div style="display:flex; gap:6px; flex-wrap:wrap; border-top:1px solid var(--border); padding-top:10px; margin-top:auto;">
          <button class="btn btn-outline btn-sm" onclick="FacultyModule.showEditTeacherModal(${t.id})" title="Edit Faculty &amp; Credentials">
            ✏️ Edit
          </button>
          <button class="btn btn-outline btn-sm" onclick="FacultyModule.viewAssignments(${t.id}, '${t.name.replace(/'/g, "\\'")}')" title="Class Assignments">
            📚 Classes
          </button>
          <button class="btn btn-ghost btn-icon-sm" onclick="copyFacultyCredentialsToClipboard('${t.name.replace(/'/g, "\\'")}', '${safeUser}', '${t.email}', '${safePass}', '${portalUrl}')" title="Copy Login">
            📋
          </button>
          <button class="btn btn-ghost btn-icon-sm" onclick="shareFacultyCredentialsWhatsApp('${t.name.replace(/'/g, "\\'")}', '${safeUser}', '${t.email}', '${safePass}', '${t.phone || ''}', '${portalUrl}')" title="Share WhatsApp">
            📱
          </button>
          <button class="btn btn-ghost btn-icon-sm text-danger" onclick="FacultyModule.deleteTeacher(${t.id}, '${t.name.replace(/'/g, "\\'")}')" title="Delete Account" style="margin-left:auto;">
            🗑️
          </button>
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

  // ─── Credentials Tab (Live Inline Editable) ──────────────────────────────

  function renderCredentialsTab() {
    const el = document.getElementById('fac-tab-credentials');
    if (!el) return;

    if (_teachers.length === 0) {
      el.innerHTML = `<div class="empty-state"><h3>No Faculty Added Yet</h3></div>`;
      return;
    }

    const portalUrl = window.location.origin;

    el.innerHTML = `
      <div class="card p-6">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-4); flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="margin:0;">🔐 Faculty Login Credentials &amp; Real-time Manager</h3>
            <p class="text-xs text-muted" style="margin:0;">Edit usernames or passwords in real-time. Changes sync instantly with database.</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="FacultyModule.showAddTeacherModal()">➕ Add Faculty</button>
            <button class="btn btn-outline btn-sm" onclick="FacultyModule.exportCredentialsPDF()">📄 Export Credentials PDF</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table" style="vertical-align:middle;">
            <thead>
              <tr>
                <th style="min-width:170px;">Faculty Name</th>
                <th style="min-width:180px;">Login Username</th>
                <th style="min-width:180px;">Email Address</th>
                <th style="min-width:190px;">Portal Password</th>
                <th style="min-width:120px;">Phone</th>
                <th style="min-width:150px; text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${_teachers.map((t) => {
                const safePass = t.plain_password || 'teacher123';
                const safeUser = t.username || (t.email ? t.email.split('@')[0] : 'teacher');

                return `
                  <tr id="fac-row-mgr-${t.id}">
                    <td>
                      <div class="font-bold">${t.name}</div>
                      <div class="text-xs text-muted">${t.subjects_taught || 'Faculty'}</div>
                    </td>
                    <td>
                      <input type="text" class="form-control form-control-sm font-mono font-bold"
                        id="fac-mgr-user-${t.id}"
                        value="${safeUser}"
                        style="color:#38bdf8; background:rgba(0,0,0,0.04); border:1px solid #cbd5e1;"
                        onchange="FacultyModule.updateTeacherCredentialInline(${t.id}, 'username', this.value, this)"
                        title="Click to edit username. Auto-saves to database.">
                    </td>
                    <td>
                      <input type="email" class="form-control form-control-sm font-mono"
                        id="fac-mgr-email-${t.id}"
                        value="${t.email}"
                        style="background:rgba(0,0,0,0.04); border:1px solid #cbd5e1;"
                        onchange="FacultyModule.updateTeacherCredentialInline(${t.id}, 'email', this.value, this)"
                        title="Click to edit email. Auto-saves to database.">
                    </td>
                    <td>
                      <div style="position:relative; display:flex; align-items:center; gap:4px;">
                        <input type="password" class="form-control form-control-sm font-mono font-bold"
                          id="fac-mgr-pass-${t.id}"
                          value="${safePass}"
                          style="color:#10b981; background:rgba(0,0,0,0.04); border:1px solid #cbd5e1; padding-right:32px;"
                          onchange="FacultyModule.updateTeacherCredentialInline(${t.id}, 'password', this.value, this)"
                          title="Click to edit password. Auto-saves to database.">
                        <button type="button" class="btn btn-ghost btn-icon-sm" style="position:absolute; right:4px; opacity:0.65;"
                          onclick="togglePasswordVisibility('fac-mgr-pass-${t.id}', this)" title="Show/Hide Password">👁️</button>
                      </div>
                    </td>
                    <td>
                      <span class="font-mono text-sm">${t.phone || '—'}</span>
                    </td>
                    <td style="text-align:center;">
                      <div class="flex gap-1 justify-center items-center">
                        <button class="btn btn-outline btn-sm" onclick="FacultyModule.showEditTeacherModal(${t.id})" title="Full Edit">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-ghost btn-icon-sm" onclick="copyFacultyCredentialsToClipboard('${t.name.replace(/'/g, "\\'")}', document.getElementById('fac-mgr-user-${t.id}').value, document.getElementById('fac-mgr-email-${t.id}').value, document.getElementById('fac-mgr-pass-${t.id}').value, '${portalUrl}')" title="Copy Login">
                          📋
                        </button>
                        <button class="btn btn-ghost btn-icon-sm" onclick="shareFacultyCredentialsWhatsApp('${t.name.replace(/'/g, "\\'")}', document.getElementById('fac-mgr-user-${t.id}').value, document.getElementById('fac-mgr-email-${t.id}').value, document.getElementById('fac-mgr-pass-${t.id}').value, '${t.phone || ''}', '${portalUrl}')" title="Share WhatsApp">
                          📱
                        </button>
                        <button class="btn btn-ghost btn-icon-sm text-danger" onclick="FacultyModule.deleteTeacher(${t.id}, '${t.name.replace(/'/g, "\\'")}')" title="Delete Account">
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
      </div>`;
  }

  async function updateTeacherCredentialInline(teacherId, field, val, inputEl) {
    const userInp = document.getElementById(`fac-mgr-user-${teacherId}`);
    const emailInp = document.getElementById(`fac-mgr-email-${teacherId}`);
    const passInp = document.getElementById(`fac-mgr-pass-${teacherId}`);
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
      await loadTeachers();
      setTimeout(() => {
        if (inputEl) inputEl.style.borderColor = '#cbd5e1';
      }, 1500);
    } catch(err) {
      inputEl.style.borderColor = '#ef4444';
      Toast.error('Save Failed', err.message);
    }
  }

  function exportCredentialsPDF() {
    const printWin = window.open('', '_blank');
    if (!printWin) { Toast.error('Popup Blocked', 'Allow popups to view PDF.'); return; }

    printWin.document.write(`
      <!DOCTYPE html><html>
      <head><title>Faculty Credentials Roster</title>
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
          <thead><tr><th>#</th><th>Faculty Name</th><th>Login Username</th><th>Email</th><th>Portal Password</th></tr></thead>
          <tbody>
            ${_teachers.map((t, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${t.name}</strong></td>
                <td><span class="code" style="color:#0284c7;">${t.username || t.email.split('@')[0]}</span></td>
                <td>${t.email}</td>
                <td><span class="code" style="color:#16a34a;">${t.plain_password || 'teacher123'}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p style="margin-top:20px; font-size:11px; color:#94A3B8; text-align:center;">Generated ${new Date().toLocaleDateString()} — Confidential</p>
      </body></html>`);
    printWin.document.close();
  }

  // ─── Add / Edit Teacher Modals ────────────────────────────────────────────

  function showAddTeacherModal() {
    const existing = document.getElementById('fac-add-teacher-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'fac-add-teacher-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-md">
        <div class="modal-header">
          <h3>➕ Add Faculty Member</h3>
          <button class="modal-close" onclick="document.getElementById('fac-add-teacher-modal')?.remove()">✕</button>
        </div>
        <div class="modal-body">
          <form id="fac-add-form">
            <div class="form-group mb-3">
              <label class="form-label font-bold">Full Name <span class="required">*</span></label>
              <input type="text" id="fac-add-name" class="form-control" placeholder="e.g. Prof. Rajesh Sharma" required
                oninput="autoSuggestFacultyAddUser(this.value)">
            </div>
            <div class="form-grid mb-3" style="grid-template-columns: 1fr 1fr; gap:var(--space-3);">
              <div class="form-group">
                <label class="form-label font-bold">Login Username <span class="required">*</span></label>
                <input type="text" id="fac-add-username" class="form-control font-mono font-bold" placeholder="e.g. rajeshs" required>
              </div>
              <div class="form-group">
                <label class="form-label font-bold">Phone Number</label>
                <input type="tel" id="fac-add-phone" class="form-control" placeholder="+91 98XXXXXXXX">
              </div>
            </div>
            <div class="form-group mb-3">
              <label class="form-label font-bold">Email Address</label>
              <input type="email" id="fac-add-email" class="form-control" placeholder="rajesh@edutrack.local">
            </div>
            <div class="form-group mb-3">
              <label class="form-label font-bold">Assigned Classes / Standards</label>
              <input type="text" id="fac-add-standards" class="form-control" value="Class 10, Class 12" placeholder="e.g. Class 10, Class 12">
            </div>
            <div class="form-group mb-3">
              <label class="form-label font-bold">Subjects Taught</label>
              <input type="text" id="fac-add-subjects" class="form-control" value="Mathematics" placeholder="e.g. Mathematics, Physics">
            </div>
            <div class="form-group mb-4">
              <div class="flex justify-between items-center mb-1">
                <label class="form-label font-bold" style="margin:0;">Portal Login Password <span class="required">*</span></label>
                <button type="button" class="btn btn-ghost btn-xs text-primary" onclick="generateFacultyRandomPassword('fac-add-password')">
                  🎲 Generate Random
                </button>
              </div>
              <div style="position:relative; display:flex; align-items:center;">
                <input type="text" id="fac-add-password" class="form-control font-mono font-bold" value="teacher123" required style="padding-right:36px;">
                <button type="button" class="btn btn-ghost btn-icon-sm" style="position:absolute; right:4px;"
                  onclick="togglePasswordVisibility('fac-add-password', this)">👁️</button>
              </div>
            </div>
            <div class="modal-footer" style="padding-right:0; padding-left:0;">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('fac-add-teacher-modal')?.remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">➕ Create Faculty Account</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('fac-add-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('fac-add-name')?.value?.trim();
      const username = document.getElementById('fac-add-username')?.value?.trim();
      const email = document.getElementById('fac-add-email')?.value?.trim();
      const phone = document.getElementById('fac-add-phone')?.value?.trim();
      const assigned_standards = document.getElementById('fac-add-standards')?.value?.trim();
      const subjects_taught = document.getElementById('fac-add-subjects')?.value?.trim();
      const password = document.getElementById('fac-add-password')?.value?.trim() || 'teacher123';

      try {
        const res = await API.teachers.add({ name, username, email, phone, assigned_standards, subjects_taught, password });
        Toast.success('Faculty Created!', `${name} added. Login: ${res.username || username}`);
        document.getElementById('fac-add-teacher-modal')?.remove();
        await loadTeachers();
        renderDirectoryTab();
      } catch (err) {
        Toast.error('Creation Failed', err.message);
      }
    });
  }

  async function showEditTeacherModal(teacherId) {
    try {
      const teacher = await API.teachers.get(teacherId);
      if (!teacher) throw new Error('Faculty not found');

      const existing = document.getElementById('fac-edit-teacher-modal');
      if (existing) existing.remove();

      const safePass = teacher.plain_password || 'teacher123';
      const safeUser = teacher.username || (teacher.email ? teacher.email.split('@')[0] : 'teacher');

      const overlay = document.createElement('div');
      overlay.id = 'fac-edit-teacher-modal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal modal-md">
          <div class="modal-header">
            <h3>✏️ Edit Faculty &amp; Credentials — ${teacher.name}</h3>
            <button class="modal-close" onclick="document.getElementById('fac-edit-teacher-modal')?.remove()">✕</button>
          </div>
          <div class="modal-body">
            <form id="fac-edit-form">
              <div class="form-group mb-3">
                <label class="form-label font-bold">Full Name <span class="required">*</span></label>
                <input type="text" id="fac-edit-name" class="form-control" value="${teacher.name}" required>
              </div>
              <div class="form-grid mb-3" style="grid-template-columns: 1fr 1fr; gap:var(--space-3);">
                <div class="form-group">
                  <label class="form-label font-bold">Login Username <span class="required">*</span></label>
                  <input type="text" id="fac-edit-username" class="form-control font-mono font-bold" value="${safeUser}" required>
                </div>
                <div class="form-group">
                  <label class="form-label font-bold">Phone Number</label>
                  <input type="tel" id="fac-edit-phone" class="form-control" value="${teacher.phone || ''}">
                </div>
              </div>
              <div class="form-group mb-3">
                <label class="form-label font-bold">Email Address</label>
                <input type="email" id="fac-edit-email" class="form-control" value="${teacher.email}">
              </div>
              <div class="form-group mb-3">
                <label class="form-label font-bold">Assigned Classes / Standards</label>
                <input type="text" id="fac-edit-standards" class="form-control" value="${teacher.assigned_standards || 'All Classes'}">
              </div>
              <div class="form-group mb-3">
                <label class="form-label font-bold">Subjects Taught</label>
                <input type="text" id="fac-edit-subjects" class="form-control" value="${teacher.subjects_taught || ''}">
              </div>
              <div class="form-group mb-4">
                <div class="flex justify-between items-center mb-1">
                  <label class="form-label font-bold" style="margin:0;">Portal Login Password <span class="required">*</span></label>
                  <button type="button" class="btn btn-ghost btn-xs text-primary" onclick="generateFacultyRandomPassword('fac-edit-password')">
                    🎲 Generate Random
                  </button>
                </div>
                <div style="position:relative; display:flex; align-items:center;">
                  <input type="text" id="fac-edit-password" class="form-control font-mono font-bold" value="${safePass}" required style="padding-right:36px;">
                  <button type="button" class="btn btn-ghost btn-icon-sm" style="position:absolute; right:4px;"
                    onclick="togglePasswordVisibility('fac-edit-password', this)">👁️</button>
                </div>
              </div>
              <div class="modal-footer" style="padding-right:0; padding-left:0;">
                <button type="button" class="btn btn-outline" onclick="document.getElementById('fac-edit-teacher-modal')?.remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">💾 Save Changes</button>
              </div>
            </form>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      document.getElementById('fac-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('fac-edit-name')?.value?.trim();
        const username = document.getElementById('fac-edit-username')?.value?.trim();
        const email = document.getElementById('fac-edit-email')?.value?.trim();
        const phone = document.getElementById('fac-edit-phone')?.value?.trim();
        const assigned_standards = document.getElementById('fac-edit-standards')?.value?.trim();
        const subjects_taught = document.getElementById('fac-edit-subjects')?.value?.trim();
        const password = document.getElementById('fac-edit-password')?.value?.trim();

        try {
          await API.teachers.update(teacherId, { name, username, email, phone, assigned_standards, subjects_taught, password });
          Toast.success('Faculty Updated!', `Details updated for ${name}.`);
          document.getElementById('fac-edit-teacher-modal')?.remove();
          await loadTeachers();
          renderDirectoryTab();
          if (document.getElementById('fac-tab-credentials')?.style.display !== 'none') {
            renderCredentialsTab();
          }
        } catch (err) {
          Toast.error('Update Failed', err.message);
        }
      });
    } catch (err) {
      Toast.error('Load Failed', err.message);
    }
  }

  async function deleteTeacher(id, name) {
    if (!confirm(`Remove ${name} from faculty? This will also remove their login access.`)) return;
    try {
      await API.teachers.delete(id);
      Toast.success('Removed', `${name} removed from faculty.`);
      await loadTeachers();
      renderDirectoryTab();
      if (document.getElementById('fac-tab-credentials')?.style.display !== 'none') {
        renderCredentialsTab();
      }
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
    showEditTeacherModal,
    updateTeacherCredentialInline,
    deleteTeacher,
    exportCredentialsPDF,
  };
})();

function autoSuggestFacultyAddUser(name) {
  const userInp = document.getElementById('fac-add-username');
  const emailInp = document.getElementById('fac-add-email');
  if (!userInp || !name) return;
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.length > 0 && (!userInp.dataset.userEdited || userInp.dataset.userEdited === 'false')) {
    userInp.value = clean;
    if (emailInp && (!emailInp.value || emailInp.value.includes('@edutrack.local'))) {
      emailInp.value = `${clean}@edutrack.local`;
    }
  }
}
window.autoSuggestFacultyAddUser = autoSuggestFacultyAddUser;

window.FacultyModule = FacultyModule;
