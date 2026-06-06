const gradesData = require('../data/grades.json');
const { db } = require('../db/database');

/**
 * Get grade label and status for a percentage score given a board's grade scale
 */
function getGrade(boardId, percentage) {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return { label: '-', status: '-', color: '#999' };
  }
  const scale = db.prepare(`
    SELECT * FROM grade_scales WHERE board_id = ?
    ORDER BY min_pct DESC
  `).all(boardId);

  for (const grade of scale) {
    if (percentage >= grade.min_pct && percentage <= grade.max_pct) {
      return { label: grade.label, status: grade.result_status, color: grade.color };
    }
  }
  // Below lowest
  if (scale.length > 0) {
    const lowest = scale[scale.length - 1];
    return { label: lowest.label, status: lowest.result_status, color: lowest.color };
  }
  return { label: '-', status: '-', color: '#999' };
}

/**
 * Determine final result status from overall percentage
 */
function getFinalStatus(boardId, percentage, hasAnyFail) {
  if (hasAnyFail) return 'Fail';
  if (percentage !== null && percentage < getPassMark(boardId)) {
    return 'Fail';
  }
  return 'Pass';
}

/**
 * Check if a student is enrolled in a given subject
 */
function isStudentEnrolled(student, subjectId, isSubjectCompulsory) {
  if (!student || !student.elective_subjects) {
    return true;
  }
  try {
    const parsed = typeof student.elective_subjects === 'string'
      ? JSON.parse(student.elective_subjects)
      : student.elective_subjects;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (Array.isArray(parsed.enrolledSubjectIds)) {
        return parsed.enrolledSubjectIds.includes(Number(subjectId));
      }
    }
    if (Array.isArray(parsed)) {
      const electiveIds = parsed.map(el => typeof el === 'object' ? el.id : el);
      return (isSubjectCompulsory !== 0) || electiveIds.includes(Number(subjectId));
    }
  } catch (e) {
    console.error('Error parsing elective_subjects:', e);
  }
  return true;
}

/**
 * Calculate marks and grade for a single student
 */
function calculateStudentResult(student, subjects, marksMap, boardId) {
  let totalObtained = 0;
  let totalMaxMarks = 0;
  let hasAnyFail = false;
  let isPending = false;
  let subjectResults = [];
  let marksCount = 0;

  for (const subject of subjects) {
    const isSelected = isStudentEnrolled(student, subject.id, subject.is_compulsory);
    if (!isSelected) continue;

    const mark = marksMap[subject.id];
    let obtained = null;
    let internal = null;
    let external = null;
    let isAbsent = false;

    if (mark) {
      marksCount++;
      isAbsent = mark.is_absent === 1;
      if (!isAbsent) {
        if (subject.marks_type === 'split') {
          internal = mark.internal_marks;
          external = mark.external_marks;
          obtained = (internal !== null ? internal : 0) + (external !== null ? external : 0);
        } else {
          obtained = mark.total_marks;
        }
      }
    }

    const pct = (obtained !== null && subject.max_marks > 0)
      ? Math.round((obtained / subject.max_marks) * 100 * 100) / 100
      : null;
    const grade = pct !== null ? getGrade(boardId, pct) : { label: '-', status: '-', color: '#999' };

    if (!mark || (!isAbsent && obtained === null)) {
      isPending = true;
    } else if (pct !== null && pct < getPassMark(boardId)) {
      hasAnyFail = true;
    }

    if (obtained !== null) {
      totalObtained += obtained;
      totalMaxMarks += subject.max_marks;
    } else if (subject.is_compulsory) {
      totalMaxMarks += subject.max_marks;
    }

    subjectResults.push({
      subject_id: subject.id,
      subject_name: subject.name,
      max_marks: subject.max_marks,
      marks_type: subject.marks_type,
      internal_max: subject.internal_max,
      external_max: subject.external_max,
      is_compulsory: subject.is_compulsory,
      is_language: subject.is_language,
      internal_marks: internal,
      external_marks: external,
      obtained,
      is_absent: isAbsent,
      percentage: pct,
      grade: grade.label,
      grade_color: grade.color,
      pass_fail: isAbsent ? 'ABSENT' : (pct !== null && pct >= getPassMark(boardId) ? 'PASS' : 'FAIL')
    });
  }

  const overallPct = (marksCount > 0 && totalMaxMarks > 0)
    ? Math.round((totalObtained / totalMaxMarks) * 100 * 100) / 100
    : null;
  
  const overallGrade = overallPct !== null ? getGrade(boardId, overallPct) : { label: '-', status: '-', color: '#999' };
  const finalStatus = isPending ? 'Pending' : (marksCount > 0 ? getFinalStatus(boardId, overallPct, hasAnyFail) : 'Pending');

  return {
    subjectResults,
    totalObtained,
    totalMaxMarks,
    overallPct,
    overallGrade: overallGrade.label,
    overallGradeColor: overallGrade.color,
    finalStatus
  };
}

