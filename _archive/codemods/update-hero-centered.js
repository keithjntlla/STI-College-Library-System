const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', 'utf8');

// The replacement HTML for the entire hero section
const newHero = `{/* Centered Hero Section */}
      <section className="relative overflow-hidden bg-white dark:bg-zinc-950 pb-20 border-b border-zinc-200 dark:border-zinc-800">
        
        {/* Swiss-Modernist Geometric Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Sweeping curved blue band (bottom left to center) */}
          <div className="absolute -bottom-[40%] -left-[10%] w-[120%] h-[80%] rounded-[100%] bg-zinc-50/80 dark:bg-zinc-800/20 transform -rotate-12 border-t-[40px] border-[#003399]/5 dark:border-[#003399]/10"></div>
          
          {/* Partial circular arc (top left) */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full border-[60px] border-[#003399]/5 dark:border-[#003399]/10"></div>
          
          {/* Bright yellow corner ribbon (top right) */}
          <div className="absolute top-0 right-0 w-64 h-16 bg-[#FFF200] transform rotate-45 translate-x-1/2 -translate-y-1/2 opacity-90"></div>
          
          {/* Solid blue geometry intersecting bottom right */}
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#003399]/10 rounded-tl-[100px] dark:bg-[#FFF200]/5"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pt-24 pb-12 relative z-10 flex flex-col items-center text-center">
          
          {/* Centered Content */}
          <div className="mx-auto max-w-3xl flex flex-col items-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#FFF200]"></span> STI College Ormoc
            </div>
            <h1 className="text-5xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-7xl font-display leading-[1.05]">
              Explore <span className="text-[#003399] dark:text-[#FFF200]">Knowledge</span> Beyond the Shelves
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
              Discover a wide collection of books, e-resources, and learning materials available at your library. Search, explore, and start reading today.
            </p>
            
            {/* Search Bar */}
            <div className="mt-8 flex justify-center w-full max-w-2xl">
              <div className="relative flex-1 group shadow-lg rounded-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-[#003399] transition-colors" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search books, authors, or subjects..."
                  className="block w-full rounded-full border-0 py-4 pl-14 pr-6 text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-[#003399] dark:bg-zinc-900 dark:text-white dark:ring-zinc-700 shadow-sm transition-all"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#003399] p-2.5 text-white hover:bg-[#002266] transition-colors shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </div>
            </div>

            {/* Trending Quick Links */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-zinc-500">
              <span>Trending:</span>
              {['Information Technology', 'Computer Science', 'Business', 'Fiction'].map(tag => (
                 <button key={tag} onClick={() => setQuery(tag)} className="rounded-full bg-blue-50 px-3 py-1 text-[#003399] hover:bg-blue-100 transition-colors dark:bg-blue-900/30 dark:text-blue-300">
                   {tag}
                 </button>
              ))}
            </div>

            {/* Feature Stat Blocks */}
            <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-6 max-w-2xl">
               <div className="flex items-center text-left gap-3">
                 <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800 text-[#003399] dark:text-[#FFF200]"><Book size={18} /></div>
                 <div><p className="text-xs font-black text-zinc-900 dark:text-white">Thousands of Books</p><p className="text-[10px] text-zinc-500">Print & digital</p></div>
               </div>
               <div className="flex items-center text-left gap-3">
                 <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800 text-[#003399] dark:text-[#FFF200]"><Computer size={18} /></div>
                 <div><p className="text-xs font-black text-zinc-900 dark:text-white">Easy Access</p><p className="text-[10px] text-zinc-500">Anytime, anywhere</p></div>
               </div>
               <div className="flex items-center text-left gap-3">
                 <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800 text-[#003399] dark:text-[#FFF200]"><Users size={18} /></div>
                 <div><p className="text-xs font-black text-zinc-900 dark:text-white">For Students</p><p className="text-[10px] text-zinc-500">Faculty & Staff</p></div>
               </div>
            </div>
          </div>
        </div>
      </section>`;

const startMarker = '{/* Split Hero Section */}';
const endMarker = '</section>';
const startIndex = code.indexOf(startMarker);
const endIndex = code.lastIndexOf(endMarker, code.indexOf('{/* Category Icons Row */}'));

if (startIndex !== -1 && endIndex !== -1) {
  const before = code.substring(0, startIndex);
  const after = code.substring(endIndex + endMarker.length);
  code = before + newHero + after;
  fs.writeFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', code);
  console.log('Success');
} else {
  console.log('Failed to find markers');
}
