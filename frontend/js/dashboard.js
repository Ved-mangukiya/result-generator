/* ═══════════════════════════════════════════════
   DASHBOARD.JS
   ═══════════════════════════════════════════════ */

async function renderDashboard() {
  setPageTitle('Dashboard', 'Dashboard');
  
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Dashboard</h1>
        <p>Overview of your coaching results and activity</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" onclick="Router.navigate('import')">📥 Import Excel</button>
        <button class="btn btn-primary btn-sm" onclick="Router.navigate('students')">➕ Add Student</button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-4 gap-4 mb-6" id="stats-grid">
      ${[1,2,3,4].map(() => `<div class="stat-card"><div class="skeleton skeleton-avatar mb-4"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div></div>`).join('')}
    </div>

    <!-- Getting Started Checklist -->
    <div class="card mb-6" id="dashboard-checklist-card">
      <div class="card-header" style="background: rgba(255, 255, 255, 0.01); border-bottom: 1px solid var(--border)">
        <div class="flex items-center gap-2">
          <span style="font-size:1.1rem;">🚀</span>
          <h3>Getting Started Checklist</h3>
        </div>
        <span class="badge badge-gold" id="checklist-progress-badge">0/4 Complete</span>
      </div>
      <div class="card-body p-4">
        <div class="grid grid-4 gap-4" id="checklist-steps">
          <!-- Dynamically loaded -->
        </div>
      </div>
    </div>

    <!-- Class Stats + Activity -->
    <div class="grid gap-6" style="grid-template-columns:1fr 340px">
      <!-- Class Performance -->
      <div class="card">
        <div class="card-header">
          <h3>📋 Class Performance</h3>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('results')">View Results →</button>
        </div>
        <div id="class-stats-body" class="card-body" style="padding:0">
          <div class="empty-state" style="padding:var(--space-10)">
            <div class="animate-pulse" style="font-size:2rem">📋</div>
            <p class="text-muted text-sm mt-2">Loading class data...</p>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <h3>🕐 Recent Activity</h3>
        </div>
        <div id="activity-log-body" class="card-body" style="padding:var(--space-4)">
          <div class="animate-pulse" style="font-size:1.5rem;text-align:center">🕐</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card mt-6">
      <div class="card-header"><h3>⚡ Quick Actions</h3></div>
      <div class="card-body">
        <div class="grid grid-4 gap-3">
          ${[
            { icon:'🏛', label:'Add Board', page:'boards', sub:'Setup a new board' },
            { icon:'👤', label:'Add Student', page:'students', sub:'Enroll manually' },
            { icon:'📥', label:'Import Excel', page:'import', sub:'Bulk student import' },
            { icon:'📝', label:'Test Tracker', page:'tests', sub:'Manage small tests' },
          ].map(a => `
            <button class="stat-card" style="cursor:pointer;border:none;text-align:left" onclick="Router.navigate('${a.page}')">
              <div class="stat-card-icon blue" style="font-size:1.5rem">${a.icon}</div>
              <div>
                <div style="font-weight:700;color:var(--text-primary);font-size:0.95rem">${a.label}</div>
                <div class="text-xs text-muted mt-1">${a.sub}</div>
              </div>
            </button>`).join('')}
        </div>
      </div>
    </div>`;

  // Load real data
  try {
    const data = await API.dashboard.get();
    const coaching = await API.coaching.get();
    renderDashboardStats(data);
    renderChecklist(coaching, data);
    renderClassStats(data.classStats);
    renderActivityLog(data.recentActivity);
  } catch (err) {
    Toast.error('Dashboard Error', err.message);
  }
}

function renderChecklist(coaching, data) {
  const steps = [
    {
      label: 'Set Up Profile',
      desc: 'Add address & logo',
      done: !!(coaching.name && coaching.onboarding_complete),
      page: 'settings',
      icon: '🏫'
    },
    {
      label: 'Setup Classrooms',
      desc: 'Setup standards & subjects',
      done: data.totalStandards > 0,
      page: 'boards',
      icon: '🏛'
    },
    {
      label: 'Enroll Students',
      desc: 'Add manually or import Excel',
      done: data.totalStudents > 0,
      page: 'students',
      icon: '👥'
    },
    {
      label: 'Small Test Tracker',
      desc: 'Record unit exams & test scores',
      done: data.totalTests > 0,
      page: 'tests',
      icon: '📝'
    }
  ];

  const doneCount = steps.filter(s => s.done).length;
  const progressBadge = document.getElementById('checklist-progress-badge');
  if (progressBadge) {
    progressBadge.textContent = `${doneCount}/${steps.length} Complete`;
    progressBadge.className = `badge ${doneCount === steps.length ? 'badge-success' : 'badge-gold'}`;
  }

  const stepsContainer = document.getElementById('checklist-steps');
  if (stepsContainer) {
    stepsContainer.innerHTML = steps.map((s) => `
      <div class="stat-card flex flex-col items-start justify-between hover-lift" style="border:1px solid ${s.done ? 'var(--success)' : 'var(--border-medium)'}; background:${s.done ? 'rgba(34, 197, 94, 0.02)' : 'var(--bg-card)'}; cursor:pointer;" onclick="Router.navigate('${s.page}')">
        <div class="flex justify-between items-center w-full mb-2">
          <span style="font-size:1.4rem;">${s.icon}</span>
          <span style="font-weight:700; color:${s.done ? 'var(--success)' : 'var(--text-muted)'}; font-size:1.1rem">${s.done ? '✓' : '○'}</span>
        </div>
        <div>
          <div style="font-weight:700; color:${s.done ? 'var(--success)' : 'var(--text-primary)'}; font-size:0.9rem">${s.label}</div>
          <div class="text-xs text-muted mt-1">${s.desc}</div>
        </div>
      </div>
    `).join('');
  }
}

function renderDashboardStats(data) {
  const stats = [
    { icon: '🏛', label: 'Boards', value: data.totalBoards || 0, iconClass: 'blue' },
    { icon: '📚', label: 'Classes', value: data.totalStandards || 0, iconClass: 'purple' },
    { icon: '👥', label: 'Students', value: data.totalStudents || 0, iconClass: 'green' },
    { icon: '📝', label: 'Tests Conducted', value: data.totalTests || 0, iconClass: 'gold' }
  ];
  
  document.getElementById('stats-grid').innerHTML = stats.map(s => `
    <div class="stat-card stagger-item hover-lift">
      <div class="stat-card-icon ${s.iconClass}">${s.icon}</div>
      <div class="stat-card-value" ${s.noAnim ? '' : `data-target="${s.value}"`}>${s.value}</div>
      <div class="stat-card-label">${s.label}</div>
    </div>`).join('');
  
  // Animate counters
  $$('[data-target]').forEach(el => {
    animateCount(el, parseInt(el.dataset.target) || 0);
  });
}

function calcPassRate(classStats) {
  if (!classStats || classStats.length === 0) return 0;
  let total = 0, pass = 0;
  classStats.forEach(c => { total += c.total; pass += c.pass; });
  if (total === 0) return 0;
  return Math.round((pass / total) * 100);
}

function renderClassStats(classStats) {
  const body = document.getElementById('class-stats-body');
  if (!classStats || classStats.length === 0) {
    body.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <h3>No Classes Yet</h3>
      <p>Add a board and standard to start tracking results.</p>
      <button class="btn btn-primary" onclick="Router.navigate('boards')">➕ Add Board</button>
    </div>`;
    return;
  }
  
  body.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="padding:var(--space-3) var(--space-4);font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);text-align:left;border-bottom:1px solid var(--border)">Class</th>
          <th style="padding:var(--space-3) var(--space-4);font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);text-align:center;border-bottom:1px solid var(--border)">Total</th>
          <th style="padding:var(--space-3) var(--space-4);font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);text-align:center;border-bottom:1px solid var(--border)">Pass</th>
          <th style="padding:var(--space-3) var(--space-4);font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);text-align:center;border-bottom:1px solid var(--border)">Fail</th>
          <th style="padding:var(--space-3) var(--space-4);font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);text-align:center;border-bottom:1px solid var(--border)">Dist.</th>
          <th style="padding:var(--space-3) var(--space-4);font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);text-align:center;border-bottom:1px solid var(--border)">Pass%</th>
          <th style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border)"></th>
        </tr>
      </thead>
      <tbody>
        ${classStats.filter(c => c.total > 0).map(c => {
          const passPct = c.total > 0 ? Math.round((c.pass / c.total) * 100) : 0;
          return `<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:var(--space-3) var(--space-4);font-weight:600;color:var(--text-primary)">${c.standard_name}</td>
            <td style="text-align:center;padding:var(--space-3) var(--space-4)">${c.total}</td>
            <td style="text-align:center;padding:var(--space-3) var(--space-4);color:var(--success)">${c.pass}</td>
            <td style="text-align:center;padding:var(--space-3) var(--space-4);color:var(--danger)">${c.fail}</td>
            <td style="text-align:center;padding:var(--space-3) var(--space-4);color:var(--accent)">${c.distinction}</td>
            <td style="text-align:center;padding:var(--space-3) var(--space-4)">
              <span class="badge ${passPct >= 75 ? 'badge-success' : passPct >= 50 ? 'badge-warning' : 'badge-danger'}">${passPct}%</span>
            </td>
            <td style="padding:var(--space-3) var(--space-4)">
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('results', {standardId:${c.standard_id}})">View →</button>
            </td>
          </tr>`;
        }).join('') || '<tr><td colspan="7" style="text-align:center;padding:var(--space-6);color:var(--text-muted)">No student data yet</td></tr>'}
      </tbody>
    </table>`;
}

function renderActivityLog(activities) {
  const body = document.getElementById('activity-log-body');
  if (!activities || activities.length === 0) {
    body.innerHTML = `<p class="text-muted text-sm text-center" style="padding:var(--space-6)">No recent activity</p>`;
    return;
  }
  
  body.innerHTML = activities.map(a => {
    let desc = a.description || 'System update';
    // Sanitize any accidental leakage of "undefined" or "null" strings
    desc = desc.replace(/\bundefined\b/gi, '').replace(/\bnull\b/gi, '').trim();
    if (!desc) desc = 'System update';

    return `
      <div class="activity-item">
        <div class="activity-dot ${getActivityDotClass(a.action)}"></div>
        <div>
          <div class="activity-text">${desc}</div>
          <div class="activity-time">${a.created_at ? Format.timeAgo(a.created_at) : 'recently'}</div>
        </div>
      </div>`;
  }).join('');
}

window.renderDashboard = renderDashboard;
