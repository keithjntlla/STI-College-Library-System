const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// Insert auto-scroll useEffect right before the return statement of PublicCatalog
const renderStart = 'return (';
const autoScrollHook = `
  // Auto-scroll to results when searching or viewing all
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if ((query || viewAll) && browseRef.current) {
      browseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [query, viewAll])

  return (`;

code = code.replace(renderStart, autoScrollHook);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
