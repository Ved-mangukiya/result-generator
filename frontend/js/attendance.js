/**
 * Apex Tuition ERP — Attendance Management Module
 * Supports Daily (Start of Day) and Lecture-wise Attendance tracking
 */

let attendanceState = {
  selectedStandardId: null,
  selectedBatchId: null,
  selectedSubjectId: null,
  attendanceDate: new Date().toISOString().slice(0, 10),
  attendanceMode: 'Daily', // 'Daily' or 'Lecture'
  students: [],
  attendanceMap: {} // student_id -> { status: 'Present'|'Absent'|'Late'|'Excused', remarks: '' }
};

async function renderAttendancePage(container) {
  // Fetch coaching profile to get attendance mode
  try {
    const profileRes = await API.getCoachingProfile();
    if (profileRes && profileRes.profile && profileRes.profile.attendance_mode) {
      attendanceState.attendanceMode = profileRes.profile.attendance_mode;
    }
  } catch (e) {
    console.error('Error fetching coaching profile for attendance mode:', e);
  }

  // Fetch standards
  let standards = [];
  try {
    const res = await API.getStandards();
    standards = res.standards || [];
    if (standards.length > 0 && !attendanceState.selectedStandardId) {
      attendanceState.selectedStandardId = standards[0].id;
    }
  } catch (e) {
    console.error('Error fetching standards:', e);
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Attendance Tracker</h1>
        <p>Record, manage, and monitor daily &amp; lecture-wise attendance across classes.</p>
      </div>
      <div class="page-header-actions">
        <span class="badge ${attendanceState.attendanceMode === 'Lecture' ? 'badge-info' : 'badge-primary'}" style="padding:6px 14px; font-size:0.8rem;">
          Mode: ${attendanceState.attendanceMode === 'Lecture' ? '📚 Lecture-wise (Per Subject)' : '🌅 Daily (Start of Day)'}
        </span>
        <button class="btn btn-primary" id="save-attendance-btn">
          <span>💾 Save Attendance</span>
        </button>
      </div>
    </div>

    <!-- Filters & Selectors Bar -->
    <div class="card mb-6" style="padding:var(--space-5);">
      <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:var(--space-4); align-items:end;">
        <div class="form-group">
          <label class="form-label font-bold">Select Date</label>
          <input type="date" id="att-date-picker" class="glass-input" value="${attendanceState.attendanceDate}">
        </div>

        <div class="form-group">
          <label class="form-label font-bold">Select Class / Standard</label>
          <select id="att-standard-select" class="glass-select">
            ${standards.map(s => `<option value="${s.id}" ${s.id == attendanceState.selectedStandardId ? 'selected' : ''}>${s.display_name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label font-bold">Select Batch</label>
          <select id="att-batch-select" class="glass-select">
            <option value="">All Batches</option>
          </select>
        </div>

        ${attendanceState.attendanceMode === 'Lecture' ? `
          <div class="form-group">
            <label class="form-label font-bold">Select Subject / Lecture</label>
            <select id="att-subject-select" class="glass-select">
              <option value="">Choose Subject...</option>
            </select>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Stats Summary Row -->
    <div class="stat-grid mb-6" id="att-stats-row">
      <div class="stat-card">
        <div class="stat-card-icon blue">👥</div>
        <div class="stat-card-value" id="att-total-cnt">0</div>
        <div class="stat-card-label">Total Students</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon green">✅</div>
        <div class="stat-card-value" id="att-present-cnt" style="color:var(--success)">0</div>
        <div class="stat-card-label">Present Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon red">❌</div>
        <div class="stat-card-value" id="att-absent-cnt" style="color:var(--danger)">0</div>
        <div class="stat-card-label">Absent</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon amber">⏰</div>
        <div class="stat-card-value" id="att-late-cnt" style="color:var(--warning)">0</div>
        <div class="stat-card-label">Late / Excused</div>
      </div>
    </div>

    <!-- Quick Action Controls & Table Card -->
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:var(--space-4) var(--space-6); border-bottom:1px solid rgba(201,169,110,0.18);">
        <h3 style="font-size:1.05rem; color:var(--navy);">Student Attendance Roll Call</h3>
        <div style="display:flex; gap:var(--space-2);">
          <button class="btn btn-sm btn-glass" id="mark-all-present-btn">Mark All Present</button>
          <button class="btn btn-sm btn-glass-dark" id="mark-all-absent-btn">Mark All Absent</button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:70px;">Roll No</th>
              <th>Student Name</th>
              <th>Overall %</th>
              <th style="text-align:center;">Attendance Status</th>
              <th>Remarks / Note</th>
            </tr>
          </thead>
          <tbody id="att-students-tbody">
            <tr><td colspan="5" class="text-center text-muted" style="padding:var(--space-8)">Select class to load students...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach event listeners
  document.getElementById('att-date-picker').addEventListener('change', (e) => {
    attendanceState.attendanceDate = e.target.value;
    loadAttendanceData();
  });

  document.getElementById('att-standard-select').addEventListener('change', (e) => {
    attendanceState.selectedStandardId = e.target.value;
    loadBatchesAndSubjects();
  });

  document.getElementById('att-batch-select').addEventListener('change', (e) => {
    attendanceState.selectedBatchId = e.target.value || null;
    loadAttendanceData();
  });

  if (document.getElementById('att-subject-select')) {
    document.getElementById('att-subject-select').addEventListener('change', (e) => {
      attendanceState.selectedSubjectId = e.target.value || null;
      loadAttendanceData();
    });
  }

  document.getElementById('mark-all-present-btn').addEventListener('click', () => {
    attendanceState.students.forEach(st => {
      attendanceState.attendanceMap[st.id].status = 'Present';
    });
    renderStudentsTable();
  });

  document.getElementById('mark-all-absent-btn').addEventListener('click', () => {
    attendanceState.students.forEach(st => {
      attendanceState.attendanceMap[st.id].status = 'Absent';
    });
    renderStudentsTable();
  });

  document.getElementById('save-attendance-btn').addEventListener('click', saveAttendance);

  await loadBatchesAndSubjects();
}

async function loadBatchesAndSubjects() {
  const stdId = attendanceState.selectedStandardId;
  if (!stdId) return;

  // Load batches
  try {
    const res = await API.getBatches(stdId);
    const batchSelect = document.getElementById('att-batch-select');
    if (batchSelect) {
      batchSelect.innerHTML = '<option value="">All Batches</option>' + 
        (res.batches || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }
  } catch (e) {
    console.error('Error loading batches:', e);
  }

  // Load subjects if lecture mode
  const subjectSelect = document.getElementById('att-subject-select');
  if (subjectSelect) {
    try {
      const res = await API.getSubjects(stdId);
      subjectSelect.innerHTML = '<option value="">Select Subject...</option>' +
        (res.subjects || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (e) {
      console.error('Error loading subjects:', e);
    }
  }

  await loadAttendanceData();
}

async function loadAttendanceData() {
  const stdId = attendanceState.selectedStandardId;
  if (!stdId) return;

  const tbody = document.getElementById('att-students-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:var(--space-6)"><div class="spinner spinner-sm mx-auto"></div> Loading students...</td></tr>`;
  }

  try {
    // 1. Fetch students for standard & batch
    const stRes = await API.getStudents(stdId, attendanceState.selectedBatchId);
    attendanceState.students = stRes.students || [];

    // 2. Fetch existing attendance records for date
    let attRecords = [];
    try {
      const query = `standard_id=${stdId}&attendance_date=${attendanceState.attendanceDate}` +
        (attendanceState.selectedBatchId ? `&batch_id=${attendanceState.selectedBatchId}` : '') +
        (attendanceState.selectedSubjectId ? `&subject_id=${attendanceState.selectedSubjectId}` : '');
      const attRes = await API.request(`/attendance?${query}`);
      attRecords = attRes.records || [];
    } catch (e) {
      // No existing records yet
    }

    // Build attendance map
    const existingMap = {};
    attRecords.forEach(r => {
      existingMap[r.student_id] = { status: r.status, remarks: r.remarks || '' };
    });

    attendanceState.attendanceMap = {};
    attendanceState.students.forEach(s => {
      if (existingMap[s.id]) {
        attendanceState.attendanceMap[s.id] = existingMap[s.id];
      } else {
        attendanceState.attendanceMap[s.id] = { status: 'Present', remarks: '' };
      }
    });

    renderStudentsTable();
  } catch (err) {
    console.error('Error loading attendance data:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading students: ${err.message}</td></tr>`;
  }
}

function renderStudentsTable() {
  const tbody = document.getElementById('att-students-tbody');
  if (!tbody) return;

  const students = attendanceState.students;
  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:var(--space-8)">No active students found in this class/batch.</td></tr>`;
    updateStatsDisplay(0, 0, 0, 0);
    return;
  }

  let presentCnt = 0, absentCnt = 0, lateCnt = 0;

  tbody.innerHTML = students.map(s => {
    const att = attendanceState.attendanceMap[s.id] || { status: 'Present', remarks: '' };
    if (att.status === 'Present') presentCnt++;
    else if (att.status === 'Absent') absentCnt++;
    else if (att.status === 'Late' || att.status === 'Excused') lateCnt++;

    const pct = s.attendance_pct !== null && s.attendance_pct !== undefined ? `${s.attendance_pct}%` : '100%';

    return `
      <tr>
        <td class="font-mono font-bold">${s.roll_number || '-'}</td>
        <td class="td-primary">
          <div style="display:flex; align-items:center; gap:var(--space-3)">
            <div class="admin-avatar" style="width:30px; height:30px; font-size:0.75rem;">
              ${s.photo_path ? `<img src="${s.photo_path}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (s.first_name ? s.first_name[0] : 'S')}
            </div>
            <div>
              <div style="font-weight:600">${s.first_name ? `${s.first_name} ${s.surname || ''}` : s.name}</div>
              <div class="text-xs text-muted">Father: ${s.father_name || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${parseFloat(pct) >= 80 ? 'badge-success' : (parseFloat(pct) >= 60 ? 'badge-warning' : 'badge-danger')}">
            ${pct}
          </span>
        </td>
        <td style="text-align:center;">
          <div class="att-status-group" data-student-id="${s.id}" style="display:inline-flex; gap:4px; background:rgba(255,255,255,0.6); padding:3px; border-radius:var(--radius-md); border:1px solid rgba(201,169,110,0.25);">
            <button type="button" class="att-btn att-present ${att.status === 'Present' ? 'active' : ''}" data-status="Present">Present</button>
            <button type="button" class="att-btn att-absent ${att.status === 'Absent' ? 'active' : ''}" data-status="Absent">Absent</button>
            <button type="button" class="att-btn att-late ${att.status === 'Late' ? 'active' : ''}" data-status="Late">Late</button>
            <button type="button" class="att-btn att-excused ${att.status === 'Excused' ? 'active' : ''}" data-status="Excused">Leave</button>
          </div>
        </td>
        <td>
          <input type="text" class="glass-input att-remark-input" data-student-id="${s.id}" value="${att.remarks || ''}" placeholder="Note..." style="padding:6px 10px; font-size:12.5px;">
        </td>
      </tr>
    `;
  }).join('');

  updateStatsDisplay(students.length, presentCnt, absentCnt, lateCnt);

  // Attach status toggle listeners
  tbody.querySelectorAll('.att-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parent = e.target.closest('.att-status-group');
      const studentId = parent.dataset.studentId;
      const status = e.target.dataset.status;

      parent.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      if (attendanceState.attendanceMap[studentId]) {
        attendanceState.attendanceMap[studentId].status = status;
      }
      recalculateStatsFromMap();
    });
  });

  tbody.querySelectorAll('.att-remark-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const studentId = e.target.dataset.studentId;
      if (attendanceState.attendanceMap[studentId]) {
        attendanceState.attendanceMap[studentId].remarks = e.target.value;
      }
    });
  });
}

function updateStatsDisplay(total, present, absent, late) {
  const tot = document.getElementById('att-total-cnt');
  const prs = document.getElementById('att-present-cnt');
  const abs = document.getElementById('att-absent-cnt');
  const lte = document.getElementById('att-late-cnt');

  if (tot) tot.innerText = total;
  if (prs) prs.innerText = present;
  if (abs) abs.innerText = absent;
  if (lte) lte.innerText = late;
}

function recalculateStatsFromMap() {
  let presentCnt = 0, absentCnt = 0, lateCnt = 0;
  const students = attendanceState.students;

  students.forEach(s => {
    const att = attendanceState.attendanceMap[s.id];
    if (att) {
      if (att.status === 'Present') presentCnt++;
      else if (att.status === 'Absent') absentCnt++;
      else if (att.status === 'Late' || att.status === 'Excused') lateCnt++;
    }
  });

  updateStatsDisplay(students.length, presentCnt, absentCnt, lateCnt);
}

async function saveAttendance() {
  const saveBtn = document.getElementById('save-attendance-btn');
  if (saveBtn) saveBtn.classList.add('btn-loading');

  try {
    const recordsPayload = attendanceState.students.map(st => {
      const att = attendanceState.attendanceMap[st.id] || { status: 'Present', remarks: '' };
      return {
        student_id: st.id,
        status: att.status,
        remarks: att.remarks
      };
    });

    const payload = {
      standard_id: attendanceState.selectedStandardId,
      batch_id: attendanceState.selectedBatchId || null,
      subject_id: attendanceState.selectedSubjectId || null,
      attendance_date: attendanceState.attendanceDate,
      marked_by: 'Teacher',
      records: recordsPayload
    };

    const res = await API.request('/attendance', 'POST', payload);
    Utils.showToast('✅ ' + (res.message || 'Attendance saved successfully!'), 'success');
  } catch (err) {
    console.error('Error saving attendance:', err);
    Utils.showToast('❌ Failed to save attendance: ' + err.message, 'danger');
  } finally {
    if (saveBtn) saveBtn.classList.remove('btn-loading');
  }
}

window.AttendanceModule = {
  renderAttendancePage,
  loadAttendanceData
};
