import { ViewLocationButton } from '../floor-plan/ViewLocationButton'
import { Book, Check, ChevronDown, Clipboard, Info, MapPin, ShoppingBag, X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmModal, StatusModal } from '../../components/ui'
import type { AuthRole } from '../auth/auth-storage'
import { fetchBookCatalog, fetchBookOverview, reserveBookTitle } from './book-catalog-api'
import { STUDENT_BOOK_LIMIT, validateBookCartAddition, validateStudentBookCommitment } from './book-cart'
import { buildApaBookReference } from './book-citation'
import type { BookCatalogItem } from './book-catalog-types'
import { BookCoverThumbnail } from './BookCoverThumbnail'
import { CatalogAvailabilityBadge } from './CatalogAvailabilityBadge'

function coverFallback(title: string) {
  return `https://placehold.co/400x600/f4f4f5/a1a1aa?text=${encodeURIComponent(title)}`
}

type Props = {
  titleId: number
  role: AuthRole
  activeBookCount: number
  selectedBookCount: number
  alreadySelected: boolean
  bookLimit?: number | null
  cartPath?: string
  onAddToCart: (book: BookCatalogItem) => void
  onClose: () => void
}

export function BookOverview({
  titleId,
  role,
  activeBookCount,
  selectedBookCount,
  alreadySelected,
  bookLimit = STUDENT_BOOK_LIMIT,
  cartPath = '/student/cart',
  onAddToCart,
  onClose,
}: Props) {
  const [book, setBook] = useState<BookCatalogItem | null>(null)
  const [related, setRelated] = useState<BookCatalogItem[]>([])
  const [error, setError] = useState('')
  const [limitWarning, setLimitWarning] = useState('')
  const [notice, setNotice] = useState<ReactNode>(null)
  const [citationVisible, setCitationVisible] = useState(false)
  const [copiesOpen, setCopiesOpen] = useState(false)
  const [relatedOpen, setRelatedOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmCart, setConfirmCart] = useState(false)
  const [reserving, setReserving] = useState(false)
  const [busyRelatedId, setBusyRelatedId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setBook(null)
    setRelated([])
    setError('')
    setNotice(null)
    setCitationVisible(false)
    setCopiesOpen(role === 'Admin' || role === 'Librarian')
    setRelatedOpen(false)
    setConfirmCart(false)

    fetchBookOverview(titleId, controller.signal)
      .then(async (overview) => {
        setBook(overview)
        if (!overview.categoryId) return
        try {
          const catalog = await fetchBookCatalog({
            categoryId: overview.categoryId,
            page: 1,
            signal: controller.signal,
          })
          setRelated(catalog.items.filter((item) => item.titleId !== overview.titleId).slice(0, 4))
        } catch {
          setRelated([])
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load this book.')
      })

    return () => controller.abort()
  }, [role, titleId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (confirmCart) setConfirmCart(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [confirmCart, onClose])

  const citation = useMemo(() => (book ? buildApaBookReference(book) : ''), [book])
  const canBorrow = ['Student', 'Faculty'].includes(role)
  const available = Boolean(book && book.availableCopiesCount > 0)
  const stockPercent = book && book.totalCopiesCount > 0
    ? Math.min(100, Math.round((book.availableCopiesCount / book.totalCopiesCount) * 100))
    : 0

  const requestAddToCart = () => {
    if (!book || !canBorrow) return
    const validation = validateBookCartAddition({ role, activeBookCount, selectedBookCount, alreadySelected, bookLimit })
    if (!validation.allowed) {
      setNotice(null)
      setError('')
      setLimitWarning(validation.message ?? 'This book cannot be added to the cart.')
      return
    }
    if (alreadySelected) {
      setError('')
      setLimitWarning('')
      setNotice(validation.message ?? 'This book is already in your borrow cart.')
      return
    }
    setConfirmCart(true)
  }

  const confirmAddToCart = () => {
    if (!book) return
    onAddToCart(book)
    setConfirmCart(false)
    setError('')
    setLimitWarning('')
    setNotice(
      <span>
        {book.title} was added to your borrow cart.{' '}
        <Link to={cartPath} className="underline underline-offset-2 hover:text-emerald-900 dark:hover:text-emerald-200">View cart</Link>
      </span>,
    )
  }

  const reserve = async () => {
    if (!book || !canBorrow || reserving) return
    const commitment = validateStudentBookCommitment({ role, activeBookCount, selectedBookCount, bookLimit })
    if (!commitment.allowed) {
      setNotice(null)
      setError('')
      setLimitWarning(commitment.message ?? 'Reservation blocked.')
      return
    }
    setReserving(true)
    setError('')
    setLimitWarning('')
    setNotice(null)
    try {
      const reservation = await reserveBookTitle(book.titleId)
      setNotice(`Reservation submitted. You are number ${reservation.queuePosition} in the queue.`)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The reservation could not be submitted.'
      if (message.includes('cannot exceed 2 books') || message.includes('active book commitments')) {
        setLimitWarning(message)
      } else {
        setError(message)
      }
    } finally {
      setReserving(false)
    }
  }

  const openRelated = async (item: BookCatalogItem) => {
    setBusyRelatedId(item.titleId)
    setBook(null)
    setError('')
    setNotice(null)
    try {
      const overview = await fetchBookOverview(item.titleId)
      setBook(overview)
      if (overview.categoryId) {
        const catalog = await fetchBookCatalog({ categoryId: overview.categoryId, page: 1 })
        setRelated(catalog.items.filter((row) => row.titleId !== overview.titleId).slice(0, 4))
      } else {
        setRelated([])
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load this book.')
    } finally {
      setBusyRelatedId(null)
    }
  }

  const copyCitation = async () => {
    try {
      await navigator.clipboard.writeText(citation)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Clipboard access is unavailable. Select and copy the reference manually.')
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#001133]/50 p-4 backdrop-blur-sm" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close book overview" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-overview-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl ring-1 ring-zinc-200 dark:bg-[#001a4d] dark:ring-white/10"
      >
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-white/10 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b5ea2]/55 dark:text-white/50">Book details</p>
            <h2 id="book-overview-title" className="mt-1 font-display text-lg font-black text-zinc-900 dark:text-white sm:text-xl">
              {book?.title ?? 'Loading book…'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {limitWarning ? (
            <StatusModal
              type="warning"
              title="Borrowing limit reached"
              description={limitWarning}
              onClose={() => setLimitWarning('')}
            />
          ) : null}
          {error ? <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">{error}</div> : null}
          {notice ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">{notice}</div> : null}

          {!book && !error ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[#0b5ea2]" />
              <p className="mt-4 text-sm font-medium">Loading book details…</p>
            </div>
          ) : null}

          {book ? (
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="mx-auto w-full max-w-[12.5rem] shrink-0 sm:mx-0">
                <div className="overflow-hidden rounded-2xl bg-zinc-100 shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-white/10">
                  {book.coverImagePath ? (
                    <img
                      src={book.coverImagePath}
                      alt={`${book.title} cover`}
                      className="aspect-[3/4] w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null
                        event.currentTarget.src = coverFallback(book.title)
                      }}
                    />
                  ) : (
                    <BookCoverThumbnail title={book.title} coverImagePath={null} className="aspect-[3/4] h-auto w-full rounded-none" />
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-white/55">
                      <span>Available stock</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{book.availableCopiesCount} of {book.totalCopiesCount}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                      <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${available ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${stockPercent}%` }} />
                    </div>
                  </div>
                  <ViewLocationButton titleId={book.titleId} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CatalogAvailabilityBadge status={book.currentAvailabilityStatus} availableCopiesCount={book.availableCopiesCount} />
                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-white/10 dark:text-white/70">
                    {book.categoryName || 'Uncategorized'}
                  </span>
                  {book.currentConditionStatus ? (
                    <span className="inline-flex rounded-full bg-[#FFF200]/35 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0b5ea2]">
                      {book.currentConditionStatus}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-3 font-display text-2xl font-black leading-tight text-zinc-900 dark:text-white sm:text-3xl">{book.title}</h3>
                <p className="mt-1 text-base font-semibold text-[#0b5ea2] dark:text-[#FFF200]">{book.author}</p>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <p><span className="font-bold text-zinc-900 dark:text-white">ISBN</span> {book.isbn || 'Not recorded'}</p>
                  <p><span className="font-bold text-zinc-900 dark:text-white">Published</span> {book.publicationYear ?? 'Not recorded'}</p>
                  <p><span className="font-bold text-zinc-900 dark:text-white">Publisher</span> {book.publisher || 'Not recorded'}</p>
                </div>

                <div className="mt-5">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    <Info size={14} /> Synopsis
                  </h4>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                    {book.synopsis?.trim() || 'No synopsis is available for this title yet.'}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-white/55">
                  <MapPin size={14} />
                  {book.shelfLocation ?? book.callNumber ?? 'Shelf not recorded'}
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    onClick={() => setCopiesOpen((value) => !value)}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-3.5 py-3 text-left text-sm font-bold text-[#0b5ea2] transition hover:bg-zinc-50 dark:border-white/15 dark:text-[#FFF200] dark:hover:bg-white/5"
                  >
                    Individual copies
                    <ChevronDown size={16} className={`transition-transform duration-150 ease-out ${copiesOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {copiesOpen ? (
                    <div className="space-y-2 rounded-xl border border-zinc-100 p-3 dark:border-white/10" aria-label="Individual book copies">
                      {book.copies?.length ? book.copies.map((copy) => (
                        <div key={copy.copyId} className="grid gap-1 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300 sm:grid-cols-2">
                          <strong className="text-zinc-900 dark:text-white">{copy.accessionNumber}</strong>
                          <span className="font-mono">{copy.barcode}</span>
                          <span>Availability: {copy.availability}</span>
                          <span>Condition: {copy.condition}</span>
                          <span className="sm:col-span-2">Shelf: {copy.shelf}</span>
                        </div>
                      )) : <p className="text-sm text-zinc-500">No active copies are recorded.</p>}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-zinc-200 p-3 dark:border-white/15">
                    <button type="button" onClick={() => setCitationVisible((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FFF200] px-4 text-sm font-bold text-[#0b5ea2]">
                      <Clipboard size={16} /> Generate APA reference
                    </button>
                    {citationVisible ? (
                      <div className="mt-3">
                        <label htmlFor="apa-reference" className="text-xs font-bold text-[#0b5ea2] dark:text-[#FFF200]">APA 7th Edition reference</label>
                        <textarea id="apa-reference" readOnly value={citation} className="mt-1.5 min-h-24 w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700 dark:border-white/15 dark:bg-[#001133] dark:text-white" />
                        <button type="button" onClick={() => void copyCitation()} className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#0b5ea2] dark:text-[#FFF200]">
                          {copied ? <Check size={15} /> : <Clipboard size={15} />}
                          {copied ? 'Copied' : 'Copy to clipboard'}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {related.length ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setRelatedOpen((value) => !value)}
                        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-3.5 py-3 text-left text-sm font-bold text-[#0b5ea2] transition hover:bg-zinc-50 dark:border-white/15 dark:text-[#FFF200] dark:hover:bg-white/5"
                      >
                        Related in {book.categoryName || 'category'}
                        <ChevronDown size={16} className={`transition-transform duration-150 ease-out ${relatedOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {relatedOpen ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {related.map((item) => (
                            <button
                              key={item.titleId}
                              type="button"
                              disabled={busyRelatedId === item.titleId}
                              onClick={() => void openRelated(item)}
                              className="rounded-xl border border-zinc-100 p-2 text-left transition hover:border-[#0b5ea2]/30 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                            >
                              <div className="overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                {item.coverImagePath ? (
                                  <img src={item.coverImagePath} alt={`${item.title} cover`} className="aspect-[3/4] w-full object-cover" />
                                ) : (
                                  <div className="flex aspect-[3/4] items-center justify-center text-zinc-300"><Book size={22} /></div>
                                )}
                              </div>
                              <p className="mt-2 line-clamp-2 text-[11px] font-bold text-zinc-800 dark:text-white">{item.title}</p>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {book && canBorrow ? (
          <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-[#001a4d]/95 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs font-semibold text-zinc-500 dark:text-white/55">
              {available ? 'Ready to borrow from the library counter after checkout.' : 'No copies available right now — join the waitlist instead.'}
            </p>
            {available ? (
              <button
                type="button"
                onClick={requestAddToCart}
                disabled={alreadySelected}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0b5ea2] px-5 text-sm font-bold text-white transition hover:bg-[#004488] active:scale-[0.98] disabled:opacity-50"
              >
                <ShoppingBag size={16} />
                {alreadySelected ? 'In borrow cart' : 'Add to cart'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void reserve()}
                disabled={reserving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FFF200] px-5 text-sm font-bold text-[#0b5ea2] transition hover:bg-[#ffe600] active:scale-[0.98] disabled:opacity-50"
              >
                {reserving ? 'Requesting…' : 'Request'}
              </button>
            )}
          </footer>
        ) : null}
      </div>

      {confirmCart && book ? (
        <ConfirmModal
          title="Confirm Addition"
          description={<>Are you sure you want to add <strong>{book.title}</strong> to your borrow cart?</>}
          confirmText="Yes, Add to Cart"
          cancelText="Cancel"
          onCancel={() => setConfirmCart(false)}
          onConfirm={confirmAddToCart}
        />
      ) : null}
    </div>
  )
}
