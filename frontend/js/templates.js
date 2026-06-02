/* ═══════════════════════════════════════════════
   TEMPLATES.JS — Template Preview & Selection
   ═══════════════════════════════════════════════ */

const TEMPLATE_INFO = [
  { id:1, name:'Imperial',   desc:'Deep navy & gold, serif fonts, government feel', colors:['#1a3a6b','#d4af37'], emoji:'🏛', category:'school' },
  { id:2, name:'Saffron',    desc:'Saffron & tricolor strip, patriotic Indian style', colors:['#c17f24','#ffffff'], emoji:'🇮🇳', category:'school' },
  { id:3, name:'Emerald',    desc:'Deep green, minimalist, modern coaching look', colors:['#0f4c2e','#e8f5e9'], emoji:'💚', category:'school' },
  { id:4, name:'Corporate',  desc:'Charcoal, bold sans-serif, professional boardroom', colors:['#2d2d2d','#1a3a6b'], emoji:'💼', category:'commerce' },
  { id:5, name:'Maroon',     desc:'Maroon & cream, ornate vintage school card look', colors:['#7c1d1d','#f5f0e8'], emoji:'📜', category:'school' },
  { id:6, name:'Sky Modern', desc:'Light blue, rounded elements, certificate-like', colors:['#1a6bab','#f0f7ff'], emoji:'🌤', category:'school' },
  { id:7, name:'Royal Gold', desc:'Royal Gold & slate, luxury certificate design', colors:['#1e2530','#d4af37'], emoji:'👑', category:'arts' },
  { id:8, name:'Minimalist', desc:'Space Grotesk, JetBrains Mono, borderless style', colors:['#ffffff','#0f172a'], emoji:'▫️', category:'arts' },
  { id:9, name:'Vibrant Indigo', desc:'Modern violet-indigo gradient, rounded card styling', colors:['#4f46e5','#7c3aed'], emoji:'👾', category:'science_pcmb' },
  { id:10, name:'High-Precision Tech', desc:'Minimalist double border, tech scorecard with grid ornaments', colors:['#334155','#94a3b8'], emoji:'🔬', category:'science_pcm' },
  { id:11, name:'Vintage Scroll', desc:'Sepia paper scroll theme with double borders', colors:['#f7ede2','#8b5a2b'], emoji:'📜', category:'arts' },
  { id:12, name:'Midnight Gold', desc:'Luxurious dark charcoal and premium gold text', colors:['#181d24','#d4af37'], emoji:'🌌', category:'science_pcm' },
  { id:13, name:'Slate Blackboard', desc:'Dark chalkboard style with custom hand writing', colors:['#1e2d27','#a7f3d0'], emoji:'📝', category:'kids' },
  { id:14, name:'Junior Scholars (Kid\'s Theme)', desc:'Playful pastel orange and green borders with balloons and stars', colors:['#ffcc80','#81c784'], emoji:'🎨', category:'kids' },
  { id:15, name:'Grand Academic', desc:'Traditional university navy/gold certificate look', colors:['#0f1e36','#c5a880'], emoji:'🛡️', category:'commerce' },
  { id:16, name:'JEE & PCM Prep Grid', desc:'Blueprint engineering grid design optimized for PCM entrance rankings', colors:['#0284c7','#f0f9ff'], emoji:'📐', category:'science_pcm' },
  { id:17, name:'Rangoli Orange', desc:'Traditional Indian marigold corner rangoli theme', colors:['#fffbeb','#d97706'], emoji:'🪔', category:'kids' },
  { id:18, name:'NEET & Medical PCB Prep', desc:'Clean medical division scorecard customized for PCB and NEET exams', colors:['#ee9ca7','#a1c4fd'], emoji:'🩺', category:'science_pcb' },
  { id:19, name:'Royal Emerald', desc:'Deep rich executive emerald green and gold trim', colors:['#f4fbf7','#064e3b'], emoji:'🏵️', category:'commerce' },
  { id:20, name:'Editorial Magazine', desc:'High fashion layout with modern italic serif font', colors:['#faf9f6','#1c1c1c'], emoji:'📰', category:'arts' },
];

let _previewStudentId = null;

