import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, BookOpen, FileText, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { MobileList, MobileListItem, PageHeader, SectionCard, TableShell } from '../../components/ui'
import { categoryApi, CategoryApiError } from './category-api'
import type { CampusProgram, Category, CategoryPayload } from './types'
import { CreateCategoryModal } from './CreateCategoryModal'

const inputClass = 'h-11 w-full rounded-xl border border-[#0b5ea2]/20 bg-white px-3 text-sm text-[#0b5ea2] outline-none focus:border-[#0b5ea2] focus:ring-4 focus:ring-[#0b5ea2]/10'
const cannotDeleteTooltip = 'Cannot delete category while materials are assigned to it.'
const dateAdded = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

type Editor = { mode: 'create' | 'edit'; category: Category | null }

export function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [programs, setPrograms] = useState<CampusProgram[]>([])
  const [shelves, setShelves] = useState<Array<{ id: number; label: string; columnCount: number; rowCount: number }>>([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [reassignTarget, setReassignTarget] = useState<Category | null>(null)
  const [targetCategoryId, setTargetCategoryId] = useState('')
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [newShelf, setNewShelf] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextCategories, nextShelves, nextPrograms] = await Promise.all([
        categoryApi.list(), categoryApi.listShelves(), categoryApi.listPrograms(),
      ])
      setCategories(nextCategories.map((category) => ({ ...category, programIds: category.programIds ?? [] })))
      setShelves(nextShelves)
      setPrograms(nextPrograms)
      setNotice(null)
    }
    catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : 'Categories could not be loaded.' }) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const programNameById = useMemo(() => new Map(programs.map((program) => [program.programId, program.programName])), [programs])

  const totals = useMemo(() => categories.reduce((result, category) => ({
    books: result.books + category.totalBooksCount,
    theses: result.theses + category.totalThesisCount,
  }), { books: 0, theses: 0 }), [categories])

  async function submitEditor(payload: CategoryPayload) {
    if (!editor) return
    setSaving(true); setFieldErrors({})
    try {
      const saved = editor.mode === 'create'
        ? await categoryApi.create(payload)
        : await categoryApi.update(editor.category!.categoryId, payload)
      setEditor(null)
      await load()
      setNotice({ error: false, message: editor.mode === 'create'
        ? 'Category created successfully.'
        : `Category updated. ${saved.bookCopies ?? 0} book copies and ${saved.researchCopies ?? 0} theses are now assigned to ${saved.shelfLocation}, Column ${saved.shelfColumn}, Row ${saved.shelfRow}.` })
    } catch (error) {
      const apiError = error as CategoryApiError
      setFieldErrors(apiError.errors ?? {})
      setNotice({ error: true, message: apiError.message })
    } finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await categoryApi.remove(deleteTarget.categoryId)
      setDeleteTarget(null); await load(); setNotice({ error: false, message: 'Category deleted successfully.' })
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : 'Category could not be deleted.' }) }
    finally { setSaving(false) }
  }

  async function confirmReassignment() {
    if (!reassignTarget || !targetCategoryId) return
    setSaving(true)
    try {
      const synchronized = await categoryApi.reassign(reassignTarget.categoryId, Number(targetCategoryId))
      setReassignTarget(null); setTargetCategoryId(''); await load(); setNotice({ error: false, message: `Category reassigned. ${synchronized.bookCopies} book copies and ${synchronized.researchCopies} theses now use the target category shelf.` })
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : 'Category reassignment failed.' }) }
    finally { setSaving(false) }
  }

  async function addShelf() {
    const label = newShelf.trim()
    if (!label) return
    setSaving(true)
    try {
      await categoryApi.addShelf(label)
      setNewShelf('')
      await load()
      setNotice({ error: false, message: `Shelf ${label} is ready for category assignments.` })
    } catch (error) { setNotice({ error: true, message: error instanceof Error ? error.message : 'Shelf could not be added.' }) }
    finally { setSaving(false) }
  }

  const linkedCourseLabel = (category: Category) => {
    const names = (category.programIds ?? []).map((id) => programNameById.get(id)).filter(Boolean) as string[]
    return names.length ? <span title={names.join(', ')}>{names.length} course{names.length === 1 ? '' : 's'}</span> : <span className="text-[#0b5ea2]/45">None</span>
  }

  const categoryActions = (category: Category, touch = false) => {
    const assigned = category.totalBooksCount + category.totalThesisCount > 0
    const size = touch ? 'h-10 w-10 inline-flex items-center justify-center' : 'p-2'
    return <>
      <button title="Edit category" aria-label={`Edit ${category.categoryName}`} onClick={() => { setFieldErrors({}); setEditor({ mode: 'edit', category }) }} className={`${size} rounded-lg hover:bg-[#0b5ea2]/10`}><Pencil size={16} /></button>
      {assigned ? <button title="Reassign all materials" aria-label={`Reassign ${category.categoryName}`} onClick={() => { setReassignTarget(category); setTargetCategoryId('') }} className={`${size} rounded-lg hover:bg-[#0b5ea2]/10`}><ArrowRightLeft size={16} /></button> : null}
      <button title={assigned ? cannotDeleteTooltip : 'Delete category'} aria-label={assigned ? cannotDeleteTooltip : `Delete ${category.categoryName}`} disabled={assigned} onClick={() => setDeleteTarget(category)} className={`${size} rounded-lg enabled:hover:bg-[#FFF200] disabled:cursor-not-allowed disabled:bg-[#0b5ea2]/5 disabled:text-[#0b5ea2]/25`}><Trash2 size={16} /></button>
    </>
  }

  const mobileRows = (
    <MobileList empty={loading
      ? <p className="px-5 py-10 text-center text-[#0b5ea2]">Loading categories…</p>
      : !categories.length ? <p className="px-5 py-10 text-center text-[#0b5ea2]">No categories have been registered.</p> : null}
    >
      {loading ? null : categories.map((category) => (
        <MobileListItem
          key={category.categoryId}
          title={category.categoryName}
          meta={<>ID {category.categoryId} · Added {dateAdded(category.createdAt)}</>}
          status={<span className="rounded-full bg-[#FFF200] px-3 py-1 text-[11px] font-bold text-[#0b5ea2]">{category.shelfLocation} · C{category.shelfColumn} · R{category.shelfRow}</span>}
          detail={(
            <div className="space-y-2">
              {category.description ? <p className="line-clamp-2">{category.description}</p> : null}
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div><dt className="font-semibold uppercase text-[#0b5ea2]/50">Books</dt><dd className="mt-0.5 font-bold">{category.totalBooksCount}</dd></div>
                <div><dt className="font-semibold uppercase text-[#0b5ea2]/50">Theses</dt><dd className="mt-0.5 font-bold">{category.totalThesisCount}</dd></div>
                <div><dt className="font-semibold uppercase text-[#0b5ea2]/50">Courses</dt><dd className="mt-0.5 font-bold">{linkedCourseLabel(category)}</dd></div>
              </dl>
            </div>
          )}
          actions={categoryActions(category, true)}
        />
      ))}
    </MobileList>
  )

  return <>
    <PageHeader eyebrow="Classification administration" title="Category management" description="Maintain catalog classifications, shelf locations, course browse links, and active book/research assignments." action={<button onClick={() => { setFieldErrors({}); setEditor({ mode: 'create', category: null }) }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0b5ea2] px-4 text-sm font-bold text-white"><Plus size={16} /> Add category</button>} />

    {notice ? <div role="alert" className={`mb-5 flex items-start justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${notice.error ? 'border-[#FFF200] bg-[#FFF200] text-[#0b5ea2]' : 'border-[#0b5ea2] bg-white text-[#0b5ea2]'}`}><span>{notice.message}</span><button aria-label="Dismiss alert" onClick={() => setNotice(null)}><X size={16} /></button></div> : null}

    <SectionCard className="mb-5 p-5"><h2 className="font-bold text-[#0b5ea2]">Managed shelves</h2><p className="mt-1 text-sm text-[#0b5ea2]/70">Create a shelf label here, then assign categories and books to it.</p><form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void addShelf() }}><input aria-label="New shelf label" value={newShelf} onChange={(event) => setNewShelf(event.target.value)} maxLength={100} placeholder="Shelf label" className={`${inputClass} max-w-xs`} /><button disabled={saving || !newShelf.trim()} className="rounded-xl bg-[#0b5ea2] px-4 text-sm font-bold text-white disabled:opacity-50">Add shelf</button></form><p className="mt-3 text-xs text-[#0b5ea2]/65">{shelves.length} shelves available</p></SectionCard>

    <div className="mb-5 grid gap-3 sm:grid-cols-3"><SectionCard className="p-5"><Tags className="text-[#0b5ea2]" /><p className="mt-3 text-xs font-bold uppercase text-[#0b5ea2]/60">Categories</p><p className="mt-1 text-3xl font-black text-[#0b5ea2]">{categories.length}</p></SectionCard><SectionCard className="p-5"><BookOpen className="text-[#0b5ea2]" /><p className="mt-3 text-xs font-bold uppercase text-[#0b5ea2]/60">Active physical books</p><p className="mt-1 text-3xl font-black text-[#0b5ea2]">{totals.books}</p></SectionCard><SectionCard className="p-5"><FileText className="text-[#0b5ea2]" /><p className="mt-3 text-xs font-bold uppercase text-[#0b5ea2]/60">Active theses</p><p className="mt-1 text-3xl font-black text-[#0b5ea2]">{totals.theses}</p></SectionCard></div>

    <TableShell title="Classification directory" mobileRows={mobileRows}><table className="w-full min-w-[1240px] text-left text-sm"><thead className="bg-[#0b5ea2] text-white"><tr>{['ID', 'Category name', 'Description', 'Shelf location', 'Linked courses', 'Textbook review', 'Book copies', 'Active theses', 'Date added', 'Actions'].map(label => <th key={label} className="px-5 py-3">{label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={10} className="px-5 py-10 text-center text-[#0b5ea2]">Loading categories…</td></tr> : categories.length ? categories.map((category) => { const linkedNames = (category.programIds ?? []).map((id) => programNameById.get(id)).filter(Boolean) as string[]; return <tr key={category.categoryId} className="border-b border-[#0b5ea2]/10 text-[#0b5ea2]"><td className="px-5 py-4 font-mono text-xs">{category.categoryId}</td><td className="px-5 py-4 font-bold">{category.categoryName}</td><td className="max-w-60 px-5 py-4">{category.description || 'No description'}</td><td className="px-5 py-4"><span className="rounded-full bg-[#FFF200] px-3 py-1 text-xs font-bold">{category.shelfLocation} · C{category.shelfColumn} · R{category.shelfRow}</span></td><td className="max-w-56 px-5 py-4 text-xs font-semibold">{linkedNames.length ? <span title={linkedNames.join(', ')}>{linkedNames.length} course{linkedNames.length === 1 ? '' : 's'}</span> : <span className="text-[#0b5ea2]/45">None</span>}</td><td className="px-5 py-4 text-xs font-bold">{category.textbookRecencyRule ? '5-year rule on' : 'Off'}</td><td className="px-5 py-4 font-bold">{category.totalBooksCount}</td><td className="px-5 py-4 font-bold">{category.totalThesisCount}</td><td className="whitespace-nowrap px-5 py-4">{dateAdded(category.createdAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1">{categoryActions(category)}</div></td></tr> }) : <tr><td colSpan={10} className="px-5 py-10 text-center text-[#0b5ea2]">No categories have been registered.</td></tr>}</tbody></table></TableShell>

    {editor ? <CreateCategoryModal category={editor.category} programs={programs} shelves={shelves} saving={saving} errors={fieldErrors} onSubmit={submitEditor} onClose={() => setEditor(null)} /> : null}

    {deleteTarget ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b5ea2]/80 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><Trash2 className="text-[#0b5ea2]" /><h2 className="mt-4 text-xl font-black text-[#0b5ea2]">Delete {deleteTarget.categoryName}?</h2><p className="mt-2 text-sm text-[#0b5ea2]/65">This is allowed only because no active books or theses are assigned. The server will verify again inside a transaction.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} className="h-10 rounded-xl border border-[#0b5ea2] px-4 font-bold text-[#0b5ea2]">Cancel</button><button disabled={saving} onClick={() => void confirmDelete()} className="h-10 rounded-xl bg-[#FFF200] px-4 font-bold text-[#0b5ea2]">Delete category</button></div></div></div> : null}

    {reassignTarget ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b5ea2]/80 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6"><ArrowRightLeft className="text-[#0b5ea2]" /><h2 className="mt-4 text-xl font-black text-[#0b5ea2]">Reassign {reassignTarget.categoryName}</h2><p className="mt-2 text-sm text-[#0b5ea2]/65">All linked books and theses will move in one transaction, then this category will be removed.</p><label className="mt-5 block"><span className="mb-1.5 block text-xs font-bold uppercase text-[#0b5ea2]">Target category *</span><select value={targetCategoryId} onChange={(event) => setTargetCategoryId(event.target.value)} className={inputClass}><option value="">Select target</option>{categories.filter((category) => category.categoryId !== reassignTarget.categoryId).map((category) => <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>)}</select></label><div className="mt-6 flex justify-end gap-2"><button onClick={() => setReassignTarget(null)} className="h-10 rounded-xl border border-[#0b5ea2] px-4 font-bold text-[#0b5ea2]">Cancel</button><button disabled={saving || !targetCategoryId} onClick={() => void confirmReassignment()} className="h-10 rounded-xl bg-[#0b5ea2] px-4 font-bold text-white disabled:opacity-50">Reassign materials</button></div></div></div> : null}
  </>
}
