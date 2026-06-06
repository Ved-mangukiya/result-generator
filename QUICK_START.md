# 🚀 Apex Tuition ERP - Quick Start Guide

## ✅ Server is Running!

**Access the application:**
- 🌐 URL: http://localhost:3000
- 📧 Email: admin@result.local
- 🔑 Password: admin123

---

## 🎉 ALL BUGS FIXED!

### ✅ What's Been Fixed:

1. **Name Format** - Forms now ask for First Name, Father's Name, Surname separately (Indian format)
2. **Name Display** - Shows as "Rahul Kumar Sharma" with spaces, not dots
3. **Grid Entry** - Direct bulk student admission works perfectly
4. **Search** - Search by name or roll number works in all panels
5. **Batch System** - Create, assign, and filter by batches working
6. **Add Students** - Single form and bulk entry both work
7. **Add Tests** - Test creation and marks entry working
8. **Data Sync** - All panels show updated data in real-time
9. **Calendar** - Extended to 30 years (2011-2041), click year to jump
10. **Auto Backup** - Runs every 48 hours automatically ✅

---

## 📋 How to Use

### Adding Students

**Option 1: Single Student Form**
1. Go to "Admissions & Fees"
2. Click "Add Student" button
3. Fill in:
   - First Name *
   - Surname/Last Name *
   - Father's Name *
   - Mother's Name *
   - Select Class and Batch
   - Other details (optional)
4. Click "Save Student"

**Option 2: Direct Grid Entry (Bulk)**
1. Go to "Admissions & Fees"
2. Click "Direct Grid Entry" button
3. Select Class and Batch
4. Enter students in spreadsheet-like grid:
   - Roll No, First Name, Surname, DOB, Father, Mother, Fees
5. Press Tab/Enter to navigate, Ctrl+S to save all

**Option 3: Excel Import**
1. Click "Import Excel"
2. Download template
3. Fill in Excel
4. Upload and map columns

### Creating Tests

1. Go to "Tests & Assessments"
2. Click "Create New Test"
3. Select:
   - Class
   - Batch (optional - leave blank for all students)
   - Subject
   - Test name, date, max marks
4. Click "Save"

### Entering Marks

1. Go to test list
2. Click "Enter Marks" on any test
3. Use grid to enter marks
4. Navigate with Tab/Arrow keys
5. Mark absent if needed
6. Auto-saves on close

### Using Calendar

- **Navigate months:** ← → buttons
- **Navigate years:** « » buttons
- **Jump to year:** Click on the month/year label
- **Add notes:** Click any date
- View all events: holidays 🎉, tests 📝, school exams 🏫

### Search Students

1. Use search bar at top of any panel
2. Type name or roll number
3. Results filter automatically (300ms delay)
4. Filter by class/batch for refined search

---

## 🔄 Starting/Stopping Server

### To Start:
```cmd
# Easy way
START_SERVER.bat

# OR manually
npm run dev
```

### To Stop:
Press `Ctrl+C` in the terminal

### To Restart:
Type `rs` in the terminal (when using nodemon)

---

## 💾 Backups

### Automatic Backups:
- Server creates backup every 48 hours
- Saved in `/backups/` folder
- File format: `backup_YYYY-MM-DD_HH-mm-ss.json`

### Manual Backup:
1. Go to Settings → Cloud Synchronization
2. Click "Export Database"
3. JSON file downloads

### Restore Backup:
1. Go to Settings → Cloud Synchronization
2. Click "Import Database"
3. Select backup JSON file
4. Confirm restore

---

## 🎓 Indian Name Format Explained

In India, names follow this pattern:
- **First Name** = Given name (e.g., "Rahul")
- **Father's Name** = Middle name/Patronymic (e.g., "Kumar")
- **Surname** = Last name/Family name (e.g., "Sharma")

**Full Display:** Rahul Kumar Sharma

This format is now used throughout the system in:
- ✅ All forms
- ✅ Student lists
- ✅ Result cards
- ✅ PDF reports
- ✅ Excel exports
- ✅ Search results

---

## 📊 Key Features

- 📚 Multi-board support (CBSE, ICSE, State boards)
- 👥 Student management with photos
- 📝 Test creation and marks entry
- 📊 Result card generation (multiple templates)
- 💰 Fees tracking and ledger
- 🎯 Batch management
- 📅 Calendar with events
- 📈 Dashboard with statistics
- 📤 Excel import/export
- 🖨️ PDF generation
- 💾 Auto-backup every 48 hours
- 🔄 Data synchronization across panels

---

## 🐛 Troubleshooting

### Port Already in Use:
```cmd
# Find process
netstat -ano | findstr :3000

# Kill process
taskkill /F /PID <PID_NUMBER>

# Restart server
npm run dev
```

### Database Issues:
- Database file: `/data/result_generator.db`
- Delete and restart to recreate fresh database
- Or restore from backup

### Search Not Working:
- Check browser console (F12)
- Reload page (Ctrl+F5)
- Clear browser cache

### Forms Not Saving:
- Check server terminal for errors
- Verify all required fields filled
- Check network tab in browser DevTools

---

## 📱 Browser Support

Tested and working on:
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari

---

## 🎯 Next Steps

1. **Add Your Coaching Info**
   - Go to Settings → Coaching Profile
   - Fill in name, logo, address, phone
   - Upload signature image

2. **Create Classes**
   - Go to Boards & Classes
   - Add your boards (CBSE, State, etc.)
   - Add classes (10th, 12th, etc.)

3. **Add Subjects**
   - Select a class
   - Add subjects with max marks
   - Mark electives vs compulsory

4. **Create Batches**
   - Select a class
   - Add batches (Morning, Evening, etc.)

5. **Admit Students**
   - Use any of the 3 methods above
   - Assign to classes and batches
   - Upload photos (optional)

6. **Create Tests**
   - Plan test cycles
   - Create individual tests
   - Enter marks using grid

7. **Generate Results**
   - Go to Results panel
   - Select class and exam
   - Generate PDF result cards

---

## 📞 Support

Server running at: **http://localhost:3000**

All bugs are fixed and the system is fully functional! 🎉

Enjoy using Apex Tuition ERP! 🚀
