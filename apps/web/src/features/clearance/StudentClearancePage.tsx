import { BadgeCheck, BookOpen, Clock3, PhilippinePeso, RefreshCw, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AlertMessage, Button, PageHeader, SectionCard, StatCard, StatusBadge } from '../../components/ui'
import { clearanceApi } from './clearance-api'
import type { ClearanceRecord } from './types'

function lostResolution(item: ClearanceRecord['lostBooks'][number]) { return item['chargeResolution'] || (item.status === 'Confirmed' ? item.replacementCharge > 0 ? 'Quoted' : 'Awaiting Quotation' : 'Awaiting Review') }
function money(value: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value) }
function date(value: string | null) { if (!value) return '—'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }

export function StudentClearancePage() {
  const [data, setData] = useState<ClearanceRecord | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState('')
  const load = useCallback(async (showNotice = false) => {
    setRefreshing(true)
    setNotice('')
    try {
      setData(await clearanceApi.mine())
      setError('')
      if (showNotice) setNotice('Clearance updated from your current library records.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Clearance is unavailable.')
    } finally { setRefreshing(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const cleared = data?.status === 'Cleared'
  const loans = data?.summary.activeLoans ?? 0
  const unpaidFines = data?.summary.unpaidOverdueFines ?? 0
  const unpaidLost = data?.summary.unpaidReplacementCharges ?? 0
  const blockedReasons = [
    loans > 0 ? `You have ${loans} unreturned ${loans === 1 ? 'book' : 'books'}.` : '',
    unpaidFines > 0 ? `You have ${money(unpaidFines)} in unpaid overdue fines.` : '',
    unpaidLost > 0 ? `You have ${money(unpaidLost)} in unpaid lost-book replacement charges.` : '',
  ].filter(Boolean)
  const blockedDescription = blockedReasons.length
    ? `${blockedReasons.join(' ')} Resolve these obligations before clearance is restored.`
    : (data?.reason ?? 'Review your live circulation and fine records below.')
  return <>
    <PageHeader eyebrow="Account standing" title="Library clearance" description="Computed from current unreturned books, overdue fines, and lost-book replacement charges." action={<Button variant="secondary" disabled={refreshing} onClick={() => void load(true)}><RefreshCw size={16} /> {refreshing ? 'Refreshing…' : 'Refresh'}</Button>} />
    {error ? <AlertMessage type="error" title="Unable to load clearance" description={error} /> : null}
    {notice ? <AlertMessage type="success" variant="compact" description={notice} /> : null}
    {data && !cleared && !data.activeOverride ? (
      <AlertMessage type="error" title="Account not cleared" description={blockedDescription} />
    ) : null}
    {data?.activeOverride ? (
      <AlertMessage
        type="warning"
        title={`Clearance override active: ${data.activeOverride.status}`}
        description={`${data.activeOverride.reason} Applied by ${data.activeOverride.appliedBy} · ${date(data.activeOverride.appliedAt)}`}
      />
    ) : null}
    <section className="relative overflow-hidden rounded-3xl bg-[#0b5ea2] p-7 text-white"><div className="relative z-10 max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold"><BadgeCheck size={15} className="text-[#FFF200]" />{data?.status ?? 'Checking…'}</div><h2 className="mt-5 font-display text-3xl font-bold">{cleared ? 'You have no library obligations.' : 'Your clearance is currently blocked.'}</h2><p className="mt-3 text-sm leading-6 text-white/80">{data?.reason ?? 'Reviewing your live circulation and fine records.'}</p><p className="mt-2 text-xs text-white/55">Checked {data ? date(data.checkedAt) : 'now'}</p></div></section>
    <div className="mt-5 grid gap-4 sm:grid-cols-3"><StatCard label="Unreturned books" value={data?.summary.activeLoans ?? 0} icon={BookOpen} tone="blue" /><StatCard label="Outstanding fines" value={money(data?.summary.unpaidOverdueFines ?? 0)} icon={PhilippinePeso} tone="blue" /><StatCard label="Lost-book charges" value={money(data?.summary.unpaidReplacementCharges ?? 0)} icon={ShieldAlert} tone="blue" /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <SectionCard className="overflow-hidden"><div className="border-b border-[#0b5ea2]/15 px-5 py-4"><h2 className="font-bold text-[#0b5ea2]">Unreturned books</h2></div><div className="divide-y divide-[#0b5ea2]/10">{data?.loans.length ? data.loans.map((loan) => <div key={loan.transactionId} className="p-5"><div className="flex justify-between gap-3"><div><p className="font-bold text-[#0b5ea2]">{loan.title}</p><p className="mt-1 text-xs text-[#0b5ea2]/60">{loan.accessionNumber ?? `Transaction ${loan.transactionId}`}</p></div><StatusBadge status={loan.status} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#0b5ea2]/70"><span>Due<br /><strong>{date(loan.dueAt)}</strong></span><span>Overdue<br /><strong>{loan.overdueHours} hours</strong></span></div></div>) : <p className="p-8 text-center text-sm text-[#0b5ea2]/65">No unreturned books.</p>}</div></SectionCard>
      <SectionCard className="overflow-hidden"><div className="border-b border-[#0b5ea2]/15 px-5 py-4"><h2 className="font-bold text-[#0b5ea2]">Outstanding charges</h2></div><div className="divide-y divide-[#0b5ea2]/10">{data && (data.fines.length || data.lostBooks.some((item) => item.status === 'Confirmed' && lostResolution(item) === 'Quoted' && item.paymentStatus === 'Unpaid')) ? <>{data.fines.map((fine) => <div key={`fine-${fine.fineId}`} className="flex justify-between gap-3 p-5"><div><p className="font-bold text-[#0b5ea2]">{fine.basis === 'Manual' ? 'Library infraction' : 'Overdue fine'} · {fine.title}</p><p className="mt-1 text-xs text-[#0b5ea2]/60">{fine.basis === 'Manual' ? (fine.notes ?? 'Documented library infraction') : `${fine.overdueUnits} ${fine.basis.toLowerCase()} units at ${money(fine.rate)}`}</p></div><strong className="text-[#0b5ea2]">{money(fine.amount)}</strong></div>)}{data.lostBooks.filter((item) => item.status === 'Confirmed' && lostResolution(item) === 'Quoted' && item.paymentStatus === 'Unpaid').map((item) => <div key={`lost-${item.lostBookReportId}`} className="flex justify-between gap-3 p-5"><div><p className="font-bold text-[#0b5ea2]">Lost-book replacement · {item.title}</p><p className="mt-1 text-xs text-[#0b5ea2]/60">Confirmed {date(item.verifiedAt)}</p></div><strong className="text-[#0b5ea2]">{money(item.replacementCharge)}</strong></div>)}</> : <p className="p-8 text-center text-sm text-[#0b5ea2]/65">No unpaid charges.</p>}</div>{data ? <div className="flex justify-between bg-[#0b5ea2] p-5 text-white"><span className="font-bold">Total outstanding</span><strong>{money(data.summary.totalOutstanding)}</strong></div> : null}</SectionCard>
      {data?.lostBooks.some((item) => item.status === 'Confirmed' && lostResolution(item) === 'Awaiting Quotation') ? <SectionCard className="mt-5 p-5"><h2 className="font-bold text-[#0b5ea2]">Lost book awaiting quotation</h2><p className="mt-1 text-sm text-[#0b5ea2]/70">The library confirmed the loss but has not assessed a replacement charge. Staff will notify you when a quotation is reviewed.</p></SectionCard> : null}
    </div>
    <SectionCard className="mt-5 p-5"><div className="flex gap-3"><Clock3 className="text-[#0b5ea2]" /><div><h3 className="font-bold text-[#0b5ea2]">How clearance is determined</h3><p className="mt-1 text-sm leading-6 text-[#0b5ea2]/70">Any unreturned book, unpaid overdue fine, or unpaid confirmed lost-book replacement charge blocks clearance. Authorized staff may record a reasoned override, and its full history remains visible for audit.</p></div></div></SectionCard>
  </>
}
