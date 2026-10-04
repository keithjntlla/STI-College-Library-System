const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', 'utf8');

const endOfFileIndex = code.indexOf('      {/* Category Icons Row */}');
const beforeEnd = code.substring(0, endOfFileIndex);
const afterEnd = code.substring(endOfFileIndex);

// Add the missing </div> to the beforeEnd
fs.writeFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', beforeEnd + '</div>\n' + afterEnd);
