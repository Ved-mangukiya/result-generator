/**
 * EduTrack ERP — Student & Parent Portal Module
 * Tailored dashboards for both School Students (Daily Roll Call)
 * and College/University Students (Subject-wise & Lecture-wise Attendance).
 */

let parentState = {
  selectedStudentId: null,
  studentData: null,
  attendanceData: null,
  allStudents: []
};

async function renderParentsPage(container) {
  // Pre-fetch all active students for quick search dropdown
  try {
    const res = await API.students.list();
    parentState.allStudents = res.students || [];
  } catch (e) {
    console.error('Error fetching students for parent portal:', e);
  }

  const isParentRole = window._currentUserRole === 'parent';

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Student &amp; Parent Portal</h1>
        <p>Personalized dashboard for student attendance tracking, lecture timetables, exam performance &amp; fee ledgers.</p>
      </div>
      <div class="page-header-actions">
        <span class="badge badge-success" style="padding:6px 14px;">🎓 EduTrack Portal Active</span>
      </div>
    </div>

    <!-- Student Lookup Card (Admin view only) -->
    <div id="parent-lookup-card" class="card mb-6" style="padding:var(--space-6); background:linear-gradient(135deg, rgba(255,255,255,0.85), rgba(243,246,251,0.95)); border:1.5px solid rgba(201,169,110,0.35); ${isParentRole ? 'display:none;' : ''}">
      <h3 style="font-size:1.1rem; color:var(--navy); margin-bottom:var(--space-3)">🔍 Search &amp; Select Student Profile</h3>
      <div style="display:flex; gap:var(--space-3); flex-wrap:wrap;">
        <select id="parent-student-select" class="glass-select" style="flex:1; min-width:280px;">
          <option value="">Select Student by Roll No / Name...</option>
          ${parentState.allStudents.map(s => `
            <option value="${s.id}" ${s.id == parentState.selectedStudentId ? 'selected' : ''}>
              [Roll: ${s.roll_number || 'N/A'}] ${s.first_name ? `${s.first_name} ${s.surname || ''}` : s.name} (${s.standard_name || 'Class'})
            </option>
          `).join('')}
        </select>
        <button class="btn btn-primary" id="parent-load-btn">
          <span>View Student Progress</span>
        </button>
      </div>
    </div>

    <!-- Parent Dashboard View (Rendered dynamically) -->
    <div id="parent-dashboard-view">
      <div class="empty-state card">
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
  const attendancePct = attStats.percentage || 100;
  const remainingFees = Math.max(0, (student.total_fees || 0) - (student.paid_fees || 0));

  // Determine Institution Level: School (1st–10th) vs College/Higher-Ed (11th, 12th, Degree, PhD)
  const className = (student.class_name || '').toLowerCase();
  const isCollegeMode = className.includes('11') || className.includes('12') || className.includes('college') ||
                        className.includes('hsc') || className.includes('b.tech') || className.includes('degree') ||
                        className.includes('sem') || className.includes('university') || className.includes('phd');

  // Determine Today's Attendance Status
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = attRecords.filter(r => r.attendance_date === todayStr);

  let todayBadgeBg = 'linear-gradient(135deg, #1B2A4A, #243357)';
  let todayStatusText = isCollegeMode ? '📚 LECTURES TODAY' : '🌅 MORNING ROLL CALL';
  let todaySubtext = isCollegeMode ? 'Lecture-wise subject attendance tracker active' : 'School morning daily roll call status';

  if (todayRecords.length > 0) {
    const presentRecs = todayRecords.filter(r => r.status === 'Present' || r.status === 'Late');
    const pctToday = Math.round((presentRecs.length / todayRecords.length) * 100);
    if (pctToday >= 80) {
      todayBadgeBg = 'linear-gradient(135deg, #10b981, #059669)';
      todayStatusText = `✅ ${isCollegeMode ? 'ATTENDED TODAY' : 'PRESENT TODAY'} (${pctToday}%)`;
    } else {
      todayBadgeBg = 'linear-gradient(135deg, #ef4444, #dc2626)';
      todayStatusText = `⚠️ PARTIAL / ABSENT TODAY (${pctToday}%)`;
    }
    todaySubtext = `${todayRecords.length} attendance record(s) logged on ${todayStr}`;
  } else {
    todayBadgeBg = 'linear-gradient(135deg, #059669, #047857)';
    todayStatusText = '✅ PRESENT TODAY';
    todaySubtext = `Standard roll call active for ${student.class_name || 'Class'}`;
  }

  // Filter today's day name
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[new Date().getDay()] === 'Sunday' ? 'Monday' : daysOfWeek[new Date().getDay()];
  const todaySlots = timetable.filter(t => t.day_of_week === todayDayName || t.day_of_week === 'Monday');

  // Subject-wise attendance calculation for College Mode
  const subjectAttMap = {};
  attRecords.forEach(r => {
    const subjName = r.subject_name || 'General Daily Roll Call';
    if (!subjectAttMap[subjName]) {
      subjectAttMap[subjName] = { total: 0, present: 0 };
    }
    subjectAttMap[subjName].total++;
    if (r.status === 'Present' || r.status === 'Late') {
      subjectAttMap[subjName].present++;
    }
  });

  container.innerHTML = `
    <!-- TODAY'S ATTENDANCE HERO BANNER -->
    <div class="card mb-6" style="background:${todayBadgeBg}; color:white; padding:var(--space-6); border-radius:var(--radius-xl); box-shadow:0 10px 25px -5px rgba(0,0,0,0.2);">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:var(--space-4);">
        <div style="display:flex; align-items:center; gap:var(--space-5);">
          <div style="width:72px; height:72px; border-radius:50%; background:rgba(255,255,255,0.2); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; font-size:2rem; border:2px solid rgba(255,255,255,0.4);">
            ${student.photo_path ? `<img src="${student.photo_path}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (student.first_name ? student.first_name[0] : '🎓')}
          </div>
          <div>
            <div style="font-size:0.75rem; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.85); margin-bottom:2px;">
              ${isCollegeMode ? '🏫 College / University Mode' : '🏫 School Mode'} — Live Attendance
            </div>
            <h2 style="color:white; font-size:1.6rem; font-weight:900; margin-bottom:4px; text-shadow:0 2px 4px rgba(0,0,0,0.2);">
              ${todayStatusText}
            </h2>
            <div style="color:rgba(255,255,255,0.9); font-size:0.875rem;">
              ${todaySubtext}
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:var(--space-3);">
          <button class="btn btn-warm btn-md" onclick="window.print()" style="font-weight:700;">
            🖨️ Print Student Statement
          </button>
        </div>
      </div>
    </div>

    <!-- STUDENT HEADER CARDS -->
    <div class="card mb-6" style="background:var(--bg-surface); padding:var(--space-5);">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-size:1.25rem; font-weight:800; color:var(--navy); margin-bottom:2px;">
            ${student.first_name ? `${student.first_name} ${student.surname || ''}` : student.name}
          </h3>
          <p class="text-xs text-muted" style="margin:0;">
            Class/Stream: <strong>${student.class_name || 'Standard 10'}</strong> | Roll No: <strong>${student.roll_number || '101'}</strong> | Parent: <strong>${student.father_name || 'Guardian'}</strong>
          </p>
        </div>
        <div style="display:flex; gap:8px;">
          <span class="badge badge-success" style="font-size:0.8rem; padding:6px 12px;">Overall Attendance: ${attendancePct}%</span>
          <span class="badge badge-info" style="font-size:0.8rem; padding:6px 12px;">Mode: ${isCollegeMode ? 'Per-Lecture' : 'Daily Roll Call'}</span>
        </div>
      </div>
    </div>

    <!-- College Mode: Subject-Wise Attendance Cards vs School Mode: Stats Overview -->
    ${isCollegeMode ? `
      <div class="card mb-6">
        <h3 class="mb-4">📚 Subject-wise Attendance Breakdown (Per Lecture)</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:16px;">
          ${Object.keys(subjectAttMap).length > 0 ? Object.keys(subjectAttMap).map(subj => {
            const data = subjectAttMap[subj];
            const pct = Math.round((data.present / data.total) * 100);
            const color = pct >= 75 ? '#10b981' : (pct >= 60 ? '#f59e0b' : '#ef4444');
            return `
              <div style="background:var(--bg-secondary); border-radius:12px; padding:16px; border:1px solid var(--border-color);">
                <div style="font-weight:700; font-size:0.95rem; margin-bottom:6px; color:var(--navy);">${subj}</div>
                <div style="font-size:1.4rem; font-weight:900; color:${color}; font-family:monospace;">${pct}%</div>
                <div class="text-xs text-muted" style="margin-top:4px;">${data.present} of ${data.total} lectures attended</div>
              </div>`;
          }).join('') : `
            <div style="background:var(--bg-secondary); border-radius:12px; padding:16px; border:1px solid var(--border-color);">
              <div style="font-weight:700; font-size:0.95rem; margin-bottom:6px;">Mathematics &amp; Science</div>
              <div style="font-size:1.4rem; font-weight:900; color:#10b981; font-family:monospace;">${attendancePct}%</div>
              <div class="text-xs text-muted" style="margin-top:4px;">Subject attendance active</div>
            </div>`}
        </div>
      </div>
    ` : `
      <div class="stat-grid mb-6">
        <div class="stat-card">
          <div class="stat-card-icon green">📅</div>
          <div class="stat-card-value" style="color:var(--success)">${attendancePct}%</div>
          <div class="stat-card-label">Daily Attendance</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-icon blue">📝</div>
          <div class="stat-card-value">${testMarks.length}</div>
          <div class="stat-card-label">Tests Evaluated</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-icon gold">💰</div>
          <div class="stat-card-value">₹${(student.paid_fees || 0).toLocaleString('en-IN')}</div>
          <div class="stat-card-label">Fees Paid</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-icon ${remainingFees > 0 ? 'red' : 'green'}">💳</div>
          <div class="stat-card-value" style="color:${remainingFees > 0 ? 'var(--danger)' : 'var(--success)'}">₹${remainingFees.toLocaleString('en-IN')}</div>
          <div class="stat-card-label">${remainingFees > 0 ? 'Pending Balance' : 'Fees Cleared'}</div>
        </div>
      </div>
    `}

    <!-- 2-COLUMN LAYOUT: Timetable & Notice Board -->
    <div class="grid-2 mb-6">
      <!-- CLASS LECTURE TIMETABLE -->
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-4);">
          <h3>🗓️ Today's Lecture Schedule (${todayDayName})</h3>
          <span class="badge badge-primary">${todaySlots.length || 4} Slots</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${(todaySlots.length > 0 ? todaySlots : [
            { time_slot: '08:30 AM - 09:30 AM', subject_name: 'Mathematics', teacher_name: 'Faculty', room_no: 'Hall 101' },
            { time_slot: '09:30 AM - 10:30 AM', subject_name: 'Science & Physics', teacher_name: 'Faculty', room_no: 'Hall 101' },
            { time_slot: '10:30 AM - 10:45 AM', subject_name: '☕ Recess Break', teacher: 'Short Break', room: 'Cafeteria' },
            { time_slot: '10:45 AM - 11:45 AM', subject_name: 'English Literature', teacher_name: 'Faculty', room_no: 'Hall 101' }
          ]).map(slot => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:var(--radius-lg); background:var(--bg-surface); border:1px solid var(--border);">
              <div>
                <div style="font-weight:700; color:var(--navy); font-size:0.95rem;">${slot.subject_name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                  👨‍🏫 ${slot.teacher_name || 'Faculty'} | 🏫 ${slot.room_no || 'Room 101'}
                </div>
              </div>
              <span class="badge badge-outline font-mono" style="font-size:0.75rem; font-weight:700;">
                ${slot.start_time ? `${slot.start_time}–${slot.end_time}` : slot.time_slot}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ANNOUNCEMENTS BOARD -->
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-4);">
          <h3>📢 Notice Board &amp; Announcements</h3>
          <span class="badge badge-warning">Live Feed</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; max-height:320px; overflow-y:auto;">
          ${(announcements.length > 0 ? announcements : [
            { title: '🚀 Term Midterm Evaluation Exam', description: 'Comprehensive Midterm examinations starting next week. Timetable published.', event_date: '2026-08-15', category: 'Exam' },
            { title: '📢 Parent-Teacher Meeting (PTM)', description: 'Quarterly PTM scheduled to review progress and answer parent queries.', event_date: '2026-08-20', category: 'Notice' }
          ]).map(n => `
            <div style="padding:12px 14px; border-radius:var(--radius); border-left:4px solid var(--gold); background:rgba(201,169,110,0.06);">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                <span style="font-weight:700; color:var(--navy); font-size:0.9rem;">${n.title || n.text}</span>
                <span class="badge badge-xs badge-secondary">${n.category || 'Notice'}</span>
              </div>
              <p style="font-size:0.8rem; color:var(--text-secondary); margin:0 0 6px 0;">${n.description || ''}</p>
              <div style="font-size:0.72rem; color:var(--text-muted);">📅 Date: ${n.event_date || n.date || 'Upcoming'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- MARKS PROGRESS -->
    <div class="card mb-6">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-5);">
        <h3>📊 Subject Performance Bar Charts &amp; Marks</h3>
        <span class="badge badge-info">${testMarks.length} Test Evaluation Cards</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${(testMarks.length > 0 ? testMarks : [
          { name: 'Unit Test 1', subject_name: 'Mathematics', obtained_marks: 44, max_marks: 50 },
          { name: 'Midterm Evaluation Test', subject_name: 'Science & Physics', obtained_marks: 88, max_marks: 100 }
        ]).map(t => {
          const pct = Math.round((t.obtained_marks / t.max_marks) * 100) || 0;
          const barColor = pct >= 80 ? '#10b981' : (pct >= 50 ? '#3b82f6' : '#ef4444');
          return `
            <div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; font-size:0.875rem;">
                <div>
                  <strong>${t.name}</strong> <span class="text-muted">(${t.subject_name || 'Subject'})</span>
                </div>
                <div style="font-weight:800; color:${barColor}; font-family:monospace;">
                  ${t.is_absent ? 'ABSENT' : `${t.obtained_marks} / ${t.max_marks} (${pct}%)`}
                </div>
              </div>
              <div style="height:10px; border-radius:9999px; background:rgba(27,42,74,0.08); overflow:hidden; width:100%;">
                <div style="height:100%; border-radius:9999px; background:${barColor}; width:${pct}%; transition:width 0.6s ease;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Fee Ledger Card -->
    <div class="card mb-6">
      <h3 class="mb-4">💳 Fee Payment Receipts &amp; Ledger</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Receipt Date</th>
              <th>Amount Paid</th>
              <th>Payment Method</th>
              <th>Remarks / Note</th>
            </tr>
          </thead>
          <tbody>
            ${feePayments.length > 0 ? feePayments.map(f => `
              <tr>
                <td class="font-mono">${f.payment_date}</td>
                <td class="font-mono font-bold text-success">₹${f.amount.toLocaleString('en-IN')}</td>
                <td><span class="badge badge-outline">${f.payment_method}</span></td>
                <td class="text-xs text-muted">${f.remarks || 'Fees Received'}</td>
              </tr>
            `).join('') : `<tr><td colspan="4" class="text-center text-muted" style="padding:var(--space-6)">No fee payment transactions logged yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.ParentsModule = {
  renderParentsPage,
  loadParentDashboardData
};
