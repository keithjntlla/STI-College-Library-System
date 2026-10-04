const fs = require('fs');
let content = fs.readFileSync('../GEMINI.md', 'utf8');
const newRule = `\n## 4. Automatic Skills Usage (Pre-Check)\n- The agent must always check if any skills are suitable based on the user's prompts BEFORE formulating a plan or writing code.\n- This should be automatic. Never forget to use skills when necessary.\n- Always invoke 'view_file' on the relevant SKILL.md files to read their instructions.\n`;
if (!content.includes('Automatic Skills Usage')) {
  fs.writeFileSync('../GEMINI.md', content + newRule);
}
