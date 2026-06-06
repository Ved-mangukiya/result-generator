/* ═══════════════════════════════════════════════
   AUTH.JS — Login, Onboarding, Session
   ═══════════════════════════════════════════════ */

let _selectedLogoFile = null;
let _selectedSigFile = null;
let _obCurrentStep = 0;
const OB_TOTAL_STEPS = 6;

async function initAuth() {
  // Show loader briefly on initial page load for returning sessions
  if (window.ApexLoader) {
    window.ApexLoader.show();
  }
  
  // Set initial state - user is NOT logged in yet
  window._isLoggedIn = false;
  
  try {
    const me = await API.auth.me();
    if (me && me.onboarding_complete) {
      // User has valid session - mark as logged in
      window._isLoggedIn = true;
      // Hide loader after 2s and show app
      setTimeout(() => {
        if (window.ApexLoader) window.ApexLoader.hide();
        showApp(me);
      }, 2200);
    } else if (me) {
      // User logged in but onboarding not complete
      window._isLoggedIn = true;
      if (window.ApexLoader) window.ApexLoader.hide();
      showOnboarding();
    }
  } catch (err) {
    // Not logged in — hide loader, show login page WITHOUT error
    if (window.ApexLoader) window.ApexLoader.hide();
    showLoginPage();
    // Don't show any error message here - this is normal for new visitors
  }
  
  // Handle session expiry during usage (not on initial load)
  window.addEventListener('auth:expired', () => {
    // Only show "Session Expired" if user was previously logged in
    if (window._isLoggedIn) {
      window._isLoggedIn = false;
      showLoginPage();
      // Show error message only for actual session expiry
      setTimeout(() => {
        const errEl = document.getElementById('login-error');
        const errText = document.getElementById('login-error-text');
        if (errEl && errText) {
          errText.textContent = 'Session expired. Please login again.';
          errEl.classList.remove('hidden');
          errEl.style.display = 'block';
        }
      }, 100);
    }
  });
}

function showLoginPage() {
  hide('app');
  hide('onboarding-overlay');
  hide('spinner-overlay');
  // Hide loader if visible
  const loader = document.getElementById('apex-loader');
  if (loader) loader.style.display = 'none';
  show('login-page');
  // Reset form
  const form = document.getElementById('login-form');
  if (form) form.reset();
  
  // IMPORTANT: Hide error message on page load
  const errEl = document.getElementById('login-error');
  if (errEl) {
    errEl.classList.add('hidden');
    errEl.style.display = 'none';
  }

  // Reset login button and spinner state
  const btn = document.getElementById('login-btn');
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');
  const arrow = document.getElementById('login-arrow');
  if (btn) btn.disabled = false;
  if (btnText) btnText.textContent = 'Sign In to Dashboard';
  if (spinner) spinner.classList.add('hidden');
  if (arrow) arrow.style.display = '';
  
  // Clear error classes from inputs
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  if (emailInput) emailInput.classList.remove('error');
  if (passwordInput) passwordInput.classList.remove('error');
}

function showApp(me) {
  hide('login-page');
  hide('onboarding-overlay');
  
  // Mark user as logged in
  window._isLoggedIn = true;
  
  // Update UI
  const email = me?.email || 'admin';
  document.getElementById('topbar-admin-email').textContent = email.split('@')[0];
  document.getElementById('admin-avatar-initials').textContent = email[0].toUpperCase();
  
  showFlex('app');
  
  // Load coaching profile for sidebar
  API.coaching.get().then(profile => {
    if (profile?.name) {
      document.getElementById('sidebar-coaching-name').textContent = profile.name;
    }
    if (profile?.logo_path) {
      const thumb = document.getElementById('sidebar-logo-thumb');
      thumb.innerHTML = `<img src="/${profile.logo_path}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:4px">`;
    }
  }).catch(() => {});
  
  // Navigation is handled uniquely by app.js showApp override
}

function showOnboarding() {
  hide('login-page');
  hide('app');
  _obCurrentStep = 0;
  showOBStep(0);
  showFlex('onboarding-overlay');
  
  // Init color swatches
  initColorSwatches(
    document.querySelector('#onboarding-step-1'),
    document.getElementById('ob-color')
  );
  
  // Logo upload handler
  document.getElementById('ob-logo-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    _selectedLogoFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('ob-logo-img').src = ev.target.result;
      hide('ob-logo-placeholder');
      document.getElementById('ob-logo-preview').style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });

  // Signature upload handler
  document.getElementById('ob-sig-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const processedFile = await makeImageBackgroundless(file);
    _selectedSigFile = processedFile;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('ob-sig-img').src = ev.target.result;
      hide('ob-sig-placeholder');
      document.getElementById('ob-sig-preview').style.display = 'flex';
    };
    reader.readAsDataURL(processedFile);
  });

  // Sync color picker to hidden input
  const cp = document.getElementById('ob-color-picker');
  const hColor = document.getElementById('ob-color');
  if (cp && hColor) {
    cp.addEventListener('input', (e) => {
      hColor.value = e.target.value;
      document.querySelectorAll('#onboarding-step-1 .color-swatch').forEach(s => s.classList.remove('selected'));
    });
  }
}

