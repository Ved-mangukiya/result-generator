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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/exports', express.static(path.join(__dirname, '../exports')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Auth middleware for API routes
function requireAuth(req, res, next) {
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

// Dashboard stats
app.get('/api/dashboard', requireAuth, (req, res) => {
  const { db } = require('./db/database');
  const { calculateStudentResult, calculateRanks } = require('./services/gradeService');

  const totalBoards = db.prepare('SELECT COUNT(*) as count FROM boards').get().count;
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  const totalStandards = db.prepare('SELECT COUNT(*) as count FROM standards').get().count;
  const recentActivity = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 15').all();

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
      if (result.finalStatus === 'Distinction') distinction++;
      if (result.finalStatus === 'Fail') fail++;
      else pass++;
    }
    classStats.push({ standard_id: std.id, standard_name: std.display_name, total: students.length, pass, fail, distinction });
  }

  res.json({ totalBoards, totalStudents, totalStandards, recentActivity, classStats });
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

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🎓 Result Generator Server Running     ║
║     http://localhost:${PORT}                  ║
║     Default login: admin@result.local      ║
║     Default password: admin123             ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
