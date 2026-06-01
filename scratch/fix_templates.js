const fs = require('fs');
const path = require('path');
const templatesDir = path.join('d:', 'coding related', 'result generator', 'result-generator', 'templates');

fs.readdirSync(templatesDir).filter(f => f.endsWith('.html')).forEach(file => {
  let content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
  
  content = content.replace(/\{\{PRIMARY_COLOR\}\}/g, 'var(--primary-color)');
  
  content = content.replace(/style="display:\{\{SHOW_SPLIT_HEADER\}\}"/g, 'class="split-col"');
  content = content.replace(/style="display:\{\{SHOW_GRADE_COL\}\}"/g, 'class="grade-col"');
  content = content.replace(/style="display:\{\{SHOW_PF_COL\}\}"/g, 'class="pf-col"');
  
  content = content.replace(/style="color:\{\{OVERALL_GRADE_COLOR\}\}"/g, 'style="color: var(--overall-grade-color);"');
  content = content.replace(/style="border-color:\{\{OVERALL_GRADE_COLOR\}\};color:\{\{OVERALL_GRADE_COLOR\}\}"/g, 'style="border-color: var(--overall-grade-color); color: var(--overall-grade-color);"');
  
  fs.writeFileSync(path.join(templatesDir, file), content);
});
console.log('Templates updated successfully!');
