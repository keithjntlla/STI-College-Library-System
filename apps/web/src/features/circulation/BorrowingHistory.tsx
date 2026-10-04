import { ViewLocationButton } from '../floor-plan/ViewLocationButton'
import { AlertTriangle, BookOpen, CalendarClock, ChevronLeft, ChevronRight, Eye, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, SectionCard, StatCard, StatusBadge, StatusModal } from '../../components/ui'
import { circulationApi } from './circulation-api'
import type { BorrowingHistoryData } from './types'
import { BookDetailDrawer } from '../catalog/BookDetailDrawer'
import { CancelBorrowRequestDialog } from './CancelBorrowRequestDialog'
import { ReportLostDialog } from './ReportLostDialog'
import { BookCoverThumbnail } from '../catalog/BookCoverThumbnail'
import { clearanceApi } from '../clearance/clearance-api'

type HistoryItem = BorrowingHistoryData['items'][number]
type LoadMode = 'initial' | 'background' | 'manual' | 'page'

const OPEN_STATUSES = new Set(['Pending', 'Borrowed', 'Overdue', 'Active'])

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function slotValue(summary: BorrowingHistoryData['summary'] | undefined) {
  if (!summary || summary.remainingLoanSlots === null) return summary ? 'Unlimited' : '—'
  return `${summary.remainingLoanSlots} of ${summary.loanLimit ?? 2}`
}

function isOpenLoan(item: HistoryItem) {
  return OPEN_STATUSES.has(item.status)
}

function copyLabel(item: Pick<HistoryItem, 'accessionNumber' | 'transactionId'>) {
  return item.accessionNumber ?? `TX-${item.transactionId}`
}

function lostReportLabel(status: string) {
  if (status === 'Pending') return 'Lost report pending'
  if (status === 'Confirmed') return 'Lost report confirmed'
  if (status === 'Rejected') return 'Lost report rejected'
  return status
}

function canReportLost(item: HistoryItem) {
  return ['Borrowed', 'Overdue'].includes(item.status) && (!item.lostReportStatus || item.lostReportStatus === 'Rejected')
}

