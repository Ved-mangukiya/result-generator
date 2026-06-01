const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/result_generator.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better performance
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Emulate transaction function wrapper for compatibility with better-sqlite3
let transactionDepth = 0;
db.transaction = function(fn) {
  return function(...args) {
    let startedHere = false;
    if (transactionDepth === 0) {
      db.exec('BEGIN');
      startedHere = true;
      transactionDepth++;
    } else {
      db.exec(`SAVEPOINT sp_${transactionDepth}`);
      transactionDepth++;
    }
    
    try {
      const result = fn.apply(this, args);
      if (startedHere) {
        db.exec('COMMIT');
        transactionDepth--;
      } else {
        db.exec(`RELEASE sp_${transactionDepth - 1}`);
        transactionDepth--;
      }
      return result;
    } catch (err) {
      if (startedHere) {
        db.exec('ROLLBACK');
        transactionDepth = 0;
      } else {
        db.exec(`ROLLBACK TO sp_${transactionDepth - 1}`);
        transactionDepth--;
      }
      throw err;
    }
  };
};

function initializeDatabase() {
  db.exec(`
    -- Admin table
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Coaching profile
    CREATE TABLE IF NOT EXISTS coaching_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      tagline TEXT DEFAULT '',
      logo_path TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      website TEXT DEFAULT '',
      primary_color TEXT DEFAULT '#1a3a6b',
      onboarding_complete INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Boards
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      is_custom INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Grade scales (per board)
    CREATE TABLE IF NOT EXISTS grade_scales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      min_pct REAL NOT NULL,
      max_pct REAL NOT NULL,
      color TEXT DEFAULT '#4caf69',
      result_status TEXT DEFAULT 'Pass',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    -- Standards (classes) per board
    CREATE TABLE IF NOT EXISTS standards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      standard_number INTEGER NOT NULL,
      stream TEXT DEFAULT 'General',
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    -- Subjects per standard
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      max_marks INTEGER DEFAULT 100,
      marks_type TEXT DEFAULT 'total',
      internal_max INTEGER DEFAULT 0,
      external_max INTEGER DEFAULT 100,
      is_compulsory INTEGER DEFAULT 1,
      is_language INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE
    );

    -- Students
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      father_name TEXT DEFAULT '',
      mother_name TEXT DEFAULT '',
      dob TEXT DEFAULT '',
      photo_path TEXT DEFAULT '',
      remarks TEXT DEFAULT '',
      attendance_pct REAL DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE
    );

    -- Marks
    CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      total_marks REAL DEFAULT NULL,
      internal_marks REAL DEFAULT NULL,
      external_marks REAL DEFAULT NULL,
      is_absent INTEGER DEFAULT 0,
      UNIQUE(student_id, subject_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- Result card settings per standard
    CREATE TABLE IF NOT EXISTS result_card_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER UNIQUE NOT NULL,
      template_id INTEGER DEFAULT 1,
      primary_color TEXT DEFAULT '',
      accent_color TEXT DEFAULT '',
      show_rank INTEGER DEFAULT 1,
      show_percentile INTEGER DEFAULT 0,
      show_attendance INTEGER DEFAULT 1,
      show_remarks INTEGER DEFAULT 1,
      show_photo INTEGER DEFAULT 1,
      show_parent_names INTEGER DEFAULT 1,
      show_dob INTEGER DEFAULT 1,
      show_split_marks INTEGER DEFAULT 1,
      show_grade INTEGER DEFAULT 1,
      show_pass_fail INTEGER DEFAULT 1,
      paper_size TEXT DEFAULT 'A4 Portrait',
      result_categories TEXT DEFAULT '["Distinction","First Class","Second Class","Pass","Fail"]',
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE
    );

    -- Activity log
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Database initialized successfully');
}

function logActivity(action, description) {
  try {
    db.prepare(`INSERT INTO activity_log (action, description) VALUES (?, ?)`).run(action, description);
  } catch (e) {
    // non-critical
  }
}

module.exports = { db, initializeDatabase, logActivity };
