const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

const shapeRegex = /\{\/\* Background shapes container for the catalog area \*\/\}[\s\S]*?<div id="categories" className="mx-auto max-w-7xl px-6 py-8 -mt-10 relative z-20">/;

const newPattern = `{/* Background dot-matrix pattern for the catalog area */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle dot matrix grid */}
        <div 
          className="absolute inset-0 opacity-[0.15] dark:opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #003399 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        ></div>
        
        {/* Top fade gradient to blend smoothly with the hero */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-zinc-50 to-transparent dark:from-zinc-950"></div>
        
        {/* Bottom fade gradient */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-zinc-50 to-transparent dark:from-zinc-950"></div>
      </div>

      {/* Category Icons Row */}
      <div id="categories" className="mx-auto max-w-7xl px-6 py-8 -mt-10 relative z-20">`;

code = code.replace(shapeRegex, newPattern);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
