/**
 * Apex Tuition ERP — Parent Portal Module
 * Clean, intuitive parent dashboard for real-time monitoring of student attendance, marks & fee status.
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
    const res = await API.getStudents();
    parentState.allStudents = res.students || [];
  } catch (e) {
    console.error('Error fetching students for parent portal:', e);
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Parent Portal Desk</h1>
        <p>Real-time parent monitoring for student attendance, exam marks, and fee payment receipts.</p>
      </div>
      <div class="page-header-actions">
        <span class="badge badge-success" style="padding:6px 14px;">👨‍👩‍👧 Parent Access Live</span>
      </div>
    </div>

    <!-- Student Lookup Card -->
    <div class="card mb-6" style="padding:var(--space-6); background:linear-gradient(135deg, rgba(255,255,255,0.85), rgba(243,246,251,0.95)); border:1.5px solid rgba(201,169,110,0.35);">
      <h3 style="font-size:1.1rem; color:var(--navy); margin-bottom:var(--space-3)">🔍 Search &amp; Select Student</h3>
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
        <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
        <h3>Select a Student to View Parent Dashboard</h3>
        <p>Choose your child from the lookup dropdown above to view real-time daily attendance, exam marksheets, fee receipts, and performance reports.</p>
      </div>
    </div>
  `;

  // Attach search button listener
  document.getElementById('parent-load-btn').addEventListener('click', () => {
    const studentId = document.getElementById('parent-student-select').value;
    if (studentId) {
      parentState.selectedStudentId = studentId;
      loadParentDashboardData(studentId);
    } else {
      Utils.showToast('Please select a student from the dropdown first.', 'warning');
    }
  });

  document.getElementById('parent-student-select').addEventListener('change', (e) => {
    if (e.target.value) {
      parentState.selectedStudentId = e.target.value;
      loadParentDashboardData(e.target.value);
    }
  });

  if (parentState.selectedStudentId) {
    loadParentDashboardData(parentState.selectedStudentId);
  }
}

async function loadParentDashboardData(studentId) {
  const container = document.getElementById('parent-dashboard-view');
  if (!container) return;

  container.innerHTML = `
    <div class="card text-center" style="padding:var(--space-12)">
      <div class="spinner spinner-lg mx-auto mb-4"></div>
      <h3>Loading Parent Monitoring Dashboard...</h3>
    </div>
  `;

  try {
    // 1. Fetch Student profile & Attendance log
    const attRes = await API.request(`/attendance/student/${studentId}`);
    const student = attRes.student;
    const attStats = attRes.stats;
    const attRecords = attRes.records || [];

    // 2. Fetch Student test marks & Fee payments
    let testMarks = [];
    try {
      const testsRes = await API.request(`/tests/student/${studentId}`);
      testMarks = testsRes.marks || [];
    } catch (e) {
      // ignore
    }

    let feePayments = [];
    try {
      const feesRes = await API.request(`/fees/student/${studentId}`);
      feePayments = feesRes.payments || [];
    } catch (e) {
      // ignore
    }

    renderParentDashboardUI(container, student, attStats, attRecords, testMarks, feePayments);
  } catch (err) {
    console.error('Error loading parent dashboard:', err);
    container.innerHTML = `
      <div class="card text-center text-danger" style="padding:var(--space-8)">
        <h3>Error Loading Student Data</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

function renderParentDashboardUI(container, student, attStats, attRecords, testMarks, feePayments) {
  const attendancePct = attStats.percentage || 100;
  const remainingFees = Math.max(0, (student.total_fees || 0) - (student.paid_fees || 0));

  container.innerHTML = `
    <!-- Top Header Banner Chip -->
    <div class="card mb-6" style="background:linear-gradient(135deg, #1B2A4A, #243357); color:white; padding:var(--space-6);">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:var(--space-4);">
        <div style="display:flex; align-items:center; gap:var(--space-4);">
          <div style="width:64px; height:64px; border-radius:var(--radius-xl); background:var(--grad-primary); overflow:hidden; border:2px solid rgba(201,169,110,0.5); display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:800;">
            ${student.photo_path ? `<img src="${student.photo_path}" style="width:100%;height:100%;object-fit:cover">` : (student.first_name ? student.first_name[0] : 'S')}
          </div>
          <div>
            <h2 style="color:var(--ivory); font-size:1.5rem; font-weight:800; margin-bottom:2px;">
              ${student.first_name ? `${student.first_name} ${student.surname || ''}` : student.name}
            </h2>
            <div style="color:rgba(253,250,244,0.75); font-size:0.875rem;">
              Class: <strong>${student.class_name || 'Standard'}</strong> | Roll No: <strong>${student.roll_number || 'N/A'}</strong> | Father: <strong>${student.father_name || 'N/A'}</strong>
            </div>
          </div>
        </div>

        <button class="btn btn-warm btn-md" onclick="window.print()">
          🖨️ Print Student Report Card
        </button>
      </div>
    </div>

    <!-- Stats 4-Grid Overview -->
    <div class="stat-grid mb-6">
      <div class="stat-card">
        <div class="stat-card-icon green">📅</div>
        <div class="stat-card-value" style="color:var(--success)">${attendancePct}%</div>
        <div class="stat-card-label">Attendance Record</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-icon blue">📝</div>
        <div class="stat-card-value">${testMarks.length}</div>
        <div class="stat-card-label">Tests Taken</div>
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

    <!-- 2-Column Grid: Attendance & Test Scores -->
    <div class="grid-2 mb-6">
      <!-- Attendance Breakdown Card -->
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-4);">
          <h3>📅 Daily Attendance History</h3>
          <span class="badge badge-primary">${attStats.present} Present / ${attStats.total} Days</span>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:var(--space-4); font-size:0.8rem;">
          <span style="color:var(--success)">● Present: <strong>${attStats.present}</strong></span>
          <span style="color:var(--danger)">● Absent: <strong>${attStats.absent}</strong></span>
          <span style="color:var(--warning)">● Late/Leave: <strong>${attStats.late + attStats.excused}</strong></span>
        </div>

        <div class="table-wrap" style="max-height:300px; overflow-y:auto;">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject / Lecture</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${attRecords.length > 0 ? attRecords.map(r => `
                <tr>
                  <td class="font-mono">${r.attendance_date}</td>
                  <td>${r.subject_name || 'Daily Roll Call'}</td>
                  <td>
                    <span class="badge ${r.status === 'Present' ? 'badge-success' : (r.status === 'Absent' ? 'badge-danger' : 'badge-warning')}">
                      ${r.status}
                    </span>
                  </td>
                  <td class="text-xs text-muted">${r.remarks || '-'}</td>
                </tr>
              `).join('') : `<tr><td colspan="4" class="text-center text-muted" style="padding:var(--space-6)">No attendance logs recorded yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Test Marks Card -->
      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-4);">
          <h3>📈 Exam Performance &amp; Marks</h3>
          <span class="badge badge-info">${testMarks.length} Tests</span>
        </div>

        <div class="table-wrap" style="max-height:340px; overflow-y:auto;">
          <table>
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Subject</th>
                <th>Marks Obtained</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${testMarks.length > 0 ? testMarks.map(t => `
                <tr>
                  <td class="td-primary">${t.name}</td>
                  <td>${t.subject_name || 'General'}</td>
                  <td class="font-mono font-bold">${t.is_absent ? 'ABS' : `${t.obtained_marks} / ${t.max_marks}`}</td>
                  <td>
                    ${t.is_absent ? `<span class="badge badge-danger">ABSENT</span>` : `
                      <span class="badge ${ (t.obtained_marks / t.max_marks) >= 0.33 ? 'badge-success' : 'badge-danger' }">
                        ${ (t.obtained_marks / t.max_marks) >= 0.33 ? 'PASS' : 'FAIL' }
                      </span>
                    `}
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="4" class="text-center text-muted" style="padding:var(--space-6)">No test marks uploaded yet.</td></tr>`}
            </tbody>
          </table>
        </div>
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
