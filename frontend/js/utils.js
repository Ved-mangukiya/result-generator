/* ═══════════════════════════════════════════════
   UTILS.JS — Toast, Modal, Formatters, Helpers
   ═══════════════════════════════════════════════ */

// ─── Toast Notifications ─────────────────────────
const Toast = {
  show(type, title, message, duration = 4000) {
    const svgIcons = {
      success: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>`,
      info:    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/></svg>`,
    };
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${svgIcons[type] || svgIcons.info}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <span class="toast-close" onclick="Toast.dismiss(this.parentElement)">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </span>
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

  success(msg, detail) { this.show('success', msg, detail); successRipple(); },
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
      const overlay = document.getElementById('confirm-overlay');
      if (overlay) {
        overlay.classList.remove('hiding');
        overlay.style.pointerEvents = '';
      }
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      document.getElementById('confirm-icon').innerHTML = icon;
      const okBtn = document.getElementById('confirm-ok-btn');
      okBtn.textContent = btnText;
      okBtn.className = `btn ${btnClass}`;
      document.getElementById('confirm-overlay').style.display = 'flex';
    });
  },
  
  _close(result) {
    const overlay = document.getElementById('confirm-overlay');
    if (overlay) {
      overlay.style.pointerEvents = 'none';
      overlay.classList.add('hiding');
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.classList.remove('hiding');
        overlay.style.pointerEvents = '';
      }, 150);
    }
    if (this._resolve) { this._resolve(result); this._resolve = null; }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirm-ok-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    Confirm._close(true);
  });
  document.getElementById('confirm-cancel-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    Confirm._close(false);
  });
  document.getElementById('confirm-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirm-overlay')) {
      e.stopPropagation();
      Confirm._close(false);
    }
  });
});

// ─── Spinner ──────────────────────────────────────
const Spinner = {
  _progressInterval: null,
  show(text = 'Please wait...') {
    document.getElementById('spinner-text').textContent = text;
    document.getElementById('spinner-overlay').style.display = 'flex';
    
    const bar = document.getElementById('spinner-progress-bar');
    if (bar) {
      bar.style.width = '0%';
      let pct = 0;
      clearInterval(this._progressInterval);
      this._progressInterval = setInterval(() => {
        if (pct < 90) {
          pct += Math.random() * 15;
          if (pct > 90) pct = 90;
          bar.style.width = pct + '%';
        }
      }, 250);
    }
  },
  hide() {
    const bar = document.getElementById('spinner-progress-bar');
    if (bar) {
      bar.style.width = '100%';
      setTimeout(() => {
        document.getElementById('spinner-overlay').style.display = 'none';
        clearInterval(this._progressInterval);
      }, 200);
    } else {
      document.getElementById('spinner-overlay').style.display = 'none';
    }
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
        <button class="modal-close" onclick="event.stopPropagation(); closeModal('${id}')" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>`;
  
  document.body.appendChild(overlay);
  
  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      e.stopPropagation();
      closeModal(id);
    }
  });
  
  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') { 
      closeModal(id); 
      document.removeEventListener('keydown', escHandler); 
    }
  };
  document.addEventListener('keydown', escHandler);
  
  return overlay;
}

function closeModal(id) {
  const overlay = document.getElementById(id + '-overlay');
  if (overlay) {
    overlay.style.pointerEvents = 'none';
    overlay.classList.add('hiding');
    setTimeout(() => overlay.remove(), 150);
  }
}

// ─── Formatters ───────────────────────────────────
const Format = {
  // Always output DD/MM/YYYY
  date(str) {
    if (!str) return '—';
    try {
      str = String(str).trim();
      if (/^\d{5}(\.\d+)?$/.test(str)) {
        const serial = parseFloat(str);
        const d = new Date((serial - 25569) * 86400000);
        if (isNaN(d)) return str;
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = d.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }
      const d = new Date(str + (str.includes('T') ? '' : 'T00:00:00'));
      if (isNaN(d)) return str;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch { return str; }
  },

  // DOB specific (same DD/MM/YYYY)
  dob(str) { return this.date(str); },

  // Short date (using DD/MM/YYYY format)
  dateShort(str) {
    return this.date(str);
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
    const normalized = dateStr.includes('T') || dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    const d = new Date(normalized);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (isNaN(diff) || diff < 0) return 'just now';
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    if (diff < 86400 * 7) return Math.floor(diff/86400) + 'd ago';
    return this.date(normalized);
  },

  // Full datetime: DD/MM/YYYY, HH:MM AM/PM
  datetime(dateStr) {
    if (!dateStr) return '—';
    try {
      const normalized = dateStr.includes('T') || dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
      const d = new Date(normalized);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      let hh = d.getHours();
      const min = String(d.getMinutes()).padStart(2, '0');
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12 || 12;
      return `${dd}/${mm}/${yyyy}, ${hh}:${min} ${ampm}`;
    } catch { return dateStr; }
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
  if (el) {
    el.style.display = '';
    el.classList.remove('hidden');
  }
}

function hide(id) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (el) {
    el.style.display = 'none';
    el.classList.add('hidden');
  }
}

function showFlex(id) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (el) {
    el.style.display = 'flex';
    el.classList.remove('hidden');
  }
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

// ─── Download helper (IDM & In-Memory Blob Safe) ──
async function downloadBlobFile(url, defaultFilename) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let msg = `Download failed (${res.status})`;
      try {
        const json = JSON.parse(errText);
        if (json.error) msg = json.error;
      } catch (e) {
        if (errText && errText.length < 120) msg = errText;
      }
      throw new Error(msg);
    }
    
    // Extract filename from header if present
    let filename = defaultFilename || 'document.pdf';
    const disposition = res.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    }, 10000);
    return true;
  } catch (err) {
    console.error('Blob download failed:', err);
    throw err;
  }
}

function downloadFile(url, filename) {
  if (url.startsWith('/api/') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return downloadBlobFile(url, filename).catch(err => {
      if (window.Toast) window.Toast.error('Download Failed', err.message);
    });
  }
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
  if (a.includes('ADD') || a.includes('CREATE')) return 'add';
  if (a.includes('DELETE')) return 'delete';
  if (a.includes('EXPORT') || a.includes('PDF')) return 'export';
  if (a.includes('MARKS') || a.includes('SAVE')) return 'update';
  return 'update';
}

// ─── Success Ripple Animation ─────────────────────
function successRipple() {
  const el = document.createElement('div');
  el.className = 'success-ripple-overlay';
  el.innerHTML = `
    <div class="success-ripple-inner">
      <svg viewBox="0 0 52 52" class="success-ripple-checkmark">
        <circle class="success-ripple-circle" cx="26" cy="26" r="25" fill="none" stroke="#22c55e" stroke-width="2"/>
        <path class="success-ripple-check" fill="none" stroke="#22c55e" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round" d="M14 26l8 8 16-16"/>
      </svg>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('show'); }, 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 1200);
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
window.downloadBlobFile = downloadBlobFile;
window.getStatusClass = getStatusClass;
window.getActivityDotClass = getActivityDotClass;
window.successRipple = successRipple;

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

