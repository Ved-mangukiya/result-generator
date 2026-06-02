/* ═══════════════════════════════════════════════
   BOARDS.JS — Board / Standard / Subject CRUD
   ═══════════════════════════════════════════════ */

let _selectedBoardId = null;
let _selectedStandardId = null;
let _streams = [];
let _standardDefaultSubjects = [];

const COMMON_SUBJECT_TEMPLATES = [
  { name: 'English', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: true },
  { name: 'Gujarati', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: true },
  { name: 'Hindi', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: true },
  { name: 'Sanskrit', max_marks: 100, marks_type: 'total', is_compulsory: false, is_language: true },
  { name: 'Mathematics', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: false },
  { name: 'Science', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: false },
  { name: 'Social Science', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: false },
  { name: 'Elements of Accounts', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: false },
  { name: 'Organisation of Commerce (OCM)', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: false },
  { name: 'Statistics', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: false },
  { name: 'Economics', max_marks: 100, marks_type: 'total', is_compulsory: true, is_language: false },
  { name: 'Secretarial Practice & Commercial Correspondence (SPCC)', max_marks: 100, marks_type: 'total', is_compulsory: false, is_language: false },
  { name: 'Computer Studies', max_marks: 100, marks_type: 'total', is_compulsory: false, is_language: false },
  { name: 'Physics', max_marks: 100, marks_type: 'split', internal_max: 30, external_max: 70, is_compulsory: true, is_language: false },
  { name: 'Chemistry', max_marks: 100, marks_type: 'split', internal_max: 30, external_max: 70, is_compulsory: true, is_language: false },
  { name: 'Biology', max_marks: 100, marks_type: 'split', internal_max: 30, external_max: 70, is_compulsory: true, is_language: false },
];

function onSubjectTemplateChange(val) {
  if (val === 'custom') {
    document.getElementById('subj-name').value = '';
    return;
  }
  const t = COMMON_SUBJECT_TEMPLATES[parseInt(val)];
  if (!t) return;
  
  document.getElementById('subj-name').value = t.name;
  document.getElementById('subj-max').value = t.max_marks;
  document.getElementById('subj-type').value = t.marks_type;
  
  const splitFields = document.getElementById('split-fields');
  if (t.marks_type === 'split') {
    splitFields.style.display = 'grid';
    document.getElementById('subj-internal').value = t.internal_max || 20;
    document.getElementById('subj-external').value = t.external_max || 80;
  } else {
    splitFields.style.display = 'none';
  }
  
  document.getElementById('subj-compulsory').checked = t.is_compulsory;
  document.getElementById('subj-language').checked = t.is_language;
}

window.COMMON_SUBJECT_TEMPLATES = COMMON_SUBJECT_TEMPLATES;
window.onSubjectTemplateChange = onSubjectTemplateChange;

