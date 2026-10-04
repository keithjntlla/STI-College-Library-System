const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!code.includes('PublicCatalog')) {
  code = code.replace(
    "import { BookCatalog } from './features/catalog/BookCatalog'",
    "import { BookCatalog } from './features/catalog/BookCatalog'\nimport { PublicCatalog } from './features/catalog/PublicCatalog'"
  );
}

// Replace AuthenticatedHome with PublicCatalog for the root path
code = code.replace(
  /<Route path="\/" element=\{<AuthenticatedHome \/>\} \/>/,
  '<Route path="/" element={<PublicCatalog />} />'
);

fs.writeFileSync('src/App.tsx', code);