function showOBStep(step) {
  for (let i = 0; i < OB_TOTAL_STEPS; i++) {
    const el = document.getElementById(`onboarding-step-${i}`);
    if (el) el.style.display = i === step ? '' : 'none';
  }
  
  // Dynamic conversational headers
  const obTitles = [
    "What is your coaching institute's name?",
    "How can students and parents contact you?",
    "Upload your official branding files",
    "Configure your academic and grading rules",
    "Which classes and streams do you teach?",
    "Review your scheduled exam rounds"
  ];
  
  const obSubtitles = [
    "Let's start by entering the basic name, tagline, and location of your center.",
    "These contact details and brand colors will appear at the top of your student reports.",
    "Upload your official logo and director's signature to automatically sign report cards.",
    "Set your passing limits, default evaluation style, and grading formats.",
    "We will automatically set up sections and default subjects for the classes you select.",
    "Verify the exam categories we have recommended for your streams. You can add more cycles anytime."
  ];

  const titleEl = document.getElementById('ob-header-title');
  const subEl = document.getElementById('ob-header-subtitle');
  if (titleEl) titleEl.textContent = obTitles[step];
  if (subEl) subEl.textContent = obSubtitles[step];
  
  // Update dots
  $$('.onboarding-step-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === step);
    dot.classList.toggle('done', i < step);
  });
  
  // Back button
  if (step === 0) hide('ob-back-btn');
  else show('ob-back-btn');
  
  // Next button text
  const nextBtn = document.getElementById('ob-next-btn');
  nextBtn.textContent = step === OB_TOTAL_STEPS - 1 ? '🚀 Get Started' : 'Next →';

  if (step === 5) {
    populateExamPathsStep();
  }
}

// Onboarding navigation
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ob-next-btn')?.addEventListener('click', async () => {
    if (_obCurrentStep < OB_TOTAL_STEPS - 1) {
      if (_obCurrentStep === 0) {
        const name = getVal('ob-name');
        if (!name) { Toast.error('Required', 'Please enter your coaching name.'); return; }
      }
      _obCurrentStep++;
      showOBStep(_obCurrentStep);
    } else {
      await finishOnboarding();
    }
  });
  
  document.getElementById('ob-back-btn')?.addEventListener('click', () => {
    if (_obCurrentStep > 0) { _obCurrentStep--; showOBStep(_obCurrentStep); }
  });
});

