/* ═══════════════════════════════════════════════
   DASHBOARD.JS — Enriched Dashboard
   ═══════════════════════════════════════════════ */

async function renderDashboard() {
  setPageTitle('Dashboard', 'Dashboard');
  
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Dashboard</h1>
        <p id="dash-greeting">Overview of your coaching institute</p>
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
        <div class="grid grid-4 gap-4" id="checklist-steps"><!-- loaded --></div>
      </div>
    </div>

    <!-- Row: Upcoming Tests + Fees Summary -->
    <div class="grid gap-6 mb-6" style="grid-template-columns:1fr 1fr">
      <!-- Upcoming Tests -->
      <div class="card">
        <div class="card-header">
          <h3>📅 Upcoming Tests</h3>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('tests')">Manage →</button>
        </div>
        <div id="upcoming-tests-body" class="card-body" style="padding:0">
          <div class="empty-state" style="padding:var(--space-8)">
            <div class="animate-pulse" style="font-size:1.5rem">📅</div>
            <p class="text-muted text-sm mt-2">Loading...</p>
          </div>
        </div>
      </div>

      <!-- Fee Collection Summary -->
      <div class="card">
        <div class="card-header">
          <h3>💰 Fee Collection</h3>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('students')">View →</button>
        </div>
        <div id="fees-summary-body" class="card-body" style="padding:var(--space-5)">
          <div class="animate-pulse" style="font-size:1.5rem;text-align:center">💰</div>
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
            { icon:'📊', label:'View Results', page:'results', sub:'Marks & PDF cards' },
            { icon:'💸', label:'Fee Ledger', page:'students', sub:'Track payments' },
            { icon:'🔔', label:'Send Notice', page:'reminders', sub:'PDF announcements' },
            { icon:'⚙', label:'Settings', page:'settings', sub:'Profile & config' },
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

  // Set greeting
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = `${greet} 👋 — Here's what's happening today`;

  // Load real data
  try {
    const [data, coaching] = await Promise.all([API.dashboard.get(), API.coaching.get()]);
    renderDashboardStats(data);
    renderChecklist(coaching, data);
    renderClassStats(data.classStats);
    renderActivityLog(data.recentActivity);
    renderUpcomingTests(data.upcomingTests || []);
    renderFeesSummary(data.feesSummary || {}, data);
  } catch (err) {
    Toast.error('Dashboard Error', err.message);
  }
}

