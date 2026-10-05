import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Book, Library, LayoutGrid, List, Heart, Computer, Briefcase, Stethoscope, Palette, Users, BookOpen } from 'lucide-react'
import { ThemeToggle } from '../theme/ThemeToggle'
import { PublicBookDetailModal } from './PublicBookDetailModal'

export interface BookEntry {
  titleId: string;
  title: string;
  authors: string[];
  isbn: string;
  publicationYear: number;
  categoryName: string;
  coverImagePath: string | null;
  availableCopies: number;
  totalCopies: number;
    synopsis?: string | null;
  research?: { abstract?: string } | null;
}

export function PublicCatalog() {
  const browseRef = useRef<HTMLElement>(null)
  

  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState<BookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [viewAll, setViewAll] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookEntry | null>(null)

  // Reset page to 1 on query change
  useEffect(() => {
    setPage(1)
    setViewAll(false)
  }, [query])

  useEffect(() => {
    let active = true
    const delay = setTimeout(async () => {
      setIsFetching(true)
      if (books.length === 0 && page === 1) setLoading(true)
      try {
        let url = `/api/v1/public/catalog/books?page=${page}&limit=20`
        if (query.trim()) url += `&q=${encodeURIComponent(query.trim())}`

        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch catalog')
        const payload = await response.json()
        
        if (active) {
          const newBooks = payload.data.items || []
          if (page === 1) {
            setBooks(newBooks)
          } else {
            setBooks(prev => {
              const existingIds = new Set(prev.map((b: any) => b.titleId))
              return [...prev, ...newBooks.filter((b: any) => !existingIds.has(b.titleId))]
            })
          }
          if (payload.data.pagination) {
            setHasMore(payload.data.pagination.page < payload.data.pagination.pages)
          } else {
            setHasMore(false)
          }
        }
      } catch (err) {
        if (active) setError('Unable to load the catalog at this time.')
      } finally {
        if (active) {
          setLoading(false)
          setIsFetching(false)
        }
      }
    }, 300)

    return () => { active = false; clearTimeout(delay) }
  }, [query, page])


  // Auto-scroll to results when searching or viewing all
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if ((query || viewAll) && browseRef.current) {
      browseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [query, viewAll])

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 text-[#0b5ea2] dark:text-[#FFF200]">
            <img src="/logo.png" alt="STI College Ormoc Logo" className="w-10 h-auto shrink-0 object-contain rounded-sm" />
            <div>
              <p className="whitespace-nowrap font-display text-[12px] font-black leading-tight tracking-tight text-zinc-900 dark:text-white">STI COLLEGE ORMOC</p>
              <p className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">ONLINE LIBRARY</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            <Link to="/" className="text-[#0b5ea2] dark:text-[#FFF200] border-b-2 border-[#0b5ea2] dark:border-[#FFF200] py-5">Home</Link>
            <a href="#browse" className="hover:text-[#0b5ea2] dark:hover:text-[#FFF200] active:scale-95 transition-transform inline-block">Browse</a>
            <a href="#categories" className="hover:text-[#0b5ea2] dark:hover:text-[#FFF200] active:scale-95 transition-transform inline-block">Categories</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/login" className="hidden sm:block text-sm font-bold text-zinc-600 hover:text-[#0b5ea2] dark:text-zinc-300 dark:hover:text-[#FFF200]">
            Sign In
          </Link>
          <Link to="/login" className="rounded-full bg-[#FFF200] px-5 py-2 text-sm font-bold text-[#0b5ea2] hover:bg-yellow-400 transition-colors">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Centered Hero Section */}
      <section className="relative overflow-hidden pb-24 border-b-4 border-[#FFF200]">
        
        {/* Background Image with Heavy Blue Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/library-hero.webp')" }}
        >
          {/* Dual Overlay: Solid blue base + gradient for depth */}
          <div className="absolute inset-0 bg-[#0b5ea2]/85 dark:bg-[#001133]/90"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b5ea2] via-transparent to-transparent opacity-80"></div>
        </div>
        
        <div className="mx-auto max-w-7xl px-6 pt-28 pb-12 relative z-10 flex flex-col items-center text-center">

          {/* Centered Content */}
          <div className="mx-auto max-w-3xl flex flex-col items-center">
            <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl font-display leading-none">
              Your <span className="text-[#FFF200]">Academic Hub</span> at STI College Ormoc
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/80 max-w-xl mx-auto">
              Discover a wide collection of books, e-resources, and learning materials available at your library. Search, explore, and start reading today.
            </p>

            {/* Search Bar */}
            <div className="mt-8 flex justify-center w-full max-w-2xl">
              <div className="relative flex-1 group shadow-2xl rounded-full bg-white ring-4 ring-white/20 focus-within:ring-white/40 transition-all">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-[#0b5ea2] transition-colors" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search books, authors, or subjects..."
                  className="block w-full rounded-full border-0 py-4 pl-14 pr-6 text-zinc-900 placeholder:text-zinc-400 focus:ring-0 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500 bg-transparent"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#FFF200] p-2.5 text-[#0b5ea2] hover:bg-yellow-400 transition-colors shadow-md">
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
                 <div><p className="text-xs font-black text-white">Thousands of Books</p><p className="text-xs text-white/60">Print & digital</p></div>
               </div>
               <div className="flex items-center text-left gap-3">
                 <div className="rounded-full bg-white/10 p-2 text-[#FFF200] border border-white/10"><Computer size={18} /></div>
                 <div><p className="text-xs font-black text-white">Easy Access</p><p className="text-xs text-white/60">Anytime, anywhere</p></div>
               </div>
               <div className="flex items-center text-left gap-3">
                 <div className="rounded-full bg-white/10 p-2 text-[#FFF200] border border-white/10"><Users size={18} /></div>
                 <div><p className="text-xs font-black text-white">For Students</p><p className="text-xs text-white/60">Faculty & Staff</p></div>
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
                   <img key={i} src={`https://covers.openlibrary.org/b/isbn/${isbn.replace('.jpg', '')}-M.jpg`} className="h-40 w-auto rounded-md shadow-xl border border-white/10" alt="Book cover" />
                ))}
                {[
                  '9780060935467.jpg', '9780062316097.jpg', '9780134610993.jpg', '9780135957059.jpg',
                  '9780201633610.jpg', '9780262033848.jpg', '9780307887894.jpg', '9780374533557.jpg',
                  '9780441172719.jpg', '9780451524935.jpg', '9780521809269.jpg', '9780702077050.jpg',
                  '9780743273565.jpg', '9781305585126.jpg'
                ].map((isbn, i) => (
                   <img key={`dup-${i}`} src={`https://covers.openlibrary.org/b/isbn/${isbn.replace('.jpg', '')}-M.jpg`} className="h-40 w-auto rounded-md shadow-xl border border-white/10" alt="Book cover" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      
      {/* Wrapper for lower page section to contain absolute shapes */}
      <div className="relative w-full overflow-hidden">
      {/* Background dot-matrix pattern for the catalog area */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle dot matrix grid */}
        <div 
          className="absolute inset-0 opacity-[0.15] dark:opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #0b5ea2 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        ></div>
        
        {/* Top fade gradient to blend smoothly with the hero */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-zinc-50 to-transparent dark:from-zinc-950"></div>
        
        {/* Bottom fade gradient */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-zinc-50 to-transparent dark:from-zinc-950"></div>
      </div>

      {/* Category Icons Row */}
      <div id="categories" className="mx-auto max-w-7xl px-6 py-8 -mt-10 relative z-20">
        
        <div className="flex w-full items-center gap-4 overflow-x-auto rounded-3xl bg-white/80 p-4 shadow-xl shadow-black/5 ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-800 no-scrollbar relative z-10 backdrop-blur-xl">
          {[
            { name: 'All Books', icon: BookOpen, active: !query },
            { name: 'Computer Science', icon: Computer, active: query === 'Computer Science' },
            { name: 'Business', icon: Briefcase, active: query === 'Business' },
            { name: 'Engineering', icon: LayoutGrid, active: query === 'Engineering' },
            { name: 'Education', icon: Users, active: query === 'Education' },
            { name: 'Health Sciences', icon: Stethoscope, active: query === 'Health Sciences' },
            { name: 'Arts & Humanities', icon: Palette, active: query === 'Arts' },
          ].map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => setQuery(cat.name === 'All Books' ? '' : cat.name)}
                className={`flex min-w-[120px] flex-col items-center justify-center gap-3 rounded-2xl p-4 transition-all duration-300 active:scale-95 ${cat.active ? 'bg-zinc-50 text-[#0b5ea2] dark:bg-zinc-800 dark:text-[#FFF200]' : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 hover:text-[#0b5ea2] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-[#FFF200]'}`}
              >
                <Icon size={28} strokeWidth={1.5} className={cat.active ? 'text-[#0b5ea2] dark:text-[#FFF200]' : ''} />
                <span className="text-xs font-bold whitespace-nowrap">{cat.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      
      <main id="browse" ref={browseRef} className="mx-auto max-w-7xl px-6 py-12 scroll-mt-24 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
          <div>
             <h2 className="text-3xl font-black tracking-tight font-display text-zinc-900 dark:text-white">
               {query ? 'Search Results' : viewAll ? 'All Books' : 'Featured Books'}
             </h2>
             <p className="mt-1 text-zinc-500 dark:text-zinc-400">
               {query ? `Showing results for "${query}"` : viewAll ? 'Browse our complete library collection.' : 'Popular and recommended reads from our library collection.'}
             </p>
          </div>
          
          {/* Secondary Search Bar for UX convenience */}
          <div className="relative w-full sm:w-72 group flex-shrink-0 z-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-[#0b5ea2] dark:group-focus-within:text-[#FFF200] transition-colors" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search catalog..."
              className="w-full rounded-full border border-zinc-200 bg-white py-2.5 pl-11 pr-4 text-sm text-zinc-900 outline-none transition-all focus:border-[#0b5ea2] focus:ring-1 focus:ring-[#0b5ea2] dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-[#FFF200] dark:focus:ring-[#FFF200] shadow-sm"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            <p className="flex items-center gap-2 font-semibold"><Book size={18} /> {error}</p>
          </div>
        ) : loading ? (
          <div className="mt-12 flex flex-col items-center justify-center text-zinc-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[#0b5ea2]"></div>
            <p className="mt-4 text-sm font-medium">Loading catalog...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <Library className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <h3 className="mt-4 text-lg font-semibold">No books found</h3>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">We couldn't find anything matching "{query}".</p>
          </div>
        ) : (
          <div className={`mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5 transition-opacity duration-300 ${isFetching ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            {(viewAll || query ? books : books.slice(0, 5)).map(book => (
              <article 
                key={book.titleId} 
                onClick={() => setSelectedBook(book)}
                className="cursor-pointer group relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 transition-all duration-300 hover:shadow-xl dark:bg-zinc-900 dark:ring-zinc-800 sm:rounded-2xl"
              >
                <div className="aspect-[3/4] w-full bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                  {book.coverImagePath ? (
                    <img src={book.coverImagePath} alt={book.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://placehold.co/400x600/f4f4f5/a1a1aa?text=${encodeURIComponent(book.title)}`; }} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-300">
                      <Book size={32} className="sm:h-12 sm:w-12" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-3 sm:p-5">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between sm:mb-2">
                       <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider sm:gap-1.5 sm:text-xs ${book.availableCopies > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                         <span className={`h-1.5 w-1.5 rounded-full ${book.availableCopies > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                         {book.availableCopies > 0 ? 'Available' : 'Waitlist'}
                       </span>
                    </div>
                    <h3 className="font-display text-sm font-bold leading-tight line-clamp-2 text-zinc-900 dark:text-white sm:text-lg">
                      {book.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 sm:mt-1 sm:text-sm">
                      {book.authors?.join(', ') || 'Unknown'}
                    </p>
                  </div>
                  <div className="mt-3 border-t border-zinc-100 pt-2.5 dark:border-zinc-800 sm:mt-5 sm:pt-4">
                    <span className="block w-full text-center text-[11px] font-bold text-[#0b5ea2] transition-colors group-hover:text-[#002266] dark:text-[#FFF200] dark:group-hover:text-yellow-400 sm:text-sm">
                      View details
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* View All / Load More Button */}
        {!error && !loading && books.length > 5 && (
          <div className="mt-12 flex justify-center">
            {(!viewAll && !query) ? (
              <button
                onClick={() => setViewAll(true)}
                className="rounded-full bg-white px-8 py-3 text-sm font-bold text-[#0b5ea2] ring-1 ring-inset ring-[#0b5ea2]/20 hover:bg-[#0b5ea2] hover:text-white hover:ring-[#0b5ea2] dark:bg-zinc-900 dark:text-[#FFF200] dark:ring-[#FFF200]/20 dark:hover:bg-[#FFF200] dark:hover:text-[#0b5ea2] dark:hover:ring-[#FFF200] transition-all shadow-sm active:scale-95"
              >
                View All Books
              </button>
            ) : hasMore ? (
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={isFetching}
                className="rounded-full bg-[#0b5ea2] px-8 py-3 text-sm font-bold text-white hover:bg-[#002266] dark:bg-[#FFF200] dark:text-[#0b5ea2] dark:hover:bg-yellow-400 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
              >
                {isFetching && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-[#0b5ea2]/30 dark:border-t-[#0b5ea2]" />}
                Load More Books
              </button>
            ) : null}
          </div>
        )}
      </main>
      </div>
      <PublicBookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />
    </div>
  )
}