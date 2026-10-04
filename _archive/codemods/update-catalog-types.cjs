const fs = require('fs');
const file = 'apps/web/src/features/catalog/book-catalog-types.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'titleId: number\n  title: string\n  author: string\n  isbn: string | null',
  'titleId: number\n  title: string\n  author: string\n  isbn: string | null\n  synopsis?: string | null'
);

fs.writeFileSync(file, code);
