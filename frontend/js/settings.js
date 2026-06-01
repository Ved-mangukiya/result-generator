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
    </div>

    <div class="grid gap-6" style="grid-template-columns:1fr 1fr">
      <!-- Coaching Profile -->
      <div class="card">
        <div class="card-header">
          <h3>🏫 Coaching Profile</h3>
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
                  : `<span style="font-size:2rem">🏫</span>`}
              </div>
              <div>
                <label class="btn btn-outline btn-sm" style="cursor:pointer">
                  📷 Upload Logo
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
              <input type="color" class="form-control" id="s-color" value="${profile.primary_color || '#1a3a6b'}" style="width:60px;height:42px;cursor:pointer">
              <div class="color-swatch-grid" id="s-color-swatches">
                ${['#1a3a6b','#7c1d1d','#0f4c2e','#1a1a2e','#c17f24','#1a4a6b','#4a1a6b','#2d4a1a'].map(c => `
                  <div class="color-swatch ${profile.primary_color === c ? 'selected' : ''}" data-color="${c}" style="background:${c}" onclick="setProfileColor('${c}')"></div>`).join('')}
              </div>
            </div>
          </div>
          <button class="btn btn-primary w-full" onclick="saveCoachingProfile()">💾 Save Profile</button>
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
            <button class="btn btn-primary" onclick="changePassword()">🔑 Change Password</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>ℹ️ System Info</h3></div>
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
      </div>
    </div>`;
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

window.renderSettings = renderSettings;
window.setProfileColor = setProfileColor;
window.uploadLogo = uploadLogo;
window.saveCoachingProfile = saveCoachingProfile;
window.changePassword = changePassword;
