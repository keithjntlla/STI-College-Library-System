import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Archive, ArrowRightLeft, BookOpen, CheckCircle2, ChevronDown, Download, Eye, FileSpreadsheet, FileText, Layers, MapPin, MoreHorizontal, Plus, RefreshCw, Search, Upload, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { SectionCard, StatusBadge } from '../../components/ui'
import { catalogApi } from './catalog-api'
import type { CatalogFilters, CatalogItem, Category, PhysicalCopy } from './types'
import { BookOverview } from './BookOverview'
import { AssetCodeModal } from './AssetCodeModal'
import { AddMultipleCopiesModal } from './AddMultipleCopiesModal'
import { AddResearchModal } from './AddResearchModal'
import { ChangeTitleCategoryModal } from './ChangeTitleCategoryModal'
import { BookCoverThumbnail } from './BookCoverThumbnail'
import { BookQuotationModal } from './BookQuotationModal'

const fieldClass = 'h-10 w-full rounded-xl border border-[#0b5ea2]/20 bg-white px-3 text-sm font-semibold text-[#0b5ea2] outline-none focus:border-[#0b5ea2] focus:ring-4 focus:ring-[#0b5ea2]/10 dark:border-white/15 dark:bg-[#001a4d] dark:text-[#f2f6ff]'
const emptyFilters: CatalogFilters = { q: '', scope: 'all', categoryId: '', author: '', publicationYear: '', availability: '' }
const TEMPLATE_HREF = '/templates/books-import-template.csv'
const tableScrollClass = 'max-h-[min(28rem,55vh)] overflow-auto'

type Notice = { tone: 'success' | 'error'; text: string }

