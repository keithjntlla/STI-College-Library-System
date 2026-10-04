const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

const badStyleStart = '<style>';
const badStyleEnd = '</style>';
const s = code.indexOf(badStyleStart);
const e = code.indexOf(badStyleEnd) + badStyleEnd.length;
if(s !== -1) {
  code = code.substring(0, s) + code.substring(e);
}

// Remove empty newlines if any left
code = code.replace(/^\s*\n/gm, '\n');

const returnStart = '    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">';
const goodStyle = `    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <style dangerouslySetInnerHTML={{__html: \`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      \`}} />`;
code = code.replace(returnStart, goodStyle);
fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
