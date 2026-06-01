const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const DB_PATH = path.join(__dirname, '../data/result_generator.db');
const db = new DatabaseSync(DB_PATH);
const { calculateStudentResult } = require('../backend/services/gradeService');

const student = db.prepare('SELECT * FROM students WHERE id = 3').get();
const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(student.standard_id);
const subjects = db.prepare('SELECT * FROM subjects WHERE standard_id = ? ORDER BY sort_order').all(student.standard_id);

// Construct marks map where English (subject 30) is 20 (failing)
const marksMap = {
  30: { subject_id: 30, total_marks: 20, internal_marks: null, external_marks: null, is_absent: 0 },
  31: { subject_id: 31, total_marks: 80, internal_marks: null, external_marks: null, is_absent: 0 },
  32: { subject_id: 32, total_marks: 76, internal_marks: null, external_marks: null, is_absent: 0 },
  33: { subject_id: 33, total_marks: 77, internal_marks: null, external_marks: null, is_absent: 0 },
  34: { subject_id: 34, total_marks: 82, internal_marks: null, external_marks: null, is_absent: 0 },
  35: { subject_id: 35, total_marks: 75, internal_marks: null, external_marks: null, is_absent: 0 },
  41: { subject_id: 41, total_marks: 79, internal_marks: null, external_marks: null, is_absent: 0 }
};

const result = calculateStudentResult(student, subjects, marksMap, standard.board_id);
console.log("Calculated Result for student 3 with English = 20:");
console.log("Overall Obtained:", result.totalObtained, "/", result.totalMaxMarks);
console.log("Overall Pct:", result.overallPct);
console.log("Final Status:", result.finalStatus);
console.log("Subject Results:");
for (const sr of result.subjectResults) {
  console.log(`- ${sr.subject_name}: Obt=${sr.obtained}, P/F=${sr.pass_fail}`);
}
