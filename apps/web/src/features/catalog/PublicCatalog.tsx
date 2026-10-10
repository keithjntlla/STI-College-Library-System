import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, Book, Library } from 'lucide-react'
import { ThemeToggle } from '../theme/ThemeToggle'
import { BookCoverThumbnail } from './BookCoverThumbnail'
import { PublicBookDetailModal } from './PublicBookDetailModal'

type PublicCategory = {
  categoryId: number
  categoryName: string
  bookCount: number
}

type PublicProgram = {
  programId: number
  programName: string
  programGroup: string
}

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
  const [query, setQuery] = useState('')
  const [programId, setProgramId] = useState<number | null>(null)
  const [programs, setPrograms] = useState<PublicProgram[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [courseError, setCourseError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [books, setBooks] = useState<BookEntry[]>([])
  const [collectionTotal, setCollectionTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState('')
  const [viewAll, setViewAll] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookEntry | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/v1/public/catalog/programs')
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to fetch courses')
        return response.json()
      })
      .then((payload) => {
        if (active) setPrograms(Array.isArray(payload.data) ? payload.data : [])
      })
      .catch(() => {
        if (active) setCourseError('Courses could not be loaded. Search still works.')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const params = new URLSearchParams()
    if (programId !== null) params.set('programId', String(programId))
    const suffix = params.size ? `?${params.toString()}` : ''
    fetch(`/api/v1/public/catalog/categories${suffix}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to fetch categories')
        return response.json()
      })
      .then((payload) => {
        if (!active) return
        const next = Array.isArray(payload.data) ? payload.data as PublicCategory[] : []
        setCategories(next)
        setCategoryId((current) => (current !== null && !next.some((category) => category.categoryId === current) ? null : current))
      })
      .catch(() => {
        if (active) setCategoryError('Categories could not be loaded. Search still works.')
      })
    return () => { active = false }
  }, [programId])

  useEffect(() => {
    setPage(1)
    setViewAll(false)
  }, [query, categoryId, programId])

  useEffect(() => {
    let active = true
    const delay = setTimeout(async () => {
      setIsFetching(true)
      if (books.length === 0 && page === 1) setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20', scope: 'books' })
        if (query.trim()) params.set('q', query.trim())
        if (programId !== null) params.set('programId', String(programId))
        if (categoryId !== null) params.set('categoryId', String(categoryId))
        const url = `/api/v1/public/catalog/books?${params.toString()}`

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
            if (!query.trim() && categoryId === null && programId === null) setCollectionTotal(Number(payload.data.pagination.total))
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
  }, [query, categoryId, programId, page])


  // Auto-scroll to results when searching or viewing all
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if ((query || categoryId !== null || programId !== null || viewAll) && browseRef.current) {
      browseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [query, categoryId, programId, viewAll])

  const selectedCategory = categories.find((category) => category.categoryId === categoryId) ?? null
  const selectedProgram = programs.find((program) => program.programId === programId) ?? null

  return (
    <div className="public-surface min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-[#121219] dark:text-zinc-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-md dark:border-white/10 dark:bg-[#121219]/90">
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
          <Link to="/register" className="rounded-full bg-[#FFF200] px-5 py-2 text-sm font-bold text-[#0b5ea2] transition-colors hover:bg-yellow-400 active:scale-[0.98]">
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
        
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pb-16 pt-16 text-center">

          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <h1 className="font-display text-4xl font-black leading-none tracking-tight text-white sm:text-6xl" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.45)' }}>
              Your <span className="text-[#FFF200]">Academic Hub</span> at STI College Ormoc
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/80">
              Search the STI College Ormoc collection, then sign in to borrow a copy.
            </p>

            {/* Search Bar */}
            <div className="mt-8 flex justify-center w-full max-w-2xl">
              <div className="relative flex-1 group shadow-2xl rounded-full bg-white ring-4 ring-white/20 focus-within:ring-white/40 transition-all">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-[#0b5ea2] transition-colors" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  aria-label="Search books, authors, or subjects"
                  placeholder="Search books, authors, or subjects..."
                  className="block w-full rounded-full border-0 bg-transparent py-4 pl-14 pr-6 text-zinc-900 placeholder:text-zinc-400 focus:ring-0 dark:bg-[#22232e] dark:text-white dark:placeholder-zinc-500"
                />
                <button type="button" aria-label="Search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#FFF200] p-2.5 text-[#0b5ea2] shadow-md transition-transform duration-150 hover:bg-yellow-400 active:scale-[0.98]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </div>
            </div>

            <p className="mt-8 text-sm font-bold text-white">
              {collectionTotal === null
                ? 'Sign in to borrow.'
                : `${collectionTotal.toLocaleString()} ${collectionTotal === 1 ? 'book' : 'books'} in the collection. Sign in to borrow.`}
            </p>
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
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-zinc-50 to-transparent dark:from-[#121219]"></div>
        
        {/* Bottom fade gradient */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-zinc-50 to-transparent dark:from-[#121219]"></div>
      </div>

      <main id="browse" ref={browseRef} className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-6 py-12">
        <div className="flex flex-col justify-between gap-4 pb-5 lg:flex-row lg:items-end">
          <div>
             <h2 className="text-3xl font-black tracking-tight font-display text-zinc-900 dark:text-white">
               {query ? 'Search Results' : selectedCategory ? selectedCategory.categoryName : viewAll ? 'All Books' : 'Featured Books'}
             </h2>
             <p className="mt-1 text-zinc-500 dark:text-zinc-400">
               {query
                 ? `Showing results for "${query}"${selectedCategory ? ` in ${selectedCategory.categoryName}` : ''}${selectedProgram ? ` for ${selectedProgram.programName}` : ''}`
                 : selectedProgram
                   ? `Books linked to ${selectedProgram.programName}.`
                   : viewAll ? 'Browse the book collection.' : 'Books from the library collection.'}
             </p>
          </div>

          <div id="categories" className="flex w-full scroll-mt-24 flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
            <div className="w-full sm:w-64">
              <label htmlFor="catalog-course" className="mb-1.5 block text-sm font-bold text-zinc-800 dark:text-zinc-100">Course</label>
              <select
                id="catalog-course"
                value={programId ?? ''}
                onChange={(event) => {
                  const next = event.target.value ? Number(event.target.value) : null
                  setProgramId(Number.isSafeInteger(next) && next !== null && next > 0 ? next : null)
                  setCategoryId(null)
                }}
                className="h-11 w-full rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-900 outline-none focus:border-[#0b5ea2] focus:ring-1 focus:ring-[#0b5ea2] dark:border-white/15 dark:bg-[#22232e] dark:text-white dark:focus:border-[#FFF200] dark:focus:ring-[#FFF200]"
              >
                <option value="">All courses</option>
                {programs.map((program) => (
                  <option key={program.programId} value={program.programId}>{program.programName}</option>
                ))}
              </select>
              {courseError ? <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{courseError}</p> : null}
            </div>
            <div className="w-full sm:w-64">
              <label htmlFor="catalog-category" className="mb-1.5 block text-sm font-bold text-zinc-800 dark:text-zinc-100">Category</label>
              <select
                id="catalog-category"
                value={categoryId ?? ''}
                onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : null)}
                className="h-11 w-full rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-900 outline-none focus:border-[#0b5ea2] focus:ring-1 focus:ring-[#0b5ea2] dark:border-white/15 dark:bg-[#22232e] dark:text-white dark:focus:border-[#FFF200] dark:focus:ring-[#FFF200]"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>
                ))}
              </select>
              {categoryError ? <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{categoryError}</p> : null}
            </div>
          <div className="relative w-full sm:w-72 group flex-shrink-0 z-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-[#0b5ea2] dark:group-focus-within:text-[#FFF200] transition-colors" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search catalog"
              placeholder="Search catalog..."
              className="h-11 w-full rounded-full border border-zinc-200 bg-white pl-11 pr-4 text-sm text-zinc-900 outline-none transition-colors focus:border-[#0b5ea2] focus:ring-1 focus:ring-[#0b5ea2] dark:border-white/15 dark:bg-[#22232e] dark:text-white dark:focus:border-[#FFF200] dark:focus:ring-[#FFF200]"
            />
          </div>
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
                className="cursor-pointer group relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 transition-all duration-300 hover:shadow-xl dark:bg-[#22232e] dark:ring-white/10 sm:rounded-2xl"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#0b5ea2]">
                  <BookCoverThumbnail title={book.title} coverImagePath={book.coverImagePath} className="h-full w-full rounded-none" />
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
                className="rounded-full bg-white px-8 py-3 text-sm font-bold text-[#0b5ea2] ring-1 ring-inset ring-[#0b5ea2]/20 hover:bg-[#0b5ea2] hover:text-white hover:ring-[#0b5ea2] dark:bg-[#22232e] dark:text-[#FFF200] dark:ring-[#FFF200]/20 dark:hover:bg-[#FFF200] dark:hover:text-[#0b5ea2] dark:hover:ring-[#FFF200] transition-all shadow-sm active:scale-95"
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