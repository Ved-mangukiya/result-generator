/* ═══════════════════════════════════════════════
   DASHBOARD.JS — Enriched Dashboard
   ═══════════════════════════════════════════════ */

async function renderDashboard() {
  setPageTitle('Dashboard', 'Dashboard');
  
  if (window._dashCharts) {
    Object.values(window._dashCharts).forEach(c => { if (c) c.destroy(); });
    window._dashCharts = {};
  }
  
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Dashboard</h1>
        <p id="dash-greeting">Overview of your coaching institute</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" onclick="Router.navigate('import')">${Icons?.render?.('import',{size:14}) || ''} Import Excel</button>
        <button class="btn btn-primary btn-sm" onclick="Router.navigate('students')">${Icons?.render?.('add',{size:14}) || ''} Add Student</button>
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
          <span>${Icons?.render?.('dashboard',{size:18}) || ''}</span>
          <h3>Getting Started Checklist</h3>
        </div>
        <span class="badge badge-gold" id="checklist-progress-badge">0/4 Complete</span>
      </div>
      <div class="card-body p-4">
        <div class="grid grid-4 gap-4" id="checklist-steps">
          ${[1,2,3,4].map(() => `
            <div class="stat-card flex flex-col items-start justify-between" style="border: 1px solid var(--border); background: var(--bg-card);">
              <div class="flex justify-between items-center w-full mb-2">
                <div class="skeleton" style="width:28px; height:28px; border-radius:var(--radius-sm)"></div>
                <div class="skeleton" style="width:16px; height:16px; border-radius:50%"></div>
              </div>
              <div class="w-full">
                <div class="skeleton skeleton-title" style="width:60%"></div>
                <div class="skeleton skeleton-text" style="width:80%; height:10px"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Calendar Card -->
    <div class="card mb-6 animate-fade-in" id="dashboard-calendar-card">
      <div class="card-header flex justify-between items-center" style="background: rgba(255, 255, 255, 0.01); border-bottom: 1px solid var(--border)">
        <div class="flex items-center gap-2">
          <span>${Icons?.render?.('calendar',{size:18}) || ''}</span>
          <h3 style="font-weight:700;">Coaching &amp; School Exams Calendar</h3>
        </div>
        <div class="flex items-center gap-3">
          <button class="btn btn-outline btn-sm btn-icon" onclick="navigateCalendar(-12)" style="padding: 2px 8px;" title="Previous Year">«</button>
          <button class="btn btn-outline btn-sm btn-icon" id="cal-prev-month" onclick="navigateCalendar(-1)" style="padding: 2px 8px;" title="Previous Month">&larr;</button>
          <span style="font-weight:700; color:var(--text-primary); font-size:1rem; min-width: 160px; text-align: center; display: inline-block; cursor: pointer;" id="cal-month-year" onclick="showCalendarYearPicker()" title="Click to jump to specific year">June 2026</span>
          <button class="btn btn-outline btn-sm btn-icon" id="cal-next-month" onclick="navigateCalendar(1)" style="padding: 2px 8px;" title="Next Month">&rarr;</button>
          <button class="btn btn-outline btn-sm btn-icon" onclick="navigateCalendar(12)" style="padding: 2px 8px;" title="Next Year">»</button>
        </div>
      </div>
      <div class="card-body p-4">
        <!-- Calendar Grid -->
        <div id="calendar-grid-container">
          <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; margin-top:10px">
            ${Array.from({length:35}).map(() => `<div class="skeleton" style="height:105px; border-radius:var(--radius)"></div>`).join('')}
          </div>
        </div>
        
        <!-- Legend -->
        <div class="flex gap-4 flex-wrap mt-4 text-xs text-muted" style="align-items: center; border-top: 1px solid var(--border); padding-top: 12px;">
          <div style="display:flex; align-items:center; gap:6px"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444;"></span> Holidays &amp; Festivals</div>
          <div style="display:flex; align-items:center; gap:6px"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:rgba(59, 130, 246, 0.15); border:1px solid #3b82f6;"></span> Coaching Tests</div>
          <div style="display:flex; align-items:center; gap:6px"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:rgba(234, 179, 8, 0.15); border:1px solid #eab308;"></span> School Exams</div>
          <div style="display:flex; align-items:center; gap:6px"><span style="display:inline-block; width:12px; height:12px; border-radius:3px; border:1px dashed var(--accent);"></span> Custom Notes</div>
          <div style="display:flex; align-items:center; gap:6px; margin-left: auto;" class="flex gap-2 flex-wrap">
            <strong>Test Series Ranges:</strong>
            <span style="display:flex; align-items:center; gap:4px"><span style="display:inline-block; width:12px; height:6px; background:#a855f7; border-radius:2px;"></span> Class 10 (Purple)</span>
            <span style="display:flex; align-items:center; gap:4px"><span style="display:inline-block; width:12px; height:6px; background:#14b8a6; border-radius:2px;"></span> Class 12 (Teal)</span>
            <span style="display:flex; align-items:center; gap:4px"><span style="display:inline-block; width:12px; height:6px; background:#3b82f6; border-radius:2px;"></span> Others (Blue)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Row: Upcoming Tests + Fees Summary -->
    <div class="grid gap-6 mb-6" style="grid-template-columns:1fr 1fr">
      <!-- Upcoming Tests -->
      <div class="card">
        <div class="card-header">
          <h3>${Icons?.render?.('calendar',{size:18}) || ''} Upcoming Tests</h3>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('tests')">Manage →</button>
        </div>
        <div id="upcoming-tests-body" class="card-body" style="padding:var(--space-4)">
          <div style="display:flex; flex-direction:column; gap:12px">
            ${[1,2].map(() => `
              <div style="border: 1px solid var(--border); background: var(--bg-card); border-radius: var(--radius); padding: var(--space-4)">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
                  <div class="skeleton" style="width:140px; height:16px"></div>
                  <div class="skeleton" style="width:60px; height:16px; border-radius:9999px"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center">
                  <div style="flex:1">
                    <div class="skeleton skeleton-title" style="width:50%; height:14px"></div>
                    <div class="skeleton skeleton-text" style="width:75%; height:10px; margin-top:6px"></div>
                  </div>
                  <div class="skeleton" style="width:50px; height:16px; border-radius:9999px"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Fee Collection Summary -->
      <div class="card">
        <div class="card-header">
          <h3>${Icons?.render?.('fees',{size:18}) || ''} Fee Collection</h3>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('students')">View →</button>
        </div>
        <div id="fees-summary-body" class="card-body" style="padding:var(--space-5)">
          <div style="display:flex; gap:20px; align-items:center; justify-content:space-between; flex-wrap:wrap">
            <div style="flex:1; min-width:200px; display:flex; flex-direction:column; gap:12px">
              <div style="display:flex; justify-content:space-between; align-items:flex-end">
                <div>
                  <div class="skeleton" style="width:80px; height:12px; margin-bottom:6px"></div>
                  <div class="skeleton" style="width:120px; height:24px"></div>
                </div>
                <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end">
                  <div class="skeleton" style="width:80px; height:12px; margin-bottom:6px"></div>
                  <div class="skeleton" style="width:60px; height:20px"></div>
                </div>
              </div>
              <div class="skeleton" style="width:100%; height:8px; border-radius:100px"></div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
                <div class="skeleton" style="height:44px; border-radius:var(--radius)"></div>
                <div class="skeleton" style="height:44px; border-radius:var(--radius)"></div>
              </div>
            </div>
            <div class="skeleton" style="width:110px; height:110px; border-radius:50%; flex-shrink:0"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Class Stats + Activity -->
    <div class="grid gap-6" style="grid-template-columns:1fr 340px">
      <!-- Class Performance -->
      <div class="card">
        <div class="card-header">
          <h3>${Icons?.render?.('chart',{size:18}) || ''} Class Performance</h3>
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('results')">View Results →</button>
        </div>
        <div id="class-stats-body" class="card-body" style="padding:var(--space-4)">
          <div class="skeleton" style="width:100%; height:180px; border-radius:var(--radius); margin-bottom:16px"></div>
          <div class="skeleton" style="width:100%; height:120px; border-radius:var(--radius)"></div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <h3>${Icons?.render?.('clock',{size:18}) || ''} Recent Activity</h3>
        </div>
        <div id="activity-log-body" class="card-body" style="padding:var(--space-4); display:flex; flex-direction:column; gap:12px">
          ${[1,2,3,4,5].map(() => `
            <div style="display:flex; gap:10px; align-items:flex-start">
              <div class="skeleton" style="width:8px; height:8px; border-radius:50%; margin-top:6px; flex-shrink:0"></div>
              <div style="flex:1">
                <div class="skeleton" style="width:80px; height:10px; margin-bottom:4px"></div>
                <div class="skeleton" style="width:85%; height:12px; margin-bottom:4px"></div>
                <div class="skeleton" style="width:50px; height:8px"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card mt-6">
      <div class="card-header"><h3>${Icons?.render?.('arrowRight', {size:16}) || ''} Quick Actions</h3></div>
      <div class="card-body">
        <div class="grid grid-4 gap-3">
          ${ [
            { icon:'boards',    label:'Add Board',      page:'boards',    sub:'Setup a new board' },
            { icon:'students',  label:'Add Student',    page:'students',  sub:'Enroll manually' },
            { icon:'import',    label:'Import Excel',   page:'import',    sub:'Bulk student import' },
            { icon:'tests',     label:'Test Tracker',   page:'tests',     sub:'Manage test series' },
            { icon:'results',   label:'View Results',   page:'results',   sub:'Marks & PDF cards' },
            { icon:'fees',      label:'Fee Ledger',     page:'students',  sub:'Track payments' },
            { icon:'reminders', label:'Send Notice',    page:'reminders', sub:'PDF announcements' },
            { icon:'settings',  label:'Settings',       page:'settings',  sub:'Profile & config' },
          ].map(a => `
            <button class="stat-card hover-lift" style="cursor:pointer;border:none;text-align:left" onclick="Router.navigate('${a.page}')">
              <div class="stat-card-icon blue" style="width:38px;height:38px;display:flex;align-items:center;justify-content:center">${Icons?.render?.(a.icon, {size:20}) || ''}</div>
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
    _calendarEventsData = null; // force calendar data reload on dashboard load
    const [data, coaching] = await Promise.all([API.dashboard.get(), API.coaching.get()]);
    renderDashboardStats(data);
    renderChecklist(coaching, data);
    renderCalendarWidget();
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
    { label: 'Set Up Profile', desc: 'Add address & logo', done: !!(safeCoaching.name && safeCoaching.onboarding_complete), page: 'settings', icon: Icons?.render?.('school',{size:20}) || '' },
    { label: 'Setup Classrooms', desc: 'Setup standards & subjects', done: data.totalStandards > 0, page: 'boards', icon: Icons?.render?.('boards',{size:20}) || '' },
    { label: 'Enroll Students', desc: 'Add manually or import Excel', done: data.totalStudents > 0, page: 'students', icon: Icons?.render?.('students',{size:20}) || '' },
    { label: 'Test Tracker', desc: 'Record unit exams & test scores', done: data.totalTests > 0, page: 'tests', icon: Icons?.render?.('tests',{size:20}) || '' }
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
          <span>${s.icon}</span>
          <span style="font-weight:700; color:${s.done ? 'var(--success)' : 'var(--text-muted)'}; font-size:1.1rem">${s.done ? (Icons?.render?.('check',{size:16}) || '✓') : '○'}</span>
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
    { icon: Icons?.render?.('students',{size:20}) || '', label: 'Students', value: data.totalStudents || 0, iconClass: 'green', link: 'students' },
    { icon: Icons?.render?.('boards',{size:20}) || '', label: 'Classes', value: data.totalStandards || 0, iconClass: 'blue', link: 'boards' },
    { icon: Icons?.render?.('tests',{size:20}) || '', label: 'Tests Scheduled', value: data.totalTests || 0, iconClass: 'purple', link: 'tests' },
    { icon: Icons?.render?.('clock',{size:20}) || '', label: 'Pending Marks', value: data.pendingMarks || 0, iconClass: 'gold', link: 'tests', valueColor: pendingColor },
  ];
  
  document.getElementById('stats-grid').innerHTML = stats.map(s => `
    <div class="stat-card stagger-item hover-lift" style="cursor:pointer" onclick="Router.navigate('${s.link}')">
      <div class="stat-card-icon ${s.iconClass}" style="display:flex;align-items:center;justify-content:center">${s.icon}</div>
      <div class="stat-card-value" style="${s.valueColor ? 'color:'+s.valueColor : ''}" data-target="${s.value}">${s.value}</div>
      <div class="stat-card-label">${s.label}</div>
    </div>`).join('');
  
  $$('[data-target]').forEach(el => animateCount(el, parseInt(el.dataset.target) || 0));
}

function renderUpcomingTests(tests) {
  const body = document.getElementById('upcoming-tests-body');
  if (!tests || tests.length === 0) {
    body.innerHTML = `<div class="empty-state" style="padding:var(--space-8)">
      <div class="empty-state-icon" style="font-size:1.8rem">${Icons?.render?.('calendar',{size:24}) || ''}</div>
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
      formattedDate = testDateObj.toLocaleDateString('en-IN', { weekday: 'long' }) + ', ' + Format.date(dateStr);
    }

    const dayCardBorder = isMultiple
      ? 'border: 1px solid rgba(212, 175, 55, 0.4); background: linear-gradient(135deg, rgba(212, 175, 55, 0.03) 0%, var(--bg-card) 100%); box-shadow: var(--shadow-sm), var(--shadow-accent)'
      : 'border: 1px solid var(--border); background: var(--bg-card)';

    html += `
      <div class="hover-lift" style="border-radius: var(--radius); padding: var(--space-4); ${dayCardBorder}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3)">
          <div style="display: flex; align-items: center; gap: var(--space-2)">
            <span>${Icons?.render?.('calendar',{size:16}) || ''}</span>
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

  // Build standard breakdown rows
  const standardRows = (data.standardFees || []).map(sf => {
    const sExpect = sf.total_expected || 0;
    const sCollect = sf.total_collected || 0;
    const sPending = Math.max(0, sf.total_pending || 0);
    const sPct = sExpect > 0 ? Math.round((sCollect / sExpect) * 100) : 0;
    const pendingStyle = sPending > 0 ? 'color: var(--danger); font-weight: 600;' : 'color: var(--text-muted);';
    return `
      <tr>
        <td style="font-weight: 600; color: var(--text-primary); padding: 8px 10px;">${sf.standard_name}</td>
        <td style="text-align: right; padding: 8px 10px;">₹${Format.number(sExpect)}</td>
        <td style="text-align: right; color: var(--success); font-weight: 600; padding: 8px 10px;">₹${Format.number(sCollect)}</td>
        <td style="text-align: right; padding: 8px 10px; ${pendingStyle}">₹${Format.number(sPending)}</td>
        <td style="text-align: right; padding: 8px 10px;"><span class="badge ${sPct >= 80 ? 'badge-success' : sPct >= 50 ? 'badge-warning' : 'badge-danger'}" style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">${sPct}%</span></td>
      </tr>
    `;
  }).join('');

  const breakdownHTML = `
    <div style="margin-top: var(--space-4); border-top: 1px solid var(--border); padding-top: var(--space-4)">
      <h4 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: var(--space-3); display: flex; align-items: center; gap: 6px; font-weight: 700;">
        <span>${Icons?.render?.('boards',{size:14}) || ''}</span> Class Breakdown
      </h4>
      <div class="table-wrap" style="max-height: 160px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius)">
        <table class="table" style="font-size: 0.78rem; margin-bottom: 0; width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02);">
              <th style="text-align: left; padding: 8px 10px; color: var(--text-muted); font-weight: 700;">Class</th>
              <th style="text-align: right; padding: 8px 10px; color: var(--text-muted); font-weight: 700;">Expected</th>
              <th style="text-align: right; padding: 8px 10px; color: var(--text-muted); font-weight: 700;">Collected</th>
              <th style="text-align: right; padding: 8px 10px; color: var(--text-muted); font-weight: 700;">Pending</th>
              <th style="text-align: right; padding: 8px 10px; color: var(--text-muted); font-weight: 700;">Rate</th>
            </tr>
          </thead>
          <tbody>
            ${standardRows || '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding: 10px;">No class fees recorded</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  body.innerHTML = `
    <div style="display:flex; gap: var(--space-5); align-items: center; justify-content: space-between; flex-wrap: wrap;">
      <div style="flex:1; min-width: 200px; display:flex; flex-direction:column; gap:var(--space-3)">
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div>
            <div class="text-xs text-muted">Total Collected</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--success)">₹${Format.number(collected)}</div>
          </div>
          <div style="text-align:right">
            <div class="text-xs text-muted">Collection Rate</div>
            <div style="font-size:1.2rem;font-weight:700;color:${barColor}">${pct}%</div>
          </div>
        </div>

        <div style="background:var(--bg-surface);border-radius:100px;height:8px;overflow:hidden">
          <div style="background:${barColor};height:100%;width:${pct}%;border-radius:100px;transition:width 0.8s ease"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">
          <div style="background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.2);border-radius:var(--radius);padding:var(--space-2) var(--space-3)">
            <div class="text-xs text-muted">Expected</div>
            <div style="font-weight:700;color:var(--success);font-size:0.875rem">₹${Format.number(expected)}</div>
          </div>
          <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius);padding:var(--space-2) var(--space-3)">
            <div class="text-xs text-muted">Pending</div>
            <div style="font-weight:700;color:var(--danger);font-size:0.875rem">₹${Format.number(pending)}</div>
          </div>
        </div>
      </div>
      
      <div style="width: 110px; height: 110px; flex-shrink: 0; position: relative;">
        <canvas id="fees-doughnut-chart"></canvas>
      </div>
    </div>
    ${breakdownHTML}`;

  const ctx = document.getElementById('fees-doughnut-chart')?.getContext('2d');
  if (ctx) {
    if (window._dashCharts?.['fees']) window._dashCharts['fees'].destroy();
    window._dashCharts = window._dashCharts || {};
    window._dashCharts['fees'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Collected', 'Pending'],
        datasets: [{
          data: [collected, pending],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        cutout: '70%'
      }
    });
  }
}

function renderClassStats(classStats) {
  const body = document.getElementById('class-stats-body');
  if (!classStats || classStats.length === 0) {
    body.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">${Icons?.render?.('chart',{size:32}) || ''}</div>
      <h3>No Classes Yet</h3>
      <p>Add a board and standard to start tracking results.</p>
      <button class="btn btn-primary" onclick="Router.navigate('boards')">${Icons?.render?.('add',{size:14}) || ''} Add Board</button>
    </div>`;
    return;
  }
  
  body.innerHTML = `
    <div style="padding: var(--space-4)">
      <div style="height: 180px; margin-bottom: var(--space-4)">
        <canvas id="class-performance-chart"></canvas>
      </div>
      <div class="table-wrap">
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
        </table>
      </div>
    </div>`;

  const activeStats = classStats.filter(c => c.total > 0);
  if (activeStats.length > 0) {
    const labels = activeStats.map(c => c.standard_name);
    const passRates = activeStats.map(c => c.total > 0 ? Math.round((c.pass / c.total) * 100) : 0);
    
    const chartCtx = document.getElementById('class-performance-chart')?.getContext('2d');
    if (chartCtx) {
      if (window._dashCharts?.['performance']) window._dashCharts['performance'].destroy();
      window._dashCharts = window._dashCharts || {};
      window._dashCharts['performance'] = new Chart(chartCtx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Pass Rate (%)',
            data: passRates,
            backgroundColor: 'rgba(212, 175, 55, 0.75)',
            borderColor: 'var(--accent)',
            borderWidth: 1.5,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: 'var(--text-muted)', font: { size: 9 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: 'var(--text-muted)', font: { size: 9 } }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  }
}

function renderActivityLog(activities) {
  const body = document.getElementById('activity-log-body');
  if (!activities || activities.length === 0) {
    body.innerHTML = `<p class="text-muted text-sm text-center" style="padding:var(--space-6)">No recent activity</p>`;
    return;
  }

  const MAX_SHOWN = 6;
  const shown = activities.slice(0, MAX_SHOWN);
  const hasMore = activities.length > MAX_SHOWN;

  const actionLabels = {
    'STUDENT_ADD': 'Student Enrolled', 'STUDENT_DELETE': 'Student Removed',
    'STUDENT_UPDATE': 'Student Updated', 'TEST_CREATE': 'Test Created',
    'TEST_DELETE': 'Test Deleted', 'TEST_UPDATE': 'Test Updated',
    'TEST_MARKS_SAVE': 'Marks Saved', 'TEST_MARKS_IMPORT': 'Marks Imported',
    'TEST_BULK_CREATE': 'Bulk Tests Created', 'BOARD_CREATE': 'Board Created',
    'SUBJECT_ADD': 'Subject Added', 'CYCLE_CREATE': 'Cycle Created',
    'PDF_EXPORT': 'PDF Exported', 'MARKS_UPDATE': 'Marks Updated',
  };

  const dotColors = {
    add: '#22c55e', delete: '#ef4444', update: '#3b82f6', export: '#f59e0b'
  };

  body.innerHTML = shown.map((a, idx) => {
    let desc = a.description || 'System update';
    desc = desc.replace(/\bundefined\b/gi, '').replace(/\bnull\b/gi, '').trim();
    if (!desc) desc = 'System update';
    const dotClass = getActivityDotClass(a.action);
    const dotColor = dotColors[dotClass] || 'var(--primary-light)';
    const label = actionLabels[a.action] || (a.action ? a.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Activity');
    const timeStr = a.created_at ? Format.datetime(a.created_at) : 'recently';
    const agoStr  = a.created_at ? Format.timeAgo(a.created_at) : '';

    return `
      <div class="activity-item activity-item-animate" style="animation-delay:${idx * 0.05}s">
        <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-top:4px"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:${dotColor};margin-bottom:1px">${label}</div>
          <div class="activity-text" title="${desc}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:help">${desc}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-top:2px">
            <div class="activity-time" title="${timeStr}">${agoStr || timeStr}</div>
            ${agoStr ? `<span style="font-size:0.62rem;color:var(--text-muted);opacity:0.6">· ${timeStr}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  if (hasMore) {
    body.innerHTML += `
      <button class="btn btn-ghost btn-sm w-full mt-3" onclick="viewAllActivities()" style="font-size:0.78rem">
        ${Icons?.render?.('arrowRight', {size:14}) || ''} View all ${activities.length} activities
      </button>`;
  }
}

function viewAllActivities() {
  API.dashboard.get().then(data => {
    const activities = data.recentActivity || [];
    const actionLabels = {
      'STUDENT_ADD': 'Student Enrolled', 'STUDENT_DELETE': 'Student Removed',
      'STUDENT_UPDATE': 'Student Updated', 'TEST_CREATE': 'Test Created',
      'TEST_DELETE': 'Test Deleted', 'TEST_UPDATE': 'Test Updated',
      'TEST_MARKS_SAVE': 'Marks Saved', 'TEST_MARKS_IMPORT': 'Marks Imported',
      'TEST_BULK_CREATE': 'Bulk Tests Created', 'BOARD_CREATE': 'Board Created',
      'SUBJECT_ADD': 'Subject Added', 'CYCLE_CREATE': 'Cycle Created',
      'PDF_EXPORT': 'PDF Exported', 'MARKS_UPDATE': 'Marks Updated',
    };
    const dotColors = { add: '#22c55e', delete: '#ef4444', update: '#3b82f6', export: '#f59e0b' };

    // Group by date
    const groups = {};
    activities.forEach(a => {
      const dateKey = a.created_at ? Format.date(a.created_at) : 'Unknown Date';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(a);
    });

    const groupHTML = Object.entries(groups).map(([date, acts]) => `
      <div style="margin-bottom:20px">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent-dark);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">${date}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${acts.map(a => {
            let desc = (a.description || 'System update').replace(/\bundefined\b/gi, '').replace(/\bnull\b/gi, '').trim();
            const dotClass = getActivityDotClass(a.action);
            const dotColor = dotColors[dotClass] || 'var(--primary-light)';
            const label = actionLabels[a.action] || 'Activity';
            const timeStr = a.created_at ? Format.datetime(a.created_at) : '';
            const timeOnlyStr = timeStr.includes(',') ? timeStr.split(',')[1].trim() : timeStr;
            return `
              <div style="display:flex;gap:10px;align-items:flex-start;padding:10px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius);border-left:3px solid ${dotColor}">
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                    <span style="font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:${dotColor}">${label}</span>
                    <span style="font-size:0.68rem;color:var(--text-muted)">${timeOnlyStr}</span>
                  </div>
                  <div style="font-size:0.82rem;color:var(--text-secondary)">${desc}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`).join('');

    createModal('all-activities', `${Icons?.render?.('clock', {size:18}) || ''} All Activity Log`,
      `<div style="max-height:65vh;overflow-y:auto;padding-right:4px">${groupHTML || '<p class="text-muted text-center" style="padding:40px">No activities yet</p>'}</div>`,
      `<button class="btn btn-outline" onclick="closeModal('all-activities')">Close</button>`,
      'modal-lg'
    );
  }).catch(err => Toast.error('Load Failed', err.message));
}

window.renderDashboard = renderDashboard;
window.viewAllActivities = viewAllActivities;

// Calendar Globals & Implementations
let _currentCalendarDate = new Date();
let _calendarEventsData = null;

async function renderCalendarWidget() {
  const container = document.getElementById('calendar-grid-container');
  if (!container) return;

  const date = _currentCalendarDate;
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthYearLabel = document.getElementById('cal-month-year');
  if (monthYearLabel) {
    monthYearLabel.textContent = `${monthNames[month]} ${year}`;
  }

  try {
    if (!_calendarEventsData) {
      _calendarEventsData = await API.calendarNotes.get();
    }
    
    const { notes, holidays, schoolExams, coachingTests, testCycles } = _calendarEventsData;
    
    const notesMap = {};
    notes.forEach(n => { notesMap[n.note_date] = n.content; });

    const firstDay = new Date(year, month, 1);
    const firstDayIndex = firstDay.getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDaysInMonth = new Date(year, month, 0).getDate();

    let gridHTML = `
      <style>
        .calendar-scroll-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          width: 100%;
          padding-bottom: 4px;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(105px, 1fr));
          gap: 6px;
          min-width: 720px;
          width: 100%;
          box-sizing: border-box;
        }
        .calendar-weekday {
          text-align: center;
          font-weight: 700;
          color: var(--text-muted);
          font-size: 0.75rem;
          padding: 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1.5px solid var(--border-medium);
          background: rgba(255,255,255,0.02);
          border-radius: var(--radius-sm);
        }
        .calendar-day {
          height: 112px;
          min-height: 112px;
          max-height: 112px;
          box-sizing: border-box;
          background: var(--bg-card);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius);
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.18s ease;
          position: relative;
          overflow: hidden;
        }
        .calendar-day:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        .calendar-day.prev-month, .calendar-day.next-month {
          opacity: 0.28;
          cursor: default;
          background: rgba(0,0,0,0.02);
          pointer-events: none;
          border-style: dashed;
        }
        .calendar-day.today {
          border: 2px solid var(--primary-light) !important;
          background: rgba(59, 130, 246, 0.05);
        }
        .calendar-day.has-note {
          border: 1.5px dashed var(--accent) !important;
        }
        .calendar-day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          line-height: 1;
        }
        .calendar-day-num {
          font-weight: 800;
          font-size: 0.88rem;
          color: var(--text-secondary);
        }
        .calendar-day.today .calendar-day-num {
          color: var(--primary-light);
          font-weight: 900;
        }
        .calendar-events {
          display: flex;
          flex-direction: column;
          gap: 2.5px;
          margin-top: 3px;
          flex: 1;
          overflow: hidden;
        }
        .calendar-event-badge {
          font-size: 0.62rem;
          padding: 2px 4px;
          border-radius: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
          line-height: 1.2;
          display: block;
        }
        .calendar-event-badge.holiday {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .calendar-event-badge.test {
          background: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.25);
        }
        .calendar-event-badge.school {
          background: rgba(234, 179, 8, 0.12);
          color: #eab308;
          border: 1px solid rgba(234, 179, 8, 0.25);
        }
        .calendar-event-badge.more {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          font-size: 0.6rem;
          text-align: center;
        }
        .calendar-note-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 4px var(--accent);
        }
        .calendar-range-bars {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 3px;
        }
        .calendar-range-bar {
          height: 4px;
          border-radius: 2px;
        }
      </style>
      <div class="calendar-scroll-wrap">
        <div class="calendar-grid">
    `;

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekdays.forEach(wd => {
      gridHTML += `<div class="calendar-weekday">${wd}</div>`;
    });

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevDaysInMonth - i;
      gridHTML += `
        <div class="calendar-day prev-month">
          <div class="calendar-day-header">
            <span class="calendar-day-num">${dayNum}</span>
          </div>
        </div>`;
    }

    const todayObj = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = todayObj.getFullYear() === year && todayObj.getMonth() === month && todayObj.getDate() === d;
      
      const hasNote = !!notesMap[dayDateStr];
      const holidayName = holidays[dayDateStr] || null;

      const cellDateObj = new Date(year, month, d);
      cellDateObj.setHours(0,0,0,0);

      const dayExams = schoolExams.filter(e => {
        const dObj = new Date(e.exam_date);
        dObj.setHours(0,0,0,0);
        return dObj.getTime() === cellDateObj.getTime();
      });

      const dayTests = coachingTests.filter(t => {
        const dObj = new Date(t.test_date);
        dObj.setHours(0,0,0,0);
        return dObj.getTime() === cellDateObj.getTime();
      });

      const activeCycles = testCycles.filter(tc => {
        if (!tc.start_date || !tc.end_date) return false;
        const start = new Date(tc.start_date);
        const end = new Date(tc.end_date);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return cellDateObj >= start && cellDateObj <= end;
      });

      const dayClasses = [];
      if (isToday) dayClasses.push('today');
      if (hasNote) dayClasses.push('has-note');

      // Collect all badge items
      const badges = [];
      if (holidayName) badges.push({ type: 'holiday', title: `Holiday: ${holidayName}`, label: `🎉 ${holidayName}` });
      dayTests.forEach(t => badges.push({ type: 'test', title: `Test: ${t.name} (${t.standard_name})`, label: `📝 ${t.subject_name}` }));
      dayExams.forEach(e => badges.push({ type: 'school', title: `School Exam: ${e.exam_name} (${e.standard_name})`, label: `🏫 ${e.subject_name}` }));

      const maxVisibleBadges = 2;
      const visibleBadges = badges.slice(0, maxVisibleBadges);
      const remainingCount = badges.length - maxVisibleBadges;

      gridHTML += `
        <div class="calendar-day ${dayClasses.join(' ')}" onclick="openCalendarNoteModal('${dayDateStr}')">
          <div class="calendar-day-header">
            <span class="calendar-day-num">${d}</span>
            ${hasNote ? '<span class="calendar-note-indicator" title="Custom note added"></span>' : ''}
          </div>
          
          <div class="calendar-events">
            ${visibleBadges.map(b => `<div class="calendar-event-badge ${b.type}" title="${b.title}">${b.label}</div>`).join('')}
            ${remainingCount > 0 ? `<div class="calendar-event-badge more">+${remainingCount} more</div>` : ''}
          </div>
          <div class="calendar-range-bars">
            ${activeCycles.slice(0, 2).map(tc => {
              let color = '#3b82f6';
              const name = tc.standard_name || '';
              if (name.includes('10')) color = '#a855f7';
              else if (name.includes('12')) color = '#14b8a6';
              return `<div class="calendar-range-bar" style="background:${color}" title="Series: ${tc.title} (${name})"></div>`;
            }).join('')}
          </div>
        </div>`;
    }

    const totalRenderedCells = firstDayIndex + daysInMonth;
    const nextDaysNeeded = 7 - (totalRenderedCells % 7);
    if (nextDaysNeeded < 7) {
      for (let i = 1; i <= nextDaysNeeded; i++) {
        gridHTML += `
          <div class="calendar-day next-month">
            <div class="calendar-day-header">
              <span class="calendar-day-num">${i}</span>
            </div>
          </div>`;
      }
    }

    gridHTML += `</div></div>`;
    container.innerHTML = gridHTML;

  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${Icons?.render?.('warning',{size:32}) || ''}</div><h3>Error Loading Calendar</h3><p>${err.message}</p></div>`;
  }
}

function navigateCalendar(direction) {
  _currentCalendarDate.setMonth(_currentCalendarDate.getMonth() + direction);
  renderCalendarWidget();
}

function showCalendarYearPicker() {
  const currentYear = _currentCalendarDate.getFullYear();
  const currentMonth = _currentCalendarDate.getMonth();
  const startYear = currentYear - 15;
  const endYear = currentYear + 15;
  
  const years = [];
  for (let y = endYear; y >= startYear; y--) {
    years.push(y);
  }
  
  createModal('year-picker-modal', '📅 Jump to Year', `
    <div style="padding:var(--space-4)">
      <div style="max-height:400px; overflow-y:auto; display:grid; grid-template-columns:repeat(5, 1fr); gap:8px;">
        ${years.map(y => `
          <button class="btn ${y === currentYear ? 'btn-primary' : 'btn-outline'}" 
            onclick="jumpToYear(${y}); closeModal('year-picker-modal')" 
            style="font-size:14px; padding:10px">
            ${y}
          </button>
        `).join('')}
      </div>
    </div>
  `, `<button class="btn btn-outline" onclick="closeModal('year-picker-modal')">Cancel</button>`, 'modal-sm');
}

function jumpToYear(year) {
  _currentCalendarDate = new Date(year, _currentCalendarDate.getMonth(), 1);
  renderCalendarWidget();
}

window.showCalendarYearPicker = showCalendarYearPicker;
window.jumpToYear = jumpToYear;

function openCalendarNoteModal(dateStr) {
  const notes = _calendarEventsData?.notes || [];
  const noteObj = notes.find(n => n.note_date === dateStr);
  const existingNote = noteObj ? noteObj.content : '';

  createModal('calendar-note-modal', `${Icons?.render?.('edit',{size:16}) || ''} Notes for ${Format.date(dateStr)}`,
    `<div class="form-group mb-4">
      <label class="form-label">Custom Calendar Note / Event</label>
      <textarea class="form-control" id="calendar-note-content" rows="4" placeholder="Write reminders, custom events, alternate schedules, or notes here...">${existingNote}</textarea>
      <span class="form-hint">This note will highlight this date on the dashboard calendar. Clear the text to remove the note.</span>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModal('calendar-note-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="saveCalendarNote('${dateStr}')">${Icons?.render?.('save',{size:14}) || ''} Save Note</button>`,
    'modal-md'
  );
}

async function saveCalendarNote(dateStr) {
  const content = document.getElementById('calendar-note-content').value.trim();
  
  Spinner.show('Saving calendar note...');
  try {
    await API.calendarNotes.save(dateStr, content);
    _calendarEventsData = null; // force reload data
    Spinner.hide();
    closeModal('calendar-note-modal');
    Toast.success('Note Saved', 'Dashboard calendar updated successfully.');
    await renderCalendarWidget();
  } catch (err) {
    Spinner.hide();
    Toast.error('Save Failed', err.message);
  }
}

window.renderCalendarWidget = renderCalendarWidget;
window.navigateCalendar = navigateCalendar;
window.openCalendarNoteModal = openCalendarNoteModal;
window.saveCalendarNote = saveCalendarNote;
