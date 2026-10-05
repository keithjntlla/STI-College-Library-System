import { BadgeCheck, Clock3, Download, Eye, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button, ConfirmModal, MobileList, MobileListItem, PageHeader, StatusModal, SectionCard, StatCard, StatusBadge, TableShell } from '../../components/ui'
import { getAccessToken } from '../auth/auth-storage'
import { useLocation, useSearchParams } from 'react-router-dom'
import { clearanceApi } from './clearance-api'
import type { ClearanceList, ClearanceRecord } from './types'

const field = 'h-11 w-full rounded-xl border border-[#0b5ea2]/20 bg-white px-3 text-sm text-[#0b5ea2] outline-none focus:ring-4 focus:ring-[#0b5ea2]/10'
function lostResolution(item: ClearanceRecord['lostBooks'][number]) { return item['chargeResolution'] || (item.status === 'Confirmed' ? item.replacementCharge > 0 ? 'Quoted' : 'Awaiting Quotation' : 'Awaiting Review') }
function money(value: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value) }
function date(value: string | null) { if (!value) return '—'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }
function quotationCatalogHref(titleId: number | null, title: string) {
  if (!titleId) return '/librarian/catalog'
  const params = new URLSearchParams({ titleId: String(titleId), action: 'quotation', title })
  return `/librarian/catalog?${params.toString()}`
}

