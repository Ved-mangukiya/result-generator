/* ═══════════════════════════════════════════════
   RESULTS.JS — Result Generation & Preview
   ═══════════════════════════════════════════════ */

let _resultsStandardId = null;
let _resultsData = null;

async function renderResults(params = {}) {
  setPageTitle('Results', 'Results');
  _resultsStandardId = params.standardId || null;
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Results</h1>
        <p>View computed results, preview cards, and export PDFs</p>
      </div>
    </div>

    <!-- Class Selector -->
    <div class="card mb-6">
      <div class="card-body" style="padding:var(--space-5)">
        <div class="flex gap-4 flex-wrap items-center">
          <div class="form-group" style="flex:1;min-width:200px">
            <label class="form-label">Select Class</label>
            <select class="form-control" id="results-std-select" onchange="loadResultsForClass(this.value)">
              <option value="">— Select a class to view results —</option>
            </select>
          </div>
          <div id="results-actions" class="flex gap-2 flex-wrap" style="margin-top:20px;display:none!important">
            <button class="btn btn-outline btn-sm" onclick="showResultSettings()">⚙ Card Settings</button>
            <button class="btn btn-outline btn-sm" onclick="downloadClassExcel()">📊 Export Excel</button>
            <button class="btn btn-primary btn-sm" onclick="downloadBulkPDF()">📥 Bulk PDF</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Table -->
    <div id="results-container">
      <div class="empty-state" style="height:400px">
        <div class="empty-state-icon">📋</div>
        <h3>Select a Class</h3>
        <p>Choose a class from the dropdown above to see results and export options.</p>
      </div>
    </div>`;
  
  await loadResultsStandardDropdown();
  if (_resultsStandardId) {
    document.getElementById('results-std-select').value = _resultsStandardId;
    await loadResultsForClass(_resultsStandardId);
  }
}

async function loadResultsStandardDropdown() {
  try {
    const boards = await API.boards.list();
    const sel = document.getElementById('results-std-select');
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

async function loadResultsForClass(standardId) {
  if (!standardId) return;
  _resultsStandardId = parseInt(standardId);
  
  const container = document.getElementById('results-container');
  container.innerHTML = `<div class="empty-state"><div class="animate-pulse" style="font-size:2rem">📊</div><p class="text-muted text-sm mt-2">Computing results...</p></div>`;
  
  try {
    _resultsData = await API.export.results(standardId);
    const { standard, subjects, students } = _resultsData;
    
    // Show action buttons
    const actionsEl = document.getElementById('results-actions');
    actionsEl.style.display = 'flex';
    
    // Summary bar
    const passCount = students.filter(s => s.finalStatus !== 'Fail' && s.finalStatus !== 'Pending').length;
    const failCount = students.filter(s => s.finalStatus === 'Fail').length;
    const distCount = students.filter(s => s.finalStatus === 'Distinction').length;
    const avgPct = students.length > 0
      ? (students.reduce((s, r) => s + (r.overallPct || 0), 0) / students.length).toFixed(1)
      : 0;
    
    container.innerHTML = `
      <!-- Summary Strip -->
      <div class="grid grid-4 gap-3 mb-4">
        ${[
          { label:'Total Students', value:students.length, icon:'👥', cls:'blue' },
          { label:'Passed', value:passCount, icon:'✅', cls:'green' },
          { label:'Failed', value:failCount, icon:'❌', cls:'red' },
          { label:'Distinction', value:distCount, icon:'🏆', cls:'gold' },
        ].map(s => `<div class="stat-card">
          <div class="stat-card-icon ${s.cls}">${s.icon}</div>
          <div class="stat-card-value">${s.value}</div>
          <div class="stat-card-label">${s.label}</div>
        </div>`).join('')}
      </div>

      <!-- Results Table -->
      <div class="card">
        <div class="card-header">
          <h3>${standard.display_name} — Results</h3>
          <div class="flex gap-2">
            <span class="badge badge-primary">Avg: ${avgPct}%</span>
            <span class="badge badge-success">Pass: ${passCount}</span>
            <span class="badge badge-danger">Fail: ${failCount}</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Roll No.</th>
                <th>Name</th>
                ${subjects.map(s => `<th title="${s.name}">${s.name.split(' ')[0]}</th>`).join('')}
                <th>Total</th>
                <th>%</th>
                <th>Grade</th>
                <th>Result</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(sr => {
                const statusClass = getStatusClass(sr.finalStatus);
                return `<tr>
                  <td style="font-weight:700;color:var(--accent)">#${sr.rank}</td>
                  <td><span class="badge badge-gray">${sr.student.roll_number}</span></td>
                  <td class="td-primary">${sr.student.name}</td>
                  ${subjects.map(sub => {
                    const subRes = sr.subjectResults?.find(s => s.subject_id === sub.id);
                    if (!subRes) return '<td>—</td>';
                    if (subRes.is_absent) return '<td><span class="badge badge-warning">AB</span></td>';
                    return `<td style="font-weight:${subRes.pass_fail === 'FAIL' ? '700' : '400'};color:${subRes.pass_fail === 'FAIL' ? 'var(--danger)' : 'inherit'}">${subRes.obtained ?? '—'}</td>`;
                  }).join('')}
                  <td class="td-primary">${sr.totalObtained}/${sr.totalMaxMarks}</td>
                  <td><span class="font-semibold" style="color:${sr.overallGradeColor || 'inherit'}">${sr.overallPct !== null ? sr.overallPct.toFixed(1) + '%' : '—'}</span></td>
                  <td style="color:${sr.overallGradeColor || 'inherit'};font-weight:700">${sr.overallGrade}</td>
                  <td><span class="badge ${statusClass}">${sr.finalStatus}</span></td>
                  <td>
                    <div class="td-actions">
                      <button class="btn btn-ghost btn-icon-sm" onclick="previewStudentCard(${sr.student.id})" title="Preview Card">👁</button>
                      <a class="btn btn-ghost btn-icon-sm" href="${API.export.pdfSingle(sr.student.id)}" title="Download PDF" download>📄</a>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error Loading Results</h3><p>${err.message}</p></div>`;
    Toast.error('Results Error', err.message);
  }
}

async function previewStudentCard(studentId) {
  Spinner.show('Generating preview...');
  try {
    const html = await API.export.previewStudent(studentId);
    Spinner.hide();
    createModal('card-preview', '👁 Result Card Preview',
      `<div style="background:white;border-radius:var(--radius);overflow:hidden">
        <iframe style="width:100%;height:800px;border:none" srcdoc="${html.replace(/"/g,'&quot;')}"></iframe>
      </div>`,
      `<button class="btn btn-outline" onclick="closeModal('card-preview')">Close</button>
       <a class="btn btn-primary" href="${API.export.pdfSingle(studentId)}" download>⬇ Download PDF</a>`,
      'modal-full'
    );
  } catch (err) {
    Spinner.hide();
    Toast.error('Preview Failed', err.message);
  }
}

async function downloadBulkPDF() {
  if (!_resultsStandardId) return;
  Spinner.show('Generating bulk PDF... This may take a moment.');
  try {
    const url = API.export.pdfBulk(_resultsStandardId);
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.click();
    setTimeout(() => Spinner.hide(), 3000);
    Toast.info('Downloading', 'Your bulk PDF is being generated and will download shortly.');
  } catch (err) {
    Spinner.hide();
    Toast.error('Export Failed', err.message);
  }
}

function downloadClassExcel() {
  if (!_resultsStandardId) return;
  const url = API.export.excel(_resultsStandardId);
  window.location.href = url;
  Toast.success('Downloading', 'Excel export will download shortly.');
}

async function showResultSettings() {
  if (!_resultsStandardId) return;
  const settings = await API.standards.getSettings(_resultsStandardId);
  const cats = typeof settings.result_categories === 'string'
    ? JSON.parse(settings.result_categories)
    : settings.result_categories || [];
  
  createModal('result-settings', '⚙ Result Card Settings',
    `<p class="form-section-title">Display Options</p>
    <div class="grid grid-2 gap-4 mb-6">
      ${[
        ['show_rank', 'Show Rank', settings.show_rank],
        ['show_attendance', 'Show Attendance', settings.show_attendance],
        ['show_remarks', 'Show Remarks', settings.show_remarks],
        ['show_photo', 'Show Photo', settings.show_photo],
        ['show_parent_names', 'Show Parent Names', settings.show_parent_names],
        ['show_dob', 'Show Date of Birth', settings.show_dob],
        ['show_split_marks', 'Show Int/Ext Split', settings.show_split_marks],
        ['show_grade', 'Show Grade', settings.show_grade],
        ['show_pass_fail', 'Show Pass/Fail', settings.show_pass_fail]
      ].map(opt => `
        <label class="toggle-group">
          <span class="toggle-label">${opt[1]}</span>
          <span class="toggle">
            <input type="checkbox" id="rs-${opt[0]}" ${opt[2] !== 0 ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </span>
        </label>
      `).join('')}
    </div>
    
    <div class="form-group mb-6">
      <label class="form-label">Paper Sizing</label>
      <select class="form-control" id="rs-paper_size" style="width:100%">
        <option value="A4 Portrait" ${settings.paper_size === 'A5 Portrait' ? '' : 'selected'}>A4 Portrait (Standard A4 Sheet)</option>
        <option value="A5 Portrait" ${settings.paper_size === 'A5 Portrait' ? 'selected' : ''}>A5 Portrait (Half A4 Sheet - Compact)</option>
      </select>
    </div>
    
    <p class="form-section-title">Template</p>
    <div class="flex gap-2 flex-wrap mb-4" id="template-quick-select">
      ${(typeof TEMPLATE_INFO !== 'undefined' ? TEMPLATE_INFO : []).map(t => `
        <button type="button" class="btn ${settings.template_id === t.id ? 'btn-primary' : 'btn-outline'} btn-sm" 
          onclick="selectQuickTemplate(${t.id})" data-tid="${t.id}">${t.id}. ${t.name}</button>
      `).join('')}
    </div>
    <input type="hidden" id="rs-template" value="${settings.template_id || 1}">
    
    <p class="form-section-title">Color Override</p>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Primary Color</label>
        <input type="color" class="form-control" id="rs-primary-color" value="${settings.primary_color || '#7a6130'}" style="height:42px;cursor:pointer">
      </div>
      <div class="form-group">
        <label class="form-label">Accent Color</label>
        <input type="color" class="form-control" id="rs-accent-color" value="${settings.accent_color || '#d4af37'}" style="height:42px;cursor:pointer">
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModal('result-settings')">Cancel</button>
     <button class="btn btn-primary" onclick="saveResultSettings(${_resultsStandardId})">💾 Save Settings</button>`,
    'modal-md'
  );
}

function selectQuickTemplate(id) {
  document.getElementById('rs-template').value = id;
  $$('#template-quick-select button').forEach(btn => {
    btn.className = `btn ${btn.dataset.tid == id ? 'btn-primary' : 'btn-outline'} btn-sm`;
  });
}

async function saveResultSettings(standardId) {
  const settings = {
    template_id: parseInt(document.getElementById('rs-template').value) || 1,
    primary_color: document.getElementById('rs-primary-color').value,
    accent_color: document.getElementById('rs-accent-color').value,
    show_rank: document.getElementById('rs-show_rank').checked,
    show_attendance: document.getElementById('rs-show_attendance').checked,
    show_remarks: document.getElementById('rs-show_remarks').checked,
    show_photo: document.getElementById('rs-show_photo').checked,
    show_parent_names: document.getElementById('rs-show_parent_names').checked,
    show_dob: document.getElementById('rs-show_dob').checked,
    show_split_marks: document.getElementById('rs-show_split_marks').checked,
    show_grade: document.getElementById('rs-show_grade').checked,
    show_pass_fail: document.getElementById('rs-show_pass_fail').checked,
    paper_size: document.getElementById('rs-paper_size').value,
    result_categories: ['Distinction','First Class','Second Class','Pass','Fail']
  };
  
  try {
    await API.standards.saveSettings(standardId, settings);
    closeModal('result-settings');
    Toast.success('Settings Saved', 'Result card settings updated.');
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

window.renderResults = renderResults;
window.loadResultsForClass = loadResultsForClass;
window.previewStudentCard = previewStudentCard;
window.downloadBulkPDF = downloadBulkPDF;
window.downloadClassExcel = downloadClassExcel;
window.showResultSettings = showResultSettings;
window.selectQuickTemplate = selectQuickTemplate;
window.saveResultSettings = saveResultSettings;
