const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'data/result_generator.db'));
try {
  const query = `
      SELECT tt.*, t.name as teacher_fullname, t.email as teacher_email,
             s.display_name as class_name, b.short_name as board_short
      FROM timetable tt
      LEFT JOIN teachers t ON tt.teacher_id = t.id
      LEFT JOIN standards s ON tt.standard_id = s.id
      LEFT JOIN boards b ON s.board_id = b.id
    `;
  db.prepare(query).all();
  console.log("Success");
} catch(e) {
  console.error("Error:", e);
}
