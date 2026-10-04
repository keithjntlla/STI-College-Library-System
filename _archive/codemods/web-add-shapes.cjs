const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

const regexOldShape = /\{\/\* Background shape for the catalog grid \*\/\}[\s\S]*?<main id="browse"/;

code = code.replace(regexOldShape, '<main id="browse"');

const catRegex = /\{\/\* Category Icons Row \*\/\}\s*<div id="categories" className="mx-auto max-w-7xl px-6 py-8 -mt-10 relative z-20">/;

const shapesAndCat = `
      {/* Background shapes container for the catalog area */}
      <div className="absolute inset-x-0 bottom-0 top-[600px] pointer-events-none overflow-hidden z-0">
         {/* Sweeping curved blue band */}
         <div className="absolute top-0 -left-[10%] w-[120%] h-[80%] rounded-[100%] bg-white/50 dark:bg-zinc-800/20 transform -rotate-6 border-t-[40px] border-[#003399]/5 dark:border-[#003399]/10"></div>

         {/* Partial circular arc (top left of this section) */}
         <div className="absolute top-20 -left-32 w-96 h-96 rounded-full border-[60px] border-[#003399]/5 dark:border-[#003399]/10"></div>
         
         {/* Yellow circle accent (near All Books) */}
         <div className="absolute top-[80px] left-[5%] w-24 h-24 bg-[#FFF200] rounded-full opacity-60 blur-3xl"></div>

         {/* Solid yellow circle accent */}
         <div className="absolute top-[180px] left-[3%] w-12 h-12 bg-[#FFF200] rounded-full opacity-80"></div>

         {/* Sweeping yellow curve */}
         <div className="absolute top-[40%] -right-[15%] w-[130%] h-[85%] rounded-[100%] bg-zinc-100/50 transform rotate-[15deg] border-t-[60px] border-[#FFF200]/20 dark:border-[#FFF200]/10"></div>

         {/* Bright yellow corner ribbon */}
         <div className="absolute top-1/2 right-0 w-64 h-16 bg-[#FFF200] transform rotate-45 translate-x-1/2 -translate-y-1/2 opacity-90"></div>

         {/* Solid blue geometry intersecting bottom left */}
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#003399]/10 rounded-tr-[100px] dark:bg-[#003399]/20"></div>

         {/* Bright yellow geometry bottom left */}
         <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#FFF200] rounded-tr-[60px] opacity-90 transform rotate-12"></div>
      </div>

      {/* Category Icons Row */}
      <div id="categories" className="mx-auto max-w-7xl px-6 py-8 -mt-10 relative z-20">`;

code = code.replace(catRegex, shapesAndCat);

// Clean up the `blur-xl` that I injected on the category row earlier, as it might conflict with the new blur-3xl shape
const oldCatShape = /\{\/\* Geometric accent moved to categories \*\/\}[\s\S]*?<div className="flex w-full items-center gap-4 overflow-x-auto rounded-3xl bg-white p-4 shadow-xl shadow-black\/5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 no-scrollbar relative z-10 backdrop-blur-md">/;
const newCatShape = `<div className="flex w-full items-center gap-4 overflow-x-auto rounded-3xl bg-white/80 p-4 shadow-xl shadow-black/5 ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-800 no-scrollbar relative z-10 backdrop-blur-xl">`;

code = code.replace(oldCatShape, newCatShape);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
