const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/CatalogManagementPage.tsx', 'utf8');
code = code.replace('overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm', 'rounded-xl border border-zinc-200 bg-white shadow-sm');
code = code.replace('<div className="overflow-x-auto">', '<div>');
fs.writeFileSync('src/features/catalog/CatalogManagementPage.tsx', code);
