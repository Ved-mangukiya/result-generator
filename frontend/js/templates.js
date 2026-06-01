/* ═══════════════════════════════════════════════
   TEMPLATES.JS — Template Preview & Selection
   ═══════════════════════════════════════════════ */

const TEMPLATE_INFO = [
  { id:1, name:'Imperial',   desc:'Deep navy & gold, serif fonts, government feel', colors:['#1a3a6b','#d4af37'], emoji:'🏛' },
  { id:2, name:'Saffron',    desc:'Saffron & tricolor strip, patriotic Indian style', colors:['#c17f24','#ffffff'], emoji:'🇮🇳' },
  { id:3, name:'Emerald',    desc:'Deep green, minimalist, modern coaching look', colors:['#0f4c2e','#e8f5e9'], emoji:'💚' },
  { id:4, name:'Corporate',  desc:'Charcoal, bold sans-serif, professional boardroom', colors:['#2d2d2d','#1a3a6b'], emoji:'💼' },
  { id:5, name:'Maroon',     desc:'Maroon & cream, ornate vintage school card look', colors:['#7c1d1d','#f5f0e8'], emoji:'📜' },
  { id:6, name:'Sky Modern', desc:'Light blue, rounded elements, certificate-like', colors:['#1a6bab','#f0f7ff'], emoji:'🌤' },
  { id:7, name:'Royal Gold', desc:'Royal Gold & slate, luxury certificate design', colors:['#1e2530','#d4af37'], emoji:'👑' },
  { id:8, name:'Minimalist', desc:'Space Grotesk, JetBrains Mono, borderless style', colors:['#ffffff','#0f172a'], emoji:'▫️' },
  { id:9, name:'Vibrant Indigo', desc:'Modern violet-indigo gradient, rounded card styling', colors:['#4f46e5','#7c3aed'], emoji:'👾' },
  { id:10, name:'Vedic Heritage', desc:'Warm saffron border, traditional Sanskrit heritage feel', colors:['#fdfaf2','#b71c1c'], emoji:'🍁' },
  { id:11, name:'Vintage Scroll', desc:'Sepia paper scroll theme with double borders', colors:['#f7ede2','#8b5a2b'], emoji:'📜' },
  { id:12, name:'Midnight Gold', desc:'Luxurious dark charcoal and premium gold text', colors:['#181d24','#d4af37'], emoji:'🌌' },
  { id:13, name:'Slate Blackboard', desc:'Dark chalkboard style with custom hand writing', colors:['#1e2d27','#a7f3d0'], emoji:'📝' },
  { id:14, name:'Neon Cyber', desc:'Futuristic tech design with cyan and pink glows', colors:['#0b0f19','#00f2fe'], emoji:'⚙️' },
  { id:15, name:'Grand Academic', desc:'Traditional university navy/gold certificate look', colors:['#0f1e36','#c5a880'], emoji:'🛡️' },
  { id:16, name:'Blueprint Grid', desc:'Engineer grid draft with blueprint-blue borders', colors:['#f0f9ff','#0284c7'], emoji:'📐' },
  { id:17, name:'Rangoli Orange', desc:'Traditional Indian marigold corner rangoli theme', colors:['#fffbeb','#d97706'], emoji:'🪔' },
  { id:18, name:'Glassmorphism Pastel', desc:'Soft gradient backdrop with a translucent card blur', colors:['#ee9ca7','#a1c4fd'], emoji:'✨' },
  { id:19, name:'Royal Emerald', desc:'Deep rich executive emerald green and gold trim', colors:['#f4fbf7','#064e3b'], emoji:'🏵️' },
  { id:20, name:'Editorial Magazine', desc:'High fashion layout with modern italic serif font', colors:['#faf9f6','#1c1c1c'], emoji:'📰' },
];

let _previewStudentId = null;

async function renderTemplates() {
  setPageTitle('Templates', 'Templates');
  
  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Result Card Templates</h1>
        <p>20 premium print-ready templates — click to preview</p>
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
    students.slice(0, 50).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} — ${s.standard_name || ''} (Roll: ${s.roll_number})`;
      sel.appendChild(opt);
    });
    if (students.length > 0) {
      _previewStudentId = students[0].id;
      sel.value = students[0].id;
    }
  } catch {}
}

function updateTemplateStudent(id) {
  _previewStudentId = id ? parseInt(id) : null;
}

async function previewTemplate(templateId) {
  if (!_previewStudentId) {
    Toast.warning('Select a Student', 'Please select a student to preview the template.');
    return;
  }
  
  Spinner.show('Loading template preview...');
  try {
    const html = await API.export.previewStudent(_previewStudentId, templateId);
    Spinner.hide();
    
    const tInfo = TEMPLATE_INFO.find(t => t.id === templateId);
    createModal('template-preview-modal', `👁 Template ${templateId}: ${tInfo?.name}`,
      `<div style="background:white;border-radius:var(--radius);overflow:hidden">
        <iframe style="width:100%;height:800px;border:none" srcdoc="${html.replace(/"/g,'&quot;')}"></iframe>
      </div>`,
      `<button class="btn btn-outline" onclick="closeModal('template-preview-modal')">Close</button>
       <button class="btn btn-primary" onclick="applyTemplateToAll(${templateId})">✅ Apply to Class</button>`,
      'modal-full'
    );
  } catch (err) {
    Spinner.hide();
    Toast.error('Preview Failed', err.message);
  }
}

async function applyTemplateToAll(templateId) {
  // Apply template to the current student's standard
  if (!_previewStudentId) return;
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
window.previewTemplate = previewTemplate;
window.applyTemplateToAll = applyTemplateToAll;
window.selectTemplate = selectTemplate;
