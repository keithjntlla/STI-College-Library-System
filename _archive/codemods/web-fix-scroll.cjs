const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// 1. Add useRef to the imports
if (!code.includes('useRef')) {
  code = code.replace(/import \{([^}]+)\} from 'react'/, (match, p1) => `import { ${p1.trim()}, useRef } from 'react'`);
}

// 2. Add the ref to the component
const componentStart = 'export function PublicCatalog() {';
const refCode = `export function PublicCatalog() {
  const browseRef = useRef<HTMLElement>(null)
  
  // Auto-scroll when search query or viewAll changes
  useEffect(() => {
    if ((query || viewAll) && browseRef.current) {
      browseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [query, viewAll])
`;
code = code.replace(componentStart, refCode);

// 3. Attach the ref to the main element
const mainStart = '<main id="browse" className="mx-auto max-w-7xl px-6 py-12">';
const newMainStart = '<main id="browse" ref={browseRef} className="mx-auto max-w-7xl px-6 py-12 scroll-mt-24">';
code = code.replace(mainStart, newMainStart);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
