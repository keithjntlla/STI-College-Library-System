const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// 1. Add viewAll state
const statePattern = `  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')`;
code = code.replace(statePattern, `  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')\n  const [viewAll, setViewAll] = useState(false)`);

// 2. Modify heading to be dynamic
const headingPattern = `             <h2 className="text-3xl font-black tracking-tight font-display text-zinc-900 dark:text-white">Featured Books</h2>
             <p className="mt-1 text-zinc-500 dark:text-zinc-400">Popular and recommended reads from our library collection.</p>`;
const newHeading = `             <h2 className="text-3xl font-black tracking-tight font-display text-zinc-900 dark:text-white">
               {query ? 'Search Results' : viewAll ? 'All Books' : 'Featured Books'}
             </h2>
             <p className="mt-1 text-zinc-500 dark:text-zinc-400">
               {query ? \`Showing results for "\${query}"\` : viewAll ? 'Browse our complete library collection.' : 'Popular and recommended reads from our library collection.'}
             </p>`;
code = code.replace(headingPattern, newHeading);

// 3. Render logic for books
const mapPattern = `{books.map(book => (`;
const newMap = `{(viewAll || query ? books : books.slice(0, 5)).map(book => (`;
code = code.replace(mapPattern, newMap);

// 4. Add "View All" button below the grid
const endGridPattern = `            ))}
          </div>
        )}`;
const newEndGrid = `            ))}
          </div>
        )}

        {/* View All Button */}
        {!error && !loading && !viewAll && !query && books.length > 5 && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setViewAll(true)}
              className="rounded-full bg-white px-8 py-3 text-sm font-bold text-[#003399] ring-1 ring-inset ring-[#003399]/20 hover:bg-[#003399] hover:text-white hover:ring-[#003399] dark:bg-zinc-900 dark:text-[#FFF200] dark:ring-[#FFF200]/20 dark:hover:bg-[#FFF200] dark:hover:text-[#003399] dark:hover:ring-[#FFF200] transition-all shadow-sm"
            >
              View All Books
            </button>
          </div>
        )}`;
code = code.replace(endGridPattern, newEndGrid);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
