const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// 1. Fix leading-[1.05]
code = code.replace(/leading-\[1\.05\]/g, 'leading-none');

// 2. Fix text-[10px] (which appeared in stats and badges)
code = code.replace(/text-\[10px\]/g, 'text-xs');

// 3. Fix WCAG Contrast on Badges
// old: text-emerald-600 dark:text-emerald-400
// new: text-emerald-700 dark:text-emerald-400
code = code.replace(/text-emerald-600/g, 'text-emerald-700');
// old: text-amber-600 dark:text-amber-400
// new: text-amber-700 dark:text-amber-400
code = code.replace(/text-amber-600/g, 'text-amber-700');

// 4. Fix Category button text contrast (text-zinc-600 -> text-zinc-700 for better small text contrast)
code = code.replace(/text-zinc-600 hover:bg-zinc-50/g, 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900');

// 5. Remove muddy hover:shadow-md from glassmorphism buttons
code = code.replace(/hover:shadow-md /g, '');

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
