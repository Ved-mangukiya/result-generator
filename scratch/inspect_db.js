const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const DB_PATH = path.join(__dirname, '../data/result_generator.db');
const db = new DatabaseSync(DB_PATH);

console.log("--- COACHING PROFILE ---");
const profile = db.prepare('SELECT * FROM coaching_profile').get();
console.log(JSON.stringify(profile, null, 2));

console.log("\n--- COUNT OF OTHER DATA ---");
const counts = [
  'boards', 'grade_scales', 'standards', 'subjects', 'students', 
  'marks', 'test_cycles', 'tests', 'test_marks', 'fee_payments',
  'result_card_settings', 'school_exams', 'batches', 'calendar_notes'
];
for (const table of counts) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get();
    console.log(`${table}: ${row.cnt}`);
  } catch (e) {
    console.log(`${table}: ERROR ${e.message}`);
  }
}
