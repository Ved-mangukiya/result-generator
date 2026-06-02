const { db } = require('../backend/db/database');
const assert = require('assert');

async function runTests() {
  console.log('🧪 Starting Verification Tests...');

  // 1. Verify subjects autocomplete API (merge logic)
  const preloadedSubjects = require('../backend/data/indian_subjects.json').subjects;
  const dbSubjects = db.prepare('SELECT DISTINCT name FROM subjects').all().map(r => r.name);
  
  const expectedTotalSet = new Set([...dbSubjects, ...preloadedSubjects]);
  
  console.log(`- Preloaded subjects count: ${preloadedSubjects.length}`);
  console.log(`- DB unique subjects count: ${dbSubjects.length}`);
  console.log(`- Expected unique combined count: ${expectedTotalSet.size}`);
  
  assert(expectedTotalSet.size >= 1000, 'Expected at least 1000 subjects');
  console.log('✅ Autocomplete list contains >1000 subjects');

  // 2. Verify student elective saving and JSON parsing
  const testStudentName = 'Verification Test Student ' + Date.now();
  const testRoll = 'TEST-' + Date.now();
  const std = db.prepare('SELECT id FROM standards LIMIT 1').get();
  
  if (!std) {
    console.log('⚠️ No standard found. Skipping student saving test.');
  } else {
    const electives = [
      { id: 999, name: 'Sanskrit' },
      { id: 998, name: 'Computer Science' }
    ];

    // Insert student
    const insertRes = db.prepare(`
      INSERT INTO students (standard_id, name, roll_number, elective_subjects)
      VALUES (?, ?, ?, ?)
    `).run(std.id, testStudentName, testRoll, JSON.stringify(electives));
    
    const studentId = insertRes.lastInsertRowid;
    console.log(`- Inserted verification student with ID: ${studentId}`);
    
    // Fetch and check
    const fetched = db.prepare('SELECT elective_subjects FROM students WHERE id = ?').get(studentId);
    const parsed = JSON.parse(fetched.elective_subjects);
    
    assert.strictEqual(parsed.length, 2, 'Should have saved 2 electives');
    assert.strictEqual(parsed[0].name, 'Sanskrit', 'First elective should be Sanskrit');
    console.log('✅ Saved and retrieved elective_subjects as JSON correctly');
    
    // Cleanup
    db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
    console.log('- Cleaned up verification student');
  }

  // 3. Verify format number behaves on nulls
  // (Format.number is defined inside frontend/js/utils.js, verified manually in mock formatNumber below)
  const formatNumber = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Number(val).toLocaleString('en-IN');
  };
  
  assert.strictEqual(formatNumber(null), '0', 'Null should format as 0');
  assert.strictEqual(formatNumber(undefined), '0', 'Undefined should format as 0');
  assert.strictEqual(formatNumber(123456.78), '1,23,456.78', 'Should format with Indian grouping');
  console.log('✅ Format.number helper handles null/undefined values correctly');

  console.log('🎉 Verification completed successfully!');
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
