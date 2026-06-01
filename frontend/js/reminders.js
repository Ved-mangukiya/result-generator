/* ═══════════════════════════════════════════════
   REMINDERS.JS — Timetable & Reminders Notice Exporter
   ═══════════════════════════════════════════════ */

let _currentReminderTab = 'vacation';

function renderReminders() {
  setPageTitle('Timetables & Reminders', 'Timetables & Reminders');

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Timetables &amp; Reminders</h1>
        <p>Draft and compile beautiful notice PDFs for exams, vacations, batches, or announcements for parent-teacher communications.</p>
      </div>
    </div>

    <!-- Reminder Type Tabs -->
    <div class="tabs mb-6">
      <button class="btn ${_currentReminderTab === 'vacation' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-rem-vacation" onclick="switchReminderTab('vacation')">🌴 Vacation Notice</button>
      <button class="btn ${_currentReminderTab === 'exam_schedule' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-rem-exam" onclick="switchReminderTab('exam_schedule')">📅 Exam Timetable</button>
      <button class="btn ${_currentReminderTab === 'starting_date' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-rem-start" onclick="switchReminderTab('starting_date')">🚀 Batch Start Date</button>
      <button class="btn ${_currentReminderTab === 'general' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-rem-general" onclick="switchReminderTab('general')">📢 General Notice</button>
    </div>

    <div class="grid gap-6" style="grid-template-columns: 1fr 340px">
      <!-- Editor Form -->
      <div class="card">
        <div class="card-header">
          <h3 id="reminder-form-title">🌴 Compose Vacation Notice</h3>
        </div>
        <div class="card-body" id="reminder-form-body">
          <!-- Injected dynamically -->
        </div>
      </div>

      <!-- Live Notice Guide -->
      <div class="card" style="height:fit-content">
        <div class="card-header"><h3>💡 Printing Tips</h3></div>
        <div class="card-body text-sm" style="line-height:1.6">
          <ul style="padding-left:1.2rem; display:flex; flex-direction:column; gap:12px; color:var(--text-secondary)">
            <li>All notices will automatically be branded with your **coaching name, logo, address**, and phone number from settings.</li>
            <li>Use the dynamic table in the **Exam Timetable** tab to schedule exam dates, timings, and syllabus topics side-by-side.</li>
            <li>Downloading generates an **A4 Portrait PDF** optimized for easy printing or direct sharing on WhatsApp groups.</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  switchReminderTab(_currentReminderTab);
}