/**
 * Get pass percentage mark for a board
 */
function getPassMark(boardId) {
  const scale = db.prepare(`SELECT MIN(min_pct) as pass_mark FROM grade_scales WHERE board_id = ? AND result_status != 'Fail'`).get(boardId);
  return scale ? (scale.pass_mark || 33) : 33;
}

/**
 * Calculate ranks for all students in a standard
 */
function calculateRanks(studentResults) {
  const sorted = [...studentResults].sort((a, b) => (b.overallPct || 0) - (a.overallPct || 0));
  const ranked = sorted.map((s, i) => ({ ...s, rank: i + 1 }));
  // Map back by student id
  const rankMap = {};
  for (const r of ranked) {
    rankMap[r.student_id] = r.rank;
  }
  return rankMap;
}

/**
 * Recalculate overall marks for all students in a standard/class based on unit tests
 */
function recalculateOverallMarksForClass(standardId) {
  const students = db.prepare('SELECT id, elective_subjects, batch_id FROM students WHERE standard_id = ?').all(standardId);
  const subjects = db.prepare('SELECT id, max_marks, marks_type, internal_max, external_max, is_compulsory FROM subjects WHERE standard_id = ?').all(standardId);
  const tests = db.prepare('SELECT id, subject_id, max_marks, batch_id FROM tests WHERE standard_id = ?').all(standardId);

  if (students.length === 0 || subjects.length === 0) return;

  const runTx = db.transaction(() => {
    for (const student of students) {
      for (const subject of subjects) {
        const isSelected = isStudentEnrolled(student, subject.id, subject.is_compulsory);
        if (!isSelected) {
          db.prepare('DELETE FROM marks WHERE student_id = ? AND subject_id = ?').run(student.id, subject.id);
          continue;
        }

        const subjTests = tests.filter(t => t.subject_id === subject.id && (t.batch_id === null || student.batch_id === null || t.batch_id === student.batch_id));
        if (subjTests.length === 0) {
          db.prepare('DELETE FROM marks WHERE student_id = ? AND subject_id = ?').run(student.id, subject.id);
          continue;
        }

        const testIds = subjTests.map(t => t.id);
        const studentTestMarks = db.prepare(`
          SELECT test_id, obtained_marks, is_absent 
          FROM test_marks 
          WHERE student_id = ? AND test_id IN (${testIds.map(() => '?').join(',')})
        `).all(student.id, ...testIds);

        let totalObtained = 0;
        let totalMax = 0;
        let gradedCount = 0;
        let absentCount = 0;

        for (const t of subjTests) {
          const tm = studentTestMarks.find(x => x.test_id === t.id);
          if (tm) {
            if (tm.is_absent === 1) {
              absentCount++;
              gradedCount++;
              totalMax += t.max_marks;
            } else if (tm.obtained_marks !== null && tm.obtained_marks !== undefined) {
              totalObtained += tm.obtained_marks;
              totalMax += t.max_marks;
              gradedCount++;
            }
          }
        }

        if (gradedCount > 0) {
          const pct = totalMax > 0 ? (totalObtained / totalMax) : 0;
          let total_marks = null;
          let internal_marks = null;
          let external_marks = null;
          let is_absent = (absentCount === gradedCount) ? 1 : 0;

          if (subject.marks_type === 'split') {
            internal_marks = Math.round(pct * (subject.internal_max || 0) * 100) / 100;
            external_marks = Math.round(pct * (subject.external_max || 0) * 100) / 100;
            total_marks = internal_marks + external_marks;
          } else {
            total_marks = Math.round(pct * subject.max_marks * 100) / 100;
          }

          db.prepare(`
            INSERT INTO marks (student_id, subject_id, total_marks, internal_marks, external_marks, is_absent)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(student_id, subject_id) DO UPDATE SET
              total_marks = excluded.total_marks,
              internal_marks = excluded.internal_marks,
              external_marks = excluded.external_marks,
              is_absent = excluded.is_absent
          `).run(student.id, subject.id, total_marks, internal_marks, external_marks, is_absent);
        }
      }
    }
  });

  runTx();
}

module.exports = { getGrade, getFinalStatus, calculateStudentResult, calculateRanks, getPassMark, isStudentEnrolled, recalculateOverallMarksForClass };
