const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', 'utf8');

const oldHero = `<section className="relative overflow-hidden bg-white px-6 py-24 dark:bg-zinc-900 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            Your Campus Gateway to <span className="text-[#003399] dark:text-[#FFF200]">Knowledge</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Browse thousands of books, research papers, and academic resources.
            Log in with your student account to reserve items instantly.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <div className="relative w-full max-w-xl group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-[#003399] transition-colors" />
              </div>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search books, authors, or ISBN..."
                className="block w-full rounded-full border-0 py-4 pl-12 pr-6 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-[#003399] sm:text-lg sm:leading-6 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700 transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </section>`;

const newHero = `<section className="relative bg-[#003399] px-6 py-20 dark:bg-zinc-950 sm:py-28 overflow-hidden">
        {/* Subtle background pattern to avoid flat emptiness without using glowing slop */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#FFF200 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute -right-32 -top-32 h-[30rem] w-[30rem] rounded-full border-[80px] border-[#FFF200]/10" />
        
        <div className="relative mx-auto max-w-4xl text-center z-10">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl font-display">
            Your Campus Gateway to <span className="text-[#FFF200]">Knowledge</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-100 dark:text-zinc-400">
            Browse thousands of books, research papers, and academic resources.
            Log in with your student account to reserve items instantly.
          </p>
        </div>
      </section>

      {/* Floating Search Bar Section */}
      <div className="relative z-20 mx-auto max-w-3xl -mt-8 px-4 sm:px-6">
        <div className="rounded-2xl bg-white p-2 shadow-xl shadow-black/5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-6 w-6 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search books, authors, or ISBN..."
              className="w-full rounded-xl border-0 bg-transparent py-4 pl-14 pr-4 text-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#003399] dark:text-white dark:placeholder:text-zinc-500"
            />
            <button className="hidden sm:block rounded-lg bg-[#003399] px-6 py-3 font-bold text-white hover:bg-[#002266] transition-colors dark:bg-[#FFF200] dark:text-zinc-900 dark:hover:bg-yellow-400">
              Search
            </button>
          </div>
        </div>
        
        {/* Quick Filters */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
          <span className="text-zinc-500 dark:text-zinc-400 mr-2">Popular:</span>
          {['Information Technology', 'Computer Science', 'Business', 'Engineering'].map(cat => (
            <button key={cat} onClick={() => setQuery(cat)} className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-zinc-700 hover:border-[#003399] hover:text-[#003399] transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-[#FFF200] dark:hover:text-[#FFF200]">
              {cat}
            </button>
          ))}
        </div>
      </div>`;

if (code.includes('Your Campus Gateway')) {
  code = code.replace(oldHero, newHero);
  fs.writeFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', code);
}
