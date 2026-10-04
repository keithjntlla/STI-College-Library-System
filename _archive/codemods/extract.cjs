const fs = require('fs');
const text = fs.readFileSync('C:/Users/Keith/.gemini/antigravity/brain/f0405c8b-09cc-44a6-adf1-f29ccd4f90dd/.system_generated/logs/transcript_full.jsonl', 'utf8');
const regex = /import \{ Eye, EyeOff, IdCard, LibraryBig[\s\S]*?export function LoginPage[\s\S]*?<\/main>\\r?\\n  \)\\r?\\n\}/;
const match = text.match(regex);
if (match) {
  let content = match[0];
  content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  fs.writeFileSync('extracted.tsx', content);
  console.log('Found and extracted');
} else {
  console.log('Not found');
}
