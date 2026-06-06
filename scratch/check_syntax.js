const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (file.endsWith('.js')) {
      files.push(name);
    }
  }
  return files;
}

const backendFiles = getFiles(path.join(__dirname, '../backend'));
const frontendFiles = getFiles(path.join(__dirname, '../frontend/js'));
const allFiles = [...backendFiles, ...frontendFiles];

console.log(`Checking syntax of ${allFiles.length} JS files...`);
let errors = 0;

for (const file of allFiles) {
  try {
    // node -c does a syntax check without running the code
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error(`❌ Syntax error in file: ${file}`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
    errors++;
  }
}

if (errors === 0) {
  console.log('✅ All JS files passed syntax check!');
} else {
  console.log(`❌ Found ${errors} files with syntax errors.`);
}
