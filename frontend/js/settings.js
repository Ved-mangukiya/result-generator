/* ═══════════════════════════════════════════════
   SETTINGS.JS — Coaching Profile & Admin Settings
   ═══════════════════════════════════════════════ */

async function renderSettings() {
  setPageTitle('Settings', 'Settings');
  
  const profile = await API.coaching.get().catch(() => ({}));
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Settings</h1>
        <p>Manage your coaching profile and account settings</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-accent btn-sm animate-pulse" onclick="startSettingsTour()" style="border: 1px solid var(--accent); box-shadow: 0 0 10px rgba(212, 175, 55, 0.3)">✨ Guided Walkthrough Tour</button>
      </div>
    </div>

    <div class="grid gap-6" style="grid-template-columns:1fr 1fr">
      <!-- Coaching Profile -->
      <div class="card">
        <div class="card-header">
          <h3>${Icons?.render?.('school',{size:18}) || ''} Coaching Profile</h3>
          <p class="text-xs text-muted">Appears on all result cards</p>
        </div>
        <div class="card-body">
          <!-- Logo -->
          <div class="form-group mb-6">
            <label class="form-label">Institute Logo</label>
            <div class="flex gap-4 items-center">
              <div id="logo-preview-wrap" style="width:80px;height:80px;border:2px dashed var(--border-medium);border-radius:var(--radius-lg);overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg-surface)">
                ${profile.logo_path
                  ? `<img src="/${profile.logo_path}" style="width:100%;height:100%;object-fit:contain;padding:4px" id="logo-img">`
                  : `${Icons?.render?.('school',{size:32}) || ''}`}
              </div>
              <div>
                <label class="btn btn-outline btn-sm" style="cursor:pointer">
                  ${Icons?.render?.('upload',{size:14}) || ''} Upload Logo
                  <input type="file" accept="image/*" style="display:none" onchange="uploadLogo(this)">
                </label>
                <p class="text-xs text-muted mt-2">PNG, JPG · Max 5MB</p>
              </div>
            </div>
          </div>

          <div class="form-group mb-4">
            <label class="form-label">Coaching Name <span class="required">*</span></label>
            <input type="text" class="form-control" id="s-name" value="${profile.name || ''}" placeholder="e.g. Sharma Classes">
          </div>
          <div class="form-group mb-4" id="setting-academic-year-group">
            <label class="form-label">Academic Year <span class="required">*</span></label>
            <select class="form-control" id="s-academic-year">
              <option value="2025-2026" ${profile.academic_year === '2025-2026' ? 'selected' : ''}>2025-2026</option>
              <option value="2026-2027" ${(!profile.academic_year || profile.academic_year === '2026-2027') ? 'selected' : ''}>2026-2027</option>
              <option value="2027-2028" ${profile.academic_year === '2027-2028' ? 'selected' : ''}>2027-2028</option>
              <option value="2028-2029" ${profile.academic_year === '2028-2029' ? 'selected' : ''}>2028-2029</option>
              <option value="2029-2030" ${profile.academic_year === '2029-2030' ? 'selected' : ''}>2029-2030</option>
            </select>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Tagline</label>
            <input type="text" class="form-control" id="s-tagline" value="${profile.tagline || ''}" placeholder="e.g. Excellence in Education">
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Address</label>
            <textarea class="form-control" id="s-address" rows="2">${profile.address || ''}</textarea>
          </div>
          <div class="form-grid mb-4">
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" class="form-control" id="s-phone" value="${profile.phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Website</label>
              <input type="url" class="form-control" id="s-website" value="${profile.website || ''}">
            </div>
          </div>
          <div class="form-group mb-6">
            <label class="form-label">Primary Brand Color</label>
            <div class="flex gap-3 items-center">
              <input type="color" class="form-control" id="s-color" value="${profile.primary_color || '#7a6130'}" style="width:60px;height:42px;cursor:pointer">
              <div class="color-swatch-grid" id="s-color-swatches">
                ${['#7a6130','#d4af37','#7c1d1d','#0f4c2e','#1a1a2e','#c17f24','#4a1a6b','#2d4a1a'].map(c => `
                  <div class="color-swatch ${(profile.primary_color || '#7a6130') === c ? 'selected' : ''}" data-color="${c}" style="background:${c}" onclick="setProfileColor('${c}')"></div>`).join('')}
              </div>
            </div>
          </div>
          
          <p class="form-section-title mt-4">Academic & Exam Structure</p>
          <div class="form-group mb-4">
            <label class="form-label">Weekly/Monthly Tests per Year</label>
            <input type="number" class="form-control" id="s-weekly-tests" value="${profile.weekly_tests_count ?? 40}" min="0" max="150">
          </div>
          <div class="form-group mb-4">
            <label class="toggle-group">
              <label class="toggle"><input type="checkbox" id="s-has-midsem" ${profile.has_midsem !== 0 ? 'checked' : ''}><span class="toggle-slider"></span></label>
              <span class="toggle-label">Conduct Semester 1 / Midterm Exam</span>
            </label>
          </div>
          <div class="form-group mb-4">
            <label class="toggle-group">
              <label class="toggle"><input type="checkbox" id="s-has-final" ${profile.has_final !== 0 ? 'checked' : ''}><span class="toggle-slider"></span></label>
              <span class="toggle-label">Conduct Semester 2 / Final Exam</span>
            </label>
          </div>
          
          <div class="form-grid mb-4">
            <div class="form-group">
              <label class="form-label">Default Exam Mode</label>
              <select id="s-exam-mode-default" class="form-control">
                <option value="Offline" ${(profile.exam_mode_default || 'Offline') === 'Offline' ? 'selected' : ''}>Offline (Written/Paper-based)</option>
                <option value="Online" ${profile.exam_mode_default === 'Online' ? 'selected' : ''}>Online Portal</option>
                <option value="Hybrid" ${profile.exam_mode_default === 'Hybrid' ? 'selected' : ''}>Hybrid (OMR + Viva)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Passing Percentage (%)</label>
              <input type="number" id="s-passing-percentage" class="form-control" value="${profile.passing_percentage ?? 33}" min="10" max="100">
            </div>
          </div>
          <div class="form-grid mb-4">
            <div class="form-group">
              <label class="form-label">Default Grading Scale Format</label>
              <select id="s-grading-format" class="form-control">
                <option value="State Scale" ${(profile.grading_format || 'State Scale') === 'State Scale' ? 'selected' : ''}>State Board Scale (A, B, C, D, Fail)</option>
                <option value="CBSE Scale" ${profile.grading_format === 'CBSE Scale' ? 'selected' : ''}>CBSE Style (A1, A2, B1, B2...)</option>
                <option value="Percentage Only" ${profile.grading_format === 'Percentage Only' ? 'selected' : ''}>Percentage & Pass/Fail Status Only</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Evaluation Style</label>
              <select id="s-eval-style" class="form-control">
                <option value="Manual" ${(profile.eval_style || 'Manual') === 'Manual' ? 'selected' : ''}>Manual Grading by Faculty</option>
                <option value="OMR" ${profile.eval_style === 'OMR' ? 'selected' : ''}>OMR Optical Scan Grading</option>
                <option value="Online Auto" ${profile.eval_style === 'Online Auto' ? 'selected' : ''}>Online Auto-Evaluation</option>
              </select>
            </div>
          </div>
          <div class="form-group mb-4">
            <label class="form-label font-bold">Attendance Tracking Mode</label>
            <select id="s-attendance-mode" class="form-control">
              <option value="Daily" ${(profile.attendance_mode || 'Daily') === 'Daily' ? 'selected' : ''}>🌅 Daily (Taken once at start of day)</option>
              <option value="Lecture" ${profile.attendance_mode === 'Lecture' ? 'selected' : ''}>📚 Lecture-wise (Taken per subject/lecture)</option>
            </select>
            <span class="form-hint">Choose how faculty will mark student attendance.</span>
          </div>

          <div class="form-group mb-6">
            <label class="form-label">Notice Schedule Lead Time (Days in Advance)</label>
            <input type="number" id="s-notice-lead-days" class="form-control" value="${profile.notice_lead_days ?? 3}" min="1" max="30">
          </div>

          <p class="form-section-title mt-4">Signatory Details (for Result Cards &amp; Notices)</p>
          <div class="form-grid mb-4">
            <div class="form-group">
              <label class="form-label">Signatory Name</label>
              <input type="text" class="form-control" id="s-signatory-name" value="${profile.signatory_name || ''}" placeholder="e.g. Sharma Sir">
            </div>
            <div class="form-group">
              <label class="form-label">Designation / Title (e.g. Principal)</label>
              <input type="text" class="form-control" id="s-signatory-title" value="${profile.signatory_title || 'Director'}" placeholder="e.g. Principal, Director">
            </div>
          </div>
          <div class="form-group mb-6">
            <label class="form-label">Signature Image</label>
            <div class="flex gap-4 items-center">
              <div id="sig-preview-wrap" style="width:160px;height:60px;border:2px dashed var(--border-medium);border-radius:var(--radius-lg);overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg-surface)">
                ${profile.signature_path
                  ? `<img src="/${profile.signature_path}?t=${Date.now()}" style="width:100%;height:100%;object-fit:contain;padding:4px" id="sig-img">`
                  : `<span style="font-size:0.75rem;color:var(--text-muted);text-align:center">No signature<br>uploaded</span>`}
              </div>
              <div>
                <label class="btn btn-outline btn-sm" style="cursor:pointer">
                  ${Icons?.render?.('edit',{size:14}) || ''} Upload Signature
                  <input type="file" accept="image/*" style="display:none" onchange="uploadSignatureImg(this)">
                </label>
                <p class="text-xs text-muted mt-2">PNG with transparent background recommended · Max 5MB</p>
              </div>
            </div>
          </div>
          
          <button class="btn btn-primary w-full" onclick="saveCoachingProfile()">${Icons?.render?.('save',{size:14}) || ''} Save Profile</button>
        </div>
      </div>

      <!-- Account Settings -->
      <div>
        <div class="card mb-4">
          <div class="card-header"><h3>🔐 Change Password</h3></div>
          <div class="card-body">
            <div class="form-group mb-4">
              <label class="form-label">Current Password</label>
              <input type="password" class="form-control" id="s-curr-pass" placeholder="Current password">
            </div>
            <div class="form-group mb-4">
              <label class="form-label">New Password</label>
              <input type="password" class="form-control" id="s-new-pass" placeholder="New password (min 6 chars)">
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Confirm New Password</label>
              <input type="password" class="form-control" id="s-confirm-pass" placeholder="Repeat new password">
            </div>
            <button class="btn btn-primary" onclick="changePassword()">${Icons?.render?.('settings',{size:14}) || ''} Change Password</button>
          </div>
        </div>

        <div class="card mb-4" id="sync-settings-card">
          <div class="card-header">
            <h3>${Icons?.render?.('refresh',{size:18}) || ''} Cloud Synchronization &amp; Backups</h3>
            <p class="text-xs text-muted">Keep your website data securely synced or backed up</p>
          </div>
          <div class="card-body">
            <p class="text-xs text-muted mb-4">
              Export your entire coaching database (admissions, classes, timetables, and grades) as a single JSON file. You can store this backup on Google Drive or import it to sync data across hosting servers.
            </p>
            
            <div style="display:flex; flex-direction:column; gap:10px" class="mb-4">
              <button class="btn btn-outline w-full flex items-center justify-center gap-2" onclick="performCloudSyncExport()">
                ${Icons?.render?.('download',{size:14}) || ''} Export &amp; Download Backup JSON
              </button>
              
              <label class="btn btn-outline w-full flex items-center justify-center gap-2" style="cursor:pointer; margin-bottom:0">
                ${Icons?.render?.('upload',{size:14}) || ''} Upload &amp; Restore Backup JSON
                <input type="file" accept=".json" style="display:none" onchange="performCloudSyncImport(this)">
              </label>
            </div>
            
            <div style="background:rgba(37, 99, 235, 0.06); border-left:3px solid var(--primary-light); padding:10px; border-radius:var(--radius);" class="text-xs text-secondary">
              💡 <strong>Google Drive Automations:</strong> To sync automatically with Google Drive, link a custom client-side OAuth script. You can trigger backup saves dynamically on every database transaction.
            </div>
          </div>
        </div>

        <div class="card mb-4" id="graduation-center-card">
          <div class="card-header">
            <h3>🎓 Class Graduation Center</h3>
            <p class="text-xs text-muted">Graduate students in bulk at the end of the academic year</p>
          </div>
          <div class="card-body">
            <p class="text-xs text-muted mb-4">
              When the academic year ends, you can graduate all active students of a specific class (standard) or all classes at once. This updates their status to 'Completed', excluding them from active lists and dashboard statistics, while preserving historical marks and fee records.
            </p>
            <div class="form-group mb-4">
              <label class="form-label" style="font-weight:600">Select Class to Graduate</label>
              <select class="form-control" id="grad-bulk-std-select">
                <option value="all">🎓 All Classes / Standards</option>
              </select>
            </div>
            <button class="btn btn-primary w-full flex items-center justify-center gap-2" onclick="performBulkGraduation()">
              🎓 Graduate Selected Class Students
            </button>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header"><h3>${Icons?.render?.('info',{size:18}) || ''} System Info</h3></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:var(--space-3)">
              <div class="flex justify-between">
                <span class="text-secondary text-sm">Version</span>
                <span class="text-sm font-semibold">1.0.0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary text-sm">Database</span>
                <span class="text-sm font-semibold">SQLite (local)</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary text-sm">PDF Engine</span>
                <span class="text-sm font-semibold">Puppeteer</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary text-sm">Default Login</span>
                <span class="text-sm text-muted">admin@result.local / admin123</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>${Icons?.render?.('delete',{size:18}) || ''} Reset Data Center</h3></div>
          <div class="card-body">
            <p class="text-xs text-muted mb-4">Select categories to clear from the database. This action is permanent and cannot be undone.</p>
            
            <div style="display:flex; flex-direction:column; gap:8px" class="mb-4">
              <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer">
                <input type="checkbox" id="reset-test-marks" style="cursor:pointer"> <span>Delete only small test marks/scores</span>
              </label>
              <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer">
                <input type="checkbox" id="reset-tests" style="cursor:pointer"> <span>Delete all small tests & cycles</span>
              </label>
              <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer">
                <input type="checkbox" id="reset-exam-marks" style="cursor:pointer"> <span>Delete all semester exam marks</span>
              </label>
              <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer">
                <input type="checkbox" id="reset-students" style="cursor:pointer"> <span>Delete all students, fee logs, and marks</span>
              </label>
              <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer">
                <input type="checkbox" id="reset-standards" style="cursor:pointer"> <span>Delete all classes, subjects, and data</span>
              </label>
            </div>
            
            <div class="flex gap-2">
              <button class="btn btn-outline btn-sm" onclick="performSelectiveReset()">Perform Selective Reset</button>
              <button class="btn btn-danger btn-sm" onclick="showMasterResetWarning()">${Icons?.render?.('warning',{size:14}) || ''} Master Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  loadGraduationStandardsDropdown().catch(() => {});
}

function setProfileColor(color) {
  document.getElementById('s-color').value = color;
  $$('#s-color-swatches .color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === color);
  });
}

