import { Download, Droplets, PackageOpen, Plus, RefreshCw, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button, ConfirmModal, PageHeader, SectionCard, StatCard, StatusBadge, StatusModal } from '../../components/ui'
import {
  printingApi,
  type ExpenseSummary,
  type FinanceFilters,
  type FinancePeriod,
  type RestockEntry,
  type RevenueEntry,
  type RevenueSummary,
  type StockUsageEntry,
  type SupplyData,
} from './printing-api'

type Tab = 'stock' | 'reports'
type Selection = { kind: 'ink' | 'paper'; id: number; name: string; unit: 'bottles' | 'reams'; current: number }
type UsageSelection = { kind: 'ink' | 'paper'; id: number; name: string; current: number }
type ThresholdEdit = { kind: 'ink' | 'paper'; id: number; name: string; threshold: number }

const input = 'mt-1 h-11 w-full rounded-xl border border-[#0b5ea2]/20 bg-[#FFFFFF] px-3 text-[#0b5ea2] outline-none focus:border-[#0b5ea2]'
const paperSizes = ['Short', 'A4', 'Long'] as const

function manilaToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
function money(value: number | string | undefined) { return `₱${Number(value ?? 0).toFixed(2)}` }
function whole(value: number | string | null | undefined, fallback = '0') { return value == null ? fallback : String(Math.trunc(Number(value))) }
function initialFilters(): FinanceFilters {
  const date = manilaToday()
  return { period: 'monthly', date, month: date.slice(0, 7), week: Math.min(4, Math.ceil(Number(date.slice(8, 10)) / 7)) }
}

