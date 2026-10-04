const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// 1. Change the flex container for the main header to handle the new search box gracefully on mobile
const headerStart = `<div className="flex items-center justify-between pb-5">`;
const newHeaderStart = `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">`;
code = code.replace(headerStart, newHeaderStart);

// 2. Inject the secondary search box right after the paragraph inside the header flex container
const headerEnd = `</p>
          </div>
        </div>`;
const newHeaderEnd = `</p>
          </div>
          
          {/* Secondary Search Bar for UX convenience */}
          <div className="relative w-full sm:w-72 group flex-shrink-0 z-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-[#003399] dark:group-focus-within:text-[#FFF200] transition-colors" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search catalog..."
              className="w-full rounded-full border border-zinc-200 bg-white py-2.5 pl-11 pr-4 text-sm text-zinc-900 outline-none transition-all focus:border-[#003399] focus:ring-1 focus:ring-[#003399] dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-[#FFF200] dark:focus:ring-[#FFF200] shadow-sm"
            />
          </div>
        </div>`;
        
code = code.replace(headerEnd, newHeaderEnd);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
