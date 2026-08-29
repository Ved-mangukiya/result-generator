const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../db/database');

// GET /api/coaching
router.get('/', (req, res) => {
  const profile = db.prepare('SELECT * FROM coaching_profile').get();
  res.json(profile || {});
});

// PUT /api/coaching
router.put('/', (req, res) => {
  const { 
    name, tagline, address, phone, alternate_phone, email, website, 
    established_year, registration_no, registration_authority,
    primary_color, onboarding_complete, weekly_tests_count, has_midsem, has_final, 
    signatory_name, signatory_title,
    exam_mode_default, passing_percentage, grading_format, eval_style, notice_lead_days,
    attendance_mode, academic_year, notice_language, default_notice_mode, theme
  } = req.body;
  
  const existing = db.prepare('SELECT id FROM coaching_profile').get();

  const w_count = weekly_tests_count !== undefined ? parseInt(weekly_tests_count) : 40;
  const midsem = has_midsem !== undefined ? parseInt(has_midsem) : 1;
  const final = has_final !== undefined ? parseInt(has_final) : 1;
  const est_year = established_year ? parseInt(established_year) : null;
  const pass_pct = passing_percentage !== undefined ? parseInt(passing_percentage) : 33;
  const lead_days = notice_lead_days !== undefined ? parseInt(notice_lead_days) : 3;

  if (existing) {
    db.prepare(`UPDATE coaching_profile SET 
      name = ?, tagline = ?, address = ?, phone = ?, alternate_phone = ?, email = ?, website = ?,
      established_year = ?, registration_no = ?, registration_authority = ?, primary_color = ?,
      onboarding_complete = ?, weekly_tests_count = ?, has_midsem = ?, has_final = ?,
      signatory_name = ?, signatory_title = ?, 
      exam_mode_default = ?, passing_percentage = ?, grading_format = ?, eval_style = ?, notice_lead_days = ?,
      attendance_mode = ?, academic_year = ?, notice_language = ?, default_notice_mode = ?, theme = ?,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`).run(
        name || '', tagline || '', address || '', phone || '', alternate_phone || '', email || '', website || '',
        est_year, registration_no || '', registration_authority || '', primary_color || '#7a6130', 
        onboarding_complete ? 1 : 0, w_count, midsem, final,
        signatory_name || '', signatory_title || 'Director',
        exam_mode_default || 'Offline', pass_pct, grading_format || 'State Scale', eval_style || 'Manual', lead_days,
        attendance_mode || 'Daily', academic_year || '2026-2027', notice_language || 'en', default_notice_mode || 'digital', theme || 'dark',
        existing.id
      );
  } else {
    db.prepare(`INSERT INTO coaching_profile (
      name, tagline, address, phone, alternate_phone, email, website, established_year, 
      registration_no, registration_authority, primary_color, onboarding_complete, 
      weekly_tests_count, has_midsem, has_final, signatory_name, signatory_title,
      exam_mode_default, passing_percentage, grading_format, eval_style, notice_lead_days,
      attendance_mode, academic_year, notice_language, default_notice_mode, theme
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        name || '', tagline || '', address || '', phone || '', alternate_phone || '', email || '', website || '',
        est_year, registration_no || '', registration_authority || '', primary_color || '#7a6130', 
        onboarding_complete ? 1 : 0, w_count, midsem, final, signatory_name || '', signatory_title || 'Director',
        exam_mode_default || 'Offline', pass_pct, grading_format || 'State Scale', eval_style || 'Manual', lead_days,
        attendance_mode || 'Daily', academic_year || '2026-2027', notice_language || 'en', default_notice_mode || 'digital', theme || 'dark'
      );
  }
  logActivity('PROFILE_UPDATE', `Coaching profile updated: ${name}`);
  res.json({ success: true });
});

// POST /api/coaching/onboard-setup
router.post('/onboard-setup', (req, res) => {
  const { 
    name, tagline, address, phone, alternate_phone, email, website,
    established_year, registration_no, registration_authority,
    primary_color, weekly_tests_count, has_midsem, has_final,
    signatory_name, signatory_title, streams,
    exam_mode_default, passing_percentage, grading_format, eval_style, notice_lead_days,
    examPaths
  } = req.body;

  try {
    const runTransaction = db.transaction(() => {
      // 1. Save or Update coaching profile
      const existing = db.prepare('SELECT id FROM coaching_profile').get();
      const w_count = weekly_tests_count !== undefined ? parseInt(weekly_tests_count) : 40;
      const midsem = has_midsem !== undefined ? parseInt(has_midsem) : 1;
      const final = has_final !== undefined ? parseInt(has_final) : 1;
      const est_year = established_year ? parseInt(established_year) : null;
      const pass_pct = passing_percentage !== undefined ? parseInt(passing_percentage) : 33;
      const lead_days = notice_lead_days !== undefined ? parseInt(notice_lead_days) : 3;

      if (existing) {
        db.prepare(`UPDATE coaching_profile SET 
          name = ?, tagline = ?, address = ?, phone = ?, alternate_phone = ?, email = ?, website = ?,
          established_year = ?, registration_no = ?, registration_authority = ?, primary_color = ?,
          onboarding_complete = 1, weekly_tests_count = ?, has_midsem = ?, has_final = ?,
          signatory_name = ?, signatory_title = ?,
          exam_mode_default = ?, passing_percentage = ?, grading_format = ?, eval_style = ?, notice_lead_days = ?,
          updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`).run(
            name || '', tagline || '', address || '', phone || '', alternate_phone || '', email || '', website || '',
            est_year, registration_no || '', registration_authority || '', primary_color || '#7a6130', 
            w_count, midsem, final, signatory_name || '', signatory_title || 'Director',
            exam_mode_default || 'Offline', pass_pct, grading_format || 'State Scale', eval_style || 'Manual', lead_days,
            existing.id
          );
      } else {
        db.prepare(`INSERT INTO coaching_profile (
          name, tagline, address, phone, alternate_phone, email, website, established_year, 
          registration_no, registration_authority, primary_color, onboarding_complete, 
          weekly_tests_count, has_midsem, has_final, signatory_name, signatory_title,
          exam_mode_default, passing_percentage, grading_format, eval_style, notice_lead_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          name || '', tagline || '', address || '', phone || '', alternate_phone || '', email || '', website || '',
          est_year, registration_no || '', registration_authority || '', primary_color || '#7a6130', 
          w_count, midsem, final, signatory_name || '', signatory_title || 'Director',
          exam_mode_default || 'Offline', pass_pct, grading_format || 'State Scale', eval_style || 'Manual', lead_days
        );
      }

      // 2. Seeding Boards, Standards, and Subjects
      if (Array.isArray(streams) && streams.length > 0) {
        const gradesData = require('../data/grades.json');
        
        const getOrCreateBoard = (boardName, shortName) => {
          let b = db.prepare('SELECT id FROM boards WHERE short_name = ?').get(shortName);
          if (b) return b.id;

          const result = db.prepare('INSERT INTO boards (name, short_name, is_custom) VALUES (?, ?, 1)').run(boardName, shortName);
          const boardId = result.lastInsertRowid;

          // Seed grade scale
          const scaleKey = gradesData.boardGradeMap[shortName] || 'STATE';
          const scale = gradesData.grades[scaleKey] || gradesData.grades['STATE'];
          const insertGrade = db.prepare(`INSERT INTO grade_scales (board_id, label, min_pct, max_pct, color, result_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
          scale.forEach((g, i) => insertGrade.run(boardId, g.label, g.min_pct, g.max_pct, g.color, g.result_status, i));
          return boardId;
        };

        const createStandardAndSubjects = (boardId, stdNum, stream, displayName, subjects, streamKey) => {
          // Check duplicate
          let existingStd = db.prepare('SELECT id FROM standards WHERE board_id = ? AND standard_number = ? AND stream = ?').get(boardId, stdNum, stream);
          let standardId;
          if (existingStd) {
            standardId = existingStd.id;
          } else {
            const result = db.prepare('INSERT INTO standards (board_id, standard_number, stream, display_name) VALUES (?, ?, ?, ?)').run(boardId, stdNum, stream, displayName);
            standardId = result.lastInsertRowid;

            // Seed subjects
            const insertSubject = db.prepare(`INSERT INTO subjects (standard_id, name, max_marks, marks_type, internal_max, external_max, is_compulsory, is_language, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            subjects.forEach((s, i) => {
              insertSubject.run(
                standardId, 
                s.name, 
                s.max_marks || 100, 
                s.marks_type || 'total', 
                s.internal_max || 0, 
                s.external_max || s.max_marks || 100, 
                s.is_compulsory !== false ? 1 : 0, 
                s.is_language ? 1 : 0, 
                i
              );
            });
          }

          // Seed test cycles (exam paths) if provided
          if (examPaths && examPaths[streamKey] && Array.isArray(examPaths[streamKey])) {
            // Delete existing cycles for this standard to prevent duplication
            db.prepare('DELETE FROM test_cycles WHERE standard_id = ?').run(standardId);
            const insertCycle = db.prepare('INSERT INTO test_cycles (standard_id, title, max_marks) VALUES (?, ?, 100)');
            examPaths[streamKey].forEach(title => {
              insertCycle.run(standardId, title);
            });
          }
        };

        // Seeding individual classes 1-10
        const primarySubList = [
          { name: "English", max_marks: 100, is_language: true },
          { name: "Hindi", max_marks: 100, is_language: true },
          { name: "Mathematics", max_marks: 100 },
          { name: "Environmental Studies (EVS)", max_marks: 100 }
        ];
        const middleSubList = [
          { name: "English", max_marks: 100, is_language: true },
          { name: "Hindi", max_marks: 100, is_language: true },
          { name: "Mathematics", max_marks: 100 },
          { name: "Science", max_marks: 100 },
          { name: "Social Science", max_marks: 100 }
        ];

        // Seeding Class 1 to 5 individually
        const primaryBoardId = getOrCreateBoard('Primary School Section', 'School');
        for (let i = 1; i <= 5; i++) {
          if (streams.includes(`class_${i}`)) {
            createStandardAndSubjects(primaryBoardId, i, 'General', `Class ${i}`, primarySubList, `class_${i}`);
          }
        }

        // Seeding Class 6 to 10 individually
        const middleBoardId = getOrCreateBoard('Secondary School Section', 'School');
        for (let i = 6; i <= 10; i++) {
          if (streams.includes(`class_${i}`)) {
            createStandardAndSubjects(middleBoardId, i, 'General', `Class ${i}`, middleSubList, `class_${i}`);
          }
        }

        if (streams.includes('hsc_science')) {
          const boardId = getOrCreateBoard('HSC Higher Secondary', 'HSC');
          const pcmList = [
            { name: "English", max_marks: 100, is_language: true },
            { name: "Physics", max_marks: 100, marks_type: "split", internal_max: 30, external_max: 70 },
            { name: "Chemistry", max_marks: 100, marks_type: "split", internal_max: 30, external_max: 70 },
            { name: "Mathematics", max_marks: 100 },
            { name: "Computer Science", max_marks: 100, marks_type: "split", internal_max: 30, external_max: 70, is_compulsory: false }
          ];
          const pcbList = [
            { name: "English", max_marks: 100, is_language: true },
            { name: "Physics", max_marks: 100, marks_type: "split", internal_max: 30, external_max: 70 },
            { name: "Chemistry", max_marks: 100, marks_type: "split", internal_max: 30, external_max: 70 },
            { name: "Biology", max_marks: 100, marks_type: "split", internal_max: 30, external_max: 70 },
            { name: "Physical Education", max_marks: 100, is_compulsory: false }
          ];
          createStandardAndSubjects(boardId, 11, 'Science (PCM)', 'Class 11 Science (PCM)', pcmList, 'hsc_science_pcm');
          createStandardAndSubjects(boardId, 11, 'Science (PCB)', 'Class 11 Science (PCB)', pcbList, 'hsc_science_pcb');
          createStandardAndSubjects(boardId, 12, 'Science (PCM)', 'Class 12 Science (PCM)', pcmList, 'hsc_science_pcm');
          createStandardAndSubjects(boardId, 12, 'Science (PCB)', 'Class 12 Science (PCB)', pcbList, 'hsc_science_pcb');
        }

        if (streams.includes('hsc_commerce')) {
          const boardId = getOrCreateBoard('HSC Higher Secondary', 'HSC');
          const commList = [
            { name: "English", max_marks: 100, is_language: true },
            { name: "Accountancy", max_marks: 100 },
            { name: "Business Studies", max_marks: 100 },
            { name: "Economics", max_marks: 100 },
            { name: "Statistics", max_marks: 100 }
          ];
          createStandardAndSubjects(boardId, 11, 'Commerce', 'Class 11 Commerce', commList, 'hsc_commerce');
          createStandardAndSubjects(boardId, 12, 'Commerce', 'Class 12 Commerce', commList, 'hsc_commerce');
        }

        if (streams.includes('hsc_arts')) {
          const boardId = getOrCreateBoard('HSC Higher Secondary', 'HSC');
          const artsList = [
            { name: "English", max_marks: 100, is_language: true },
            { name: "History", max_marks: 100 },
            { name: "Geography", max_marks: 100 },
            { name: "Political Science", max_marks: 100 },
            { name: "Economics", max_marks: 100 }
          ];
          createStandardAndSubjects(boardId, 11, 'Arts', 'Class 11 Arts', artsList, 'hsc_arts');
          createStandardAndSubjects(boardId, 12, 'Arts', 'Class 12 Arts', artsList, 'hsc_arts');
        }

        if (streams.includes('jee')) {
          const boardId = getOrCreateBoard('Competitive Entrance Exams', 'Entrance');
          const jeeList = [
            { name: "Physics", max_marks: 100 },
            { name: "Chemistry", max_marks: 100 },
            { name: "Mathematics", max_marks: 100 }
          ];
          createStandardAndSubjects(boardId, 11, 'JEE Prep', '11th JEE Core', jeeList, 'jee');
          createStandardAndSubjects(boardId, 12, 'JEE Prep', '12th JEE Core', jeeList, 'jee');
          createStandardAndSubjects(boardId, 13, 'JEE Target', 'JEE Target Batch', jeeList, 'jee');
        }

        if (streams.includes('neet')) {
          const boardId = getOrCreateBoard('Competitive Entrance Exams', 'Entrance');
          const neetList = [
            { name: "Physics", max_marks: 100 },
            { name: "Chemistry", max_marks: 100 },
            { name: "Biology (Botany & Zoology)", max_marks: 200 }
          ];
          createStandardAndSubjects(boardId, 11, 'NEET Prep', '11th NEET Core', neetList, 'neet');
          createStandardAndSubjects(boardId, 12, 'NEET Prep', '12th NEET Core', neetList, 'neet');
          createStandardAndSubjects(boardId, 13, 'NEET Target', 'NEET Target Batch', neetList, 'neet');
        }

        if (streams.includes('professional')) {
          const boardId = getOrCreateBoard('Professional Courses Section', 'Professional');
          const caList = [
            { name: "Principles and Practice of Accounting", max_marks: 100 },
            { name: "Business Laws", max_marks: 100 },
            { name: "Quantitative Aptitude", max_marks: 100 },
            { name: "Business Economics", max_marks: 100 }
          ];
          const csList = [
            { name: "Jurisprudence, Interpretation & General Laws", max_marks: 100 },
            { name: "Company Law & Practice", max_marks: 100 },
            { name: "Setting Up of Business, Industrial & Labour Laws", max_marks: 100 },
            { name: "Corporate & Management Accounting", max_marks: 100 }
          ];
          createStandardAndSubjects(boardId, 14, 'CA', 'CA Foundation', caList, 'professional');
          createStandardAndSubjects(boardId, 15, 'CS', 'CS Executive', csList, 'professional');
        }
      }
    });

    runTransaction();
    logActivity('ONBOARD_SETUP', `Completed onboarding profile creation & streams seeding: ${name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/coaching/logo — handled by upload route
module.exports = router;