function renderChecklist(coaching, data) {
  const safeCoaching = coaching || {};
  const steps = [
    { label: 'Set Up Profile', desc: 'Add address & logo', done: !!(safeCoaching.name && safeCoaching.onboarding_complete), page: 'settings', icon: '🏫' },
    { label: 'Setup Classrooms', desc: 'Setup standards & subjects', done: data.totalStandards > 0, page: 'boards', icon: '🏛' },
    { label: 'Enroll Students', desc: 'Add manually or import Excel', done: data.totalStudents > 0, page: 'students', icon: '👥' },
    { label: 'Test Tracker', desc: 'Record unit exams & test scores', done: data.totalTests > 0, page: 'tests', icon: '📝' }
  ];

  const doneCount = steps.filter(s => s.done).length;
  const progressBadge = document.getElementById('checklist-progress-badge');
  if (progressBadge) {
    progressBadge.textContent = `${doneCount}/${steps.length} Complete`;
    progressBadge.className = `badge ${doneCount === steps.length ? 'badge-success' : 'badge-gold'}`;
  }
  if (doneCount === steps.length) {
    document.getElementById('dashboard-checklist-card').style.display = 'none';
    return;
  }

  const stepsContainer = document.getElementById('checklist-steps');
  if (stepsContainer) {
    stepsContainer.innerHTML = steps.map(s => `
      <div class="stat-card flex flex-col items-start justify-between hover-lift" style="border:1px solid ${s.done ? 'var(--success)' : 'var(--border-medium)'}; background:${s.done ? 'rgba(34,197,94,0.02)' : 'var(--bg-card)'}; cursor:pointer;" onclick="Router.navigate('${s.page}')">
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
  const pendingColor = (data.pendingMarks || 0) > 0 ? 'var(--warning)' : 'var(--success)';
  const stats = [
    { icon: '👥', label: 'Students', value: data.totalStudents || 0, iconClass: 'green', link: 'students' },
    { icon: '📚', label: 'Classes', value: data.totalStandards || 0, iconClass: 'blue', link: 'boards' },
    { icon: '📝', label: 'Tests Scheduled', value: data.totalTests || 0, iconClass: 'purple', link: 'tests' },
    { icon: '⏳', label: 'Pending Marks', value: data.pendingMarks || 0, iconClass: 'gold', link: 'tests', valueColor: pendingColor },
  ];
  
  document.getElementById('stats-grid').innerHTML = stats.map(s => `
    <div class="stat-card stagger-item hover-lift" style="cursor:pointer" onclick="Router.navigate('${s.link}')">
      <div class="stat-card-icon ${s.iconClass}">${s.icon}</div>
      <div class="stat-card-value" style="${s.valueColor ? 'color:'+s.valueColor : ''}" data-target="${s.value}">${s.value}</div>
      <div class="stat-card-label">${s.label}</div>
    </div>`).join('');
  
  $$('[data-target]').forEach(el => animateCount(el, parseInt(el.dataset.target) || 0));
}

function renderUpcomingTests(tests) {
  const body = document.getElementById('upcoming-tests-body');
  if (!tests || tests.length === 0) {
    body.innerHTML = `<div class="empty-state" style="padding:var(--space-8)">
      <div class="empty-state-icon" style="font-size:1.8rem">📅</div>
      <p class="text-muted text-sm">No upcoming tests scheduled</p>
      <button class="btn btn-outline btn-sm mt-3" onclick="Router.navigate('tests')">Schedule Test</button>
    </div>`;
    return;
  }

  // Group by date
  const groups = {};
  tests.forEach(t => {
    const dStr = t.test_date || 'Undated';
    if (!groups[dStr]) groups[dStr] = [];
    groups[dStr].push(t);
  });

  // Sort dates ascending
  const sortedDates = Object.keys(groups).sort((a, b) => {
    if (a === 'Undated') return 1;
    if (b === 'Undated') return -1;
    return new Date(a) - new Date(b);
  });

  let html = `<div style="padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4)">`;

  sortedDates.forEach(dateStr => {
    const dayTests = groups[dateStr];
    const isMultiple = dayTests.length > 1;

    // Calculate days left relative to current date (local time)
    let dayLabel = '—';
    let urgencyClass = 'badge-gray';
    let formattedDate = 'Undated';
    
    if (dateStr !== 'Undated') {
      const testDateObj = new Date(dateStr);
      testDateObj.setHours(0,0,0,0);
      const todayObj = new Date();
      todayObj.setHours(0,0,0,0);
      
      const diffTime = testDateObj - todayObj;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const isToday = daysLeft === 0;
      const isTomorrow = daysLeft === 1;
      
      urgencyClass = isToday ? 'badge-danger' : isTomorrow ? 'badge-warning' : 'badge-primary';
      dayLabel = isToday ? 'TODAY' : isTomorrow ? 'Tomorrow' : `in ${daysLeft} days`;
      formattedDate = testDateObj.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
    }

    const dayCardBorder = isMultiple
      ? 'border: 1px solid rgba(212, 175, 55, 0.4); background: linear-gradient(135deg, rgba(212, 175, 55, 0.03) 0%, var(--bg-card) 100%); box-shadow: var(--shadow-sm), var(--shadow-accent)'
      : 'border: 1px solid var(--border); background: var(--bg-card)';

    html += `
      <div class="hover-lift" style="border-radius: var(--radius); padding: var(--space-4); ${dayCardBorder}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3)">
          <div style="display: flex; align-items: center; gap: var(--space-2)">
            <span style="font-size: 1.1rem">📅</span>
            <span style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem">${formattedDate}</span>
            <span class="badge ${urgencyClass}" style="font-size: 0.65rem">${dayLabel}</span>
          </div>
          ${isMultiple 
            ? `<span class="badge badge-gold" style="font-weight: 700; font-size: 0.7rem; letter-spacing: 0.05em">🔥 MULTI-EXAM DAY (${dayTests.length})</span>`
            : ''}
        </div>
        
        <div style="display: flex; flex-direction: column; gap: var(--space-2)">
          ${dayTests.map(t => {
            const marksStatus = t.marks_entered > 0 
              ? `<span class="badge badge-success" style="font-size: 0.65rem">Entered</span>` 
              : `<span class="badge badge-warning" style="font-size: 0.65rem">Pending</span>`;
            return `
              <div style="display: grid; grid-template-columns: 1fr 120px 80px; gap: var(--space-3); align-items: center; padding: var(--space-2) var(--space-1); border-bottom: 1px dashed var(--border)">
                <div>
                  <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary)">${t.name}</div>
                  <div class="text-xs text-muted" style="margin-top: 2px">${t.subject_name} (Max: ${t.max_marks})</div>
                </div>
                <div class="text-xs font-semibold" style="color: var(--text-secondary)">🏛 ${t.class_name}</div>
                <div style="text-align: right">${marksStatus}</div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  html += `</div>`;
  body.innerHTML = html;
}

function renderFeesSummary(fees, data) {
  const body = document.getElementById('fees-summary-body');
  const expected = fees.total_expected || 0;
  const collected = fees.total_collected || 0;
  const pending = Math.max(0, expected - collected);
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  const barColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div class="text-xs text-muted">Total Collected</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--success)">₹${Format.number(collected)}</div>
        </div>
        <div style="text-align:right">
          <div class="text-xs text-muted">Collection Rate</div>
          <div style="font-size:1.4rem;font-weight:700;color:${barColor}">${pct}%</div>
        </div>
      </div>

      <div style="background:var(--bg-surface);border-radius:100px;height:8px;overflow:hidden">
        <div style="background:${barColor};height:100%;width:${pct}%;border-radius:100px;transition:width 0.8s ease"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div style="background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.2);border-radius:var(--radius);padding:var(--space-3)">
          <div class="text-xs text-muted">Expected</div>
          <div style="font-weight:700;color:var(--success)">₹${Format.number(expected)}</div>
        </div>
        <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius);padding:var(--space-3)">
          <div class="text-xs text-muted">Pending</div>
          <div style="font-weight:700;color:var(--danger)">₹${Format.number(pending)}</div>
        </div>
      </div>

      <div style="border-top:1px solid var(--border);padding-top:var(--space-3)">
        <div class="flex justify-between text-xs text-muted">
          <span>👥 ${data.totalStudents || 0} students enrolled</span>
          <span>📚 ${data.totalStandards || 0} classes</span>
        </div>
      </div>
    </div>`;
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
          ${['Class','Total','Pass','Fail','Dist.','Pass%',''].map(h => `<th style="padding:var(--space-3) var(--space-4);font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);text-align:${h==='' || h==='Class' ? 'left' : 'center'};border-bottom:1px solid var(--border)">${h}</th>`).join('')}
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
