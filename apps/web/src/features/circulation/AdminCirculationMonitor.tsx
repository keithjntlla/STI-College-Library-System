import { AlertTriangle, BookOpen, BookText, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, MapPin, QrCode, RefreshCw, ScanBarcode, Search, UserCircle, X } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Button, ConfirmModal, MobileList, MobileListItem, SectionCard, StatCard, StatusBadge, TableShell } from '../../components/ui'
import { attendanceApi } from '../attendance/attendance-api'
import { BookCoverThumbnail } from '../catalog/BookCoverThumbnail'
import { catalogApi } from '../catalog/catalog-api'
import { usersApi } from '../users/users-api'
import { CancelBorrowRequestDialog } from './CancelBorrowRequestDialog'
import { CirculationScannerModal } from './CirculationScannerModal'
import { ReportLostDialog } from './ReportLostDialog'
import { circulationApi } from './circulation-api'
import type { CheckoutEligibility, CirculationMonitorData, LoanMode, ReadyReservation } from './types'

type MonitorItem = CirculationMonitorData['items'][number]
type MonitorTab = 'pending' | 'active' | 'overdue'

function laneFromLocation(): MonitorTab {
  const lane = new URLSearchParams(window.location.search).get('lane')
  if (lane === 'pending' || lane === 'active' || lane === 'overdue') return lane
  return 'pending'
}
type StudentInfo = { name: string; role: string; program: string; avatarUrl: string | null }
type FeedbackStudent = StudentInfo & { schoolId: string; activeLoans: number | null; loanLimit: number | null }
type BookInfo = {
  title: string
  authors: string
  coverUrl: string | null
  accessionNumber?: string | null
  barcode?: string | null
  shelfLocation?: string | null
  conditionStatus?: string | null
}

const PAGE_SIZE = 50

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function extractBookCode(raw: string) {
  const data = raw.trim()
  if (data.startsWith('{')) {
    try {
      const parsed = JSON.parse(data) as { barcode?: string; accession_number?: string }
      return (parsed.accession_number || parsed.barcode || '').trim()
    } catch {
      return ''
    }
  }
  if (data.startsWith('ACC-') || data.startsWith('BC-') || data.includes('-IMP-')) return data
  return ''
}

async function resolveAvatar(schoolIdValue: string) {
  try {
    return (await usersApi.getAvatar(schoolIdValue)).avatarUrl
  } catch {
    return null
  }
}

