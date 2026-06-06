const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/js/auth.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('_obExamPaths')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
