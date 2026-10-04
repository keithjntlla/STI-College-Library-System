const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// Add isFetching state
code = code.replace(
  "const [loading, setLoading] = useState(true)",
  "const [loading, setLoading] = useState(true)\n  const [isFetching, setIsFetching] = useState(false)"
);

// Update useEffect to use isFetching
code = code.replace(
  /const delay = setTimeout\(async \(\) => \{\s*setLoading\(true\)/,
  `const delay = setTimeout(async () => {
      setIsFetching(true)
      if (books.length === 0) setLoading(true)`
);

// Update finally block
code = code.replace(
  /\} finally \{\s*if \(active\) setLoading\(false\)\s*\}/,
  `} finally {
        if (active) {
          setLoading(false)
          setIsFetching(false)
        }
      }`
);

// Update the grid wrapper to use isFetching
const oldGrid = '<div className="mt-8 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">';
const newGrid = '<div className={`mt-8 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 transition-opacity duration-300 ${isFetching ? "opacity-40 pointer-events-none" : "opacity-100"}`}>';

code = code.replace(oldGrid, newGrid);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
