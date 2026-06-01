/* ═══════════════════════════════════════════════
   IMPORT.JS — Excel Import with Column Mapping
   ═══════════════════════════════════════════════ */

let _importFileData = null;
let _importStandardId = null;

async function renderImport() {
  setPageTitle('Import Excel', 'Import Excel');
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Import Students from Excel</h1>
        <p>Upload an Excel or CSV file to bulk-import students and marks</p>
      </div>
    </div>

    <!-- Step Indicator -->
    <div class="flex gap-3 mb-6" id="import-steps">
      ${['Upload File','Map Columns','Preview & Confirm','Done'].map((s,i) => `
        <div style="flex:1;text-align:center" id="import-step-indicator-${i}">
          <div style="width:32px;height:32px;border-radius:50%;margin:0 auto var(--space-2);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;background:${i===0?'var(--primary-light)':'var(--bg-elevated)'};color:${i===0?'white':'var(--text-muted)'};border:2px solid ${i===0?'var(--primary-light)':'var(--border)'}">
            ${i+1}
          </div>
          <div class="text-xs ${i===0?'font-semibold':'text-muted'}">${s}</div>
        </div>`).join('<div style="flex:none;align-self:center;margin-top:-16px;color:var(--border)">›</div>')}
    </div>

    <div id="import-step-0">
      <!-- Step 0: Upload -->
      <div class="card">
        <div class="card-header"><h3>Step 1: Upload Your File</h3></div>
        <div class="card-body">
          <div class="form-group mb-4">
            <label class="form-label">Target Class <span class="required">*</span></label>
            <select class="form-control" id="import-std-select" style="max-width:400px">
              <option value="">— Select the class for this import —</option>
            </select>
          </div>
          <div class="file-upload-area" id="import-drop-zone" style="max-width:500px">
            <input type="file" id="import-file-input" accept=".xlsx,.xls,.csv" onchange="handleImportFile(this)">
            <div class="file-upload-icon">📊</div>
            <p class="file-upload-text">Drop your Excel or CSV file here</p>
            <p class="file-upload-hint">Supported: .xlsx, .xls, .csv · Max 20MB</p>
          </div>
          <div class="mt-4">
            <p class="text-sm text-muted mb-2">📝 <strong>Tips for a clean import:</strong></p>
            <ul class="text-sm text-muted" style="list-style:disc;padding-left:1.5rem;line-height:2">
              <li>Row 1 should be column headers (Name, Roll, Maths, etc.)</li>
              <li>Each subsequent row = one student</li>
              <li>Marks columns can be named anything — you'll map them in step 2</li>
              <li>Internal/External marks can be separate columns or a combined total</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div id="import-step-1" style="display:none">
      <!-- Step 1: Map Columns -->
    </div>

    <div id="import-step-2" style="display:none">
      <!-- Step 2: Preview -->
    </div>

    <div id="import-step-3" style="display:none">
      <!-- Step 3: Done -->
    </div>`;
  
  await loadImportStandardDropdown();
}

async function loadImportStandardDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('import-std-select');
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
  } catch {}
}

async function handleImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  
  const standardId = document.getElementById('import-std-select').value;
  if (!standardId) {
    Toast.error('Select Class', 'Please select a target class before uploading.');
    input.value = '';
    return;
  }
  
  _importStandardId = parseInt(standardId);
  
  const dropZone = document.getElementById('import-drop-zone');
  dropZone.innerHTML = `<div class="file-upload-icon animate-pulse">📊</div><p class="file-upload-text">Parsing file...</p>`;
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const result = await API.import.parse(formData);
    _importFileData = result;
    
    dropZone.innerHTML = `
      <div class="file-upload-icon">✅</div>
      <p class="file-upload-text" style="color:var(--success)"><strong>${file.name}</strong> parsed successfully</p>
      <p class="file-upload-hint">${result.totalRows} rows · ${result.headers.length} columns detected</p>`;
    
    showImportStep(1);
    await renderColumnMapping(result, standardId);
  } catch (err) {
    dropZone.innerHTML = `<div class="file-upload-icon">❌</div><p style="color:var(--danger)">${err.message}</p>`;
    Toast.error('Parse Failed', err.message);
  }
}

function showImportStep(step) {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`import-step-${i}`);
    if (el) el.style.display = i === step ? '' : 'none';
    
    const indicator = document.getElementById(`import-step-indicator-${i}`);
    if (indicator) {
      const dot = indicator.querySelector('div');
      const label = indicator.querySelector('.text-xs');
      if (dot) {
        dot.style.background = i === step ? 'var(--primary-light)' : (i < step ? 'var(--success)' : 'var(--bg-elevated)');
        dot.style.color = i <= step ? 'white' : 'var(--text-muted)';
        dot.style.border = `2px solid ${i === step ? 'var(--primary-light)' : (i < step ? 'var(--success)' : 'var(--border)')}`;
        dot.textContent = i < step ? '✓' : i + 1;
      }
      if (label) label.className = `text-xs ${i <= step ? 'font-semibold' : 'text-muted'}`;
    }
  }
}

async function renderColumnMapping(parseResult, standardId) {
  const subjects = await API.subjects.list(standardId);
  const headers = parseResult.headers;
  
  const headerOptions = `<option value="">— Not mapped —</option>` +
    headers.map(h => `<option value="${h}">${h}</option>`).join('');
  
  // Auto-suggest common column names
  function autoSuggest(field) {
    const patterns = {
      name: ['name', 'student', 'pupil', 'sname'],
      roll_number: ['roll', 'rollno', 'rollnum', 'id'],
      father_name: ['father', 'dad', 'fathername'],
      mother_name: ['mother', 'mom', 'mothername'],
      dob: ['dob', 'birth', 'birthdate', 'dateofbirth'],
      attendance: ['attendance', 'attend', 'att', 'present'],
      remarks: ['remark', 'remarks', 'comment', 'note'],
    };
    const pats = patterns[field] || [field];
    return headers.find(h => pats.some(p => h.toLowerCase().replace(/[^a-z]/g,'').includes(p))) || '';
  }
  
  const container = document.getElementById('import-step-1');
  container.innerHTML = `
    <div class="card mb-4">
      <div class="card-header">
        <h3>Step 2: Map Excel Columns</h3>
        <p class="text-sm text-muted">Tell us which Excel column contains which data</p>
      </div>
      <div class="card-body">
        <p class="form-section-title">Student Information Columns</p>
        <div class="grid grid-2 gap-3 mb-6">
          ${[
            ['name', 'Student Name *'],
            ['roll_number', 'Roll Number *'],
            ['father_name', "Father's Name"],
            ['mother_name', "Mother's Name"],
            ['dob', 'Date of Birth'],
            ['attendance', 'Attendance %'],
            ['remarks', 'Remarks'],
          ].map(([id, label]) => {
            const suggested = autoSuggest(id);
            return `<div class="form-group">
              <label class="form-label">${label}</label>
              <select class="form-control mapping-select" id="map-${id}">
                ${headerOptions.replace(`value="${suggested}"`, `value="${suggested}" selected`)}
              </select>
            </div>`;
          }).join('')}
        </div>
        
        <p class="form-section-title">Marks Columns (${subjects.length} subjects)</p>
        <div class="table-wrap">
          <table class="mapping-table">
            <thead><tr><th>Subject</th><th>Marks Column (Total)</th><th>Internal Column</th><th>External Column</th></tr></thead>
            <tbody>
              ${subjects.map(sub => {
                const nameWords = sub.name.toLowerCase().split(/\s+/);
                const suggestCol = headers.find(h => nameWords.some(w => w.length > 2 && h.toLowerCase().includes(w))) || '';
                return `<tr>
                  <td class="mapping-field-label">
                    ${sub.name}
                    ${sub.marks_type === 'split' ? `<span class="badge badge-primary" style="margin-left:4px">Split</span>` : ''}
                  </td>
                  <td>
                    <select class="form-control mapping-select" id="map-marks-${sub.id}">
                      ${headerOptions.replace(`value="${suggestCol}"`, `value="${suggestCol}" selected`)}
                    </select>
                  </td>
                  <td>
                    ${sub.marks_type === 'split' ? `<select class="form-control mapping-select" id="map-int-${sub.id}">${headerOptions}</select>` : '—'}
                  </td>
                  <td>
                    ${sub.marks_type === 'split' ? `<select class="form-control mapping-select" id="map-ext-${sub.id}">${headerOptions}</select>` : '—'}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Preview of first 5 rows -->
    <div class="card mb-4">
      <div class="card-header"><h3>📊 File Preview (First 5 Rows)</h3></div>
      <div class="card-body" style="padding:0;overflow-x:auto">
        <table style="width:max-content;border-collapse:collapse;font-size:0.75rem">
          <thead>
            <tr>${headers.map(h => `<th style="padding:var(--space-2) var(--space-3);border:1px solid var(--border);background:var(--bg-elevated);font-weight:600">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${parseResult.preview.map(row => `<tr>${headers.map(h => `<td style="padding:var(--space-2) var(--space-3);border:1px solid var(--border)">${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex justify-end gap-3">
      <button class="btn btn-outline" onclick="showImportStep(0);document.getElementById('import-step-0').style.display=''">← Back</button>
      <button class="btn btn-primary" id="import-next-btn">Next: Preview →</button>
    </div>`;

  document.getElementById('import-next-btn')?.addEventListener('click', () => {
    executeImportPreview(subjects.map(s => ({ id: s.id, type: s.marks_type })));
  });
}

async function executeImportPreview(subjectMeta) {
  const mapping = buildMapping(subjectMeta);
  
  if (!mapping.name || !mapping.roll_number) {
    Toast.error('Required', 'Please map at least Name and Roll Number columns.');
    return;
  }
  
  const container = document.getElementById('import-step-2');
  showImportStep(2);
  
  try {
    const result = await API.import.execute({
      file_path: _importFileData.file_path,
      standard_id: _importStandardId,
      mapping
    });
    
    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header"><h3>Step 3: Import Results</h3></div>
        <div class="card-body">
          <div class="grid grid-3 gap-4 mb-4">
            <div class="stat-card">
              <div class="stat-card-icon green">✅</div>
              <div class="stat-card-value">${result.imported}</div>
              <div class="stat-card-label">Successfully Imported</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon amber">⚠️</div>
              <div class="stat-card-value">${result.skipped}</div>
              <div class="stat-card-label">Skipped (blank/dup)</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon ${result.errors.length > 0 ? 'red' : 'green'}">❌</div>
              <div class="stat-card-value">${result.errors.length}</div>
              <div class="stat-card-label">Errors</div>
            </div>
          </div>
          
          ${result.errors.length > 0 ? `
            <p class="form-section-title text-danger">Errors</p>
            <div class="table-wrap">
              <table><thead><tr><th>Row</th><th>Error</th></tr></thead>
              <tbody>${result.errors.map(e => `<tr><td>Row ${e.row}</td><td style="color:var(--danger)">${e.message}</td></tr>`).join('')}</tbody>
              </table>
            </div>` : ''}
          
          <div class="flex gap-3 mt-6">
            <button class="btn btn-primary" onclick="finishImport()">🎉 View Students</button>
            <button class="btn btn-outline" onclick="renderImport()">↩ Import Another</button>
          </div>
        </div>
      </div>`;
    
    Toast.success('Import Complete', `${result.imported} students imported successfully!`);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Import Failed</h3><p>${err.message}</p></div>`;
    Toast.error('Import Failed', err.message);
  }
}

function buildMapping(subjectMeta) {
  const mapping = {};
  ['name','roll_number','father_name','mother_name','dob','attendance','remarks'].forEach(field => {
    const el = document.getElementById(`map-${field}`);
    if (el?.value) mapping[field] = el.value;
  });
  
  mapping.marks = {};
  mapping.internal_marks = {};
  mapping.external_marks = {};
  
  subjectMeta.forEach(sub => {
    const marksEl = document.getElementById(`map-marks-${sub.id}`);
    if (marksEl?.value) mapping.marks[sub.id] = marksEl.value;
    
    if (sub.type === 'split') {
      const intEl = document.getElementById(`map-int-${sub.id}`);
      const extEl = document.getElementById(`map-ext-${sub.id}`);
      if (intEl?.value) mapping.internal_marks[sub.id] = intEl.value;
      if (extEl?.value) mapping.external_marks[sub.id] = extEl.value;
    }
  });
  
  return mapping;
}

function finishImport() {
  Router.navigate('students', { standardId: _importStandardId });
}

window.renderImport = renderImport;
window.handleImportFile = handleImportFile;
window.showImportStep = showImportStep;
window.executeImportPreview = executeImportPreview;
window.finishImport = finishImport;
