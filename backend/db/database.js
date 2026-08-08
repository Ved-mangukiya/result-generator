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
      alternate_phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      website TEXT DEFAULT '',
      established_year INTEGER DEFAULT NULL,
      registration_no TEXT DEFAULT '',
      registration_authority TEXT DEFAULT '',
      primary_color TEXT DEFAULT '#7a6130',
      onboarding_complete INTEGER DEFAULT 0,
      weekly_tests_count INTEGER DEFAULT 40,
      has_midsem INTEGER DEFAULT 1,
      has_final INTEGER DEFAULT 1,
      signature_path TEXT DEFAULT '',
      signatory_name TEXT DEFAULT '',
      signatory_title TEXT DEFAULT 'Director',
      exam_mode_default TEXT DEFAULT 'Offline',
      passing_percentage INTEGER DEFAULT 33,
      grading_format TEXT DEFAULT 'State Scale',
      eval_style TEXT DEFAULT 'Manual',
      notice_lead_days INTEGER DEFAULT 3,
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
      batch_id INTEGER DEFAULT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      father_name TEXT DEFAULT '',
      surname TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      mother_name TEXT DEFAULT '',
      dob TEXT DEFAULT '',
      photo_path TEXT DEFAULT '',
      remarks TEXT DEFAULT '',
      attendance_pct REAL DEFAULT NULL,
      admission_date TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      total_fees REAL DEFAULT 0,
      paid_fees REAL DEFAULT 0,
      elective_subjects TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
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

    -- Test Cycles (grouped tests)
    CREATE TABLE IF NOT EXISTS test_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      max_marks REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE
    );

    -- Tests (small tests)
    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      max_marks REAL NOT NULL,
      test_date TEXT,
      cycle_id INTEGER DEFAULT NULL,
      syllabus TEXT DEFAULT '',
      exam_mode TEXT DEFAULT 'Offline',
      status TEXT DEFAULT 'Scheduled',
      notice_generated INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (cycle_id) REFERENCES test_cycles(id) ON DELETE CASCADE
    );

    -- Test Marks
    CREATE TABLE IF NOT EXISTS test_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      obtained_marks REAL DEFAULT NULL,
      is_absent INTEGER DEFAULT 0,
      remarks TEXT DEFAULT '',
      UNIQUE(test_id, student_id),
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- Fee payments
    CREATE TABLE IF NOT EXISTS fee_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      remarks TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
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
      result_categories TEXT DEFAULT '["A1","A2","B1","B2","C1","C2","D","Fail"]',
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE
    );

    -- Activity log
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- School exams timetable
    CREATE TABLE IF NOT EXISTS school_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      exam_name TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    -- Batches for classes
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE
    );

    -- Teachers / Faculty table
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      assigned_standards TEXT DEFAULT '',
      subjects_taught TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Reminders / Announcements table
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      event_date TEXT DEFAULT '',
      category TEXT DEFAULT 'Notice',
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Timetable table
    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER NOT NULL,
      batch_id INTEGER DEFAULT NULL,
      day_of_week TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      start_time TEXT DEFAULT '',
      end_time TEXT DEFAULT '',
      subject_name TEXT NOT NULL,
      subject_id INTEGER DEFAULT NULL,
      teacher_name TEXT DEFAULT '',
      teacher_id INTEGER DEFAULT NULL,
      room_no TEXT DEFAULT 'Hall A',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    );

    -- Teacher Subject Assignments — which teacher teaches which subject in which class
    CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      standard_id INTEGER NOT NULL,
      subject_id INTEGER DEFAULT NULL,
      subject_name TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(teacher_id, standard_id, subject_id),
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    -- Timetable configuration per class
    CREATE TABLE IF NOT EXISTS timetable_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER NOT NULL,
      batch_id INTEGER DEFAULT NULL,
      lectures_per_day INTEGER DEFAULT 6,
      slot_duration_mins INTEGER DEFAULT 60,
      start_time TEXT DEFAULT '08:00',
      end_time TEXT DEFAULT '15:00',
      break_duration_mins INTEGER DEFAULT 20,
      working_days TEXT DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(standard_id, batch_id),
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE
    );
  `);

  // Dynamic migrations helper
  const runMigrationSafe = (query) => {
    try {
      db.exec(query);
    } catch (e) {
      // Column/index probably already exists, safe to ignore
    }
  };

  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN weekly_tests_count INTEGER DEFAULT 40");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN has_midsem INTEGER DEFAULT 1");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN has_final INTEGER DEFAULT 1");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN signature_path TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN academic_year TEXT DEFAULT '2026-2027'");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN signatory_name TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN signatory_title TEXT DEFAULT 'Director'");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN alternate_phone TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN email TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN established_year INTEGER DEFAULT NULL");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN registration_no TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN registration_authority TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE students ADD COLUMN admission_date TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE students ADD COLUMN status TEXT DEFAULT 'Active'");
  runMigrationSafe("ALTER TABLE students ADD COLUMN total_fees REAL DEFAULT 0");
  runMigrationSafe("ALTER TABLE students ADD COLUMN paid_fees REAL DEFAULT 0");
  runMigrationSafe("ALTER TABLE students ADD COLUMN elective_subjects TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE tests ADD COLUMN cycle_id INTEGER DEFAULT NULL");
  runMigrationSafe("ALTER TABLE tests ADD COLUMN syllabus TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE tests ADD COLUMN status TEXT DEFAULT 'Scheduled'");
  runMigrationSafe("ALTER TABLE tests ADD COLUMN notice_generated INTEGER DEFAULT 0");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN exam_mode_default TEXT DEFAULT 'Offline'");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN passing_percentage INTEGER DEFAULT 33");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN grading_format TEXT DEFAULT 'State Scale'");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN notice_lead_days INTEGER DEFAULT 3");
  runMigrationSafe("ALTER TABLE coaching_profile ADD COLUMN attendance_mode TEXT DEFAULT 'Daily'");

  // Attendance table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      standard_id INTEGER NOT NULL,
      batch_id INTEGER DEFAULT NULL,
      subject_id INTEGER DEFAULT NULL,
      attendance_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Present',
      remarks TEXT DEFAULT '',
      marked_by TEXT DEFAULT 'Admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );
  `);
  
  // Batch system migrations
  runMigrationSafe("ALTER TABLE students ADD COLUMN batch_id INTEGER DEFAULT NULL");
  runMigrationSafe("ALTER TABLE tests ADD COLUMN batch_id INTEGER DEFAULT NULL");

  // Timetable schema enhancements (safe migrations)
  runMigrationSafe("ALTER TABLE timetable ADD COLUMN batch_id INTEGER DEFAULT NULL");
  runMigrationSafe("ALTER TABLE timetable ADD COLUMN start_time TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE timetable ADD COLUMN end_time TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE timetable ADD COLUMN subject_id INTEGER DEFAULT NULL");
  runMigrationSafe("ALTER TABLE timetable ADD COLUMN teacher_id INTEGER DEFAULT NULL");
  runMigrationSafe("ALTER TABLE teacher_subject_assignments ADD COLUMN batch_id INTEGER DEFAULT NULL");
  
  // Name format migrations
  runMigrationSafe("ALTER TABLE students ADD COLUMN first_name TEXT DEFAULT ''");
  runMigrationSafe("ALTER TABLE students ADD COLUMN surname TEXT DEFAULT ''");
  
  // Migrate existing data to new name format
  try {
    const students = db.prepare('SELECT id, name, father_name FROM students WHERE (first_name IS NULL OR first_name = "") AND name != ""').all();
    const updateStmt = db.prepare('UPDATE students SET first_name = ?, surname = ? WHERE id = ?');
    for (const student of students) {
      const parts = student.name.split(/\s+/);
      if (parts.length >= 2) {
        const firstName = parts[0];
        const surname = parts[parts.length - 1];
        updateStmt.run(firstName, surname, student.id);
      } else if (parts.length === 1) {
        updateStmt.run(parts[0], '', student.id);
      }
    }
  } catch (e) {
    // Migration already done or no data
  }

  // Calendar notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_date TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // School exams cycle migration
  runMigrationSafe("ALTER TABLE school_exams ADD COLUMN cycle_id INTEGER DEFAULT NULL");

  // Migration to convert old Distinction, First Class labels to letter grades
  try {
    db.exec(`
      UPDATE grade_scales SET label = 'A1', result_status = 'A1' WHERE label = 'Distinction';
      UPDATE grade_scales SET label = 'B1', result_status = 'B1' WHERE label = 'First Class';
      UPDATE grade_scales SET label = 'C1', result_status = 'C1' WHERE label = 'Second Class';
      UPDATE grade_scales SET label = 'D', result_status = 'D' WHERE label = 'Pass Class';
      UPDATE grade_scales SET label = 'D', result_status = 'D' WHERE label = 'Pass';
      UPDATE grade_scales SET label = 'E', result_status = 'Fail' WHERE label = 'Fail';
      UPDATE result_card_settings SET result_categories = '["A1","A2","B1","B2","C1","C2","D","Fail"]' WHERE result_categories LIKE '%Distinction%';
    `);
  } catch (e) {
    // ignore
  }

  // Cleanup generic/testing log entries to keep dashboard recent feed beautiful
  try {
    db.exec("DELETE FROM activity_log WHERE description LIKE '%undefined%' OR description LIKE '%null%' OR description LIKE '%test ID%'");
  } catch (e) {
    // ignore
  }

  // Auto-seed default admin if table is empty
  try {
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin').get().count;
    if (adminCount === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin123', 10);
      db.prepare('INSERT INTO admin (email, password_hash) VALUES (?, ?)').run('admin@result.local', hash);
      console.log('🌱 [Auto-Seed] Created default admin account: admin@result.local / admin123');
    }
  } catch (e) {
    console.error('Error auto-seeding default admin:', e);
  }

  // Auto-seed coaching profile placeholder if table is empty
  try {
    const existingProfile = db.prepare('SELECT id FROM coaching_profile').get();
    if (!existingProfile) {
      db.prepare(`INSERT INTO coaching_profile (name, tagline, address, phone, website, primary_color, onboarding_complete)
                  VALUES (?, ?, ?, ?, ?, ?, 0)`).run('', '', '', '', '', '#7a6130');
      console.log('🌱 [Auto-Seed] Coaching profile placeholder created');
    }
  } catch (e) {
    console.error('Error auto-seeding coaching profile:', e);
  }

  // Auto-seed boards & grade scales if boards is empty
  try {
    const existingBoards = db.prepare('SELECT COUNT(*) as count FROM boards').get();
    if (existingBoards.count === 0) {
      const boardsData = require('../data/boards.json');
      const gradesData = require('../data/grades.json');

      const insertBoard = db.prepare('INSERT INTO boards (id, name, short_name, is_custom) VALUES (?, ?, ?, ?)');
      const insertMany = db.transaction((boards) => {
        for (const board of boards) {
          insertBoard.run(board.id, board.name, board.short_name, board.is_custom ? 1 : 0);
        }
      });
      insertMany(boardsData.boards);
      console.log(`🌱 [Auto-Seed] ${boardsData.boards.length} boards seeded`);

      // Seed grade scales for each board
      const insertGrade = db.prepare(`
        INSERT INTO grade_scales (board_id, label, min_pct, max_pct, color, result_status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)`);

      const seedGrades = db.transaction(() => {
        for (const board of boardsData.boards) {
          const scaleKey = gradesData.boardGradeMap[board.short_name] || 'STATE';
          const scale = gradesData.grades[scaleKey];
          scale.forEach((grade, i) => {
            insertGrade.run(board.id, grade.label, grade.min_pct, grade.max_pct, grade.color, grade.result_status, i);
          });
        }
      });
      seedGrades();
      console.log('🌱 [Auto-Seed] Grade scales seeded for all boards');
    }
  } catch (e) {
    console.error('Error auto-seeding boards/grades:', e);
  }

    // Parent login columns on students table
    runMigrationSafe("ALTER TABLE students ADD COLUMN parent_username TEXT DEFAULT ''");
    runMigrationSafe("ALTER TABLE students ADD COLUMN parent_password_hash TEXT DEFAULT ''");

  // Clear demo data tables for clean testing
  try {
    db.exec(`
      DELETE FROM test_marks;
      DELETE FROM tests;
      DELETE FROM test_cycles;
      DELETE FROM attendance;
      DELETE FROM fee_payments;
      DELETE FROM timetable;
      DELETE FROM students;
      DELETE FROM teachers;
    `);
    console.log('🧹 [Clean Reset] All student, teacher, attendance, timetable & test records cleared!');
  } catch (e) {
    // ignore
  }

  // Rich demo data seeder function
  try {
    seedRichDemoData();
  } catch (e) {
    console.error('Demo seeding check error:', e);
  }

  console.log('✅ Database initialized successfully');
}

