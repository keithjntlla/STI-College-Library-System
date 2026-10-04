const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/CatalogManagementPage.tsx', 'utf8');

// 1. Update emptyFilters
code = code.replace(/const emptyFilters: CatalogFilters = \{ q: '', scope: 'all', categoryId: '', author: '', publicationYear: '', availability: '' \}/, "const emptyFilters: CatalogFilters = { q: '', scope: 'all', categoryId: '', author: '', publicationYear: '', availability: '', page: 1 }");

// 2. Add totalCount state
code = code.replace(/const \[items, setItems\] = useState<CatalogItem\[\]>\(\[\]\)/, "const [items, setItems] = useState<CatalogItem[]>([])\n  const [totalCount, setTotalCount] = useState(0)");

// 3. Update load/refresh to setTotalCount
code = code.replace(/setItems\(catalog\.items\); setCategories\(categoryRows\);/, "setItems(catalog.items); setTotalCount(catalog.pagination.total); setCategories(categoryRows);");

// 4. Remove hardware scanner card and scannerActive logic
code = code.replace(/const \[scannerActive, setScannerActive\] = useState\(false\)/, "");
code = code.replace(/useBarcodeScanner\([\s\S]*?\)/, "");
code = code.replace(/<SectionCard className="mb-5 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex flex-1 items-center gap-3"><span className="rounded-xl bg-\[\#FFF200\] p-3 text-\[\#0b5ea2\]"><ScanBarcode \/><\/span><div><h2 className="font-bold text-\[\#0b5ea2\]">Hardware scanner hook<\/h2><p className="text-xs text-\[\#0b5ea2\]\/65">Scan a barcode or ISBN at normal scanner speed, followed by Enter.<\/p><\/div><\/div><button onClick=\{\(\) => setScannerActive\(\(active\) => !active\)\} className=\{`rounded-xl border border-\[\#0b5ea2\] px-4 py-2 text-sm font-bold \$\{scannerActive \? 'bg-\[\#0b5ea2\] text-white' : 'bg-white text-\[\#0b5ea2\]'\}`\}>\{scannerActive \? 'Scanner listening' : 'Scanner paused'\}<\/button><\/div><\/SectionCard>/, "");

// 5. Update top cards to show just "Matching Records"
const topCardsRegex = /<div className=\"mb-5 grid gap-3 sm:grid-cols-3\">[\s\S]*?<\/SectionCard><\/div>/;
const newTopCards = `<div className="mb-5 grid gap-3 sm:grid-cols-3"><SectionCard className="p-5"><BookOpen className="text-[#0b5ea2]" /><p className="mt-3 text-xs font-bold uppercase text-[#0b5ea2]/60">Matching records</p><p className="mt-1 text-3xl font-black text-[#0b5ea2]">{totalCount}</p></SectionCard></div>`;
code = code.replace(topCardsRegex, newTopCards);

// 6. Update the table to add Pagination UI
const tableRegex = /<\/table>\s*<\/div>\s*<\/div>/;
const paginationUI = `</table>
      </div>
      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3">
        <p className="text-sm text-zinc-500">
          Showing <span className="font-semibold text-zinc-900">{items.length > 0 ? ((filters.page || 1) - 1) * 25 + 1 : 0}</span> to <span className="font-semibold text-zinc-900">{Math.min(((filters.page || 1) - 1) * 25 + 25, totalCount)}</span> of <span className="font-semibold text-zinc-900">{totalCount}</span> results
        </p>
        <div className="flex gap-2">
          <button 
            disabled={(filters.page || 1) <= 1 || loading} 
            onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button 
            disabled={((filters.page || 1) * 25) >= totalCount || loading} 
            onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>`;
code = code.replace(tableRegex, paginationUI);

// Remove unused 'totals' useMemo
code = code.replace(/const totals = useMemo\([\s\S]*?\[items\]\)/, "");

fs.writeFileSync('src/features/catalog/CatalogManagementPage.tsx', code);
