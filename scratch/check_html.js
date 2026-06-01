const fs = require('fs');
const path = require('path');
const templatesDir = path.join('d:', 'coding related', 'result generator', 'result-generator', 'templates');

const tags = ['div', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'head', 'body', 'html', 'style'];

fs.readdirSync(templatesDir).filter(f => f.endsWith('.html')).forEach(file => {
  const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
  let hasError = false;
  
  tags.forEach(tag => {
    // Basic counting
    let openCount = (content.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
    let closeCount = (content.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    if (openCount !== closeCount) {
      console.log(`${file}: <${tag}> mismatch! Open: ${openCount}, Close: ${closeCount}`);
      hasError = true;
    }
  });

  if (!hasError) {
    console.log(`${file}: No basic tag mismatches found.`);
  }
});