async function renderBoards() {
  setPageTitle('Boards & Classes', 'Boards & Classes');
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Boards & Classes</h1>
        <p>Manage exam boards, standards, streams, and subjects</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="showAddBoardModal()">➕ Add Board</button>
      </div>
    </div>

    <div class="grid gap-6" style="grid-template-columns:320px 1fr">
      <!-- Board List -->
      <div class="card">
        <div class="card-header">
          <h3>Boards</h3>
          <span class="badge badge-primary" id="board-count">0</span>
        </div>
        <div id="board-list" style="padding:var(--space-2)">
          <div class="empty-state" style="padding:var(--space-8)">
            <div class="animate-pulse" style="font-size:2rem">🏛</div>
            <p class="text-muted text-sm mt-2">Loading...</p>
          </div>
        </div>
      </div>

      <!-- Standards Panel -->
      <div id="standards-panel">
        <div class="empty-state" style="height:400px">
          <div class="empty-state-icon">🏛</div>
          <h3>Select a Board</h3>
          <p>Click any board on the left to view and manage its classes (standards).</p>
        </div>
      </div>
    </div>`;

  _streams = await API.standards.streams().catch(() => []);
  await loadBoardList();
}

async function loadBoardList() {
  try {
    const boards = await API.boards.list();
    document.getElementById('board-count').textContent = boards.length;
    
    if (boards.length === 0) {
      document.getElementById('board-list').innerHTML = `
        <div class="empty-state" style="padding:var(--space-8)">
          <div class="empty-state-icon">🏛</div>
          <h3>No Boards Yet</h3>
          <p>Add your first board to get started.</p>
          <button class="btn btn-primary btn-sm" onclick="showAddBoardModal()">➕ Add Board</button>
        </div>`;
      return;
    }
    
    document.getElementById('board-list').innerHTML = boards.map(b => `
      <div class="board-list-item ${_selectedBoardId === b.id ? 'active' : ''}" 
           onclick="selectBoard(${b.id})"
           style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-radius:var(--radius);cursor:pointer;margin-bottom:var(--space-1);transition:all var(--transition);${_selectedBoardId === b.id ? 'background:rgba(42,82,152,0.15);border:1px solid rgba(42,82,152,0.3)' : 'border:1px solid transparent'}">
        <div class="board-badge" style="font-size:0.7rem;min-width:50px">${b.short_name}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.8125rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.name}</div>
          ${b.is_custom ? '<div class="text-xs text-muted">Custom Board</div>' : ''}
        </div>
        <button class="btn btn-ghost btn-icon-sm" onclick="event.stopPropagation();confirmDeleteBoard(${b.id}, '${b.name}')" title="Delete Board">🗑</button>
      </div>`).join('');
    
    if (_selectedBoardId) selectBoard(_selectedBoardId);
  } catch (err) {
    Toast.error('Failed to load boards', err.message);
  }
}

async function selectBoard(boardId) {
  _selectedBoardId = boardId;
  _selectedStandardId = null;
  
  // Update active state in list
  $$('.board-list-item').forEach(el => {
    el.style.background = '';
    el.style.border = '1px solid transparent';
  });
  const activeItem = document.querySelector(`[onclick="selectBoard(${boardId})"]`);
  if (activeItem) {
    activeItem.style.background = 'rgba(42,82,152,0.15)';
    activeItem.style.border = '1px solid rgba(42,82,152,0.3)';
  }
  
  const boards = await API.boards.list();
  const board = boards.find(b => b.id === boardId);
  if (!board) return;
  
  document.getElementById('standards-panel').innerHTML = `
    <div>
      <div class="card mb-4">
        <div class="card-header">
          <div>
            <h3>${board.name}</h3>
            <p class="text-xs text-muted">${board.short_name}</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm" onclick="showGradeEditor(${boardId}, '${board.name}')">📊 Grade Scale</button>
            <button class="btn btn-primary btn-sm" onclick="showAddStandardModal(${boardId})">➕ Add Class</button>
          </div>
        </div>
      </div>

      <div id="standards-list">
        <div class="empty-state" style="height:300px">
          <div class="animate-pulse">📚</div>
          <p class="text-muted text-sm mt-2">Loading classes...</p>
        </div>
      </div>
    </div>`;
  
  await loadStandards(boardId);
}

async function loadStandards(boardId) {
  try {
    const standards = await API.boards.getStandards(boardId);
    const container = document.getElementById('standards-list');
    
    if (standards.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="height:300px">
          <div class="empty-state-icon">📚</div>
          <h3>No Classes Yet</h3>
          <p>Add standards (1st to 12th) for this board to manage students and subjects.</p>
          <button class="btn btn-primary" onclick="showAddStandardModal(${boardId})">➕ Add Class</button>
        </div>`;
      return;
    }
    
    container.innerHTML = `
      <div class="grid gap-3">
        ${standards.map(s => `
          <div class="card stagger-item" style="overflow:visible">
            <div class="card-header">
              <div style="display:flex;align-items:center;gap:var(--space-3)">
                <div class="board-badge">${s.standard_number}${['th','st','nd','rd'][s.standard_number] || 'th'}</div>
                <div>
                  <div style="font-weight:700">${s.display_name}</div>
                  <div class="text-xs text-muted">
                    ${s.stream !== 'General' ? s.stream + ' · ' : ''}
                    ${s.student_count} student${s.student_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <button class="btn btn-outline btn-sm" onclick="showSubjectsPanel(${s.id})">📖 Subjects</button>
                <button class="btn btn-ghost btn-sm" onclick="Router.navigate('students', {standardId:${s.id}})">👥 Students</button>
                <button class="btn btn-ghost btn-icon-sm" onclick="confirmDeleteStandard(${s.id}, '${s.display_name}')">🗑</button>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  } catch (err) {
    Toast.error('Failed to load standards', err.message);
  }
}

function showAddBoardModal() {
  createModal('add-board-modal', '➕ Add Board',
    `<div class="form-group mb-4">
      <label class="form-label">Choose from Pre-loaded Boards</label>
      <select class="form-control" id="add-board-select">
        <option value="">— Select a pre-loaded board —</option>
      </select>
    </div>
    <div class="divider" style="display:flex;align-items:center;gap:var(--space-3)">
      <span class="text-muted text-xs">OR</span>
    </div>
    <div class="form-group mb-4 mt-4">
      <label class="form-label">Custom Board Name</label>
      <input type="text" class="form-control" id="add-board-name" placeholder="e.g. State Open School">
    </div>
    <div class="form-group">
      <label class="form-label">Short Name</label>
      <input type="text" class="form-control" id="add-board-short" placeholder="e.g. SOS" maxlength="20">
    </div>`,
    `<button class="btn btn-outline" onclick="closeModal('add-board-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="addBoard()">Add Board</button>`,
    'modal-sm'
  );
  
  // Load preloaded boards
  API.boards.preloaded().then(boards => {
    API.boards.list().then(existing => {
      const existingShorts = new Set(existing.map(b => b.short_name));
      const sel = document.getElementById('add-board-select');
      boards.filter(b => !existingShorts.has(b.short_name)).forEach(b => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ name: b.name, short_name: b.short_name });
        opt.textContent = `${b.short_name} — ${b.name}`;
        sel.appendChild(opt);
      });
      
      sel.addEventListener('change', () => {
        if (sel.value) {
          const d = JSON.parse(sel.value);
          document.getElementById('add-board-name').value = d.name;
          document.getElementById('add-board-short').value = d.short_name;
        }
      });
    });
  });
}

