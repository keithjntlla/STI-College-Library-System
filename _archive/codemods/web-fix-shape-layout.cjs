const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

const startTarget = '{/* Background shapes container for the catalog area */}';
// Replace the top-[600px] because now it will be relative to the new container!
const oldShapeContainer = '<div className="absolute inset-x-0 bottom-0 top-[600px] pointer-events-none overflow-hidden z-0">';
const newShapeContainer = '<div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">';

code = code.replace(oldShapeContainer, newShapeContainer);
code = code.replace(startTarget, '{/* Wrapper for lower page section to contain absolute shapes */}\n      <div className="relative w-full overflow-hidden">\n      ' + startTarget);

const endTarget = '<PublicBookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />';
const newEndTarget = '</div>\n      ' + endTarget;
code = code.replace(endTarget, newEndTarget);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