window.isStudentEnrolled = function(student, subjectId, isSubjectCompulsory) {
  if (!student || !student.elective_subjects) {
    return true;
  }
  try {
    const parsed = typeof student.elective_subjects === 'string'
      ? JSON.parse(student.elective_subjects)
      : student.elective_subjects;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (Array.isArray(parsed.enrolledSubjectIds)) {
        return parsed.enrolledSubjectIds.includes(Number(subjectId));
      }
    }
    if (Array.isArray(parsed)) {
      const electiveIds = parsed.map(el => typeof el === 'object' ? el.id : el);
      return (isSubjectCompulsory !== 0) || electiveIds.includes(Number(subjectId));
    }
  } catch (e) {
    console.error('Error parsing elective_subjects:', e);
  }
  return true;
};

window.getPhotoThumbPath = function(photoPath) {
  if (!photoPath) return '';
  const lastDot = photoPath.lastIndexOf('.');
  if (lastDot === -1) return photoPath;
  return photoPath.substring(0, lastDot) + '_thumb.jpg';
};

function setupGridExcelCopyPaste(tbodyElement, addRowFn) {
  tbodyElement.addEventListener('paste', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    const pastedText = clipboardData.getData('text/plain');
    if (!pastedText) return;

    const rows = pastedText.split(/\r?\n/).filter(r => r.length > 0);
    if (rows.length === 0) return;

    e.preventDefault();

    const startInput = e.target;
    const startRow = parseInt(startInput.dataset.row);
    const startCol = parseInt(startInput.dataset.col);

    if (isNaN(startRow) || isNaN(startCol)) return;

    rows.forEach((rowText, rOffset) => {
      const cells = rowText.split('\t');
      const targetRowIdx = startRow + rOffset;

      if (addRowFn && targetRowIdx >= tbodyElement.children.length) {
        addRowFn();
      }

      cells.forEach((cellText, cOffset) => {
        const targetColIdx = startCol + cOffset;
        const selector = `input[data-row="${targetRowIdx}"][data-col="${targetColIdx}"]`;
        const targetInput = tbodyElement.querySelector(selector);
        if (targetInput && !targetInput.disabled) {
          targetInput.value = cellText.trim();
          targetInput.dispatchEvent(new Event('input', { bubbles: true }));
          targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  });
}

function setupSpreadsheetKeyboardNavigation(tbodyElement, addRowFn) {
  tbodyElement.addEventListener('keydown', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    const input = e.target;
    const row = parseInt(input.dataset.row);
    const col = parseInt(input.dataset.col);
    if (isNaN(row) || isNaN(col)) return;

    const maxRows = tbodyElement.children.length;
    const firstRow = tbodyElement.children[0];
    const maxColInput = firstRow ? Array.from(firstRow.querySelectorAll('input[data-col]')).reduce((max, inp) => {
      const colVal = parseInt(inp.dataset.col);
      return colVal > max ? colVal : max;
    }, 0) : 0;
    const maxCols = maxColInput + 1;

    let targetRow = row;
    let targetCol = col;
    let handled = false;

    const enterActionEl = document.getElementById('grid-enter-action');
    const enterAction = enterActionEl ? enterActionEl.value : 'right';

    if (e.key === 'ArrowUp') {
      targetRow = Math.max(0, row - 1);
      handled = true;
    } else if (e.key === 'ArrowDown') {
      targetRow = Math.min(maxRows - 1, row + 1);
      handled = true;
    } else if (e.key === 'ArrowLeft') {
      if (col > 0) {
        targetCol = col - 1;
        handled = true;
      }
    } else if (e.key === 'ArrowRight') {
      if (col < maxCols - 1) {
        targetCol = col + 1;
        handled = true;
      }
    } else if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (col === 0 && row > 0) {
          targetRow = row - 1;
          targetCol = maxCols - 1;
          handled = true;
        } else if (col > 0) {
          targetCol = col - 1;
          handled = true;
        }
      } else {
        if (col === maxCols - 1) {
          if (row === maxRows - 1) {
            if (addRowFn) {
              e.preventDefault();
              addRowFn();
              setTimeout(() => {
                const nextInput = tbodyElement.querySelector(`input[data-row="${row + 1}"][data-col="0"]`);
                if (nextInput) { nextInput.focus(); nextInput.select(); }
              }, 20);
              return;
            }
          } else {
            targetRow = row + 1;
            targetCol = 0;
            handled = true;
          }
        } else {
          targetCol = col + 1;
          handled = true;
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (enterAction === 'right') {
        if (col === maxCols - 1) {
          if (row === maxRows - 1) {
            if (addRowFn) {
              addRowFn();
              setTimeout(() => {
                const nextInput = tbodyElement.querySelector(`input[data-row="${row + 1}"][data-col="0"]`);
                if (nextInput) { nextInput.focus(); nextInput.select(); }
              }, 20);
              return;
            }
          } else {
            targetRow = row + 1;
            targetCol = 0;
            handled = true;
          }
        } else {
          targetCol = col + 1;
          handled = true;
        }
      } else { // enterAction === 'down'
        if (row === maxRows - 1) {
          if (addRowFn) {
            addRowFn();
            setTimeout(() => {
              const nextInput = tbodyElement.querySelector(`input[data-row="${row + 1}"][data-col="${col}"]`);
              if (nextInput) { nextInput.focus(); nextInput.select(); }
            }, 20);
            return;
          }
        } else {
          targetRow = row + 1;
          handled = true;
        }
      }
    }

    if (handled) {
      e.preventDefault();
      // Skip disabled inputs
      const findEnabledInput = (r, c, dirRow, dirCol) => {
        const inp = tbodyElement.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
        if (inp && !inp.disabled) return inp;
        let nextR = r + dirRow;
        let nextC = c + dirCol;
        if (nextR >= 0 && nextR < maxRows && nextC >= 0 && nextC < maxCols) {
          return findEnabledInput(nextR, nextC, dirRow, dirCol);
        }
        return null;
      };

      const dirRow = targetRow - row;
      const dirCol = targetCol - col;
      const nextInput = findEnabledInput(targetRow, targetCol, dirRow, dirCol) || tbodyElement.querySelector(`input[data-row="${targetRow}"][data-col="${targetCol}"]`);
      if (nextInput && !nextInput.disabled) {
        nextInput.focus();
        nextInput.select();
      }
    }
  });
}

window.setupGridExcelCopyPaste = setupGridExcelCopyPaste;
window.setupSpreadsheetKeyboardNavigation = setupSpreadsheetKeyboardNavigation;

