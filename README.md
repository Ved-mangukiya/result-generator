# 🏆 Apex Tuition ERP — Enterprise Edition

An enterprise-grade, high-performance coaching institute management ERP designed for modern, scaling private tuition academies, schools, and test prep centers in India.

Apex Tuition ERP provides a complete, local-first administration platform to manage student lifecycles, automate billing & fee ledgers, schedule test rounds, and compile professional, print-ready reports with zero latency.

---

## ✨ Enterprise Features

### 💻 1. Spreadsheet-Style Rapid Grid Entry
- **Excel Keyboard Navigation**: Arrow keys, Tab, Shift-Tab, and custom Enter actions (Down/Right jumps) for maximum data-entry efficiency.
- **Direct Clipboard Integration**: Copy columns/rows directly from Excel or Google Sheets and paste them directly into the Admissions, Test Marks, or Timetable grids to auto-append rows and populate fields.

### 💰 2. Complete Tuition Fee Ledger & Revenue Analytics
- **Balance Tracking**: Real-time expectation, collection, and outstanding metrics calculated dynamically per class.
- **Transaction History**: Audit logs for partial payments, cash receipts, and direct billing histories.
- **Bulk PDF Ledger Generator**: Print or download individual student ledgers or generate a combined class fee book in one click.

### 📊 3. Auto-Grading & Dynamic Result Card Engine
- **Multi-Board Configurations**: Support for CBSE, ICSE, State Boards (MSBSHSE, GSEB, RBSE) pre-configured with correct grading rubrics.
- **Subject Matrix**: Compulsory and elective subject management with split theory/practical caps.
- **A4 Layout Templates**: High-resolution, print-ready PDF sheets featuring automatic percentile calculations, ranks, class topper charts, signatures, and logos.

### 🏛️ 4. Batch & Stream Management
- **Curriculum Control**: Multi-stream structure (1st to 12th, HSC Science PCM/PCB, Commerce, Arts) tailored for the Indian coaching framework.
- **Batch Isolation**: Separate morning, evening, or weekend batches to handle schedule overlaps.

### 🔒 5. Hardened Security & Session Controls
- **Manual Credentials Management**: Designed for commercial sales. No open signup flows; users are provisioned manually by the system administrator to maintain strict licensing control.
- **Cookie-Based Sessions**: Secure, long-lived sessions (7-day duration) to prevent frequent logouts during busy hours.

### 💾 6. Automated Backup & Disaster Recovery
- **Automatic Sync**: Local state backup runs in the background every 48 hours to ensure zero data loss.
- **Manual Export/Import**: One-click JSON data dumps to move institute database configurations between servers.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: Clean Vanilla HTML5, premium CSS variables layout, glassmorphic styling, and native ESM JavaScript (Zero external framework bloat).
- **Backend**: Node.js & Express.js.
- **Database**: High-concurrency SQLite3 relational engine.
- **Report Engine**: Headless Chrome (via Puppeteer) for pixel-perfect PDF rendering.
- **Excel Parser**: SheetJS (`xlsx`) column-mapping engine.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** v18.0.0 or higher
- **NPM** v9.0.0 or higher

### Installation & Initialization
1. Clone the project or extract the commercial bundle:
   ```bash
   cd Apex-Tuition-ERP
   ```
2. Install production dependencies:
   ```bash
   npm install
   ```
3. Initialize/seed default configuration values:
   ```bash
   npm run seed
   ```
4. Start the server in production/development:
   ```bash
   # Start the production environment
   npm start
   
   # Start the development server (with nodemon)
   npm run dev
   ```

### Default Credentials
- **Access URL**: `http://localhost:3000`
- **Default Username**: `admin@result.local`
- **Default Password**: `admin123`
*(Note: Change these immediately inside **Settings → Change Password** after first login).*

---

## 📋 Distribution & Deployment Note
This software is licensed under a **Proprietary Commercial License**. All code is obfuscated/minified during compilation for distribution. No self-registration is exposed to end-users. Access is restricted to pre-provisioned administrator profiles created manually.

For branding and white-labeling requests, configure the Coaching Profile in the **Settings** panel, where you can modify the organization name, address, tax registration, and upload digital signatures/logos.

---

*Developed and Maintained by **Apex Softwares**. All Rights Reserved.*