async function addBoard() {
  const name = document.getElementById('add-board-name').value.trim();
  const short_name = document.getElementById('add-board-short').value.trim().toUpperCase();
  
  if (!name || !short_name) { Toast.error('Required', 'Please fill board name and short name.'); return; }
  
  try {
    await API.boards.add({ name, short_name, is_custom: true });
    closeModal('add-board-modal');
    Toast.success('Board Added', `${short_name} has been added.`);
    await loadBoardList();
  } catch (err) {
    Toast.error('Add Failed', err.message);
  }
}

async function confirmDeleteBoard(id, name) {
  const ok = await Confirm.show(`Delete ${name}?`, 'All standards, subjects, and students under this board will be permanently deleted. This cannot be undone.', 'Delete Board');
  if (!ok) return;
  try {
    await API.boards.delete(id);
    if (_selectedBoardId === id) {
      _selectedBoardId = null;
      document.getElementById('standards-panel').innerHTML = `
        <div class="empty-state" style="height:400px">
          <div class="empty-state-icon">🏛</div>
          <h3>Select a Board</h3>
          <p>Click any board on the left to view its classes.</p>
        </div>`;
    }
    Toast.success('Board Deleted', `${name} removed.`);
    await loadBoardList();
  } catch (err) {
    Toast.error('Delete Failed', err.message);
  }
}

function showAddStandardModal(boardId) {
  const stdOptions = Array.from({length:12}, (_,i) => `<option value="${i+1}">${Format.ordinal(i+1)} Standard</option>`).join('');
  const streamOptions = _streams.map(s => `<option value="${s}">${s}</option>`).join('');
  
  createModal('add-std-modal', '➕ Add Class (Standard)',
    `<div class="form-grid mb-4">
      <div class="form-group">
        <label class="form-label">Standard <span class="required">*</span></label>
        <select class="form-control" id="std-number">${stdOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Stream</label>
        <select class="form-control" id="std-stream">${streamOptions}</select>
      </div>
    </div>
    <div class="form-group mb-4">
      <label class="form-label">Display Name (auto-generated)</label>
      <input type="text" class="form-control" id="std-display" placeholder="e.g. 10th Standard">
    </div>

    <div id="std-subjects-section" style="margin-top:var(--space-4)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <label class="form-label" style="font-weight:600;margin:0">Subjects to Include:</label>
        <div class="flex gap-2">
          <button type="button" class="btn btn-ghost btn-sm" onclick="stdSelectAll(true)">✓ All</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="stdSelectAll(false)">✗ None</button>
        </div>
      </div>
      <div id="std-subjects-checklist" style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:10px;background:var(--bg-surface);display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <span class="text-muted text-xs">Loading subjects...</span>
      </div>

      <!-- Inline custom subject adder -->
      <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
        <label class="form-label" style="font-size:0.75rem;margin-bottom:4px">➕ Add a custom subject to this class:</label>
        <div style="display:flex;gap:8px;position:relative">
          <div style="flex:1;position:relative">
            <input type="text" id="std-custom-subj-name" class="form-control" placeholder="Subject name (type or pick suggestion)" autocomplete="off"
              oninput="showSubjSuggestions(this.value, 'std-subj-suggestions')" onblur="setTimeout(()=>hideSubjSuggestions('std-subj-suggestions'),200)">
            <div id="std-subj-suggestions" style="position:absolute;top:100%;left:0;right:0;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);z-index:100;max-height:140px;overflow-y:auto;display:none;box-shadow:var(--shadow-lg)"></div>
          </div>
          <input type="number" id="std-custom-subj-max" class="form-control" placeholder="Max" value="100" style="width:80px">
          <button type="button" class="btn btn-outline btn-sm" onclick="addCustomSubjectToChecklist()">Add</button>
        </div>
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModal('add-std-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="addStandard(${boardId})">Add Class</button>`,
    'modal-md'
  );
  
  const updateDisplay = () => {
    const n = document.getElementById('std-number').value;
    const s = document.getElementById('std-stream').value;
    document.getElementById('std-display').value = `${Format.ordinal(n)} Standard${s !== 'General' ? ' — ' + s : ''}`;
  };

  const loadDefaultSubjects = async () => {
    const n = document.getElementById('std-number').value;
    const s = document.getElementById('std-stream').value;
    const checklist = document.getElementById('std-subjects-checklist');
    if (!checklist) return;
    checklist.innerHTML = `<span class="text-muted text-xs">Loading subjects...</span>`;
    try {
      // Get ALL subjects from subjects.json that are relevant, AND the board-specific defaults
      const defaultSubjects = await API.subjects.getDefault(n, s, boardId);
      const defaultNames = new Set(defaultSubjects.map(d => d.name));

      // Build full list: all COMMON_SUBJECT_TEMPLATES merged with board-specific defaults
      const allSubjects = [...COMMON_SUBJECT_TEMPLATES];
      // Add default subjects not already in template
      for (const d of defaultSubjects) {
        if (!allSubjects.find(t => t.name === d.name)) {
          allSubjects.unshift(d);
        }
      }

      _standardDefaultSubjects = allSubjects;
      checklist.innerHTML = allSubjects.map((sub, i) => `
        <label class="checkbox-container" style="display:flex;align-items:center;gap:6px;font-size:0.8rem;margin-bottom:0;cursor:pointer">
          <input type="checkbox" data-index="${i}" ${defaultNames.has(sub.name) ? 'checked' : ''} style="cursor:pointer">
          <span>
            ${sub.name}
            <span class="text-muted" style="font-size:0.68rem">(${sub.max_marks}m · ${sub.is_compulsory ? 'Compulsory' : 'Optional'})</span>
          </span>
        </label>
      `).join('');
    } catch (err) {
      checklist.innerHTML = `<span class="text-danger text-xs">Error: ${err.message}</span>`;
    }
  };

  const onConfigChange = () => {
    const n = parseInt(document.getElementById('std-number').value);
    const streamSel = document.getElementById('std-stream');
    if (n <= 10 && streamSel.value !== 'General') streamSel.value = 'General';
    updateDisplay();
    loadDefaultSubjects();
  };

  updateDisplay();
  loadDefaultSubjects();
  document.getElementById('std-number').addEventListener('change', onConfigChange);
  document.getElementById('std-stream').addEventListener('change', onConfigChange);

  // Pre-load subject name suggestions
  API.subjects.allNames().then(names => { window._allSubjectNames = names || []; }).catch(() => {});
}

