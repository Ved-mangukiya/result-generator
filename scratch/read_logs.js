const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\CompuCare\\.gemini\\antigravity-ide\\brain\\49651f65-631e-4a22-9638-92262876340a\\.system_generated\\logs\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('capture_browser_console_logs') || line.includes('console_logs')) {
    // Print the line or parse it to find the log content
    try {
      const parsed = JSON.parse(line);
      console.log('--- FOUND LOG STEP ---');
      console.log(JSON.stringify(parsed, null, 2).substring(0, 3000));
    } catch (e) {
      console.log('--- MATCHING LINE (parse error) ---');
      console.log(line.substring(0, 1000));
    }
  }
});
