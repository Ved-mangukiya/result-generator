/* ═══════════════════════════════════════════════
   UTILS.JS — Toast, Modal, Formatters, Helpers
   ═══════════════════════════════════════════════ */

// ─── Toast Notifications ─────────────────────────
const Toast = {
  show(type, title, message, duration = 4000) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <span class="toast-close" onclick="Toast.dismiss(this.parentElement)">✕</span>
    `;
    
    container.appendChild(toast);
    
    if (duration > 0) {
      setTimeout(() => Toast.dismiss(toast), duration);
    }
    return toast;
  },
  
  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 280);
  },
  
  success(msg, detail) { return this.show('success', msg, detail); },
  error(msg, detail) { return this.show('error', msg, detail, 6000); },
  warning(msg, detail) { return this.show('warning', msg, detail); },
  info(msg, detail) { return this.show('info', msg, detail); }
};

// ─── Confirm Dialog ───────────────────────────────
const Confirm = {
  _resolve: null,
  
  show(title, message, btnText = 'Delete', btnClass = 'btn-danger', icon = '⚠️') {
    return new Promise((resolve) => {
      this._resolve = resolve;
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      document.getElementById('confirm-icon').textContent = icon;
      const okBtn = document.getElementById('confirm-ok-btn');
      okBtn.textContent = btnText;
      okBtn.className = `btn ${btnClass}`;
      document.getElementById('confirm-overlay').style.display = 'flex';
    });
  },
  
  _close(result) {
    document.getElementById('confirm-overlay').style.display = 'none';
    if (this._resolve) { this._resolve(result); this._resolve = null; }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirm-ok-btn').addEventListener('click', () => Confirm._close(true));
  document.getElementById('confirm-cancel-btn').addEventListener('click', () => Confirm._close(false));
  document.getElementById('confirm-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirm-overlay')) Confirm._close(false);
  });
});

// ─── Spinner ──────────────────────────────────────
const Spinner = {
  show(text = 'Please wait...') {
    document.getElementById('spinner-text').textContent = text;
    document.getElementById('spinner-overlay').style.display = 'flex';
  },
  hide() {
    document.getElementById('spinner-overlay').style.display = 'none';
  }
};

// ─── Modal Helper ─────────────────────────────────
function createModal(id, title, bodyHTML, footerHTML, size = 'modal-md') {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = id + '-overlay';
  overlay.innerHTML = `
    <div class="modal ${size}" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <div class="modal-header">
        <h3 id="${id}-title">${title}</h3>
        <button class="modal-close" onclick="closeModal('${id}')" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>`;
  
  document.body.appendChild(overlay);
  
  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  });
  
  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') { closeModal(id); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
  
  return overlay;
}

function closeModal(id) {
  const overlay = document.getElementById(id + '-overlay');
  if (overlay) overlay.remove();
}

// ─── Formatters ───────────────────────────────────
const Format = {
  date(str) {
    if (!str) return '—';
    try {
      return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return str; }
  },

  number(val) {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Number(val).toLocaleString('en-IN');
  },
  
  pct(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return parseFloat(val).toFixed(2) + '%';
  },
  
  marks(val, max) {
    if (val === null || val === undefined) return '—';
    if (max !== undefined) return `${val} / ${max}`;
    return val;
  },

  ordinal(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  },
  
  timeAgo(dateStr) {
    if (!dateStr) return 'recently';
    // SQLite CURRENT_TIMESTAMP stores UTC without 'Z' suffix — append 'Z' to parse as UTC
    const normalized = dateStr.includes('T') || dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    const d = new Date(normalized);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (isNaN(diff) || diff < 0) return 'just now';
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    if (diff < 86400 * 7) return Math.floor(diff/86400) + 'd ago';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }
};

// ─── DOM Helpers ──────────────────────────────────
function $(selector, context = document) { return context.querySelector(selector); }
function $$(selector, context = document) { return [...context.querySelectorAll(selector)]; }

function setHTML(el, html) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) el.innerHTML = html;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? '';
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function show(id) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (el) el.style.display = '';
}

function hide(id) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (el) el.style.display = 'none';
}

function showFlex(id) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (el) el.style.display = 'flex';
}

function toggleClass(el, cls, force) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) el.classList.toggle(cls, force);
}

// ─── Number Counter Animation ─────────────────────
function animateCount(el, target, duration = 800) {
  const start = parseInt(el.textContent) || 0;
  const steps = Math.min(60, duration / 16);
  const increment = (target - start) / steps;
  let current = start;
  let step = 0;
  
  const timer = setInterval(() => {
    step++;
    current += increment;
    el.textContent = Math.round(step >= steps ? target : current);
    if (step >= steps) clearInterval(timer);
  }, duration / steps);
}

// ─── Debounce ─────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Color Swatches ───────────────────────────────
function initColorSwatches(containerEl, hiddenInputEl) {
  $$('.color-swatch', containerEl).forEach(swatch => {
    swatch.addEventListener('click', () => {
      $$('.color-swatch', containerEl).forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      hiddenInputEl.value = swatch.dataset.color;
    });
  });
}

// ─── Page Title ───────────────────────────────────
function setPageTitle(title, breadcrumb) {
  document.getElementById('topbar-title').textContent = title;
  document.getElementById('breadcrumb-current').textContent = breadcrumb || title;
  document.title = `${title} — Result Generator`;
}

// ─── Stagger animation helper ─────────────────────
function staggerAnimateItems(container, selector = '.stagger-item') {
  const items = $$(selector, container);
  items.forEach((item, i) => {
    item.style.animationDelay = `${i * 0.05}s`;
  });
}

// ─── Download helper ──────────────────────────────
function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ─── Grade Color Helper ───────────────────────────
function getStatusClass(status) {
  if (!status) return 'badge-gray';
  const s = status.toLowerCase();
  if (s === 'distinction') return 'badge-gold';
  if (s.includes('first')) return 'badge-success';
  if (s.includes('second') || s.includes('pass')) return 'badge-primary';
  if (s === 'fail') return 'badge-danger';
  return 'badge-gray';
}

// ─── Activity Log Icon ────────────────────────────
function getActivityDotClass(action) {
  if (!action) return 'update';
  const a = action.toUpperCase();
  if (a.includes('ADD')) return 'add';
  if (a.includes('DELETE')) return 'delete';
  if (a.includes('EXPORT') || a.includes('PDF')) return 'export';
  return 'update';
}

// Expose globals
window.Toast = Toast;
window.Confirm = Confirm;
window.Spinner = Spinner;
window.Format = Format;
window.createModal = createModal;
window.closeModal = closeModal;
window.$ = $;
window.$$ = $$;
window.setHTML = setHTML;
window.setVal = setVal;
window.getVal = getVal;
window.show = show;
window.hide = hide;
window.showFlex = showFlex;
window.toggleClass = toggleClass;
window.animateCount = animateCount;
window.debounce = debounce;
window.initColorSwatches = initColorSwatches;
window.setPageTitle = setPageTitle;
window.staggerAnimateItems = staggerAnimateItems;
window.downloadFile = downloadFile;
window.getStatusClass = getStatusClass;
window.getActivityDotClass = getActivityDotClass;

// Responsive Preview Helper Functions
function togglePreviewDevice(device) {
  const iframe = document.getElementById('preview-iframe');
  const container = document.getElementById('preview-viewport-container');
  const btnPc = document.getElementById('btn-preview-pc');
  const btnMobile = document.getElementById('btn-preview-mobile');
  
  if (!iframe || !container) return;
  
  if (device === 'pc') {
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    if (btnPc) btnPc.classList.add('active');
    if (btnMobile) btnMobile.classList.remove('active');
  } else if (device === 'mobile') {
    iframe.style.width = '375px';
    iframe.style.height = '667px';
    if (btnPc) btnPc.classList.remove('active');
    if (btnMobile) btnMobile.classList.add('active');
  }
}

function togglePreviewFullscreen() {
  const modal = document.querySelector('.modal-overlay');
  if (!modal) return;
  modal.classList.toggle('modal-fullscreen-overlay');
}

window.togglePreviewDevice = togglePreviewDevice;
window.togglePreviewFullscreen = togglePreviewFullscreen;

function makeImageBackgroundless(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            if (r > 215 && g > 215 && b > 215) {
              data[i+3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (err) {
          console.error("Canvas pixel read error:", err);
          resolve(file);
          return;
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".png", { type: "image/png" }));
          } else {
            resolve(file);
          }
        }, "image/png");
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

window.makeImageBackgroundless = makeImageBackgroundless;
