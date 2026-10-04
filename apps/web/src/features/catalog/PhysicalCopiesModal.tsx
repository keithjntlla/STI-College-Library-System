import { useEffect, useState } from 'react'
import { Eye, MapPin } from 'lucide-react'
import { fetchBookOverview } from './book-catalog-api'
import type { BookCatalogItem } from './book-catalog-types'
import { StatusBadge } from '../../components/ui'
import { AssetCodeModal } from './AssetCodeModal'

export function PhysicalCopiesModal({ titleId, title, onClose }: { titleId: number; title: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [book, setBook] = useState<BookCatalogItem | null>(null)
  const [assetCopyId, setAssetCopyId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchBookOverview(titleId, controller.signal)
      .then(setBook)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [titleId])

  return (
    <div className="fixed inset-0 lg:pl-[calc(1rem+var(--sidebar-offset,0px))] transition-[padding] duration-300 z-[999] flex items-center justify-center bg-[#0b5ea2]/50 p-4 backdrop-blur-sm" role="presentation">
      <section role="dialog" aria-modal="true" aria-label={`Physical copies for ${title}`} className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">Physical Copies</h2>
            <p className="mt-1 text-sm font-medium text-zinc-500">{title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-4 py-2 font-bold text-zinc-500 hover:bg-zinc-100">
            Close
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-zinc-50/50 p-6">
          {loading ? (
            <p className="text-center text-zinc-500">Loading copies...</p>
          ) : error ? (
            <p className="text-center font-bold text-red-500">{error}</p>
          ) : !book?.copies?.length ? (
            <p className="text-center text-zinc-500">No physical copies found for this book.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Accession</th>
                    <th className="px-4 py-3 font-semibold">Barcode</th>
                    <th className="px-4 py-3 font-semibold">Shelf</th>
                    <th className="px-4 py-3 font-semibold">Condition</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {book.copies.map((copy) => (
                    <tr key={copy.copyId} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-mono text-zinc-900">{copy.accessionNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{copy.barcode}</td>
                      <td className="px-4 py-3 text-zinc-700">
                        <span className="inline-flex items-center gap-1"><MapPin size={14} className="text-zinc-400" />{copy.shelf}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{copy.condition}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={copy.availability} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          type="button" 
                          onClick={() => setAssetCopyId(copy.copyId)} 
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
                        >
                          <Eye size={14} /> View Codes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {assetCopyId !== null ? <AssetCodeModal physicalCopyId={assetCopyId} onClose={() => setAssetCopyId(null)} /> : null}
    </div>
  )
}
