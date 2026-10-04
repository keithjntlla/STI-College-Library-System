import { BookOpen, MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchBookOverview, fetchCatalogCopyAsset } from './book-catalog-api'
import type { BookCatalogItem, CatalogCopyAsset } from './book-catalog-types'

export function CartAssetOverview({ titleId, barcode, onClose }: { titleId: number; barcode: string | null; onClose: () => void }) {
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

  const title = book?.title ?? asset?.title
  const author = book?.author ?? asset?.author
  const shelf = asset?.shelfLocation || book?.shelfLocation || 'Not recorded'

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cart-asset-title" className="fixed inset-0 z-[100] flex justify-end bg-[#0b5ea2]/55 backdrop-blur-sm">
      <button aria-label="Close cart details" onClick={onClose} className="absolute inset-0" />
      <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-[#FFFFFF] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#0b5ea2]/15 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b5ea2]/60">Cart copy details</p>
            <h2 id="cart-asset-title" className="mt-1 font-display text-xl font-black text-[#0b5ea2]">{title ?? 'Book details'}</h2>
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded-xl border border-[#0b5ea2]/15 p-2 text-[#0b5ea2]"><X size={19} /></button>
        </header>
        <div className="p-5 sm:p-6">
          {error ? <div role="alert" className="mb-4 rounded-xl bg-[#FFF200] p-4 text-sm font-semibold text-[#0b5ea2]">{error}</div> : null}
          {!book && !error ? <div className="py-20 text-center text-sm font-semibold text-[#0b5ea2]">Loading book details…</div> : null}
          {book ? (
            <>
              <div className="rounded-2xl bg-[#0b5ea2] p-5 text-[#FFFFFF]">
                <div className="flex gap-3">
                  <span className="rounded-xl bg-[#FFF200] p-3 text-[#0b5ea2]"><BookOpen size={22} /></span>
                  <div>
                    <h3 className="font-display text-xl font-bold">{title}</h3>
                    <p className="mt-1 text-sm text-[#FFFFFF]/80">{author}</p>
                  </div>
                </div>
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold"><MapPin size={16} />{shelf}</p>
              </div>
              <dl className="mt-5 grid gap-3 rounded-xl border border-[#0b5ea2]/15 p-4 sm:grid-cols-2">
                <div><dt className="text-xs font-bold uppercase text-[#0b5ea2]/55">Accession</dt><dd className="mt-1 text-sm font-semibold text-[#0b5ea2]">{asset?.accessionNumber ?? 'Not recorded'}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-[#0b5ea2]/55">Condition</dt><dd className="mt-1 text-sm font-semibold text-[#0b5ea2]">{asset?.conditionStatus ?? book.currentConditionStatus ?? 'Not recorded'}</dd></div>
              </dl>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
