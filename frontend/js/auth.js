/* ═══════════════════════════════════════════════
   AUTH.JS — Login, Onboarding, Session
   ═══════════════════════════════════════════════ */

let _selectedLogoFile = null;
let _obCurrentStep = 0;
const OB_TOTAL_STEPS = 4;

async function initAuth() {
  // Try to restore session
  try {
    const me = await API.auth.me();
    if (me && me.onboarding_complete) {
      showApp(me);
    } else if (me) {
      showOnboarding();
    }
  } catch {
    showLoginPage();
  }
  
  // Handle session expiry
  window.addEventListener('auth:expired', () => {
    showLoginPage();
    Toast.warning('Session Expired', 'Please sign in again.');
  });
}

function showLoginPage() {
  hide('app');
  hide('onboarding-overlay');
  hide('spinner-overlay');
  show('login-page');
}

function showApp(me) {
  hide('login-page');
  hide('onboarding-overlay');
  
  // Update UI
  const email = me?.email || 'admin';
  document.getElementById('topbar-admin-email').textContent = email.split('@')[0];
  document.getElementById('admin-avatar-initials').textContent = email[0].toUpperCase();
  
  document.getElementById('app').style.display = 'flex';
  
  // Load coaching profile for sidebar
  API.coaching.get().then(profile => {
    if (profile?.name) {
      document.getElementById('sidebar-coaching-name').textContent = profile.name;
    }
    if (profile?.logo_path) {
      const thumb = document.getElementById('sidebar-logo-thumb');
      thumb.innerHTML = `<img src="${profile.logo_path}" alt="Logo">`;
    }
  }).catch(() => {});
  
  // Navigate to dashboard
  if (window.Router) window.Router.navigate('dashboard');
}

function showOnboarding() {
  hide('login-page');
  hide('app');
  _obCurrentStep = 0;
  showOBStep(0);
  document.getElementById('onboarding-overlay').style.display = 'flex';
  
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
}

function showOBStep(step) {
  for (let i = 0; i < OB_TOTAL_STEPS; i++) {
    const el = document.getElementById(`onboarding-step-${i}`);
    if (el) el.style.display = i === step ? '' : 'none';
  }
  
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
  
  try {
    // Save profile
    await API.coaching.update({
      name: getVal('ob-name'),
      tagline: getVal('ob-tagline'),
      address: getVal('ob-address'),
      phone: getVal('ob-phone'),
      website: getVal('ob-website'),
      primary_color: document.getElementById('ob-color').value || '#7a6130',
      weekly_tests_count: parseInt(getVal('ob-weekly-tests')) || 40,
      has_midsem: document.getElementById('ob-has-midsem').checked ? 1 : 0,
      has_final: document.getElementById('ob-has-final').checked ? 1 : 0,
      onboarding_complete: true
    });
    
    // Upload logo if selected
    if (_selectedLogoFile) {
      const form = new FormData();
      form.append('logo', _selectedLogoFile);
      await API.upload.logo(form).catch(() => {});
    }
    
    Toast.success('Profile Saved!', 'Welcome to Result Generator 🎓');
    
    const me = await API.auth.me();
    showApp(me);
  } catch (err) {
    Toast.error('Save Failed', err.message);
    btn.disabled = false;
    btn.textContent = '🚀 Get Started';
  }
}

// ─── Login Form ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Password toggle
  document.getElementById('toggle-password')?.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('login-btn');
    const btnText = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');
    const errorEl = document.getElementById('login-error');
    
    btn.disabled = true;
    btnText.textContent = 'Signing In...';
    show(spinner);
    hide(errorEl);
    
    try {
      const result = await API.auth.login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value
      );
      
      if (result.onboarding_complete) {
        const me = await API.auth.me();
        showApp(me);
      } else {
        showOnboarding();
      }
    } catch (err) {
      document.getElementById('login-error-text').textContent = err.message;
      show(errorEl);
      document.getElementById('login-email').classList.add('error');
      document.getElementById('login-password').classList.add('error');
    } finally {
      btn.disabled = false;
      btnText.textContent = 'Sign In';
      hide(spinner);
    }
  });
  
  // Clear error on type
  ['login-email', 'login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      document.getElementById(id).classList.remove('error');
      hide('login-error');
    });
  });
  
  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await API.auth.logout();
    showLoginPage();
    Toast.info('Signed Out', 'You have been logged out successfully.');
  });
});

window.initAuth = initAuth;
window.showApp = showApp;
window.showLoginPage = showLoginPage;