export function BorrowingHistory() {
  const [data, setData] = useState<BorrowingHistoryData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [paging, setPaging] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [detail, setDetail] = useState<{ titleId: number; barcode: string | null } | null>(null)
  const [cancelling, setCancelling] = useState<HistoryItem | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [reporting, setReporting] = useState<HistoryItem | null>(null)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportError, setReportError] = useState('')
  const pageRef = useRef(page)
  const requestRef = useRef(0)
  const payloadRef = useRef('')
  const hasDataRef = useRef(false)
  const loadedPageRef = useRef(1)
  pageRef.current = page

  const load = useCallback(async (mode: LoadMode) => {
    const request = ++requestRef.current
    if (mode === 'initial' && !hasDataRef.current) setLoading(true)
    if (mode === 'manual') setRefreshing(true)
    if (mode === 'page') setPaging(true)
    try {
      const next = await circulationApi.history(pageRef.current)
      if (request !== requestRef.current) return
      const serialized = JSON.stringify(next)
      if (serialized !== payloadRef.current) {
        payloadRef.current = serialized
        setData(next)
      }
      hasDataRef.current = true
      loadedPageRef.current = next.pagination.page
      if (mode !== 'background') setError('')
    } catch (reason) {
      if (request !== requestRef.current) return
      if (mode === 'page' && pageRef.current !== loadedPageRef.current) setPage(loadedPageRef.current)
      if (mode !== 'background' || !hasDataRef.current) {
        setError(reason instanceof Error ? reason.message : 'Borrowing history is unavailable.')
      }
    } finally {
      if (request === requestRef.current) {
        setLoading(false)
        setRefreshing(false)
        setPaging(false)
      }
    }
  }, [])

  useEffect(() => {
    void load(hasDataRef.current ? 'page' : 'initial')
    const refresh = () => void load('background')
    let timer = 0
    const arm = () => {
      window.clearInterval(timer)
      if (!document.hidden) timer = window.setInterval(refresh, 5_000)
    }
    const onVisibility = () => {
      if (document.hidden) {
        window.clearInterval(timer)
        return
      }
      refresh()
      arm()
    }
    arm()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('smartlib:circulation-updated', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('smartlib:circulation-updated', refresh)
    }
  }, [load, page])

  async function confirmCancellation(reason: string) {
    if (!cancelling || cancelBusy) return
    setCancelBusy(true)
    setCancelError('')
    try {
      await circulationApi.cancelRequest(cancelling.transactionId, reason)
      setCancelling(null)
      setNotice(`${cancelling.title} request was cancelled and its copy is available again.`)
      window.dispatchEvent(new Event('smartlib:circulation-updated'))
      await load('background')
    } catch (reasonValue) {
      setCancelError(reasonValue instanceof Error ? reasonValue.message : 'The pending request could not be cancelled.')
    } finally {
      setCancelBusy(false)
    }
  }

  async function reportLost() {
    if (!reporting || reportBusy) return
    setReportBusy(true)
    setReportError('')
    try {
      await clearanceApi.reportLost(reporting.transactionId)
      setNotice(`${reporting.title} was reported lost. Library staff have been notified.`)
      setReporting(null)
      await load('background')
    } catch (reason) {
      setReportError(reason instanceof Error ? reason.message : 'The lost-book report could not be submitted.')
    } finally {
      setReportBusy(false)
    }
  }

  const summary = data?.summary
  const openLoans = data?.items.filter(isOpenLoan) ?? []
  const history = data?.items.filter((item) => !isOpenLoan(item)) ?? []
  const deadlineLabel = summary?.nextDueAt ? `Next deadline · Due: ${summary.dueCutoffLabel}` : 'Next deadline'

  return <>
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b5ea2] sm:sr-only dark:text-white">Borrowing history</h1>
      <Button variant="secondary" className="ml-auto" disabled={refreshing} onClick={() => void load('manual')}>
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : undefined} />
        {refreshing ? 'Refreshing' : 'Refresh'}
      </Button>
    </div>
    {error ? <div role="alert" className="mb-5 flex items-center gap-3 rounded-xl bg-[#FFF200] px-4 py-3 font-semibold text-[#0b5ea2]"><AlertTriangle size={18} />{error}</div> : null}
    {notice ? <StatusModal type="success" title="Report submitted" description={notice} onClose={() => setNotice('')} /> : null}
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <StatCard label="Remaining loan slots" value={slotValue(summary)} icon={BookOpen} tone="blue" />
      <StatCard label="Active loans" value={summary?.activeLoans ?? 0} icon={CalendarClock} tone="blue" />
      <StatCard label={deadlineLabel} value={summary?.nextDueAt ? formatDate(summary.nextDueAt) : 'No active due date'} icon={CalendarClock} tone="orange" />
    </div>

    {loading && !data ? (
      <SectionCard className="px-5 py-12 text-center text-[#0b5ea2]">Loading borrowing records…</SectionCard>
    ) : null}

    {!loading && (!data || data.items.length === 0) ? (
      <SectionCard className="px-5 py-12 text-center font-semibold text-[#0b5ea2]">No borrowing transactions have been recorded.</SectionCard>
    ) : null}

    {data && data.items.length > 0 ? (
      <div className="space-y-5">
        {openLoans.length > 0 ? (
          <section aria-label="Open loans">
            <h2 className="mb-3 font-display text-base font-bold text-[#0b5ea2] dark:text-white">Open loans</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {openLoans.map((item) => (
                <OpenLoanCard
                  key={item.transactionId}
                  item={item}
                  onDetails={() => setDetail({ titleId: Number(item.titleId), barcode: item.barcode })}
                  onCancel={() => { setCancelError(''); setCancelling(item) }}
                  onReport={() => { setReportError(''); setReporting(item) }}
                />
              ))}
            </div>
          </section>
        ) : null}

        <SectionCard className="overflow-hidden">
          <div className="border-b border-[#0b5ea2]/15 px-5 py-4 dark:border-white/10">
            <h2 className="font-display text-base font-bold text-[#0b5ea2] dark:text-white">Transaction history</h2>
            <p className="mt-1 text-xs text-[#0b5ea2]/60 dark:text-white/60">Returned and cancelled loans</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0b5ea2] text-[#FFFFFF]">
                <tr>
                  <th scope="col" className="px-5 py-3">Title</th>
                  <th scope="col" className="px-5 py-3">Borrow date</th>
                  <th scope="col" className="px-5 py-3">Due date</th>
                  <th scope="col" className="px-5 py-3">Returned</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? history.map((item) => (
                  <tr key={item.transactionId} className="border-b border-[#0b5ea2]/10 dark:border-white/10">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <BookCoverThumbnail title={item.title} coverImagePath={item.coverImagePath} className="h-16 w-11 rounded-lg" />
                        <div className="min-w-0">
                          <p className="font-bold text-[#0b5ea2] dark:text-white">{item.title}</p>
                          <p className="mt-0.5 text-xs text-[#0b5ea2]/70 dark:text-white/70">{item.author}</p>
                          <p className="mt-1 font-mono text-xs text-[#0b5ea2]/60 dark:text-white/55">{copyLabel(item)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[#0b5ea2] dark:text-white/80">{formatDate(item.borrowDate)}</td>
                    <td className="px-5 py-4 font-semibold text-[#0b5ea2] dark:text-white">{formatDate(item.dueDate)}</td>
                    <td className="px-5 py-4 text-[#0b5ea2] dark:text-white/80">{formatDate(item.returnDate)}</td>
                    <td className="px-5 py-4"><LoanStatus item={item} /></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        {item.titleId ? (
                          <button type="button" onClick={() => setDetail({ titleId: Number(item.titleId), barcode: item.barcode })} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#0b5ea2]/20 px-3 text-xs font-bold text-[#0b5ea2] dark:border-white/20 dark:text-white">
                            <Eye size={15} /> View details
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center font-semibold text-[#0b5ea2] dark:text-white">
                      {openLoans.length > 0 ? 'No returned or cancelled loans on this page.' : 'No borrowing transactions have been recorded.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {data.pagination.totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-3" aria-label="History pages">
            <button type="button" aria-label="Previous page" disabled={page <= 1 || paging} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-[#0b5ea2]/15 bg-white p-2 text-[#0b5ea2] disabled:opacity-40 dark:bg-zinc-900">
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-bold text-[#0b5ea2] dark:text-white">Page {page} of {data.pagination.totalPages}</span>
            <button type="button" aria-label="Next page" disabled={page >= data.pagination.totalPages || paging} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-[#0b5ea2]/15 bg-white p-2 text-[#0b5ea2] disabled:opacity-40 dark:bg-zinc-900">
              <ChevronRight size={18} />
            </button>
          </nav>
        ) : null}
      </div>
    ) : null}

    {detail ? <BookDetailDrawer titleId={detail.titleId} barcode={detail.barcode} onClose={() => setDetail(null)} /> : null}
    {cancelling ? <CancelBorrowRequestDialog title={cancelling.title} busy={cancelBusy} error={cancelError} onCancel={() => { if (!cancelBusy) setCancelling(null) }} onConfirm={(reason) => void confirmCancellation(reason)} /> : null}
    {reporting ? <ReportLostDialog title={reporting.title} busy={reportBusy} error={reportError} onCancel={() => { if (!reportBusy) setReporting(null) }} onConfirm={() => void reportLost()} /> : null}
  </>
}

function LoanStatus({ item }: { item: HistoryItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge status={item.status} />
      {item.lostReportStatus ? <StatusBadge status={lostReportLabel(item.lostReportStatus)} /> : null}
    </div>
  )
}

function OpenLoanCard({ item, onDetails, onCancel, onReport }: {
  item: HistoryItem
  onDetails: () => void
  onCancel: () => void
  onReport: () => void
}) {
  return (
    <SectionCard className="p-5">
      <div className="flex items-start gap-4">
        <BookCoverThumbnail title={item.title} coverImagePath={item.coverImagePath} className="h-24 w-16 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0b5ea2]/55 dark:text-white/55">Open loan</p>
            <LoanStatus item={item} />
          </div>
          <h3 className="mt-2 font-bold text-[#0b5ea2] dark:text-white">{item.title}</h3>
          <p className="mt-0.5 text-xs text-[#0b5ea2]/70 dark:text-white/70">{item.author}</p>
          <p className="mt-1 font-mono text-xs text-[#0b5ea2]/60 dark:text-white/55">{copyLabel(item)}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#0b5ea2]/5 p-3 text-xs dark:bg-white/5">
        <div>
          <dt className="font-semibold uppercase text-[#0b5ea2]/45 dark:text-white/45">Borrow date</dt>
          <dd className="mt-1 font-semibold text-[#0b5ea2] dark:text-white">{formatDate(item.borrowDate)}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase text-[#0b5ea2]/45 dark:text-white/45">Due</dt>
          <dd className="mt-1 font-semibold text-[#0b5ea2] dark:text-white">{formatDate(item.dueDate)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {item.titleId ? <ViewLocationButton titleId={Number(item.titleId)} barcode={item.barcode} /> : null}
        {item.titleId ? (
          <button type="button" onClick={onDetails} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#0b5ea2]/20 px-3 text-xs font-bold text-[#0b5ea2] dark:border-white/20 dark:text-white">
            <Eye size={15} /> View details
          </button>
        ) : null}
        {item.status === 'Pending' ? (
          <button type="button" onClick={onCancel} className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-bold text-[#0b5ea2] hover:bg-[#FFF200] dark:text-white">
            <X size={14} /> Cancel request
          </button>
        ) : null}
        {canReportLost(item) ? (
          <button type="button" onClick={onReport} className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-bold text-[#0b5ea2] hover:bg-[#FFF200] dark:text-white">
            Report lost
          </button>
        ) : null}
      </div>
    </SectionCard>
  )
}
