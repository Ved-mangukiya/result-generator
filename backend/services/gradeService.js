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
  const grade = getGrade(boardId, percentage);
  return grade.status;
}

/**
 * Calculate marks and grade for a single student
 */
function calculateStudentResult(student, subjects, marksMap, boardId) {
  let totalObtained = 0;
  let totalMaxMarks = 0;
  let hasAnyFail = false;
  let subjectResults = [];
  let marksCount = 0;

  for (const subject of subjects) {
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

    if (subject.is_compulsory && (pct === null || pct < getPassMark(boardId))) {
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
  const finalStatus = marksCount > 0 ? getFinalStatus(boardId, overallPct, hasAnyFail) : 'Pending';

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

module.exports = { getGrade, getFinalStatus, calculateStudentResult, calculateRanks, getPassMark };