async function finishOnboarding() {
  const btn = document.getElementById('ob-next-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  // Gather chosen streams
  const streams = [];
  for (let i = 1; i <= 10; i++) {
    if (document.getElementById(`ob-stream-class-${i}`)?.checked) {
      streams.push(`class_${i}`);
    }
  }
  if (document.getElementById('ob-stream-hsc-science')?.checked) streams.push('hsc_science');
  if (document.getElementById('ob-stream-hsc-commerce')?.checked) streams.push('hsc_commerce');
  if (document.getElementById('ob-stream-hsc-arts')?.checked) streams.push('hsc_arts');
  if (document.getElementById('ob-stream-jee')?.checked) streams.push('jee');
  if (document.getElementById('ob-stream-neet')?.checked) streams.push('neet');
  if (document.getElementById('ob-stream-professional')?.checked) streams.push('professional');
  
  try {
    // Save onboarding details & seed db
    await API.coaching.onboardSetup({
      name: getVal('ob-name'),
      tagline: getVal('ob-tagline'),
      address: getVal('ob-address'),
      phone: getVal('ob-phone'),
      alternate_phone: getVal('ob-alternate-phone'),
      email: getVal('ob-email'),
      website: getVal('ob-website'),
      established_year: parseInt(getVal('ob-established-year')) || null,
      registration_no: getVal('ob-reg-no'),
      registration_authority: getVal('ob-reg-auth'),
      primary_color: document.getElementById('ob-color').value || '#7a6130',
      weekly_tests_count: parseInt(getVal('ob-weekly-tests')) || 40,
      has_midsem: document.getElementById('ob-has-midsem').checked ? 1 : 0,
      has_final: document.getElementById('ob-has-final').checked ? 1 : 0,
      signatory_name: getVal('ob-signatory-name'),
      signatory_title: getVal('ob-signatory-title'),
      exam_mode_default: document.getElementById('ob-exam-mode-default')?.value || 'Offline',
      passing_percentage: parseInt(document.getElementById('ob-passing-percentage')?.value) || 33,
      grading_format: document.getElementById('ob-grading-format')?.value || 'State Scale',
      eval_style: document.getElementById('ob-eval-style')?.value || 'Manual',
      notice_lead_days: parseInt(document.getElementById('ob-notice-lead-days')?.value) || 3,
      streams,
      examPaths: _obExamPaths
    });
    
    // Upload logo if selected
    if (_selectedLogoFile) {
      const form = new FormData();
      form.append('logo', _selectedLogoFile);
      await API.upload.logo(form).catch(() => {});
    }

    // Upload signature if selected
    if (_selectedSigFile) {
      const form = new FormData();
      form.append('signature', _selectedSigFile);
      await API.upload.signature(form).catch(() => {});
    }
    
    Toast.success('Setup Complete!', 'Welcome to Apex Tuition ERP');
    
    const me = await API.auth.me();
    showApp(me);
  } catch (err) {
    Toast.error('Save Failed', err.message);
    btn.disabled = false;
    btn.textContent = 'Get Started';
  }
}

// ─── Login Form ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('login-btn');
    const btnText = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');
    const arrow = document.getElementById('login-arrow');
    const errorEl = document.getElementById('login-error');
    
    btn.disabled = true;
    btnText.textContent = 'Signing In…';
    if (spinner) spinner.classList.remove('hidden');
    if (arrow) arrow.style.display = 'none';
    if (errorEl) errorEl.classList.add('hidden');
    
    // Clear error classes
    document.getElementById('login-email')?.classList.remove('error');
    document.getElementById('login-password')?.classList.remove('error');
    
    try {
      const result = await API.auth.login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value
      );
      
      // Show loader before transitioning
      hide('login-page');
      if (window.ApexLoader) window.ApexLoader.show();
      
      // Small delay to let loader animate, then load app
      setTimeout(async () => {
        try {
          if (result.onboarding_complete) {
            const me = await API.auth.me();
            showApp(me);
          } else {
            if (window.ApexLoader) window.ApexLoader.hide();
            showOnboarding();
          }
        } catch(err2) {
          if (window.ApexLoader) window.ApexLoader.hide();
          showLoginPage();
        }
      }, 1800);
      
    } catch (err) {
      const errText = document.getElementById('login-error-text');
      if (errText) errText.textContent = err.message || 'Invalid credentials';
      if (errorEl) errorEl.classList.remove('hidden');
      document.getElementById('login-email')?.classList.add('error');
      document.getElementById('login-password')?.classList.add('error');
      btn.disabled = false;
      btnText.textContent = 'Sign In to Dashboard';
      if (spinner) spinner.classList.add('hidden');
      if (arrow) arrow.style.display = '';
    }
  });
  
  // Clear error on type
  ['login-email', 'login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      document.getElementById(id).classList.remove('error');
      const errEl = document.getElementById('login-error');
      if (errEl) errEl.classList.add('hidden');
    });
  });
  
  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await API.auth.logout();
    window._isLoggedIn = false;
    showLoginPage();
    Toast.info('Signed Out', 'You have been logged out successfully.');
  });
});

const DEFAULT_EXAMS = {
  class_1: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  class_2: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  class_3: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  class_4: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  class_5: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  class_6: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  class_7: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  class_8: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  class_9: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  class_10: ["Weekly Test", "Mid Sem", "Sem", "Final"],
  hsc_science_pcm: ["Weekly Practice Test", "Unit Test 1", "Terminal Exam", "Preliminary Exam", "Final Board Exam"],
  hsc_science_pcb: ["Weekly Practice Test", "Unit Test 1", "Terminal Exam", "Preliminary Exam", "Final Board Exam"],
  hsc_commerce: ["Weekly Practice Test", "Unit Test 1", "Mid-Term Exam", "Preliminary Exam", "Final Board Exam"],
  hsc_arts: ["Weekly Practice Test", "Unit Test 1", "Mid-Term Exam", "Preliminary Exam", "Final Board Exam"],
  jee: ["Weekly Practice Test", "Part Syllabus Mock Test", "Cumulative Mock Test", "Grand Mock Test"],
  neet: ["Weekly Practice Test", "Part Syllabus Mock Test", "Cumulative Mock Test", "Grand Mock Test"],
  professional: ["Weekly Test", "Chapter-wise Evaluation", "Sectional Mock Test", "Full-Syllabus Mock Test"]
};

const STREAM_DISPLAY_NAMES = {
  class_1: "Class 1",
  class_2: "Class 2",
  class_3: "Class 3",
  class_4: "Class 4",
  class_5: "Class 5",
  class_6: "Class 6",
  class_7: "Class 7",
  class_8: "Class 8",
  class_9: "Class 9",
  class_10: "Class 10",
  hsc_science_pcm: "Class 11 & 12 Science (PCM)",
  hsc_science_pcb: "Class 11 & 12 Science (PCB)",
  hsc_commerce: "Class 11 & 12 Commerce",
  hsc_arts: "Class 11 & 12 Arts",
  jee: "JEE Prep (11th, 12th & Target)",
  neet: "NEET Prep (11th, 12th & Target)",
  professional: "Professional Courses (CA/CS)"
};

