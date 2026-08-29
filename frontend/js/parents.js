/**
 * EduTrack ERP — Modern Student & Parent Web Portal
 * Interactive, tabbed, highly organized portal with real-time attendance,
 * live test scores, timetable viewer, fee ledgers, and official PDF downloads.
 */

let parentState = {
  selectedStudentId: null,
  studentData: null,
  attendanceData: null,
  allStudents: [],
  activeTab: 'attendance' // 'attendance', 'tests', 'fees', 'timetable', 'notices'
};

async function renderParentsPage(container, params = {}) {
  if (typeof setPageTitle === 'function') {
    setPageTitle('Student & Parent Portal', 'Parent Portal');
  }

  const isParentRole = window._currentUserRole === 'parent';
  const quickAddBtn = document.getElementById('topbar-quick-add');
  if (isParentRole && quickAddBtn) {
    quickAddBtn.style.display = 'none';
  }

  if (params.student_id || params.studentId) {
    parentState.selectedStudentId = parseInt(params.student_id || params.studentId);
  }

  // Pre-fetch all active students for quick search dropdown
  try {
    const res = await API.students.list();
    parentState.allStudents = Array.isArray(res) ? res : (res.students || []);
  } catch (e) {
    console.error('Error fetching students for parent portal:', e);
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>🎓 Student &amp; Parent Portal</h1>
        <p>Real-time portal for attendance, lecture timetable, test marks, fee receipts &amp; notices.</p>
      </div>
      <div class="page-header-actions">
        <span class="badge badge-success" style="padding:6px 14px; font-weight:700;">🟢 Live Portal Active</span>
      </div>
    </div>

    <!-- Student Lookup Card (Admin view only) -->
    <div id="parent-lookup-card" class="card mb-6" style="padding:var(--space-5); background:linear-gradient(135deg, rgba(255,255,255,0.9), rgba(243,246,251,0.98)); border:1.5px solid rgba(201,169,110,0.35); ${isParentRole ? 'display:none;' : ''}">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="flex:1; min-width:280px;">
          <label class="form-label font-bold text-xs" style="margin-bottom:4px; display:block;">🔍 Select Student Profile to View as Parent</label>
          <select id="parent-student-select" class="glass-select" style="width:100%;">
            <option value="">Choose Student from Directory...</option>
            ${parentState.allStudents.map(s => `
              <option value="${s.id}" ${s.id == parentState.selectedStudentId ? 'selected' : ''}>
                [Roll: ${s.roll_number || 'N/A'}] ${s.first_name ? `${s.first_name} ${s.surname || ''}` : s.name} (${s.standard_name || 'Class'})
              </option>
            `).join('')}
          </select>
        </div>
        <div style="display:flex; gap:8px; align-items:flex-end;">
          <button class="btn btn-primary btn-sm" id="parent-load-btn" style="height:38px; font-weight:700;">
            <span>Load Student Portal</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Parent Dashboard View -->
    <div id="parent-dashboard-view">
      <div class="empty-state card" style="padding:var(--space-12);">
        <div class="empty-state-icon">👨‍🎓</div>
        <h3>Loading Student Dashboard...</h3>
      </div>
    </div>
  `;

  // Attach search button listener
  document.getElementById('parent-load-btn')?.addEventListener('click', () => {
    const studentId = document.getElementById('parent-student-select').value;
    if (studentId) {
      parentState.selectedStudentId = studentId;
      loadParentDashboardData(studentId);
    } else {
      Toast.warning('Select Student', 'Please select a student from the dropdown first.');
    }
  });

  document.getElementById('parent-student-select')?.addEventListener('change', (e) => {
    if (e.target.value) {
      parentState.selectedStudentId = e.target.value;
      loadParentDashboardData(e.target.value);
    }
  });

  if (parentState.selectedStudentId) {
    loadParentDashboardData(parentState.selectedStudentId);
  } else if (parentState.allStudents && parentState.allStudents.length > 0) {
    parentState.selectedStudentId = parentState.allStudents[0].id;
    loadParentDashboardData(parentState.selectedStudentId);
  }
}

async function loadParentDashboardData(studentId) {
  const container = document.getElementById('parent-dashboard-view');
  if (!container) return;

  container.innerHTML = `
    <div class="card text-center" style="padding:var(--space-12)">
      <div class="spinner spinner-lg mx-auto mb-4"></div>
      <h3>Loading Student Portal...</h3>
    </div>
  `;

  try {
    // 1. Fetch Student profile & Attendance log
    const attRes = await API.request(`/attendance/student/${studentId}`);
    const student = attRes.student;
    const attStats = attRes.stats;
    const attRecords = attRes.records || [];

    // 2. Fetch Timetable, Announcements, Test marks & Fee payments
    let timetable = [];
    try {
      const ttRes = await API.request(`/timetable?standard_id=${student.standard_id}`);
      timetable = ttRes.slots || [];
    } catch (e) {}

    let announcements = [];
    try {
      const remRes = await API.request('/calendar-notes');
      announcements = remRes.notes || remRes.reminders || [];
    } catch (e) {}

    let testMarks = [];
    try {
      const testsRes = await API.request(`/tests/student/${studentId}`);
      testMarks = testsRes.marks || [];
    } catch (e) {}

    let feePayments = [];
    try {
      const feesRes = await API.request(`/fees/student/${studentId}`);
      feePayments = feesRes.payments || [];
    } catch (e) {}

    renderParentDashboardUI(container, student, attStats, attRecords, testMarks, feePayments, timetable, announcements);
  } catch (err) {
    console.error('Error loading student dashboard:', err);
    container.innerHTML = `
      <div class="card text-center text-danger" style="padding:var(--space-8)">
        <h3>Error Loading Student Data</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

function renderParentDashboardUI(container, student, attStats, attRecords, testMarks, feePayments, timetable, announcements) {
  const attendancePct = attStats.percentage !== null ? attStats.percentage : null;
  const remainingFees = Math.max(0, (student.total_fees || 0) - (student.paid_fees || 0));

  // Determine Institution Level
  const className = (student.class_name || '').toLowerCase();
  const isCollegeMode = className.includes('11') || className.includes('12') || className.includes('college') ||
                        className.includes('hsc') || className.includes('b.tech') || className.includes('degree') ||
                        className.includes('sem') || className.includes('university') || className.includes('phd');

  // Determine Today's Attendance Status accurately
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = attRecords.filter(r => r.attendance_date === todayStr);

  let todayBadgeBg = 'linear-gradient(135deg, #334155, #475569)';
  let todayStatusText = '⚪ ATTENDANCE UNRECORDED';
  let todaySubtext = `Attendance has not been taken yet for today (${todayStr}).`;

  if (todayRecords.length > 0) {
    const presentRecs = todayRecords.filter(r => r.status === 'Present' || r.status === 'Late');
    const absentRecs = todayRecords.filter(r => r.status === 'Absent');
    const pctToday = Math.round((presentRecs.length / todayRecords.length) * 100);

    if (absentRecs.length === todayRecords.length) {
      todayBadgeBg = 'linear-gradient(135deg, #ef4444, #dc2626)';
      todayStatusText = '❌ ABSENT TODAY';
      todaySubtext = `Marked Absent on ${todayStr}`;
    } else if (pctToday >= 80) {
      todayBadgeBg = 'linear-gradient(135deg, #10b981, #059669)';
      todayStatusText = `✅ ${isCollegeMode ? 'ATTENDED TODAY' : 'PRESENT TODAY'} (${pctToday}%)`;
      todaySubtext = `${presentRecs.length} of ${todayRecords.length} lectures attended on ${todayStr}`;
    } else {
      todayBadgeBg = 'linear-gradient(135deg, #f59e0b, #d97706)';
      todayStatusText = `⚠️ PARTIAL ATTENDANCE (${pctToday}%)`;
      todaySubtext = `${presentRecs.length} attended, ${absentRecs.length} missed on ${todayStr}`;
    }
  }

  // Filter today's timetable day
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[new Date().getDay()] === 'Sunday' ? 'Monday' : daysOfWeek[new Date().getDay()];
  const todaySlots = timetable.filter(t => t.day_of_week === todayDayName || t.day_of_week === 'Monday');

  // Subject-wise attendance calculation for College Mode
  const subjectAttMap = {};
  attRecords.forEach(r => {
    const subjName = r.subject_name || 'Daily Roll Call';
    if (!subjectAttMap[subjName]) subjectAttMap[subjName] = { total: 0, present: 0 };
    subjectAttMap[subjName].total++;
    if (r.status === 'Present' || r.status === 'Late') subjectAttMap[subjName].present++;
  });

  const photoThumb = student.photo_path ? (student.photo_path.startsWith('/') ? student.photo_path : `/${student.photo_path}`) : null;
  const fullName = student.first_name ? `${student.first_name} ${student.surname || ''}` : student.name;

  container.innerHTML = `
    <!-- TODAY'S ATTENDANCE HERO BANNER -->
    <div class="card mb-5" style="background:${todayBadgeBg}; color:white; padding:var(--space-6); border-radius:var(--radius-xl); box-shadow:0 10px 25px -5px rgba(0,0,0,0.2);">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:var(--space-4);">
        <div style="display:flex; align-items:center; gap:var(--space-5);">
          <div style="width:76px; height:76px; border-radius:50%; background:rgba(255,255,255,0.2); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; font-size:2.2rem; border:2.5px solid rgba(255,255,255,0.5); overflow:hidden;">
            ${photoThumb ? `<img src="${photoThumb}" style="width:100%;height:100%;object-fit:cover;">` : (student.first_name ? student.first_name[0] : '🎓')}
          </div>
          <div>
            <div style="font-size:0.75rem; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.85); margin-bottom:2px;">
              ${isCollegeMode ? '🏫 College / University Mode' : '🏫 School Mode'} — Daily Status
            </div>
            <h2 style="color:white; font-size:1.6rem; font-weight:900; margin-bottom:4px; text-shadow:0 2px 4px rgba(0,0,0,0.2);">
              ${todayStatusText}
            </h2>
            <div style="color:rgba(255,255,255,0.9); font-size:0.875rem;">
              ${todaySubtext}
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="downloadStudentCredentialSlip(${student.id}, '${fullName.replace(/'/g, "\\'")}', '${student.roll_number}')" style="background:rgba(255,255,255,0.15); color:white; border-color:rgba(255,255,255,0.4); font-weight:700;">
            📇 Credential Slip
          </button>
          <button class="btn btn-warm btn-sm" onclick="window.print()" style="font-weight:700;">
            🖨️ Print Statement
          </button>
        </div>
      </div>
    </div>

    <!-- STUDENT PROFILE SUMMARY BAR -->
    <div class="card mb-5" style="background:var(--bg-surface); padding:var(--space-4) var(--space-5);">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h3 style="font-size:1.25rem; font-weight:800; color:var(--navy); margin:0;">${fullName}</h3>
            <span class="badge badge-primary font-mono font-bold">Roll #${student.roll_number || '—'}</span>
          </div>
          <p class="text-xs text-muted" style="margin:4px 0 0 0;">
            Class: <strong>${student.class_name || 'Standard'}</strong> | Father/Guardian: <strong>${student.father_name || 'Guardian'}</strong> | Status: <strong style="color:var(--success)">Active</strong>
          </p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <span class="badge ${attendancePct !== null ? (attendancePct >= 75 ? 'badge-success' : 'badge-warning') : 'badge-secondary'}" style="font-size:0.85rem; padding:6px 12px; font-weight:700;">
            📊 Attendance: ${attendancePct !== null ? `${attendancePct}%` : 'Unrecorded'}
          </span>
          <span class="badge ${remainingFees > 0 ? 'badge-danger' : 'badge-success'}" style="font-size:0.85rem; padding:6px 12px; font-weight:700;">
            💳 Fees: ${remainingFees > 0 ? `₹${remainingFees.toLocaleString('en-IN')} Due` : 'All Cleared'}
          </span>
        </div>
      </div>
    </div>

    <!-- PORTAL NAVIGATION TABS -->
    <div class="tabs mb-5" id="parent-portal-tabs" style="display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn ${parentState.activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="switchParentTab('attendance')">📊 Attendance Log</button>
      <button class="btn ${parentState.activeTab === 'tests' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="switchParentTab('tests')">📝 Exam Marks &amp; Results</button>
      <button class="btn ${parentState.activeTab === 'fees' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="switchParentTab('fees')">💳 Fees &amp; Receipts</button>
      <button class="btn ${parentState.activeTab === 'timetable' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="switchParentTab('timetable')">🗓️ Class Timetable</button>
      <button class="btn ${parentState.activeTab === 'notices' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="switchParentTab('notices')">📢 Notices &amp; Bulletins</button>
    </div>

    <!-- TAB 1: ATTENDANCE LOG -->
    <div id="parent-tab-attendance" class="parent-tab-content" style="${parentState.activeTab === 'attendance' ? 'display:block;' : 'display:none;'}">
      <div class="stat-grid mb-5" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
        <div class="stat-card">
          <div class="stat-card-icon green">📅</div>
          <div class="stat-card-value" style="color:var(--success)">${attendancePct !== null ? `${attendancePct}%` : '—'}</div>
          <div class="stat-card-label">Attendance Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon blue">✅</div>
          <div class="stat-card-value" style="color:#2563eb">${(attStats.present || 0) + (attStats.late || 0)}</div>
          <div class="stat-card-label">Days Present ${attStats.late > 0 ? `<span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(${attStats.late} late tagged)</span>` : ''}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon red">❌</div>
          <div class="stat-card-value" style="color:var(--danger)">${attStats.absent || 0}</div>
          <div class="stat-card-label">Days Absent</div>
        </div>
      </div>

      ${isCollegeMode && Object.keys(subjectAttMap).length > 0 ? `
        <div class="card mb-5">
          <h3 class="mb-3">📚 Subject-wise Lecture Breakdown</h3>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:14px;">
            ${Object.keys(subjectAttMap).map(subj => {
              const data = subjectAttMap[subj];
              const pct = Math.round((data.present / data.total) * 100);
              const color = pct >= 75 ? '#10b981' : (pct >= 60 ? '#f59e0b' : '#ef4444');
              return `
                <div style="background:var(--bg-secondary); border-radius:12px; padding:14px; border:1px solid var(--border-color);">
                  <div style="font-weight:700; font-size:0.9rem; margin-bottom:4px; color:var(--navy);">${subj}</div>
                  <div style="font-size:1.3rem; font-weight:900; color:${color}; font-family:monospace;">${pct}%</div>
                  <div class="text-xs text-muted" style="margin-top:2px;">${data.present} of ${data.total} lectures attended</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div class="card">
        <h3 class="mb-3">📋 Complete Attendance History</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject / Session</th>
                <th>Status</th>
                <th>Marked By</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${attRecords.length > 0 ? attRecords.map(r => `
                <tr>
                  <td class="font-mono font-bold">${r.attendance_date}</td>
                  <td>${r.subject_name || 'Daily Roll Call'}</td>
                  <td>
                    <span class="badge ${r.status === 'Present' ? 'badge-success' : (r.status === 'Late' ? 'badge-warning' : (r.status === 'Absent' ? 'badge-danger' : 'badge-secondary'))}">
                      ${r.status === 'Present' ? '✅ Present' : (r.status === 'Late' ? '⏱️ Late' : (r.status === 'Absent' ? '❌ Absent' : '⚪ Unrecorded'))}
                    </span>
                  </td>
                  <td class="text-xs text-muted">${r.marked_by || 'Teacher'}</td>
                  <td class="text-xs">${r.remarks || '—'}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="5" class="text-center text-muted" style="padding:var(--space-8)">
                    <div style="font-size:2rem; margin-bottom:6px;">⚪</div>
                    <div style="font-weight:700;">No Attendance Records Logged Yet</div>
                    <p class="text-xs text-muted">Attendance will be visible once the teacher submits daily roll call.</p>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: EXAM MARKS & RESULTS -->
    <div id="parent-tab-tests" class="parent-tab-content" style="${parentState.activeTab === 'tests' ? 'display:block;' : 'display:none;'}">
      <div class="card mb-5">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-4); flex-wrap:wrap; gap:8px;">
          <h3 style="margin:0;">📝 Evaluated Tests &amp; Progress Bar</h3>
          <span class="badge badge-info">${testMarks.length} Tests Recorded</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          ${testMarks.length > 0 ? testMarks.map(t => {
            const pct = t.is_absent ? 0 : Math.round((t.obtained_marks / t.max_marks) * 100) || 0;
            const barColor = t.is_absent ? '#ef4444' : (pct >= 80 ? '#10b981' : (pct >= 50 ? '#3b82f6' : '#ef4444'));
            return `
              <div style="background:var(--bg-secondary); padding:14px 18px; border-radius:12px; border:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-size:0.875rem;">
                  <div>
                    <strong style="color:var(--navy); font-size:0.95rem;">${t.name}</strong> 
                    <span class="text-muted text-xs">(${t.subject_name || 'Subject'})</span>
                  </div>
                  <div style="font-weight:800; color:${barColor}; font-family:monospace; font-size:1rem;">
                    ${t.is_absent ? '❌ ABSENT' : `${t.obtained_marks} / ${t.max_marks} (${pct}%)`}
                  </div>
                </div>
                <div style="height:8px; border-radius:9999px; background:rgba(0,0,0,0.06); overflow:hidden; width:100%;">
                  <div style="height:100%; border-radius:9999px; background:${barColor}; width:${pct}%; transition:width 0.6s ease;"></div>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="empty-state" style="padding:var(--space-8);">
              <div class="empty-state-icon">📝</div>
              <h4>No Exam Marks Recorded Yet</h4>
              <p class="text-xs text-muted">Test marks will be shown here as soon as evaluated by faculty.</p>
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- TAB 3: FEES & RECEIPTS -->
    <div id="parent-tab-fees" class="parent-tab-content" style="${parentState.activeTab === 'fees' ? 'display:block;' : 'display:none;'}">
      <div class="stat-grid mb-5">
        <div class="stat-card">
          <div class="stat-card-icon gold">💰</div>
          <div class="stat-card-value">₹${(student.total_fees || 0).toLocaleString('en-IN')}</div>
          <div class="stat-card-label">Total Tuition Fee</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon green">✅</div>
          <div class="stat-card-value" style="color:var(--success)">₹${(student.paid_fees || 0).toLocaleString('en-IN')}</div>
          <div class="stat-card-label">Total Paid</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon ${remainingFees > 0 ? 'red' : 'green'}">💳</div>
          <div class="stat-card-value" style="color:${remainingFees > 0 ? 'var(--danger)' : 'var(--success)'}">₹${remainingFees.toLocaleString('en-IN')}</div>
          <div class="stat-card-label">${remainingFees > 0 ? 'Pending Balance' : 'Fees Cleared'}</div>
        </div>
      </div>

      <div class="card">
        <h3 class="mb-3">💳 Official Fee Payment Receipts</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Receipt Date</th>
                <th>Amount Paid</th>
                <th>Payment Method</th>
                <th>Remarks</th>
                <th style="text-align:right;">Receipt Action</th>
              </tr>
            </thead>
            <tbody>
              ${feePayments.length > 0 ? feePayments.map(f => `
                <tr>
                  <td class="font-mono font-bold">${f.payment_date}</td>
                  <td class="font-mono font-bold text-success" style="font-size:1.05rem;">₹${f.amount.toLocaleString('en-IN')}</td>
                  <td><span class="badge badge-outline">${f.payment_method}</span></td>
                  <td class="text-xs text-muted">${f.remarks || 'Tuition Fee Payment'}</td>
                  <td style="text-align:right;">
                    <button class="btn btn-outline btn-xs" style="font-weight:700;" onclick="downloadBlobFile('/api/fees/receipt/${f.id}/pdf', 'Fee_Receipt_${f.id}.pdf')">
                      📥 Download PDF Receipt
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="5" class="text-center text-muted" style="padding:var(--space-8)">No fee transactions recorded yet.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: CLASS TIMETABLE -->
    <div id="parent-tab-timetable" class="parent-tab-content" style="${parentState.activeTab === 'timetable' ? 'display:block;' : 'display:none;'}">
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-4); flex-wrap:wrap; gap:8px;">
          <h3 style="margin:0;">🗓️ Weekly Class Lecture Schedule</h3>
          <span class="badge badge-primary">${timetable.length} Total Weekly Slots</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${(todaySlots.length > 0 ? todaySlots : timetable.slice(0, 8)).map(slot => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:var(--radius-lg); background:var(--bg-secondary); border:1px solid var(--border-color);">
              <div>
                <div style="font-weight:700; color:var(--navy); font-size:0.95rem;">${slot.subject_name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                  👨‍🏫 ${slot.teacher_name || 'Faculty'} · 🏫 ${slot.room_no || 'Hall 101'} · 📅 ${slot.day_of_week || 'Weekday'}
                </div>
              </div>
              <span class="badge badge-outline font-mono font-bold" style="font-size:0.8rem;">
                ${slot.start_time ? `${slot.start_time}–${slot.end_time}` : slot.time_slot}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- TAB 5: NOTICES & BULLETINS -->
    <div id="parent-tab-notices" class="parent-tab-content" style="${parentState.activeTab === 'notices' ? 'display:block;' : 'display:none;'}">
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-4);">
          <h3 style="margin:0;">📢 Official Announcements &amp; Notices</h3>
          <span class="badge badge-warning">Live Bulletin</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px;">
          ${(announcements.length > 0 ? announcements : [
            { title: '🚀 Term Midterm Evaluation Exam', description: 'Comprehensive examinations scheduled. Check your student timetable.', event_date: '2026-08-15', category: 'Exam' },
            { title: '📢 Parent-Teacher Meeting (PTM)', description: 'Quarterly PTM scheduled to review progress with faculty.', event_date: '2026-08-20', category: 'Notice' }
          ]).map(n => `
            <div style="padding:14px 16px; border-radius:10px; border-left:4px solid var(--gold); background:rgba(201,169,110,0.08); border-top:1px solid var(--border-color); border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color);">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                <span style="font-weight:700; color:var(--navy); font-size:0.95rem;">${n.title || n.text}</span>
                <span class="badge badge-xs badge-secondary">${n.category || 'Notice'}</span>
              </div>
              <p style="font-size:0.85rem; color:var(--text-secondary); margin:0 0 6px 0;">${n.description || n.content || ''}</p>
              <div style="font-size:0.75rem; color:var(--text-muted);">📅 Date: ${n.event_date || n.date || n.note_date || 'Upcoming'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function switchParentTab(tabName) {
  parentState.activeTab = tabName;
  const contents = document.querySelectorAll('.parent-tab-content');
  contents.forEach(c => c.style.display = 'none');

  const activeContent = document.getElementById(`parent-tab-${tabName}`);
  if (activeContent) activeContent.style.display = 'block';

  const tabButtons = document.querySelectorAll('#parent-portal-tabs button');
  tabButtons.forEach(b => {
    b.className = b.getAttribute('onclick')?.includes(tabName) ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  });
}
window.switchParentTab = switchParentTab;

window.ParentsModule = {
  renderParentsPage,
  loadParentDashboardData,
  switchParentTab
};