function CatalogRowActions({
  item,
  onViewDetails,
  onViewCodes,
  onChangeCategory,
  onQuotations,
  onArchive,
}: {
  item: CatalogItem
  onViewDetails: () => void
  onViewCodes: () => void
  onChangeCategory: () => void
  onQuotations: () => void
  onArchive: () => void
}) {
  const canViewCodes = item.recordType === 'Research/Thesis' && Boolean(item.research?.researchInventoryId)
  const menuId = `catalog-actions-${item.titleId}`

  return (
    <div className="flex items-center justify-end gap-1.5">
      {item.recordType === 'Book' ? (
        <button type="button" onClick={onViewDetails} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0b5ea2] px-2.5 text-xs font-bold text-white hover:bg-[#004488]">
          <Eye size={14} /> View
        </button>
      ) : canViewCodes ? (
        <button type="button" onClick={onViewCodes} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0b5ea2] px-2.5 text-xs font-bold text-white hover:bg-[#004488]">
          <Eye size={14} /> View
        </button>
      ) : (
        <span className="text-[11px] font-semibold text-[#0b5ea2]/45">Unavailable</span>
      )}
      <details className="relative">
        <summary
          aria-controls={menuId}
          aria-label={`More actions for ${item.title}`}
          className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-[#0b5ea2]/20 text-[#0b5ea2] hover:bg-[#0b5ea2]/5 dark:border-white/15 dark:text-[#f2f6ff] dark:hover:bg-white/10 [&::-webkit-details-marker]:hidden"
        >
          <MoreHorizontal size={16} />
        </summary>
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11.5rem] rounded-xl border border-[#0b5ea2]/15 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-[#001a4d]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              const details = event.currentTarget.closest('details')
              if (details) details.open = false
              onChangeCategory()
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-[#0b5ea2] hover:bg-[#0b5ea2]/5 dark:text-[#f2f6ff] dark:hover:bg-white/10"
          >
            <ArrowRightLeft size={14} /> Change category
          </button>
          {item.recordType === 'Book' ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  const details = event.currentTarget.closest('details')
                  if (details) details.open = false
                  onQuotations()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-[#0b5ea2] hover:bg-[#0b5ea2]/5 dark:text-[#f2f6ff] dark:hover:bg-white/10"
              >
                <FileSpreadsheet size={14} /> Quotations
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  const details = event.currentTarget.closest('details')
                  if (details) details.open = false
                  onArchive()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-[#0b5ea2] hover:bg-[#0b5ea2]/5 dark:text-[#f2f6ff] dark:hover:bg-white/10"
              >
                <Archive size={14} /> Archive book
              </button>
            </>
          ) : null}
        </div>
      </details>
    </div>
  )
}

export function CatalogManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [copies, setCopies] = useState<PhysicalCopy[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filters, setFilters] = useState(emptyFilters)
  const [form, setForm] = useState<'book' | 'thesis' | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [overviewTitleId, setOverviewTitleId] = useState<number | null>(null)
  const [assetCopyId, setAssetCopyId] = useState<number | null>(null)
  const [researchAssetId, setResearchAssetId] = useState<number | null>(null)
  const [categoryItem, setCategoryItem] = useState<CatalogItem | null>(null)
  const [changingCategory, setChangingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [archiveItem, setArchiveItem] = useState<CatalogItem | null>(null)
  const [quotationItem, setQuotationItem] = useState<{ titleId: number; title: string } | null>(null)
  const [archiveReason, setArchiveReason] = useState('')
  const [archiving, setArchiving] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ booksCreated: number; copiesCreated: number; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchParams.get('action') !== 'quotation') return
    const titleId = Number(searchParams.get('titleId'))
    if (!Number.isInteger(titleId) || titleId <= 0) return
    const title = searchParams.get('title')?.trim() || 'Book'
    setQuotationItem({ titleId, title })
  }, [searchParams])

  function closeQuotationModal() {
    setQuotationItem(null)
    if (searchParams.get('action') !== 'quotation' && !searchParams.has('titleId') && !searchParams.has('title')) return
    const next = new URLSearchParams(searchParams)
    next.delete('action')
    next.delete('titleId')
    next.delete('title')
    setSearchParams(next, { replace: true })
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [catalog, copyRows, categoryRows] = await Promise.all([
        catalogApi.search(filters), catalogApi.copies(), catalogApi.categories(),
      ])
      setItems(catalog.items)
      setCopies(copyRows)
      setCategories(categoryRows)
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Catalog data could not be loaded.' })
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 220)
    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    if (!notice || notice.tone !== 'success') return
    const timer = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!notice && !importResult) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (importFile || archiveItem || form) return
      setNotice(null)
      setImportResult(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [archiveItem, form, importFile, importResult, notice])

  async function changeCategory(targetCategoryId: number) {
    if (!categoryItem) return
    setChangingCategory(true)
    setCategoryError(null)
    try {
      const result = await catalogApi.changeTitleCategory(categoryItem.titleId, targetCategoryId, categoryItem.rowVersion)
      setCategoryItem(null)
      await refresh()
      const count = result.bookCopies + result.researchCopies
      setNotice({ tone: 'success', text: `${categoryItem.title} moved to ${result.categoryName} and ${result.shelfLocation}. ${count} active ${count === 1 ? 'copy was' : 'copies were'} updated.` })
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'The category could not be changed.')
    } finally {
      setChangingCategory(false)
    }
  }

  async function archiveBook() {
    if (!archiveItem || !archiveReason.trim()) return
    setArchiving(true)
    try {
      await catalogApi.archiveBook(archiveItem.titleId, archiveReason.trim())
      const title = archiveItem.title
      setArchiveItem(null)
      setArchiveReason('')
      await refresh()
      setNotice({ tone: 'success', text: `${title} moved to Book archive.` })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The book could not be archived.' })
    } finally {
      setArchiving(false)
    }
  }

  async function confirmImport() {
    if (!importFile || importing) return
    setImporting(true)
    try {
      const result = await catalogApi.bulkImport(importFile)
      setImportFile(null)
      setImportResult(result)
      await refresh()
    } catch (error) {
      setImportFile(null)
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The CSV import could not be completed.' })
    } finally {
      setImporting(false)
    }
  }

  const totals = useMemo(() => ({
    books: items.filter((item) => item.recordType === 'Book').length,
    research: items.filter((item) => item.recordType === 'Research/Thesis').length,
  }), [items])

  const filteredCopies = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    if (!q) return copies
    return copies.filter((copy) =>
      copy.title.toLowerCase().includes(q)
      || copy.accessionNumber.toLowerCase().includes(q)
      || copy.barcode.toLowerCase().includes(q)
      || copy.shelfLocation.toLowerCase().includes(q),
    )
  }, [copies, filters.q])

  const toolbarButton = 'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition'
  const secondaryButton = `${toolbarButton} border border-[#0b5ea2]/20 bg-white text-[#0b5ea2] hover:bg-zinc-50 dark:border-white/15 dark:bg-[#001a4d] dark:text-[#f2f6ff]`
  const primaryButton = `${toolbarButton} bg-[#0b5ea2] text-white hover:bg-[#004488]`

  return <>
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv,text/csv"
      className="sr-only"
      aria-label="Choose CSV file to import"
      onChange={(event) => {
        const file = event.target.files?.[0] ?? null
        event.target.value = ''
        if (file) setImportFile(file)
      }}
    />

    <div className="mb-5 rounded-2xl border border-[#0b5ea2]/15 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#001a4d]">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <a href={TEMPLATE_HREF} download className={secondaryButton}>
          <Download size={16} /> Download template
        </a>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={secondaryButton}>
          <Upload size={16} /> Import CSV
        </button>
        <button type="button" onClick={() => setForm('thesis')} className={secondaryButton}>
          <FileText size={16} /> Add thesis
        </button>
        <button type="button" onClick={() => setForm('book')} className={primaryButton}>
          <Plus size={16} /> Add book
        </button>
        <button type="button" onClick={() => void refresh()} aria-label="Refresh catalog" className={secondaryButton}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <p className="mt-2 text-right text-[11px] font-semibold text-[#0b5ea2]/55 dark:text-white/45">
        Import CSV loads many physical books. Add book registers one title with multiple copies.
      </p>
    </div>

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <SectionCard className="p-4">
        <BookOpen className="text-[#0b5ea2] dark:text-[#FFF200]" size={20} />
        <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#0b5ea2]/60 dark:text-white/50">Visible book titles</p>
        <p className="mt-0.5 font-display text-2xl font-black text-[#0b5ea2] dark:text-white">{totals.books}</p>
      </SectionCard>
      <SectionCard className="p-4">
        <FileText className="text-[#0b5ea2] dark:text-[#FFF200]" size={20} />
        <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#0b5ea2]/60 dark:text-white/50">Visible research</p>
        <p className="mt-0.5 font-display text-2xl font-black text-[#0b5ea2] dark:text-white">{totals.research}</p>
      </SectionCard>
      <SectionCard className="p-4">
        <Layers className="text-[#0b5ea2] dark:text-[#FFF200]" size={20} />
        <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#0b5ea2]/60 dark:text-white/50">Tracked copies</p>
        <p className="mt-0.5 font-display text-2xl font-black text-[#0b5ea2] dark:text-white">{copies.length}</p>
      </SectionCard>
    </div>

    <SectionCard className="mb-5 p-5">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <label className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 text-[#0b5ea2]/50" size={16} />
          <span className="sr-only">Search catalog</span>
          <input
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
            placeholder="Title, ISBN, author, code…"
            className={`${fieldClass} pl-9`}
          />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-1 xl:col-span-2">
          {([
            ['all', 'All'],
            ['books', 'Books'],
            ['research', 'Research'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filters.scope === value}
              onClick={() => setFilters({ ...filters, scope: value })}
              className={`h-10 rounded-xl px-3 text-xs font-bold ${filters.scope === value ? 'bg-[#0b5ea2] text-white' : 'border border-[#0b5ea2]/20 bg-white text-[#0b5ea2] dark:border-white/15 dark:bg-[#001a4d] dark:text-[#f2f6ff]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className={`${secondaryButton} xl:col-span-2`}
          aria-expanded={advancedOpen}
        >
          Advanced filters <ChevronDown size={15} className={`transition ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {advancedOpen ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })} className={fieldClass} aria-label="Category filter">
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>)}
          </select>
          <input value={filters.author} onChange={(event) => setFilters({ ...filters, author: event.target.value })} placeholder="Author" className={fieldClass} aria-label="Author filter" />
          <input value={filters.publicationYear} onChange={(event) => setFilters({ ...filters, publicationYear: event.target.value })} placeholder="Year" inputMode="numeric" className={fieldClass} aria-label="Year filter" />
          <select value={filters.availability} onChange={(event) => setFilters({ ...filters, availability: event.target.value })} className={fieldClass} aria-label="Availability filter">
            <option value="">Any availability</option>
            <option>Available</option>
            <option>Borrowed</option>
            <option>Reserved</option>
            <option>Unavailable</option>
            <option>Available for Viewing</option>
          </select>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilters(emptyFilters)} className={secondaryButton}>
          Clear filters
        </button>
      </div>
    </SectionCard>

    <SectionCard className="mb-5 overflow-hidden">
      <div className="border-b border-[#0b5ea2]/15 px-5 py-3.5 dark:border-white/10">
        <h2 className="font-bold text-[#0b5ea2] dark:text-white">Unified catalog results</h2>
        <p className="mt-1 text-xs font-semibold text-[#0b5ea2]/55 dark:text-white/45">{items.length} titles matching current filters</p>
      </div>
      <div className={tableScrollClass}>
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="sticky top-0 z-[2] bg-[#0b5ea2] text-white">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Title</th>
              <th className="px-3 py-2.5 font-semibold">Category</th>
              <th className="px-3 py-2.5 font-semibold">Shelf</th>
              <th className="px-3 py-2.5 font-semibold">Year</th>
              <th className="px-3 py-2.5 font-semibold">ISBN / code</th>
              <th className="px-3 py-2.5 font-semibold">Availability</th>
              <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center font-semibold text-[#0b5ea2]">Loading catalog…</td></tr>
            ) : items.length ? items.map((item) => (
              <tr key={item.titleId} className="border-b border-[#0b5ea2]/10 align-middle transition hover:bg-[#0b5ea2]/5 dark:border-white/10 dark:hover:bg-white/5">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    {item.recordType === 'Book' ? <BookCoverThumbnail title={item.title} coverImagePath={item.coverImagePath} className="h-12 w-8 shrink-0 rounded-md" /> : null}
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#0b5ea2] dark:text-white">{item.title}</p>
                      <p className="truncate text-[11px] text-[#0b5ea2]/60 dark:text-white/55">{item.authors.join(', ')}</p>
                      <span className="mt-0.5 inline-block rounded-md bg-[#0b5ea2]/8 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0b5ea2] dark:bg-white/10 dark:text-[#f2f6ff]">
                        {item.recordType === 'Book' ? 'Book' : 'Research'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-[#0b5ea2] dark:text-[#f2f6ff]">{item.categoryName ?? 'Uncategorized'}</td>
                <td className="px-3 py-2 text-[#0b5ea2] dark:text-[#f2f6ff]">
                  <span className="inline-flex items-center gap-1 font-semibold"><MapPin size={13} />{item.shelfLocation ?? 'Not mapped'}</span>
                  <p className={`mt-0.5 text-[11px] ${item.shelfStatus === 'Mismatch' ? 'font-bold text-red-700' : 'text-[#0b5ea2]/55 dark:text-white/45'}`}>
                    {item.shelfStatus === 'Mapped' ? `${item.activeInventoryCount} active ${item.activeInventoryCount === 1 ? 'copy' : 'copies'}` : item.shelfStatus}
                  </p>
                </td>
                <td className="px-3 py-2 text-[#0b5ea2] dark:text-[#f2f6ff]">{item.publicationYear ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-[#0b5ea2] dark:text-[#f2f6ff]">{item.isbn ?? item.research?.researchCode ?? '—'}</td>
                <td className="px-3 py-2"><StatusBadge status={item.availability} /></td>
                <td className="px-3 py-2">
                  <CatalogRowActions
                    item={item}
                    onViewDetails={() => setOverviewTitleId(item.titleId)}
                    onViewCodes={() => {
                      if (item.research?.researchInventoryId) setResearchAssetId(item.research.researchInventoryId)
                    }}
                    onChangeCategory={() => { setCategoryError(null); setCategoryItem(item) }}
                    onQuotations={() => setQuotationItem({ titleId: item.titleId, title: item.title })}
                    onArchive={() => { setArchiveReason(''); setArchiveItem(item) }}
                  />
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <BookOpen className="mx-auto text-[#0b5ea2]/40" size={32} />
                  <p className="mt-3 font-display text-lg font-bold text-[#0b5ea2] dark:text-white">No records match these filters</p>
                  <p className="mt-1 text-sm text-[#0b5ea2]/60 dark:text-white/55">Import existing stock from CSV or register a single title.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={secondaryButton}><Upload size={16} /> Import CSV</button>
                    <button type="button" onClick={() => setForm('book')} className={primaryButton}><Plus size={16} /> Add book</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>

    <SectionCard className="overflow-hidden">
      <div className="border-b border-[#0b5ea2]/15 px-5 py-3.5 dark:border-white/10">
        <h2 className="font-bold text-[#0b5ea2] dark:text-white">Physical copy register</h2>
        <p className="mt-1 text-xs font-semibold text-[#0b5ea2]/55 dark:text-white/45">
          {filteredCopies.length} of {copies.length} copies{filters.q.trim() ? ' matching search' : ' (latest page)'}
        </p>
      </div>
      <div className={tableScrollClass}>
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="sticky top-0 z-[2] bg-[#FFF200] text-[#0b5ea2]">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Accession</th>
              <th className="px-3 py-2.5 font-semibold">Title</th>
              <th className="px-3 py-2.5 font-semibold">Copy ID</th>
              <th className="px-3 py-2.5 font-semibold">Shelf</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 text-right font-semibold">Codes</th>
            </tr>
          </thead>
          <tbody>
            {filteredCopies.length ? filteredCopies.map((copy) => (
              <tr key={copy.physicalCopyId} className="border-b border-[#0b5ea2]/10 transition hover:bg-[#0b5ea2]/5 dark:border-white/10 dark:hover:bg-white/5">
                <td className="px-3 py-2 font-mono text-xs font-bold text-[#0b5ea2] dark:text-[#f2f6ff]">{copy.accessionNumber}</td>
                <td className="px-3 py-2 text-[#0b5ea2] dark:text-[#f2f6ff]">
                  <p className="font-semibold">{copy.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#0b5ea2]/55 dark:text-white/45">
                    {copy.conditionStatus}
                    {copy.lastScannedAt ? ` · Last scanned ${new Date(copy.lastScannedAt).toLocaleDateString()}` : ' · Never scanned'}
                  </p>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-[#0b5ea2] dark:text-[#f2f6ff]">{copy.barcode}</td>
                <td className="px-3 py-2 text-[#0b5ea2] dark:text-[#f2f6ff]">{copy.shelfLocation}</td>
                <td className="px-3 py-2"><StatusBadge status={copy.availabilityStatus} /></td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => setAssetCopyId(copy.physicalCopyId)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0b5ea2] px-2.5 text-xs font-bold text-white hover:bg-[#004488]">
                    <Eye size={14} /> View Codes
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center font-semibold text-[#0b5ea2]">
                  {copies.length ? 'No physical copies match the current search.' : 'No physical copies are loaded for this view.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>

    {notice ? (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm dark:bg-black/60 lg:left-[var(--sidebar-offset,0px)]">
        <div
          role={notice.tone === 'error' ? 'alertdialog' : 'dialog'}
          aria-modal="true"
          aria-labelledby="catalog-status-title"
          className="w-full max-w-md rounded-3xl border border-[#0b5ea2]/15 bg-white p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${notice.tone === 'error' ? 'bg-[#FFF200] text-[#0b5ea2]' : 'bg-emerald-100 text-emerald-700'}`}>
                {notice.tone === 'error' ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
              </span>
              <div>
                <p id="catalog-status-title" className="font-display text-lg font-bold text-[#0b5ea2]">{notice.tone === 'error' ? 'Action needed' : 'Success'}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#0b5ea2]/80">{notice.text}</p>
              </div>
            </div>
            <button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)} className="rounded-xl p-2 text-[#0b5ea2]/60 hover:bg-[#0b5ea2]/5"><X size={18} /></button>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => setNotice(null)} className="h-10 rounded-xl bg-[#0b5ea2] px-5 text-sm font-bold text-white hover:bg-[#004488]">OK</button>
          </div>
        </div>
      </div>
    ) : null}

    {importFile ? (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0b5ea2]/75 p-4 lg:left-[var(--sidebar-offset,0px)]">
        <div role="dialog" aria-modal="true" aria-labelledby="import-csv-title" className="w-full max-w-md rounded-2xl bg-white p-6 text-[#0b5ea2]">
          <h2 id="import-csv-title" className="font-display text-xl font-black">Import CSV books?</h2>
          <p className="mt-2 text-sm">This loads physical book stock using the library import template columns (Title, Author, ISBN, Publication_Year, Category_ID, Quantity).</p>
          <p className="mt-4 rounded-xl bg-[#0b5ea2]/5 p-3 font-mono text-xs font-bold">{importFile.name}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={importing} onClick={() => setImportFile(null)} className="rounded-xl border border-[#0b5ea2] px-4 py-2 font-bold">Cancel</button>
            <button type="button" disabled={importing} onClick={() => void confirmImport()} className="rounded-xl bg-[#0b5ea2] px-4 py-2 font-bold text-white disabled:opacity-50">
              {importing ? 'Importing…' : 'Yes, import'}
            </button>
          </div>
        </div>
      </div>
    ) : null}

    {importResult ? (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm lg:left-[var(--sidebar-offset,0px)]">
        <div role="dialog" aria-modal="true" aria-labelledby="import-result-title" className="w-full max-w-md rounded-3xl border border-[#0b5ea2]/15 bg-white p-6 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={22} /></span>
            <div>
              <h2 id="import-result-title" className="font-display text-lg font-bold text-[#0b5ea2]">Import complete</h2>
              <p className="mt-2 text-sm font-semibold text-[#0b5ea2]/80">{importResult.message}</p>
              <p className="mt-3 text-xs font-bold text-[#0b5ea2]/60">{importResult.booksCreated} books · {importResult.copiesCreated} copies</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => setImportResult(null)} className="h-10 rounded-xl bg-[#0b5ea2] px-5 text-sm font-bold text-white">Done</button>
          </div>
        </div>
      </div>
    ) : null}

    {form === 'book' ? <AddMultipleCopiesModal categories={categories} onClose={() => setForm(null)} onCreated={async () => { await refresh(); setNotice({ tone: 'success', text: 'Book copies and printable labels created successfully.' }) }} /> : null}
    {form === 'thesis' ? <AddResearchModal locations={Array.from(new Set(categories.map((category) => category.shelfLocation).filter(Boolean)))} onClose={() => setForm(null)} onCreated={refresh} /> : null}
    {overviewTitleId !== null ? <BookOverview titleId={overviewTitleId} role="Admin" activeBookCount={0} selectedBookCount={0} alreadySelected={false} onAddToCart={() => undefined} onClose={() => setOverviewTitleId(null)} /> : null}
    {assetCopyId !== null ? <AssetCodeModal physicalCopyId={assetCopyId} onClose={() => setAssetCopyId(null)} /> : null}
    {researchAssetId !== null ? <AssetCodeModal assetType="research" researchInventoryId={researchAssetId} onClose={() => setResearchAssetId(null)} /> : null}
    {categoryItem ? <ChangeTitleCategoryModal item={categoryItem} categories={categories} saving={changingCategory} error={categoryError} onClose={() => { if (!changingCategory) setCategoryItem(null) }} onConfirm={(categoryId) => void changeCategory(categoryId)} /> : null}
    {archiveItem ? (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b5ea2]/75 p-4 lg:left-[var(--sidebar-offset,0px)]">
        <div role="dialog" aria-modal="true" aria-label="Archive book" className="w-full max-w-md rounded-2xl bg-white p-6 text-[#0b5ea2]">
          <h2 className="text-xl font-black">Archive {archiveItem.title}?</h2>
          <p className="mt-2 text-sm">The book and its copies will leave the active catalog. Their records will remain in Book archive. Active loans or reservations must be completed first.</p>
          <label className="mt-5 block text-sm font-bold">Reason for archiving<textarea value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} maxLength={255} rows={3} className="mt-2 w-full rounded-xl border border-[#0b5ea2]/20 p-3" /></label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={archiving} onClick={() => setArchiveItem(null)} className="rounded-xl border border-[#0b5ea2] px-4 py-2 font-bold">Cancel</button>
            <button type="button" disabled={archiving || !archiveReason.trim()} onClick={() => void archiveBook()} className="rounded-xl bg-[#0b5ea2] px-4 py-2 font-bold text-white disabled:opacity-50">Archive book</button>
          </div>
        </div>
      </div>
    ) : null}
    {quotationItem ? <BookQuotationModal titleId={quotationItem.titleId} title={quotationItem.title} onClose={closeQuotationModal} /> : null}
  </>
}
