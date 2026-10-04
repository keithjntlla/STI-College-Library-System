const fs = require('fs');
const file = 'src/features/catalog/PublicCatalog.tsx';
let code = fs.readFileSync(file, 'utf8');

const badBlock = `    // Auto-scroll to results when searching or viewing all
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

`;

code = code.replace(badBlock, '');

const insertionPoint = `  return (
    <div className="min-h-screen`;

const fixBlock = `
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

  return (
    <div className="min-h-screen`;

code = code.replace(insertionPoint, fixBlock);

fs.writeFileSync(file, code);
