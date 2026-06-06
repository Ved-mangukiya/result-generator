const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '../frontend/js');
const files = fs.readdirSync(jsDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(jsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes('setting') || line.toLowerCase().includes('null')) {
        console.log(`${file}:${idx + 1}: ${line.trim().substring(0, 120)}`);
      }
    });
  }
});
