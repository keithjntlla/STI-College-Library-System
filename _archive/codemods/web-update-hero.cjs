const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

const heroRegex = /\{\/\* Centered Hero Section \*\/\}([\s\S]*?)\{\/\* Category Icons Row \*\/\}/;

const newHero = `{/* Centered Hero Section */}
      <section className="relative overflow-hidden bg-[#003399] dark:bg-[#002266] pb-24 border-b-4 border-[#FFF200]">
        
        <div className="mx-auto max-w-7xl px-6 pt-28 pb-12 relative z-10 flex flex-col items-center text-center">

          {/* Centered Content */}
          <div className="mx-auto max-w-3xl flex flex-col items-center">
            <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl font-display leading-[1.05]">
              Your <span className="text-[#FFF200]">Academic Hub</span> at STI College Ormoc
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/80 max-w-xl mx-auto">
              Discover a wide collection of books, e-resources, and learning materials available at your library. Search, explore, and start reading today.
            </p>

            {/* Search Bar */}
            <div className="mt-8 flex justify-center w-full max-w-2xl">
              <div className="relative flex-1 group shadow-2xl rounded-full bg-white ring-4 ring-white/20 focus-within:ring-white/40 transition-all">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-[#003399] transition-colors" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search books, authors, or subjects..."
                  className="block w-full rounded-full border-0 py-4 pl-14 pr-6 text-zinc-900 placeholder:text-zinc-400 focus:ring-0 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500 bg-transparent"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#FFF200] p-2.5 text-[#003399] hover:bg-yellow-400 transition-colors shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </div>
            </div>

            {/* Trending Quick Links */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-white/70">
              <span>Trending:</span>
              {['Information Technology', 'Computer Science', 'Business', 'Fiction'].map(tag => (
                 <button key={tag} onClick={() => setQuery(tag)} className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20 hover:text-[#FFF200] transition-colors border border-white/10">
                   {tag}
                 </button>
              ))}
            </div>

            {/* Feature Stat Blocks */}
            <div className="mt-14 flex flex-wrap justify-center gap-x-12 gap-y-6 max-w-2xl">
               <div className="flex items-center text-left gap-3">
                 <div className="rounded-full bg-white/10 p-2 text-[#FFF200] border border-white/10"><Book size={18} /></div>
                 <div><p className="text-xs font-black text-white">Thousands of Books</p><p className="text-[10px] text-white/60">Print & digital</p></div>
               </div>
               <div className="flex items-center text-left gap-3">
                 <div className="rounded-full bg-white/10 p-2 text-[#FFF200] border border-white/10"><Computer size={18} /></div>
                 <div><p className="text-xs font-black text-white">Easy Access</p><p className="text-[10px] text-white/60">Anytime, anywhere</p></div>
               </div>
               <div className="flex items-center text-left gap-3">
                 <div className="rounded-full bg-white/10 p-2 text-[#FFF200] border border-white/10"><Users size={18} /></div>
                 <div><p className="text-xs font-black text-white">For Students</p><p className="text-[10px] text-white/60">Faculty & Staff</p></div>
               </div>
            </div>

            {/* Book Marquee */}
            <div className="mt-16 w-[100vw] relative left-1/2 -ml-[50vw] overflow-hidden py-4 opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex w-max animate-marquee gap-6 px-6">
                {[
                  '9780060935467.jpg', '9780062316097.jpg', '9780134610993.jpg', '9780135957059.jpg',
                  '9780201633610.jpg', '9780262033848.jpg', '9780307887894.jpg', '9780374533557.jpg',
                  '9780441172719.jpg', '9780451524935.jpg', '9780521809269.jpg', '9780702077050.jpg',
                  '9780743273565.jpg', '9781305585126.jpg'
                ].map((isbn, i) => (
                   <img key={i} src={\`https://covers.openlibrary.org/b/isbn/\${isbn.replace('.jpg', '')}-M.jpg\`} className="h-40 w-auto rounded-md shadow-xl border border-white/10" alt="Book cover" />
                ))}
                {[
                  '9780060935467.jpg', '9780062316097.jpg', '9780134610993.jpg', '9780135957059.jpg',
                  '9780201633610.jpg', '9780262033848.jpg', '9780307887894.jpg', '9780374533557.jpg',
                  '9780441172719.jpg', '9780451524935.jpg', '9780521809269.jpg', '9780702077050.jpg',
                  '9780743273565.jpg', '9781305585126.jpg'
                ].map((isbn, i) => (
                   <img key={\`dup-\${i}\`} src={\`https://covers.openlibrary.org/b/isbn/\${isbn.replace('.jpg', '')}-M.jpg\`} className="h-40 w-auto rounded-md shadow-xl border border-white/10" alt="Book cover" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Icons Row */}`;

code = code.replace(heroRegex, newHero);

// Now let's inject the geometric shapes into the Category Row and Main Browse section
const categoryRowStart = `<div className="flex w-full items-center gap-4 overflow-x-auto rounded-3xl bg-white p-4 shadow-xl shadow-black/5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 no-scrollbar">`;

const newCategoryRowStart = `
        {/* Geometric accent moved to categories */}
        <div className="absolute top-1/2 left-4 w-16 h-16 bg-[#FFF200] rounded-full opacity-80 transform -translate-y-1/2 -z-10 blur-xl"></div>
        <div className="flex w-full items-center gap-4 overflow-x-auto rounded-3xl bg-white p-4 shadow-xl shadow-black/5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 no-scrollbar relative z-10 backdrop-blur-md">`;

code = code.replace(categoryRowStart, newCategoryRowStart);

const mainBrowseStart = `<main id="browse" ref={browseRef} className="mx-auto max-w-7xl px-6 py-12 scroll-mt-24">`;
const newMainBrowseStart = `
      {/* Background shape for the catalog grid */}
      <div className="absolute top-[800px] -right-[20%] w-[100%] h-[120%] rounded-[100%] bg-zinc-100/50 dark:bg-zinc-900/30 transform rotate-[10deg] border-t-[80px] border-[#003399]/5 dark:border-[#003399]/10 pointer-events-none z-0"></div>
      
      <main id="browse" ref={browseRef} className="mx-auto max-w-7xl px-6 py-12 scroll-mt-24 relative z-10">`;

code = code.replace(mainBrowseStart, newMainBrowseStart);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