function switchReminderTab(tab) {
  _currentReminderTab = tab;

  const btnVac = document.getElementById('btn-rem-vacation');
  const btnExm = document.getElementById('btn-rem-exam');
  const btnStr = document.getElementById('btn-rem-start');
  const btnGen = document.getElementById('btn-rem-general');

  if (btnVac) btnVac.className = `btn ${tab === 'vacation' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnExm) btnExm.className = `btn ${tab === 'exam_schedule' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnStr) btnStr.className = `btn ${tab === 'starting_date' ? 'btn-primary' : 'btn-outline'} btn-sm`;
  if (btnGen) btnGen.className = `btn ${tab === 'general' ? 'btn-primary' : 'btn-outline'} btn-sm`;

  const formTitle = document.getElementById('reminder-form-title');
  const formBody = document.getElementById('reminder-form-body');
  if (!formBody) return;

  if (tab === 'vacation') {
    formTitle.textContent = '🌴 Compose Vacation Notice';
    formBody.innerHTML = `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="rem-title" value="🌴 Diwali &amp; Winter Vacation Announcement">
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Vacation Start Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="rem-vac-start" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Classes Reopen Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="rem-vac-end" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Notice Message / Description <span class="required">*</span></label>
        <textarea class="form-control" id="rem-message" rows="6" placeholder="Write instructions for parents & students...">Dear Parents and Students, please note that the tuition classes will remain closed during the vacation dates mentioned below. Regular lectures will resume as scheduled from the reopening date. Happy holidays!</textarea>
      </div>
      <button class="btn btn-primary" onclick="exportNoticePDF()"><span style="margin-right:6px">⬇</span> Download Notice PDF</button>
    `;
  } else if (tab === 'exam_schedule') {
    formTitle.textContent = '📅 Compose Exam Timetable Schedule';
    formBody.innerHTML = `
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Select Class (Standard)</label>
          <select class="form-control" id="rem-std-select" onchange="onReminderStandardChange(this.value)">
            <option value="">— Select Class —</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Autofill from Grouped Test Cycle</label>
          <select class="form-control" id="rem-cycle-select" onchange="onReminderCycleChange(this.value)" disabled>
            <option value="">— Select Cycle (Select Class first) —</option>
          </select>
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="rem-title" value="📅 GSEB Standard 10 - Unit Test Timetable">
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Notice Message / Guidelines</label>
        <textarea class="form-control" id="rem-message" rows="3" placeholder="Syllabus guidelines, rules, etc...">Dear Students, the upcoming unit tests series will be conducted as per the schedule below. Syllabus topics are detailed alongside each subject. Attendance is compulsory.</textarea>
      </div>
      
      <p class="form-section-title">Schedule Table Grid</p>
      <div class="table-wrap mb-4" style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse;" id="exam-timetable-grid">
          <thead>
            <tr>
              <th style="padding:6px; font-size:0.8rem; text-align:left; width:130px">Date</th>
              <th style="padding:6px; font-size:0.8rem; text-align:left; width:150px">Subject Name</th>
              <th style="padding:6px; font-size:0.8rem; text-align:left; width:100px">Timings</th>
              <th style="padding:6px; font-size:0.8rem; text-align:left">Syllabus Topic</th>
              <th style="padding:6px; width:40px"></th>
            </tr>
          </thead>
          <tbody id="exam-timetable-rows">
            <!-- Row 1 -->
            <tr>
              <td style="padding:4px"><input type="date" class="form-control t-date" value="${new Date().toISOString().split('T')[0]}" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
              <td style="padding:4px"><input type="text" class="form-control t-subj" value="English" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
              <td style="padding:4px"><input type="text" class="form-control t-time" value="09:00 AM" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
              <td style="padding:4px"><input type="text" class="form-control t-syll" value="Chapters 1 to 3, Grammar Tenses" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
              <td style="padding:4px; text-align:center"><button class="btn btn-ghost btn-icon-sm" onclick="this.closest('tr').remove()" style="height:30px;width:30px;min-width:30px">🗑</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="btn btn-outline btn-sm mb-6" onclick="addExamTimetableRow()">➕ Add Schedule Row</button>
      <br>
      <button class="btn btn-primary" onclick="exportNoticePDF()"><span style="margin-right:6px">⬇</span> Download Timetable PDF</button>
    `;
    loadReminderStandards();
  } else if (tab === 'starting_date') {
    formTitle.textContent = '🚀 Compose New Batch Start Announcement';
    formBody.innerHTML = `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="rem-title" value="🚀 New Batches Announcement for Academic Year">
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Batch Commencement Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="rem-start-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Class Standard Name <span class="required">*</span></label>
          <input type="text" class="form-control" id="rem-std-name" value="11th &amp; 12th Commerce (GSEB)">
        </div>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Commencement Details / Message <span class="required">*</span></label>
        <textarea class="form-control" id="rem-message" rows="6" placeholder="Batch syllabus, orientation schedule, etc...">We are excited to announce the starting date for our new academic batches. An orientation session covering study plans and reference materials will be conducted on the first day. Enrolled students are requested to report 10 minutes early.</textarea>
      </div>
      <button class="btn btn-primary" onclick="exportNoticePDF()"><span style="margin-right:6px">⬇</span> Download Batch Notice PDF</button>
    `;
  } else if (tab === 'general') {
    formTitle.textContent = '📢 Compose General Announcement Notice';
    formBody.innerHTML = `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="rem-title" value="📢 Important Notice: Parent-Teacher Meeting">
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Notice Message / Announcement Details <span class="required">*</span></label>
        <textarea class="form-control" id="rem-message" rows="10" placeholder="Write full details here...">Dear Parents,

You are cordially invited to the quarterly Parent-Teacher Meeting (PTM) to discuss your child\'s test performances, syllabus coverage, and academic progress reports.

Timings: 04:00 PM onwards.
Venue: Coaching Main Hall.

Your presence and inputs are highly valued.

Best regards,
Management Board</textarea>
      </div>
      <button class="btn btn-primary" onclick="exportNoticePDF()"><span style="margin-right:6px">⬇</span> Download Notice PDF</button>
    `;
  }
}

