# 🚀 Apex Tuition ERP — Getting Started Guide

Welcome to **Apex Tuition ERP**, the premier administration and academic management platform. Follow this guide to set up, launch, and operate the platform for your coaching institute.

---

## 🔑 Default Connection Details

Once the server is running, the platform can be accessed locally:
- 🌐 **Access URL**: `http://localhost:3000`
- 📧 **Admin Username**: `admin@result.local`
- 🔑 **Admin Password**: `admin123`

*Note: For security reasons, please change your default credentials under **Settings → Change Password** immediately after your first sign-in.*

---

## 📋 Standard Workflows & Operations

### 1. Enrolling Students
There are three highly flexible options to onboard students:

- **Option 1: Single Student Profile Form**
  1. Navigate to **Admissions & Fees** in the sidebar.
  2. Click **Add Student**.
  3. Fill in the standard Indian name fields (First Name, Father's Name, Surname) and map them to their corresponding board, class, and batch.
  4. Save the profile.

- **Option 2: Direct Grid Entry (Spreadsheet Input)**
  1. Click **Direct Grid Entry** from the top actions bar.
  2. Select the Target Class and Batch.
  3. Enter student data in the spreadsheet-like grid.
  4. Navigate seamlessly using the arrow keys, Tab, or Enter.
  5. Use `Ctrl + S` to save all entries instantly.

- **Option 3: Bulk Excel Template Import**
  1. Click **Import Excel** in the sidebar.
  2. Download the standard `.xlsx` template.
  3. Populate the spreadsheet with student credentials.
  4. Upload and verify standard data mappings.

---

### 2. Creating Assessments & Entering Marks
1. Go to **Test Scheduler** in the sidebar.
2. Click **Create New Test**, specify the Class, Subject, Date, and Max Marks, and save.
3. Select **Enter Marks** on the active test card.
4. Input scores in the **Rapid Marks Grid**. Use keyboard shortcuts to jump across columns, and toggle attendance states instantly.
5. Hit save to calculate averages and toppers automatically.

---

### 3. Fee Collection & Ledgers
1. Go to **Admissions & Fees** and click the **Fees & Ledger** tab.
2. Choose a class from the dropdown to review expected vs collected balances.
3. Click **Record Payment** to log cash/digital receipts.
4. Download or print professional PDF receipts or bulk class ledger books.

---

### 4. Interactive Operations Calendar
- **Event Scheduling**: Click on any date to add notices, exam dates, or holidays.
- **AI Sync**: Coaching prep tests will automatically align with upcoming school exams entered in the calendar.
- **Year Jump**: Easily navigate decades by clicking on the month/year header.

---

## 💾 Backups & Data Protection

- **Automated Replications**: The system automatically triggers a backup of the SQLite database configuration every 48 hours to the `/backups/` directory.
- **Manual Data Dumps**: In **Settings → Cloud Synchronization**, click **Export Database** to download a single JSON backup. To restore on another server, click **Import Database** and upload the JSON file.

---

## 🔧 Operational Configuration

### Port Already in Use (Conflict Fix):
If port 3000 is occupied by another process, execute this command in PowerShell or Command Prompt (Admin) to release it:
```cmd
# Find the Process ID (PID)
netstat -ano | findstr :3000

# Terminate the process
taskkill /F /PID <PID_NUMBER>
```

---

*For license extensions and custom feature requests, contact **Apex Softwares Support**.*
