let _activeSettingsTab = 'general';

async function renderSettings() {
  setPageTitle('Settings', 'Settings');
  
  const profile = await API.coaching.get().catch(() => ({}));
  window._currentCoachingProfile = profile;
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Settings &amp; Preferences</h1>
        <p>Manage institute profile, appearance, multilingual localization, academic policies, and data backups.</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-accent btn-sm animate-pulse" onclick="startSettingsTour()" style="border: 1px solid var(--accent); box-shadow: 0 0 10px rgba(212, 175, 55, 0.3)">✨ Guided Walkthrough Tour</button>
      </div>
    </div>

    <!-- Settings Tabs -->
    <div class="tabs mb-6" style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn ${_activeSettingsTab === 'general' ? 'btn-primary' : 'btn-outline'} btn-sm" id="stab-general" onclick="switchSettingsTab('general')">
        🏢 General Profile
      </button>
      <button class="btn ${_activeSettingsTab === 'appearance' ? 'btn-primary' : 'btn-outline'} btn-sm" id="stab-appearance" onclick="switchSettingsTab('appearance')">
        🎨 Appearance &amp; Themes
      </button>
      <button class="btn ${_activeSettingsTab === 'language' ? 'btn-primary' : 'btn-outline'} btn-sm" id="stab-language" onclick="switchSettingsTab('language')">
        🌐 Language (${(localStorage.getItem('app_language') || 'en').toUpperCase()})
      </button>
      <button class="btn ${_activeSettingsTab === 'academic' ? 'btn-primary' : 'btn-outline'} btn-sm" id="stab-academic" onclick="switchSettingsTab('academic')">
        🎓 Academic &amp; Exams
      </button>
      <button class="btn ${_activeSettingsTab === 'notices' ? 'btn-primary' : 'btn-outline'} btn-sm" id="stab-notices" onclick="switchSettingsTab('notices')">
        📢 Notices &amp; PDF
      </button>
      <button class="btn ${_activeSettingsTab === 'data' ? 'btn-primary' : 'btn-outline'} btn-sm" id="stab-data" onclick="switchSettingsTab('data')">
        💾 Data &amp; Backups
      </button>
      <button class="btn ${_activeSettingsTab === 'security' ? 'btn-primary' : 'btn-outline'} btn-sm" id="stab-security" onclick="switchSettingsTab('security')">
        🔐 Security &amp; Info
      </button>
    </div>

    <!-- Tab Panels Container -->
    <div id="settings-tab-panel">
      <!-- Injected by switchSettingsTab -->
    </div>
  `;

  renderSettingsPanelContent(profile);
  loadGraduationStandardsDropdown().catch(() => {});
}

function switchSettingsTab(tab) {
  _activeSettingsTab = tab;
  ['general','appearance','language','academic','notices','data','security'].forEach(t => {
    const btn = document.getElementById(`stab-${t}`);
    if (btn) btn.className = `btn ${t === tab ? 'btn-primary' : 'btn-outline'} btn-sm`;
  });
  renderSettingsPanelContent(window._currentCoachingProfile || {});
}

function renderSettingsPanelContent(profile) {
  const panel = document.getElementById('settings-tab-panel');
  if (!panel) return;

  if (_activeSettingsTab === 'general') {
    panel.innerHTML = `
      <div class="card" style="max-width:850px;">
        <div class="card-header">
          <h3>🏢 Coaching Institute Profile</h3>
          <p class="text-xs text-muted">This information appears on all generated result cards, notices, and official documents.</p>
        </div>
        <div class="card-body">
          <!-- Logo -->
          <div class="form-group mb-6">
            <label class="form-label font-bold">Institute Logo</label>
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
                <p class="text-xs text-muted mt-2">PNG, JPG or WebP · Max 5MB</p>
              </div>
            </div>
          </div>

          <div class="form-grid mb-4">
            <div class="form-group">
              <label class="form-label font-bold">Coaching / School Name <span class="required">*</span></label>
              <input type="text" class="form-control" id="s-name" value="${profile.name || ''}" placeholder="e.g. Apex Tuition Classes">
            </div>
            <div class="form-group" id="setting-academic-year-group">
              <label class="form-label font-bold">Academic Year <span class="required">*</span></label>
              <select class="form-control" id="s-academic-year">
                <option value="2025-2026" ${profile.academic_year === '2025-2026' ? 'selected' : ''}>2025-2026</option>
                <option value="2026-2027" ${(!profile.academic_year || profile.academic_year === '2026-2027') ? 'selected' : ''}>2026-2027 (Current)</option>
                <option value="2027-2028" ${profile.academic_year === '2027-2028' ? 'selected' : ''}>2027-2028</option>
                <option value="2028-2029" ${profile.academic_year === '2028-2029' ? 'selected' : ''}>2028-2029</option>
              </select>
            </div>
          </div>

          <div class="form-group mb-4">
            <label class="form-label font-bold">Motto / Tagline</label>
            <input type="text" class="form-control" id="s-tagline" value="${profile.tagline || ''}" placeholder="e.g. Excellence in Education · Shaping Bright Futures">
          </div>

          <div class="form-group mb-4">
            <label class="form-label font-bold">Complete Institute Address</label>
            <textarea class="form-control" id="s-address" rows="2" placeholder="Full postal address with pincode">${profile.address || ''}</textarea>
          </div>

          <div class="form-grid mb-6">
            <div class="form-group">
              <label class="form-label font-bold">Contact Phone</label>
              <input type="tel" class="form-control" id="s-phone" value="${profile.phone || ''}" placeholder="+91 98765 43210">
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Official Website / Portal</label>
              <input type="url" class="form-control" id="s-website" value="${profile.website || ''}" placeholder="https://apexcoaching.edu">
            </div>
          </div>

          <button class="btn btn-primary" onclick="saveCoachingProfile()">${Icons?.render?.('save',{size:16}) || ''} Save Profile Changes</button>
        </div>
      </div>
    `;
  } else if (_activeSettingsTab === 'appearance') {
    panel.innerHTML = `
      <div class="card" style="max-width:850px;">
        <div class="card-header">
          <h3>🎨 Appearance &amp; Brand Styling</h3>
          <p class="text-xs text-muted">Customize the visual colors and theme of the admin portal.</p>
        </div>
        <div class="card-body">
          <div class="form-group mb-6">
            <label class="form-label font-bold">Primary Brand Color</label>
            <div class="flex gap-4 items-center mb-3">
              <input type="color" class="form-control" id="s-color" value="${profile.primary_color || '#7a6130'}" style="width:60px;height:42px;cursor:pointer">
              <span class="text-sm font-mono text-muted" id="s-color-hex">${profile.primary_color || '#7a6130'}</span>
            </div>
            <div class="color-swatch-grid" id="s-color-swatches">
              ${['#7a6130','#d4af37','#1e3a8a','#0f766e','#7c1d1d','#1a1a2e','#c17f24','#4a1a6b','#15803d'].map(c => `
                <div class="color-swatch ${(profile.primary_color || '#7a6130') === c ? 'selected' : ''}" data-color="${c}" style="background:${c}" onclick="setProfileColor('${c}')"></div>`).join('')}
            </div>
            <span class="form-hint mt-2">This color defines the headers on result cards, printable notices, and UI highlights.</span>
          </div>

          <div class="form-group mb-6">
            <label class="form-label font-bold">UI Theme</label>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
              <label style="display:flex;align-items:center;gap:8px;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;background:var(--bg-surface);">
                <input type="radio" name="ui-theme" value="dark" checked onchange="applyUITheme('dark')">
                <div>
                  <div style="font-weight:700;font-size:0.9rem;">🌙 Dark Elegance</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">Deep blue & gold accents</div>
                </div>
              </label>
              <label style="display:flex;align-items:center;gap:8px;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;background:var(--bg-surface);">
                <input type="radio" name="ui-theme" value="light" onchange="applyUITheme('light')">
                <div>
                  <div style="font-weight:700;font-size:0.9rem;">☀️ Light Clean</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">Crisp academic white</div>
                </div>
              </label>
            </div>
          </div>

          <button class="btn btn-primary" onclick="saveCoachingProfile()">${Icons?.render?.('save',{size:16}) || ''} Save Appearance</button>
        </div>
      </div>
    `;
  } else if (_activeSettingsTab === 'language') {
    const currentLang = localStorage.getItem('app_language') || localStorage.getItem('notice_language') || 'en';
    panel.innerHTML = `
      <div class="card" style="max-width:850px;">
        <div class="card-header">
          <h3>🌐 Multilingual Localization</h3>
          <p class="text-xs text-muted">Switch the application language across the entire admin dashboard, navigation, and notice templates.</p>
        </div>
        <div class="card-body">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px;">
            <div onclick="setSettingsLanguage('en')" style="border:2px solid ${currentLang === 'en' ? 'var(--primary)' : 'var(--border)'}; background:${currentLang === 'en' ? 'rgba(37,99,235,0.08)' : 'var(--bg-surface)'}; border-radius:12px; padding:18px; cursor:pointer; transition:all 0.2s ease;">
              <div style="font-size:1.8rem; margin-bottom:8px;">🇬🇧</div>
              <div style="font-weight:800; font-size:1.05rem; color:var(--text-primary);">English</div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Default standard language for administration &amp; reporting.</div>
              ${currentLang === 'en' ? `<span class="badge badge-primary mt-3" style="font-size:0.7rem;">✓ Active Language</span>` : ''}
            </div>

            <div onclick="setSettingsLanguage('hi')" style="border:2px solid ${currentLang === 'hi' ? 'var(--primary)' : 'var(--border)'}; background:${currentLang === 'hi' ? 'rgba(37,99,235,0.08)' : 'var(--bg-surface)'}; border-radius:12px; padding:18px; cursor:pointer; transition:all 0.2s ease;">
              <div style="font-size:1.8rem; margin-bottom:8px;">🇮🇳</div>
              <div style="font-weight:800; font-size:1.05rem; color:var(--text-primary);">हिंदी (Hindi)</div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">संपूर्ण एडमिन पैनल, सूचनाएं और रिपोर्ट्स हिंदी में देखें।</div>
              ${currentLang === 'hi' ? `<span class="badge badge-primary mt-3" style="font-size:0.7rem;">✓ Active Language</span>` : ''}
            </div>

            <div onclick="setSettingsLanguage('gu')" style="border:2px solid ${currentLang === 'gu' ? 'var(--primary)' : 'var(--border)'}; background:${currentLang === 'gu' ? 'rgba(37,99,235,0.08)' : 'var(--bg-surface)'}; border-radius:12px; padding:18px; cursor:pointer; transition:all 0.2s ease;">
              <div style="font-size:1.8rem; margin-bottom:8px;">🇮🇳</div>
              <div style="font-weight:800; font-size:1.05rem; color:var(--text-primary);">ગુજરાતી (Gujarati)</div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">સંપૂર્ણ એડમિન પોર્ટલ અને સૂચનાઓ ગુજરાતીમાં જુઓ.</div>
              ${currentLang === 'gu' ? `<span class="badge badge-primary mt-3" style="font-size:0.7rem;">✓ Active Language</span>` : ''}
            </div>
          </div>

          <div style="background:rgba(37,99,235,0.06); border-left:4px solid var(--primary); padding:14px; border-radius:var(--radius); margin-bottom:20px;">
            💡 <strong>Instant Application:</strong> Selecting a language updates the sidebar navigation, page titles, empty states, and default notice templates immediately without data loss.
          </div>

          <button class="btn btn-primary" onclick="saveCoachingProfile()">${Icons?.render?.('save',{size:16}) || ''} Save Language Preference</button>
        </div>
      </div>
    `;
  } else if (_activeSettingsTab === 'academic') {
    panel.innerHTML = `
      <div class="card" style="max-width:850px;">
        <div class="card-header">
          <h3>🎓 Academic &amp; Examination Structure</h3>
          <p class="text-xs text-muted">Configure grading algorithms, passing criteria, and attendance tracking modes.</p>
        </div>
        <div class="card-body">
          <div class="form-grid mb-4">
            <div class="form-group">
              <label class="form-label font-bold">Default Exam Mode</label>
              <select id="s-exam-mode-default" class="form-control">
                <option value="Offline" ${(profile.exam_mode_default || 'Offline') === 'Offline' ? 'selected' : ''}>Offline (Written / Paper-based)</option>
                <option value="Online" ${profile.exam_mode_default === 'Online' ? 'selected' : ''}>Online Portal (MCQ / CBT)</option>
                <option value="Hybrid" ${profile.exam_mode_default === 'Hybrid' ? 'selected' : ''}>Hybrid (OMR Sheet + Viva)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Minimum Passing Percentage (%)</label>
              <input type="number" id="s-passing-percentage" class="form-control" value="${profile.passing_percentage ?? 33}" min="10" max="100">
            </div>
          </div>

          <div class="form-grid mb-4">
            <div class="form-group">
              <label class="form-label font-bold">Grading Scale Format</label>
              <select id="s-grading-format" class="form-control">
                <option value="State Scale" ${(profile.grading_format || 'State Scale') === 'State Scale' ? 'selected' : ''}>State Board Scale (A+, A, B, C, D, Fail)</option>
                <option value="CBSE Scale" ${profile.grading_format === 'CBSE Scale' ? 'selected' : ''}>CBSE Style (A1, A2, B1, B2, C1, C2...)</option>
                <option value="Percentage Only" ${profile.grading_format === 'Percentage Only' ? 'selected' : ''}>Percentage &amp; Pass/Fail Status Only</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Evaluation Style</label>
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
              <option value="Daily" ${(profile.attendance_mode || 'Daily') === 'Daily' ? 'selected' : ''}>🌅 Daily (Taken once at the start of the day)</option>
              <option value="Lecture" ${profile.attendance_mode === 'Lecture' ? 'selected' : ''}>📚 Lecture-wise (Taken per subject/lecture)</option>
            </select>
          </div>

          <div class="form-group mb-4">
            <label class="form-label font-bold">Target Small / Weekly Tests per Year</label>
            <input type="number" class="form-control" id="s-weekly-tests" value="${profile.weekly_tests_count ?? 40}" min="0" max="150">
          </div>

          <div class="form-grid mb-6">
            <label class="toggle-group" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);">
              <label class="toggle"><input type="checkbox" id="s-has-midsem" ${profile.has_midsem !== 0 ? 'checked' : ''}><span class="toggle-slider"></span></label>
              <span class="toggle-label font-bold">Conduct Semester 1 / Midterm Exam</span>
            </label>
            <label class="toggle-group" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);">
              <label class="toggle"><input type="checkbox" id="s-has-final" ${profile.has_final !== 0 ? 'checked' : ''}><span class="toggle-slider"></span></label>
              <span class="toggle-label font-bold">Conduct Semester 2 / Final Exam</span>
            </label>
          </div>

          <button class="btn btn-primary" onclick="saveCoachingProfile()">${Icons?.render?.('save',{size:16}) || ''} Save Academic Policies</button>
        </div>
      </div>
    `;
  } else if (_activeSettingsTab === 'notices') {
    panel.innerHTML = `
      <div class="card" style="max-width:850px;">
        <div class="card-header">
          <h3>📢 Notices &amp; PDF Export Configuration</h3>
          <p class="text-xs text-muted">Configure default notice design modes, signatories, and print aesthetics.</p>
        </div>
        <div class="card-body">
          <div class="form-grid mb-4">
            <div class="form-group">
              <label class="form-label font-bold">Default Notice Design Mode</label>
              <select id="s-default-notice-mode" class="form-control">
                <option value="digital" ${(profile.default_notice_mode || 'digital') === 'digital' ? 'selected' : ''}>🖥 Digital (Vibrant colors for phone/portal)</option>
                <option value="print" ${profile.default_notice_mode === 'print' ? 'selected' : ''}>🖨 Physical Print (Clean white background, high contrast)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Notice Schedule Lead Time (Days in Advance)</label>
              <input type="number" id="s-notice-lead-days" class="form-control" value="${profile.notice_lead_days ?? 3}" min="1" max="30">
            </div>
          </div>

          <p class="form-section-title mt-4">Authorized Signatory (Appears on Result Cards &amp; Notices)</p>
          <div class="form-grid mb-4">
            <div class="form-group">
              <label class="form-label font-bold">Signatory Name</label>
              <input type="text" class="form-control" id="s-signatory-name" value="${profile.signatory_name || ''}" placeholder="e.g. Dr. Rajesh Sharma">
            </div>
            <div class="form-group">
              <label class="form-label font-bold">Signatory Designation</label>
              <input type="text" class="form-control" id="s-signatory-title" value="${profile.signatory_title || 'Director'}" placeholder="e.g. Principal / Director">
            </div>
          </div>

          <div class="form-group mb-6">
            <label class="form-label font-bold">Digital Signature Image</label>
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
                <p class="text-xs text-muted mt-2">PNG with transparent background · Auto-processed to remove white backgrounds</p>
              </div>
            </div>
          </div>

          <button class="btn btn-primary" onclick="saveCoachingProfile()">${Icons?.render?.('save',{size:16}) || ''} Save Notice Settings</button>
        </div>
      </div>
    `;
  } else if (_activeSettingsTab === 'data') {
    panel.innerHTML = `
      <div class="grid gap-6" style="grid-template-columns:1fr 1fr; max-width:960px;">
        <!-- Cloud Backup & JSON Sync -->
        <div class="card" id="sync-settings-card">
          <div class="card-header">
            <h3>${Icons?.render?.('refresh',{size:18}) || ''} Cloud Sync &amp; Backups</h3>
            <p class="text-xs text-muted">Export or import entire database in one JSON file</p>
          </div>
          <div class="card-body">
            <p class="text-xs text-muted mb-4">
              Export your entire coaching database (admissions, classes, timetables, attendance, and grades) as a single JSON file.
            </p>
            
            <div style="display:flex; flex-direction:column; gap:10px" class="mb-4">
              <button class="btn btn-outline w-full flex items-center justify-center gap-2" onclick="performCloudSyncExport()">
                ${Icons?.render?.('download',{size:14}) || ''} Download Full Backup (.json)
              </button>
              
              <label class="btn btn-outline w-full flex items-center justify-center gap-2" style="cursor:pointer; margin-bottom:0">
                ${Icons?.render?.('upload',{size:14}) || ''} Restore Backup from JSON
                <input type="file" accept=".json" style="display:none" onchange="performCloudSyncImport(this)">
              </label>
            </div>
            
            <div style="background:rgba(37, 99, 235, 0.06); border-left:3px solid var(--primary-light); padding:10px; border-radius:var(--radius);" class="text-xs text-secondary">
              💡 <strong>Automatic Backup:</strong> The system automatically verifies database health and prompts scheduled backup syncs.
            </div>
          </div>
        </div>

        <!-- Class Graduation Center -->
        <div class="card" id="graduation-center-card">
          <div class="card-header">
            <h3>🎓 Class Graduation Center</h3>
            <p class="text-xs text-muted">Graduate students in bulk at the end of the academic year</p>
          </div>
          <div class="card-body">
            <p class="text-xs text-muted mb-4">
              When the academic year concludes, you can graduate all active students. This marks their status as 'Completed', maintaining historical marks while clearing active lists.
            </p>
            <div class="form-group mb-4">
              <label class="form-label" style="font-weight:600">Select Class to Graduate</label>
              <select class="form-control" id="grad-bulk-std-select">
                <option value="all">🎓 All Classes / Standards</option>
              </select>
            </div>
            <button class="btn btn-primary w-full flex items-center justify-center gap-2" onclick="performBulkGraduation()">
              🎓 Graduate Selected Students
            </button>
          </div>
        </div>

        <!-- Reset Center -->
        <div class="card" style="grid-column: 1 / -1;">
          <div class="card-header">
            <h3>${Icons?.render?.('delete',{size:18}) || ''} Database Cleanup &amp; Reset Center</h3>
            <p class="text-xs text-muted">Safely clear demo data or reset specific modules</p>
          </div>
          <div class="card-body">
            <p class="text-xs text-muted mb-4">Select categories to clear from the database. This action is permanent and protected by confirmation.</p>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;" class="mb-4">
              <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer">
                <input type="checkbox" id="reset-test-marks" style="cursor:pointer"> <span>Delete only small test marks</span>
              </label>
              <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer">
                <input type="checkbox" id="reset-tests" style="cursor:pointer"> <span>Delete all tests &amp; cycles</span>
              </label>
              <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer">
                <input type="checkbox" id="reset-exam-marks" style="cursor:pointer"> <span>Delete semester exam marks</span>
              </label>
              <label class="checkbox-container" style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer">
                <input type="checkbox" id="reset-students" style="cursor:pointer"> <span>Delete all student admissions</span>
              </label>
            </div>
            
            <div class="flex gap-2">
              <button class="btn btn-outline btn-sm" onclick="performSelectiveReset()">Perform Selective Reset</button>
              <button class="btn btn-danger btn-sm" onclick="showMasterResetWarning()">${Icons?.render?.('warning',{size:14}) || ''} Master Database Reset</button>
            </div>
          </div>
        </div>
      </div>
    `;
    loadGraduationStandardsDropdown().catch(() => {});
  } else if (_activeSettingsTab === 'security') {
    panel.innerHTML = `
      <div class="grid gap-6" style="grid-template-columns:1fr 1fr; max-width:960px;">
        <!-- Change Password -->
        <div class="card">
          <div class="card-header"><h3>🔐 Change Admin Password</h3></div>
          <div class="card-body">
            <div class="form-group mb-4">
              <label class="form-label font-bold">Current Password</label>
              <input type="password" class="form-control" id="s-curr-pass" placeholder="Current password">
            </div>
            <div class="form-group mb-4">
              <label class="form-label font-bold">New Password</label>
              <input type="password" class="form-control" id="s-new-pass" placeholder="New password (min 6 chars)">
            </div>
            <div class="form-group mb-4">
              <label class="form-label font-bold">Confirm New Password</label>
              <input type="password" class="form-control" id="s-confirm-pass" placeholder="Repeat new password">
            </div>
            <button class="btn btn-primary" onclick="changePassword()">${Icons?.render?.('settings',{size:14}) || ''} Update Password</button>
          </div>
        </div>

        <!-- System Info -->
        <div class="card">
          <div class="card-header"><h3>${Icons?.render?.('info',{size:18}) || ''} System Diagnostics &amp; Status</h3></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:var(--space-3)">
              <div class="flex justify-between">
                <span class="text-secondary text-sm">ERP Software Version</span>
                <span class="badge badge-primary font-mono">v1.1.0 Production</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary text-sm">Database Engine</span>
                <span class="text-sm font-semibold">SQLite (WAL Synchronized)</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary text-sm">PDF Rendering Engine</span>
                <span class="text-sm font-semibold">Puppeteer Headless Chrome</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary text-sm">Default Administrator</span>
                <span class="text-sm text-muted">admin@result.local</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary text-sm">Server Status</span>
                <span class="badge badge-success">● Connected &amp; Synced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function setProfileColor(color) {
  const colorInput = document.getElementById('s-color');
  if (colorInput) colorInput.value = color;
  const hexSpan = document.getElementById('s-color-hex');
  if (hexSpan) hexSpan.textContent = color;
  $$('#s-color-swatches .color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === color);
  });
}

