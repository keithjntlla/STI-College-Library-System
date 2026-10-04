const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', 'utf8');

const oldRight = `<div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow relative">
            <div className="absolute inset-0 bg-[#003399]/5 dark:bg-[#FFF200]/5 rounded-[3rem] transform rotate-3 scale-105"></div>
            <div className="relative mx-auto w-full max-w-lg rounded-[3rem] bg-zinc-100 p-8 dark:bg-zinc-800 shadow-xl border border-zinc-200 dark:border-zinc-700 flex flex-col gap-6 items-center justify-center min-h-[400px]">
               <Library size={120} className="text-[#003399]/20 dark:text-[#FFF200]/20" />
               <p className="text-zinc-500 font-bold text-center max-w-xs">Your academic resources securely accessible 24/7.</p>
            </div>
          </div>`;

const newRight = `<div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow relative hidden lg:block">
            {/* The STI Blue Anchor Shape */}
            <div className="absolute -inset-y-32 -right-[50vw] w-[200%] bg-[#003399] rounded-l-[5rem] transform rotate-3 shadow-2xl dark:bg-zinc-800/80"></div>
            <div className="absolute -inset-y-32 -right-[50vw] w-[200%] opacity-10" style={{ backgroundImage: 'radial-gradient(#FFF200 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
            
            {/* Featured Book Spotlight */}
            <div className="relative mx-auto w-full max-w-md pt-8">
              {books.length > 0 ? (
                <div className="relative flex flex-col items-center group cursor-pointer" onClick={() => navigate('/login', { state: { returnTo: '/book/' + books[0].titleId } })}>
                  {/* Glowing aura */}
                  <div className="absolute -inset-4 bg-[#FFF200]/20 rounded-3xl blur-2xl transform group-hover:scale-105 transition-transform duration-700"></div>
                  
                  {/* Book Cover */}
                  <div className="relative z-10 w-56 aspect-[3/4] rounded-r-xl rounded-l-sm overflow-hidden shadow-[20px_20px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/20 transform -rotate-6 group-hover:rotate-0 group-hover:scale-105 transition-all duration-500 ease-out">
                    {/* Book spine line */}
                    <div className="absolute left-0 inset-y-0 w-1.5 bg-gradient-to-r from-black/40 to-transparent z-20"></div>
                    {books[0].coverImagePath ? (
                      <img src={books[0].coverImagePath} alt="Featured Book" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white flex items-center justify-center"><Book size={64} className="text-[#003399]/30" /></div>
                    )}
                  </div>
                  
                  {/* Floating Metadata Card */}
                  <div className="relative z-10 -mt-6 bg-white/10 backdrop-blur-xl rounded-2xl p-5 w-[110%] border border-white/20 shadow-2xl transform group-hover:-translate-y-2 transition-transform duration-500">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF200] text-[#003399] text-[10px] font-black uppercase tracking-wider rounded-full mb-3 shadow-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#003399] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#003399]"></span>
                      </span>
                      Available to borrow
                    </span>
                    <h3 className="text-xl font-display font-bold text-white line-clamp-1">{books[0].title}</h3>
                    <p className="text-blue-100/80 text-sm mt-1">{books[0].authors?.join(', ')}</p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-[400px] flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[#FFF200]"></div>
                </div>
              )}
            </div>
          </div>`;

code = code.replace(oldRight, newRight);
fs.writeFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', code);
