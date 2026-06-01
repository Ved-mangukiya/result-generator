const { generateSinglePDF } = require('./backend/services/pdfService');
const { db } = require('./backend/db/database');

async function run() {
  const student = db.prepare('SELECT id FROM students LIMIT 1').get();
  if (!student) {
    console.log("No student found");
    return;
  }
  for(let i=1; i<=6; i++) {
    console.log(`Generating template ${i}...`);
    try {
      const result = await generateSinglePDF(student.id, i);
      console.log(`Success: ${result.filename}`);
    } catch (e) {
      console.error(`Error on template ${i}:`, e);
    }
  }
  console.log('All tests finished.');
  process.exit(0);
}

run();