function applyUITheme(theme) {
  localStorage.setItem('ui_theme', theme);
  document.body.setAttribute('data-theme', theme);
  Toast.info('Theme Updated', `Switched theme to ${theme === 'dark' ? 'Dark Elegance' : 'Light Clean'}.`);
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
  const p = window._currentCoachingProfile || {};
  
  const getField = (id, fallback) => {
    const el = document.getElementById(id);
    if (!el) return fallback !== undefined ? fallback : '';
    if (el.type === 'checkbox') return el.checked ? 1 : 0;
    return el.value !== undefined ? el.value : fallback;
  };

  const name = getField('s-name', p.name);
  if (!name && _activeSettingsTab === 'general') {
    Toast.error('Required', 'Coaching name is required.');
    return;
  }

  const payload = {
    name: name || p.name || 'Coaching Institute',
    tagline: getField('s-tagline', p.tagline),
    address: getField('s-address', p.address),
    phone: getField('s-phone', p.phone),
    website: getField('s-website', p.website),
    primary_color: getField('s-color', p.primary_color || '#7a6130'),
    weekly_tests_count: parseInt(getField('s-weekly-tests', p.weekly_tests_count ?? 40)) || 40,
    has_midsem: getField('s-has-midsem', p.has_midsem ?? 1),
    has_final: getField('s-has-final', p.has_final ?? 1),
    signatory_name: getField('s-signatory-name', p.signatory_name),
    signatory_title: getField('s-signatory-title', p.signatory_title || 'Director'),
    exam_mode_default: getField('s-exam-mode-default', p.exam_mode_default || 'Offline'),
    passing_percentage: parseInt(getField('s-passing-percentage', p.passing_percentage ?? 33)) || 33,
    grading_format: getField('s-grading-format', p.grading_format || 'State Scale'),
    eval_style: getField('s-eval-style', p.eval_style || 'Manual'),
    notice_lead_days: parseInt(getField('s-notice-lead-days', p.notice_lead_days ?? 3)) || 3,
    attendance_mode: getField('s-attendance-mode', p.attendance_mode || 'Daily'),
    academic_year: getField('s-academic-year', p.academic_year || '2026-2027'),
    notice_language: localStorage.getItem('app_language') || localStorage.getItem('notice_language') || p.notice_language || 'en',
    default_notice_mode: getField('s-default-notice-mode', p.default_notice_mode || 'digital'),
    onboarding_complete: true
  };

  try {
    await API.coaching.update(payload);
    window._currentCoachingProfile = { ...p, ...payload };
    const sbName = document.getElementById('sidebar-coaching-name');
    if (sbName && payload.name) sbName.textContent = payload.name;
    Toast.success('Settings Saved', 'Coaching profile and preferences updated successfully.');
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

// ─── Language Selector for Settings ────────────────────────────────────────
function setSettingsLanguage(lang) {
  if (window.I18n) {
    window.I18n.setLanguage(lang);
  } else {
    localStorage.setItem('app_language', lang);
    localStorage.setItem('notice_language', lang);
  }
  saveCoachingProfile().catch(() => {});
}
window.setSettingsLanguage = setSettingsLanguage;

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
    dlAnchorElem.setAttribute("download", `edutrack_sync_backup_${Date.now()}.json`);
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
    title: '📊 Welcome to EduTrack ERP!',
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
    Toast.success('Tour Completed', 'You have successfully explored all key modules of EduTrack ERP! 🎓');
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