async function uploadLogo(input) {
  const file = input.files[0];
  if (!file) return;
  
  const form = new FormData();
  form.append('logo', file);
  
  try {
    const result = await API.upload.logo(form);
    const wrap = document.getElementById('logo-preview-wrap');
    wrap.innerHTML = `<img src="${result.url}?t=${Date.now()}" style="width:100%;height:100%;object-fit:contain;padding:4px" id="logo-img">`;
    
    // Update sidebar
    const sidebarThumb = document.getElementById('sidebar-logo-thumb');
    sidebarThumb.innerHTML = `<img src="${result.url}?t=${Date.now()}" alt="Logo">`;
    
    Toast.success('Logo Uploaded', 'Your logo will appear on all result cards.');
  } catch (err) {
    Toast.error('Upload Failed', err.message);
  }
}

async function saveCoachingProfile() {
  const name = getVal('s-name');
  if (!name) { Toast.error('Required', 'Coaching name is required.'); return; }
  
  try {
    await API.coaching.update({
      name,
      tagline: getVal('s-tagline'),
      address: getVal('s-address'),
      phone: getVal('s-phone'),
      website: getVal('s-website'),
      primary_color: document.getElementById('s-color').value,
      weekly_tests_count: parseInt(getVal('s-weekly-tests')) || 40,
      has_midsem: document.getElementById('s-has-midsem').checked ? 1 : 0,
      has_final: document.getElementById('s-has-final').checked ? 1 : 0,
      signatory_name: getVal('s-signatory-name'),
      signatory_title: getVal('s-signatory-title'),
      exam_mode_default: document.getElementById('s-exam-mode-default').value,
      passing_percentage: parseInt(getVal('s-passing-percentage')) || 33,
      grading_format: document.getElementById('s-grading-format').value,
      eval_style: document.getElementById('s-eval-style').value,
      notice_lead_days: parseInt(getVal('s-notice-lead-days')) || 3,
      attendance_mode: document.getElementById('s-attendance-mode').value,
      academic_year: document.getElementById('s-academic-year').value,
      onboarding_complete: true
    });
    
    document.getElementById('sidebar-coaching-name').textContent = name;
    Toast.success('Profile Saved', 'Coaching profile updated successfully.');
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

async function changePassword() {
  const curr = getVal('s-curr-pass');
  const newPass = getVal('s-new-pass');
  const confirm = getVal('s-confirm-pass');
  
  if (!curr || !newPass || !confirm) { Toast.error('Required', 'All password fields are required.'); return; }
  if (newPass !== confirm) { Toast.error('Mismatch', 'New passwords do not match.'); return; }
  if (newPass.length < 6) { Toast.error('Too Short', 'Password must be at least 6 characters.'); return; }
  
  try {
    await API.auth.changePassword(curr, newPass);
    setVal('s-curr-pass', '');
    setVal('s-new-pass', '');
    setVal('s-confirm-pass', '');
    Toast.success('Password Changed', 'Your password has been updated.');
  } catch (err) {
    Toast.error('Change Failed', err.message);
  }
}

async function uploadSignatureImg(input) {
  const file = input.files[0];
  if (!file) return;
  
  const processedFile = await makeImageBackgroundless(file);
  
  const form = new FormData();
  form.append('signature', processedFile);
  
  try {
    const result = await API.upload.signature(form);
    const wrap = document.getElementById('sig-preview-wrap');
    wrap.innerHTML = `<img src="${result.url}?t=${Date.now()}" style="width:100%;height:100%;object-fit:contain;padding:4px" id="sig-img">`;
    Toast.success('Signature Uploaded', 'Signature image saved with background removed. It will appear on all result cards and notices.');
  } catch (err) {
    Toast.error('Upload Failed', err.message);
  }
}

let _masterResetTimer = null;
function showMasterResetWarning() {
  let seconds = 10;
  
  createModal('master-reset-warning-modal', `${Icons?.render?.('warning',{size:18}) || ''} DANGER: Master Factory Reset`,
    `<div style="text-align:center; padding: var(--space-4)">
      <div style="font-size:3rem">${Icons?.render?.('warning',{size:48}) || ''}</div>
      <h3 style="color:var(--danger); margin-top:var(--space-2); font-weight:800">You are about to delete ALL data!</h3>
      <p style="color:var(--text-secondary); margin-top:var(--space-3); line-height:1.6">
        This will permanently erase all boards, classes, subjects, students, marks, fee transactions, and logs. Your session will be terminated and you must re-onboard.
      </p>
      <div style="font-size:2rem; font-weight:800; color:var(--danger); margin: var(--space-6) 0" id="master-reset-countdown">10</div>
      <p class="text-xs text-muted">Please wait for the warning countdown to complete before erasing.</p>
     </div>`,
     `<button class="btn btn-outline" onclick="cancelMasterReset()">Cancel</button>
      <button class="btn btn-danger" id="master-reset-confirm-btn" disabled onclick="executeMasterReset()">Erase All Data (10s)</button>`,
     'modal-md'
  );
  
  const confirmBtn = document.getElementById('master-reset-confirm-btn');
  const countdownEl = document.getElementById('master-reset-countdown');
  
  if (_masterResetTimer) clearInterval(_masterResetTimer);
  
  _masterResetTimer = setInterval(() => {
    seconds--;
    if (countdownEl) countdownEl.textContent = seconds;
    if (confirmBtn) confirmBtn.textContent = `Erase All Data (${seconds}s)`;
    
    if (seconds <= 0) {
      clearInterval(_masterResetTimer);
      _masterResetTimer = null;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '🔥 Erase All Data Now';
      }
    }
  }, 1000);
}

function cancelMasterReset() {
  if (_masterResetTimer) {
    clearInterval(_masterResetTimer);
    _masterResetTimer = null;
  }
  closeModal('master-reset-warning-modal');
}

async function executeMasterReset() {
  closeModal('master-reset-warning-modal');
  Spinner.show('Performing master factory reset...');
  try {
    const res = await API.reset.execute(['all']);
    Spinner.hide();
    Toast.success('Factory Reset Complete', 'All data has been erased successfully.');
    // Logout and redirect to login
    await API.auth.logout();
    window.location.reload();
  } catch (err) {
    Spinner.hide();
    Toast.error('Reset Failed', err.message);
  }
}

async function performSelectiveReset() {
  const categories = [];
  if (document.getElementById('reset-test-marks')?.checked) categories.push('test_marks');
  if (document.getElementById('reset-tests')?.checked) categories.push('tests');
  if (document.getElementById('reset-exam-marks')?.checked) categories.push('exam_marks');
  if (document.getElementById('reset-students')?.checked) categories.push('students');
  if (document.getElementById('reset-standards')?.checked) categories.push('standards');
  
  if (categories.length === 0) {
    Toast.warning('Select Options', 'Please check at least one category to reset.');
    return;
  }
  
  const ok = await Confirm.show('Perform Selective Reset?', 
    `You are about to delete data for: ${categories.join(', ')}. This cannot be undone.`, 
    'Delete Selected Data', 'btn-danger');
  if (!ok) return;
  
  Spinner.show('Deleting selected records...');
  try {
    const res = await API.reset.execute(categories);
    Spinner.hide();
    Toast.success('Reset Complete', res.message || 'Selected categories cleared.');
    // Uncheck boxes
    categories.forEach(c => {
      const el = document.getElementById(`reset-${c.replace('_', '-')}`);
      if (el) el.checked = false;
    });
  } catch (err) {
    Spinner.hide();
    Toast.error('Reset Failed', err.message);
  }
}

async function performCloudSyncExport() {
  Spinner.show('Compiling backup JSON...');
  try {
    const data = await API.sync.export();
    Spinner.hide();
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href",     dataStr);
    dlAnchorElem.setAttribute("download", `apex_tuition_sync_backup_${Date.now()}.json`);
    dlAnchorElem.click();
    
    Toast.success('Export Successful', 'Database JSON backup downloaded.');
  } catch (err) {
    Spinner.hide();
    Toast.error('Export Failed', err.message);
  }
}

async function performCloudSyncImport(input) {
  const file = input.files[0];
  if (!file) return;
  
  const ok = await Confirm.show('Restore Database Backup?', 
    'This will wipe your current database completely and replace all tables with the data in this backup file. Are you sure?', 
    'Restore Backup', 'btn-danger');
  
  if (!ok) {
    input.value = '';
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    Spinner.show('Restoring and syncing database...');
    try {
      const data = JSON.parse(e.target.result);
      await API.sync.import(data);
      Spinner.hide();
      Toast.success('Database Synced', 'Backup restored successfully.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      Spinner.hide();
      Toast.error('Sync Failed', 'Invalid backup file format or error: ' + err.message);
    }
  };
  reader.readAsText(file);
}

window.renderSettings = renderSettings;
window.setProfileColor = setProfileColor;
window.uploadLogo = uploadLogo;
window.uploadSignatureImg = uploadSignatureImg;
window.saveCoachingProfile = saveCoachingProfile;
window.changePassword = changePassword;
window.performSelectiveReset = performSelectiveReset;
window.showMasterResetWarning = showMasterResetWarning;
window.cancelMasterReset = cancelMasterReset;
window.executeMasterReset = executeMasterReset;
window.performCloudSyncExport = performCloudSyncExport;
window.performCloudSyncImport = performCloudSyncImport;

// ─── Bulk Graduation Helpers ──────────────────────
async function loadGraduationStandardsDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('grad-bulk-std-select');
    if (!sel) return;
    sel.innerHTML = '<option value="all">🎓 All Classes / Standards</option>';
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

async function performBulkGraduation() {
  const stdSelect = document.getElementById('grad-bulk-std-select');
  if (!stdSelect) return;
  const stdId = stdSelect.value;
  const stdText = stdSelect.options[stdSelect.selectedIndex].textContent;

  const confirmMsg = stdId === 'all'
    ? 'Are you sure you want to graduate ALL active students across all classes? This is typically done at the end of an academic year.'
    : `Are you sure you want to graduate all active students in ${stdText}?`;

  const ok = await Confirm.show('Confirm Bulk Graduation?', confirmMsg, 'Graduate Students', 'btn-primary', Icons?.render?.('school',{size:28}) || '');
  if (!ok) return;

  Spinner.show('Graduating students...');
  try {
    const res = await API.students.graduateBulk(stdId);
    Spinner.hide();
    Toast.success('Graduation Completed', `Successfully graduated ${res.count} student(s).`);
  } catch (err) {
    Spinner.hide();
    Toast.error('Graduation Failed', err.message);
  }
}

window.loadGraduationStandardsDropdown = loadGraduationStandardsDropdown;
window.performBulkGraduation = performBulkGraduation;

// ─── Guided Walkthrough Tour ──────────────────────
let _currentGlobalTourStep = 0;
const globalTourSteps = [
  {
    page: 'dashboard',
    element: '.page-header',
    title: '📊 Welcome to Apex Tuition ERP!',
    content: 'This is your main dashboard. Here you can view active enrollment numbers, fee collection statistics, and upcoming test schedules at a single glance.'
  },
  {
    page: 'boards',
    element: '.page-header',
    title: '📋 Class & Board Management',
    content: 'Manage school boards (GSEB, CBSE) and standards/classes. Configure streams, subjects, and grade scales here.'
  },
  {
    page: 'students',
    element: '#btn-tab-directory',
    title: '👥 Admissions & Student Profiles',
    content: 'Manage active student records, view detailed profiles, or perform Direct Excel-like Grid admissions. Graduated students are kept safe in historical records.'
  },
  {
    page: 'tests',
    element: '#tests-tabs',
    title: '📝 Test Scheduler & Marks Entry',
    content: 'Schedule weekly unit tests or grouped cycle exams. Teachers can enter student marks in a rapid Excel-like spreadsheet editor.'
  },
  {
    page: 'results',
    element: '.page-header',
    title: '🏆 Report Cards & Results',
    content: 'Generate individual and bulk A4-formatted progress report cards. Customize templates with school colors, rankings, and digital signatures.'
  },
  {
    page: 'settings',
    element: '.page-header',
    title: '⚙️ Settings Control Center',
    content: 'Configure academic years, logo, and digital signatures. You can also export/import backups and trigger bulk student graduation.'
  }
];

async function startGlobalTour() {
  _currentGlobalTourStep = 0;
  await showGlobalTourStep(0);
}

async function showGlobalTourStep(stepIdx) {
  const existingOverlay = document.getElementById('tour-overlay');
  const existingPopover = document.getElementById('tour-popover');
  if (existingOverlay) existingOverlay.remove();
  if (existingPopover) existingPopover.remove();
  
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  
  if (stepIdx < 0 || stepIdx >= globalTourSteps.length) {
    Toast.success('Tour Completed', 'You have successfully explored all key modules of Apex Tuition ERP! 🎓');
    Router.navigate('settings');
    return;
  }
  
  _currentGlobalTourStep = stepIdx;
  const step = globalTourSteps[stepIdx];
  
  if (Router.current !== step.page) {
    Router.navigate(step.page);
  }
  
  let targetEl = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    targetEl = document.querySelector(step.element);
    if (targetEl && targetEl.offsetHeight > 0) break;
    await new Promise(r => setTimeout(r, 100));
  }
  
  if (!targetEl) {
    targetEl = document.querySelector('.page-header') || document.body;
  }
  
  targetEl.classList.add('tour-highlight');
  
  const overlay = document.createElement('div');
  overlay.id = 'tour-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 9999998;
    pointer-events: all;
  `;
  overlay.onclick = endGlobalTour;
  document.body.appendChild(overlay);
  
  const rect = targetEl.getBoundingClientRect();
  
  const popover = document.createElement('div');
  popover.id = 'tour-popover';
  popover.className = 'card';
  popover.style.cssText = `
    position: fixed;
    z-index: 9999999;
    width: 330px;
    background: var(--bg-elevated);
    border: 2px solid var(--accent);
    box-shadow: var(--shadow-xl), 0 0 25px rgba(212, 175, 55, 0.25);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    transition: all 0.25s ease;
  `;
  
  popover.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2)">
      <strong style="color:var(--accent); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em">Module ${stepIdx + 1} of ${globalTourSteps.length}</strong>
      <button onclick="endGlobalTour()" class="btn-ghost btn-icon-sm" style="border:none; cursor:pointer" title="Skip tour">✕</button>
    </div>
    <h4 style="font-weight:700; margin-bottom:var(--space-2); color:var(--text-primary); font-size:0.95rem">${step.title}</h4>
    <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.55; margin-bottom:var(--space-4)">${step.content}</p>
    <div style="display:flex; justify-content:space-between; align-items:center">
      <button onclick="endGlobalTour()" class="btn btn-ghost btn-sm" style="padding:var(--space-1) var(--space-2); font-size:0.75rem">Skip Tour</button>
      <div class="flex gap-2">
        ${stepIdx > 0 ? `<button onclick="showGlobalTourStep(${stepIdx - 1})" class="btn btn-outline btn-sm">← Back</button>` : ''}
        <button onclick="showGlobalTourStep(${stepIdx + 1})" class="btn btn-primary btn-sm">${stepIdx === globalTourSteps.length - 1 ? '🏁 Finish' : 'Next →'}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(popover);
  
  const popoverHeight = popover.offsetHeight || 180;
  const popoverWidth = 330;
  
  let top = rect.bottom + 12;
  let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
  
  if (top + popoverHeight > window.innerHeight) {
    top = rect.top - popoverHeight - 12;
  }
  if (top < 0) top = 20;
  
  if (left + popoverWidth > window.innerWidth) {
    left = window.innerWidth - popoverWidth - 20;
  }
  if (left < 0) left = 20;
  
  popover.style.top = top + 'px';
  popover.style.left = left + 'px';
  
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function endGlobalTour() {
  const existingOverlay = document.getElementById('tour-overlay');
  const existingPopover = document.getElementById('tour-popover');
  if (existingOverlay) existingOverlay.remove();
  if (existingPopover) existingPopover.remove();
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
}

window.startGlobalTour = startGlobalTour;
window.startSettingsTour = startGlobalTour;
window.showGlobalTourStep = showGlobalTourStep;
window.showTourStep = showGlobalTourStep;
window.endGlobalTour = endGlobalTour;
window.endSettingsTour = endGlobalTour;
