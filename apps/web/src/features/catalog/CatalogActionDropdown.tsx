import { useState, useRef, useEffect } from 'react'
import { Archive, ArrowRightLeft, Eye, FileText, Library, MoreHorizontal } from 'lucide-react'
import type { CatalogItem } from './types'

type Props = {
  item: CatalogItem
  onViewDetails: () => void
  onViewCopies: () => void
  onChangeCategory: () => void
  onQuotations: () => void
  onArchive: () => void
}

export function CatalogActionDropdown({ item, onViewDetails, onViewCopies, onChangeCategory, onQuotations, onArchive }: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#0b5ea2]/20"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl animate-in fade-in zoom-in-95">
          <div className="flex flex-col py-1">
            {item.recordType === 'Book' ? (
              <button 
                type="button" 
                onClick={() => { setOpen(false); onViewDetails() }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <Eye size={16} className="text-zinc-400" /> View details
              </button>
            ) : item.research?.researchInventoryId ? (
              <button 
                type="button" 
                onClick={() => { setOpen(false); onViewDetails() }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <Eye size={16} className="text-zinc-400" /> View codes
              </button>
            ) : (
              <div className="px-4 py-2.5 text-sm font-medium text-zinc-400">Codes unavailable</div>
            )}

            {item.recordType === 'Book' && (
              <button 
                type="button" 
                onClick={() => { setOpen(false); onViewCopies() }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <Library size={16} className="text-zinc-400" /> Physical copies
              </button>
            )}

            <button 
              type="button" 
              onClick={() => { setOpen(false); onChangeCategory() }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <ArrowRightLeft size={16} className="text-zinc-400" /> Change category
            </button>

            {item.recordType === 'Book' && (
              <>
                <div className="my-1 h-px w-full bg-zinc-100" />
                <button 
                  type="button" 
                  onClick={() => { setOpen(false); onQuotations() }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <FileText size={16} className="text-zinc-400" /> Replacement quotes
                </button>
                <button 
                  type="button" 
                  onClick={() => { setOpen(false); onArchive() }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Archive size={16} className="text-red-400" /> Archive book
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