async function addStandard(boardId) {
  const standard_number = parseInt(document.getElementById('std-number').value);
  const stream = document.getElementById('std-stream').value;
  const display_name = document.getElementById('std-display').value.trim();
  
  const checkboxes = document.querySelectorAll('#std-subjects-checklist input[type="checkbox"]');
  const selectedSubjects = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      const idx = parseInt(cb.dataset.index);
      const sub = _standardDefaultSubjects[idx];
      if (sub) {
        selectedSubjects.push(sub);
      }
    }
  });

  try {
    await API.standards.add({ 
      board_id: boardId, 
      standard_number, 
      stream, 
      display_name,
      subjects: selectedSubjects
    });
    closeModal('add-std-modal');
    Toast.success('Class Added', `${display_name} created with ${selectedSubjects.length} subject(s).`);
    await loadStandards(boardId);
  } catch (err) {
    Toast.error('Add Failed', err.message);
  }
}

async function confirmDeleteStandard(id, name) {
  const ok = await Confirm.show(`Delete ${name}?`, 'All students, marks, and subjects for this class will be permanently deleted.', 'Delete Class');
  if (!ok) return;
  try {
    await API.standards.delete(id);
    Toast.success('Class Deleted', `${name} removed.`);
    if (_selectedBoardId) await loadStandards(_selectedBoardId);
  } catch (err) {
    Toast.error('Delete Failed', err.message);
  }
}