export function AdminPrintSuppliesPage() {
  const [tab, setTab] = useState<Tab>('stock')
  const [data, setData] = useState<SupplyData | null>(null)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [usage, setUsage] = useState<UsageSelection | null>(null)
  const [thresholdEdit, setThresholdEdit] = useState<ThresholdEdit | null>(null)
  const [showInk, setShowInk] = useState(false)
  const [showPaper, setShowPaper] = useState(false)
  const [newInk, setNewInk] = useState({ cartridge_type: '', color_variation: 'Black', available_bottles: 1, low_stock_threshold_bottles: 1, cost_per_bottle: '' })
  const [newPaper, setNewPaper] = useState({ paper_size_dimension: 'A4', unopened_reams: 1, low_stock_threshold_reams: 2, cost_per_ream: '' })
  const [quantity, setQuantity] = useState(1)
  const [unitCost, setUnitCost] = useState('')
  const [filters, setFilters] = useState<FinanceFilters>(initialFilters)
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null)
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([])
  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null)
  const [restocks, setRestocks] = useState<RestockEntry[]>([])
  const [usageEntries, setUsageEntries] = useState<StockUsageEntry[]>([])
  const [reportsLoaded, setReportsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState<'revenue' | 'stock' | 'inventory' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSupplies = async () => {
    setLoading(true)
    try { setData(await printingApi.supplies()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load print supplies.') }
    finally { setLoading(false) }
  }

  const loadReports = async (current = filters) => {
    setReportLoading(true)
    try {
      const packageData = await printingApi.reportPackage(current)
      setRevenue(packageData.revenue)
      setRevenueEntries(packageData.revenue_entries)
      setExpenses(packageData.expenses)
      setRestocks(packageData.restocks)
      setUsageEntries(packageData.usage)
      setReportsLoaded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load printing reports.')
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => { setError(''); void loadSupplies() }, [])

  useEffect(() => {
    if (tab !== 'reports') return
    setError('')
    void loadReports(filters)
  }, [tab, filters.period, filters.date, filters.month, filters.week])

  const lowInk = useMemo(() => data?.ink.filter((row) => Number(row.is_low)) ?? [], [data])
  const lowPaper = useMemo(() => data?.paper.filter((row) => Number(row.is_low)) ?? [], [data])
  const sortedInk = useMemo(() => [...(data?.ink ?? [])].sort((a, b) => Number(b.is_low) - Number(a.is_low)), [data])
  const sortedPaper = useMemo(() => [...(data?.paper ?? [])].sort((a, b) => Number(b.is_low) - Number(a.is_low)), [data])
  const availablePaperSizes = useMemo(() => {
    const used = new Set((data?.paper ?? []).map((row) => row.paper_size_dimension))
    return paperSizes.filter((size) => !used.has(size))
  }, [data])

  const openRestock = (selection: Selection) => { setSelected(selection); setQuantity(1); setUnitCost(''); setError(''); setSuccess('') }
  const submitRestock = async (e: FormEvent) => {
    e.preventDefault(); if (!selected) return
    setSaving(true); setError(''); setSuccess('')
    try {
      await printingApi.restock(selected.kind, selected.id, { quantity, unit_cost: Number(unitCost) })
      setSuccess(`${quantity} ${selected.unit} added to ${selected.name}.`)
      setSelected(null)
      await loadSupplies()
      if (reportsLoaded) await loadReports()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save the restock. No stock was changed.') }
    finally { setSaving(false) }
  }
  const confirmUsage = async () => {
    if (!usage) return
    setSaving(true); setError(''); setSuccess('')
    try {
      if (usage.kind === 'ink') await printingApi.useInkBottle(usage.id)
      else await printingApi.openPaperReam(usage.id)
      setSuccess(usage.kind === 'ink' ? `One ${usage.name} bottle was recorded as opened for printing.` : `One ${usage.name} ream was recorded as opened.`)
      setUsage(null)
      await loadSupplies()
      if (reportsLoaded) await loadReports()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update the supply stock.') }
    finally { setSaving(false) }
  }
  const addInk = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      await printingApi.createInk({ ...newInk, cost_per_bottle: Number(newInk.cost_per_bottle) })
      setShowInk(false)
      setSuccess(`${newInk.available_bottles} bottles of ${newInk.cartridge_type} ink added.`)
      setNewInk({ cartridge_type: '', color_variation: 'Black', available_bottles: 1, low_stock_threshold_bottles: 1, cost_per_bottle: '' })
      await loadSupplies()
      if (reportsLoaded) await loadReports()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to add ink stock. No stock was changed.') }
    finally { setSaving(false) }
  }
  const addPaper = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      await printingApi.createPaper({ ...newPaper, cost_per_ream: Number(newPaper.cost_per_ream) })
      setShowPaper(false)
      setSuccess(`${newPaper.unopened_reams} reams of ${newPaper.paper_size_dimension} bond paper added.`)
      setNewPaper({ paper_size_dimension: availablePaperSizes[0] ?? 'A4', unopened_reams: 1, low_stock_threshold_reams: 2, cost_per_ream: '' })
      await loadSupplies()
      if (reportsLoaded) await loadReports()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to add paper stock. No stock was changed.') }
    finally { setSaving(false) }
  }
  const saveThreshold = async (e: FormEvent) => {
    e.preventDefault(); if (!thresholdEdit) return
    setSaving(true); setError(''); setSuccess('')
    try {
      if (thresholdEdit.kind === 'ink') await printingApi.updateInkThreshold(thresholdEdit.id, thresholdEdit.threshold)
      else await printingApi.updatePaperThreshold(thresholdEdit.id, thresholdEdit.threshold)
      setSuccess(`Low-stock alert for ${thresholdEdit.name} is now ${thresholdEdit.threshold}.`)
      setThresholdEdit(null)
      await loadSupplies()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update the low-stock alert.') }
    finally { setSaving(false) }
  }
  const refresh = async () => {
    setError('')
    await loadSupplies()
    if (tab === 'reports' || reportsLoaded) await loadReports()
  }
  const exportReport = async (kind: 'revenue' | 'stock' | 'inventory') => {
    setExporting(kind); setError('')
    try {
      if (kind === 'revenue') await printingApi.revenueReport(filters)
      else if (kind === 'stock') await printingApi.stockExpenseReport(filters)
      else await printingApi.supplyReport()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to export the report.') }
    finally { setExporting(null) }
  }
  const setMonth = (month: string) => setFilters((value) => ({ ...value, month, date: `${month}-01` }))
  const totalExpense = Number((quantity * Number(unitCost || 0)).toFixed(2))
  const tabButton = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === id ? 'bg-[#0b5ea2] text-white' : 'bg-[#0b5ea2]/5 text-[#0b5ea2] hover:bg-[#0b5ea2]/10'}`}
    >
      {label}
    </button>
  )

  return <>
    <PageHeader
      eyebrow="Printing inventory"
      title="Print supplies"
      description="Staff record ink bottles and paper packs by hand. This page does not connect to printer hardware."
      action={
        <div className="flex flex-wrap gap-2">
          {tab === 'stock' ? <>
            <Button variant="secondary" disabled={Boolean(exporting) || loading} onClick={() => void exportReport('inventory')}><Download size={15} />{exporting === 'inventory' ? 'Generating…' : 'Export current stock PDF'}</Button>
            <Button variant="secondary" onClick={() => setShowInk(true)}><Plus size={15} />Add ink stock</Button>
            <Button variant="secondary" disabled={availablePaperSizes.length === 0} onClick={() => { setNewPaper((value) => ({ ...value, paper_size_dimension: availablePaperSizes[0] ?? 'A4' })); setShowPaper(true) }}><Plus size={15} />Add paper size</Button>
          </> : <>
            <Button variant="secondary" disabled={Boolean(exporting)} onClick={() => void exportReport('revenue')}><Download size={15} />{exporting === 'revenue' ? 'Generating…' : 'Export revenue PDF'}</Button>
            <Button disabled={Boolean(exporting)} onClick={() => void exportReport('stock')}><Download size={15} />{exporting === 'stock' ? 'Generating…' : 'Export stock expenses PDF'}</Button>
          </>}
          <Button variant="secondary" onClick={() => void refresh()}><RefreshCw size={15} />Refresh</Button>
        </div>
      }
    />
    {error ? <StatusModal type="error" description={error} onClose={() => setError('')} /> : null}
    {success ? <StatusModal type="success" description={success} onClose={() => setSuccess('')} /> : null}

    <div className="mb-5 flex flex-wrap gap-2">{tabButton('stock', 'Stock desk')}{tabButton('reports', 'Money reports')}</div>

    {tab === 'stock' ? <>
      {(lowInk.length > 0 || lowPaper.length > 0) ? (
        <SectionCard className="mb-5 border-[#FFF200] bg-[#FFF200]/20 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/55">Needs attention</p>
          <h2 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Low stock</h2>
          <ul className="mt-3 space-y-1 text-sm text-[#0b5ea2]/80">
            {lowInk.map((row) => <li key={`ink-${row.ink_id}`}>{row.cartridge_type} · {row.color_variation}: {row.available_bottles} bottles left</li>)}
            {lowPaper.map((row) => <li key={`paper-${row.paper_stock_id}`}>{row.paper_size_dimension} bond paper: {whole(row.unopened_reams)} reams left</li>)}
          </ul>
        </SectionCard>
      ) : null}

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <SectionCard className="overflow-hidden">
          <div className="border-b border-[#0b5ea2]/15 p-5"><h2 className="font-bold text-[#0b5ea2]">Ink bottles</h2></div>
          <div className="divide-y divide-[#0b5ea2]/10">
            {loading ? <p className="p-8 text-center text-[#0b5ea2]">Loading…</p>
              : sortedInk.length === 0 ? <p className="p-8 text-center font-semibold text-[#0b5ea2]">No ink bottle records.</p>
                : sortedInk.map((row) => (
                  <div key={row.ink_id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="rounded-xl bg-[#0b5ea2]/5 p-3 text-[#0b5ea2]"><Droplets size={19} /></span>
                    <div className="min-w-44 flex-1">
                      <b className="text-[#0b5ea2]">{row.cartridge_type} · {row.color_variation}</b>
                      <p className="text-xs text-[#0b5ea2]/65">Warn below {row.low_stock_threshold_bottles} bottles</p>
                    </div>
                    <div className="text-right"><p className="text-xl font-bold text-[#0b5ea2]">{row.available_bottles}</p><p className="text-xs text-[#0b5ea2]/65">unopened bottles</p></div>
                    <StatusBadge status={Number(row.is_low) ? 'Low stock' : 'In stock'} />
                    <Button variant="secondary" disabled={Number(row.available_bottles) < 1} onClick={() => setUsage({ kind: 'ink', id: row.ink_id, name: `${row.cartridge_type} ${row.color_variation}`, current: Number(row.available_bottles) })}>Use one bottle</Button>
                    <Button onClick={() => openRestock({ kind: 'ink', id: row.ink_id, name: `${row.cartridge_type} ${row.color_variation}`, unit: 'bottles', current: Number(row.available_bottles) })}>Restock</Button>
                    <Button variant="secondary" onClick={() => setThresholdEdit({ kind: 'ink', id: row.ink_id, name: `${row.cartridge_type} ${row.color_variation}`, threshold: Number(row.low_stock_threshold_bottles) })}><Settings2 size={15} />Alert</Button>
                  </div>
                ))}
          </div>
        </SectionCard>
        <SectionCard className="overflow-hidden">
          <div className="border-b border-[#0b5ea2]/15 p-5"><h2 className="font-bold text-[#0b5ea2]">Bond paper</h2></div>
          <div className="divide-y divide-[#0b5ea2]/10">
            {loading ? <p className="p-8 text-center text-[#0b5ea2]">Loading…</p>
              : sortedPaper.length === 0 ? <p className="p-8 text-center font-semibold text-[#0b5ea2]">No paper records.</p>
                : sortedPaper.map((row) => (
                  <div key={row.paper_stock_id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="rounded-xl bg-[#0b5ea2]/5 p-3 text-[#0b5ea2]"><PackageOpen size={19} /></span>
                    <div className="min-w-44 flex-1">
                      <b className="text-[#0b5ea2]">{row.paper_size_dimension} bond paper</b>
                      <p className="text-xs text-[#0b5ea2]/65">Warn below {whole(row.low_stock_threshold_reams)} reams</p>
                    </div>
                    <div className="text-right"><p className="text-xl font-bold text-[#0b5ea2]">{whole(row.unopened_reams)}</p><p className="text-xs text-[#0b5ea2]/65">unopened reams</p></div>
                    <StatusBadge status={Number(row.is_low) ? 'Low stock' : 'In stock'} />
                    <Button variant="secondary" disabled={Number(row.unopened_reams) < 1} onClick={() => setUsage({ kind: 'paper', id: row.paper_stock_id, name: `${row.paper_size_dimension} bond paper`, current: Number(row.unopened_reams) })}>Open one ream</Button>
                    <Button onClick={() => openRestock({ kind: 'paper', id: row.paper_stock_id, name: `${row.paper_size_dimension} bond paper`, unit: 'reams', current: Number(row.unopened_reams) })}>Restock</Button>
                    <Button variant="secondary" onClick={() => setThresholdEdit({ kind: 'paper', id: row.paper_stock_id, name: `${row.paper_size_dimension} bond paper`, threshold: Number(row.low_stock_threshold_reams) })}><Settings2 size={15} />Alert</Button>
                  </div>
                ))}
          </div>
        </SectionCard>
      </div>
    </> : <>
      <SectionCard className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="text-xs font-bold text-[#0b5ea2]">Report period
            <select className={input} value={filters.period} onChange={(e) => setFilters((value) => ({ ...value, period: e.target.value as FinancePeriod }))}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          {filters.period === 'daily'
            ? <label className="text-xs font-bold text-[#0b5ea2]">Date<input className={input} type="date" value={filters.date} onChange={(e) => setFilters((value) => ({ ...value, date: e.target.value, month: e.target.value.slice(0, 7) }))} /></label>
            : <label className="text-xs font-bold text-[#0b5ea2]">Month<input className={input} type="month" value={filters.month} onChange={(e) => setMonth(e.target.value)} /></label>}
          {filters.period === 'weekly' ? (
            <label className="text-xs font-bold text-[#0b5ea2]">Week in month
              <select className={input} value={filters.week} onChange={(e) => setFilters((value) => ({ ...value, week: Number(e.target.value) }))}>
                {[1, 2, 3, 4].map((week) => <option key={week} value={week}>Week {week}</option>)}
              </select>
            </label>
          ) : null}
          <p className="pb-3 text-xs font-semibold text-[#0b5ea2]/65">{reportLoading ? 'Loading selected period…' : revenue?.label ?? 'Select a period'}</p>
        </div>
      </SectionCard>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Paid requests" value={String(revenue?.paid_requests ?? 0)} />
        <StatCard label="Sheets" value={String(revenue?.total_sheets ?? 0)} icon={PackageOpen} />
        <StatCard label="Copies" value={String(revenue?.total_copies ?? 0)} icon={PackageOpen} />
        <StatCard label="Printing revenue" value={money(revenue?.total_revenue)} />
      </div>

      <SectionCard className="mb-5 overflow-hidden">
        <div className="border-b border-[#0b5ea2]/15 p-5"><h2 className="font-bold text-[#0b5ea2]">Revenue details</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-[#0b5ea2] text-[#FFFFFF]"><tr>{['Date', 'Request', 'Student', 'File', 'Type', 'Paper', 'Pages', 'Copies', 'Sheets', 'Revenue'].map((label) => <th key={label} className="px-3 py-3 text-xs uppercase">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#0b5ea2]/10">
              {reportLoading ? <tr><td colSpan={10} className="p-8 text-center text-[#0b5ea2]">Loading revenue…</td></tr>
                : revenueEntries.length === 0 ? <tr><td colSpan={10} className="p-8 text-center font-semibold text-[#0b5ea2]">No paid printing requests for this period.</td></tr>
                  : revenueEntries.map((row) => (
                    <tr key={row.request_id} className="text-[#0b5ea2]">
                      <td className="whitespace-nowrap px-3 py-3">{new Date(row.received_at).toLocaleString()}</td>
                      <td className="px-3 py-3">#{row.request_id}</td>
                      <td className="px-3 py-3 font-semibold">{row.full_name}<small className="block font-normal">{row.school_id}</small></td>
                      <td className="px-3 py-3">{row.file_name}</td>
                      <td className="px-3 py-3">{row.print_type}</td>
                      <td className="px-3 py-3">{row.paper_size}</td>
                      <td className="px-3 py-3">{row.page_count}</td>
                      <td className="px-3 py-3">{row.number_of_copies}</td>
                      <td className="px-3 py-3">{row.total_sheets}</td>
                      <td className="px-3 py-3 font-bold">{money(row.amount_paid)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Restock entries" value={String(expenses?.restock_entries ?? 0)} icon={RefreshCw} />
        <StatCard label="Ink restock costs" value={money(expenses?.ink_expenses)} icon={Droplets} />
        <StatCard label="Paper restock costs" value={money(expenses?.paper_expenses)} icon={PackageOpen} />
        <StatCard label="Total restock expenses" value={money(expenses?.total_expenses)} />
      </div>

      <SectionCard className="mb-5 overflow-hidden">
        <div className="border-b border-[#0b5ea2]/15 p-5"><h2 className="font-bold text-[#0b5ea2]">Restock history</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#0b5ea2] text-[#FFFFFF]"><tr>{['Date', 'Type', 'Supply', 'Quantity', 'Unit cost', 'Total expense', 'Before', 'After', 'Recorded by'].map((label) => <th key={label} className="px-3 py-3 text-xs uppercase">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#0b5ea2]/10">
              {reportLoading ? <tr><td colSpan={9} className="p-8 text-center text-[#0b5ea2]">Loading restock history…</td></tr>
                : restocks.length === 0 ? <tr><td colSpan={9} className="p-8 text-center font-semibold text-[#0b5ea2]">No restocks for this period.</td></tr>
                  : restocks.map((row, index) => (
                    <tr key={`${row.created_at}-${index}`} className="text-[#0b5ea2]">
                      <td className="whitespace-nowrap px-3 py-3">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="px-3 py-3">{row.supply_type}</td>
                      <td className="px-3 py-3 font-semibold">{row.supply_name}</td>
                      <td className="px-3 py-3">{whole(row.quantity)} {row.unit}</td>
                      <td className="px-3 py-3">{money(row.unit_cost)}</td>
                      <td className="px-3 py-3 font-bold">{money(row.total_expense)}</td>
                      <td className="px-3 py-3">{whole(row.balance_before, 'Legacy')}</td>
                      <td className="px-3 py-3">{whole(row.balance_after, 'Legacy')}</td>
                      <td className="px-3 py-3">{row.recorded_by ?? 'System'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard className="overflow-hidden">
        <div className="border-b border-[#0b5ea2]/15 p-5">
          <h2 className="font-bold text-[#0b5ea2]">Manual stock usage</h2>
          <p className="mt-1 text-xs text-[#0b5ea2]/65">Bottles and reams staff opened during this period (latest 20).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#0b5ea2] text-[#FFFFFF]"><tr>{['Date', 'Type', 'Supply', 'Action', 'Quantity', 'Before', 'After', 'Recorded by'].map((label) => <th key={label} className="px-3 py-3 text-xs uppercase">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#0b5ea2]/10">
              {reportLoading ? <tr><td colSpan={8} className="p-8 text-center text-[#0b5ea2]">Loading usage…</td></tr>
                : usageEntries.length === 0 ? <tr><td colSpan={8} className="p-8 text-center font-semibold text-[#0b5ea2]">No bottles or reams were opened in this period.</td></tr>
                  : usageEntries.map((row, index) => (
                    <tr key={`${row.created_at}-${index}`} className="text-[#0b5ea2]">
                      <td className="whitespace-nowrap px-3 py-3">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="px-3 py-3">{row.supply_type}</td>
                      <td className="px-3 py-3 font-semibold">{row.supply_name}</td>
                      <td className="px-3 py-3">{row.activity_code === 'LoadedIntoPrinter' ? 'Bottle opened' : 'Ream opened'}</td>
                      <td className="px-3 py-3">{whole(row.quantity)} {row.unit}</td>
                      <td className="px-3 py-3">{whole(row.balance_before)}</td>
                      <td className="px-3 py-3">{whole(row.balance_after)}</td>
                      <td className="px-3 py-3">{row.recorded_by ?? 'System'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>}

    {usage ? (
      <ConfirmModal
        title={usage.kind === 'ink' ? 'Record one ink bottle opened?' : 'Record one paper ream opened?'}
        description={`${usage.name} currently has ${usage.current} unopened ${usage.kind === 'ink' ? 'bottles' : 'reams'}. This deducts exactly one and records today’s date and your account. The printer is not contacted.`}
        confirmText="Confirm usage"
        cancelText="Cancel"
        onCancel={() => setUsage(null)}
        onConfirm={() => void confirmUsage()}
      />
    ) : null}

    {selected ? (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm lg:left-[var(--sidebar-offset,0px)]" role="dialog" aria-modal="true" aria-labelledby="restock-title">
        <form onSubmit={submitRestock} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#FFFFFF] p-6 shadow-2xl">
          <h2 id="restock-title" className="font-display text-xl font-bold text-[#0b5ea2]">{selected.kind === 'paper' ? 'Restock paper' : 'Restock ink bottles'}</h2>
          <p className="mt-1 text-sm text-[#0b5ea2]/65">{selected.name} · Current stock: {selected.current} {selected.unit}</p>
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-bold text-[#0b5ea2]">{selected.kind === 'paper' ? 'Reams to add' : 'Bottles to add'}
              <input required className={input} type="number" min="1" max="10000" step="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </label>
            <label className="block text-xs font-bold text-[#0b5ea2]">{selected.kind === 'paper' ? 'Cost per ream' : 'Cost per bottle'}
              <input required className={input} type="number" min="0.01" max="1000000" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </label>
            <div className="rounded-xl bg-[#FFF200]/35 p-3 text-sm text-[#0b5ea2]">Total restocking expense: <b>{money(totalExpense)}</b></div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : selected.kind === 'paper' ? 'Add paper stock' : 'Add bottles'}</Button>
          </div>
        </form>
      </div>
    ) : null}

    {showInk ? (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm lg:left-[var(--sidebar-offset,0px)]" role="dialog" aria-modal="true" aria-labelledby="add-ink-title">
        <form onSubmit={addInk} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#FFFFFF] p-6 shadow-2xl">
          <h2 id="add-ink-title" className="font-display text-xl font-bold text-[#0b5ea2]">Add ink bottle stock</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#0b5ea2]">Ink type<input required className={input} value={newInk.cartridge_type} onChange={(e) => setNewInk((value) => ({ ...value, cartridge_type: e.target.value }))} /></label>
            <label className="text-xs font-bold text-[#0b5ea2]">Color<select className={input} value={newInk.color_variation} onChange={(e) => setNewInk((value) => ({ ...value, color_variation: e.target.value }))}>{['Black', 'Cyan', 'Magenta', 'Yellow'].map((color) => <option key={color}>{color}</option>)}</select></label>
            <label className="text-xs font-bold text-[#0b5ea2]">Number of bottles<input required className={input} type="number" min="1" max="10000" step="1" value={newInk.available_bottles} onChange={(e) => setNewInk((value) => ({ ...value, available_bottles: Number(e.target.value) }))} /></label>
            <label className="text-xs font-bold text-[#0b5ea2]">Warn below (bottles)<input required className={input} type="number" min="0" max="10000" step="1" value={newInk.low_stock_threshold_bottles} onChange={(e) => setNewInk((value) => ({ ...value, low_stock_threshold_bottles: Number(e.target.value) }))} /></label>
            <label className="text-xs font-bold text-[#0b5ea2] sm:col-span-2">Cost per bottle<input required className={input} type="number" min="0.01" max="1000000" step="0.01" value={newInk.cost_per_bottle} onChange={(e) => setNewInk((value) => ({ ...value, cost_per_bottle: e.target.value }))} /></label>
          </div>
          <div className="mt-4 rounded-xl bg-[#FFF200]/35 p-3 text-sm text-[#0b5ea2]">Total restocking expense: <b>{money(newInk.available_bottles * Number(newInk.cost_per_bottle || 0))}</b></div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowInk(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add ink stock'}</Button>
          </div>
        </form>
      </div>
    ) : null}

    {showPaper ? (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm lg:left-[var(--sidebar-offset,0px)]" role="dialog" aria-modal="true" aria-labelledby="add-paper-title">
        <form onSubmit={addPaper} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#FFFFFF] p-6 shadow-2xl">
          <h2 id="add-paper-title" className="font-display text-xl font-bold text-[#0b5ea2]">Add bond paper size</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#0b5ea2]">Paper size
              <select className={input} value={newPaper.paper_size_dimension} onChange={(e) => setNewPaper((value) => ({ ...value, paper_size_dimension: e.target.value }))}>
                {availablePaperSizes.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#0b5ea2]">Number of reams<input required className={input} type="number" min="1" max="10000" step="1" value={newPaper.unopened_reams} onChange={(e) => setNewPaper((value) => ({ ...value, unopened_reams: Number(e.target.value) }))} /></label>
            <label className="text-xs font-bold text-[#0b5ea2]">Warn below (reams)<input required className={input} type="number" min="0" max="10000" step="1" value={newPaper.low_stock_threshold_reams} onChange={(e) => setNewPaper((value) => ({ ...value, low_stock_threshold_reams: Number(e.target.value) }))} /></label>
            <label className="text-xs font-bold text-[#0b5ea2]">Cost per ream<input required className={input} type="number" min="0.01" max="1000000" step="0.01" value={newPaper.cost_per_ream} onChange={(e) => setNewPaper((value) => ({ ...value, cost_per_ream: e.target.value }))} /></label>
          </div>
          <div className="mt-4 rounded-xl bg-[#FFF200]/35 p-3 text-sm text-[#0b5ea2]">Total restocking expense: <b>{money(newPaper.unopened_reams * Number(newPaper.cost_per_ream || 0))}</b></div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowPaper(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || availablePaperSizes.length === 0}>{saving ? 'Saving…' : 'Add paper stock'}</Button>
          </div>
        </form>
      </div>
    ) : null}

    {thresholdEdit ? (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm lg:left-[var(--sidebar-offset,0px)]" role="dialog" aria-modal="true" aria-labelledby="threshold-title">
        <form onSubmit={saveThreshold} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#FFFFFF] p-6 shadow-2xl">
          <h2 id="threshold-title" className="font-display text-xl font-bold text-[#0b5ea2]">Low-stock alert</h2>
          <p className="mt-1 text-sm text-[#0b5ea2]/65">{thresholdEdit.name}</p>
          <label className="mt-5 block text-xs font-bold text-[#0b5ea2]">
            Warn when stock is at or below
            <input required className={input} type="number" min="0" max="10000" step="1" value={thresholdEdit.threshold} onChange={(e) => setThresholdEdit((value) => value ? { ...value, threshold: Number(e.target.value) } : value)} />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setThresholdEdit(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save alert'}</Button>
          </div>
        </form>
      </div>
    ) : null}
  </>
}
