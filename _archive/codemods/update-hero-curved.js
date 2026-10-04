const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', 'utf8');

// We will replace the entire hero section.
const heroStart = '{/* Split Hero Section */}';
const heroEnd = '{/* Category Icons Row */}';

const startIndex = code.indexOf(heroStart);
const endIndex = code.indexOf(heroEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const before = code.substring(0, startIndex);
  const after = code.substring(endIndex);
  
  const newHero = `{/* Split Hero Section */}
      <section className="relative overflow-hidden bg-white dark:bg-zinc-950 pb-20 border-b border-zinc-200 dark:border-zinc-800">
        
        {/* Bottom Left Sweeping Curves */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full border-[80px] border-[#FFF200]/20 pointer-events-none z-0"></div>
        <div className="absolute -bottom-48 -left-16 w-[600px] h-[600px] rounded-full border-[40px] border-zinc-100 dark:border-zinc-900 pointer-events-none z-0"></div>

        {/* Right Side Curved Image Container */}
        <div className="absolute top-0 right-0 bottom-0 w-[55%] hidden lg:block overflow-hidden rounded-l-[250px] shadow-2xl z-0">
          <div className="absolute inset-0 bg-[#003399]/10 mix-blend-multiply z-10"></div>
          {/* Top Right Yellow Triangle */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#FFF200] transform rotate-45 z-20"></div>
          
          {/* We use a high-quality CSS gradient to simulate the blurred library background without the page weight of a stock photo */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/40 via-zinc-200/60 to-zinc-300/80 dark:from-zinc-800 dark:to-zinc-900 filter blur-xl scale-110"></div>
          
          {/* Blue Swoosh Edge */}
          <div className="absolute top-0 bottom-0 left-0 w-4 bg-[#003399] z-20"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pt-16 sm:pt-24 lg:flex lg:justify-between lg:gap-x-10 relative z-10">
          
          {/* Left Content Column */}
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 pt-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#FFF200]"></span> STI College Ormoc
            </div>
            <h1 className="text-5xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-7xl font-display leading-[1.05]">
              Explore <span className="text-[#003399] dark:text-[#FFF200]">Knowledge</span> Beyond the Shelves
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400 max-w-md">
              Discover a wide collection of books, e-resources, and learning materials available at your library. Search, explore, and start reading today.
            </p>
            
            {/* Search Bar */}
            <div className="mt-8 flex items-center gap-x-3 max-w-lg">
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
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500">
              <span>Trending:</span>
              {['Information Technology', 'Computer Science', 'Business', 'Fiction'].map(tag => (
                 <button key={tag} onClick={() => setQuery(tag)} className="rounded-full bg-blue-50 px-3 py-1 text-[#003399] hover:bg-blue-100 transition-colors dark:bg-blue-900/30 dark:text-blue-300">
                   {tag}
                 </button>
              ))}
            </div>

            {/* Feature Stat Blocks */}
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 max-w-lg">
               <div className="flex items-center gap-3">
                 <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800 text-[#003399] dark:text-[#FFF200]"><Book size={18} /></div>
                 <div><p className="text-xs font-black text-zinc-900 dark:text-white">Thousands of Books</p><p className="text-[10px] text-zinc-500">Print & digital</p></div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800 text-[#003399] dark:text-[#FFF200]"><Computer size={18} /></div>
                 <div><p className="text-xs font-black text-zinc-900 dark:text-white">Easy Access</p><p className="text-[10px] text-zinc-500">Anytime, anywhere</p></div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800 text-[#003399] dark:text-[#FFF200]"><Users size={18} /></div>
                 <div><p className="text-xs font-black text-zinc-900 dark:text-white">For Students</p><p className="text-[10px] text-zinc-500">Faculty & Staff</p></div>
               </div>
            </div>
          </div>
          
          {/* Right Content: Floating Book Showcase */}
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow relative hidden lg:flex items-center justify-center pr-10">
            
            {/* The Floating Book */}
            {books.length > 0 ? (
              <div className="relative flex items-center justify-center -ml-20 cursor-pointer" onClick={() => navigate('/login', { state: { returnTo: '/book/' + books[0].titleId } })}>
                {/* Book Cover */}
                <div className="relative z-20 w-[240px] aspect-[3/4] rounded-r-2xl rounded-l-md overflow-hidden shadow-[30px_30px_60px_rgba(0,0,0,0.5)] transform -rotate-6 hover:-rotate-2 transition-transform duration-500">
                  <div className="absolute left-0 inset-y-0 w-2 bg-gradient-to-r from-black/50 to-transparent z-20"></div>
                  {books[0].coverImagePath ? (
                    <img src={books[0].coverImagePath} alt="Featured Book" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white flex items-center justify-center"><Book size={64} className="text-[#003399]/30" /></div>
                  )}
                </div>
                
                {/* Floating Metadata Card (offset to the right) */}
                <div className="absolute z-10 left-[180px] top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xl rounded-2xl p-6 w-64 shadow-2xl border border-white/40 dark:bg-zinc-900/95 dark:border-zinc-700">
                  <span className="inline-block px-2.5 py-1 bg-[#FFF200] text-[#003399] text-[9px] font-black uppercase tracking-wider rounded-md mb-3">
                    Featured Book
                  </span>
                  <h3 className="text-lg font-display font-black text-zinc-900 dark:text-white line-clamp-2 leading-tight">{books[0].title}</h3>
                  <p className="text-zinc-500 text-xs mt-1 font-medium line-clamp-1">{books[0].authors?.join(', ')}</p>
                  
                  <div className="mt-3 flex items-center gap-1 text-[#FFF200]">
                    {[1,2,3,4,5].map(star => <svg key={star} className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
                    <span className="text-zinc-400 text-[10px] ml-1">4.8 (892)</span>
                  </div>
                  
                  <button className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-[#003399] py-2 text-xs font-bold text-white hover:bg-[#002266] transition-colors shadow-md">
                    Borrow Now <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-[400px] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[#003399]"></div>
              </div>
            )}
          </div>
        </div>
      </section>

      `;

  code = before + newHero + after;
  fs.writeFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', code);
  console.log('Success');
} else {
  console.log('Failed to find markers');
}
