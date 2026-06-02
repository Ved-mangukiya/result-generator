const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '../templates');

for (let i = 1; i <= 20; i++) {
  const filename = `template${i}.html`;
  const filepath = path.join(templatesDir, filename);
  if (!fs.existsSync(filepath)) continue;
  
  const content = fs.readFileSync(filepath, 'utf8');
  console.log(`\n=== ${filename} ===`);
  
  // Find lines around footer-sign, sign-block, sign-col, or principal
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('sign-') || line.includes('sign_') || line.includes('Principal') || line.includes('Director') || line.includes('Signatory') || line.includes('Class Teacher')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}
