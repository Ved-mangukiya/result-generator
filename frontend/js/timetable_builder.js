/* ═══════════════════════════════════════════════
   TIMETABLE_BUILDER.JS — Dedicated Timetable Builder
   Features:
   - Segment 1: Smart AI Auto-Generator & Interactive Live Grid with Drag-and-Drop
   - Segment 2: Faculty Drag & Drop Studio (Left Faculty Palette + Right Dropzone Matrix)
   - Real-time DB Sync, Conflict Detection, and Clean A4 Export
   ═══════════════════════════════════════════════ */

const TimetableBuilder = (() => {
  // ─── State ────────────────────────────────────────────────────────────────
  let state = {
    activeSegment: 'segment1', // 'segment1' (Auto + Grid) or 'segment2' (Faculty Palette Drag & Drop)
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
    draggedSlot: null,
    draggedFacultyChip: null,
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
    if (typeof setPageTitle === 'function') {
      setPageTitle('Timetable Studio', 'Timetable Studio');
    }

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1>🗓️ Timetable Studio</h1>
          <p>Create, auto-generate, and design weekly lecture schedules with drag &amp; drop interactivity.</p>
        </div>
        <div class="page-header-actions" id="tt-header-actions" style="display:none;">
          <button class="btn btn-outline btn-sm" onclick="TimetableBuilder.clearTimetable()">🗑️ Clear All</button>
          <button class="btn btn-outline btn-sm" onclick="TimetableBuilder.printTimetable()">🖨️ Print A4 PDF</button>
          <button class="btn btn-teal btn-sm" onclick="TimetableBuilder.openAutoModal()" style="background:linear-gradient(135deg,#2EB8A0,#1BD9BC);color:#0a1a2e;border:none;font-weight:700;">⚡ Auto-Generate</button>
          <button class="btn btn-primary btn-sm" onclick="TimetableBuilder.openAddSlotModal()">➕ Add Slot</button>
        </div>
      </div>

      <!-- Segment Switcher Header -->
      <div class="tabs mb-5" style="display:flex; gap:8px;">
        <button class="btn ${state.activeSegment === 'segment1' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-seg-1" onclick="TimetableBuilder.switchSegment('segment1')">
          ⚡ Segment 1: Smart Auto-Generator &amp; Live Matrix
        </button>
        <button class="btn ${state.activeSegment === 'segment2' ? 'btn-primary' : 'btn-outline'} btn-sm" id="btn-seg-2" onclick="TimetableBuilder.switchSegment('segment2')">
          🎨 Segment 2: Faculty Drag &amp; Drop Studio (Custom Schedule Mode)
        </button>
      </div>

      <!-- Step 1: Board → Class → Batch Selection -->
      <div class="card mb-5" id="tt-selector-card">
        <div style="padding:var(--space-5);">
          <h3 class="mb-4">📌 Step 1: Select Class &amp; Batch</h3>
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
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
            <h3 class="mb-0">⚙️ Step 2: Schedule Configuration</h3>
            <button class="btn btn-outline btn-sm" onclick="TimetableBuilder.saveConfig()">💾 Save Schedule Timing</button>
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
              <label class="form-label">Slot Duration</label>
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
              <label class="form-label">Break Duration</label>
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

      <!-- SEGMENT 1 CONTAINER: AUTO + VISUAL GRID -->
      <div id="tt-segment-1-wrap" style="display:none;">
        <div class="card" id="tt-grid-section">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h3 id="tt-grid-title" style="margin:0;">📅 Weekly Schedule Matrix</h3>
              <p class="text-xs text-muted" style="margin:0;">Drag and drop lecture cards between days &amp; time slots. Auto-syncs to database.</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge badge-primary" id="tt-slot-count">0 slots</span>
              <button class="btn btn-teal btn-sm" onclick="TimetableBuilder.openAutoModal()" style="background:linear-gradient(135deg,#2EB8A0,#1BD9BC);color:#0a1a2e;border:none;font-weight:700;">
                ⚡ Auto-Generate Schedule
              </button>
            </div>
          </div>
          <div class="card-body" style="padding:var(--space-6); overflow-x:auto;">
            <div id="tt-grid-container">
              <div class="empty-state" style="padding:var(--space-12)">
                <div class="empty-state-icon">🗓️</div>
                <h3>Select a Class to View Schedule</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SEGMENT 2 CONTAINER: FACULTY DRAG & DROP STUDIO -->
      <div id="tt-segment-2-wrap" style="display:none;">
        <div style="display:grid; grid-template-columns: 280px 1fr; gap: 20px; align-items:start;">
          <!-- Left Palette: Faculty & Subject Cards -->
          <div class="card" style="position:sticky; top:20px;">
            <div class="card-header" style="padding:14px 18px;">
              <h3 style="margin:0; font-size:1.05rem;">🎨 Faculty &amp; Subject Palette</h3>
              <p class="text-xs text-muted" style="margin:0;">Drag chips onto any slot on the right grid</p>
            </div>
            <div class="card-body" style="padding:14px 18px; max-height:calc(100vh - 200px); overflow-y:auto;">
              <div id="tt-palette-list" style="display:flex; flex-direction:column; gap:10px;">
                <!-- Draggable Faculty Chips injected here -->
                <div class="text-muted text-xs">Loading faculty chips...</div>
              </div>

              <!-- Quick Custom Subject Adder -->
              <div style="margin-top:16px; padding-top:14px; border-top:1px dashed var(--border-color);">
                <div class="text-xs font-bold mb-2">➕ Quick Custom Chip</div>
                <div style="display:flex; gap:6px; margin-bottom:6px;">
                  <input type="text" id="tt-custom-chip-name" class="form-control form-control-sm" placeholder="e.g. Science Lab">
                  <button class="btn btn-outline btn-xs" onclick="TimetableBuilder.addCustomPaletteChip()">Add</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Interactive Drag & Drop Studio Matrix -->
          <div class="card">
            <div class="card-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
              <div>
                <h3 style="margin:0; font-size:1.05rem;">🗓️ Drag &amp; Drop Timetable Studio</h3>
                <p class="text-xs text-muted" style="margin:0;">Drop faculty cards directly into time slots</p>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-outline btn-sm" onclick="TimetableBuilder.clearTimetable()">🗑️ Clear Matrix</button>
                <button class="btn btn-primary btn-sm" onclick="TimetableBuilder.saveStudioTimetable()" style="font-weight:700;">💾 Save Schedule to DB</button>
              </div>
            </div>
            <div class="card-body" style="padding:var(--space-5); overflow-x:auto;">
              <div id="tt-studio-grid-container">
                <!-- Dropzone Matrix Injected Here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    await loadInitialData();
  }

  function switchSegment(seg) {
    state.activeSegment = seg;
    const btn1 = document.getElementById('btn-seg-1');
    const btn2 = document.getElementById('btn-seg-2');
    const wrap1 = document.getElementById('tt-segment-1-wrap');
    const wrap2 = document.getElementById('tt-segment-2-wrap');

    if (btn1) btn1.className = `btn ${seg === 'segment1' ? 'btn-primary' : 'btn-outline'} btn-sm`;
    if (btn2) btn2.className = `btn ${seg === 'segment2' ? 'btn-primary' : 'btn-outline'} btn-sm`;

    if (state.selectedStandardId) {
      if (wrap1) wrap1.style.display = seg === 'segment1' ? 'block' : 'none';
      if (wrap2) wrap2.style.display = seg === 'segment2' ? 'block' : 'none';
      if (seg === 'segment1') renderGrid();
      else renderStudioGrid();
    }
  }

  // ─── Initial Data Loading ──────────────────────────────────────────────────

  async function loadInitialData() {
    try {
      state.boards = await API.boards.list();
      const boardSel = document.getElementById('tt-board-sel');
      if (boardSel) {
        boardSel.innerHTML = '<option value="">-- Select Board --</option>' +
          state.boards.map(b => `<option value="${b.id}">${b.name} (${b.short_name})</option>`).join('');
      }

      // Pre-fetch teachers for Faculty Palette
      try {
        const teachRes = await API.request('/teachers');
        state.teachers = teachRes.teachers || [];
      } catch (e) {}

      // Auto-select first board if available
      if (state.boards.length > 0) {
        state.selectedBoardId = state.boards[0].id;
        boardSel.value = state.selectedBoardId;
        await onBoardChange();
      }
    } catch (e) {
      Toast.error('Failed to load boards', e.message);
    }
  }

  async function onBoardChange() {
    const boardId = document.getElementById('tt-board-sel').value;
    state.selectedBoardId = boardId ? parseInt(boardId) : null;
    state.selectedStandardId = null;
    state.selectedBatchId = null;
    hideGrid();

    const stdSel = document.getElementById('tt-std-sel');
    stdSel.innerHTML = '<option value="">-- Select Class --</option>';

    if (!state.selectedBoardId) return;

    try {
      state.standards = await API.boards.getStandards(state.selectedBoardId);
      stdSel.innerHTML = '<option value="">-- Select Class --</option>' +
        state.standards.map(s => `<option value="${s.id}">${s.display_name}</option>`).join('');

      if (state.standards.length > 0) {
        state.selectedStandardId = state.standards[0].id;
        stdSel.value = state.selectedStandardId;
        await onStandardChange();
      }
    } catch (e) {
      Toast.error('Failed to load classes', e.message);
    }
  }

  async function onStandardChange() {
    const stdId = document.getElementById('tt-std-sel').value;
    state.selectedStandardId = stdId ? parseInt(stdId) : null;
    state.selectedBatchId = null;

    if (!state.selectedStandardId) {
      hideGrid();
      return;
    }

    // Load batches
    try {
      state.batches = await API.batches.list(state.selectedStandardId);
      const batchSel = document.getElementById('tt-batch-sel');
      batchSel.innerHTML = '<option value="">All Batches</option>' +
        (state.batches || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    } catch (e) { state.batches = []; }

    await loadSubjects();
    await loadTeacherAssignments();
    await loadConfig();
    await loadSlots();
    showGrid();
  }

  async function onBatchChange() {
    const batchId = document.getElementById('tt-batch-sel').value;
    state.selectedBatchId = batchId ? parseInt(batchId) : null;
    if (state.selectedStandardId) {
      await loadSlots();
      if (state.activeSegment === 'segment1') renderGrid();
      else renderStudioGrid();
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
      if (state.activeSegment === 'segment1') renderGrid();
      else renderStudioGrid();
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
    document.getElementById('tt-segment-1-wrap').style.display = 'none';
    document.getElementById('tt-segment-2-wrap').style.display = 'none';
    document.getElementById('tt-header-actions').style.display = 'none';
  }

  function showGrid() {
    document.getElementById('tt-config-card').style.display = '';
    document.getElementById('tt-header-actions').style.display = '';
    switchSegment(state.activeSegment);

    const std = state.standards.find(s => s.id == state.selectedStandardId);
    const board = state.boards.find(b => b.id == state.selectedBoardId);
    const batch = state.batches.find(b => b.id == state.selectedBatchId);
    const title = `${board?.short_name || ''} — ${std?.display_name || 'Class'}${batch ? ` (${batch.name})` : ''}`;
    const titleEl = document.getElementById('tt-grid-title');
    if (titleEl) titleEl.textContent = `📅 Weekly Timetable: ${title}`;
  }

  // ─── Segment 1: Visual Interactive Grid with Drag-and-Drop ─────────────────

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
          cursor: grab;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.2s;
          position: relative;
          border: 2px solid transparent;
          user-select: none;
        }
        .tt-slot-card:active { cursor: grabbing; opacity: 0.75; transform: scale(0.98); }
        .tt-slot-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
        .tt-slot-card.conflict { border-color: #ef4444 !important; box-shadow: 0 0 0 2px rgba(239,68,68,0.4); animation: conflictPulse 1.5s infinite; }
        @keyframes conflictPulse { 0%,100%{opacity:1} 50%{opacity:0.75} }
        .tt-slot-time { font-size: 0.72rem; opacity: 0.85; margin-bottom: 3px; font-family: monospace; font-weight: 700; }
        .tt-slot-subject { font-weight: 800; font-size: 0.92rem; margin-bottom: 2px; }
        .tt-slot-teacher { font-size: 0.75rem; opacity: 0.9; }
        .tt-slot-delete { position:absolute;top:4px;right:6px;background:rgba(0,0,0,0.2);border:none;cursor:pointer;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;transition:all 0.2s;color:white; }
        .tt-slot-delete:hover { background:#ef4444; }
        .tt-dropzone { min-height: 80px; border-radius: 8px; transition: background 0.2s, border 0.2s; }
        .tt-dropzone.drag-hover { background: rgba(46,184,160,0.15); border: 2px dashed #2EB8A0; }
      </style>
      <div style="display:flex; gap:12px; min-width:max-content;">
        ${activeDays.map(day => {
          const daySlots = slotsByDay[day] || [];
          const dayColor = DAY_COLORS[day] || '#94A3B8';
          return `
            <div class="tt-day-col">
              <div style="background:${dayColor};color:${day==='Thursday'?'#1B2A4A':'white'};padding:10px 12px;border-radius:10px 10px 0 0;font-weight:800;font-size:0.85rem;text-align:center;letter-spacing:0.04em;margin-bottom:8px;">
                ${day}
                <span style="font-size:0.72rem;font-weight:400;opacity:0.9;margin-left:4px;">(${daySlots.length})</span>
              </div>
              <div class="tt-dropzone" id="tt-dropzone-${day}" 
                ondragover="TimetableBuilder.onGridDragOver(event)" 
                ondragleave="TimetableBuilder.onGridDragLeave(event)" 
                ondrop="TimetableBuilder.onGridDrop(event, '${day}')">
                ${daySlots.map(slot => {
                  const isConflict = conflictIds.has(slot.id);
                  const color = getSubjectColor(slot.subject_name);
                  return `
                    <div class="tt-slot-card ${isConflict ? 'conflict' : ''}"
                      id="tt-slot-card-${slot.id}"
                      draggable="true"
                      ondragstart="TimetableBuilder.onSlotDragStart(event, ${slot.id})"
                      style="background:linear-gradient(135deg,${color}20,${color}35);border-color:${isConflict?'#ef4444':color+'66'};"
                      title="${isConflict ? '⚠️ CONFLICT: Overlapping time with another slot!' : slot.subject_name}"
                      onclick="TimetableBuilder.openEditSlotModal(${slot.id})">
                      <button class="tt-slot-delete" onclick="event.stopPropagation();TimetableBuilder.deleteSlot(${slot.id},'${slot.subject_name.replace(/'/g,"\\'")}')" title="Delete">✕</button>
                      ${isConflict ? '<div style="font-size:0.7rem;color:#ef4444;font-weight:700;margin-bottom:3px;">⚠️ CONFLICT</div>' : ''}
                      ${(slot.start_time && slot.end_time) ? `<div class="tt-slot-time">🕐 ${slot.start_time} – ${slot.end_time}</div>` : (slot.time_slot ? `<div class="tt-slot-time">🕐 ${slot.time_slot}</div>` : '')}
                      <div class="tt-slot-subject" style="color:${color};">${slot.subject_name}</div>
                      ${slot.teacher_fullname || slot.teacher_name ? `<div class="tt-slot-teacher">👨‍🏫 ${slot.teacher_fullname || slot.teacher_name}</div>` : ''}
                      ${slot.room_no ? `<div class="tt-slot-teacher" style="opacity:0.7;">🏫 ${slot.room_no}</div>` : ''}
                    </div>`;
                }).join('')}
              </div>
              <button class="tt-add-slot-btn btn btn-outline btn-xs" style="width:100%; margin-top:6px;" onclick="TimetableBuilder.openAddSlotModal('${day}')">➕ Add for ${day.slice(0,3)}</button>
            </div>`;
        }).join('')}
      </div>`;

    container.innerHTML = html;
  }

  // Drag & Drop handlers for Segment 1
  function onSlotDragStart(e, slotId) {
    state.draggedSlot = state.slots.find(s => s.id === slotId);
    e.dataTransfer.setData('text/plain', String(slotId));
  }

  function onGridDragOver(e) {
    e.preventDefault();
    const zone = e.currentTarget;
    if (zone) zone.classList.add('drag-hover');
  }

  function onGridDragLeave(e) {
    const zone = e.currentTarget;
    if (zone) zone.classList.remove('drag-hover');
  }

  async function onGridDrop(e, targetDay) {
    e.preventDefault();
    const zone = e.currentTarget;
    if (zone) zone.classList.remove('drag-hover');

    if (!state.draggedSlot) return;

    if (state.draggedSlot.day_of_week === targetDay) return; // Same day drop

    // Move slot to target day
    try {
      await API.timetable.updateSlot(state.draggedSlot.id, {
        ...state.draggedSlot,
        day_of_week: targetDay
      });
      state.draggedSlot.day_of_week = targetDay;
      Toast.success('Moved', `Moved lecture to ${targetDay}`);
      renderGrid();
    } catch(err) {
      Toast.error('Move Failed', err.message);
    } finally {
      state.draggedSlot = null;
    }
  }

  // ─── Segment 2: Faculty Drag & Drop Studio (Palette & Custom Matrix) ──────

  function renderStudioGrid() {
    renderPaletteList();
    renderStudioMatrix();
  }

  function renderPaletteList() {
    const palList = document.getElementById('tt-palette-list');
    if (!palList) return;

    // Build palette items from Subjects + Teacher Assignments
    const paletteItems = [];

    state.subjects.forEach(sub => {
      // Find assigned teacher if any
      const assign = state.teacherAssignments.find(a => a.subject_id === sub.id || a.subject_name === sub.name);
      paletteItems.push({
        id: `subj-${sub.id}`,
        subject_id: sub.id,
        subject_name: sub.name,
        teacher_id: assign ? assign.teacher_id : null,
        teacher_name: assign ? assign.teacher_name : 'Faculty',
        room_no: 'Room 101'
      });
    });

    if (paletteItems.length === 0) {
      palList.innerHTML = `<div class="text-xs text-muted">No subjects found in class. Add subjects in Class Management.</div>`;
      return;
    }

    palList.innerHTML = paletteItems.map(item => {
      const color = getSubjectColor(item.subject_name);
      return `
        <div class="tt-palette-chip" 
          draggable="true" 
          ondragstart="TimetableBuilder.onPaletteChipDragStart(event, '${encodeURIComponent(JSON.stringify(item))}')"
          style="padding:10px 14px; border-radius:10px; background:linear-gradient(135deg,${color}20,${color}35); border:1.5px solid ${color}; cursor:grab; user-select:none; transition:all 0.2s;">
          <div style="font-weight:800; color:${color}; font-size:0.9rem;">${item.subject_name}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">👨‍🏫 ${item.teacher_name} · 🏫 ${item.room_no}</div>
        </div>
      `;
    }).join('');
  }

  function renderStudioMatrix() {
    const container = document.getElementById('tt-studio-grid-container');
    if (!container) return;

    const activeDays = state.config.working_days.length > 0
      ? state.config.working_days
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const numLectures = state.config.lectures_per_day || 6;
    const duration = state.config.slot_duration_mins || 60;
    const [startH, startM] = (state.config.start_time || '08:00').split(':').map(Number);

    // Build time slots array
    const periods = [];
    let curMins = startH * 60 + startM;
    for (let i = 0; i < numLectures; i++) {
      const endMins = curMins + duration;
      const formatTime = (m) => {
        const hh = Math.floor(m / 60).toString().padStart(2, '0');
        const mm = (m % 60).toString().padStart(2, '0');
        return `${hh}:${mm}`;
      };
      periods.push({
        periodNum: i + 1,
        startTime: formatTime(curMins),
        endTime: formatTime(endMins),
        label: `${formatTime(curMins)} – ${formatTime(endMins)}`
      });
      curMins = endMins;
    }

    const html = `
      <style>
        .studio-table { width: 100%; border-collapse: separate; border-spacing: 6px; }
        .studio-cell {
          background: var(--bg-secondary);
          border: 1.5px dashed rgba(255,255,255,0.15);
          border-radius: 8px;
          min-height: 70px;
          padding: 6px;
          transition: all 0.2s;
          vertical-align: top;
        }
        .studio-cell.drag-hover {
          background: rgba(46,184,160,0.2) !important;
          border-color: #2EB8A0 !important;
          transform: scale(1.02);
        }
        .studio-filled-chip {
          padding: 8px 10px;
          border-radius: 8px;
          position: relative;
          font-size: 0.8rem;
          cursor: grab;
        }
      </style>
      <table class="studio-table">
        <thead>
          <tr>
            <th style="width:110px; padding:10px; text-align:center; font-size:0.8rem; background:var(--bg-surface); border-radius:6px;">Period</th>
            ${activeDays.map(d => `
              <th style="padding:10px; text-align:center; font-size:0.85rem; font-weight:800; color:white; background:${DAY_COLORS[d] || '#5B8AF0'}; border-radius:6px;">
                ${d}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${periods.map(p => `
            <tr>
              <td style="padding:8px; text-align:center; background:var(--bg-surface); border-radius:6px; font-family:monospace; font-size:0.75rem; font-weight:700;">
                <div>Period ${p.periodNum}</div>
                <div class="text-muted" style="font-size:0.7rem;">${p.label}</div>
              </td>
              ${activeDays.map(d => {
                const matchSlot = state.slots.find(s => s.day_of_week === d && s.start_time === p.startTime);
                const color = matchSlot ? getSubjectColor(matchSlot.subject_name) : '#2EB8A0';
                return `
                  <td class="studio-cell" 
                    id="cell-${d}-${p.periodNum}"
                    ondragover="TimetableBuilder.onStudioCellDragOver(event)"
                    ondragleave="TimetableBuilder.onStudioCellDragLeave(event)"
                    ondrop="TimetableBuilder.onStudioCellDrop(event, '${d}', '${p.startTime}', '${p.endTime}')">
                    ${matchSlot ? `
                      <div class="studio-filled-chip" 
                        draggable="true"
                        ondragstart="TimetableBuilder.onStudioFilledChipDragStart(event, ${matchSlot.id})"
                        style="background:linear-gradient(135deg,${color}25,${color}45); border:1.5px solid ${color};">
                        <button style="position:absolute; top:2px; right:4px; border:none; background:none; color:white; cursor:pointer; font-size:0.7rem;" onclick="TimetableBuilder.deleteSlot(${matchSlot.id})">✕</button>
                        <div style="font-weight:800; color:${color}; margin-bottom:2px;">${matchSlot.subject_name}</div>
                        <div class="text-xs text-muted">👨‍🏫 ${matchSlot.teacher_name || 'Faculty'}</div>
                      </div>
                    ` : `
                      <div style="height:100%; min-height:55px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.25); font-size:0.75rem;">
                        + Drop Here
                      </div>
                    `}
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  function onPaletteChipDragStart(e, chipJson) {
    state.draggedFacultyChip = JSON.parse(decodeURIComponent(chipJson));
    e.dataTransfer.setData('text/plain', 'palette-chip');
  }

  function onStudioFilledChipDragStart(e, slotId) {
    state.draggedSlot = state.slots.find(s => s.id === slotId);
    e.dataTransfer.setData('text/plain', String(slotId));
  }

  function onStudioCellDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-hover');
  }

  function onStudioCellDragLeave(e) {
    e.currentTarget.classList.remove('drag-hover');
  }

  async function onStudioCellDrop(e, day, startTime, endTime) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-hover');

    if (state.draggedFacultyChip) {
      // Create or replace slot in cell
      try {
        const payload = {
          standard_id: state.selectedStandardId,
          batch_id: state.selectedBatchId || null,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          subject_name: state.draggedFacultyChip.subject_name,
          subject_id: state.draggedFacultyChip.subject_id || null,
          teacher_name: state.draggedFacultyChip.teacher_name || '',
          teacher_id: state.draggedFacultyChip.teacher_id || null,
          room_no: state.draggedFacultyChip.room_no || 'Room 101'
        };

        await API.timetable.addSlot(payload);
        Toast.success('Assigned', `Assigned ${payload.subject_name} to ${day} (${startTime}–${endTime})`);
        await loadSlots();
        renderStudioGrid();
      } catch(err) {
        Toast.error('Assignment Failed', err.message);
      } finally {
        state.draggedFacultyChip = null;
      }
    } else if (state.draggedSlot) {
      // Move slot to new period / day
      try {
        await API.timetable.updateSlot(state.draggedSlot.id, {
          ...state.draggedSlot,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime
        });
        Toast.success('Moved', `Moved lecture to ${day} (${startTime}–${endTime})`);
        await loadSlots();
        renderStudioGrid();
      } catch(err) {
        Toast.error('Move Failed', err.message);
      } finally {
        state.draggedSlot = null;
      }
    }
  }

  function addCustomPaletteChip() {
    const input = document.getElementById('tt-custom-chip-name');
    if (!input || !input.value.trim()) return;
    const name = input.value.trim();

    state.subjects.push({
      id: null,
      name,
      standard_id: state.selectedStandardId
    });
    input.value = '';
    renderPaletteList();
    Toast.success('Added', `Added "${name}" to Palette`);
  }

  async function saveStudioTimetable() {
    Spinner.show('Saving timetable schedule to database...');
    try {
      await API.timetable.bulkSave({
        standard_id: state.selectedStandardId,
        batch_id: state.selectedBatchId || null,
        slots: state.slots
      });
      Spinner.hide();
      Toast.success('Saved to Database', 'Weekly timetable saved successfully!');
    } catch(err) {
      Spinner.hide();
      Toast.error('Save Failed', err.message);
    }
  }

  // ─── Conflict Detection ──────────────────────────────────────────────────

  function detectConflicts(slots) {
    const conflicts = new Set();
    const withTimes = slots.filter(s => s.start_time && s.end_time);

    for (let i = 0; i < withTimes.length; i++) {
      for (let j = i + 1; j < withTimes.length; j++) {
        const a = withTimes[i];
        const b = withTimes[j];
        if (a.day_of_week === b.day_of_week) {
          const aStart = a.start_time, aEnd = a.end_time;
          const bStart = b.start_time, bEnd = b.end_time;
          if (aStart < bEnd && bStart < aEnd) {
            conflicts.add(a);
            conflicts.add(b);
          }
        }
      }
    }
    return Array.from(conflicts);
  }

  // ─── Slot Add/Edit Modal ──────────────────────────────────────────────────

  function openAddSlotModal(defaultDay = '') {
    openSlotModal(null, defaultDay);
  }

  function openEditSlotModal(slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (slot) openSlotModal(slot);
  }

  function openSlotModal(slot = null, defaultDay = '') {
    const isEdit = !!slot;
    const activeDays = state.config.working_days.length > 0
      ? state.config.working_days
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const modalHtml = `
      <div class="modal-overlay" id="tt-slot-modal" style="z-index:99999;">
        <div class="modal modal-md animate-scale-in" style="max-width:520px;">
          <div class="modal-header">
            <h3>${isEdit ? '✏️ Edit Lecture Slot' : '➕ Add Lecture Slot'}</h3>
            <button class="modal-close" onclick="TimetableBuilder.closeSlotModal()">✕</button>
          </div>
          <div class="modal-body" style="padding:20px;">
            <input type="hidden" id="modal-slot-id" value="${slot?.id || ''}">
            
            <div class="form-group mb-3">
              <label class="form-label font-bold">Day of Week</label>
              <select id="modal-day" class="form-control">
                ${activeDays.map(d => `<option value="${d}" ${(slot?.day_of_week || defaultDay) === d ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Subject</label>
              <select id="modal-subject" class="form-control" onchange="TimetableBuilder.onSlotSubjectChange(this.value)">
                <option value="">-- Select Subject --</option>
                ${state.subjects.map(s => `<option value="${s.name}" data-id="${s.id}" ${slot?.subject_name === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}
              </select>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;" class="mb-3">
              <div class="form-group mb-0">
                <label class="form-label font-bold">Start Time</label>
                <input type="time" id="modal-start-time" class="form-control" value="${slot?.start_time || state.config.start_time}" onchange="TimetableBuilder.autoCalcEnd()">
              </div>
              <div class="form-group mb-0">
                <label class="form-label font-bold">End Time</label>
                <input type="time" id="modal-end-time" class="form-control" value="${slot?.end_time || ''}">
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">Teacher / Faculty</label>
              <input type="text" id="modal-teacher" class="form-control" value="${slot?.teacher_name || ''}" placeholder="Faculty name">
            </div>

            <div class="form-group mb-0">
              <label class="form-label font-bold">Room / Hall</label>
              <input type="text" id="modal-room" class="form-control" value="${slot?.room_no || 'Room 101'}" placeholder="e.g. Room 101">
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; padding:14px 20px;">
            <button class="btn btn-outline" onclick="TimetableBuilder.closeSlotModal()">Cancel</button>
            <button class="btn btn-primary" onclick="TimetableBuilder.saveSlot()">💾 Save Slot</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (!slot) autoCalcEnd();
  }

  function autoCalcEnd() {
    const startVal = document.getElementById('modal-start-time')?.value;
    if (!startVal) return;
    const [h, m] = startVal.split(':').map(Number);
    const duration = state.config.slot_duration_mins || 60;
    const totalMins = h * 60 + m + duration;
    const endH = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const endM = (totalMins % 60).toString().padStart(2, '0');
    const endEl = document.getElementById('modal-end-time');
    if (endEl) endEl.value = `${endH}:${endM}`;
  }

  function onSlotSubjectChange(subName) {
    const assign = state.teacherAssignments.find(a => a.subject_name === subName);
    if (assign) {
      const teachEl = document.getElementById('modal-teacher');
      if (teachEl) teachEl.value = assign.teacher_name;
    }
  }

  async function saveSlot() {
    const id = document.getElementById('modal-slot-id')?.value;
    const day = document.getElementById('modal-day')?.value;
    const subject = document.getElementById('modal-subject')?.value;
    const startTime = document.getElementById('modal-start-time')?.value;
    const endTime = document.getElementById('modal-end-time')?.value;
    const teacher = document.getElementById('modal-teacher')?.value;
    const room = document.getElementById('modal-room')?.value;

    if (!day || !subject) {
      Toast.warning('Missing Fields', 'Please select day and subject.');
      return;
    }

    const payload = {
      standard_id: state.selectedStandardId,
      batch_id: state.selectedBatchId || null,
      day_of_week: day,
      subject_name: subject,
      start_time: startTime,
      end_time: endTime,
      teacher_name: teacher,
      room_no: room
    };

    try {
      if (id) {
        await API.timetable.updateSlot(id, payload);
        Toast.success('Updated', 'Lecture slot updated.');
      } else {
        await API.timetable.addSlot(payload);
        Toast.success('Added', 'Lecture slot added.');
      }
      closeSlotModal();
      await loadSlots();
      if (state.activeSegment === 'segment1') renderGrid();
      else renderStudioGrid();
    } catch(err) {
      Toast.error('Save Failed', err.message);
    }
  }

  async function deleteSlot(slotId) {
    try {
      await API.timetable.deleteSlot(slotId);
      Toast.info('Deleted', 'Lecture slot removed.');
      await loadSlots();
      if (state.activeSegment === 'segment1') renderGrid();
      else renderStudioGrid();
    } catch(err) {
      Toast.error('Delete Failed', err.message);
    }
  }

  function closeSlotModal() {
    document.getElementById('tt-slot-modal')?.remove();
  }

  // ─── Auto-Generate Modal ──────────────────────────────────────────────────

  function openAutoModal() {
    const modalHtml = `
      <div class="modal-overlay" id="tt-auto-modal" style="z-index:99999;">
        <div class="modal modal-md animate-scale-in" style="max-width:520px;">
          <div class="modal-header" style="background:linear-gradient(135deg,#0f172a,#1e293b); color:white;">
            <h3 style="color:white; margin:0;">⚡ Smart AI Timetable Auto-Generator</h3>
            <button class="modal-close" style="color:white;" onclick="TimetableBuilder.closeAutoModal()">✕</button>
          </div>
          <div class="modal-body" style="padding:20px;">
            <p style="font-size:0.875rem; color:var(--text-secondary); margin-bottom:16px;">
              The system will automatically balance core subjects, faculty workloads, and breaks across the entire week without any time overlaps.
            </p>
            <div class="form-group mb-3">
              <label class="form-check-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="auto-clear-existing" checked style="accent-color:var(--primary);">
                <span>Replace existing timetable slots for this class</span>
              </label>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; padding:14px 20px;">
            <button class="btn btn-outline" onclick="TimetableBuilder.closeAutoModal()">Cancel</button>
            <button class="btn btn-primary" onclick="TimetableBuilder.runAutoGenerate()" style="background:linear-gradient(135deg,#2EB8A0,#1BD9BC); color:#0a1a2e; border:none; font-weight:800;">
              ⚡ Generate Schedule Now
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function closeAutoModal() {
    document.getElementById('tt-auto-modal')?.remove();
  }

  async function runAutoGenerate() {
    const clearExisting = document.getElementById('auto-clear-existing')?.checked ?? true;
    closeAutoModal();
    Spinner.show('Auto-generating balanced weekly schedule...');

    try {
      const res = await API.timetable.automate({
        standard_id: state.selectedStandardId,
        batch_id: state.selectedBatchId || null,
        start_time: state.config.start_time,
        end_time: state.config.end_time,
        slot_duration_mins: state.config.slot_duration_mins,
        break_duration_mins: state.config.break_duration_mins,
        lectures_per_day: state.config.lectures_per_day,
        working_days: state.config.working_days,
        clear_existing: clearExisting
      });

      Spinner.hide();
      Toast.success('Schedule Generated!', res.message || 'Auto-generated timetable slots.');
      await loadSlots();
      if (state.activeSegment === 'segment1') renderGrid();
      else renderStudioGrid();
    } catch(err) {
      Spinner.hide();
      Toast.error('Auto-generation Failed', err.message);
    }
  }

  async function clearTimetable() {
    const ok = await Confirm.show('Clear Timetable?', 'Are you sure you want to clear all lecture slots for this class?', 'Clear All', 'btn-danger');
    if (!ok) return;

    try {
      await API.timetable.clear(state.selectedStandardId, state.selectedBatchId);
      Toast.info('Cleared', 'Timetable cleared.');
      await loadSlots();
      if (state.activeSegment === 'segment1') renderGrid();
      else renderStudioGrid();
    } catch(err) {
      Toast.error('Failed to clear', err.message);
    }
  }

  // ─── A4 PDF Print Export ──────────────────────────────────────────────────

  async function printTimetable() {
    const std = state.standards.find(s => s.id == state.selectedStandardId);
    const board = state.boards.find(b => b.id == state.selectedBoardId);
    const batch = state.batches.find(b => b.id == state.selectedBatchId);
    const title = `${board?.short_name || ''} — ${std?.display_name || 'Class'}${batch ? ` (${batch.name})` : ''}`;

    let profile = {};
    try {
      const pRes = await API.coaching.get();
      profile = pRes?.profile || {};
    } catch(e) {}

    const activeDays = state.config.working_days.length > 0
      ? state.config.working_days
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const slotsByDay = {};
    activeDays.forEach(d => slotsByDay[d] = []);
    state.slots.forEach(slot => {
      if (slotsByDay[slot.day_of_week] !== undefined) slotsByDay[slot.day_of_week].push(slot);
    });

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Timetable - ${title}</title>
        <style>
          @page { size: A4 landscape; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
          html, body { width: 297mm; height: 210mm; max-width: 297mm; max-height: 210mm; overflow: hidden; background: #fff; color: #1e293b; }
          .page-container { width: 297mm; height: 210mm; padding: 12mm 15mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
          .header { text-align: center; border-bottom: 2px solid #1B2A4A; padding-bottom: 8px; margin-bottom: 8px; }
          .header h1 { font-size: 1.35rem; font-weight: 900; color: #1B2A4A; }
          .header p { font-size: 0.75rem; color: #64748B; }
          .sub-bar { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 6px; margin-bottom: 10px; font-size: 0.8rem; font-weight: 700; color: #1B2A4A; }
          .grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; flex: 1; margin-bottom: 8px; }
          .grid-table th { background: #1B2A4A; color: #fff; padding: 6px 4px; font-size: 0.75rem; text-align: center; border: 1px solid #cbd5e1; }
          .grid-table td { border: 1px solid #cbd5e1; padding: 4px; vertical-align: top; font-size: 0.72rem; }
          .slot-card { background: #f1f5f9; border-left: 3px solid #2EB8A0; padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; }
          .slot-time { font-family: monospace; font-size: 0.65rem; color: #64748B; font-weight: 700; }
          .slot-subject { font-weight: 800; color: #0f172a; font-size: 0.75rem; }
          .slot-teacher { font-size: 0.65rem; color: #475569; }
          .footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 5px; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="position:fixed;top:10px;right:10px;z-index:999;">
          <button onclick="window.print()" style="padding:8px 20px;background:#1B2A4A;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.2);">🖨️ Print A4 Timetable</button>
        </div>
        <div class="page-container">
          <div>
            <div class="header">
              <h1>${profile.name || 'EduTrack ERP Academy'}</h1>
              <p>${profile.tagline || 'Excellence in Coaching & Education'} ${profile.phone ? '· Contact: ' + profile.phone : ''}</p>
            </div>
            <div class="sub-bar">
              <div>📅 Class Timetable: ${title}</div>
              <div>Academic Year 2026–2027</div>
            </div>
          </div>
          <table class="grid-table">
            <thead>
              <tr>${activeDays.map(d => `<th>${d}</th>`).join('')}</tr>
            </thead>
            <tbody>
              <tr>
                ${activeDays.map(day => `
                  <td>
                    ${(slotsByDay[day] || []).length === 0 ? '<div style="text-align:center;color:#cbd5e1;padding:15px 0;font-style:italic;font-size:0.75rem;">No lectures</div>' : ''}
                    ${(slotsByDay[day] || []).map(slot => `
                      <div class="slot-card">
                        ${slot.start_time ? `<div class="slot-time">🕐 ${slot.start_time} – ${slot.end_time}</div>` : ''}
                        <div class="slot-subject">${slot.subject_name}</div>
                        ${slot.teacher_name ? `<div class="slot-teacher">👨‍🏫 ${slot.teacher_fullname || slot.teacher_name}</div>` : ''}
                        ${slot.room_no ? `<div class="slot-teacher" style="opacity:0.7;">🏫 ${slot.room_no}</div>` : ''}
                      </div>`).join('')}
                  </td>`).join('')}
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <span>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span>Authorized Signatory: _______________________</span>
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    renderPage,
    switchSegment,
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
    printTimetable,
    onSlotDragStart,
    onGridDragOver,
    onGridDragLeave,
    onGridDrop,
    onPaletteChipDragStart,
    onStudioFilledChipDragStart,
    onStudioCellDragOver,
    onStudioCellDragLeave,
    onStudioCellDrop,
    addCustomPaletteChip,
    saveStudioTimetable
  };
})();

window.TimetableBuilder = TimetableBuilder;
