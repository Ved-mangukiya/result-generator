/* ═══════════════════════════════════════════════
   APP.JS — SPA Router + Navigation + Init
   ═══════════════════════════════════════════════ */

const PAGES = {
  dashboard: { render: () => renderDashboard(), title: 'Dashboard' },
  boards:    { render: () => renderBoards(),    title: 'Boards & Classes' },
  students:  { render: (p) => renderStudents(p), title: 'Students' },
  results:   { render: (p) => renderResults(p),  title: 'Results' },
  tests:     { render: (p) => renderTests(p),    title: 'Test Scheduler' },
  reminders: { render: () => renderReminders(),  title: 'Timetables & Reminders' },
  templates: { render: () => renderTemplates(),  title: 'Templates' },
  import:    { render: () => renderImport(),     title: 'Import Excel' },
  settings:  { render: () => renderSettings(),  title: 'Settings' },
};

const Router = {
  current: null,
  _ignoreHashChange: false,
  
  navigate(page, params = {}) {
    if (!PAGES[page]) { console.warn('Unknown page:', page); return; }
    
    // Update nav active state
    $$('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    
    // Update hash without triggering hashchange loop
    this._ignoreHashChange = true;
    window.location.hash = page;
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
          <div class="empty-state-icon">⚠️</div>
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
    const page = window.location.hash.replace('#', '') || 'dashboard';
    if (Router.current !== page && PAGES[page]) {
      Router.navigate(page);
    }
  });

  // Nav items
  $$('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate(item.dataset.page);
    });
  });
  
  // Quick add student button
  document.getElementById('topbar-quick-add')?.addEventListener('click', () => {
    if (Router.current !== 'students') Router.navigate('students');
    setTimeout(() => showAddStudentModal?.(), 100);
  });
  
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
};

window.Router = Router;
