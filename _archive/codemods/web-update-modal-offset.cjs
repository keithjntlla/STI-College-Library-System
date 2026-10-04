const fs = require('fs');
const path = require('path');

const dir = 'src/features/catalog';
const files = [
  'BookQuotationModal.tsx',
  'AddMultipleCopiesModal.tsx',
  'AddResearchModal.tsx',
  'ChangeTitleCategoryModal.tsx',
  'CatalogManagementPage.tsx',
  'AssetCodeModal.tsx',
  'PhysicalCopiesModal.tsx'
];

for (const file of files) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replace(/className=\"fixed inset-0 z-\[999\]/g, 'className="fixed inset-0 lg:left-[var(--sidebar-offset,0px)] transition-[left] duration-300 z-[999]');
  fs.writeFileSync(filePath, code);
}