export function AdminClearancePage() {
  const isLibrarian = useLocation().pathname.startsWith('/librarian/')
  const [params] = useSearchParams()
  const statusFilter = params.get('status') ?? ''
  const activeOnly = params.get('active') === '1'
  const [data, setData] = useState<ClearanceList | null>(null)
  const [selected, setSelected] = useState<ClearanceRecord | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [overrideFormOpen, setOverrideFormOpen] = useState(false)
  const [revocationFormOpen, setRevocationFormOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmLoss, setConfirmLoss] = useState<{ reportId: number; quotedAmount: number | null } | null>(null)
  const [confirmCharge, setConfirmCharge] = useState<{ reportId: number; quotedAmount: number } | null>(null)
  const [waiveDialog, setWaiveDialog] = useState<{ reportId: number; title: string } | null>(null)
  const [waiveReason, setWaiveReason] = useState('')
  const [waiveError, setWaiveError] = useState('')
  const load = useCallback(async (term = search) => { try { setData(await clearanceApi.list(term, statusFilter, activeOnly)); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Clearance records are unavailable.') } }, [search, statusFilter, activeOnly])
  useEffect(() => { void load('') }, [statusFilter, activeOnly]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isLibrarian) return
    const refresh = () => { if (!document.hidden) void load(search) }
    const timer = window.setInterval(refresh, 15_000)
    const onVisibility = () => { if (!document.hidden) refresh() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isLibrarian, load, search])
  function closeResolutionDialogs() {
    setConfirmLoss(null)
    setConfirmCharge(null)
    setWaiveDialog(null)
    setWaiveReason('')
    setWaiveError('')
  }
  function closeSelected() {
    setSelected(null)
    setOverrideFormOpen(false)
    setRevocationFormOpen(false)
    setHistoryOpen(false)
    closeResolutionDialogs()
  }

  useEffect(() => {
    if (!selected) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (confirmLoss || confirmCharge || waiveDialog) {
        closeResolutionDialogs()
        return
      }
      closeSelected()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, confirmLoss, confirmCharge, waiveDialog])

  async function open(userId: number) {
    try {
      setSelected(await clearanceApi.detail(userId))
      setOverrideFormOpen(false)
      setRevocationFormOpen(false)
      setHistoryOpen(false)
      setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Student clearance details are unavailable.') }
  }
  async function override(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()); setBusy(true)
    try {
      const result = await clearanceApi.override(selected.student.userId, { status: 'Cleared', reason: String(values.reason), expiresAt: null })
      setSelected(result.clearance)
      setOverrideFormOpen(false)
      setError('')
      await load()
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The override could not be recorded.') } finally { setBusy(false) }
  }
  async function revoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected?.activeOverride || busy) return
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const reason = String(values.reason ?? '').trim()
    if (!reason) return
    setBusy(true)
    try {
      setSelected(await clearanceApi.revoke(selected.student.userId, selected.activeOverride.overrideId, reason))
      setRevocationFormOpen(false)
      setError('')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The override could not be revoked.') } finally { setBusy(false) }
  }
  async function decide(reportId: number, status: 'Confirmed' | 'Rejected') {
    setBusy(true)
    setConfirmLoss(null)
    try {
      await clearanceApi.decideLost(reportId, status)
      if (selected) await open(selected.student.userId)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The lost-book report could not be updated.')
    } finally {
      setBusy(false)
    }
  }
  async function settle(reportId: number) { setBusy(true); try { await clearanceApi.settleLost(reportId); if (selected) await open(selected.student.userId); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'The replacement payment could not be recorded.') } finally { setBusy(false) } }
  async function resolve(reportId: number, action: 'Charge' | 'Waive', reason = '') {
    setBusy(true)
    try {
      await clearanceApi.resolveLost(reportId, action, reason)
      closeResolutionDialogs()
      if (selected) await open(selected.student.userId)
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The loss resolution could not be recorded.'
      if (action === 'Waive') setWaiveError(message)
      else setError(message)
    } finally {
      setBusy(false)
    }
  }
  function submitWaive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!waiveDialog || busy) return
    const reason = waiveReason.trim()
    if (reason.length < 10) {
      setWaiveError('Explain the non-monetary resolution in at least 10 characters.')
      return
    }
    setWaiveError('')
    void resolve(waiveDialog.reportId, 'Waive', reason)
  }
  async function exportCsv() {
    const headers = new Headers({ Accept: 'text/csv' }); const token = getAccessToken(); if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetch('/api/v1/admin/clearance/export.csv', { headers }); if (!response.ok) { setError('Clearance export failed.'); return }
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'smartlib-clearance.csv'; anchor.click(); URL.revokeObjectURL(url)
  }
  return <>
    <PageHeader eyebrow="Student standing" title="Clearance management" description="Live obligations, documented exceptions, lost-book charges, and audit history." action={<div className="flex gap-2"><Button variant="secondary" onClick={() => void load()}><RefreshCw size={16} /> Refresh</Button><Button onClick={() => void exportCsv()}><Download size={16} /> Export bulk status</Button></div>} />
    {error ? <StatusModal type="error" description={error} onClose={() => setError('')} /> : null}
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><StatCard label="Students" value={data?.summary.totalStudents ?? 0} icon={BadgeCheck} tone="blue" /><StatCard label="Cleared" value={data?.summary.cleared ?? 0} icon={BadgeCheck} tone="blue" /><StatCard label="Pending clearance" value={data?.summary.pending ?? 0} icon={Clock3} tone="blue" /><StatCard label="Active overrides" value={data?.summary.activeOverrides ?? 0} icon={ShieldCheck} tone="blue" /></div>
    {isLibrarian ? <SectionCard className="mb-5 overflow-hidden"><div className="border-b border-[#0b5ea2]/15 p-5"><h2 className="font-bold text-[#0b5ea2]">Lost-book reports awaiting review ({data?.pendingLostReports.length ?? 0})</h2><p className="mt-1 text-xs text-[#0b5ea2]/65">Student and faculty reports appear here as soon as they are submitted.</p></div><div className="divide-y divide-[#0b5ea2]/10">{!data ? <p className="p-5 text-sm text-[#0b5ea2]/65">Loading lost-book reports…</p> : data.pendingLostReports.length ? data.pendingLostReports.map((report) => <div key={report.lostBookReportId} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold text-[#0b5ea2]">{report.title}</p><p className="mt-1 text-sm text-[#0b5ea2]/70">{report.borrowerName} · {report.schoolId} · {report.role}</p><p className="mt-1 text-xs text-[#0b5ea2]/60">Reported {date(report.reportedAt)}</p></div><Button variant="secondary" onClick={() => void open(report.userId)}><Eye size={16} /> Review report</Button></div>) : <p className="p-5 text-sm text-[#0b5ea2]/65">No lost-book reports are waiting for review.</p>}</div></SectionCard> : null}
    <TableShell
      title="Clearance master list"
      subtitle="Computed from authoritative transactions"
      controls={<form onSubmit={(event) => { event.preventDefault(); void load(search) }} className="flex w-full gap-2 sm:max-w-xs"><input aria-label="Search student or ID" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student or ID" className={`${field} min-w-0 flex-1`} /><Button type="submit">Search</Button></form>}
      mobileRows={<MobileList empty={!data?.items.length ? <p className="px-5 py-12 text-center font-semibold text-[#0b5ea2] dark:text-white">No students match this search.</p> : null}>{data?.items.map((item) => <MobileListItem key={item.student.userId} title={item.student.name} meta={`${item.student.schoolId} · ${item.student.program ?? '—'}`} status={<StatusBadge status={item.status} />} detail={<div className="space-y-2"><div className="grid grid-cols-2 gap-2 text-xs"><span>Unreturned <strong>{item.summary.activeLoans}</strong></span><span>Outstanding <strong>{money(item.summary.totalOutstanding)}</strong></span></div>{item.reason ? <p className="text-xs">{item.reason}</p> : null}</div>} actions={<button onClick={() => void open(item.student.userId)} className="inline-flex items-center gap-1 rounded-lg border border-[#0b5ea2]/20 px-3 py-2 text-xs font-bold text-[#0b5ea2] dark:border-white/20 dark:text-white"><Eye size={14} /> Review</button>} />)}</MobileList>}
    ><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-[#0b5ea2] text-white"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Program</th><th className="px-5 py-3">Unreturned</th><th className="px-5 py-3">Outstanding</th><th className="px-5 py-3">Standing</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Action</th></tr></thead><tbody>{data?.items.length ? data.items.map((item) => <tr key={item.student.userId} className="border-b border-[#0b5ea2]/10"><td className="px-5 py-4"><p className="font-bold text-[#0b5ea2]">{item.student.name}</p><p className="text-xs text-[#0b5ea2]/60">{item.student.schoolId}</p></td><td className="px-5 py-4 text-[#0b5ea2]">{item.student.program ?? '—'}</td><td className="px-5 py-4 font-bold text-[#0b5ea2]">{item.summary.activeLoans}</td><td className="px-5 py-4 font-bold text-[#0b5ea2]">{money(item.summary.totalOutstanding)}</td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="max-w-xs px-5 py-4 text-[#0b5ea2]/70">{item.reason}</td><td className="px-5 py-4"><button onClick={() => void open(item.student.userId)} className="inline-flex items-center gap-1 rounded-lg border border-[#0b5ea2]/20 px-3 py-2 text-xs font-bold text-[#0b5ea2]"><Eye size={14} /> Review</button></td></tr>) : <tr><td colSpan={7} className="p-12 text-center font-semibold text-[#0b5ea2]">No students match this search.</td></tr>}</tbody></table></TableShell>
    {selected ? (
      <div
        className="fixed inset-0 z-[110] overflow-y-auto bg-[#0b5ea2]/75 p-4 lg:left-[var(--sidebar-offset,0px)]"
        onClick={closeSelected}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clearance-review-title"
          className="mx-auto my-4 max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#0b5ea2]/15 bg-white p-5">
            <div>
              <p className="text-xs font-bold uppercase text-[#0b5ea2]/60">Clearance review</p>
              <h2 id="clearance-review-title" className="font-display text-xl font-bold text-[#0b5ea2]">{selected.student.name}</h2>
              <p className="text-sm text-[#0b5ea2]/60">{selected.student.schoolId} · {selected.student.program}</p>
            </div>
            <button type="button" aria-label="Close" onClick={closeSelected} className="rounded-xl p-2 text-[#0b5ea2] hover:bg-[#0b5ea2]/5"><X /></button>
          </header>
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Standing" value={selected.status} icon={BadgeCheck} tone="blue" />
              <StatCard label="Unreturned" value={selected.summary.activeLoans} icon={Clock3} tone="blue" />
              <StatCard label="Outstanding fines" value={money(selected.summary.unpaidOverdueFines)} icon={Clock3} tone="blue" />
              <StatCard label="Lost charges" value={money(selected.summary.unpaidReplacementCharges)} icon={Clock3} tone="blue" />
            </div>
      <SectionCard className="p-4"><h3 className="font-bold text-[#0b5ea2]">Blocking details</h3><p className="mt-1 text-sm text-[#0b5ea2]/70">{selected.reason}</p><div className="mt-4 space-y-2">{selected.loans.map((loan) => <div key={loan.transactionId} className="rounded-xl bg-[#0b5ea2]/5 p-3 text-sm text-[#0b5ea2]"><strong>{loan.title}</strong> · due {date(loan.dueAt)} · {loan.overdueHours} overdue hours · {money(loan.currentFine)}</div>)}</div></SectionCard>
      {selected.lostBooks.length && isLibrarian ? <SectionCard className="p-4"><h3 className="font-bold text-[#0b5ea2]">Lost-book reports</h3><div className="mt-3 space-y-3">{selected.lostBooks.map((item) => <div key={item.lostBookReportId} className="rounded-xl border border-[#0b5ea2]/15 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-[#0b5ea2]">{item.title}</strong><p className="text-xs text-[#0b5ea2]/60">Reported {date(item.reportedAt)} · {item.status} · {lostResolution(item)} · {item.paymentStatus}</p></div><strong className="text-[#0b5ea2]">{item.status === 'Pending' ? item.quotedAmount ? `Quotation: ${money(item.quotedAmount)}` : 'Awaiting quotation' : item.status === 'Rejected' || lostResolution(item) === 'Waived' ? 'No charge' : lostResolution(item) === 'Awaiting Quotation' ? 'Awaiting quotation' : money(item.replacementCharge)}</strong></div><div className="mt-3 flex flex-wrap gap-2">{item.status === 'Pending' ? <><Button disabled={busy || !item.chargeResolution} onClick={() => setConfirmLoss({ reportId: item.lostBookReportId, quotedAmount: item.quotedAmount })}>Confirm loss</Button><Button variant="secondary" disabled={busy} onClick={() => void decide(item.lostBookReportId, 'Rejected')}>Reject report</Button>{!item.quotationId ? isLibrarian ? <a href={quotationCatalogHref(item.titleId, item.title)} className="self-center text-xs font-bold text-[#0b5ea2] underline">Attach quotation in catalog</a> : <span className="self-center text-xs text-[#0b5ea2]/70">Ask a Librarian to attach a quotation.</span> : null}</> : null}{item.status === 'Confirmed' && lostResolution(item) === 'Quoted' && item.paymentStatus === 'Unpaid' ? <Button disabled={busy} onClick={() => void settle(item.lostBookReportId)}>Record replacement payment</Button> : null}</div></div>)}</div></SectionCard> : null}
      {(isLibrarian ? selected.lostBooks : []).filter((item) => item.status === 'Confirmed' && lostResolution(item) === 'Awaiting Quotation').map((item) => <SectionCard key={`resolution-${item.lostBookReportId}`} className="p-4"><h3 className="font-bold text-[#0b5ea2]">Resolve {item.title}</h3><p className="mt-1 text-sm text-[#0b5ea2]/70">The loss is confirmed, but no replacement charge has been assessed.</p><div className="mt-3 flex flex-wrap gap-2">{item.quotedAmount ? <Button disabled={busy} onClick={() => setConfirmCharge({ reportId: item.lostBookReportId, quotedAmount: item.quotedAmount! })}>Confirm quotation charge {money(item.quotedAmount)}</Button> : isLibrarian ? <a href={quotationCatalogHref(item.titleId, item.title)} className="self-center text-sm font-bold underline">Upload supplier quotation</a> : <span className="self-center text-sm">Ask a Librarian to upload a supplier quotation.</span>}<Button variant="secondary" disabled={busy} onClick={() => { setWaiveDialog({ reportId: item.lostBookReportId, title: item.title }); setWaiveReason(''); setWaiveError('') }}>Document non-monetary resolution</Button></div></SectionCard>)}
      <SectionCard className="p-4">
        <div>
          <h3 className="font-bold text-[#0b5ea2]">Clearance exception</h3>
          <p className="text-xs text-[#0b5ea2]/60">Use this only when an authorized staff member approves clearing a blocked student.</p>
        </div>

        {selected.activeOverride ? <div className="mt-4 rounded-xl border border-[#0b5ea2]/15 bg-[#0b5ea2]/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold text-[#0b5ea2]">Exception active: {selected.activeOverride.status}</p>
              <p className="mt-1 text-sm text-[#0b5ea2]/75">{selected.activeOverride.reason}</p>
              <p className="mt-2 text-xs text-[#0b5ea2]/55">Approved by {selected.activeOverride.appliedBy} on {date(selected.activeOverride.appliedAt)}</p>
            </div>
            {!revocationFormOpen ? <Button variant="secondary" disabled={busy} onClick={() => setRevocationFormOpen(true)}>Remove exception</Button> : null}
          </div>
          {revocationFormOpen ? <form onSubmit={revoke} className="mt-4 space-y-3 border-t border-[#0b5ea2]/15 pt-4">
            <label htmlFor="revocation-reason" className="block text-sm font-bold text-[#0b5ea2]">Reason for removing the exception</label>
            <textarea id="revocation-reason" name="reason" required minLength={10} placeholder="Example: The approved exception is no longer needed." className={`${field} h-20 py-3`} />
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? 'Removing…' : 'Confirm removal'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setRevocationFormOpen(false)}>Cancel</Button></div>
          </form> : null}
        </div> : selected.computedStatus === 'Not Cleared' ? <div className="mt-4">
          <p className="text-sm text-[#0b5ea2]/75">This student has library obligations. An exception changes only the clearance status; books, lost-item charges, and fines remain recorded.</p>
          {!overrideFormOpen ? <Button className="mt-4" onClick={() => setOverrideFormOpen(true)}>Clear student as an exception</Button> : <form onSubmit={override} className="mt-4 space-y-3 rounded-xl border border-[#0b5ea2]/15 p-4">
            <label htmlFor="override-reason" className="block text-sm font-bold text-[#0b5ea2]">Reason for exception</label>
            <textarea id="override-reason" name="reason" required minLength={10} placeholder="Example: Approved by the Head Librarian while payment is being verified." className={`${field} h-20 py-3`} />
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Confirm exception'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setOverrideFormOpen(false)}>Cancel</Button></div>
          </form>}
        </div> : <div className="mt-4 rounded-xl bg-[#0b5ea2]/5 p-4 text-sm text-[#0b5ea2]">
          No exception is needed because the student is already cleared by the system.
        </div>}

        {selected.overrideHistory.length ? <div className="mt-4 border-t border-[#0b5ea2]/15 pt-4">
          <button type="button" onClick={() => setHistoryOpen((value) => !value)} className="text-sm font-bold text-[#0b5ea2]">{historyOpen ? 'Hide' : 'View'} exception history ({selected.overrideHistory.length})</button>
          {historyOpen ? <div className="mt-3 space-y-2">{selected.overrideHistory.map((entry) => <div key={entry.overrideId} className="rounded-xl bg-[#0b5ea2]/5 p-3 text-xs text-[#0b5ea2]"><strong>{entry.status}</strong> · {entry.reason}<br />Applied by {entry.appliedBy} on {date(entry.appliedAt)}{entry.revokedAt ? ` · Removed by ${entry.revokedBy} on ${date(entry.revokedAt)}: ${entry.revocationReason}` : ''}</div>)}</div> : null}
        </div> : null}
      </SectionCard>
          </div>
        </div>
      </div>
    ) : null}
    {confirmLoss ? (
      <ConfirmModal
        title="Confirm this loss?"
        description={
          confirmLoss.quotedAmount
            ? `Confirm this loss and charge the supplier quotation amount of ${money(confirmLoss.quotedAmount)}?`
            : 'Confirm this loss with no charge yet? Staff can attach a quotation or record a documented non-monetary resolution later.'
        }
        confirmText="Yes, confirm loss"
        cancelText="Keep pending"
        onCancel={() => setConfirmLoss(null)}
        onConfirm={() => void decide(confirmLoss.reportId, 'Confirmed')}
      />
    ) : null}
    {confirmCharge ? (
      <ConfirmModal
        title="Assess quotation charge?"
        description={`Assess ${money(confirmCharge.quotedAmount)} from the current supplier quotation as the replacement charge?`}
        confirmText="Yes, assess charge"
        cancelText="Cancel"
        onCancel={() => setConfirmCharge(null)}
        onConfirm={() => void resolve(confirmCharge.reportId, 'Charge')}
      />
    ) : null}
    {waiveDialog ? (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm lg:left-[var(--sidebar-offset,0px)]" role="dialog" aria-modal="true" aria-labelledby="waive-resolution-title">
        <form onSubmit={submitWaive} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#FFFFFF] p-6 shadow-2xl dark:bg-[#001a4d]">
          <h3 id="waive-resolution-title" className="font-display text-xl font-bold text-[#0b5ea2] dark:text-white">Document non-monetary resolution</h3>
          <p className="mt-2 text-sm text-[#0b5ea2]/70 dark:text-white/60">
            Close the confirmed loss for <strong>{waiveDialog.title}</strong> without a replacement charge. Record why no fee applies (at least 10 characters).
          </p>
          {waiveError ? <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{waiveError}</p> : null}
          <label htmlFor="waive-resolution-reason" className="mt-4 block text-sm font-bold text-[#0b5ea2] dark:text-white">Resolution reason</label>
          <textarea
            id="waive-resolution-reason"
            value={waiveReason}
            onChange={(event) => { setWaiveReason(event.target.value); if (waiveError) setWaiveError('') }}
            rows={4}
            placeholder="Example: Head Librarian waived charge; replacement copy donated by the program."
            className={`${field} mt-2 h-28 py-3 dark:border-white/20 dark:bg-[#001133] dark:text-white`}
          />
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={busy} onClick={closeResolutionDialogs} className="h-10 rounded-xl px-4 text-sm font-bold text-[#0b5ea2] hover:bg-zinc-100 transition-colors disabled:opacity-40 dark:text-white/80 dark:hover:bg-white/10">Cancel</button>
            <button type="submit" disabled={busy} className="h-10 rounded-xl bg-[#0b5ea2] px-4 text-sm font-bold text-[#FFFFFF] hover:bg-[#004488] transition-colors disabled:opacity-40">{busy ? 'Saving…' : 'Record resolution'}</button>
          </div>
        </form>
      </div>
    ) : null}
  </>
}
