/* ═══════════════════════════════════════════════
   APP.JS — SPA Router + Navigation + Init
   ═══════════════════════════════════════════════ */

const PAGES = {
  dashboard:   { render: (p) => renderDashboard(p),     title: 'Dashboard' },
  boards:      { render: (p) => renderBoards(p),         title: 'Boards & Classes' },
  students:    { render: (p) => renderStudents(p),    title: 'Students' },
  attendance:  { render: (p) => window.AttendanceModule.renderAttendancePage(document.getElementById('page-content'), p), title: 'Attendance Tracker' },
  teachers:    { render: (p) => window.TeachersModule.renderTeachersPage(document.getElementById('page-content'), p), title: 'Teachers Portal' },
  parents:     { render: (p) => window.ParentsModule.renderParentsPage(document.getElementById('page-content'), p), title: 'Parent Portal' },
  faculty:     { render: (p) => window.FacultyModule.renderFacultyPage(document.getElementById('page-content'), p), title: 'Faculty Management' },
  timetable:   { render: (p) => window.TimetableBuilder.renderPage(document.getElementById('page-content'), p), title: 'Timetable Studio' },
  results:     { render: (p) => renderResults(p),     title: 'Results' },
  tests:       { render: (p) => renderTests(p),       title: 'Test Scheduler' },
  reminders:   { render: (p) => (typeof renderReminders === 'function' ? renderReminders(p) : window.renderReminders ? window.renderReminders(p) : console.error('reminders.js not loaded')),  title: 'Notices & Reminders' },
  promotions:  { render: (p) => renderPromotions(p), title: 'Promotions' },
  templates:   { render: (p) => renderTemplates(p),     title: 'Templates' },
  import:      { render: (p) => renderImport(p),        title: 'Import Excel' },
  settings:    { render: (p) => renderSettings(p),      title: 'Settings' },
};

function parseCurrentHash() {
  const raw = window.location.hash.replace('#', '') || 'dashboard';
  const [page, query] = raw.split('?');
  const params = {};
  if (query) {
    const sp = new URLSearchParams(query);
    for (const [k, v] of sp.entries()) {
      params[k] = v;
    }
  }
  return { page: page || 'dashboard', params };
}

const Router = {
  current: null,
  _ignoreHashChange: false,
  
  navigate(page, params = {}) {
    if (!PAGES[page]) { console.warn('Unknown page:', page); return; }

    // Cross-page class sync — persist standardId in localStorage
    if (params.standardId) {
      localStorage.setItem('lastStandardId', params.standardId);
    }
    // Auto-inject last class if page supports it and no explicit param given
    const classPages = ['results', 'tests', 'promotions', 'students'];
    if (classPages.includes(page) && !params.standardId) {
      const saved = localStorage.getItem('lastStandardId');
      if (saved) params.standardId = parseInt(saved);
    }

    // Update nav active state
    $$('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Update hash without triggering hashchange loop
    this._ignoreHashChange = true;
    let queryStr = '';
    if (Object.keys(params).length > 0) {
      queryStr = '?' + new URLSearchParams(params).toString();
    }
    window.location.hash = page + queryStr;
    setTimeout(() => { this._ignoreHashChange = false; }, 50);

    // Animate out
    const content = document.getElementById('page-content');
    content.classList.add('page-transition-out');

    setTimeout(() => {
      content.classList.remove('page-transition-out');

      // Render new page
      try {
        PAGES[page].render(params);
        this.current = page;

        // Add entrance animation
        content.classList.add('page-transition-in');
        setTimeout(() => content.classList.remove('page-transition-in'), 350);
      } catch (err) {
        console.error('Page render error:', err);
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">${Icons?.render?.('warning', {size:32}) || '⚠️'}</div>
          <h3>Page Error</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary mt-4" onclick="Router.navigate('dashboard')">← Back to Dashboard</button>
        </div>`;
      }
    }, 150);
  }
};

// ─── Navigation Click Handlers ────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Hashchange listener for browser back/forward buttons
  window.addEventListener('hashchange', () => {
    if (Router._ignoreHashChange) return;
    const { page, params } = parseCurrentHash();
    if (PAGES[page]) {
      Router.navigate(page, params);
    }
  });

  // Sidebar toggle button click
  document.getElementById('sidebar-toggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  // Clicking outside sidebar closes it on mobile
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle?.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  // Nav items
  $$('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate(item.dataset.page);
      document.getElementById('sidebar')?.classList.remove('open');
    });
  });
  
  // Quick add student button
  document.getElementById('topbar-quick-add')?.addEventListener('click', () => {
    if (Router.current !== 'students') Router.navigate('students');
    document.getElementById('sidebar')?.classList.remove('open');
    setTimeout(() => showAddStudentModal?.(), 100);
  });

  // Multi-window role test dropdown toggle
  const roleSwitchBtn = document.getElementById('topbar-role-switch-btn');
  const roleMenu = document.getElementById('topbar-role-menu');
  if (roleSwitchBtn && roleMenu) {
    roleSwitchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      roleMenu.style.display = roleMenu.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => {
      if (roleMenu) roleMenu.style.display = 'none';
    });
  }
  
  // Handle hash on load
  const hash = window.location.hash.replace('#', '');
  if (hash && PAGES[hash]) {
    // Will be navigated to after auth check
    window._initialPage = hash;
  }
  
  // Button ripple effect
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
  
  // Global search shortcut '/'
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      const searchInput = document.getElementById('student-search') || 
                          document.getElementById('search-input') || 
                          document.querySelector('input[type="search"]') || 
                          document.querySelector('.search-bar input') ||
                          document.querySelector('.search-input-wrap input');
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
  });
  
  // Initialize auth
  initAuth().then(() => {
    // Navigate to initial hash page if auth was successful
    if (window._initialPage && Router.current) {
      Router.navigate(window._initialPage);
      window._initialPage = null;
    }
  });
});

// Override showApp to navigate to initial page
const _originalShowApp = window.showApp;
window.showApp = function(me) {
  _originalShowApp(me);
  const targetPage = window._initialPage || 'dashboard';
  Router.navigate(targetPage);
  window._initialPage = null;

  // Auto JSON backup check (every 48 hours)
  try {
    const lastBackup = localStorage.getItem('last_auto_download_backup');
    const now = Date.now();
    const interval = 48 * 60 * 60 * 1000; // 48 hours
    if (!lastBackup || now - parseInt(lastBackup) >= interval) {
      console.log('[Backup] Triggering client-side automated JSON backup download...');
      const a = document.createElement('a');
      a.href = '/api/sync/export';
      const d = new Date();
      const filename = `tuition_erp_backup_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.json`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      localStorage.setItem('last_auto_download_backup', String(now));
    }
  } catch (e) {
    console.error('Auto backup check failed:', e);
  }
};

window.Router = Router;

