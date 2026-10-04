import { ViewLocationButton } from '../floor-plan/ViewLocationButton'
import { MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchBookOverview, fetchCatalogCopyAsset } from './book-catalog-api'
import type { BookCatalogItem, CatalogCopyAsset } from './book-catalog-types'
import { BookCoverThumbnail } from './BookCoverThumbnail'

export function BookDetailDrawer({ titleId, barcode, onClose }: { titleId: number; barcode: string | null; onClose: () => void }) {
  const [book, setBook] = useState<BookCatalogItem | null>(null)
  const [asset, setAsset] = useState<CatalogCopyAsset | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setBook(null)
    setAsset(null)
    setError('')
    void (async () => {
      try {
        const overview = await fetchBookOverview(titleId, controller.signal)
        if (controller.signal.aborted) return
        setBook(overview)
        const resolvedBarcode = barcode ?? overview.previewBarcode
        if (!resolvedBarcode) return
        try {
          const copy = await fetchCatalogCopyAsset(resolvedBarcode, controller.signal)
          if (!controller.signal.aborted) setAsset(copy)
        } catch (reason) {
          if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The assigned copy could not be loaded.')
        }
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The book details could not be loaded.')
      }
    })()
    return () => controller.abort()
  }, [barcode, titleId])

  const shelf = asset?.shelfLocation || book?.shelfLocation || 'Not recorded'
  const condition = asset?.conditionStatus ?? book?.currentConditionStatus ?? 'Not recorded'

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="book-detail-title" className="fixed inset-0 z-[110] flex justify-end bg-[#0b5ea2]/55">
      <button aria-label="Close book details" onClick={onClose} className="absolute inset-0" />
      <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-[#FFFFFF] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#0b5ea2]/15 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/60">Physical book details</p>
            <h2 id="book-detail-title" className="mt-1 text-xl font-black text-[#0b5ea2]">{book?.title ?? 'Book details'}</h2>
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded-xl border border-[#0b5ea2]/15 p-2 text-[#0b5ea2]"><X size={19} /></button>
        </header>
        <div className="p-5">
          {error ? <div role="alert" className="mb-4 rounded-xl bg-[#FFF200] p-4 text-sm font-semibold text-[#0b5ea2]">{error}</div> : null}
          {!book && !error ? <div className="py-20 text-center text-sm font-semibold text-[#0b5ea2]">Loading book details…</div> : null}
          {book ? (
            <>
              <section className="rounded-2xl bg-[#0b5ea2] p-5 text-[#FFFFFF]">
                <div className="flex items-center gap-4">
                  <BookCoverThumbnail title={book.title} coverImagePath={book.coverImagePath} className="h-28 w-20 border border-[#FFFFFF]/40" />
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold">{book.title}</h3>
                    <p className="mt-1 text-sm text-[#FFFFFF]/80">{book.author}</p>
                  </div>
                </div>
              </section>
              <dl className="mt-5 grid gap-3 rounded-xl border border-[#0b5ea2]/15 p-4 sm:grid-cols-2">
                <div><dt className="text-xs font-bold uppercase text-[#0b5ea2]/55">ISBN</dt><dd className="mt-1 text-sm font-semibold text-[#0b5ea2]">{book.isbn ?? 'Not recorded'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-[#0b5ea2]/55">Publication year</dt><dd className="mt-1 text-sm font-semibold text-[#0b5ea2]">{book.publicationYear ?? 'Not recorded'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-[#0b5ea2]/55">Publisher</dt><dd className="mt-1 text-sm font-semibold text-[#0b5ea2]">{book.publisher ?? 'Not recorded'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-[#0b5ea2]/55">Accession</dt><dd className="mt-1 text-sm font-semibold text-[#0b5ea2]">{asset?.accessionNumber ?? 'Not recorded'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-[#0b5ea2]/55">Book location</dt><dd className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0b5ea2]"><MapPin size={14} />{shelf}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-[#0b5ea2]/55">Current condition</dt><dd className="mt-1 text-sm font-semibold text-[#0b5ea2]">{condition}</dd></div>
              </dl>
              <div className="mt-4"><ViewLocationButton titleId={titleId} barcode={barcode} /></div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
