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
  'PhysicalCopiesModal.tsx',
  'BookOverview.tsx'
];

for (const file of files) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Revert the left offset and apply padding offset
  code = code.replace(/lg:left-\[var\(--sidebar-offset,0px\)\] transition-\[left\]/g, 
                      'lg:pl-[calc(1rem+var(--sidebar-offset,0px))] transition-[padding]');
                      
  fs.writeFileSync(filePath, code);
}
console.log('Fixed modal offsets');
