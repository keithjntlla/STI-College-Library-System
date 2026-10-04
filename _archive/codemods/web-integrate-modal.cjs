const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// 1. Export BookEntry and add synopsis
code = code.replace(
  'interface BookEntry {',
  'export interface BookEntry {'
);
if (!code.includes('synopsis?: string | null;')) {
  code = code.replace(
    'totalCopies: number;',
    'totalCopies: number;\n    synopsis?: string | null;'
  );
}

// 2. Import PublicBookDetailModal
if (!code.includes('PublicBookDetailModal')) {
  code = code.replace(
    "import { ThemeToggle } from '../theme/ThemeToggle'",
    "import { ThemeToggle } from '../theme/ThemeToggle'\nimport { PublicBookDetailModal } from './PublicBookDetailModal'"
  );
}

// 3. Add selectedBook state
if (!code.includes('selectedBook')) {
  code = code.replace(
    "const [viewAll, setViewAll] = useState(false)",
    "const [viewAll, setViewAll] = useState(false)\n  const [selectedBook, setSelectedBook] = useState<BookEntry | null>(null)"
  );
}

// 4. Make article clickable and remove old Log in button
const articleStart = `<article 
                key={book.titleId} 
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 transition-all duration-300 hover:shadow-xl dark:bg-zinc-900 dark:ring-zinc-800"
              >`;
const articleStartNew = `<article 
                key={book.titleId} 
                onClick={() => setSelectedBook(book)}
                className="cursor-pointer group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 transition-all duration-300 hover:shadow-xl dark:bg-zinc-900 dark:ring-zinc-800"
              >`;
code = code.replace(articleStart, articleStartNew);

const oldButtonArea = `<div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button 
                      onClick={() => navigate('/login', { state: { returnTo: \`/book/\${book.titleId}\`} })}
                      className="w-full text-center text-sm font-bold text-[#003399] hover:text-[#002266] dark:text-[#FFF200] dark:hover:text-yellow-400 transition-colors"
                    >
                      Log in to borrow
                    </button>
                  </div>`;
const newButtonArea = `<div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="block w-full text-center text-sm font-bold text-[#003399] group-hover:text-[#002266] dark:text-[#FFF200] dark:group-hover:text-yellow-400 transition-colors">
                      View details
                    </span>
                  </div>`;
code = code.replace(oldButtonArea, newButtonArea);

// 5. Render Modal
const endRender = `    </div>
  )
}`;
const newEndRender = `      <PublicBookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />
    </div>
  )
}`;
code = code.replace(endRender, newEndRender);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
