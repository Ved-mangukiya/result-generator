const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');

const { initializeDatabase } = require('./db/database');
const authRoutes = require('./routes/auth');
const coachingRoutes = require('./routes/coaching');
const boardsRoutes = require('./routes/boards');
const standardsRoutes = require('./routes/standards');
const subjectsRoutes = require('./routes/subjects');
const studentsRoutes = require('./routes/students');
const exportRoutes = require('./routes/export');
const importRoutes = require('./routes/import');
const { router: uploadRoutes } = require('./routes/upload');
const testsRoutes = require('./routes/tests');
const feesRoutes = require('./routes/fees');
const testCyclesRoutes = require('./routes/testCycles');
const resetRoutes = require('./routes/reset');
const schoolExamsRoutes = require('./routes/schoolExams');
const syncRoutes = require('./routes/sync');
const promotionsRoutes = require('./routes/promotions');
const batchesRoutes = require('./routes/batches');
const tokenService = require('./services/tokenService');
const calendarNotesRoutes = require('./routes/calendarNotes');

const app = express();
const PORT = process.env.PORT || 3000;

// Create required directories
const dirs = ['uploads', 'uploads/logos', 'uploads/photos', 'uploads/imports', 'exports', 'data'];
dirs.forEach(dir => {
  const full = path.join(__dirname, '..', dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// Initialize database
initializeDatabase();

// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: 'result-generator-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set true with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
// Intercept requests for missing photos/thumbnails and fallback to original
app.get('/uploads/photos/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/photos', filename);
  
  if (fs.existsSync(filePath)) {
    return next(); // Let static middleware serve it
  }
  
  // If it's a thumbnail request and thumbnail is missing, look for the original
  if (filename.includes('_thumb.jpg')) {
    const originalBase = filename.replace('_thumb.jpg', '');
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.PNG', '.JPG', '.JPEG'];
    for (const ext of allowedExts) {
      const origPath = path.join(__dirname, '../uploads/photos', originalBase + ext);
      if (fs.existsSync(origPath)) {
        return res.sendFile(origPath);
      }
    }
  }
  
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/exports', express.static(path.join(__dirname, '../exports')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Auth middleware for API routes
function requireAuth(req, res, next) {
  const token = req.query.token;
  if (token && tokenService.verifyToken(token)) {
    return next();
  }
  if (!req.session.adminId) return res.status(401).json({ error: 'Authentication required' });
  next();
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/coaching', requireAuth, coachingRoutes);
app.use('/api/boards', requireAuth, boardsRoutes);
app.use('/api/standards', requireAuth, standardsRoutes);
app.use('/api/subjects', requireAuth, subjectsRoutes);
app.use('/api/students', requireAuth, studentsRoutes);
app.use('/api/export', requireAuth, exportRoutes);
app.use('/api/import', requireAuth, importRoutes);
app.use('/api/upload', requireAuth, uploadRoutes);
app.use('/api/tests', requireAuth, testsRoutes);
app.use('/api/fees', requireAuth, feesRoutes);
app.use('/api/test-cycles', requireAuth, testCyclesRoutes);
app.use('/api/reset', requireAuth, resetRoutes);
app.use('/api/school-exams', requireAuth, schoolExamsRoutes);
app.use('/api/sync', requireAuth, syncRoutes);
app.use('/api/promotions', requireAuth, promotionsRoutes);
app.use('/api/batches', requireAuth, batchesRoutes);
app.use('/api/calendar-notes', requireAuth, calendarNotesRoutes);

// Dashboard stats
app.get('/api/dashboard', requireAuth, (req, res) => {
  const { db } = require('./db/database');
  const { calculateStudentResult, calculateRanks } = require('./services/gradeService');

  const totalBoards = db.prepare('SELECT COUNT(*) as count FROM boards').get().count;
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  const totalStandards = db.prepare('SELECT COUNT(*) as count FROM standards').get().count;
  const totalTests = db.prepare('SELECT COUNT(*) as count FROM tests').get().count;
  const totalCycles = db.prepare('SELECT COUNT(*) as count FROM test_cycles').get().count;
  const recentActivity = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 15').all();

  // Upcoming tests (tests with a future/today date that have no marks yet)
  const today = new Date().toISOString().slice(0, 10);
  const upcomingTests = db.prepare(`
    SELECT t.*, s.name as subject_name, std.display_name as class_name,
           (SELECT COUNT(*) FROM test_marks tm WHERE tm.test_id = t.id) as marks_entered
    FROM tests t
    JOIN subjects s ON t.subject_id = s.id
    JOIN standards std ON t.standard_id = std.id
    WHERE t.test_date >= ? 
    ORDER BY t.test_date ASC
    LIMIT 10
  `).all(today);

  // Pending marks: tests with 0 marks entered
  const pendingMarks = db.prepare(`
    SELECT COUNT(*) as count FROM tests t
    WHERE (SELECT COUNT(*) FROM test_marks tm WHERE tm.test_id = t.id) = 0
    AND (t.test_date IS NULL OR t.test_date <= ?)
  `).get(today).count;

  // Fee collection summary
  const feesSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(s.total_fees), 0) as total_expected,
      COALESCE((SELECT SUM(amount) FROM fee_payments), 0) as total_collected
    FROM students s
  `).get() || { total_expected: 0, total_collected: 0 };

  // Standard-wise Fee collection summary
  const standardFees = db.prepare(`
    SELECT 
      std.id as standard_id,
      std.display_name as standard_name,
      COALESCE(SUM(s.total_fees), 0) as total_expected,
      COALESCE(SUM(s.paid_fees), 0) as total_collected,
      (COALESCE(SUM(s.total_fees), 0) - COALESCE(SUM(s.paid_fees), 0)) as total_pending
    FROM standards std
    LEFT JOIN students s ON std.id = s.standard_id
    GROUP BY std.id, std.display_name
  `).all();

  // Class-level pass/fail/distinction stats
  const standards = db.prepare('SELECT s.*, b.id as board_id_val FROM standards s JOIN boards b ON s.board_id = b.id').all();
  const classStats = [];

  for (const std of standards) {
    const students = db.prepare('SELECT * FROM students WHERE standard_id = ?').all(std.id);
    const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(std.id);
    if (students.length === 0) {
      classStats.push({ standard_id: std.id, standard_name: std.display_name, total: 0, pass: 0, fail: 0, distinction: 0 });
      continue;
    }
    let pass = 0, fail = 0, distinction = 0;
    for (const student of students) {
      const marksRows = db.prepare('SELECT * FROM marks WHERE student_id = ?').all(student.id);
      const marksMap = {};
      marksRows.forEach(m => { marksMap[m.subject_id] = m; });
      const result = calculateStudentResult(student, subjects, marksMap, std.board_id_val);
      if (result.finalStatus === 'Distinction' || result.finalStatus === 'A1' || result.finalStatus === 'A2') distinction++;
      if (result.finalStatus === 'Fail') fail++;
      else if (result.finalStatus !== 'Pending') pass++;
    }
    classStats.push({ standard_id: std.id, standard_name: std.display_name, total: students.length, pass, fail, distinction });
  }

  res.json({ totalBoards, totalStudents, totalStandards, totalTests, totalCycles, recentActivity, classStats, upcomingTests, pendingMarks, feesSummary, standardFees });
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/exports')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🎓 Apex Tuition ERP — Server Running   ║
║     ➤  http://localhost:${PORT}               ║
║     Login: admin@result.local / admin123   ║
╚════════════════════════════════════════════╝
  `);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`
❌  Port ${PORT} is already in use!

To fix this, run ONE of these commands:

  Option 1 (kill the old process):
    npx kill-port ${PORT}

  Option 2 (find & kill manually):
    netstat -ano | findstr :${PORT}
    taskkill /PID <PID_NUMBER> /F

Then restart with:  npm run dev
    `);
    process.exit(1);
  } else {
    throw err;
  }
});

