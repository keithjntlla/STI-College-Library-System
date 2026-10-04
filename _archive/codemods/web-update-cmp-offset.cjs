const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/CatalogManagementPage.tsx', 'utf8');
code = code.replace(/className=\"fixed inset-0 z-\[999\]/g, 'className="fixed inset-0 lg:left-[var(--sidebar-offset,0px)] transition-[left] duration-300 z-[999]');
fs.writeFileSync('src/features/catalog/CatalogManagementPage.tsx', code);