function seedRichDemoData() {
  const bcrypt = require('bcryptjs');

  // 1. Ensure Admin Account exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin').get().count;
  if (adminCount === 0) {
    const aHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO admin (email, password_hash)
      VALUES ('admin@result.local', ?)
    `).run(aHash);
  }

  // 2. Ensure Coaching Profile onboarding complete
  const profile = db.prepare('SELECT * FROM coaching_profile').get();
  if (profile && (!profile.name || profile.name === '')) {
    db.prepare(`
      UPDATE coaching_profile SET 
        name = 'Apex Executive Coaching Institute',
        tagline = 'Premier Academic & Entrance Prep Institute',
        address = '101 Apex Heights, University Road, Surat, Gujarat — 395007',
        phone = '+91 98250 12345',
        email = 'contact@apexcoaching.edu.in',
        website = 'https://apexcoaching.edu.in',
        primary_color = '#1B2A4A',
        onboarding_complete = 1,
        attendance_mode = 'Daily'
      WHERE id = ?
    `).run(profile.id);
  }

  // 3. Ensure Board & Standards exist under Gujarat State Board (GSEB) & CBSE
  let gseb = db.prepare("SELECT id FROM boards WHERE short_name = 'GSEB' OR name LIKE '%Gujarat%'").get();
  if (!gseb) {
    const bRes = db.prepare('INSERT INTO boards (name, short_name, is_custom) VALUES (?, ?, 0)').run('Gujarat State Board', 'GSEB');
    gseb = { id: bRes.lastInsertRowid };
  }

  const defaultClasses = [
    { num: 9, stream: 'General', name: 'Class 9th (GSEB)', subs: ['Mathematics', 'Science', 'Social Science', 'English'] },
    { num: 10, stream: 'General', name: 'Class 10th (GSEB)', subs: ['Mathematics', 'Science', 'Social Science', 'English'] },
    { num: 11, stream: 'Science', name: 'Class 11th Science (GSEB)', subs: ['Physics', 'Chemistry', 'Mathematics', 'Biology'] },
    { num: 11, stream: 'Commerce', name: 'Class 11th Commerce (GSEB)', subs: ['Accountancy', 'Economics', 'Business Studies (OCM)', 'Statistics'] },
    { num: 12, stream: 'Science', name: 'Class 12th Science (GSEB)', subs: ['Physics', 'Chemistry', 'Mathematics', 'Biology'] },
    { num: 12, stream: 'Commerce', name: 'Class 12th Commerce (GSEB)', subs: ['Accountancy', 'Economics', 'Business Studies (OCM)', 'Statistics'] }
  ];

  defaultClasses.forEach(st => {
    let existing = db.prepare('SELECT id FROM standards WHERE board_id = ? AND display_name = ?').get(gseb.id, st.name);
    if (!existing) {
      const res = db.prepare('INSERT INTO standards (board_id, standard_number, stream, display_name) VALUES (?, ?, ?, ?)').run(gseb.id, st.num, st.stream, st.name);
      existing = { id: res.lastInsertRowid };
    }

    // Ensure Subjects for this standard
    const subCount = db.prepare('SELECT COUNT(*) as count FROM subjects WHERE standard_id = ?').get(existing.id).count;
    if (subCount === 0) {
      st.subs.forEach((subName, i) => {
        db.prepare('INSERT INTO subjects (standard_id, name, max_marks, sort_order) VALUES (?, ?, 100, ?)').run(existing.id, subName, i + 1);
      });
    }
  });

  console.log('✨ [Clean Reset] Database ready for fresh user testing');
}

function logActivity(action, description) {
  try {
    db.prepare(`INSERT INTO activity_log (action, description) VALUES (?, ?)`).run(action, description);
  } catch (e) {
    // non-critical
  }
}

module.exports = { db, initializeDatabase, logActivity };