// Automated Backup System (Runs every 48 hours)
function runAutoBackup() {
  const { db } = require('./db/database');
  const backupsDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const lastBackupFile = path.join(__dirname, '../data/last_backup.txt');
  let lastBackupTime = 0;
  if (fs.existsSync(lastBackupFile)) {
    lastBackupTime = parseInt(fs.readFileSync(lastBackupFile, 'utf8')) || 0;
  }

  const now = Date.now();
  const intervalMs = 48 * 60 * 60 * 1000; // 48 hours

  if (now - lastBackupTime >= intervalMs) {
    try {
      const tables = [
        'admin', 'coaching_profile', 'boards', 'grade_scales', 'standards',
        'subjects', 'students', 'marks', 'test_cycles', 'tests',
        'test_marks', 'fee_payments', 'result_card_settings', 'school_exams',
        'batches', 'calendar_notes'
      ];
      
      const backupData = {};
      for (const table of tables) {
        try {
          const rows = db.prepare(`SELECT * FROM ${table}`).all();
          backupData[table] = rows;
        } catch (e) {
          // table might not exist
        }
      }

      const d = new Date();
      const YYYY = d.getFullYear();
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const DD = String(d.getDate()).padStart(2, '0');
      const HH = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const filename = `backup_${YYYY}-${MM}-${DD}_${HH}-${mm}-${ss}.json`;
      
      fs.writeFileSync(path.join(backupsDir, filename), JSON.stringify(backupData, null, 2), 'utf8');
      fs.writeFileSync(lastBackupFile, String(now), 'utf8');
      console.log(`[BackupService] Auto backup created successfully: ${filename}`);
    } catch (err) {
      console.error('[BackupService] Auto backup failed:', err);
    }
  }
}

// Run backup check at startup and every hour
setTimeout(runAutoBackup, 3000); // delay 3 seconds on startup
setInterval(runAutoBackup, 60 * 60 * 1000); // check hourly

module.exports = app;

