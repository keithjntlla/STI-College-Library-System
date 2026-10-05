import { type FormEvent, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { CampusProgram, Category, CategoryPayload } from './types'

const inputClass = 'h-11 w-full rounded-xl border border-[#0b5ea2]/20 bg-[#FFFFFF] px-3 text-sm text-[#0b5ea2] outline-none focus:border-[#0b5ea2] focus:ring-4 focus:ring-[#0b5ea2]/10'

const GROUP_ORDER = ['College', 'SHS Academic', 'SHS TechPro'] as const

function groupLabel(group: string) {
  if (group === 'SHS Academic') return 'Senior High — Academic'
  if (group === 'SHS TechPro') return 'Senior High — TechPro'
  return group
}

export function CreateCategoryModal({ category, programs, shelves, saving, errors, onSubmit, onClose }: {
  category: Category | null
  programs: CampusProgram[]
  shelves: Array<{ id: number; label: string; columnCount: number; rowCount: number }>
  saving: boolean
  errors: Record<string, string>
  onSubmit: (payload: CategoryPayload) => Promise<void>
  onClose: () => void
}) {
  const currentShelfIsManaged = !category || shelves.some((shelf) => shelf.label === category.shelfLocation)
  const [shelfLabel, setShelfLabel] = useState(currentShelfIsManaged ? category?.shelfLocation ?? '' : '')
  const [selectedProgramIds, setSelectedProgramIds] = useState<number[]>(() => category?.programIds ?? [])
  const selectedShelf = shelves.find((shelf) => shelf.label === shelfLabel)

  const programsByGroup = useMemo(() => {
    const groups = new Map<string, CampusProgram[]>()
    for (const program of programs) {
      const list = groups.get(program.programGroup) ?? []
      list.push(program)
      groups.set(program.programGroup, list)
    }
    const ordered = GROUP_ORDER.filter((group) => groups.has(group)).map((group) => ({
      group,
      programs: groups.get(group) ?? [],
    }))
    for (const [group, list] of groups) {
      if (!GROUP_ORDER.includes(group as typeof GROUP_ORDER[number])) ordered.push({ group, programs: list })
    }
    return ordered
  }, [programs])

  function toggleProgram(programId: number) {
    setSelectedProgramIds((current) => (
      current.includes(programId) ? current.filter((id) => id !== programId) : [...current, programId]
    ))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    void onSubmit({
      categoryName: String(data.get('categoryName') ?? ''),
      description: String(data.get('description') ?? ''),
      shelfLocation: String(data.get('shelfLocation') ?? ''),
      shelfColumn: Number(data.get('shelfColumn') ?? 1),
      shelfRow: Number(data.get('shelfRow') ?? 1),
      textbookRecencyRule: data.get('textbookRecencyRule') === 'on',
      programIds: selectedProgramIds,
    })
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b5ea2]/80 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="category-record-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#FFFFFF] shadow-2xl">
      <header className="flex items-start justify-between border-b border-[#0b5ea2]/15 p-5"><div><p className="text-xs font-bold uppercase text-[#0b5ea2]">Category record</p><h2 id="category-record-title" className="text-xl font-black text-[#0b5ea2]">{category ? 'Edit category' : 'Create category'}</h2></div><button aria-label="Close" disabled={saving} onClick={onClose} className="p-2 text-[#0b5ea2] disabled:opacity-40"><X /></button></header>
      <form onSubmit={submit} className="space-y-4 p-5">
        <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-[#0b5ea2]">Category name *</span><input name="categoryName" required maxLength={100} defaultValue={category?.categoryName ?? ''} className={inputClass} />{errors.categoryName ? <span className="mt-1 block text-xs font-semibold text-[#0b5ea2]">{errors.categoryName}</span> : null}</label>
        <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-[#0b5ea2]">Description</span><textarea name="description" maxLength={255} rows={3} defaultValue={category?.description ?? ''} placeholder="What books belong in this category?" className={`${inputClass} min-h-20 py-2`} />{errors.description ? <span className="mt-1 block text-xs font-semibold text-[#0b5ea2]">{errors.description}</span> : null}</label>
        <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-[#0b5ea2]">Shelf location *</span><select name="shelfLocation" required value={shelfLabel} onChange={(event) => setShelfLabel(event.target.value)} className={inputClass}><option value="">{currentShelfIsManaged ? 'Select a shelf' : `Current location “${category?.shelfLocation}” is not in Floor Plan — select a shelf`}</option>{shelves.map((shelf) => <option key={shelf.id} value={shelf.label}>{shelf.label}</option>)}</select>{errors.shelfLocation ? <span className="mt-1 block text-xs font-semibold text-[#0b5ea2]">{errors.shelfLocation}</span> : null}{!shelves.length ? <span className="mt-1 block text-xs text-[#0b5ea2]/65">Create a shelf in Floor Plan first.</span> : null}</label>
        {selectedShelf ? <div key={selectedShelf.id} className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-[#0b5ea2]">Column *</span><select name="shelfColumn" defaultValue={category?.shelfLocation===shelfLabel?category.shelfColumn:1} className={inputClass}>{Array.from({length:selectedShelf.columnCount},(_,index)=><option key={index+1} value={index+1}>Column {index+1}</option>)}</select>{errors.shelfColumn?<span className="mt-1 block text-xs font-semibold">{errors.shelfColumn}</span>:null}</label><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-[#0b5ea2]">Row *</span><select name="shelfRow" defaultValue={category?.shelfLocation===shelfLabel?category.shelfRow:1} className={inputClass}>{Array.from({length:selectedShelf.rowCount},(_,index)=><option key={index+1} value={index+1}>Row {index+1}</option>)}</select>{errors.shelfRow?<span className="mt-1 block text-xs font-semibold">{errors.shelfRow}</span>:null}</label></div>:null}
        <fieldset className="rounded-xl border border-[#0b5ea2]/15 p-3">
          <legend className="px-1 text-xs font-bold uppercase text-[#0b5ea2]">Relevant for courses</legend>
          <p className="mb-3 text-xs text-[#0b5ea2]/70">Students who filter the catalog by a course will see this category only when it is linked here.</p>
          {programsByGroup.length ? programsByGroup.map(({ group, programs: groupPrograms }) => (
            <div key={group} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0b5ea2]/55">{groupLabel(group)}</p>
              <div className="space-y-1.5">
                {groupPrograms.map((program) => (
                  <label key={program.programId} className="flex items-start gap-2 text-sm text-[#0b5ea2]">
                    <input
                      type="checkbox"
                      checked={selectedProgramIds.includes(program.programId)}
                      onChange={() => toggleProgram(program.programId)}
                      className="mt-0.5 h-4 w-4 accent-[#0b5ea2]"
                    />
                    <span>{program.programName}</span>
                  </label>
                ))}
              </div>
            </div>
          )) : <p className="text-xs text-[#0b5ea2]/65">No campus courses are available yet. Apply the programs migration first.</p>}
          {errors.programIds ? <span className="mt-2 block text-xs font-semibold text-[#0b5ea2]">{errors.programIds}</span> : null}
        </fieldset>
        <label className="flex items-start gap-3 rounded-xl border border-[#0b5ea2]/15 bg-[#0b5ea2]/5 p-3">
          <input name="textbookRecencyRule" type="checkbox" defaultChecked={category?.textbookRecencyRule ?? false} className="mt-1 h-4 w-4 accent-[#0b5ea2]" />
          <span>
            <span className="block text-xs font-bold uppercase text-[#0b5ea2]">5-year textbook recency review</span>
            <span className="mt-1 block text-xs text-[#0b5ea2]/70">When on, titles in this category with a copyright year older than five years appear on the weeding review list. Classics and Filipiniana stay off this switch.</span>
          </span>
        </label>
        {errors.textbookRecencyRule ? <span className="block text-xs font-semibold text-[#0b5ea2]">{errors.textbookRecencyRule}</span> : null}
        <div className="flex justify-end gap-2 pt-2"><button type="button" disabled={saving} onClick={onClose} className="h-11 rounded-xl border border-[#0b5ea2] bg-[#FFFFFF] px-5 font-bold text-[#0b5ea2] disabled:opacity-40">Cancel</button><button disabled={saving || !shelves.length} type="submit" className="h-11 rounded-xl bg-[#0b5ea2] px-5 font-bold text-[#FFFFFF] disabled:opacity-50">{saving ? 'Saving…' : 'Save category'}</button></div>
      </form>
    </div>
  </div>
}
