/* ═══════════════════════════════════════════════
   TIMETABLE_BUILDER.JS — Dedicated Timetable Builder
   Full-featured timetable management: Board→Class→Batch
   selection, visual grid, conflict detection, and
   auto-generation of weekly schedule.
   ═══════════════════════════════════════════════ */

const TimetableBuilder = (() => {
  // ─── State ────────────────────────────────────────────────────────────────
  let state = {
    boards: [],
    standards: [],
    batches: [],
    subjects: [],
    teachers: [],
    teacherAssignments: [],
    slots: [],
    selectedBoardId: null,
    selectedStandardId: null,
    selectedBatchId: null,
    config: {
      lectures_per_day: 6,
      slot_duration_mins: 60,
      start_time: '08:00',
      end_time: '15:00',
      break_duration_mins: 20,
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    }
  };

  const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_COLORS = {
    Monday: '#2EB8A0', Tuesday: '#5B8AF0', Wednesday: '#A78BFA',
    Thursday: '#F59E0B', Friday: '#EC4899', Saturday: '#34D399', Sunday: '#94A3B8'
  };
  const SUBJECT_COLORS = [
    '#2EB8A0','#5B8AF0','#A78BFA','#F59E0B','#EC4899','#34D399',
    '#FB923C','#60A5FA','#C084FC','#4ADE80','#F87171','#38BDF8'
  ];
  let _subjectColorMap = {};

  function getSubjectColor(subjectName) {
    if (!_subjectColorMap[subjectName]) {
      const idx = Object.keys(_subjectColorMap).length % SUBJECT_COLORS.length;
      _subjectColorMap[subjectName] = SUBJECT_COLORS[idx];
    }
    return _subjectColorMap[subjectName];
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  async function renderPage(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>🗓️ Timetable Builder</h1>
          <p>Create, manage and auto-generate weekly lecture schedules for each class and batch.</p>
        </div>
        <div class="page-header-actions" id="tt-header-actions" style="display:none;">
          <button class="btn btn-outline btn-sm" onclick="TimetableBuilder.clearTimetable()">🗑️ Clear All</button>
          <button class="btn btn-outline btn-sm" onclick="TimetableBuilder.printTimetable()">🖨️ Print PDF</button>
          <button class="btn btn-teal btn-sm" onclick="TimetableBuilder.openAutoModal()" style="background:linear-gradient(135deg,#2EB8A0,#1BD9BC);color:#0a1a2e;border:none;">⚡ Auto-Generate</button>
          <button class="btn btn-primary btn-sm" onclick="TimetableBuilder.openAddSlotModal()">➕ Add Slot</button>
        </div>
      </div>

      <!-- Step 1: Board → Class → Batch Selection -->
      <div class="card mb-5" id="tt-selector-card">
        <div style="padding:var(--space-5);">
          <h3 class="mb-4">📌 Step 1: Select Class</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; align-items:flex-end;">
            <div class="form-group mb-0">
              <label class="form-label">Board</label>
              <select id="tt-board-sel" class="form-control" onchange="TimetableBuilder.onBoardChange()">
                <option value="">-- Select Board --</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Class / Standard</label>
              <select id="tt-std-sel" class="form-control" onchange="TimetableBuilder.onStandardChange()">
                <option value="">-- Select Board First --</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Batch <span class="text-muted text-xs">(optional)</span></label>
              <select id="tt-batch-sel" class="form-control" onchange="TimetableBuilder.onBatchChange()">
                <option value="">All Batches</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Config (shown after class selected) -->
      <div class="card mb-5" id="tt-config-card" style="display:none;">
        <div style="padding:var(--space-5);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 class="mb-0">⚙️ Step 2: Schedule Configuration</h3>
            <button class="btn btn-outline btn-sm" onclick="TimetableBuilder.saveConfig()">💾 Save Config</button>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:16px;">
            <div class="form-group mb-0">
              <label class="form-label">Start Time</label>
              <input type="time" id="tt-cfg-start" class="form-control" value="08:00">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">End Time</label>
              <input type="time" id="tt-cfg-end" class="form-control" value="15:00">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Slot Duration (min)</label>
              <select id="tt-cfg-duration" class="form-control">
                <option value="30">30 min</option>
                <option value="40">40 min</option>
                <option value="45">45 min</option>
                <option value="50">50 min</option>
                <option value="60" selected>60 min (1 hr)</option>
                <option value="75">75 min</option>
                <option value="90">90 min</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Break Duration (min)</label>
              <select id="tt-cfg-break" class="form-control">
                <option value="0">No break</option>
                <option value="10">10 min</option>
                <option value="15">15 min</option>
                <option value="20" selected>20 min</option>
                <option value="30">30 min</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Lectures Per Day</label>
              <select id="tt-cfg-lectures" class="form-control">
                <option value="4">4 lectures</option>
                <option value="5">5 lectures</option>
                <option value="6" selected>6 lectures</option>
                <option value="7">7 lectures</option>
                <option value="8">8 lectures</option>
              </select>
            </div>
          </div>
          <div class="form-group mt-4 mb-0">
            <label class="form-label">Working Days</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;" id="tt-working-days-wrap">
              ${ALL_DAYS.map(d => `
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border-color);font-size:0.85rem;user-select:none;">
                  <input type="checkbox" id="tt-day-${d}" value="${d}" ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].includes(d) ? 'checked' : ''}
                    style="accent-color:var(--primary);"> ${d.slice(0,3)}
                </label>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Weekly Timetable Grid -->
      <div id="tt-grid-section" style="display:none;">
        <div class="card">
          <div style="padding:var(--space-5);border-bottom:1px solid var(--border-color);">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <h3 class="mb-0" id="tt-grid-title">Weekly Timetable</h3>
              <span class="badge badge-gray" id="tt-slot-count">0 slots</span>
            </div>
          </div>
          <div style="padding:var(--space-4); overflow-x:auto;">
            <div id="tt-grid-container"></div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Slot Modal -->
      <div id="tt-slot-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:1000;align-items:center;justify-content:center;"></div>

      <!-- Auto-Generate Modal -->
      <div id="tt-auto-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:1000;align-items:center;justify-content:center;"></div>
    `;

    await loadInitialData();
  }

  async function loadInitialData() {
    try {
      state.boards = await API.boards.list();
    } catch (e) { state.boards = []; }
    try {
      const res = await API.request('/teachers');
      state.teachers = res.teachers || [];
    } catch (e) { state.teachers = []; }

    const boardSel = document.getElementById('tt-board-sel');
    if (boardSel && state.boards.length) {
      boardSel.innerHTML = `<option value="">-- Select Board --</option>` +
        state.boards.map(b => `<option value="${b.id}">${b.name} (${b.short_name})</option>`).join('');
    }
  }

  // ─── Cascading Selectors ─────────────────────────────────────────────────

  async function onBoardChange() {
    state.selectedBoardId = document.getElementById('tt-board-sel')?.value || null;
    state.selectedStandardId = null;
    state.selectedBatchId = null;

    const stdSel = document.getElementById('tt-std-sel');
    const batchSel = document.getElementById('tt-batch-sel');
    if (!stdSel) return;

    if (!state.selectedBoardId) {
      stdSel.innerHTML = '<option value="">-- Select Board First --</option>';
      batchSel.innerHTML = '<option value="">All Batches</option>';
      hideGrid();
      return;
    }

    try {
      const res = await API.getStandards(state.selectedBoardId);
      state.standards = res.standards || [];
    } catch (e) { state.standards = []; }

    stdSel.innerHTML = `<option value="">-- Select Class --</option>` +
      state.standards.map(s => `<option value="${s.id}">${s.display_name}</option>`).join('');
    batchSel.innerHTML = '<option value="">All Batches</option>';
    hideGrid();
  }

  async function onStandardChange() {
    state.selectedStandardId = document.getElementById('tt-std-sel')?.value || null;
    state.selectedBatchId = null;
    const batchSel = document.getElementById('tt-batch-sel');
    if (!batchSel) return;

    if (!state.selectedStandardId) { hideGrid(); return; }

    // Load batches
    try {
      const res = await API.batches.list(state.selectedStandardId);
      state.batches = res.batches || [];
    } catch (e) { state.batches = []; }

    batchSel.innerHTML = `<option value="">All Batches</option>` +
      state.batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    // Load subjects and teacher assignments for this class
    await Promise.all([loadSubjects(), loadTeacherAssignments(), loadConfig(), loadSlots()]);
    showGrid();
  }

  async function onBatchChange() {
    state.selectedBatchId = document.getElementById('tt-batch-sel')?.value || null;
    if (state.selectedStandardId) {
      await loadSlots();
      renderGrid();
    }
  }

  async function loadSubjects() {
    try { state.subjects = await API.subjects.list(state.selectedStandardId); }
    catch (e) { state.subjects = []; }
  }

  async function loadTeacherAssignments() {
    try {
      const res = await API.request(`/teachers/assignments/by-standard/${state.selectedStandardId}`);
      state.teacherAssignments = res.assignments || [];
    } catch (e) { state.teacherAssignments = []; }
  }

  async function loadConfig() {
    try {
      const batchParam = state.selectedBatchId ? `?batch_id=${state.selectedBatchId}` : '';
      const cfg = await API.request(`/timetable/config/${state.selectedStandardId}${batchParam}`);
      state.config = {
        lectures_per_day: cfg.lectures_per_day || 6,
        slot_duration_mins: cfg.slot_duration_mins || 60,
        start_time: cfg.start_time || '08:00',
        end_time: cfg.end_time || '15:00',
        break_duration_mins: cfg.break_duration_mins || 20,
        working_days: typeof cfg.working_days === 'string' ? JSON.parse(cfg.working_days) : (cfg.working_days || ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])
      };
      // Apply to UI
      const f = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
      f('tt-cfg-start', state.config.start_time);
      f('tt-cfg-end', state.config.end_time);
      f('tt-cfg-duration', state.config.slot_duration_mins);
      f('tt-cfg-break', state.config.break_duration_mins);
      f('tt-cfg-lectures', state.config.lectures_per_day);
      ALL_DAYS.forEach(d => {
        const cb = document.getElementById(`tt-day-${d}`);
        if (cb) cb.checked = state.config.working_days.includes(d);
      });
    } catch (e) {}
  }

  async function loadSlots() {
    try {
      let url = `/timetable?standard_id=${state.selectedStandardId}`;
      if (state.selectedBatchId) url += `&batch_id=${state.selectedBatchId}`;
      const res = await API.request(url);
      state.slots = res.slots || [];
    } catch (e) { state.slots = []; }
    _subjectColorMap = {};
  }

  async function saveConfig() {
    const cfg = getConfigFromUI();
    try {
      await API.request(`/timetable/config/${state.selectedStandardId}`, 'PUT', {
        ...cfg, batch_id: state.selectedBatchId || null
      });
      state.config = cfg;
      Toast.success('Saved', 'Schedule configuration saved.');
    } catch (e) {
      Toast.error('Error', e.message);
    }
  }

  function getConfigFromUI() {
    const working_days = ALL_DAYS.filter(d => document.getElementById(`tt-day-${d}`)?.checked);
    return {
      lectures_per_day: parseInt(document.getElementById('tt-cfg-lectures')?.value) || 6,
      slot_duration_mins: parseInt(document.getElementById('tt-cfg-duration')?.value) || 60,
      start_time: document.getElementById('tt-cfg-start')?.value || '08:00',
      end_time: document.getElementById('tt-cfg-end')?.value || '15:00',
      break_duration_mins: parseInt(document.getElementById('tt-cfg-break')?.value) || 20,
      working_days
    };
  }

  function hideGrid() {
    document.getElementById('tt-config-card').style.display = 'none';
    document.getElementById('tt-grid-section').style.display = 'none';
    document.getElementById('tt-header-actions').style.display = 'none';
  }

  function showGrid() {
    document.getElementById('tt-config-card').style.display = '';
    document.getElementById('tt-grid-section').style.display = '';
    document.getElementById('tt-header-actions').style.display = '';

    const std = state.standards.find(s => s.id == state.selectedStandardId);
    const board = state.boards.find(b => b.id == state.selectedBoardId);
    const batch = state.batches.find(b => b.id == state.selectedBatchId);
    const title = `${board?.short_name || ''} — ${std?.display_name || 'Class'}${batch ? ` (${batch.name})` : ''}`;
    const titleEl = document.getElementById('tt-grid-title');
    if (titleEl) titleEl.textContent = `📅 Weekly Timetable: ${title}`;
    renderGrid();
  }

  // ─── Grid Renderer ────────────────────────────────────────────────────────

  function renderGrid() {
    const container = document.getElementById('tt-grid-container');
    if (!container) return;

    const activeDays = state.config.working_days.length > 0
      ? state.config.working_days
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const slotCountEl = document.getElementById('tt-slot-count');
    if (slotCountEl) slotCountEl.textContent = `${state.slots.length} slots`;

    // Group slots by day
    const slotsByDay = {};
    activeDays.forEach(d => slotsByDay[d] = []);
    state.slots.forEach(slot => {
      if (slotsByDay[slot.day_of_week] !== undefined) {
        slotsByDay[slot.day_of_week].push(slot);
      }
    });

    // Detect conflicts
    const conflictSlots = detectConflicts(state.slots);
    const conflictIds = new Set(conflictSlots.map(s => s.id));

    const colWidth = Math.max(160, Math.floor(800 / activeDays.length));

    const html = `
      <style>
        .tt-day-col { min-width: ${colWidth}px; }
        .tt-slot-card {
          padding: 10px 12px;
          border-radius: 10px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          position: relative;
          border: 2px solid transparent;
        }
        .tt-slot-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
        .tt-slot-card.conflict { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.4); animation: conflictPulse 1.5s infinite; }
        @keyframes conflictPulse { 0%,100%{opacity:1} 50%{opacity:0.75} }
        .tt-slot-time { font-size: 0.7rem; opacity: 0.8; margin-bottom: 3px; font-family: monospace; }
        .tt-slot-subject { font-weight: 700; font-size: 0.9rem; margin-bottom: 2px; }
        .tt-slot-teacher { font-size: 0.72rem; opacity: 0.85; }
        .tt-slot-delete { position:absolute;top:4px;right:6px;background:none;border:none;cursor:pointer;opacity:0;font-size:0.9rem;transition:opacity 0.2s;color:white; }
        .tt-slot-card:hover .tt-slot-delete { opacity: 1; }
        .tt-add-slot-btn {
          width: 100%;
          padding: 8px;
          border: 2px dashed rgba(255,255,255,0.15);
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 0.8rem;
          transition: all 0.2s;
          margin-top: 4px;
        }
        .tt-add-slot-btn:hover { border-color: var(--primary); color: var(--primary); background: rgba(122,97,48,0.05); }
      </style>
      <div style="display:flex; gap:12px; min-width:max-content;">
        ${activeDays.map(day => {
          const daySlots = slotsByDay[day] || [];
          const dayColor = DAY_COLORS[day] || '#94A3B8';
          return `
            <div class="tt-day-col">
              <div style="background:${dayColor};color:${day==='Thursday'?'#1B2A4A':'white'};padding:10px 12px;border-radius:10px 10px 0 0;font-weight:700;font-size:0.85rem;text-align:center;letter-spacing:0.04em;margin-bottom:8px;">
                ${day}
                <span style="font-size:0.7rem;font-weight:400;opacity:0.85;margin-left:4px;">(${daySlots.length})</span>
              </div>
              ${daySlots.map(slot => {
                const isConflict = conflictIds.has(slot.id);
                const color = getSubjectColor(slot.subject_name);
                return `
                  <div class="tt-slot-card ${isConflict ? 'conflict' : ''}"
                    style="background:linear-gradient(135deg,${color}22,${color}33);border-color:${isConflict?'#ef4444':color+'55'};"
                    title="${isConflict ? '⚠️ CONFLICT: Overlapping time with another slot!' : slot.subject_name}"
                    onclick="TimetableBuilder.openEditSlotModal(${slot.id})">
                    <button class="tt-slot-delete" onclick="event.stopPropagation();TimetableBuilder.deleteSlot(${slot.id},'${slot.subject_name.replace(/'/g,"\\'")}')" title="Delete">×</button>
                    ${isConflict ? '<div style="font-size:0.7rem;color:#ef4444;font-weight:700;margin-bottom:3px;">⚠️ CONFLICT</div>' : ''}
                    ${(slot.start_time && slot.end_time) ? `<div class="tt-slot-time">🕐 ${slot.start_time} – ${slot.end_time}</div>` : (slot.time_slot ? `<div class="tt-slot-time">🕐 ${slot.time_slot}</div>` : '')}
                    <div class="tt-slot-subject" style="color:${color};">${slot.subject_name}</div>
                    ${slot.teacher_fullname || slot.teacher_name ? `<div class="tt-slot-teacher">👤 ${slot.teacher_fullname || slot.teacher_name}</div>` : ''}
                    ${slot.room_no ? `<div class="tt-slot-teacher" style="opacity:0.6;">📍 ${slot.room_no}</div>` : ''}
                  </div>`;
              }).join('')}
              <button class="tt-add-slot-btn" onclick="TimetableBuilder.openAddSlotModal('${day}')">+ Add for ${day.slice(0,3)}</button>
            </div>`;
        }).join('')}
      </div>`;

    container.innerHTML = html;
  }

  // ─── Conflict Detection ──────────────────────────────────────────────────

  function detectConflicts(slots) {
    const conflicts = new Set();
    const withTimes = slots.filter(s => s.start_time && s.end_time);

    for (let i = 0; i < withTimes.length; i++) {
      for (let j = i + 1; j < withTimes.length; j++) {
        const a = withTimes[i], b = withTimes[j];
        if (a.day_of_week !== b.day_of_week) continue;

        // Same class overlap
        if (a.standard_id === b.standard_id && timesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) {
          conflicts.add(a); conflicts.add(b);
        }
        // Same teacher overlap
        if (a.teacher_id && b.teacher_id && a.teacher_id === b.teacher_id && timesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) {
          conflicts.add(a); conflicts.add(b);
        }
      }
    }
    return Array.from(conflicts);
  }

  function timesOverlap(startA, endA, startB, endB) {
    const toMins = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
    return toMins(startA) < toMins(endB) && toMins(startB) < toMins(endA);
  }

  // ─── Add / Edit Slot Modal ────────────────────────────────────────────────

  function openAddSlotModal(preSelectedDay = '') {
    if (!state.selectedStandardId) {
      Toast.warning('No Class Selected', 'Please select a class first.');
      return;
    }
    showSlotModal(null, preSelectedDay);
  }

  async function openEditSlotModal(slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot) return;
    showSlotModal(slot);
  }

  function showSlotModal(slot = null, preDay = '') {
    const modalEl = document.getElementById('tt-slot-modal');
    if (!modalEl) return;

    const isEdit = !!slot;
    const activeDays = state.config.working_days.length > 0 ? state.config.working_days : ALL_DAYS.slice(0, 6);

    // Build teacher options from assignments + full list
    const teacherOptions = state.teachers.map(t => {
      const isAssigned = state.teacherAssignments.some(a => a.teacher_id === t.id);
      return `<option value="${t.id}" ${slot?.teacher_id == t.id ? 'selected' : ''}>${t.name}${isAssigned ? ' ✓' : ''}</option>`;
    });

    modalEl.style.display = 'flex';
    modalEl.innerHTML = `
      <div style="background:var(--card-bg);border-radius:16px;padding:32px;width:100%;max-width:520px;box-shadow:var(--shadow-xl);border:1px solid var(--border-color);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h3 style="margin:0;">${isEdit ? '✏️ Edit Lecture Slot' : '➕ Add Lecture Slot'}</h3>
          <button onclick="TimetableBuilder.closeSlotModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">×</button>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Day of Week <span class="required">*</span></label>
            <select id="slot-day" class="form-control">
              ${activeDays.map(d => `<option value="${d}" ${(slot?.day_of_week === d || preDay === d) ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Subject <span class="required">*</span></label>
            <select id="slot-subject" class="form-control" onchange="TimetableBuilder.onSlotSubjectChange()">
              <option value="">-- Select Subject --</option>
              ${state.subjects.map(s => `<option value="${s.id}" data-name="${s.name}" ${slot?.subject_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Start Time <span class="required">*</span></label>
            <input type="time" id="slot-start" class="form-control" value="${slot?.start_time || state.config.start_time}" onchange="TimetableBuilder.autoCalcEnd()">
          </div>
          <div class="form-group">
            <label class="form-label">End Time <span class="required">*</span></label>
            <input type="time" id="slot-end" class="form-control" value="${slot?.end_time || ''}">
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Assign Teacher</label>
            <select id="slot-teacher" class="form-control">
              <option value="">-- No Teacher --</option>
              ${teacherOptions.join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Room / Hall</label>
            <input type="text" id="slot-room" class="form-control" value="${slot?.room_no || 'Room 101'}" placeholder="Room 101">
          </div>
        </div>

        <div id="slot-conflict-warning" style="display:none;background:rgba(239,68,68,0.12);border:1px solid #ef4444;border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.85rem;color:#ef4444;"></div>

        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;">
          <button class="btn btn-outline" onclick="TimetableBuilder.closeSlotModal()">Cancel</button>
          <button class="btn btn-primary" onclick="TimetableBuilder.saveSlot(${isEdit ? slot.id : 'null'})">${isEdit ? '💾 Update Slot' : '➕ Add Slot'}</button>
        </div>
      </div>`;

    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeSlotModal(); });

    // If editing, show the subject name
    if (slot?.subject_name && !slot.subject_id) {
      const subjSel = document.getElementById('slot-subject');
      if (subjSel) {
        // Add custom option if subject not in list
        const opt = document.createElement('option');
        opt.value = '';
        opt.dataset.name = slot.subject_name;
        opt.selected = true;
        opt.text = slot.subject_name + ' (custom)';
        subjSel.insertBefore(opt, subjSel.firstChild);
      }
    }
  }

  function autoCalcEnd() {
    const start = document.getElementById('slot-start')?.value;
    if (!start) return;
    const [h, m] = start.split(':').map(Number);
    const durationMins = parseInt(document.getElementById('tt-cfg-duration')?.value) || state.config.slot_duration_mins;
    const totalMins = h * 60 + m + durationMins;
    const endH = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const endM = (totalMins % 60).toString().padStart(2, '0');
    const endEl = document.getElementById('slot-end');
    if (endEl && !endEl.value) endEl.value = `${endH}:${endM}`;
  }

  function onSlotSubjectChange() {
    const subjSel = document.getElementById('slot-subject');
    if (!subjSel || !subjSel.value) return;
    const subjId = parseInt(subjSel.value);

    // Auto-suggest teacher based on assignment
    const assignment = state.teacherAssignments.find(a => a.subject_id === subjId);
    if (assignment) {
      const teacherSel = document.getElementById('slot-teacher');
      if (teacherSel) teacherSel.value = assignment.teacher_id;
    }
  }

  async function saveSlot(editId) {
    const day = document.getElementById('slot-day')?.value;
    const subjSel = document.getElementById('slot-subject');
    const subjectId = subjSel?.value ? parseInt(subjSel.value) : null;
    const subjectName = subjSel?.value
      ? subjSel.options[subjSel.selectedIndex]?.dataset.name || subjSel.options[subjSel.selectedIndex]?.text
      : '';
    const startTime = document.getElementById('slot-start')?.value;
    const endTime = document.getElementById('slot-end')?.value;
    const teacherSel = document.getElementById('slot-teacher');
    const teacherId = teacherSel?.value ? parseInt(teacherSel.value) : null;
    const teacherName = teacherSel?.value ? teacherSel.options[teacherSel.selectedIndex]?.text.replace(' ✓', '') : '';
    const room = document.getElementById('slot-room')?.value || 'Room 101';

    if (!day || !subjectName) {
      Toast.warning('Required', 'Please select day and subject.');
      return;
    }
    if (!startTime || !endTime) {
      Toast.warning('Required', 'Please set start and end times.');
      return;
    }

    const payload = {
      standard_id: parseInt(state.selectedStandardId),
      batch_id: state.selectedBatchId ? parseInt(state.selectedBatchId) : null,
      day_of_week: day,
      subject_name: subjectName,
      subject_id: subjectId,
      start_time: startTime,
      end_time: endTime,
      time_slot: `${startTime}–${endTime}`,
      teacher_id: teacherId,
      teacher_name: teacherName,
      room_no: room
    };

    try {
      const warnEl = document.getElementById('slot-conflict-warning');
      if (editId) {
        await API.request(`/timetable/${editId}`, 'PUT', payload);
        Toast.success('Updated!', 'Slot updated successfully.');
      } else {
        await API.request('/timetable', 'POST', payload);
        Toast.success('Added!', `${subjectName} slot added for ${day}.`);
      }
      closeSlotModal();
      await loadSlots();
      renderGrid();
    } catch (err) {
      if (err.message?.includes('conflict')) {
        // Show conflict warning in modal instead of closing
        const warnEl = document.getElementById('slot-conflict-warning');
        if (warnEl) {
          warnEl.style.display = '';
          warnEl.innerHTML = `⚠️ <strong>Scheduling Conflict Detected</strong><br>${err.message}`;
        } else {
          Toast.error('Conflict', err.message);
        }
      } else {
        Toast.error('Error', err.message);
      }
    }
  }

  async function deleteSlot(slotId, subjectName) {
    if (!confirm(`Remove "${subjectName}" slot?`)) return;
    try {
      await API.request(`/timetable/${slotId}`, 'DELETE');
      Toast.success('Deleted', `${subjectName} slot removed.`);
      await loadSlots();
      renderGrid();
    } catch (err) {
      Toast.error('Error', err.message);
    }
  }

  function closeSlotModal() {
    const el = document.getElementById('tt-slot-modal');
    if (el) el.style.display = 'none';
  }

  // ─── Auto-Generate Modal ─────────────────────────────────────────────────

  function openAutoModal() {
    if (!state.selectedStandardId) {
      Toast.warning('No Class', 'Select a class first.');
      return;
    }

    const noAssignments = state.teacherAssignments.length === 0;
    const noSubjects = state.subjects.length === 0;

    const modal = document.getElementById('tt-auto-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background:var(--card-bg);border-radius:16px;padding:32px;width:100%;max-width:540px;box-shadow:var(--shadow-xl);border:1px solid var(--border-color);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h3 style="margin:0;">⚡ Auto-Generate Timetable</h3>
          <button onclick="TimetableBuilder.closeAutoModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">×</button>
        </div>

        ${noSubjects ? `<div style="background:rgba(239,68,68,0.12);border:1px solid #ef4444;border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.85rem;color:#ef4444;">⚠️ No subjects found for this class. Please add subjects first from <strong>Boards & Classes</strong>.</div>` : ''}
        ${noAssignments ? `<div style="background:rgba(245,158,11,0.12);border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.85rem;color:#f59e0b;">💡 No teacher assignments found. The timetable will be generated without teacher names. Add assignments in <strong>Faculty Management</strong> for best results.</div>` : ''}

        <p class="text-sm text-muted mb-4">The auto-generator will create a full week schedule based on educational priority rules:</p>
        <div style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.82rem;">
          <div style="margin-bottom:6px;">🔢 <strong>Core Subjects</strong> (Maths, Science, Accounts) → 5–6× per week</div>
          <div style="margin-bottom:6px;">🔤 <strong>Language Subjects</strong> (English, Hindi, Gujarati) → 3–4× per week</div>
          <div style="margin-bottom:6px;">🌍 <strong>Social Subjects</strong> (History, Civics, Geography) → 3–4× per week</div>
          <div>🎨 <strong>Light Subjects</strong> (PT, Drawing, Arts) → 1–2× per week (excluded for Class 11+)</div>
        </div>

        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;margin-bottom:20px;font-size:0.85rem;">
          ⚠️ <strong>Warning:</strong> This will clear all existing slots for this class and generate new ones. This cannot be undone.
        </div>

        <div class="form-grid mb-4">
          <div class="form-group mb-0">
            <label class="form-label">Start Time</label>
            <input type="time" id="auto-start" class="form-control" value="${state.config.start_time}">
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Slot Duration (min)</label>
            <select id="auto-duration" class="form-control">
              <option value="45">45 min</option>
              <option value="60" ${state.config.slot_duration_mins == 60 ? 'selected' : ''}>60 min</option>
              <option value="90">90 min</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Lectures Per Day</label>
            <select id="auto-lectures" class="form-control">
              ${[4,5,6,7,8].map(n => `<option value="${n}" ${state.config.lectures_per_day == n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Break (min)</label>
            <select id="auto-break" class="form-control">
              <option value="0">None</option>
              <option value="15">15 min</option>
              <option value="20" selected>20 min</option>
              <option value="30">30 min</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button class="btn btn-outline" onclick="TimetableBuilder.closeAutoModal()">Cancel</button>
          <button class="btn btn-primary" onclick="TimetableBuilder.runAutoGenerate()" ${noSubjects ? 'disabled' : ''} style="background:linear-gradient(135deg,#2EB8A0,#1BD9BC);color:#0a1a2e;border:none;">
            ⚡ Generate Now
          </button>
        </div>
      </div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeAutoModal(); });
  }

  function closeAutoModal() {
    const el = document.getElementById('tt-auto-modal');
    if (el) el.style.display = 'none';
  }

  async function runAutoGenerate() {
    const startTime = document.getElementById('auto-start')?.value || state.config.start_time;
    const slotDuration = parseInt(document.getElementById('auto-duration')?.value) || state.config.slot_duration_mins;
    const lecturesPerDay = parseInt(document.getElementById('auto-lectures')?.value) || state.config.lectures_per_day;
    const breakDuration = parseInt(document.getElementById('auto-break')?.value) || state.config.break_duration_mins;
    const workingDays = state.config.working_days;

    const btn = document.querySelector('#tt-auto-modal .btn-primary');
    if (btn) { btn.textContent = '⏳ Generating...'; btn.disabled = true; }

    try {
      const res = await API.request('/timetable/automate', 'POST', {
        standard_id: parseInt(state.selectedStandardId),
        batch_id: state.selectedBatchId ? parseInt(state.selectedBatchId) : null,
        start_time: startTime,
        slot_duration_mins: slotDuration,
        lectures_per_day: lecturesPerDay,
        break_duration_mins: breakDuration,
        working_days: workingDays,
        clear_existing: true
      });

      closeAutoModal();
      Toast.success('Generated!', res.message || `${res.slots_created} slots created.`);
      await loadSlots();
      renderGrid();
    } catch (err) {
      Toast.error('Generation Failed', err.message);
      if (btn) { btn.textContent = '⚡ Generate Now'; btn.disabled = false; }
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  async function clearTimetable() {
    if (!state.selectedStandardId) return;
    const std = state.standards.find(s => s.id == state.selectedStandardId);
    if (!confirm(`Clear ALL timetable slots for ${std?.display_name || 'this class'}? This cannot be undone.`)) return;

    try {
      let url = `/timetable/clear/${state.selectedStandardId}`;
      if (state.selectedBatchId) url += `?batch_id=${state.selectedBatchId}`;
      await API.request(url, 'DELETE');
      Toast.success('Cleared', 'All timetable slots removed.');
      await loadSlots();
      renderGrid();
    } catch (err) {
      Toast.error('Error', err.message);
    }
  }

  function printTimetable() {
    if (state.slots.length === 0) {
      Toast.warning('Empty', 'No slots to print. Add some slots first.');
      return;
    }

    const std = state.standards.find(s => s.id == state.selectedStandardId);
    const board = state.boards.find(b => b.id == state.selectedBoardId);
    const batch = state.batches.find(b => b.id == state.selectedBatchId);
    const title = `${board?.short_name || ''} — ${std?.display_name || 'Class'}${batch ? ` (${batch.name})` : ''} Weekly Timetable`;

    const activeDays = state.config.working_days.length > 0 ? state.config.working_days : ALL_DAYS.slice(0, 6);
    const slotsByDay = {};
    activeDays.forEach(d => slotsByDay[d] = []);
    state.slots.forEach(s => { if (slotsByDay[s.day_of_week] !== undefined) slotsByDay[s.day_of_week].push(s); });

    const printWin = window.open('', '_blank');
    if (!printWin) { Toast.error('Popup Blocked', 'Allow popups for printing.'); return; }

    printWin.document.write(`
      <!DOCTYPE html><html>
      <head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #1B2A4A; }
        h2 { text-align: center; margin-bottom: 5px; }
        .subtitle { text-align: center; color: #64748B; font-size: 0.85rem; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1B2A4A; color: white; padding: 10px 8px; text-align: center; font-size: 0.85rem; }
        td { border: 1px solid #CBD5E1; padding: 8px; vertical-align: top; min-width: 100px; font-size: 0.8rem; }
        .slot-card { padding: 6px 8px; border-radius: 6px; margin-bottom: 4px; background: #F1F5F9; }
        .slot-time { font-size: 0.7rem; color: #64748B; font-family: monospace; }
        .slot-subject { font-weight: 700; color: #1B2A4A; }
        .slot-teacher { font-size: 0.7rem; color: #475569; }
        @media print { .no-print { display: none; } body { padding: 10px; } }
      </style></head>
      <body>
        <div class="no-print" style="text-align:right;margin-bottom:15px;">
          <button onclick="window.print()" style="padding:8px 20px;background:#1B2A4A;color:white;border:none;border-radius:6px;cursor:pointer;">🖨️ Print</button>
        </div>
        <h2>EduTrack ERP</h2>
        <div class="subtitle">${title}</div>
        <table>
          <thead><tr><th>#</th>${activeDays.map(d => `<th>${d}</th>`).join('')}</tr></thead>
          <tbody>
            <tr><td style="font-weight:bold;text-align:center;">Slots</td>
            ${activeDays.map(day => `
              <td>
                ${(slotsByDay[day] || []).map(slot => `
                  <div class="slot-card">
                    ${slot.start_time ? `<div class="slot-time">${slot.start_time}–${slot.end_time}</div>` : ''}
                    <div class="slot-subject">${slot.subject_name}</div>
                    ${slot.teacher_name ? `<div class="slot-teacher">👤 ${slot.teacher_fullname || slot.teacher_name}</div>` : ''}
                  </div>`).join('')}
              </td>`).join('')}
            </tr>
          </tbody>
        </table>
        <p style="margin-top:15px;font-size:0.75rem;color:#94A3B8;text-align:center;">Generated: ${new Date().toLocaleDateString()} — EduTrack ERP</p>
      </body></html>`);
    printWin.document.close();
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    renderPage,
    onBoardChange,
    onStandardChange,
    onBatchChange,
    saveConfig,
    openAddSlotModal,
    openEditSlotModal,
    onSlotSubjectChange,
    autoCalcEnd,
    saveSlot,
    deleteSlot,
    closeSlotModal,
    openAutoModal,
    closeAutoModal,
    runAutoGenerate,
    clearTimetable,
    printTimetable
  };
})();

window.TimetableBuilder = TimetableBuilder;
