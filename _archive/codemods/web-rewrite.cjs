const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/CatalogManagementPage.tsx', 'utf8');

// 1. Imports
code = code.replace(/import \{ BookQuotationModal \} from '\.\/BookQuotationModal'/, "import { BookQuotationModal } from './BookQuotationModal'\nimport { PhysicalCopiesModal } from './PhysicalCopiesModal'\nimport { CatalogActionDropdown } from './CatalogActionDropdown'");

// 2. Remove PhysicalCopy from types import
code = code.replace(/, PhysicalCopy/, '');
code = code.replace(/const \[copies, setCopies\] = useState\<PhysicalCopy\[\]\>\(\[\]\)/, 'const [physicalCopiesTitle, setPhysicalCopiesTitle] = useState<{id: number, title: string} | null>(null)');

// 3. Update initial fetch to remove copies
code = code.replace(/catalogApi\.copies\(\), /, '');
code = code.replace(/const \[catalog, copyRows, categoryRows\] = await Promise\.all\(\[/, 'const [catalog, categoryRows] = await Promise.all([');
code = code.replace(/setItems\(catalog\.items\); setCopies\(copyRows\); setCategories\(categoryRows\); setNotice\(null\)/, 'setItems(catalog.items); setCategories(categoryRows); setNotice(null)');

// 4. Update the filter bar and actions header
const newFilterBar = `
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setForm('book')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0b5ea2] px-4 font-bold text-white transition-colors hover:bg-[#0b5ea2]/90"><Plus size={18} /> Add Books</button>
        <button type="button" onClick={() => setForm('thesis')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#0b5ea2]/20 bg-white px-4 font-bold text-[#0b5ea2] transition-colors hover:bg-zinc-50"><Plus size={18} /> Add Thesis</button>
        
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#0b5ea2]/20 bg-white px-4 font-bold text-[#0b5ea2] transition-colors hover:bg-zinc-50">
          <FileText size={18} /> Bulk Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleBulkImport} />
        </label>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setFilters(f => ({ ...f, q: new FormData(e.currentTarget).get('q') as string })) }} className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input name="q" defaultValue={filters.q} placeholder="Search catalog..." className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#0b5ea2] focus:ring-4 focus:ring-[#0b5ea2]/10" />
      </form>
    </div>
`;

code = code.replace(/<div className="mb-5 flex flex-wrap gap-2">\s*<button[\s\S]*?<\/label>\s*<\/div>/, newFilterBar);

// 5. Remove old filter section card
code = code.replace(/<SectionCard className="mb-5">[\s\S]*?<\/SectionCard>/, '');

// 6. Rewrite the Unified catalog table
const newTable = `
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
            <tr>
              <th className="px-5 py-3 font-semibold">Title</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">Location</th>
              <th className="px-5 py-3 font-semibold">Code</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-zinc-500">Loading catalog...</td></tr>
            ) : items.length ? items.map((item) => (
              <tr key={item.titleId} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {item.recordType === 'Book' ? <BookCoverThumbnail title={item.title} coverImagePath={item.coverImagePath} className="h-16 w-11 shrink-0 rounded-md shadow-sm border border-zinc-200/50" /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-900 line-clamp-1">{item.title}</p>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{item.authors.join(', ')}</p>
                      <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 mt-2">{item.recordType}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-zinc-700">{item.categoryName ?? 'Uncategorized'}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-col items-start">
                    <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700"><MapPin size={14} className="text-zinc-400" />{item.shelfLocation ?? 'Not mapped'}</span>
                    <p className={\`mt-1 text-[11px] font-medium \${item.shelfStatus === 'Mismatch' ? 'text-red-600' : 'text-zinc-500'}\`}>{item.shelfStatus === 'Mapped' ? \`\${item.activeInventoryCount} active copy\` : item.shelfStatus}</p>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-zinc-600">{item.isbn ?? item.research?.researchCode ?? '---'}</td>
                <td className="px-5 py-4"><StatusBadge status={item.availability} /></td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end">
                    <CatalogActionDropdown 
                      item={item} 
                      onViewDetails={() => item.recordType === 'Book' ? setOverviewTitleId(item.titleId) : setResearchAssetId(item.research!.researchInventoryId)} 
                      onViewCopies={() => setPhysicalCopiesTitle({ id: item.titleId, title: item.title })} 
                      onChangeCategory={() => { setCategoryError(null); setCategoryItem(item) }} 
                      onQuotations={() => setQuotationItem(item)} 
                      onArchive={() => { setArchiveReason(''); setArchiveItem(item) }} 
                    />
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-zinc-500">No records match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
`;

code = code.replace(/<SectionCard className="mb-5 overflow-hidden">[\s\S]*?<\/SectionCard>/, newTable);

// 7. Remove the physical copy register table
code = code.replace(/<SectionCard className="overflow-hidden"><div className="border-b border-\[\#0b5ea2\]\/15 px-5 py-4\">[\s\S]*?<\/SectionCard>/, '');

// 8. Add PhysicalCopiesModal to the end
code = code.replace(/<\/div><\/div> : null}\n\s*\{quotationItem \? <BookQuotationModal titleId=\{quotationItem\.titleId\} title=\{quotationItem\.title\} onClose=\{\(\) => setQuotationItem\(null\)\} \/> : null}/, 
  `</div></div> : null}
    {quotationItem ? <BookQuotationModal titleId={quotationItem.titleId} title={quotationItem.title} onClose={() => setQuotationItem(null)} /> : null}
    {physicalCopiesTitle !== null ? <PhysicalCopiesModal titleId={physicalCopiesTitle.id} title={physicalCopiesTitle.title} onClose={() => setPhysicalCopiesTitle(null)} /> : null}`);

fs.writeFileSync('src/features/catalog/CatalogManagementPage.tsx', code);
