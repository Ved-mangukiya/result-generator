/**
 * EduTrack ERP — Attendance Management Module
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
  if (typeof setPageTitle === 'function') {
    setPageTitle('Attendance Tracker', 'Attendance Tracker');
  }

  // Fetch coaching profile to get attendance mode
  try {
    const profileRes = await API.coaching.get();
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
        <span id="att-status-badge" class="badge badge-secondary" style="padding:6px 14px; font-size:0.8rem; font-weight:700;">
          Status: ⚪ Unrecorded
        </span>
        <span class="badge ${attendanceState.attendanceMode === 'Lecture' ? 'badge-info' : 'badge-primary'}" style="padding:6px 14px; font-size:0.8rem;">
          Mode: ${attendanceState.attendanceMode === 'Lecture' ? '📚 Lecture-wise (Per Subject)' : '🌅 Daily (Start of Day)'}
        </span>
        <button class="btn btn-primary" id="save-attendance-btn">
          <span>💾 Save Attendance</span>
        </button>
      </div>
    </div>

    <!-- Unrecorded Alert Banner -->
    <div id="att-unrecorded-banner" class="card mb-4" style="display:none; background:#fffbeb; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:8px; color:#92400e; font-size:0.875rem;">
      <strong>⚪ Attendance Unrecorded:</strong> No attendance roll call has been submitted yet for the selected date. Mark student attendance below and click <strong>💾 Save Attendance</strong>.
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
    <div class="stat-grid mb-6" id="att-stats-row" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
      <div class="stat-card">
        <div class="stat-card-icon blue">👥</div>
        <div class="stat-card-value" id="att-total-cnt">0</div>
        <div class="stat-card-label">Total Students</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon green">✅</div>
        <div class="stat-card-value" id="att-present-cnt" style="color:var(--success)">0</div>
        <div class="stat-card-label" id="att-present-label">Present (Incl. Late)</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon red">❌</div>
        <div class="stat-card-value" id="att-absent-cnt" style="color:var(--danger)">0</div>
        <div class="stat-card-label">Absent</div>
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
    const res = await API.batches.list(stdId);
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
      const res = await API.subjects.list(stdId);
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
    const stRes = await API.students.list(stdId, attendanceState.selectedBatchId);
    attendanceState.students = Array.isArray(stRes) ? stRes : (stRes.students || []);

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

    attendanceState.hasRecorded = attRecords.length > 0;
    const banner = document.getElementById('att-unrecorded-banner');
    if (banner) banner.style.display = attendanceState.hasRecorded ? 'none' : 'block';
    const badge = document.getElementById('att-status-badge');
    if (badge) {
      badge.className = attendanceState.hasRecorded ? 'badge badge-success' : 'badge badge-secondary';
      badge.innerHTML = attendanceState.hasRecorded ? '🟢 Recorded' : '⚪ Unrecorded';
    }

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
    const isBatch = !!attendanceState.selectedBatchId;
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding:var(--space-8)">
          <div style="font-size:2.2rem;margin-bottom:8px;">👥</div>
          <div style="font-weight:700;font-size:0.95rem;color:var(--text-primary);margin-bottom:4px;">
            ${isBatch ? 'No Students in Selected Batch' : 'No Students Enrolled in this Class'}
          </div>
          <p class="text-muted text-xs" style="margin-bottom:12px;">
            ${isBatch ? 'No students are assigned to this specific batch.' : 'There are no active students in this class yet.'}
          </p>
          ${isBatch
            ? `<button class="btn btn-outline btn-xs" onclick="document.getElementById('att-batch-select').value='';attendanceState.selectedBatchId=null;loadAttendanceData();">View All Class Students</button>`
            : `<button class="btn btn-primary btn-xs" onclick="Router.navigate('students', { standardId: attendanceState.selectedStandardId })">➕ Add Students to Class</button>`}
        </td>
      </tr>`;
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

function updateStatsDisplay(total, purePresent, absent, late) {
  const tot = document.getElementById('att-total-cnt');
  const prs = document.getElementById('att-present-cnt');
  const prsLbl = document.getElementById('att-present-label');
  const abs = document.getElementById('att-absent-cnt');

  const totalPresent = (purePresent || 0) + (late || 0);

  if (tot) tot.innerText = total;
  if (prs) prs.innerText = totalPresent;
  if (prsLbl) {
    prsLbl.innerHTML = `Present ${late > 0 ? `<span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(${late} late)</span>` : ''}`;
  }
  if (abs) abs.innerText = absent;
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
    attendanceState.hasRecorded = true;
    const banner = document.getElementById('att-unrecorded-banner');
    if (banner) banner.style.display = 'none';
    const badge = document.getElementById('att-status-badge');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.innerHTML = '🟢 Recorded';
    }
    Toast.success('Saved', res.message || 'Attendance saved successfully!');
  } catch (err) {
    console.error('Error saving attendance:', err);
    Toast.error('Save Failed', err.message);
  } finally {
    if (saveBtn) saveBtn.classList.remove('btn-loading');
  }
}

window.AttendanceModule = {
  renderAttendancePage,
  loadAttendanceData
};
