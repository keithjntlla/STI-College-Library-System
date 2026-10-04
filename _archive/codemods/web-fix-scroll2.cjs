const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// remove the bad block at the top
const badCode = `
  // Auto-scroll when search query or viewAll changes
  useEffect(() => {
    if ((query || viewAll) && browseRef.current) {
      browseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [query, viewAll])`;
code = code.replace(badCode, '');

// re-insert after state declarations
const searchEffect = `  useEffect(() => {
    if (!query) {
      setViewAll(false)
      return
    }
    const timer = setTimeout(() => {
      fetchBooks()
    }, 300)
    return () => clearTimeout(timer)
  }, [query])`;

const newSearchEffect = searchEffect + `

  // Auto-scroll when search query or viewAll changes
  useEffect(() => {
    if ((query || viewAll) && browseRef.current) {
      browseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [query, viewAll])
`;

code = code.replace(searchEffect, newSearchEffect);
fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