function addExamTimetableRow() {
  const tbody = document.getElementById('exam-timetable-rows');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="padding:4px"><input type="date" class="form-control t-date" value="${new Date().toISOString().split('T')[0]}" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
    <td style="padding:4px"><input type="text" class="form-control t-subj" placeholder="e.g. Science" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
    <td style="padding:4px"><input type="text" class="form-control t-time" placeholder="e.g. 10:00 AM" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
    <td style="padding:4px"><input type="text" class="form-control t-syll" placeholder="e.g. Chapters 4 & 5" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
    <td style="padding:4px; text-align:center"><button class="btn btn-ghost btn-icon-sm" onclick="this.closest('tr').remove()" style="height:30px;width:30px;min-width:30px">🗑</button></td>
  `;
  tbody.appendChild(tr);
}

async function exportNoticePDF() {
  const title = getVal('rem-title');
  const message = getVal('rem-message');

  if (!title) {
    Toast.error('Validation Error', 'Notice title is required.');
    return;
  }

  const payload = {
    type: _currentReminderTab,
    title,
    message
  };

  if (_currentReminderTab === 'vacation') {
    const start = getVal('rem-vac-start');
    const end = getVal('rem-vac-end');
    if (!start || !end) {
      Toast.error('Validation Error', 'Start and reopen dates are required.');
      return;
    }
    payload.columns = ['Vacation Start Date', 'Classes Reopen Date'];
    payload.rows = [
      [Format.date(start), Format.date(end)]
    ];
  } else if (_currentReminderTab === 'starting_date') {
    const start = getVal('rem-start-date');
    const std = getVal('rem-std-name');
    if (!start || !std) {
      Toast.error('Validation Error', 'Batch start date and class standard are required.');
      return;
    }
    payload.columns = ['Batch Class / Standard', 'Commencement Date'];
    payload.rows = [
      [std, Format.date(start)]
    ];
  } else if (_currentReminderTab === 'exam_schedule') {
    const rows = $$('#exam-timetable-rows tr');
    const columns = ['Exam Date', 'Subject Name', 'Timings', 'Syllabus Details'];
    const rowData = [];

    rows.forEach(row => {
      const dateVal = row.querySelector('.t-date')?.value || '';
      const subjVal = row.querySelector('.t-subj')?.value || '';
      const timeVal = row.querySelector('.t-time')?.value || '';
      const syllVal = row.querySelector('.t-syll')?.value || '';

      if (dateVal && subjVal) {
        rowData.push([Format.date(dateVal), subjVal, timeVal || '—', syllVal || '—']);
      }
    });

    if (rowData.length === 0) {
      Toast.warning('Empty Schedule', 'Please schedule at least one valid exam row.');
      return;
    }

    payload.columns = columns;
    payload.rows = rowData;
  }

  Spinner.show('Generating notice PDF...');
  try {
    const res = await API.export.reminderPDF(payload);
    Spinner.hide();
    
    // Create direct browser download trigger
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Notice.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    Toast.success('Success', 'Notice PDF compiled and downloaded.');
  } catch (err) {
    Spinner.hide();
    Toast.error('Failed to compile notice', err.message);
  }
}

async function loadReminderStandards() {
  const sel = document.getElementById('rem-std-select');
  if (!sel) return;
  
  try {
    const boards = await API.boards.list();
    sel.innerHTML = '<option value="">— Select Class —</option>';
    for (const board of boards) {
      const standards = await API.boards.getStandards(board.id);
      if (standards.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = board.short_name;
        standards.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.display_name;
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      }
    }
  } catch (err) {
    console.error('Error loading standards in reminders:', err);
  }
}

async function onReminderStandardChange(stdId) {
  const cycleSel = document.getElementById('rem-cycle-select');
  if (!cycleSel) return;
  
  cycleSel.innerHTML = '<option value="">— Select Cycle —</option>';
  cycleSel.disabled = true;
  
  if (!stdId) return;
  
  try {
    const cycles = await API.testCycles.list(stdId);
    if (cycles.length === 0) {
      cycleSel.innerHTML = '<option value="">No grouped test cycles found</option>';
      return;
    }
    
    cycleSel.disabled = false;
    cycleSel.innerHTML = '<option value="">— Select Grouped Test Cycle —</option>';
    cycles.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.title} (Max: ${c.max_marks})`;
      cycleSel.appendChild(opt);
    });
  } catch (err) {
    Toast.error('Load Failed', 'Failed to load test cycles: ' + err.message);
  }
}

async function onReminderCycleChange(cycleId) {
  if (!cycleId) return;
  
  try {
    const res = await API.testCycles.get(cycleId);
    const { cycle, tests } = res;
    
    const titleEl = document.getElementById('rem-title');
    if (titleEl) {
      titleEl.value = `📅 ${cycle.title} - Exam Timetable`;
    }
    
    const tbody = document.getElementById('exam-timetable-rows');
    if (tbody) {
      tbody.innerHTML = '';
      
      tests.forEach(test => {
        const tr = document.createElement('tr');
        const dateVal = test.test_date || new Date().toISOString().split('T')[0];
        
        tr.innerHTML = `
          <td style="padding:4px"><input type="date" class="form-control t-date" value="${dateVal}" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
          <td style="padding:4px"><input type="text" class="form-control t-subj" value="${test.subject_name || ''}" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
          <td style="padding:4px"><input type="text" class="form-control t-time" value="09:00 AM" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
          <td style="padding:4px"><input type="text" class="form-control t-syll" value="Full Syllabus (Max Marks: ${test.max_marks})" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
          <td style="padding:4px; text-align:center"><button class="btn btn-ghost btn-icon-sm" onclick="this.closest('tr').remove()" style="height:30px;width:30px;min-width:30px">🗑</button></td>
        `;
        tbody.appendChild(tr);
      });
      Toast.success('Cycle Loaded', 'Timetable grid populated from grouped test cycle.');
    }
  } catch (err) {
    Toast.error('Load Failed', 'Failed to load cycle details: ' + err.message);
  }
}

// Expose globals
window.renderReminders = renderReminders;
window.switchReminderTab = switchReminderTab;
window.addExamTimetableRow = addExamTimetableRow;
window.exportNoticePDF = exportNoticePDF;
window.onReminderStandardChange = onReminderStandardChange;
window.onReminderCycleChange = onReminderCycleChange;
