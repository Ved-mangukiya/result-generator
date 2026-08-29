'use strict';
/**
 * feesPdfService.js — Puppeteer-based PDF generator for fee ledgers and receipts
 */
const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');
const { db }    = require('../db/database');

const EXPORT_DIR = path.join(__dirname, '../../exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCoaching() {
  return db.prepare('SELECT * FROM coaching_profile').get() || {};
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dtStr) {
  if (!dtStr) return '—';
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return dtStr;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function rupee(n) {
  const num = parseFloat(n) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function imageToBase64(relPath) {
  if (!relPath) return null;
  const full = path.join(__dirname, '../../', relPath);
  if (!fs.existsSync(full)) return null;
  const ext = path.extname(full).toLowerCase().replace('.', '');
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const data = fs.readFileSync(full).toString('base64');
  return `data:${mime};base64,${data}`;
}

// ── Shared HTML header for all PDF types ─────────────────────────────────────

function buildHtmlShell(title, bodyHtml, printStyles = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;700;900&display=swap');
    @page { size: A4 portrait; margin: 0; }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
    html, body {
      width: 210mm;
      height: 297mm;
      max-width: 210mm;
      max-height: 297mm;
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
      font-size: 12.5px;
      color: #1B2A4A;
      background: #ffffff;
      line-height: 1.45;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      height: 297mm;
      max-width: 210mm;
      max-height: 297mm;
      padding: 12mm 15mm;
      background: white;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .page:last-child { page-break-after: auto; }
    .page-break{page-break-after:always;}
    .serif{font-family:'Playfair Display',serif;}
    ${printStyles}
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

// ── Individual Fee Ledger HTML ────────────────────────────────────────────────

function buildFeeLedgerHtml(studentId) {
  const student = db.prepare(`
    SELECT s.*, st.display_name as class_name
    FROM students s JOIN standards st ON s.standard_id = st.id WHERE s.id = ?
  `).get(studentId);
  if (!student) throw new Error('Student not found');

  const payments = db.prepare(`
    SELECT * FROM fee_payments WHERE student_id = ? ORDER BY payment_date ASC, id ASC
  `).all(studentId);

  const coaching = getCoaching();
  const logoB64 = imageToBase64(coaching.logo_path);
  const totalFees  = parseFloat(student.total_fees) || 0;
  const paidFees   = parseFloat(student.paid_fees) || 0;
  const outstanding = Math.max(0, totalFees - paidFees);
  const paidPct    = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0;

  // Payment status
  let statusLabel = 'Unpaid';
  let statusColor = '#b03025';
  if (paidFees >= totalFees && totalFees > 0) { statusLabel = 'Fully Paid'; statusColor = '#2d7a55'; }
  else if (paidFees > 0) { statusLabel = 'Partially Paid'; statusColor = '#9a7228'; }

  // Build rows
  let runningBal = totalFees;
  const paymentRows = payments.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:rgba(27,42,74,0.42);padding:24px;">No payments recorded yet</td></tr>`
    : payments.map((p, i) => {
        runningBal -= parseFloat(p.amount) || 0;
        const rb = Math.max(0, runningBal);
        return `
          <tr style="background:${i % 2 === 0 ? 'white' : '#FDFAF4'};">
            <td style="padding:8px 10px;">${i + 1}</td>
            <td style="padding:8px 10px; font-weight:500;">${formatDate(p.payment_date)}</td>
            <td style="padding:8px 10px;">${p.payment_method || '—'}</td>
            <td style="padding:8px 10px; font-weight:700; color:#2d7a55;">${rupee(p.amount)}</td>
            <td style="padding:8px 10px; font-size:11px; color:rgba(27,42,74,0.55);">${p.remarks || '—'}</td>
            <td style="padding:8px 10px; font-weight:600;">${rupee(rb)}</td>
          </tr>`;
      }).join('');

  const now = new Date();
  const generated = now.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return `
    <div class="page page-break">
      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2.5px solid #C9A96E;padding-bottom:14px;margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:14px;">
          ${logoB64 ? `<img src="${logoB64}" alt="Logo" style="height:56px;width:56px;object-fit:contain;border-radius:6px;">` : `<div style="width:56px;height:56px;border-radius:8px;background:linear-gradient(135deg,#1B2A4A,#243357);display:flex;align-items:center;justify-content:center;"><svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M20 6L34 14V22L20 30L6 22V14Z" fill="#C9A96E" opacity="0.85"/><path d="M20 6L34 14L20 22L6 14Z" fill="#E2C98A"/></svg></div>`}
          <div>
            <div class="serif" style="font-size:18px;font-weight:900;color:#1B2A4A;">${coaching.name || 'Coaching Institute'}</div>
            ${coaching.tagline ? `<div style="font-size:10.5px;color:#8A96B0;margin-top:2px;">${coaching.tagline}</div>` : ''}
            ${coaching.address ? `<div style="font-size:10px;color:#8A96B0;margin-top:1px;">${coaching.address}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px;font-weight:800;color:#1B2A4A;letter-spacing:-0.5px;">FEE LEDGER</div>
          <div style="font-size:10px;color:#8A96B0;margin-top:3px;">Generated: ${generated}</div>
        </div>
      </div>

      <!-- Student Info Card -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:#FDFAF4;border:1px solid rgba(201,169,110,0.28);border-radius:10px;padding:12px;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(27,42,74,0.45);margin-bottom:4px;">Student Name</div>
          <div style="font-weight:700;font-size:13.5px;color:#1B2A4A;">${student.name}</div>
        </div>
        <div style="background:#FDFAF4;border:1px solid rgba(201,169,110,0.28);border-radius:10px;padding:12px;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(27,42,74,0.45);margin-bottom:4px;">Roll No · Class</div>
          <div style="font-weight:700;font-size:13.5px;color:#1B2A4A;">${student.roll_number || '—'} · ${student.class_name || '—'}</div>
        </div>
        <div style="background:#FDFAF4;border:1px solid rgba(201,169,110,0.28);border-radius:10px;padding:12px;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(27,42,74,0.45);margin-bottom:4px;">Payment Status</div>
          <div style="font-weight:800;font-size:13.5px;color:${statusColor};">${statusLabel}</div>
        </div>
      </div>

      <!-- Fee Summary Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:22px;">
        <div style="background:#1B2A4A;border-radius:10px;padding:14px;color:white;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.6;margin-bottom:4px;">Total Fees</div>
          <div style="font-size:18px;font-weight:800;letter-spacing:-0.5px;">${rupee(totalFees)}</div>
        </div>
        <div style="background:#2d7a55;border-radius:10px;padding:14px;color:white;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.6;margin-bottom:4px;">Amount Paid</div>
          <div style="font-size:18px;font-weight:800;letter-spacing:-0.5px;">${rupee(paidFees)}</div>
        </div>
        <div style="background:${outstanding > 0 ? '#b03025' : '#0f4c2e'};border-radius:10px;padding:14px;color:white;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.6;margin-bottom:4px;">Outstanding</div>
          <div style="font-size:18px;font-weight:800;letter-spacing:-0.5px;">${rupee(outstanding)}</div>
        </div>
      </div>

      <!-- Progress bar -->
      <div style="margin-bottom:22px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(27,42,74,0.5);margin-bottom:5px;">
          <span>Payment Progress</span>
          <span>${paidPct}% Paid</span>
        </div>
        <div style="height:8px;background:rgba(27,42,74,0.08);border-radius:9999px;overflow:hidden;">
          <div style="height:100%;width:${paidPct}%;background:linear-gradient(90deg,#2d7a55,#3D9970);border-radius:9999px;"></div>
        </div>
      </div>

      <!-- Payments Table -->
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(27,42,74,0.45);margin-bottom:10px;">Transaction History (${payments.length} Payments)</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid rgba(201,169,110,0.22);border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#1B2A4A;color:white;">
              <th style="padding:9px 10px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.04em;">#</th>
              <th style="padding:9px 10px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.04em;">Date</th>
              <th style="padding:9px 10px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.04em;">Method</th>
              <th style="padding:9px 10px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.04em;">Amount</th>
              <th style="padding:9px 10px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.04em;">Remarks</th>
              <th style="padding:9px 10px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.04em;">Balance After</th>
            </tr>
          </thead>
          <tbody>${paymentRows}</tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="position:absolute;bottom:18mm;left:18mm;right:18mm;border-top:1px solid rgba(201,169,110,0.3);padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:10px;color:rgba(27,42,74,0.42);">
          ${coaching.phone ? `Tel: ${coaching.phone}` : ''} ${coaching.email ? `· ${coaching.email}` : ''}
        </div>
        <div style="font-size:10px;color:rgba(27,42,74,0.42);">
          This is a computer-generated fee ledger. No signature required.
        </div>
      </div>
    </div>`;
}

// ── Payment Receipt HTML ──────────────────────────────────────────────────────

function buildReceiptHtml(paymentId) {
  const payment = db.prepare('SELECT * FROM fee_payments WHERE id = ?').get(paymentId);
  if (!payment) throw new Error('Payment not found');

  const student = db.prepare(`
    SELECT s.*, st.display_name as class_name
    FROM students s JOIN standards st ON s.standard_id = st.id WHERE s.id = ?
  `).get(payment.student_id);
  if (!student) throw new Error('Student not found');

  const coaching = getCoaching();
  const logoB64 = imageToBase64(coaching.logo_path);

  const totalFees  = parseFloat(student.total_fees) || 0;
  const paidFees   = parseFloat(student.paid_fees) || 0;
  const outstanding = Math.max(0, totalFees - paidFees);

  const receiptNo = `RCT-${String(paymentId).padStart(6, '0')}`;
  const now = new Date();
  const printedOn = now.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return `
    <div class="page" style="max-width:148mm;min-height:105mm;padding:14mm;margin:auto;">
      <!-- Decorative border -->
      <div style="border:2px solid #C9A96E;border-radius:14px;padding:18px;min-height:80mm;position:relative;">
        <div style="position:absolute;top:6px;right:10px;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(201,169,110,0.6);">ORIGINAL</div>
        
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(201,169,110,0.3);">
          <div style="display:flex;align-items:center;gap:10px;">
            ${logoB64 ? `<img src="${logoB64}" alt="Logo" style="height:38px;object-fit:contain;">` : ''}
            <div>
              <div class="serif" style="font-size:14px;font-weight:900;color:#1B2A4A;">${coaching.name || 'Coaching Institute'}</div>
              ${coaching.address ? `<div style="font-size:9px;color:#8A96B0;">${coaching.address}</div>` : ''}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px;font-weight:800;color:#1B2A4A;">FEE RECEIPT</div>
            <div style="font-size:9px;color:#8A96B0;">Receipt No: <strong>${receiptNo}</strong></div>
          </div>
        </div>

        <!-- Student row -->
        <div style="display:grid;grid-template-columns:1fr auto;gap:14px;margin-bottom:14px;">
          <div>
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(27,42,74,0.45);">Student Name</div>
            <div style="font-weight:700;font-size:13px;">${student.name}</div>
            <div style="font-size:10px;color:rgba(27,42,74,0.55);">Roll ${student.roll_number || '—'} · ${student.class_name || '—'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(27,42,74,0.45);">Payment Date</div>
            <div style="font-weight:600;font-size:12px;">${formatDate(payment.payment_date)}</div>
          </div>
        </div>

        <!-- Amount highlight -->
        <div style="background:#1B2A4A;border-radius:10px;padding:14px;text-align:center;margin-bottom:14px;color:white;">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.6;margin-bottom:4px;">Amount Received</div>
          <div style="font-size:28px;font-weight:900;letter-spacing:-1px;">${rupee(payment.amount)}</div>
          <div style="font-size:10px;opacity:0.6;margin-top:3px;">via ${payment.payment_method || '—'}</div>
        </div>

        <!-- Balance row -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
          <div style="text-align:center;padding:8px;background:#FDFAF4;border-radius:8px;border:1px solid rgba(201,169,110,0.2);">
            <div style="font-size:9px;color:rgba(27,42,74,0.45);font-weight:600;text-transform:uppercase;">Total Fees</div>
            <div style="font-weight:700;font-size:11px;">${rupee(totalFees)}</div>
          </div>
          <div style="text-align:center;padding:8px;background:#FDFAF4;border-radius:8px;border:1px solid rgba(201,169,110,0.2);">
            <div style="font-size:9px;color:#2d7a55;font-weight:600;text-transform:uppercase;">Paid So Far</div>
            <div style="font-weight:700;font-size:11px;color:#2d7a55;">${rupee(paidFees)}</div>
          </div>
          <div style="text-align:center;padding:8px;background:#FDFAF4;border-radius:8px;border:1px solid rgba(201,169,110,0.2);">
            <div style="font-size:9px;color:${outstanding > 0 ? '#b03025' : '#2d7a55'};font-weight:600;text-transform:uppercase;">Outstanding</div>
            <div style="font-weight:700;font-size:11px;color:${outstanding > 0 ? '#b03025' : '#2d7a55'};">${rupee(outstanding)}</div>
          </div>
        </div>

        ${payment.remarks ? `<div style="font-size:10px;color:rgba(27,42,74,0.5);margin-bottom:10px;">Remarks: ${payment.remarks}</div>` : ''}

        <!-- Footer -->
        <div style="border-top:1px solid rgba(201,169,110,0.3);padding-top:8px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:9px;color:rgba(27,42,74,0.38);">Printed: ${printedOn}</div>
          <div style="font-size:9px;color:rgba(27,42,74,0.38);">This is a computer-generated receipt.</div>
        </div>
      </div>
    </div>`;
}

// ── Bulk Ledger HTML (one page per student) ───────────────────────────────────

function buildBulkLedgerHtml(standardId) {
  const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(standardId);
  if (!standard) throw new Error('Standard not found');

  const students = db.prepare(`
    SELECT * FROM students WHERE standard_id = ? ORDER BY CAST(roll_number AS INTEGER) ASC, roll_number ASC
  `).all(standardId);

  if (students.length === 0) throw new Error('No students found in this class');

  const coaching = getCoaching();
  const logoB64 = imageToBase64(coaching.logo_path);
  const now = new Date();
  const generated = now.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  // Build summary page
  let totalExpected = 0, totalCollected = 0;
  const summaryRows = students.map((s, i) => {
    const payments = db.prepare('SELECT * FROM fee_payments WHERE student_id = ? ORDER BY payment_date ASC').all(s.id);
    const tf = parseFloat(s.total_fees) || 0;
    const pf = parseFloat(s.paid_fees) || 0;
    const out = Math.max(0, tf - pf);
    totalExpected += tf;
    totalCollected += pf;
    let statusColor = '#b03025';
    if (pf >= tf && tf > 0) statusColor = '#2d7a55';
    else if (pf > 0) statusColor = '#9a7228';
    return `
      <tr style="background:${i % 2 === 0 ? 'white' : '#FDFAF4'}">
        <td style="padding:6px 8px;">${s.roll_number || '—'}</td>
        <td style="padding:6px 8px;font-weight:600;">${s.name}</td>
        <td style="padding:6px 8px;">${rupee(tf)}</td>
        <td style="padding:6px 8px;color:#2d7a55;font-weight:600;">${rupee(pf)}</td>
        <td style="padding:6px 8px;color:${out > 0 ? '#b03025' : '#2d7a55'};font-weight:600;">${rupee(out)}</td>
        <td style="padding:6px 8px;"><span style="color:${statusColor};font-weight:700;font-size:10px;">${pf >= tf && tf > 0 ? 'PAID' : pf > 0 ? 'PARTIAL' : 'UNPAID'}</span></td>
      </tr>`;
  }).join('');

  const summaryPage = `
    <div class="page page-break">
      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2.5px solid #C9A96E;padding-bottom:14px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:14px;">
          ${logoB64 ? `<img src="${logoB64}" alt="Logo" style="height:52px;object-fit:contain;">` : ''}
          <div>
            <div class="serif" style="font-size:17px;font-weight:900;color:#1B2A4A;">${coaching.name || 'Coaching Institute'}</div>
            ${coaching.address ? `<div style="font-size:10px;color:#8A96B0;">${coaching.address}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;font-weight:800;color:#1B2A4A;">CLASS FEE SUMMARY</div>
          <div style="font-size:11px;font-weight:700;color:rgba(27,42,74,0.7);">${standard.display_name}</div>
          <div style="font-size:9.5px;color:#8A96B0;">Generated: ${generated}</div>
        </div>
      </div>

      <!-- Totals -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:#1B2A4A;border-radius:10px;padding:14px;color:white;">
          <div style="font-size:9px;opacity:0.6;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Total Expected</div>
          <div style="font-size:20px;font-weight:800;">${rupee(totalExpected)}</div>
        </div>
        <div style="background:#2d7a55;border-radius:10px;padding:14px;color:white;">
          <div style="font-size:9px;opacity:0.6;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Total Collected</div>
          <div style="font-size:20px;font-weight:800;">${rupee(totalCollected)}</div>
        </div>
        <div style="background:${totalExpected - totalCollected > 0 ? '#b03025' : '#0f4c2e'};border-radius:10px;padding:14px;color:white;">
          <div style="font-size:9px;opacity:0.6;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Total Outstanding</div>
          <div style="font-size:20px;font-weight:800;">${rupee(Math.max(0, totalExpected - totalCollected))}</div>
        </div>
      </div>

      <!-- Summary Table -->
      <table style="width:100%;border-collapse:collapse;border:1px solid rgba(201,169,110,0.22);">
        <thead>
          <tr style="background:#1B2A4A;color:white;">
            <th style="padding:9px 8px;text-align:left;font-size:10.5px;font-weight:700;">Roll</th>
            <th style="padding:9px 8px;text-align:left;font-size:10.5px;font-weight:700;">Student Name</th>
            <th style="padding:9px 8px;text-align:left;font-size:10.5px;font-weight:700;">Total Fees</th>
            <th style="padding:9px 8px;text-align:left;font-size:10.5px;font-weight:700;">Paid</th>
            <th style="padding:9px 8px;text-align:left;font-size:10.5px;font-weight:700;">Outstanding</th>
            <th style="padding:9px 8px;text-align:left;font-size:10.5px;font-weight:700;">Status</th>
          </tr>
        </thead>
        <tbody>${summaryRows}</tbody>
      </table>
    </div>`;

  // Individual pages
  const studentPages = students.map(s => buildFeeLedgerHtml(s.id)).join('\n');

  return summaryPage + '\n' + studentPages;
}

// ── PDF Generator wrapper ─────────────────────────────────────────────────────

async function withBrowser(htmlContent, pdfOptions = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions'
      ],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      ...pdfOptions
    });
    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

async function generateStudentLedgerPDF(studentId) {
  const bodyHtml = buildFeeLedgerHtml(studentId);
  const html = buildHtmlShell('Fee Ledger', bodyHtml);
  const filename = `ledger_${studentId}_${Date.now()}.pdf`;
  const outputPath = path.join(EXPORT_DIR, filename);
  const buf = await withBrowser(html);
  fs.writeFileSync(outputPath, buf);
  return { filename, outputPath };
}

async function generatePaymentReceiptPDF(paymentId) {
  const bodyHtml = buildReceiptHtml(paymentId);
  const html = buildHtmlShell('Fee Receipt', bodyHtml, `
    @page { size: A5 landscape; margin: 0; }
    html, body { width: 210mm !important; height: 148mm !important; max-height: 148mm !important; overflow: hidden !important; }
    .page { width: 210mm !important; height: 148mm !important; max-height: 148mm !important; padding: 8mm 12mm !important; overflow: hidden !important; }
  `);
  const filename = `receipt_${paymentId}_${Date.now()}.pdf`;
  const outputPath = path.join(EXPORT_DIR, filename);
  const buf = await withBrowser(html, { format: 'A5', landscape: true });
  fs.writeFileSync(outputPath, buf);
  return { filename, outputPath };
}

async function generateBulkLedgerPDF(standardId) {
  const bodyHtml = buildBulkLedgerHtml(standardId);
  const html = buildHtmlShell('Class Fee Ledger', bodyHtml);
  const filename = `bulk_ledger_${standardId}_${Date.now()}.pdf`;
  const outputPath = path.join(EXPORT_DIR, filename);
  const buf = await withBrowser(html);
  fs.writeFileSync(outputPath, buf);
  return { filename, outputPath };
}

module.exports = {
  generateStudentLedgerPDF,
  generatePaymentReceiptPDF,
  generateBulkLedgerPDF,
};