async function renderTemplates() {
  setPageTitle('Templates', 'Templates');
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Result Card Templates</h1>
        <p>20 premium print-ready templates grouped by stream</p>
      </div>
    </div>

    <!-- Student selector for preview -->
    <div class="card mb-6">
      <div class="card-body" style="padding:var(--space-4)">
        <div class="flex gap-4 items-center flex-wrap">
          <div style="flex:1;min-width:200px">
            <label class="form-label mb-2">Preview with Student</label>
            <select class="form-control" id="template-preview-student" onchange="updateTemplateStudent(this.value)">
              <option value="">— Select a student to preview —</option>
            </select>
          </div>
          <p class="text-sm text-muted" style="max-width:400px">
            Select any student to see how their result card looks in each template.
          </p>
        </div>
      </div>
    </div>

    <!-- Category Tabs -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2" style="border-bottom: 1px solid var(--border)">
      <button class="btn btn-outline btn-sm active template-filter-btn" data-cat="all" onclick="filterTemplates('all')">All</button>
      <button class="btn btn-outline btn-sm template-filter-btn" data-cat="kids" onclick="filterTemplates('kids')">Preschool / Kids</button>
      <button class="btn btn-outline btn-sm template-filter-btn" data-cat="school" onclick="filterTemplates('school')">Secondary School</button>
      <button class="btn btn-outline btn-sm template-filter-btn" data-cat="commerce" onclick="filterTemplates('commerce')">Commerce</button>
      <button class="btn btn-outline btn-sm template-filter-btn" data-cat="arts" onclick="filterTemplates('arts')">Arts</button>
      <button class="btn btn-outline btn-sm template-filter-btn" data-cat="science_pcm" onclick="filterTemplates('science_pcm')">Science PCM</button>
      <button class="btn btn-outline btn-sm template-filter-btn" data-cat="science_pcb" onclick="filterTemplates('science_pcb')">Science PCB</button>
      <button class="btn btn-outline btn-sm template-filter-btn" data-cat="science_pcmb" onclick="filterTemplates('science_pcmb')">NEET / JEE / PCMB</button>
    </div>

    <!-- Template Grid -->
    <div class="template-grid" id="template-grid">
      ${TEMPLATE_INFO.map(t => `
        <div class="template-card stagger-item" id="template-card-${t.id}" onclick="selectTemplate(${t.id})">
          <div class="template-preview" style="background:linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1] || t.colors[0]} 100%);display:flex;align-items:center;justify-content:center">
            <div style="text-align:center;color:white;padding:var(--space-4)">
              <div style="font-size:3rem;margin-bottom:var(--space-2)">${t.emoji}</div>
              <div style="font-size:0.875rem;font-weight:600;opacity:0.9">Template ${t.id}</div>
              <div style="font-size:0.75rem;opacity:0.7;margin-top:4px">${t.name}</div>
            </div>
          </div>
          <div class="template-info">
            <div>
              <div class="template-name">${t.name}</div>
              <div class="text-xs text-muted mt-1">${t.desc}</div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();previewTemplate(${t.id})">👁 Preview</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
  
  // Load students for preview dropdown
  try {
    const students = await API.students.list();
    const sel = document.getElementById('template-preview-student');
    sel.innerHTML = '<option value="mock">👤 Mock Student (Preview)</option>';
    students.slice(0, 50).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} — ${s.standard_name || ''} (Roll: ${s.roll_number})`;
      sel.appendChild(opt);
    });
    if (students.length > 0) {
      _previewStudentId = students[0].id;
      sel.value = students[0].id;
    } else {
      _previewStudentId = 'mock';
      sel.value = 'mock';
    }
  } catch {}
}

function updateTemplateStudent(id) {
  _previewStudentId = id && id !== 'mock' ? parseInt(id) : 'mock';
}

function filterTemplates(cat) {
  // Update button active states
  document.querySelectorAll('.template-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
  });

  // Filter templates visually
  TEMPLATE_INFO.forEach(t => {
    const card = document.getElementById(`template-card-${t.id}`);
    if (card) {
      if (cat === 'all' || t.category === cat) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    }
  });
}

async function previewTemplate(templateId) {
  const studentId = _previewStudentId || 'mock';
  
  Spinner.show('Loading template preview...');
  try {
    const html = await API.export.previewStudent(studentId, templateId);
    Spinner.hide();
    
    const tInfo = TEMPLATE_INFO.find(t => t.id === templateId);
    const overlay = createModal('template-preview-modal', `👁 Template ${templateId}: ${tInfo?.name}`,
      `<div id="preview-viewport-container" style="display:flex; justify-content:center; align-items:center; background:#0f172a; padding:20px; transition:all 0.3s ease; overflow:auto; max-height:700px; border-radius:var(--radius)">
         <iframe id="preview-iframe" style="width:210mm; height:297mm; max-height:650px; background:white; border:none; box-shadow:0 10px 25px rgba(0,0,0,0.5); transition:all 0.3s ease" srcdoc="${html.replace(/"/g,'&quot;')}"></iframe>
       </div>`,
      `<button class="btn btn-outline" onclick="closeModal('template-preview-modal')">Close</button>
       <button class="btn btn-primary" onclick="applyTemplateToAll(${templateId})">✅ Apply to Class</button>`,
      'modal-xl'
    );
    overlay.classList.add('modal-fullscreen-overlay');
  } catch (err) {
    Spinner.hide();
    Toast.error('Preview Failed', err.message);
  }
}

async function applyTemplateToAll(templateId) {
  if (!_previewStudentId || _previewStudentId === 'mock') {
    Toast.warning('No Class Selected', 'Please select a real student to apply the template to their class.');
    return;
  }
  try {
    const student = await API.students.get(_previewStudentId);
    const settings = await API.standards.getSettings(student.standard_id);
    settings.template_id = templateId;
    await API.standards.saveSettings(student.standard_id, settings);
    closeModal('template-preview-modal');
    Toast.success('Template Applied', `Template ${templateId} applied to the class.`);
  } catch (err) {
    Toast.error('Apply Failed', err.message);
  }
}

function selectTemplate(id) {
  $$('.template-card').forEach(card => card.classList.remove('selected'));
  document.getElementById(`template-card-${id}`)?.classList.add('selected');
  previewTemplate(id);
}

window.renderTemplates = renderTemplates;
window.updateTemplateStudent = updateTemplateStudent;
window.filterTemplates = filterTemplates;
window.previewTemplate = previewTemplate;
window.applyTemplateToAll = applyTemplateToAll;
window.selectTemplate = selectTemplate;
