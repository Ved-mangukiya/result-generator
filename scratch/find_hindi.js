const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '../templates');
const hindiRegex = /[\u0900-\u097F]/;

for (let i = 1; i <= 20; i++) {
  const filename = `template${i}.html`;
  const filepath = path.join(templatesDir, filename);
  if (!fs.existsSync(filepath)) continue;
  
  const content = fs.readFileSync(filepath, 'utf8');
  if (hindiRegex.test(content)) {
    console.log(`⚠️ Found Devanagari characters in ${filename}`);
    // Print matching lines
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (hindiRegex.test(line)) {
        console.log(`  Line ${idx+1}: ${line.trim()}`);
      }
    });
  }
}
console.log('Search complete.');
