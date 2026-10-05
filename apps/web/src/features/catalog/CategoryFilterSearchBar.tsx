import { ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { fetchBookCategories } from './book-catalog-api'
import type { BookCategory } from './book-catalog-types'

type CategoryFilterSearchBarProps = {
  query: string
  selectedCategoryId: number | null
  programId?: number | null
  onQueryChange: (query: string) => void
  onCategoryChange: (categoryId: number | null) => void
}

export function CategoryFilterSearchBar({
  query,
  selectedCategoryId,
  programId = null,
  onQueryChange,
  onCategoryChange,
}: CategoryFilterSearchBarProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [categories, setCategories] = useState<BookCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetchBookCategories(controller.signal, programId)
      .then((rows) => setCategories(rows))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Categories could not be loaded.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [programId])

  useEffect(() => {
    if (!loading && selectedCategoryId !== null && !categories.some((category) => category.categoryId === selectedCategoryId)) {
      onCategoryChange(null)
    }
  }, [categories, loading, onCategoryChange, selectedCategoryId])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selectedCategory = useMemo(
    () => categories.find((category) => category.categoryId === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  )

  const selectCategory = (categoryId: number | null) => {
    onCategoryChange(categoryId)
    setOpen(false)
  }

  return (
    <div className="relative z-30 w-full" ref={rootRef}>
      <div className="flex h-12 items-stretch rounded-2xl border border-[#0b5ea2]/15 bg-white shadow-sm transition focus-within:border-[#0b5ea2] focus-within:ring-4 focus-within:ring-[#0b5ea2]/10 dark:border-white/15 dark:bg-[#001a4d]">
        <div className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label="Filter by category"
            onClick={() => setOpen((value) => !value)}
            className="flex h-full min-w-[8.5rem] max-w-[11rem] items-center gap-1.5 rounded-l-2xl border-r border-[#0b5ea2]/10 bg-[#0b5ea2]/[0.04] px-3 text-left text-xs font-bold text-[#0b5ea2] transition hover:bg-[#0b5ea2]/10 dark:border-white/10 dark:bg-white/5 dark:text-[#f2f6ff] sm:min-w-[10rem] sm:max-w-[14rem] sm:px-4 sm:text-sm"
          >
            <span className="truncate">{selectedCategory?.categoryName ?? (loading ? 'Loading…' : 'All categories')}</span>
            <ChevronDown size={16} className={`ml-auto shrink-0 transition-transform duration-150 ease-out ${open ? 'rotate-180' : ''}`} />
          </button>

          {open ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Book categories"
              className="absolute left-0 top-[calc(100%+0.4rem)] z-[80] max-h-72 w-64 origin-top-left overflow-y-auto rounded-2xl border border-[#0b5ea2]/10 bg-white py-1.5 shadow-xl shadow-[#0b5ea2]/15 dark:border-white/10 dark:bg-[#001a4d]"
            >
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedCategoryId === null}
                  onClick={() => selectCategory(null)}
                  className={`flex w-full px-3.5 py-2.5 text-left text-sm font-semibold transition hover:bg-[#0b5ea2]/5 dark:hover:bg-white/10 ${selectedCategoryId === null ? 'bg-[#0b5ea2]/10 text-[#0b5ea2] dark:text-[#FFF200]' : 'text-[#0b5ea2]/80 dark:text-white/80'}`}
                >
                  All categories
                </button>
              </li>
              {categories.map((category) => {
                const active = selectedCategoryId === category.categoryId
                return (
                  <li key={category.categoryId}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => selectCategory(category.categoryId)}
                      className={`flex w-full px-3.5 py-2.5 text-left text-sm font-semibold transition hover:bg-[#0b5ea2]/5 dark:hover:bg-white/10 ${active ? 'bg-[#0b5ea2]/10 text-[#0b5ea2] dark:text-[#FFF200]' : 'text-[#0b5ea2]/80 dark:text-white/80'}`}
                    >
                      {category.categoryName}
                    </button>
                  </li>
                )
              })}
              {!loading && programId !== null && categories.length === 0 ? (
                <li className="px-3.5 py-2.5 text-xs font-semibold text-[#0b5ea2]/55 dark:text-white/45">
                  No categories linked to this course yet.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <label className="relative flex min-w-0 flex-1 items-center rounded-r-2xl">
          <Search className="pointer-events-none absolute left-3 text-[#0b5ea2]/45 dark:text-white/45" size={18} />
          <input
            aria-label="Search books"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search title, author, ISBN, or year…"
            className="h-full w-full rounded-r-2xl bg-transparent py-0 pl-10 pr-10 text-sm text-[#0b5ea2] outline-none placeholder:text-[#0b5ea2]/40 dark:text-white dark:placeholder:text-white/40"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange('')}
              className="absolute right-2 rounded-lg p-1.5 text-[#0b5ea2]/45 transition hover:bg-[#0b5ea2]/5 hover:text-[#0b5ea2] dark:text-white/45 dark:hover:bg-white/10"
            >
              <X size={15} />
            </button>
          ) : null}
        </label>
      </div>

      {selectedCategory ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0b5ea2]/8 px-3 py-1 text-[11px] font-bold text-[#0b5ea2] ring-1 ring-[#0b5ea2]/15 dark:bg-white/10 dark:text-[#f2f6ff] dark:ring-white/15">
            {selectedCategory.categoryName}
            <button
              type="button"
              aria-label={`Clear category ${selectedCategory.categoryName}`}
              onClick={() => selectCategory(null)}
              className="rounded-full p-0.5 transition hover:bg-[#0b5ea2]/15 dark:hover:bg-white/15"
            >
              <X size={12} />
            </button>
          </span>
        </div>
      ) : null}

      {error ? <p role="alert" className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}
