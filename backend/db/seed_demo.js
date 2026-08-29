const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('./database');
const boardsData = require('../data/boards.json');
const gradesData = require('../data/grades.json');

async function seedDemoData() {
  console.log('🚀 Starting Comprehensive Demo Data Seeding for Pitch...');
  initializeDatabase();

  db.exec('PRAGMA foreign_keys = OFF;');

  // 1. Clear old demo data cleanly
  db.exec(`
    DELETE FROM test_marks;
    DELETE FROM marks;
    DELETE FROM tests;
    DELETE FROM test_cycles;
    DELETE FROM attendance;
    DELETE FROM students;
    DELETE FROM batches;
    DELETE FROM subjects;
    DELETE FROM standards;
    DELETE FROM teachers;
    DELETE FROM reminder_notices;
    DELETE FROM activity_log;
    DELETE FROM boards;
  `);
  console.log('🧹 Cleared existing data for clean demo seeding.');

  // 2. Re-seed Boards from boards.json
  const insertBoard = db.prepare('INSERT INTO boards (id, name, short_name, is_custom) VALUES (?, ?, ?, ?)');
  for (const board of boardsData.boards) {
    insertBoard.run(board.id, board.name, board.short_name, board.is_custom ? 1 : 0);
  }
  console.log(`✅ Seeded ${boardsData.boards.length} Boards (including Universities).`);

  db.exec('PRAGMA foreign_keys = ON;');

  // 3. Coaching Profile
  db.prepare(`
    UPDATE coaching_profile SET
      name = 'Apex Academy & Degree Institute',
      tagline = 'Excellence in School Coaching & University Higher Education',
      address = 'Plot 102, University Road, Near CG Road, Ahmedabad, Gujarat 380009',
      phone = '+91 98765 43210',
      alternate_phone = '+91 98765 12345',
      email = 'info@apexacademy.edu.in',
      website = 'https://apexacademy.edu.in',
      established_year = 2012,
      registration_no = 'GUJ/AHM/2012/8849',
      primary_color = '#6366f1',
      onboarding_complete = 1,
      signatory_name = 'Dr. R. K. Patel',
      signatory_title = 'Director & Principal'
    WHERE id = 1
  `).run();
  console.log('✅ Coaching Profile updated with realistic demo details.');

  // 4. Standards / Classes (School + College)
  const insertStd = db.prepare(`
    INSERT INTO standards (board_id, display_name, standard_number, stream)
    VALUES (?, ?, ?, ?)
  `);

  const std1 = insertStd.run(1, 'Class 10 CBSE (Science & Math)', 10, 'General').lastInsertRowid; // CBSE
  const std2 = insertStd.run(3, 'Class 12 GSEB (Commerce)', 12, 'Commerce').lastInsertRowid; // GSEB
  const std3 = insertStd.run(17, 'BBA Semester 1 (Management)', 1, 'Commerce').lastInsertRowid; // Gujarat University
  const std4 = insertStd.run(16, 'BCA Semester 1 (Computer Applications)', 1, 'Science').lastInsertRowid; // GTU

  console.log('✅ Created 4 Standards (Class 10 CBSE, Class 12 GSEB, BBA Sem 1, BCA Sem 1).');

  // 5. Batches
  const insertBatch = db.prepare('INSERT INTO batches (standard_id, name) VALUES (?, ?)');
  const b1 = insertBatch.run(std1, 'Morning Stars Batch').lastInsertRowid;
  const b2 = insertBatch.run(std1, 'Evening Achievers Batch').lastInsertRowid;
  const b3 = insertBatch.run(std2, 'Commerce Regular Batch').lastInsertRowid;
  const b4 = insertBatch.run(std3, 'BBA Day Division').lastInsertRowid;
  const b5 = insertBatch.run(std4, 'BCA Lab Division A').lastInsertRowid;

  // 6. Subjects per Standard
  const insertSubj = db.prepare(`
    INSERT INTO subjects (standard_id, name, max_marks, is_compulsory, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Class 10 Subjects
  const s10_1 = insertSubj.run(std1, 'Mathematics', 100, 1, 1).lastInsertRowid;
  const s10_2 = insertSubj.run(std1, 'Science & Tech', 100, 1, 2).lastInsertRowid;
  const s10_3 = insertSubj.run(std1, 'English Language', 100, 1, 3).lastInsertRowid;
  const s10_4 = insertSubj.run(std1, 'Social Science', 100, 1, 4).lastInsertRowid;

  // Class 12 GSEB Commerce Subjects
  const s12_1 = insertSubj.run(std2, 'Elements of Accounts', 100, 1, 1).lastInsertRowid;
  const s12_2 = insertSubj.run(std2, 'Business Administration', 100, 1, 2).lastInsertRowid;
  const s12_3 = insertSubj.run(std2, 'Economics', 100, 1, 3).lastInsertRowid;
  const s12_4 = insertSubj.run(std2, 'Statistics', 100, 1, 4).lastInsertRowid;

  // BBA Sem 1 Subjects
  const sbba_1 = insertSubj.run(std3, 'Principles of Management', 100, 1, 1).lastInsertRowid;
  const sbba_2 = insertSubj.run(std3, 'Financial Accounting', 100, 1, 2).lastInsertRowid;
  const sbba_3 = insertSubj.run(std3, 'Business Communication', 100, 1, 3).lastInsertRowid;
  const sbba_4 = insertSubj.run(std3, 'Micro Economics', 100, 1, 4).lastInsertRowid;

  // BCA Sem 1 Subjects
  const sbca_1 = insertSubj.run(std4, 'C Programming & Logic', 100, 1, 1).lastInsertRowid;
  const sbca_2 = insertSubj.run(std4, 'Database Systems (DBMS)', 100, 1, 2).lastInsertRowid;
  const sbca_3 = insertSubj.run(std4, 'Web Development HTML/CSS/JS', 100, 1, 3).lastInsertRowid;
  const sbca_4 = insertSubj.run(std4, 'Digital Electronics', 100, 1, 4).lastInsertRowid;

  console.log('✅ Created Subjects for School and University courses.');

  // 7. Seed Teachers / Faculty (5 Faculties)
  const hash = bcrypt.hashSync('teacher123', 10);
  const insertTeacher = db.prepare(`
    INSERT INTO teachers (name, email, phone, password_hash, assigned_standards, subjects_taught)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertTeacher.run('Dr. Rajesh K. Patel', 'rajesh.patel@apex.edu.in', '+91 98980 11223', hash, `${std1},${std3}`, 'Mathematics, Principles of Management');
  insertTeacher.run('Prof. Meera Shah', 'meera.shah@apex.edu.in', '+91 98980 22334', hash, `${std2},${std3}`, 'Elements of Accounts, Financial Accounting');
  insertTeacher.run('Er. Amit Trivedi', 'amit.trivedi@apex.edu.in', '+91 98980 33445', hash, `${std4}`, 'C Programming, DBMS, Web Development');
  insertTeacher.run('Dr. Sunita Sharma', 'sunita.sharma@apex.edu.in', '+91 98980 44556', hash, `${std1},${std4}`, 'Science & Tech, Digital Electronics');
  insertTeacher.run('Prof. Hardik Joshi', 'hardik.joshi@apex.edu.in', '+91 98980 55667', hash, `${std2},${std3}`, 'Business Administration, Communication');

  console.log('✅ Created 5 Faculty Members.');

  // 8. Seed 50 Students (Realistic Indian & Gujarati Names)
  const studentNames = [
    { first: 'Aarav', surname: 'Patel', std: std1, b: b1, roll: '101', f: 'Ramesh Patel', m: 'Geetaben Patel' },
    { first: 'Diya', surname: 'Shah', std: std1, b: b1, roll: '102', f: 'Ketan Shah', m: 'Bhavnaben Shah' },
    { first: 'Yash', surname: 'Mehta', std: std1, b: b1, roll: '103', f: 'Sanjay Mehta', m: 'Neelamben Mehta' },
    { first: 'Ananya', surname: 'Sharma', std: std1, b: b1, roll: '104', f: 'Rajesh Sharma', m: 'Sunitaben Sharma' },
    { first: 'Hetvi', surname: 'Joshi', std: std1, b: b1, roll: '105', f: 'Pankaj Joshi', m: 'Manishaben Joshi' },
    { first: 'Jayesh', surname: 'Parmar', std: std1, b: b2, roll: '106', f: 'Dinesh Parmar', m: 'Kavita Parmar' },
    { first: 'Rohan', surname: 'Trivedi', std: std1, b: b2, roll: '107', f: 'Mahesh Trivedi', m: 'Alpa Trivedi' },
    { first: 'Priya', surname: 'Varma', std: std1, b: b2, roll: '108', f: 'Vikram Varma', m: 'Sunita Varma' },
    { first: 'Devang', surname: 'Solanki', std: std1, b: b2, roll: '109', f: 'Bharat Solanki', m: 'Hansaben Solanki' },
    { first: 'Tanvi', surname: 'Bhatt', std: std1, b: b2, roll: '110', f: 'Harshad Bhatt', m: 'Rekhaben Bhatt' },

    { first: 'Kaviraj', surname: 'Jadeja', std: std2, b: b3, roll: '201', f: 'Rajendrasinh Jadeja', m: 'Gyanshaba Jadeja' },
    { first: 'Mansi', surname: 'Chawla', std: std2, b: b3, roll: '202', f: 'Deepak Chawla', m: 'Poonam Chawla' },
    { first: 'Pooja', surname: 'Desai', std: std2, b: b3, roll: '203', f: 'Nitin Desai', m: 'Smitaben Desai' },
    { first: 'Niharika', surname: 'Dave', std: std2, b: b3, roll: '204', f: 'Sharad Dave', m: 'Vandanaben Dave' },
    { first: 'Vivek', surname: 'Zala', std: std2, b: b3, roll: '205', f: 'Kirit Zala', m: 'Kokanaben Zala' },
    { first: 'Rahul', surname: 'Chauhan', std: std2, b: b3, roll: '206', f: 'Gautam Chauhan', m: 'Dharaben Chauhan' },
    { first: 'Sneha', surname: 'Kothari', std: std2, b: b3, roll: '207', f: 'Pravin Kothari', m: 'Mayuriben Kothari' },
    { first: 'Hardik', surname: 'Vaghela', std: std2, b: b3, roll: '208', f: 'Sureshbhai Vaghela', m: 'Saraswatiben Vaghela' },
    { first: 'Janvi', surname: 'Modi', std: std2, b: b3, roll: '209', f: 'Kamlesh Modi', m: 'Hemangini Modi' },
    { first: 'Manan', surname: 'Gala', std: std2, b: b3, roll: '210', f: 'Chandresh Gala', m: 'Shilpaben Gala' },

    { first: 'Vraj', surname: 'Shah', std: std3, b: b4, roll: 'BBA-01', f: 'Parag Shah', m: 'Sheetal Shah' },
    { first: 'Riya', surname: 'Patel', std: std3, b: b4, roll: 'BBA-02', f: 'Ashok Patel', m: 'Sonal Patel' },
    { first: 'Devansh', surname: 'Trivedi', std: std3, b: b4, roll: 'BBA-03', f: 'Upendra Trivedi', m: 'Bhavani Trivedi' },
    { first: 'Ishita', surname: 'Mehta', std: std3, b: b4, roll: 'BBA-04', f: 'Rajiv Mehta', m: 'Kinjal Mehta' },
    { first: 'Harsh', surname: 'Panchal', std: std3, b: b4, roll: 'BBA-05', f: 'Babulal Panchal', m: 'Sarojben Panchal' },
    { first: 'Kirti', surname: 'Rathod', std: std3, b: b4, roll: 'BBA-06', f: 'Pratapsinh Rathod', m: 'Mangalaben Rathod' },
    { first: 'Shlok', surname: 'Jani', std: std3, b: b4, roll: 'BBA-07', f: 'Hemant Jani', m: 'Jayshree Jani' },
    { first: 'Bhavya', surname: 'Soni', std: std3, b: b4, roll: 'BBA-08', f: 'Girish Soni', m: 'Kokila Soni' },
    { first: 'Dhwani', surname: 'Vora', std: std3, b: b4, roll: 'BBA-09', f: 'Samir Vora', m: 'Rita Vora' },
    { first: 'Aayush', surname: 'Kapadia', std: std3, b: b4, roll: 'BBA-10', f: 'Tushar Kapadia', m: 'Bela Kapadia' },
    { first: 'Kavyan', surname: 'Merchant', std: std3, b: b4, roll: 'BBA-11', f: 'Hitesh Merchant', m: 'Ami Merchant' },
    { first: 'Khushi', surname: 'Sanghvi', std: std3, b: b4, roll: 'BBA-12', f: 'Chetan Sanghvi', m: 'Varsha Sanghvi' },
    { first: 'Dhruv', surname: 'Thakar', std: std3, b: b4, roll: 'BBA-13', f: 'Gaurang Thakar', m: 'Nayani Thakar' },
    { first: 'Avani', surname: 'Upadhyay', std: std3, b: b4, roll: 'BBA-14', f: 'Mukesh Upadhyay', m: 'Sandhyaben Upadhyay' },
    { first: 'Tirth', surname: 'Sheth', std: std3, b: b4, roll: 'BBA-15', f: 'Navin Sheth', m: 'Jyoti Sheth' },

    { first: 'Siddharth', surname: 'Patel', std: std4, b: b5, roll: 'BCA-01', f: 'Virendra Patel', m: 'Nirmala Patel' },
    { first: 'Meera', surname: 'Desai', std: std4, b: b5, roll: 'BCA-02', f: 'Sunil Desai', m: 'Pallavi Desai' },
    { first: 'Pranav', surname: 'Dave', std: std4, b: b5, roll: 'BCA-03', f: 'Anand Dave', m: 'Pratibha Dave' },
    { first: 'Kavya', surname: 'Joshi', std: std4, b: b5, roll: 'BCA-04', f: 'Bhaskar Joshi', m: 'Hemlataben Joshi' },
    { first: 'Naman', surname: 'Shah', std: std4, b: b5, roll: 'BCA-05', f: 'Vijay Shah', m: 'Nitinaben Shah' },
    { first: 'Aastha', surname: 'Chaudhary', std: std4, b: b5, roll: 'BCA-06', f: 'Laljibhai Chaudhary', m: 'Gauri Chaudhary' },
    { first: 'Sujal', surname: 'Mistry', std: std4, b: b5, roll: 'BCA-07', f: 'Kishore Mistry', m: 'Urmila Mistry' },
    { first: 'Charmi', surname: 'Raval', std: std4, b: b5, roll: 'BCA-08', f: 'Dharmendra Raval', m: 'Bhavinaben Raval' },
    { first: 'Umesh', surname: 'Gohil', std: std4, b: b5, roll: 'BCA-09', f: 'Mahipatsinh Gohil', m: 'Hansaba Gohil' },
    { first: 'Tanya', surname: 'Malhotra', std: std4, b: b5, roll: 'BCA-10', f: 'Sanjeev Malhotra', m: 'Neetu Malhotra' },
    { first: 'Rudra', surname: 'Pandya', std: std4, b: b5, roll: 'BCA-11', f: 'Nilesh Pandya', m: 'Minakshi Pandya' },
    { first: 'Jainam', surname: 'Parikh', std: std4, b: b5, roll: 'BCA-12', f: 'Biren Parikh', m: 'Nidhi Parikh' },
    { first: 'Zeel', surname: 'Gadhvi', std: std4, b: b5, roll: 'BCA-13', f: 'Devraj Gadhvi', m: 'Lilaben Gadhvi' },
    { first: 'Yatri', surname: 'Shukla', std: std4, b: b5, roll: 'BCA-14', f: 'Subhash Shukla', m: 'Aarti Shukla' },
    { first: 'Karan', surname: 'Rana', std: std4, b: b5, roll: 'BCA-15', f: 'Vikramsinh Rana', m: 'Pushpaba Rana' }
  ];

  const insertStudent = db.prepare(`
    INSERT INTO students (
      standard_id, batch_id, name, first_name, surname, roll_number, father_name, mother_name, dob, status, attendance_pct, remarks, total_fees, paid_fees
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, 35000, 25000)
  `);

  const studentIds = [];
  const insertManyStudents = db.transaction(() => {
    for (const s of studentNames) {
      const fullName = `${s.first} ${s.surname}`;
      const attPct = (75 + Math.random() * 23).toFixed(1);
      const res = insertStudent.run(
        s.std, s.b, fullName, s.first, s.surname, s.roll, s.f, s.m, '2008-06-15', attPct, 'Consistent performer. Regular attendance.'
      );
      studentIds.push({ id: res.lastInsertRowid, std: s.std, b: s.b, name: fullName });
    }
  });
  insertManyStudents();
  console.log(`✅ Seeded ${studentNames.length} Students across all classes.`);

  // 9. Create 5 Tests (Filled Marks & Pending Marks)
  const insertTest = db.prepare(`
    INSERT INTO tests (standard_id, batch_id, subject_id, name, max_marks, test_date, notice_generated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Test 1: Class 10 Mathematics Unit Test (FILLED)
  const t1 = insertTest.run(std1, b1, s10_1, 'Class 10 Unit Test 1 — Algebra & Trigonometry', 100, '2026-08-01', 1).lastInsertRowid;
  
  // Test 2: Class 12 Accounts Mid-Term (FILLED)
  const t2 = insertTest.run(std2, b3, s12_1, 'Class 12 Accounts Mid-Term Board Exam', 100, '2026-08-05', 1).lastInsertRowid;

  // Test 3: BBA Sem 1 Financial Accounting Internal (FILLED)
  const t3 = insertTest.run(std3, b4, sbba_2, 'BBA Sem 1 Financial Accounting Mid-Sem', 100, '2026-08-10', 1).lastInsertRowid;

  // Test 4: BCA Sem 1 C Programming Practical (PENDING MARKS — Ready for Demo)
  const t4 = insertTest.run(std4, b5, sbca_1, 'BCA Sem 1 C Programming Lab Practical Test', 100, '2026-08-14', 0).lastInsertRowid;

  // Test 5: Class 10 Science Weekly Assessment (PENDING MARKS — Ready for Demo)
  const t5 = insertTest.run(std1, b2, s10_2, 'Class 10 Science & Tech Weekly Assessment', 50, '2026-08-15', 0).lastInsertRowid;

  console.log('✅ Created 5 Tests (3 Completed, 2 Pending Marks for live entry demonstration).');

  // 10. Fill Marks for Tests 1, 2, and 3 into test_marks AND marks table
  const insertTestMark = db.prepare(`
    INSERT INTO test_marks (test_id, student_id, obtained_marks, is_absent, remarks)
    VALUES (?, ?, ?, 0, 'Good effort')
  `);

  const insertGeneralMark = db.prepare(`
    INSERT OR REPLACE INTO marks (student_id, subject_id, total_marks)
    VALUES (?, ?, ?)
  `);

  const insertMarksBatch = db.transaction(() => {
    studentIds.forEach(st => {
      if (st.std === std1) {
        // Test 1 Marks
        const score = Math.floor(45 + Math.random() * 52);
        insertTestMark.run(t1, st.id, score);
        insertGeneralMark.run(st.id, s10_1, score);
        insertGeneralMark.run(st.id, s10_2, Math.floor(50 + Math.random() * 45));
        insertGeneralMark.run(st.id, s10_3, Math.floor(60 + Math.random() * 35));
        insertGeneralMark.run(st.id, s10_4, Math.floor(55 + Math.random() * 40));
      } else if (st.std === std2) {
        // Test 2 Marks
        const score = Math.floor(50 + Math.random() * 47);
        insertTestMark.run(t2, st.id, score);
        insertGeneralMark.run(st.id, s12_1, score);
        insertGeneralMark.run(st.id, s12_2, Math.floor(55 + Math.random() * 40));
        insertGeneralMark.run(st.id, s12_3, Math.floor(60 + Math.random() * 35));
        insertGeneralMark.run(st.id, s12_4, Math.floor(50 + Math.random() * 45));
      } else if (st.std === std3) {
        // Test 3 Marks
        const score = Math.floor(55 + Math.random() * 43);
        insertTestMark.run(t3, st.id, score);
        insertGeneralMark.run(st.id, sbba_1, Math.floor(60 + Math.random() * 35));
        insertGeneralMark.run(st.id, sbba_2, score);
        insertGeneralMark.run(st.id, sbba_3, Math.floor(65 + Math.random() * 30));
        insertGeneralMark.run(st.id, sbba_4, Math.floor(55 + Math.random() * 40));
      } else if (st.std === std4) {
        insertGeneralMark.run(st.id, sbca_1, Math.floor(58 + Math.random() * 38));
        insertGeneralMark.run(st.id, sbca_2, Math.floor(62 + Math.random() * 32));
        insertGeneralMark.run(st.id, sbca_3, Math.floor(70 + Math.random() * 25));
        insertGeneralMark.run(st.id, sbca_4, Math.floor(52 + Math.random() * 40));
      }
    });
  });
  insertMarksBatch();
  console.log('✅ Populated test scores and subject marksheets.');

  // 11. Seed Attendance for Students
  const insertAttendance = db.prepare(`
    INSERT INTO attendance (student_id, standard_id, batch_id, attendance_date, status, marked_by)
    VALUES (?, ?, ?, ?, ?, 'Admin')
  `);

  const dates = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13'];
  const insertAttBatch = db.transaction(() => {
    studentIds.forEach(st => {
      dates.forEach(d => {
        const status = Math.random() > 0.1 ? 'Present' : 'Absent';
        insertAttendance.run(st.id, st.std, st.b, d, status);
      });
    });
  });
  insertAttBatch();
  console.log('✅ Seeded past attendance logs.');

  // 12. Seed Saved Notices & Reminders (Multi-Lingual)
  const insertNotice = db.prepare(`
    INSERT INTO reminder_notices (type, title, content_json, target, status, published_at)
    VALUES (?, ?, ?, 'All', 'Published', ?)
  `);

  const today = new Date().toISOString().split('T')[0];
  insertNotice.run('sem_exam', '🎓 University Semester Examination & Hall Ticket Notice', JSON.stringify({
    title: '🎓 University Semester Examination & Hall Ticket Notice',
    message: 'The University Semester Examinations are scheduled. Download and collect your Hall Tickets / Admit Cards from the college office.'
  }), today);

  insertNotice.run('vacation', '🌴 વેકેશન જાહેરનામું — રજાઓની સત્તાવાર નોટિસ', JSON.stringify({
    title: '🌴 વેકેશન જાહેરનામું — રજાઓની સત્તાવાર નોટિસ',
    message: 'વાલીઓ અને વિદ્યાર્થીઓ જોગ, જણાવેલ તારીખો દરમિયાન સંસ્થામાં વેકેશનની રજા રહેશે. વર્ગો નિયમિત તારીખથી ફરી શરૂ થશે.'
  }), today);

  insertNotice.run('ptm', '🎓 अभिभावक-शिक्षक बैठक (PTM) निमंत्रण', JSON.stringify({
    title: '🎓 अभिभावक-शिक्षक बैठक (PTM) निमंत्रण',
    message: 'आदरणीय अभिभावक, अपने बच्चे की शैक्षणिक प्रगति पर चर्चा हेतु पीटीएम में सादर आमंत्रित हैं।'
  }), today);

  insertNotice.run('campus_placement', '💼 Campus Placement Drive & Internship Notice', JSON.stringify({
    title: '💼 Campus Placement Drive & Internship Notice',
    message: 'A campus recruitment drive is organized for final-year students. Submit your updated resumes at the Placement Cell.'
  }), today);

  console.log('✅ Seeded Multi-Lingual Saved Notices in English, Hindi & Gujarati.');

  // 13. Activity Log
  const insertActivity = db.prepare('INSERT INTO activity_log (action, description) VALUES (?, ?)');
  insertActivity.run('System Seed', 'Loaded 50 Demo Students, 5 Tests, and Multi-Lingual Notices for Pitch Demo.');
  insertActivity.run('Marks Updated', 'Updated Class 10 Math Unit Test marks.');
  insertActivity.run('Notice Published', 'Published University Semester Exam & Hall Ticket Notice.');

  console.log('🎉 Pitch Demo Seeding Complete! Website is now fully populated!');
  process.exit(0);
}

seedDemoData().catch(err => {
  console.error('❌ Demo seeding failed:', err);
  process.exit(1);
});