async function showSubjectsPanel(standardId) {
  _selectedStandardId = standardId;
  const standard = await API.standards.get(standardId);
  const subjects = await API.subjects.list(standardId);
  
  createModal('subjects-modal', `📖 Subjects — ${standard.display_name}`,
    `<div class="flex justify-between items-center mb-4">
      <p class="text-sm text-secondary">${subjects.length} subject${subjects.length !== 1 ? 's' : ''} configured</p>
      <button class="btn btn-primary btn-sm" onclick="showAddSubjectModal(${standardId})">➕ Add Subject</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Subject</th><th>Max</th><th>Type</th><th>Compulsory</th><th>Language</th><th></th>
        </tr></thead>
        <tbody id="subjects-table-body">
          ${subjects.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:var(--space-6);color:var(--text-muted)">No subjects yet</td></tr>' :
            subjects.map(s => `<tr>
              <td class="td-primary">${s.name}</td>
              <td>${s.max_marks}</td>
              <td><span class="badge ${s.marks_type === 'split' ? 'badge-primary' : 'badge-gray'}">${s.marks_type === 'split' ? `${s.internal_max}+${s.external_max}` : 'Total'}</span></td>
              <td>${s.is_compulsory ? '<span class="text-success">✓</span>' : '<span class="text-muted">—</span>'}</td>
              <td>${s.is_language ? '<span class="badge badge-warning">Lang</span>' : '—'}</td>
              <td class="td-actions">
                <button class="btn btn-ghost btn-icon-sm" onclick="showEditSubjectModal(${s.id}, ${standardId})" title="Edit">✏</button>
                <button class="btn btn-ghost btn-icon-sm" onclick="confirmDeleteSubject(${s.id}, '${s.name}', ${standardId})" title="Delete">🗑</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`,
    '', 'modal-lg'
  );
}

function showAddSubjectModal(standardId) {
  createModal('add-subject-modal', '➕ Add Subject',
    `<div class="form-group mb-4" style="position:relative">
      <label class="form-label">Subject Name <span class="required">*</span></label>
      <input type="text" class="form-control" id="subj-name" placeholder="e.g. Mathematics, Physics" autocomplete="off"
        oninput="showSubjSuggestions(this.value, 'subj-name-suggestions')" onblur="setTimeout(()=>hideSubjSuggestions('subj-name-suggestions'),200)">
      <div id="subj-name-suggestions" style="position:absolute;top:100%;left:0;right:0;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);z-index:100;max-height:140px;overflow-y:auto;display:none;box-shadow:var(--shadow-lg)"></div>
    </div>
    <div class="form-grid mb-4">
      <div class="form-group">
        <label class="form-label">Max Marks</label>
        <input type="number" class="form-control" id="subj-max" value="100" min="1" max="1000">
      </div>
      <div class="form-group">
        <label class="form-label">Marks Type</label>
        <select class="form-control" id="subj-type" onchange="toggleSplitFields()">
          <option value="total">Total Only</option>
          <option value="split">Internal + External</option>
        </select>
      </div>
    </div>
    <div id="split-fields" class="form-grid mb-4" style="display:none">
      <div class="form-group">
        <label class="form-label">Internal Max</label>
        <input type="number" class="form-control" id="subj-internal" value="20" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">External Max</label>
        <input type="number" class="form-control" id="subj-external" value="80" min="0">
      </div>
    </div>
    <div class="flex gap-6 mb-4">
      <label class="toggle-group"><span class="toggle-label">Compulsory</span><label class="toggle"><input type="checkbox" id="subj-compulsory" checked><span class="toggle-slider"></span></label></label>
      <label class="toggle-group"><span class="toggle-label">Language Subject</span><label class="toggle"><input type="checkbox" id="subj-language"><span class="toggle-slider"></span></label></label>
    </div>
    <p class="form-hint mt-2 text-xs" style="color:var(--text-secondary);background:rgba(212,175,55,0.05);padding:10px;border-radius:var(--radius);border:1px solid rgba(212,175,55,0.2)">
      💡 For elective subjects (like SPCC vs Computer), mark both as <strong>Optional</strong>. Leave blank for students who didn't take it — the system excludes it from their result.
    </p>`,
    `<button class="btn btn-outline" onclick="closeModal('add-subject-modal')">Cancel</button>
     <button class="btn btn-primary" onclick="addSubject(${standardId})">Add Subject</button>`,
    'modal-sm'
  );
  // Pre-load subject name suggestions
  API.subjects.allNames().then(names => { window._allSubjectNames = names || []; }).catch(() => {});
}

function toggleSplitFields() {
  const type = document.getElementById('subj-type').value;
  const split = document.getElementById('split-fields');
  if (split) split.style.display = type === 'split' ? 'grid' : 'none';
}

async function addSubject(standardId) {
  const name = document.getElementById('subj-name').value.trim();
  if (!name) { Toast.error('Required', 'Subject name is required.'); return; }
  
  const marks_type = document.getElementById('subj-type').value;
  const max_marks = parseInt(document.getElementById('subj-max').value) || 100;
  const internal_max = marks_type === 'split' ? (parseInt(document.getElementById('subj-internal').value) || 20) : 0;
  const external_max = marks_type === 'split' ? (parseInt(document.getElementById('subj-external').value) || 80) : max_marks;
  
  try {
    await API.subjects.add({
      standard_id: standardId,
      name, max_marks, marks_type, internal_max, external_max,
      is_compulsory: document.getElementById('subj-compulsory').checked,
      is_language: document.getElementById('subj-language').checked
    });
    closeModal('add-subject-modal');
    Toast.success('Subject Added', name);
    showSubjectsPanel(standardId);
  } catch (err) {
    Toast.error('Add Failed', err.message);
  }
}

async function confirmDeleteSubject(id, name, standardId) {
  const ok = await Confirm.show(`Delete "${name}"?`, 'All marks for this subject across all students will also be deleted.', 'Delete Subject');
  if (!ok) return;
  try {
    await API.subjects.delete(id);
    Toast.success('Subject Deleted', name);
    showSubjectsPanel(standardId);
  } catch (err) {
    Toast.error('Delete Failed', err.message);
  }
}

async function showEditSubjectModal(subjectId, standardId) {
  try {
    const subjects = await API.subjects.list(standardId);
    const s = subjects.find(sub => sub.id === subjectId);
    if (!s) { Toast.error('Not Found', 'Subject not found.'); return; }
    
    createModal('edit-subject-modal', '✏ Edit Subject',
      `<div class="form-group mb-4">
        <label class="form-label">Subject Name <span class="required">*</span></label>
        <input type="text" class="form-control" id="edit-subj-name" placeholder="e.g. Mathematics, Physics" value="${s.name}">
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Max Marks</label>
          <input type="number" class="form-control" id="edit-subj-max" value="${s.max_marks}" min="1" max="1000">
        </div>
        <div class="form-group">
          <label class="form-label">Marks Type</label>
          <select class="form-control" id="edit-subj-type" onchange="toggleEditSplitFields()">
            <option value="total" ${s.marks_type === 'total' ? 'selected' : ''}>Total Only</option>
            <option value="split" ${s.marks_type === 'split' ? 'selected' : ''}>Internal + External</option>
          </select>
        </div>
      </div>
      <div id="edit-split-fields" class="form-grid mb-4" style="display:${s.marks_type === 'split' ? 'grid' : 'none'}">
        <div class="form-group">
          <label class="form-label">Internal Max</label>
          <input type="number" class="form-control" id="edit-subj-internal" value="${s.internal_max}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">External Max</label>
          <input type="number" class="form-control" id="edit-subj-external" value="${s.external_max}" min="0">
        </div>
      </div>
      <div class="flex gap-6">
        <label class="toggle-group"><span class="toggle-label">Compulsory</span><label class="toggle"><input type="checkbox" id="edit-subj-compulsory" ${s.is_compulsory ? 'checked' : ''}><span class="toggle-slider"></span></label></label>
        <label class="toggle-group"><span class="toggle-label">Language Subject</span><label class="toggle"><input type="checkbox" id="edit-subj-language" ${s.is_language ? 'checked' : ''}><span class="toggle-slider"></span></label></label>
      </div>`,
      `<button class="btn btn-outline" onclick="closeModal('edit-subject-modal')">Cancel</button>
       <button class="btn btn-primary" onclick="editSubject(${s.id}, ${standardId})">Save Changes</button>`,
      'modal-sm'
    );
  } catch (err) {
    Toast.error('Error', err.message);
  }
}

function toggleEditSplitFields() {
  const type = document.getElementById('edit-subj-type').value;
  const split = document.getElementById('edit-split-fields');
  if (split) split.style.display = type === 'split' ? 'grid' : 'none';
}

async function editSubject(subjectId, standardId) {
  const name = document.getElementById('edit-subj-name').value.trim();
  if (!name) { Toast.error('Required', 'Subject name is required.'); return; }
  
  const marks_type = document.getElementById('edit-subj-type').value;
  const max_marks = parseInt(document.getElementById('edit-subj-max').value) || 100;
  const internal_max = marks_type === 'split' ? (parseInt(document.getElementById('edit-subj-internal').value) || 20) : 0;
  const external_max = marks_type === 'split' ? (parseInt(document.getElementById('edit-subj-external').value) || 80) : max_marks;
  
  try {
    await API.subjects.update(subjectId, {
      name, max_marks, marks_type, internal_max, external_max,
      is_compulsory: document.getElementById('edit-subj-compulsory').checked,
      is_language: document.getElementById('edit-subj-language').checked
    });
    closeModal('edit-subject-modal');
    Toast.success('Subject Updated', name);
    showSubjectsPanel(standardId);
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

async function showGradeEditor(boardId, boardName) {
  const grades = await API.boards.getGrades(boardId);
  const allBoards = await API.boards.list().catch(() => []);
  const otherBoards = allBoards.filter(b => b.id !== boardId);

  const copyHTML = otherBoards.length > 0
    ? `<div style="display:flex; gap:10px; align-items:center; margin-bottom:15px; background:rgba(138, 109, 59, 0.05); padding:10px; border-radius:var(--radius); border:1px solid rgba(138, 109, 59, 0.15)">
        <label class="form-label" style="margin-bottom:0; font-size:0.8rem; font-weight:600; color:var(--text-secondary)">📋 Copy scale from another board: </label>
        <select class="form-control" id="copy-grade-board-select" style="width:180px; height:32px; padding:0 8px; font-size:0.8rem">
          <option value="">— Select Board —</option>
          ${otherBoards.map(b => `<option value="${b.id}">${b.short_name}</option>`).join('')}
        </select>
        <button class="btn btn-outline btn-sm" onclick="copyGradeScaleFromBoard()" style="padding:4px 10px; height:32px;">Copy</button>
      </div>`
    : '';

  const rows = grades.map((g, i) => `
    <tr data-index="${i}">
      <td style="padding:var(--space-2) var(--space-3)"><input class="form-control" style="width:80px" value="${g.label}" data-field="label"></td>
      <td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" value="${g.min_pct}" data-field="min_pct"></td>
      <td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" value="${g.max_pct}" data-field="max_pct"></td>
      <td style="padding:var(--space-2) var(--space-3)">
        <select class="form-control" data-field="result_status" style="width:140px">
          ${['A1','A2','B1','B2','C1','C2','D','Fail','Distinction','First Class','Second Class','Pass'].map(s => `<option ${g.result_status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="padding:var(--space-2) var(--space-3)">
        <input type="color" value="${g.color}" data-field="color" style="width:40px;height:36px;border:none;border-radius:var(--radius);cursor:pointer">
      </td>
      <td style="padding:var(--space-2) var(--space-3)">
        <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('tr').remove()">🗑</button>
      </td>
    </tr>`).join('');
  
  createModal('grade-editor', `📊 Grade Scale — ${boardName}`,
    `${copyHTML}
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Grade</th><th>Min%</th><th>Max%</th><th>Result Status</th><th>Color</th><th></th>
        </tr></thead>
        <tbody id="grade-rows">${rows}</tbody>
      </table>
    </div>
    <button class="btn btn-outline btn-sm mt-4" onclick="addGradeRow()">➕ Add Grade</button>`,
    `<button class="btn btn-outline" onclick="closeModal('grade-editor')">Cancel</button>
     <button class="btn btn-primary" onclick="saveGrades(${boardId})">💾 Save Grade Scale</button>`,
    'modal-lg'
  );
}

async function copyGradeScaleFromBoard() {
  const select = document.getElementById('copy-grade-board-select');
  if (!select) return;
  const sourceBoardId = select.value;
  if (!sourceBoardId) {
    Toast.warning('Select Board', 'Please select a board to copy the grade scale from.');
    return;
  }
  try {
    const grades = await API.boards.getGrades(sourceBoardId);
    if (grades.length === 0) {
      Toast.warning('No Grades', 'The selected board has no grade scale configured.');
      return;
    }
    const tbody = document.getElementById('grade-rows');
    if (tbody) {
      tbody.innerHTML = grades.map((g, i) => `
        <tr data-index="${i}">
          <td style="padding:var(--space-2) var(--space-3)"><input class="form-control" style="width:80px" value="${g.label}" data-field="label"></td>
          <td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" value="${g.min_pct}" data-field="min_pct"></td>
          <td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" value="${g.max_pct}" data-field="max_pct"></td>
          <td style="padding:var(--space-2) var(--space-3)">
            <select class="form-control" data-field="result_status" style="width:140px">
              ${['A1','A2','B1','B2','C1','C2','D','Fail','Distinction','First Class','Second Class','Pass'].map(s => `<option ${g.result_status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td style="padding:var(--space-2) var(--space-3)">
            <input type="color" value="${g.color}" data-field="color" style="width:40px;height:36px;border:none;border-radius:var(--radius);cursor:pointer">
          </td>
          <td style="padding:var(--space-2) var(--space-3)">
            <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('tr').remove()">🗑</button>
          </td>
        </tr>`).join('');
      Toast.success('Grade Scale Loaded', 'Click "Save Grade Scale" to persist changes.');
    }
  } catch (err) {
    Toast.error('Load Failed', err.message);
  }
}

function addGradeRow() {
  const tbody = document.getElementById('grade-rows');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td style="padding:var(--space-2) var(--space-3)"><input class="form-control" style="width:80px" value="Grade" data-field="label"></td>
    <td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" value="0" data-field="min_pct"></td>
    <td style="padding:var(--space-2) var(--space-3)"><input type="number" class="form-control marks-input" value="100" data-field="max_pct"></td>
    <td style="padding:var(--space-2) var(--space-3)">
      <select class="form-control" data-field="result_status" style="width:140px">
        ${['A1','A2','B1','B2','C1','C2','D','Fail','Distinction','First Class','Second Class','Pass'].map(s => `<option>${s}</option>`).join('')}
      </select>
    </td>
    <td style="padding:var(--space-2) var(--space-3)">
      <input type="color" value="#4caf69" data-field="color" style="width:40px;height:36px;border:none;border-radius:var(--radius);cursor:pointer">
    </td>
    <td style="padding:var(--space-2) var(--space-3)">
      <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('tr').remove()">🗑</button>
    </td>`;
  tbody.appendChild(row);
}

async function saveGrades(boardId) {
  const rows = document.querySelectorAll('#grade-rows tr');
  const grades = [];
  rows.forEach(row => {
    const g = {};
    row.querySelectorAll('[data-field]').forEach(el => { g[el.dataset.field] = el.value; });
    g.min_pct = parseFloat(g.min_pct);
    g.max_pct = parseFloat(g.max_pct);
    grades.push(g);
  });
  
  try {
    await API.boards.updateGrades(boardId, grades);
    closeModal('grade-editor');
    Toast.success('Grade Scale Saved');
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

window.renderBoards = renderBoards;
window.selectBoard = selectBoard;
window.showAddBoardModal = showAddBoardModal;
window.addBoard = addBoard;
window.confirmDeleteBoard = confirmDeleteBoard;
window.showAddStandardModal = showAddStandardModal;
window.addStandard = addStandard;
window.confirmDeleteStandard = confirmDeleteStandard;
function stdSelectAll(check) {
  const checkboxes = document.querySelectorAll('#std-subjects-checklist input[type="checkbox"]');
  checkboxes.forEach(cb => { cb.checked = check; });
}

function addCustomSubjectToChecklist() {
  const nameInput = document.getElementById('std-custom-subj-name');
  const maxInput = document.getElementById('std-custom-subj-max');
  if (!nameInput || !maxInput) return;
  
  const name = nameInput.value.trim();
  const max = parseInt(maxInput.value) || 100;
  
  if (!name) {
    Toast.error('Invalid Subject', 'Please enter a custom subject name.');
    return;
  }
  
  // Check if already in checklist
  const exists = _standardDefaultSubjects.some(sub => sub.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    Toast.warning('Exists', 'This subject is already in the list.');
    return;
  }
  
  const newSub = { name, max_marks: max, marks_type: 'total', is_compulsory: false, is_language: false };
  _standardDefaultSubjects.push(newSub);
  
  // Rerender checklist
  const checklist = document.getElementById('std-subjects-checklist');
  if (checklist) {
    const i = _standardDefaultSubjects.length - 1;
    const child = document.createElement('label');
    child.className = 'checkbox-container';
    child.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:0.8rem;margin-bottom:0;cursor:pointer';
    child.innerHTML = `
      <input type="checkbox" data-index="${i}" checked style="cursor:pointer">
      <span>
        ${name}
        <span class="text-muted" style="font-size:0.68rem">(${max}m · Optional)</span>
      </span>`;
    checklist.appendChild(child);
  }
  
  // Clear inputs
  nameInput.value = '';
  maxInput.value = '100';
  Toast.success('Subject Added', `Added custom subject: ${name}`);
}

function showSubjSuggestions(val, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!val || val.trim().length === 0) {
    container.style.display = 'none';
    return;
  }
  
  const query = val.toLowerCase().trim();
  const suggestions = (window._allSubjectNames || []).filter(name => 
    name.toLowerCase().includes(query)
  ).slice(0, 15); // Show top 15 matches
  
  if (suggestions.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  const inputId = containerId === 'std-subj-suggestions' ? 'std-custom-subj-name' : 'subj-name';
  
  container.innerHTML = suggestions.map(name => `
    <div class="suggestion-item" 
         style="padding: 8px 12px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid var(--border);" 
         onmousedown="selectSubjSuggestion('${name.replace(/'/g, "\\'")}', '${inputId}', '${containerId}')"
         onmouseover="this.style.background='var(--bg-elevated)'"
         onmouseout="this.style.background=''">
      ${name}
    </div>
  `).join('');
  
  container.style.display = 'block';
}

function selectSubjSuggestion(name, inputId, containerId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = name;
  }
  hideSubjSuggestions(containerId);
}

function hideSubjSuggestions(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.style.display = 'none';
  }
}

window.showSubjectsPanel = showSubjectsPanel;
window.showAddSubjectModal = showAddSubjectModal;
window.toggleSplitFields = toggleSplitFields;
window.addSubject = addSubject;
window.confirmDeleteSubject = confirmDeleteSubject;
window.showEditSubjectModal = showEditSubjectModal;
window.toggleEditSplitFields = toggleEditSplitFields;
window.editSubject = editSubject;
window.showGradeEditor = showGradeEditor;
window.copyGradeScaleFromBoard = copyGradeScaleFromBoard;
window.addGradeRow = addGradeRow;
window.saveGrades = saveGrades;
window.stdSelectAll = stdSelectAll;
window.addCustomSubjectToChecklist = addCustomSubjectToChecklist;
window.showSubjSuggestions = showSubjSuggestions;
window.selectSubjSuggestion = selectSubjSuggestion;
window.hideSubjSuggestions = hideSubjSuggestions;
