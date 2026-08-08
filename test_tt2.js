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
      WHERE tt.standard_id = ?
      ORDER BY CASE tt.day_of_week WHEN "Monday" THEN 1 WHEN "Tuesday" THEN 2 WHEN "Wednesday" THEN 3 WHEN "Thursday" THEN 4 WHEN "Friday" THEN 5 WHEN "Saturday" THEN 6 ELSE 7 END, tt.start_time ASC, tt.id ASC
    `;
  db.prepare(query).all("18");
  console.log("Success with 18");
} catch(e) {
  console.error("Error with 18:", e);
}
