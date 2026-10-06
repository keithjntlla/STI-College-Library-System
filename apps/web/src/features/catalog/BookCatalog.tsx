import { BookOpen, ChevronLeft, ChevronRight, Eye, LayoutGrid, List, MapPin, RefreshCw, ShoppingBag } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { StatusModal } from '../../components/ui'
import { getCurrentClaims } from '../auth/auth-storage'
import { BookOverview } from './BookOverview'
import { fetchBookCatalog, fetchCatalogPrograms, reserveBookTitle } from './book-catalog-api'
import { catalogActionLabel, STUDENT_BOOK_LIMIT, validateBookCartAddition, validateStudentBookCommitment } from './book-cart'
import { useBookCart } from './book-cart-store'
import type { BookCatalogItem, BookCatalogViewer, CatalogProgram, Pagination } from './book-catalog-types'
import { BookCoverThumbnail } from './BookCoverThumbnail'
import { CatalogAvailabilityBadge } from './CatalogAvailabilityBadge'
import { CategoryFilterSearchBar } from './CategoryFilterSearchBar'
import { assertCatalogItemCanEnterLoanCart } from './catalog-cart-policy'

const EMPTY_PAGINATION: Pagination = { page: 1, limit: 24, total: 0, totalPages: 0 }

export function BookCatalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const claims = getCurrentClaims()
  const [query, setQuery] = useState(() => searchParams.get('query')?.trim() ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get('query')?.trim() ?? '')
  const [programId, setProgramId] = useState<number | null>(null)
  const [programs, setPrograms] = useState<CatalogProgram[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sort, setSort] = useState<'available_first' | 'title'>('available_first')
  const [page, setPage] = useState(1)
  const [books, setBooks] = useState<BookCatalogItem[]>([])
  const [viewer, setViewer] = useState<BookCatalogViewer>({ role: claims?.role ?? 'Student', activeBookCount: 0, bookLimit: 2 })
  const [pagination, setPagination] = useState(EMPTY_PAGINATION)
  const [selectedTitleId, setSelectedTitleId] = useState<number | null>(null)
  const { items: cart, addItem } = useBookCart()
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [reserving, setReserving] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [limitWarning, setLimitWarning] = useState('')
  const [notice, setNotice] = useState<ReactNode>(null)
  const hasBooksRef = useRef(false)

  useEffect(() => {
    const requested = Number(searchParams.get('titleId'))
    if (Number.isSafeInteger(requested) && requested > 0) setSelectedTitleId(requested)
    const incomingQuery = searchParams.get('query')?.trim()
    if (incomingQuery) {
      setQuery(incomingQuery)
      setDebouncedQuery(incomingQuery)
    }
  }, [searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    fetchCatalogPrograms(controller.signal)
      .then((rows) => { if (!controller.signal.aborted) setPrograms(rows) })
      .catch(() => { if (!controller.signal.aborted) setPrograms([]) })
    return () => controller.abort()
  }, [])

  const loadBooks = useCallback(async (signal?: AbortSignal) => {
    const soft = hasBooksRef.current
    if (soft) setIsFetching(true)
    else setLoading(true)
    setError('')
    try {
      const result = await fetchBookCatalog({
        query: debouncedQuery,
        categoryId: categoryId ?? undefined,
        programId: programId ?? undefined,
        availableOnly,
        sort,
        page,
        signal,
      })
      const nextBooks = result.items.filter((book) => book.currentAvailabilityStatus !== 'Unavailable')
      hasBooksRef.current = nextBooks.length > 0
      setBooks(nextBooks)
      setViewer(result.viewer)
      setPagination(result.pagination)
    } catch (reason) {
      if (!signal?.aborted) setError(reason instanceof Error ? reason.message : 'The catalog could not be loaded.')
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
        setIsFetching(false)
      }
    }
  }, [availableOnly, categoryId, debouncedQuery, page, programId, sort])

  useEffect(() => {
    const controller = new AbortController()
    void loadBooks(controller.signal)
    return () => controller.abort()
  }, [loadBooks])

  useEffect(() => {
    const refresh = () => void loadBooks()
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 15_000)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearInterval(timer)
    }
  }, [loadBooks])

  const cartBooks = useMemo(() => new Set(cart.map((item) => item.titleId)), [cart])
  const cartPath = viewer.role === 'Faculty' ? '/faculty/cart' : '/student/cart'
  const commitmentCount = viewer.activeBookCount + cart.length
  const bookLimit = viewer.bookLimit ?? STUDENT_BOOK_LIMIT
  const nearLimit = viewer.role === 'Student' && commitmentCount >= bookLimit - 1

  const addToCart = (book: BookCatalogItem) => {
    assertCatalogItemCanEnterLoanCart({ catalogType: 'Book', id: book.titleId })
    const validation = validateBookCartAddition({
      role: viewer.role,
      activeBookCount: viewer.activeBookCount,
      selectedBookCount: cart.length,
      alreadySelected: cartBooks.has(book.titleId),
      bookLimit: viewer.bookLimit,
    })
    if (!validation.allowed) {
      setNotice(null)
      setError('')
      setLimitWarning(validation.message ?? 'This book cannot be added to the cart.')
      return
    }
    if (!cartBooks.has(book.titleId)) addItem(book)
    setError('')
    setLimitWarning('')
    setNotice(
      <span>
        {validation.message ?? `${book.title} was added to your borrow cart.`}{' '}
        <Link to={cartPath} className="underline underline-offset-2 hover:text-emerald-900 dark:hover:text-emerald-200">View cart</Link>
      </span>,
    )
  }

  const reserve = async (book: BookCatalogItem) => {
    const commitment = validateStudentBookCommitment({
      role: viewer.role,
      activeBookCount: viewer.activeBookCount,
      selectedBookCount: cart.length,
      bookLimit: viewer.bookLimit,
    })
    if (!commitment.allowed) {
      setNotice(null)
      setError('')
      setLimitWarning(commitment.message ?? 'Reservation blocked.')
      return
    }
    setReserving(book.titleId)
    setError('')
    setLimitWarning('')
    setNotice(null)
    try {
      const reservation = await reserveBookTitle(book.titleId)
      setNotice(`Reservation submitted. You are number ${reservation.queuePosition} in the queue.`)
      await loadBooks()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The reservation could not be submitted.'
      if (message.includes('cannot exceed 2 books') || message.includes('active book commitments')) {
        setLimitWarning(message)
      } else {
        setError(message)
      }
    } finally {
      setReserving(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <Link to={cartPath} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#0b5ea2]/15 bg-white px-3 text-xs font-bold text-[#0b5ea2] shadow-sm dark:border-white/15 dark:bg-[#001a4d] dark:text-[#f2f6ff]">
          <ShoppingBag size={16} /> Cart {cart.length}
        </Link>
        <button type="button" onClick={() => void loadBooks()} aria-label="Refresh catalog" className="rounded-xl border border-[#0b5ea2]/15 bg-white p-2.5 text-[#0b5ea2] shadow-sm dark:border-white/15 dark:bg-[#001a4d] dark:text-[#f2f6ff]">
          <RefreshCw size={17} />
        </button>
      </div>

      <section className="relative mb-5 overflow-hidden rounded-3xl border border-[#0b5ea2]/15 bg-cover bg-center p-5 text-white shadow-sm sm:p-6" style={{ backgroundImage: "url('/library-hero.webp')" }}>
        <div className="absolute inset-0 bg-[#0b5ea2]/85 dark:bg-[#001133]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b5ea2] via-transparent to-transparent opacity-80" />
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FFF200]/90">Browse collection</p>
          <h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">Find books available to borrow</h2>
          <p className="mt-2 text-sm leading-6 text-white/80">Search by title, author, or category, then add available copies to your cart or join the waitlist.</p>
        </div>
      </section>

      {limitWarning ? (
        <StatusModal
          type="warning"
          title="Borrowing limit reached"
          description={limitWarning}
          onClose={() => setLimitWarning('')}
        />
      ) : null}
      {error ? <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">{error}</div> : null}
      {notice ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">{notice}</div> : null}

      <div className="mb-4 space-y-3">
        <label className="block max-w-md">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#0b5ea2]/70 dark:text-white/55">Course</span>
          <select
            aria-label="Filter by course"
            value={programId ?? ''}
            onChange={(event) => {
              const next = event.target.value ? Number(event.target.value) : null
              setProgramId(Number.isSafeInteger(next) && next !== null && next > 0 ? next : null)
              setCategoryId(null)
              setPage(1)
            }}
            className="h-11 w-full rounded-xl border border-[#0b5ea2]/15 bg-white px-3 text-sm font-semibold text-[#0b5ea2] outline-none focus:border-[#0b5ea2] focus:ring-4 focus:ring-[#0b5ea2]/10 dark:border-white/15 dark:bg-[#001a4d] dark:text-[#f2f6ff]"
          >
            <option value="">All courses</option>
            {programs.map((program) => (
              <option key={program.programId} value={program.programId}>{program.programName}</option>
            ))}
          </select>
        </label>
        <CategoryFilterSearchBar
          query={query}
          selectedCategoryId={categoryId}
          programId={programId}
          onQueryChange={setQuery}
          onCategoryChange={(nextCategoryId) => {
            setCategoryId(nextCategoryId)
            setPage(1)
          }}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={availableOnly}
          onClick={() => {
            setAvailableOnly((value) => !value)
            setPage(1)
          }}
          className={`inline-flex h-9 items-center rounded-xl border px-3 text-xs font-bold transition ${availableOnly ? 'border-[#0b5ea2] bg-[#0b5ea2] text-white' : 'border-zinc-200 bg-white text-[#0b5ea2] hover:bg-zinc-50 dark:border-white/15 dark:bg-[#001a4d] dark:text-[#f2f6ff]'}`}
        >
          Available now
        </button>
        <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-[#0b5ea2] dark:border-white/15 dark:bg-[#001a4d] dark:text-[#f2f6ff]">
          <span className="sr-only">Sort catalog</span>
          <select
            value={sort}
            aria-label="Sort catalog"
            onChange={(event) => {
              setSort(event.target.value as 'available_first' | 'title')
              setPage(1)
            }}
            className="bg-transparent text-xs font-bold text-[#0b5ea2] outline-none dark:text-[#f2f6ff]"
          >
            <option value="available_first">Available first</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
        {nearLimit ? (
          <span className="inline-flex h-9 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            Limit {commitmentCount} / {bookLimit} books
          </span>
        ) : null}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            {debouncedQuery || categoryId || availableOnly ? 'Search results' : 'Available books'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {pagination.total} books found
            {viewer.role === 'Student' ? ` · Active + selected: ${commitmentCount} / ${bookLimit}` : ''}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" aria-label="Grid view" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} className={`rounded-lg p-2 transition ${viewMode === 'grid' ? 'bg-[#0b5ea2] text-white' : 'text-zinc-500 hover:text-[#0b5ea2]'}`}>
            <LayoutGrid size={16} />
          </button>
          <button type="button" aria-label="List view" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} className={`rounded-lg p-2 transition ${viewMode === 'list' ? 'bg-[#0b5ea2] text-white' : 'text-zinc-500 hover:text-[#0b5ea2]'}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {loading && books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[#0b5ea2]" />
          <p className="mt-4 text-sm font-medium">Loading catalog…</p>
        </div>
      ) : null}

      {!loading && books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="text-zinc-300 dark:text-zinc-700" size={40} />
          <p className="mt-3 font-display text-lg font-bold text-zinc-900 dark:text-white">No books match these filters</p>
          <p className="mt-1 text-sm text-zinc-500">Try a different search, category, or availability filter.</p>
        </div>
      ) : null}

      {books.length > 0 ? (
        <div className={`transition-opacity duration-300 ${isFetching ? 'pointer-events-none opacity-40' : 'opacity-100'} ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid gap-4'}`}>
          {books.map((book) => {
            const action = catalogActionLabel(book.availableCopiesCount)
            const inCart = cartBooks.has(book.titleId)
            const shelf = book.shelfLocation ?? book.callNumber ?? 'Shelf not recorded'
            if (viewMode === 'list') {
              return (
                <article key={book.titleId} className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 sm:flex-row sm:items-center">
                  <BookCoverThumbnail title={book.title} coverImagePath={book.coverImagePath} className="mx-auto h-36 w-24 sm:mx-0" />
                  <div className="min-w-0 flex-1">
                    <CatalogAvailabilityBadge status={book.currentAvailabilityStatus} availableCopiesCount={book.availableCopiesCount} />
                    <h3 className="mt-1 font-display text-lg font-bold text-zinc-900 dark:text-white">{book.title}</h3>
                    <p className="mt-0.5 text-sm text-zinc-500">{book.author}</p>
                    <p className="mt-2 text-xs font-bold text-[#0b5ea2]">Copies: {book.availableCopiesCount} of {book.totalCopiesCount} available</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-zinc-500"><MapPin size={12} />{shelf}</p>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
                    <button type="button" onClick={() => setSelectedTitleId(book.titleId)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#0b5ea2]/15 bg-white text-sm font-bold text-[#0b5ea2] sm:flex-none sm:px-4">
                      <Eye size={16} /> View details
                    </button>
                    {action === 'Add to cart' ? (
                      <button type="button" onClick={() => addToCart(book)} disabled={inCart} className="h-10 flex-1 rounded-xl bg-[#0b5ea2] text-sm font-bold text-white disabled:opacity-50 sm:flex-none sm:px-4">
                        {inCart ? 'In cart' : 'Add to cart'}
                      </button>
                    ) : (
                      <button type="button" onClick={() => void reserve(book)} disabled={reserving === book.titleId} className="h-10 flex-1 rounded-xl bg-[#FFF200] text-sm font-bold text-[#0b5ea2] disabled:opacity-50 sm:flex-none sm:px-4">
                        {reserving === book.titleId ? 'Requesting…' : 'Request'}
                      </button>
                    )}
                  </div>
                </article>
              )
            }

            return (
              <article key={book.titleId} className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 transition-all duration-300 hover:shadow-lg dark:bg-zinc-900 dark:ring-zinc-800">
                <button type="button" onClick={() => setSelectedTitleId(book.titleId)} className="aspect-[3/4] w-full overflow-hidden bg-zinc-100 text-left dark:bg-zinc-800" aria-label={`Open ${book.title}`}>
                  <BookCoverThumbnail title={book.title} coverImagePath={book.coverImagePath} className="h-full w-full rounded-none" />
                </button>
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <CatalogAvailabilityBadge status={book.currentAvailabilityStatus} availableCopiesCount={book.availableCopiesCount} />
                    <h3 className="mt-1.5 font-display text-sm font-bold leading-tight text-zinc-900 line-clamp-2 dark:text-white">{book.title}</h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">{book.author}</p>
                    <p className="mt-1.5 text-[11px] font-bold text-[#0b5ea2]">Copies: {book.availableCopiesCount} of {book.totalCopiesCount} available</p>
                    <p className="mt-0.5 line-clamp-1 inline-flex max-w-full items-center gap-1 text-[11px] font-semibold text-zinc-500"><MapPin size={11} className="shrink-0" />{shelf}</p>
                  </div>
                  <div className="mt-2.5 flex flex-col gap-1.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                    <button type="button" onClick={() => setSelectedTitleId(book.titleId)} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#0b5ea2]/15 bg-white px-2 text-[11px] font-bold text-[#0b5ea2]">
                      <Eye size={12} className="shrink-0" /> View details
                    </button>
                    {action === 'Add to cart' ? (
                      <button type="button" onClick={() => addToCart(book)} disabled={inCart} className="h-8 rounded-lg bg-[#0b5ea2] px-2 text-[11px] font-bold text-white disabled:opacity-50">
                        {inCart ? 'In cart' : 'Add to cart'}
                      </button>
                    ) : (
                      <button type="button" onClick={() => void reserve(book)} disabled={reserving === book.titleId} className="h-8 rounded-lg bg-[#FFF200] px-2 text-[11px] font-bold text-[#0b5ea2] disabled:opacity-50">
                        {reserving === book.titleId ? 'Requesting…' : 'Request'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {pagination.totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Catalog pages">
          <button type="button" disabled={page <= 1 || isFetching} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-[#0b5ea2]/15 bg-white p-2 text-[#0b5ea2] disabled:opacity-40 dark:bg-zinc-900">
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-bold text-[#0b5ea2]">Page {page} of {pagination.totalPages}</span>
          <button type="button" disabled={page >= pagination.totalPages || isFetching} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-[#0b5ea2]/15 bg-white p-2 text-[#0b5ea2] disabled:opacity-40 dark:bg-zinc-900">
            <ChevronRight size={18} />
          </button>
        </nav>
      ) : null}

      {selectedTitleId !== null ? (
        <BookOverview
          titleId={selectedTitleId}
          role={viewer.role}
          activeBookCount={viewer.activeBookCount}
          selectedBookCount={cart.length}
          bookLimit={viewer.bookLimit}
          alreadySelected={cartBooks.has(selectedTitleId)}
          cartPath={cartPath}
          onAddToCart={addToCart}
          onClose={() => {
            setSelectedTitleId(null)
            if (searchParams.has('titleId') || searchParams.has('query')) {
              const next = new URLSearchParams(searchParams)
              next.delete('titleId')
              setSearchParams(next, { replace: true })
            }
          }}
        />
      ) : null}
    </div>
  )
}
