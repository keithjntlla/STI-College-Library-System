const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicBookDetailModal.tsx', 'utf8');

code = code.replace(/text-\[10px\]/g, 'text-xs');

fs.writeFileSync('src/features/catalog/PublicBookDetailModal.tsx', code);
