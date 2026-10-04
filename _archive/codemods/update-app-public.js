const fs = require('fs');
let code = fs.readFileSync('apps/web/src/App.tsx', 'utf8');

// Add import for PublicCatalog
if (!code.includes('PublicCatalog')) {
  code = code.replace(/import \{ BookCatalog \} from '.\/features\/catalog\/BookCatalog'/, "import { BookCatalog } from './features/catalog/BookCatalog'\nimport { PublicCatalog } from './features/catalog/PublicCatalog'");
}

// Replace BookCatalog on the root route with PublicCatalog
code = code.replace(/<Route path="\/" element=\{<BookCatalog \/>\} \/>/, '<Route path="/" element={<PublicCatalog />} />');

fs.writeFileSync('apps/web/src/App.tsx', code);
