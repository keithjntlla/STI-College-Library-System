const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// Top nav buttons
code = code.replace(
  '<a href="#browse" className="hover:text-[#003399] dark:hover:text-[#FFF200]">Browse</a>',
  '<a href="#browse" className="hover:text-[#003399] dark:hover:text-[#FFF200] active:scale-95 transition-transform inline-block">Browse</a>'
);
code = code.replace(
  '<a href="#categories" className="hover:text-[#003399] dark:hover:text-[#FFF200]">Categories</a>',
  '<a href="#categories" className="hover:text-[#003399] dark:hover:text-[#FFF200] active:scale-95 transition-transform inline-block">Categories</a>'
);

// Categories buttons
const oldCategoryClass = 'className={`flex min-w-[120px] flex-col items-center justify-center gap-3 rounded-2xl p-4 transition-colors';
const newCategoryClass = 'className={`flex min-w-[120px] flex-col items-center justify-center gap-3 rounded-2xl p-4 transition-all duration-300 active:scale-95 hover:shadow-md';
code = code.replace(oldCategoryClass, newCategoryClass);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
