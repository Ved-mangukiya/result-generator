const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\\\Users\\\\CompuCare\\\\.gemini\\\\antigravity-ide\\\\brain\\\\49651f65-631e-4a22-9638-92262876340a\\\\.system_generated\\\\logs\\\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.toLowerCase().includes('null') || line.toLowerCase().includes('error') || line.toLowerCase().includes('exception')) {
    try {
      const parsed = JSON.parse(line);
      // Let's filter out some verbose output or common tool names
      if (parsed.type === 'USER_INPUT' || parsed.type === 'PLANNER_RESPONSE' || parsed.type === 'RUN_COMMAND' || parsed.type === 'BROWSER_SUBAGENT') {
        console.log(`Step ${parsed.step_index} (${parsed.type}):`);
        const contentStr = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content);
        if (contentStr && (contentStr.includes('null') || contentStr.includes('error') || contentStr.includes('loading') || contentStr.includes('setting'))) {
          console.log(contentStr.substring(0, 500));
        }
        console.log('----------------------------');
      }
    } catch (e) {
      // ignore parse error
    }
  }
});
