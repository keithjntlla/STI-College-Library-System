const fs = require('fs');
const filePath = 'C:\\Users\\Keith\\Desktop\\KEITH\\Current Projects\\Library System\\GEMINI.md';
let content = fs.readFileSync(filePath, 'utf8');

const newRule = `\n## 5. Direct Answer Mode ("ans")\n- If the user appends "ans" at the end of their prompt, the agent must provide a direct answer or explanation ONLY.\n- Do not write any code, execute any implementation steps, or make any file modifications when "ans" is present.\n`;

if (!content.includes('Direct Answer Mode')) {
  fs.writeFileSync(filePath, content + newRule);
}
