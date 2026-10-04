const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

// I will find the EXACT string and replace it. I'll use regex to be safe.
// Match from "// Auto-scroll to results" to "}, [query, viewAll])" inside the first useEffect.

const badRegex = /  \/\/ Auto-scroll to results when searching or viewing all\r?\n  const isInitialMount = useRef\(true\)\r?\n  useEffect\(\(\) => \{\r?\n    if \(isInitialMount\.current\) \{\r?\n      isInitialMount\.current = false\r?\n      return\r?\n    \}\r?\n    if \(\(query \|\| viewAll\) && browseRef\.current\) \{\r?\n      browseRef\.current\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)\r?\n    \}\r?\n  \}, \[query, viewAll\]\)\r?\n/g;

// Now let's see how many matches there are. 
const matches = code.match(badRegex);
if (matches && matches.length === 2) {
    // Replace only the FIRST one which is inside the useEffect.
    code = code.replace(matches[0], '');
}

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
