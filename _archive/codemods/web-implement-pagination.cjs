const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// Add page and hasMore state
code = code.replace(
  "const [viewAll, setViewAll] = useState(false)",
  "const [viewAll, setViewAll] = useState(false)\n    const [page, setPage] = useState(1)\n    const [hasMore, setHasMore] = useState(false)"
);

// We need to reset page to 1 when query changes. Also trigger useEffect on page change.
// But we want to avoid double fetching. The easiest way is to use a single useEffect depending on query and page.
const oldEffect = `useEffect(() => {
      let active = true
      const delay = setTimeout(async () => {
        setIsFetching(true)
        if (books.length === 0) setLoading(true)
        try {
          const url = query.trim() 
            ? \`/api/v1/public/catalog/books?q=\${encodeURIComponent(query.trim())}\` 
            : \`/api/v1/public/catalog/books\`

          const response = await fetch(url)
          if (!response.ok) throw new Error('Failed to fetch catalog')
          const payload = await response.json()
          if (active) setBooks(payload.data.items || [])
        } catch (err) {
          if (active) setError('Unable to load the catalog at this time.')
        } finally {
          if (active) {
            setLoading(false)
            setIsFetching(false)
          }
        }
      }, 300)
      

    return () => { active = false; clearTimeout(delay) }
    }, [query])`;

const newEffect = `// Reset page to 1 on query change
    useEffect(() => {
      setPage(1)
      setViewAll(false)
    }, [query])

    useEffect(() => {
      let active = true
      const delay = setTimeout(async () => {
        setIsFetching(true)
        if (books.length === 0 && page === 1) setLoading(true)
        try {
          let url = \`/api/v1/public/catalog/books?page=\${page}&limit=20\`
          if (query.trim()) url += \`&q=\${encodeURIComponent(query.trim())}\`

          const response = await fetch(url)
          if (!response.ok) throw new Error('Failed to fetch catalog')
          const payload = await response.json()
          
          if (active) {
            const newBooks = payload.data.items || []
            if (page === 1) {
              setBooks(newBooks)
            } else {
              setBooks(prev => {
                // Prevent duplicates if React strict mode double-fires
                const existingIds = new Set(prev.map(b => b.titleId))
                return [...prev, ...newBooks.filter((b: any) => !existingIds.has(b.titleId))]
              })
            }
            if (payload.data.pagination) {
              setHasMore(payload.data.pagination.page < payload.data.pagination.pages)
            } else {
              setHasMore(false)
            }
          }
        } catch (err) {
          if (active) setError('Unable to load the catalog at this time.')
        } finally {
          if (active) {
            setLoading(false)
            setIsFetching(false)
          }
        }
      }, 300)
      
      return () => { active = false; clearTimeout(delay) }
    }, [query, page])`;

code = code.replace(oldEffect, newEffect);

// Fix the mapping logic (books.slice(0, 5)) 
// old: {(viewAll || query ? books : books.slice(0, 5)).map(book => (
// new: {(viewAll || query ? books : books.slice(0, 5)).map(book => (
// Actually, this is perfectly fine. If they haven't clicked viewAll, we just show 5.

// Update the View All Button to become Load More when viewAll is true.
const oldButton = `{/* View All Button */}
        {!error && !loading && !viewAll && !query && books.length > 5 && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setViewAll(true)}
              className="rounded-full bg-white px-8 py-3 text-sm font-bold text-[#003399] ring-1 ring-inset ring-[#003399]/20 hover:bg-[#003399] hover:text-white hover:ring-[#003399] dark:bg-zinc-900 dark:text-[#FFF200] dark:ring-[#FFF200]/20 dark:hover:bg-[#FFF200] dark:hover:text-[#003399] dark:hover:ring-[#FFF200] transition-all shadow-sm active:scale-95 inline-block"
            >
              View All Books
            </button>
          </div>
        )}`;

const newButton = `{/* View All / Load More Button */}
        {!error && !loading && books.length > 5 && (
          <div className="mt-12 flex justify-center">
            {(!viewAll && !query) ? (
              <button
                onClick={() => setViewAll(true)}
                className="rounded-full bg-white px-8 py-3 text-sm font-bold text-[#003399] ring-1 ring-inset ring-[#003399]/20 hover:bg-[#003399] hover:text-white hover:ring-[#003399] dark:bg-zinc-900 dark:text-[#FFF200] dark:ring-[#FFF200]/20 dark:hover:bg-[#FFF200] dark:hover:text-[#003399] dark:hover:ring-[#FFF200] transition-all shadow-sm active:scale-95"
              >
                View All Books
              </button>
            ) : hasMore ? (
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={isFetching}
                className="rounded-full bg-[#003399] px-8 py-3 text-sm font-bold text-white hover:bg-[#002266] dark:bg-[#FFF200] dark:text-[#003399] dark:hover:bg-yellow-400 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
              >
                {isFetching && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-[#003399]/30 dark:border-t-[#003399]" />}
                Load More Books
              </button>
            ) : null}
          </div>
        )}`;

// Wait, the active:scale-95 inline-block might not have been applied strictly to this button before. Let's just do a regex replace to be safe.
code = code.replace(/\{\/\* View All Button \*\/\}.*?<\/button>\s*<\/div>\s*\)\}/s, newButton);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