let _obExamPaths = {};

function populateExamPathsStep() {
  const container = document.getElementById('ob-exam-paths-container');
  if (!container) return;

  // Determine active keys
  const activeKeys = [];
  for (let i = 1; i <= 10; i++) {
    if (document.getElementById(`ob-stream-class-${i}`)?.checked) {
      activeKeys.push(`class_${i}`);
    }
  }
  if (document.getElementById('ob-stream-hsc-science')?.checked) {
    activeKeys.push('hsc_science_pcm');
    activeKeys.push('hsc_science_pcb');
  }
  if (document.getElementById('ob-stream-hsc-commerce')?.checked) activeKeys.push('hsc_commerce');
  if (document.getElementById('ob-stream-hsc-arts')?.checked) activeKeys.push('hsc_arts');
  if (document.getElementById('ob-stream-jee')?.checked) activeKeys.push('jee');
  if (document.getElementById('ob-stream-neet')?.checked) activeKeys.push('neet');
  if (document.getElementById('ob-stream-professional')?.checked) activeKeys.push('professional');

  // Initialize keys in state if not present
  activeKeys.forEach(key => {
    if (!_obExamPaths[key]) {
      _obExamPaths[key] = [...(DEFAULT_EXAMS[key] || ["Weekly Test", "Mid Sem", "Sem", "Final"])];
    }
  });

  container.innerHTML = '';
  if (activeKeys.length === 0) {
    container.innerHTML = '<div class="text-sm text-muted">No streams or classes selected in the previous step. Please go back and select some!</div>';
    return;
  }

  activeKeys.forEach(key => {
    const displayName = STREAM_DISPLAY_NAMES[key] || key;

    const card = document.createElement('div');
    card.className = 'exam-path-card';
    card.style.cssText = 'background:var(--bg-main); border:1px solid var(--border); border-radius:var(--radius); padding:var(--space-3); display:flex; flex-direction:column; gap:var(--space-2)';

    // Title / header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center';
    header.innerHTML = `<strong style="color:var(--accent); font-size:0.9rem">${displayName}</strong>`;
    card.appendChild(header);

    // Tags list
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'exam-list-tags';
    tagsContainer.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px';
    
    renderExamTags(key, tagsContainer);
    card.appendChild(tagsContainer);

    // Add input group
    const inputGroup = document.createElement('div');
    inputGroup.style.cssText = 'display:flex; gap:6px; margin-top:2px';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control form-control-sm ob-add-exam-input';
    input.placeholder = 'e.g. Unit Test 3, Monthly Drill';
    input.style.cssText = 'height:32px; font-size:0.75rem; flex:1';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-outline btn-sm ob-add-exam-btn';
    addBtn.style.cssText = 'height:32px; padding:0 var(--space-3); font-size:0.75rem';
    addBtn.innerHTML = `${Icons?.render?.('add',{size:12}) || ''} Add`;

    addBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (!val) return;
      if (_obExamPaths[key].includes(val)) {
        Toast.warning('Duplicate', 'This exam is already in the list.');
        return;
      }
      _obExamPaths[key].push(val);
      input.value = '';
      renderExamTags(key, tagsContainer);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });

    inputGroup.appendChild(input);
    inputGroup.appendChild(addBtn);
    card.appendChild(inputGroup);

    container.appendChild(card);
  });
}

function renderExamTags(key, tagsContainer) {
  tagsContainer.innerHTML = '';
  const exams = _obExamPaths[key] || [];
  
  if (exams.length === 0) {
    tagsContainer.innerHTML = '<span class="text-xs text-muted" style="padding:4px 0">No exam cycles defined. Add one below!</span>';
    return;
  }

  exams.forEach((exam, idx) => {
    const tag = document.createElement('span');
    tag.className = 'badge';
    tag.style.cssText = 'background:var(--bg-card); border:1px solid var(--border); color:var(--text-main); display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:9999px; font-size:0.75rem; font-weight:normal';
    tag.textContent = exam;

    const del = document.createElement('span');
    del.style.cssText = 'cursor:pointer; color:var(--text-muted); font-weight:bold; font-size:0.8rem';
    del.textContent = '×';
    del.addEventListener('click', () => {
      _obExamPaths[key].splice(idx, 1);
      renderExamTags(key, tagsContainer);
    });

    tag.appendChild(del);
    tagsContainer.appendChild(tag);
  });
}

window.initAuth = initAuth;
window.showApp = showApp;
window.showLoginPage = showLoginPage;
