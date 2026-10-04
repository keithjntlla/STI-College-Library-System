const fs = require('fs');

const content = `import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Book, Library, LayoutGrid, List, Heart, Computer, Briefcase, Stethoscope, Palette, Users, BookOpen } from 'lucide-react'
import { ThemeToggle } from '../theme/ThemeToggle'

interface BookEntry {
  titleId: string;
  title: string;
  authors: string[];
  isbn: string;
  publicationYear: number;
  categoryName: string;
  coverImagePath: string | null;
  availableCopies: number;
  totalCopies: number;
  research?: { abstract?: string } | null;
}

export function PublicCatalog() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState<BookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    let active = true
    const delay = setTimeout(async () => {
      setLoading(true)
      try {
        const url = query.trim() 
          ? \`/api/v1/public/catalog/books?q=\${encodeURIComponent(query.trim())}\` 
          : \`/api/v1/public/catalog/books\`
        
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch catalog')
        const payload = await response.json()
        if (active) setBooks(payload.data.items || [])
      } catch (err) {
        if (active) setError('Unable to load the catalog at this time.')
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => { active = false; clearTimeout(delay) }
  }, [query])

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-[#003399] dark:text-[#FFF200]">
            <Library size={28} className="fill-current" />
            <span className="font-display text-xl font-black tracking-tight">SmartLib</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            <Link to="/" className="text-[#003399] dark:text-[#FFF200] border-b-2 border-[#003399] dark:border-[#FFF200] py-5">Home</Link>
            <a href="#browse" className="hover:text-[#003399] dark:hover:text-[#FFF200]">Browse</a>
            <a href="#categories" className="hover:text-[#003399] dark:hover:text-[#FFF200]">Categories</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/login" className="hidden sm:block text-sm font-bold text-zinc-600 hover:text-[#003399] dark:text-zinc-300 dark:hover:text-[#FFF200]">
            Sign In
          </Link>
          <Link to="/login" className="rounded-full bg-[#FFF200] px-5 py-2 text-sm font-bold text-[#003399] hover:bg-yellow-400 transition-colors">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Split Hero Section */}
      <section className="relative overflow-hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:flex lg:items-center lg:justify-between lg:gap-x-10">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-lg lg:flex-shrink-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-[#FFF200]"></span> STI College Ormoc
            </div>
            <h1 className="text-5xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-7xl font-display leading-[1.1]">
              Explore <span className="text-[#003399] dark:text-[#FFF200]">Knowledge</span> Beyond the Shelves
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Discover a wide collection of books, e-resources, and learning materials available at your library. Search, explore, and start reading today.
            </p>
            <div className="mt-8 flex items-center gap-x-4">
              <div className="relative flex-1 group shadow-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-[#003399] transition-colors" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search books, authors, or subjects..."
                  className="block w-full rounded-full border-0 py-4 pl-12 pr-6 text-zinc-900 ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-[#003399] dark:bg-zinc-800 dark:text-white dark:ring-zinc-700 transition-all"
                />
              </div>
              <button className="hidden sm:block rounded-full bg-[#FFF200] px-8 py-4 font-bold text-[#003399] shadow-sm hover:bg-yellow-400 transition-colors">
                Search
              </button>
            </div>
          </div>
          
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow relative">
            <div className="absolute inset-0 bg-[#003399]/5 dark:bg-[#FFF200]/5 rounded-[3rem] transform rotate-3 scale-105"></div>
            <div className="relative mx-auto w-full max-w-lg rounded-[3rem] bg-zinc-100 p-8 dark:bg-zinc-800 shadow-xl border border-zinc-200 dark:border-zinc-700 flex flex-col gap-6 items-center justify-center min-h-[400px]">
               <Library size={120} className="text-[#003399]/20 dark:text-[#FFF200]/20" />
               <p className="text-zinc-500 font-bold text-center max-w-xs">Your academic resources securely accessible 24/7.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Icons Row */}
      <div id="categories" className="mx-auto max-w-7xl px-6 py-8 -mt-10 relative z-20">
        <div className="flex w-full items-center gap-4 overflow-x-auto rounded-3xl bg-white p-4 shadow-xl shadow-black/5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 no-scrollbar">
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
                className={\`flex min-w-[120px] flex-col items-center justify-center gap-3 rounded-2xl p-4 transition-colors \${cat.active ? 'bg-zinc-50 text-[#003399] dark:bg-zinc-800 dark:text-[#FFF200]' : 'text-zinc-600 hover:bg-zinc-50 hover:text-[#003399] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-[#FFF200]'}\`}
              >
                <Icon size={28} strokeWidth={1.5} className={cat.active ? 'text-[#003399] dark:text-[#FFF200]' : ''} />
                <span className="text-xs font-bold whitespace-nowrap">{cat.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <main id="browse" className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-center justify-between pb-5">
          <div>
             <h2 className="text-3xl font-black tracking-tight font-display text-zinc-900 dark:text-white">Featured Books</h2>
             <p className="mt-1 text-zinc-500 dark:text-zinc-400">Popular and recommended reads from our library collection.</p>
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            <p className="flex items-center gap-2 font-semibold"><Book size={18} /> {error}</p>
          </div>
        ) : loading ? (
          <div className="mt-12 flex flex-col items-center justify-center text-zinc-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[#003399]"></div>
            <p className="mt-4 text-sm font-medium">Loading catalog...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <Library className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <h3 className="mt-4 text-lg font-semibold">No books found</h3>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">We couldn't find anything matching "{query}".</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {books.map(book => (
              <article 
                key={book.titleId} 
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 transition-all duration-300 hover:shadow-xl dark:bg-zinc-900 dark:ring-zinc-800"
              >
                <div className="aspect-[3/4] w-full bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                  {book.coverImagePath ? (
                    <img src={book.coverImagePath} alt={book.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-300">
                      <Book size={48} />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <span className={\`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider \${book.availableCopies > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}\`}>
                         <span className={\`h-1.5 w-1.5 rounded-full \${book.availableCopies > 0 ? 'bg-emerald-500' : 'bg-amber-500'}\`}></span>
                         {book.availableCopies > 0 ? 'Available' : 'Waitlist'}
                       </span>
                    </div>
                    <h3 className="font-display text-lg font-bold leading-tight line-clamp-2 text-zinc-900 dark:text-white">
                      {book.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {book.authors?.join(', ') || 'Unknown'}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button 
                      onClick={() => navigate('/login', { state: { returnTo: \`/book/\${book.titleId}\` } })}
                      className="w-full text-center text-sm font-bold text-[#003399] hover:text-[#002266] dark:text-[#FFF200] dark:hover:text-yellow-400 transition-colors"
                    >
                      Log in to borrow
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
`

fs.writeFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', content);
