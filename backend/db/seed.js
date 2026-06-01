const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('./database');
const boardsData = require('../data/boards.json');
const gradesData = require('../data/grades.json');

async function seed() {
  console.log('🌱 Starting database seed...');
  initializeDatabase();

  // Seed default admin
  const existingAdmin = db.prepare('SELECT id FROM admin WHERE email = ?').get('admin@result.local');
  if (!existingAdmin) {
    const hash = await bcrypt.hash('admin123', 10);
    db.prepare('INSERT INTO admin (email, password_hash) VALUES (?, ?)').run('admin@result.local', hash);
    console.log('✅ Admin account created: admin@result.local / admin123');
  }

  // Seed coaching profile placeholder
  const existingProfile = db.prepare('SELECT id FROM coaching_profile').get();
  if (!existingProfile) {
    db.prepare(`INSERT INTO coaching_profile (name, tagline, address, phone, website, primary_color, onboarding_complete)
                VALUES (?, ?, ?, ?, ?, ?, 0)`).run('', '', '', '', '', '#1a3a6b');
    console.log('✅ Coaching profile placeholder created');
  }

  // Seed boards
  const existingBoards = db.prepare('SELECT COUNT(*) as count FROM boards').get();
  if (existingBoards.count === 0) {
    const insertBoard = db.prepare('INSERT INTO boards (id, name, short_name, is_custom) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((boards) => {
      for (const board of boards) {
        insertBoard.run(board.id, board.name, board.short_name, board.is_custom ? 1 : 0);
      }
    });
    insertMany(boardsData.boards);
    console.log(`✅ ${boardsData.boards.length} boards seeded`);

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
    console.log('✅ Grade scales seeded for all boards');
  }

  console.log('🎉 Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