export function AdminCirculationMonitor() {
  const [data, setData] = useState<CirculationMonitorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [feedbackStudent, setFeedbackStudent] = useState<FeedbackStudent | null>(null)
  const [barcode, setBarcode] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null)
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showConfirmCheckout, setShowConfirmCheckout] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<MonitorItem | null>(null)
  const [returnTarget, setReturnTarget] = useState<MonitorItem | null>(null)
  const [returnBookPreview, setReturnBookPreview] = useState<BookInfo | null>(null)
  const [cancelError, setCancelError] = useState('')
  const [lostTarget, setLostTarget] = useState<MonitorItem | null>(null)
  const [lostError, setLostError] = useState('')
  const [deskSearch, setDeskSearch] = useState('')
  const [checkoutBlocked, setCheckoutBlocked] = useState(false)
  const [limitNotice, setLimitNotice] = useState('')
  const [returnCandidates, setReturnCandidates] = useState<MonitorItem[]>([])
  const [readyReservations, setReadyReservations] = useState<ReadyReservation[]>([])
  const [loanMode, setLoanMode] = useState<LoanMode>('TakeHome')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [verifyReadyHold, setVerifyReadyHold] = useState(false)
  const [monitorTab, setMonitorTab] = useState<MonitorTab>(laneFromLocation)

  const load = useCallback(async (nextPage = page) => {
    setLoading(true)
    try {
      setData(await circulationApi.monitor(nextPage, PAGE_SIZE))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Circulation records are unavailable.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load(page)
    const refresh = () => void load(page)
    const timer = window.setInterval(refresh, 5_000)
    window.addEventListener('smartlib:circulation-updated', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('smartlib:circulation-updated', refresh)
    }
  }, [load, page])

  useEffect(() => {
    if (!error && !success) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (showConfirmCheckout || showScanner || returnTarget || cancelTarget || lostTarget) return
      setError('')
      setSuccess('')
      setFeedbackStudent(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelTarget, error, lostTarget, returnTarget, showConfirmCheckout, showScanner, success])

  function clearFeedback() {
    setError('')
    setSuccess('')
    setFeedbackStudent(null)
  }

  function clearTerminal() {
    setBarcode('')
    setSchoolId('')
    setStudentInfo(null)
    setBookInfo(null)
    setSelectedClaimId(null)
    setError('')
    setSuccess('')
    setFeedbackStudent(null)
    setShowConfirmCheckout(false)
    setCheckoutBlocked(false)
    setLimitNotice('')
    setReturnCandidates([])
    setReadyReservations([])
    setLoanMode('TakeHome')
    setShowManualEntry(false)
    setVerifyReadyHold(false)
  }

  async function loadBookPreview(code: string) {
    const pendingMatch = data?.items.find((item) => item.barcode === code || item.accessionNumber === code)
    if (pendingMatch) {
      setSelectedClaimId(pendingMatch.transactionId)
      try {
        const label = await catalogApi.copyByBarcode(code)
        setBookInfo({
          title: label.title || pendingMatch.title,
          authors: label.author || '',
          coverUrl: label.coverImagePath ?? null,
          accessionNumber: label.accessionNumber || pendingMatch.accessionNumber,
          barcode: label.barcode || pendingMatch.barcode,
          shelfLocation: label.shelfLocation || null,
          conditionStatus: label.conditionStatus ?? null,
        })
      } catch {
        setBookInfo({
          title: pendingMatch.title,
          authors: '',
          coverUrl: null,
          accessionNumber: pendingMatch.accessionNumber,
          barcode: pendingMatch.barcode,
          shelfLocation: null,
          conditionStatus: null,
        })
      }
      return
    }

    setSelectedClaimId(null)
    try {
      const label = await catalogApi.copyByBarcode(code)
      setBookInfo({
        title: label.title,
        authors: label.author,
        coverUrl: label.coverImagePath ?? null,
        accessionNumber: label.accessionNumber,
        barcode: label.barcode,
        shelfLocation: label.shelfLocation,
        conditionStatus: label.conditionStatus ?? null,
      })
    } catch {
      setBookInfo({ title: code, authors: 'Book details unavailable', coverUrl: null })
    }
  }

  function loansToMonitorItems(loans: CheckoutEligibility['openLoans'], identity: { name: string; schoolId: string; role: string }): MonitorItem[] {
    return loans.map((loan) => ({
      transactionId: loan.transactionId,
      userName: identity.name,
      schoolId: identity.schoolId,
      role: identity.role,
      title: loan.title,
      accessionNumber: loan.accessionNumber,
      barcode: loan.barcode,
      requestedAt: loan.dueDate ?? '',
      borrowDate: null,
      dueDate: loan.dueDate,
      returnDate: null,
      status: loan.status,
      lostReportStatus: null,
    }))
  }

  function lostReportLabel(status: string) {
    if (status === 'Pending') return 'Lost report pending'
    if (status === 'Confirmed') return 'Lost report confirmed'
    if (status === 'Rejected') return 'Lost report rejected'
    return status
  }

  async function applyStudent(next: { schoolId: string; name: string; role: string; program?: string }) {
    setCheckoutBlocked(false)
    setLimitNotice('')
    setSchoolId(next.schoolId)
    const avatarUrl = await resolveAvatar(next.schoolId)
    setStudentInfo({
      name: next.name,
      role: next.role,
      program: next.program ?? '',
      avatarUrl,
    })
  }

  async function acceptScannedStudent(next: { schoolId: string; name: string; role: string; program?: string }): Promise<'blocked' | 'ready' | 'ok'> {
    const eligibility = await circulationApi.checkoutEligibility(next.schoolId)
    const schoolIdValue = eligibility.schoolId || next.schoolId
    const identity: FeedbackStudent = {
      name: eligibility.name || next.name,
      schoolId: schoolIdValue,
      role: eligibility.role || next.role,
      program: next.program ?? '',
      avatarUrl: await resolveAvatar(schoolIdValue),
      activeLoans: eligibility.activeLoans,
      loanLimit: eligibility.loanLimit,
    }
    const openLoans = loansToMonitorItems(eligibility.openLoans ?? [], identity)
    const ready = eligibility.readyReservations ?? []
    setFeedbackStudent(identity)
    setReturnCandidates(openLoans)
    setReadyReservations(ready)
    if (!eligibility.allowed) {
      if (!openLoans.length) {
        setCheckoutBlocked(false)
        setLimitNotice('')
        setSchoolId('')
        setStudentInfo(null)
        setReadyReservations([])
        setError(eligibility.message ?? 'This student cannot check out another book.')
        return 'blocked'
      }
      setCheckoutBlocked(true)
      setSchoolId('')
      setBarcode('')
      setBookInfo(null)
      setSelectedClaimId(null)
      setStudentInfo({
        name: identity.name,
        role: identity.role,
        program: identity.program,
        avatarUrl: identity.avatarUrl,
      })
      setLimitNotice(eligibility.message ?? 'This student cannot check out another book.')
      setDeskSearch(identity.schoolId)
      if (openLoans.length === 1) await openReturnScanner(openLoans[0])
      return 'blocked'
    }
    await applyStudent({
      schoolId: identity.schoolId,
      name: identity.name,
      role: identity.role,
      program: identity.program,
    })
    if (ready[0]?.barcode) {
      setVerifyReadyHold(true)
      setBarcode(ready[0].barcode)
      await loadBookPreview(ready[0].barcode)
      setSuccess(`Ready for pickup: ${ready[0].title}. Verify the book, then confirm Verify & Checkout.`)
      setMonitorTab('pending')
      return 'ready'
    }
    return 'ok'
  }

  async function selectClaim(item: MonitorItem) {
    setSelectedClaimId(item.transactionId)
    setBarcode(item.barcode)
    await loadBookPreview(item.barcode)
    setSuccess(`Selected ${item.title} for ${item.userName}. Confirm checkout after verifying ID and book.`)
  }

  async function handleScan(raw: string) {
    setShowScanner(false)
    setError('')
    setSuccess('')
    setFeedbackStudent(null)
    const dataText = raw.trim()
    if (!dataText) return

    const bookCode = extractBookCode(dataText)
    if (bookCode) {
      setBarcode(bookCode)
      await loadBookPreview(bookCode)
      setSuccess('Book scanned successfully. Scan student ID next, or confirm checkout.')
      return
    }

    if (dataText.startsWith('STILIB.ATTENDANCE.')) {
      setSubmitting(true)
      try {
        const result = await attendanceApi.resolveScan(dataText)
        const outcome = await acceptScannedStudent({
          schoolId: result.visitor.schoolId,
          name: result.visitor.name,
          role: result.visitor.role,
          program: result.visitor.program ?? '',
        })
        if (outcome === 'blocked') return
        if (outcome === 'ok') setSuccess('Student verified. Scan the book next, then confirm checkout.')
        setMonitorTab('pending')
      } catch (err) {
        setSchoolId('')
        setStudentInfo(null)
        setError(err instanceof Error ? err.message : 'Invalid student QR code.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (dataText.includes('-')) {
      const normalized = dataText.toUpperCase()
      const pendingMatch = data?.items.find((item) => item.schoolId.toUpperCase() === normalized)
      setSubmitting(true)
      try {
        const outcome = await acceptScannedStudent({
          schoolId: normalized,
          name: pendingMatch?.userName ?? normalized,
          role: pendingMatch?.role ?? 'Borrower',
        })
        if (outcome === 'blocked') return
        if (outcome === 'ok') setSuccess('School ID logged. Scan the book next, then confirm checkout.')
        setMonitorTab('pending')
      } catch (err) {
        setSchoolId('')
        setStudentInfo(null)
        setError(err instanceof Error ? err.message : 'This student cannot be checked out.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    setError('Unrecognized QR payload. Scan a student attendance QR or a book accession QR.')
  }

  async function openReturnScanner(item: MonitorItem) {
    setReturnTarget(item)
    setReturnBookPreview(null)
    try {
      const label = await catalogApi.copyByBarcode(item.barcode)
      setReturnBookPreview({
        title: label.title || item.title,
        authors: label.author || '',
        coverUrl: label.coverImagePath ?? null,
        accessionNumber: label.accessionNumber || item.accessionNumber,
        barcode: label.barcode || item.barcode,
        shelfLocation: label.shelfLocation,
        conditionStatus: label.conditionStatus ?? null,
      })
    } catch {
      setReturnBookPreview({
        title: item.title,
        authors: '',
        coverUrl: null,
        accessionNumber: item.accessionNumber,
        barcode: item.barcode,
      })
    }
  }

  async function handleReturnScan(raw: string) {
    if (!returnTarget) return
    setError('')
    setSuccess('')

    const scannedBarcode = extractBookCode(raw) || raw.trim()
    const expected = [returnTarget.barcode, returnTarget.accessionNumber].filter(Boolean) as string[]
    const matched = expected.some((value) => value === scannedBarcode)

    if (!matched) {
      setError(`Barcode mismatch! Expected ${returnTarget.barcode}, but scanned ${scannedBarcode || '(empty)'}. This is the wrong book.`)
      setReturnTarget(null)
      setReturnBookPreview(null)
      return
    }

    const tid = returnTarget.transactionId
    setReturnTarget(null)
    setReturnBookPreview(null)
    setBusyId(tid)
    try {
      await circulationApi.returnBook(tid)
      setSuccess('Return completed and the waiting queue was advanced.')
      await load(page)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Return could not be completed.')
    } finally {
      setBusyId(null)
    }
  }

  function promptCheckout(event: FormEvent) {
    event.preventDefault()
    if (!schoolId.trim() || !barcode.trim()) return
    setShowConfirmCheckout(true)
  }

  async function checkout() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const wasReadyHold = verifyReadyHold
      if (wasReadyHold) await circulationApi.fulfillClaim(barcode.trim(), schoolId.trim(), loanMode)
      else await circulationApi.confirmCheckout(barcode.trim(), schoolId.trim(), loanMode)
      clearTerminal()
      setSuccess(wasReadyHold
        ? 'Hold verified and checked out. The reservation is now claimed.'
        : 'Checkout confirmed successfully. The book is now an active loan.')
      await load(page)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Checkout could not be confirmed.')
      setShowConfirmCheckout(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function penalty(transactionId: number) {
    setBusyId(transactionId)
    setError('')
    setSuccess('')
    try {
      const result = await circulationApi.calculatePenalty(transactionId)
      setSuccess(`Calculated penalty: ₱${result.amount.toFixed(2)}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Penalty could not be calculated.')
    } finally {
      setBusyId(null)
    }
  }

  async function cancelPending(reason: string) {
    if (!cancelTarget || busyId !== null) return
    const target = cancelTarget
    setBusyId(target.transactionId)
    setCancelError('')
    setError('')
    setSuccess('')
    try {
      await circulationApi.cancelRequest(target.transactionId, reason)
      setData((current) => current ? {
        ...current,
        summary: { ...current.summary, pendingClaims: Math.max(0, current.summary.pendingClaims - 1) },
        items: current.items.filter((item) => item.transactionId !== target.transactionId),
      } : current)
      setCancelTarget(null)
      setSuccess(`${target.title} pending claim was cancelled and released.`)
      window.dispatchEvent(new Event('smartlib:circulation-updated'))
      await load(page)
    } catch (reasonValue) {
      setCancelError(reasonValue instanceof Error ? reasonValue.message : 'The pending request could not be cancelled.')
    } finally {
      setBusyId(null)
    }
  }

  async function reportLost() {
    if (!lostTarget || busyId !== null) return
    setBusyId(lostTarget.transactionId)
    setLostError('')
    setError('')
    setSuccess('')
    try {
      const result = await circulationApi.reportLost(lostTarget.transactionId)
      setSuccess(result.alreadyReported
        ? 'This loss is already awaiting staff review.'
        : 'Loss reported and borrower notified. Review it in Admin clearance.')
      setLostTarget(null)
      await load(page)
    } catch (reason) {
      setLostError(reason instanceof Error ? reason.message : 'The loss could not be reported.')
    } finally {
      setBusyId(null)
    }
  }

  async function loadPendingClaim(item: MonitorItem) {
    await applyStudent({ schoolId: item.schoolId, name: item.userName, role: item.role })
    setSelectedClaimId(item.transactionId)
    setBarcode(item.barcode)
    await loadBookPreview(item.barcode)
    setError('')
    setSuccess('Student and book loaded from pending claim. Confirm checkout after verifying the presented ID and book.')
    setMonitorTab('pending')
  }

  const studentPendingClaims = useMemo(() => {
    if (!schoolId.trim() || !data) return []
    const id = schoolId.trim().toUpperCase()
    return data.items.filter((item) => item.status === 'Pending' && item.schoolId.toUpperCase() === id)
  }, [data, schoolId])

  const lanes = useMemo(() => ({
    pending: data?.items.filter((item) => item.status === 'Pending') ?? [],
    active: data?.items.filter((item) => ['Borrowed', 'Active'].includes(item.status)) ?? [],
    overdue: data?.items.filter((item) => item.status === 'Overdue') ?? [],
  }), [data])

  const filteredLaneItems = useMemo(() => {
    const source = lanes[monitorTab]
    const query = deskSearch.trim().toLowerCase()
    if (!query) return source
    return source.filter((item) => {
      const haystack = [
        item.userName,
        item.schoolId,
        item.title,
        item.accessionNumber ?? '',
        item.barcode,
      ].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [deskSearch, lanes, monitorTab])

  const tabEmpty = {
    pending: 'No students are currently on the way to claim books.',
    active: 'No active claims.',
    overdue: 'No overdue records.',
  }[monitorTab]

  const tabLabel = {
    pending: 'Pending claim',
    active: 'Active loans',
    overdue: 'Overdue',
  }[monitorTab]

  const statusMessage = error || success
  const statusTone = error ? 'error' : 'success'
  const monitorEmpty = deskSearch.trim() ? 'No monitor rows match this search.' : tabEmpty

  const renderItemStatus = (item: MonitorItem) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge status={item.status === 'Pending' ? 'Pending claim' : item.status} />
      {item.lostReportStatus ? <StatusBadge status={lostReportLabel(item.lostReportStatus)} /> : null}
    </div>
  )

  const renderItemActions = (item: MonitorItem, mobile = false) => {
    const pad = mobile ? 'px-3 py-2.5' : 'px-3 py-2'
    return item.status === 'Pending' ? (
      <>
        <button type="button" onClick={() => void loadPendingClaim(item)} className={`rounded-lg border border-[#0b5ea2]/20 bg-[#FFFFFF] ${pad} text-xs font-bold text-[#0b5ea2]`}>Verify borrower</button>
        <button type="button" disabled={busyId === item.transactionId} onClick={() => { setCancelError(''); setCancelTarget(item) }} className={`rounded-lg border border-[#0b5ea2]/20 bg-[#FFFFFF] ${pad} text-xs font-bold text-[#0b5ea2] disabled:opacity-40`}>Cancel</button>
      </>
    ) : (
      <>
        {item.status === 'Overdue' ? (
          <button type="button" disabled={busyId === item.transactionId} onClick={() => void penalty(item.transactionId)} className={`rounded-lg bg-[#FFF200] ${pad} text-xs font-bold text-[#0b5ea2] disabled:opacity-40`}>Calculate penalty</button>
        ) : null}
        {['Borrowed', 'Overdue', 'Active'].includes(item.status) && (!item.lostReportStatus || item.lostReportStatus === 'Rejected') ? (
          <button type="button" disabled={busyId === item.transactionId} onClick={() => { setLostError(''); setLostTarget(item) }} className={`rounded-lg border border-[#0b5ea2]/20 ${pad} text-xs font-bold text-[#0b5ea2] disabled:opacity-40`}>Report lost</button>
        ) : null}
        <button type="button" disabled={busyId === item.transactionId} onClick={() => void openReturnScanner(item)} className={`rounded-lg bg-[#0b5ea2] ${pad} text-xs font-bold text-[#FFFFFF] disabled:opacity-40`}>Process return</button>
      </>
    )
  }

  const monitorMobileRows = (
    <MobileList empty={!filteredLaneItems.length ? (
      <p className="px-5 py-10 text-center font-semibold text-[#0b5ea2]">{monitorEmpty}</p>
    ) : null}
    >
      {filteredLaneItems.map((item) => (
        <div key={item.transactionId} className={selectedClaimId === item.transactionId ? 'bg-[#FFF200]/25' : undefined}>
          <MobileListItem
            title={item.title}
            meta={<>{item.userName} · {item.schoolId} · {item.role}</>}
            status={renderItemStatus(item)}
            detail={(
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div className="min-w-0"><dt className="font-semibold uppercase text-[#0b5ea2]/50">Copy</dt><dd className="mt-0.5 break-all font-mono">{item.accessionNumber ?? item.barcode}</dd></div>
                <div className="min-w-0"><dt className="font-semibold uppercase text-[#0b5ea2]/50">Due</dt><dd className="mt-0.5 font-semibold">{formatDate(item.dueDate)}</dd></div>
                <div className="col-span-2 min-w-0"><dt className="font-semibold uppercase text-[#0b5ea2]/50">Requested / borrowed</dt><dd className="mt-0.5">{formatDate(item.borrowDate ?? item.requestedAt)}</dd></div>
              </dl>
            )}
            actions={renderItemActions(item, true)}
          />
        </div>
      ))}
    </MobileList>
  )

  return <>
    <div className="mb-5 flex flex-col gap-5 xl:flex-row">
      <div className="relative flex w-full flex-col gap-4 overflow-hidden rounded-3xl border border-[#0b5ea2]/15 bg-white p-6 shadow-sm xl:w-[18rem]">
        <div className="absolute -right-10 -top-10 text-[#0b5ea2]/5"><QrCode size={180} /></div>
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0b5ea2]">Checkout Terminal</h2>
            <p className="mt-1 text-sm text-[#0b5ea2]/70">Scan the student QR, then the book barcode. Confirm once the photo and cover match. Typed entry is only for a dead scanner.</p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#0b5ea2] text-lg font-bold text-white shadow-md transition-all hover:bg-[#004488]"
            >
              <QrCode size={24} />
              Scan student or book
            </button>
            <Button variant="secondary" className="w-full" onClick={() => setShowManualEntry((value) => !value)}>
              {showManualEntry ? 'Hide typed entry' : 'Type instead'}
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => void load(page)}>
              <RefreshCw size={16} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 rounded-3xl border border-[#0b5ea2]/15 bg-white p-6 shadow-sm">
        <form onSubmit={promptCheckout} className="flex h-full flex-col justify-between gap-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-2xl border border-[#0b5ea2]/10 bg-zinc-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0b5ea2]/55">Borrower verification</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {studentInfo?.avatarUrl ? (
                  <img
                    src={studentInfo.avatarUrl}
                    alt={`${studentInfo.name} profile photo`}
                    className="h-40 w-40 shrink-0 rounded-2xl border-2 border-[#0b5ea2]/20 object-cover shadow-md xl:h-44 xl:w-44"
                  />
                ) : (
                  <div className="flex h-40 w-40 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0b5ea2]/25 bg-[#0b5ea2]/5 text-[#0b5ea2] xl:h-44 xl:w-44">
                    <UserCircle size={56} />
                    <p className="mt-2 px-3 text-center text-[11px] font-semibold text-[#0b5ea2]/60">Scan student attendance QR</p>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {studentInfo ? (
                    <>
                      <h3 className="font-display text-xl font-black text-[#0b5ea2] sm:text-2xl">{studentInfo.name}</h3>
                      <p className="mt-1 text-sm font-bold text-[#0b5ea2]/80">{schoolId}</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-[#0b5ea2]/60">{studentInfo.role}</p>
                      {studentInfo.program ? <p className="mt-2 text-sm text-[#0b5ea2]/70">{studentInfo.program}</p> : null}
                    </>
                  ) : (
                    <h3 className="font-semibold italic text-[#0b5ea2]/50">Waiting for student scan…</h3>
                  )}
                </div>
              </div>
              {showManualEntry ? (
                <input
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  placeholder="Type school ID only if the scanner failed"
                  className="h-11 w-full rounded-xl border border-[#0b5ea2]/20 bg-white px-3 font-mono text-sm font-bold text-[#0b5ea2] outline-none focus:ring-2 focus:ring-[#0b5ea2]/10"
                />
              ) : (
                <p className="text-xs font-semibold text-[#0b5ea2]/60">{schoolId ? `School ID locked from scan: ${schoolId}` : 'Waiting for student QR scan…'}</p>
              )}

              {limitNotice ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-700">{limitNotice}</p>
              ) : null}
              {readyReservations.length ? (
                <div className="rounded-xl border border-[#FFF200] bg-[#FFF200]/35 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]">Ready for pickup</p>
                  <p className="mt-1 text-xs text-[#0b5ea2]/65">Confirm Verify & Checkout after matching the physical book.</p>
                  <ul className="mt-3 space-y-2">
                    {readyReservations.map((hold) => (
                      <li key={hold.reservationId}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!hold.barcode) return
                            setVerifyReadyHold(true)
                            setBarcode(hold.barcode)
                            void loadBookPreview(hold.barcode)
                          }}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-xl border p-2 text-left ${barcode === hold.barcode ? 'border-[#0b5ea2] bg-white ring-2 ring-[#0b5ea2]/20' : 'border-[#0b5ea2]/10 bg-white'}`}
                        >
                          <BookText size={18} className="text-[#0b5ea2]" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-[#0b5ea2]">{hold.title}</span>
                            <span className="font-mono text-[11px] text-[#0b5ea2]/65">{hold.accessionNumber ?? hold.barcode ?? 'Copy assigned at desk'}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {returnCandidates.length ? (
                <div className="rounded-xl border border-[#0b5ea2]/15 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]">Open loans for this borrower</p>
                  <p className="mt-1 text-xs text-[#0b5ea2]/65">Choose a book to return. The next scan confirms that copy.</p>
                  <ul className="mt-3 space-y-2">
                    {returnCandidates.map((loan) => (
                      <li key={loan.transactionId} className="flex items-center gap-3 rounded-xl border border-[#0b5ea2]/10 p-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#0b5ea2]">{loan.title}</p>
                          <p className="font-mono text-[11px] text-[#0b5ea2]/65">{loan.accessionNumber ?? loan.barcode}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void openReturnScanner(loan)}
                          className="shrink-0 rounded-lg bg-[#0b5ea2] px-3 py-2 text-xs font-bold text-white hover:bg-[#004488]"
                        >
                          Process return
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {studentPendingClaims.length ? (
                <div className="rounded-xl border border-[#0b5ea2]/15 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]">Pending counter claims</p>
                  <p className="mt-1 text-xs text-[#0b5ea2]/65">Select a pending title or scan its book QR.</p>
                  <ul className="mt-3 space-y-2">
                    {studentPendingClaims.map((claim) => {
                      const selected = selectedClaimId === claim.transactionId || barcode === claim.barcode
                      return (
                        <li key={claim.transactionId}>
                          <button
                            type="button"
                            onClick={() => void selectClaim(claim)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${selected ? 'border-[#0b5ea2] bg-[#FFF200]/40 ring-2 ring-[#0b5ea2]/20' : 'border-[#0b5ea2]/10 hover:border-[#0b5ea2]/30 hover:bg-zinc-50'}`}
                          >
                            <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0b5ea2]/10 text-[#0b5ea2]">
                              <BookText size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#0b5ea2]">{claim.title}</p>
                              <p className="font-mono text-[11px] text-[#0b5ea2]/65">{claim.accessionNumber ?? claim.barcode}</p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-[#0b5ea2]/10 bg-zinc-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0b5ea2]/55">Book verification</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {bookInfo ? (
                  <BookCoverThumbnail
                    title={bookInfo.title}
                    coverImagePath={bookInfo.coverUrl}
                    className="h-36 w-24 shrink-0 rounded-xl border border-[#0b5ea2]/15 shadow-md"
                  />
                ) : (
                  <div className="flex h-36 w-24 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#0b5ea2]/25 bg-[#0b5ea2]/5 text-[#0b5ea2]">
                    <BookText size={28} />
                    <p className="mt-2 px-2 text-center text-[10px] font-semibold text-[#0b5ea2]/60">Scan book accession QR</p>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {bookInfo ? (
                    <>
                      <h3 className="font-display text-xl font-black leading-tight text-[#0b5ea2]">{bookInfo.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-[#0b5ea2]/75">{bookInfo.authors || 'Author not recorded'}</p>
                      <dl className="mt-3 grid gap-1.5 text-xs text-[#0b5ea2]/70">
                        <div><dt className="inline font-bold text-[#0b5ea2]">Accession </dt><dd className="inline font-mono">{bookInfo.accessionNumber || '—'}</dd></div>
                        <div><dt className="inline font-bold text-[#0b5ea2]">Barcode </dt><dd className="inline font-mono">{bookInfo.barcode || barcode || '—'}</dd></div>
                        <div className="inline-flex items-center gap-1"><MapPin size={12} /><span>{bookInfo.shelfLocation || 'Shelf not recorded'}</span></div>
                        {bookInfo.conditionStatus ? <div><dt className="inline font-bold text-[#0b5ea2]">Condition </dt><dd className="inline">{bookInfo.conditionStatus}</dd></div> : null}
                      </dl>
                    </>
                  ) : (
                    <h3 className="font-semibold italic text-[#0b5ea2]/50">Waiting for book scan…</h3>
                  )}
                </div>
              </div>
              {showManualEntry ? (
                <input
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="Type accession or barcode only if the scanner failed"
                  className="h-11 w-full rounded-xl border border-[#0b5ea2]/20 bg-white px-3 font-mono text-sm font-bold text-[#0b5ea2] outline-none focus:ring-2 focus:ring-[#0b5ea2]/10"
                />
              ) : (
                <p className="text-xs font-semibold text-[#0b5ea2]/60">{barcode ? `Book code locked from scan: ${barcode}` : 'Waiting for book barcode scan…'}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#0b5ea2]/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Loan mode">
              <button type="button" onClick={() => setLoanMode('TakeHome')} className={`min-h-11 rounded-xl px-4 text-sm font-bold ${loanMode === 'TakeHome' ? 'bg-[#0b5ea2] text-white' : 'border border-[#0b5ea2]/15 bg-white text-[#0b5ea2]'}`}>Take home</button>
              <button type="button" onClick={() => setLoanMode('InsideLibrary')} className={`min-h-11 rounded-xl px-4 text-sm font-bold ${loanMode === 'InsideLibrary' ? 'bg-[#0b5ea2] text-white' : 'border border-[#0b5ea2]/15 bg-white text-[#0b5ea2]'}`}>Use inside the library</button>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={clearTerminal} className="min-h-11 rounded-xl px-5 font-bold text-[#0b5ea2] hover:bg-zinc-100">Clear</button>
              <button
                type="submit"
                disabled={submitting || checkoutBlocked || !schoolId.trim() || !barcode.trim()}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[#0b5ea2] px-8 text-lg font-bold text-white shadow-md hover:bg-[#004488] disabled:opacity-50"
              >
                {submitting ? 'Confirming…' : <><ScanBarcode size={20} />{verifyReadyHold ? 'Verify & Checkout' : 'Confirm Checkout'}</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Pending claim" value={data?.summary.pendingClaims ?? 0} icon={ScanBarcode} tone="orange" />
      <StatCard label="Active claims" value={data?.summary.activeLoans ?? 0} icon={BookOpen} tone="blue" />
      <StatCard label="Due today" value={data?.summary.dueToday ?? 0} icon={CalendarClock} tone="orange" />
      <StatCard label="Overdue" value={data?.summary.overdueLoans ?? 0} icon={AlertTriangle} tone="red" />
      <StatCard label="Returned today" value={data?.summary.returnedToday ?? 0} icon={CheckCircle2} tone="blue" />
    </div>

    {loading && !data ? (
      <SectionCard className="p-10 text-center font-semibold text-[#0b5ea2]">Loading circulation monitor…</SectionCard>
    ) : (
      <>
      <TableShell
        title="Circulation monitor"
        subtitle="Search or scan — do not scroll the full queue looking for a borrower."
        mobileRows={monitorMobileRows}
        controls={(
          <div className="flex w-full flex-col gap-3 sm:max-w-sm lg:max-w-md">
            <label className="relative block w-full">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0b5ea2]/45" />
              <span className="sr-only">Search monitor by school ID, name, title, or barcode</span>
              <input
                value={deskSearch}
                onChange={(event) => setDeskSearch(event.target.value)}
                placeholder="Search school ID, name, title, barcode…"
                className="h-10 w-full rounded-xl border border-[#0b5ea2]/20 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-[#0b5ea2] outline-none focus:ring-2 focus:ring-[#0b5ea2]/10"
              />
            </label>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Monitor lanes">
              {([
                ['pending', `Pending claim (${lanes.pending.length})`],
                ['active', `Active loans (${lanes.active.length})`],
                ['overdue', `Overdue (${lanes.overdue.length})`],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={monitorTab === tab}
                  onClick={() => setMonitorTab(tab)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition ${monitorTab === tab ? 'bg-[#0b5ea2] text-white' : 'border border-[#0b5ea2]/15 bg-white text-[#0b5ea2] hover:bg-zinc-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-[#0b5ea2]/65">
              Showing {filteredLaneItems.length} {tabLabel.toLowerCase()} record{filteredLaneItems.length === 1 ? '' : 's'}
              {deskSearch.trim() ? ' matching search' : ''}
              {data?.pagination ? ` · Page ${data.pagination.page} of ${Math.max(data.pagination.totalPages, 1)}` : ''}
            </p>
          </div>
        )}
      >
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#0b5ea2] text-[#FFFFFF]">
              <tr>
                <th className="px-4 py-3">Borrower</th>
                <th className="px-4 py-3">Book / copy</th>
                <th className="px-4 py-3">Requested / borrowed</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLaneItems.length ? filteredLaneItems.map((item) => (
                <tr
                  key={item.transactionId}
                  className={`border-b border-[#0b5ea2]/10 ${selectedClaimId === item.transactionId ? 'bg-[#FFF200]/25' : ''}`}
                >
                  <td className="px-4 py-4">
                    <p className="font-bold text-[#0b5ea2]">{item.userName}</p>
                    <p className="text-xs text-[#0b5ea2]/60">{item.schoolId} · {item.role}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-[#0b5ea2]">{item.title}</p>
                    <p className="font-mono text-xs text-[#0b5ea2]/60">{item.accessionNumber ?? item.barcode}</p>
                  </td>
                  <td className="px-4 py-4 text-xs text-[#0b5ea2]">{formatDate(item.borrowDate ?? item.requestedAt)}</td>
                  <td className="px-4 py-4 text-xs font-semibold text-[#0b5ea2]">{formatDate(item.dueDate)}</td>
                  <td className="px-4 py-4">{renderItemStatus(item)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">{renderItemActions(item)}</div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-10 text-center font-semibold text-[#0b5ea2]">{monitorEmpty}</td></tr>
              )}
            </tbody>
          </table>
      </TableShell>

        {data && data.pagination.totalPages > 1 ? (
          <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Monitor pages">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-[#0b5ea2]/15 p-2 text-[#0b5ea2] disabled:opacity-40" aria-label="Previous page">
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-bold text-[#0b5ea2]">Page {data.pagination.page} of {data.pagination.totalPages}</span>
            <button type="button" disabled={page >= data.pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-[#0b5ea2]/15 p-2 text-[#0b5ea2] disabled:opacity-40" aria-label="Next page">
              <ChevronRight size={18} />
            </button>
          </nav>
        ) : null}
      </>
    )}

    {statusMessage && !showConfirmCheckout ? (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm dark:bg-black/60">
        <div
          role={statusTone === 'error' ? 'alertdialog' : 'dialog'}
          aria-modal="true"
          aria-labelledby="circulation-status-title"
          className="w-full max-w-md rounded-3xl border border-[#0b5ea2]/15 bg-white p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <p id="circulation-status-title" className="font-display text-lg font-bold text-[#0b5ea2]">
              {statusTone === 'error' ? 'Action needed' : 'Success'}
            </p>
            <button type="button" aria-label="Dismiss message" onClick={clearFeedback} className="rounded-xl p-2 text-[#0b5ea2]/60 hover:bg-[#0b5ea2]/5">
              <X size={18} />
            </button>
          </div>
          {feedbackStudent ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#0b5ea2]/15 bg-zinc-50 p-3">
              {feedbackStudent.avatarUrl ? (
                <img src={feedbackStudent.avatarUrl} alt={`${feedbackStudent.name} profile photo`} className="h-16 w-16 shrink-0 rounded-xl border border-[#0b5ea2]/20 object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#0b5ea2]/10 text-[#0b5ea2]">
                  <UserCircle size={32} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0b5ea2]/55">Scanned student</p>
                <p className="truncate font-display text-lg font-black text-[#0b5ea2]">{feedbackStudent.name}</p>
                <p className="font-mono text-sm font-bold text-[#0b5ea2]/80">{feedbackStudent.schoolId}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-[#0b5ea2]/60">
                  {feedbackStudent.role}{feedbackStudent.program ? ` · ${feedbackStudent.program}` : ''}
                </p>
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex items-start gap-3">
            <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${statusTone === 'error' ? 'bg-[#FFF200] text-[#0b5ea2]' : 'bg-emerald-100 text-emerald-700'}`}>
              {statusTone === 'error' ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
            </span>
            <p className="text-sm font-semibold leading-6 text-[#0b5ea2]/80">{statusMessage}</p>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={clearFeedback} className="h-10 rounded-xl bg-[#0b5ea2] px-5 text-sm font-bold text-white hover:bg-[#004488]">
              OK
            </button>
          </div>
        </div>
      </div>
    ) : null}

    {showConfirmCheckout ? (
      <ConfirmModal
        title="Confirm Checkout"
        description={`Check out ${bookInfo?.title || barcode} (${bookInfo?.barcode || barcode}) to ${studentInfo?.name || schoolId}?`}
        confirmText={submitting ? 'Confirming…' : 'Yes, Check Out'}
        cancelText="Cancel"
        onCancel={() => { if (!submitting) setShowConfirmCheckout(false) }}
        onConfirm={() => void checkout()}
      />
    ) : null}

    {showScanner ? (
      <CirculationScannerModal mode="checkout" onClose={() => setShowScanner(false)} onScan={(value) => void handleScan(value)} />
    ) : null}

    {returnTarget ? (
      <CirculationScannerModal
        mode="return"
        expectedBook={{
          title: returnBookPreview?.title || returnTarget.title,
          barcode: returnBookPreview?.barcode || returnTarget.barcode,
          accessionNumber: returnBookPreview?.accessionNumber || returnTarget.accessionNumber,
          coverUrl: returnBookPreview?.coverUrl ?? null,
        }}
        onClose={() => { setReturnTarget(null); setReturnBookPreview(null) }}
        onScan={(value) => void handleReturnScan(value)}
      />
    ) : null}

    {cancelTarget ? (
      <CancelBorrowRequestDialog
        title={cancelTarget.title}
        busy={busyId === cancelTarget.transactionId}
        error={cancelError}
        onCancel={() => { if (busyId === null) setCancelTarget(null) }}
        onConfirm={(reason) => void cancelPending(reason)}
      />
    ) : null}

    {lostTarget ? (
      <ReportLostDialog
        title={lostTarget.title}
        busy={busyId === lostTarget.transactionId}
        error={lostError}
        onCancel={() => { if (busyId === null) setLostTarget(null) }}
        onConfirm={() => void reportLost()}
      />
    ) : null}
  </>
}
