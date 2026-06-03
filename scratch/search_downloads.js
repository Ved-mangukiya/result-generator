const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '../frontend/js');
const files = fs.readdirSync(jsDir);

files.forEach(file => {
  const filePath = path.join(jsDir, file);
  if (fs.statSync(filePath).isFile() && file.endsWith('.js')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('window.location') || line.includes('window.open') || line.includes('a.href')) {
        console.log(`${file}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
