const fs = require('fs');
const path = require('path');

function searchFile(filepath, keywords) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== Search results for ${path.basename(filepath)} ===`);
  lines.forEach((line, idx) => {
    const matched = keywords.every(kw => line.toLowerCase().includes(kw.toLowerCase()));
    if (matched) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}

const dashboardJsPath = path.join(__dirname, '../frontend/js/dashboard.js');
searchFile(dashboardJsPath, ['calendar']);
searchFile(dashboardJsPath, ['holiday']);
searchFile(dashboardJsPath, ['festiv']);
