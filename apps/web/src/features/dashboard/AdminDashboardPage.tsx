import { BadgeCheck, CalendarClock, ClipboardCheck, Download, Printer, QrCode, RefreshCw, RotateCcw, UserRoundX, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, MobileList, MobileListItem, PageHeader, SectionCard, StatCard, TableShell } from '../../components/ui'
import { getAccessToken } from '../auth/auth-storage'
import { dashboardApi } from './dashboard-api'
import type { AdminDashboardData, LibraryProfile } from './types'

type AccountSummary = { activeUsers: number; cleared: number; notCleared: number; unknown: number; generatedAt: string }

const peso = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
const count = (value: number) => new Intl.NumberFormat('en-PH').format(value)
const first = (name: string) => name.trim().split(/\s+/)[0] || 'Librarian'
const manilaWeekday: Record<string, number> = { Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

const deskActions = [
  { to: '/librarian/circulation', label: 'Borrow & return', icon: CalendarClock, primary: true },
  { to: '/librarian/clearance', label: 'Clearance', icon: ClipboardCheck, primary: false },
  { to: '/librarian/printing', label: 'Printing queue', icon: Printer, primary: false },
  { to: '/librarian/attendance', label: 'Attendance', icon: QrCode, primary: false },
] as const

type AttentionRow = { key: string; label: string; value: string; href: string; destination: string; count: number }

function attentionRows(data: AdminDashboardData): AttentionRow[] {
  const q = data.queues
  const rows: AttentionRow[] = [
    { key: 'overdue', label: 'Overdue loans', value: count(data.kpis.overdueBooks), href: '/librarian/circulation?lane=overdue', destination: 'Borrow & return', count: data.kpis.overdueBooks },
    { key: 'lost', label: 'Lost-book reports awaiting review', value: count(q.pendingLostReports), href: '/librarian/clearance', destination: 'Clearance', count: q.pendingLostReports },
    { key: 'quotation', label: 'Confirmed losses awaiting quotation', value: count(q.awaitingQuotation), href: '/librarian/clearance', destination: 'Clearance', count: q.awaitingQuotation },
    { key: 'pickup', label: 'Reservations ready for pickup', value: count(q.reservationsReady), href: '/librarian/reservations?status=ready_for_pickup', destination: 'Reservations', count: q.reservationsReady },
    { key: 'print-pending', label: 'Print jobs pending', value: count(q.pendingPrintJobs), href: '/librarian/printing?status=Pending', destination: 'Printing queue', count: q.pendingPrintJobs },
    { key: 'print-ready', label: 'Print jobs ready for pickup', value: count(q.readyPrintJobs), href: `/librarian/printing?status=${encodeURIComponent('Ready for Pickup')}`, destination: 'Printing queue', count: q.readyPrintJobs },
    { key: 'fines', label: 'Outstanding fines', value: peso(data.kpis.outstandingFines), href: '/librarian/fines?status=Unpaid', destination: 'Fines', count: data.kpis.outstandingFines },
    { key: 'supplies', label: 'Low ink or paper', value: count(q.lowSupplies), href: '/librarian/supplies', destination: 'Print supplies', count: q.lowSupplies },
  ]
  return rows.filter((row) => row.count > 0)
}

function todayHours(profile: LibraryProfile) {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }).format(now)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now)
  const hours = profile.schedule.find((row) => row.day === manilaWeekday[weekday])
  const closedForException = profile.nextClosure?.date === today
  const label = closedForException || !hours?.isOpen
    ? 'Closed today'
    : hours.opensAt && hours.closesAt
      ? `${hours.opensAt} – ${hours.closesAt}`
      : 'Hours not set'
  return { label, closure: profile.nextClosure }
}

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [accounts, setAccounts] = useState<AccountSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const ops = await dashboardApi.admin()
      setData(ops)
      try {
        const response = await fetch('/api/v1/admin/account-dashboard', {
          headers: { Authorization: `Bearer ${getAccessToken() ?? ''}`, Accept: 'application/json' },
        })
        const payload = await response.json() as { data?: AccountSummary }
        if (response.ok && payload.data) setAccounts(payload.data)
      } catch { /* Ops dashboard remains usable if account cards fail. */ }
    } catch (value) { setError(value instanceof Error ? value.message : 'The dashboard could not be loaded.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const exportPdf = async () => {
    setExporting(true)
    setError('')
    try { await dashboardApi.downloadAdminSummary() }
    catch (value) { setError(value instanceof Error ? value.message : 'The PDF could not be generated.') }
    finally { setExporting(false) }
  }
  if (!data && loading) return <DashboardLoading />
  if (!data) return <DashboardError message={error} retry={load} />
  const rows = attentionRows(data)
  const hours = todayHours(data.profile)
  const max = Math.max(1, ...data.weeklyAttendance.map((item) => item.value))
  const categoryMax = Math.max(1, ...data.popularCategories.map((item) => item.value))
  return <>
    <PageHeader
      eyebrow="Library operations"
      title={`Good day, ${first(data.staff.name)}`}
      action={<div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={loading} onClick={() => void load()}><RefreshCw size={15} />{loading ? 'Refreshing…' : 'Refresh'}</Button>
        <Button variant="secondary" disabled={exporting} onClick={() => void exportPdf()}><Download size={15} />{exporting ? 'Preparing…' : 'Export summary'}</Button>
      </div>}
    />
    {error ? <div role="alert" className="mb-5 rounded-2xl bg-[#FFF200] px-4 py-3 text-sm font-semibold text-[#0b5ea2]">{error}</div> : null}

    <section aria-labelledby="account-overview" className="mb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="account-overview" className="font-display text-lg font-bold text-[#0b5ea2]">Account overview</h2>
        <Link to="/librarian/approvals" className="text-sm font-bold text-[#0b5ea2] underline">Open approvals</Link>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Link to="/librarian/users?status=Active"><StatCard label="Active users" value={accounts?.activeUsers ?? '—'} icon={Users} /></Link>
        <Link to="/librarian/clearance?status=Cleared&active=1"><StatCard label="Cleared active students" value={accounts?.cleared ?? '—'} icon={BadgeCheck} /></Link>
        <Link to="/librarian/clearance?status=Not%20Cleared&active=1"><StatCard label="Not-cleared active students" value={accounts?.notCleared ?? '—'} icon={UserRoundX} /></Link>
      </div>
      {accounts ? <p className="mt-2 text-xs text-[#0b5ea2]/60">{accounts.unknown} active students have an unknown clearance state. Updated {new Date(accounts.generatedAt).toLocaleString('en-PH')}.</p> : null}
    </section>

    <section aria-labelledby="needs-attention" className="mb-5">
      <h2 id="needs-attention" className="font-display text-lg font-bold text-[#0b5ea2]">Needs attention</h2>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row) => (
          <Link key={row.key} to={row.href} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-[#FFF200]/55 px-4 py-3 text-[#0b5ea2] outline-none ring-[#0b5ea2] transition hover:bg-[#FFF200] focus-visible:ring-2">
            <span className="min-w-0">
              <span className="block font-semibold">{row.label}</span>
              <span className="mt-0.5 block text-xs font-bold">Needs review · {row.destination}</span>
            </span>
            <span className="shrink-0 font-display text-xl font-bold">{row.value}</span>
          </Link>
        )) : <p className="rounded-xl bg-[#0b5ea2]/5 px-4 py-4 text-sm font-semibold text-[#0b5ea2]">Nothing is waiting.</p>}
      </div>
    </section>

    <section aria-labelledby="desk-actions" className="mb-5">
      <h2 id="desk-actions" className="font-display text-lg font-bold text-[#0b5ea2]">Desk actions</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {deskActions.map(({ to, label, icon: Icon, primary }) => (
          <Link key={to} to={to} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold outline-none ring-[#0b5ea2] transition focus-visible:ring-2 ${primary ? 'bg-[#0b5ea2] text-white hover:bg-[#003399]' : 'border border-[#0b5ea2]/15 bg-white text-[#0b5ea2] hover:bg-[#0b5ea2]/5'}`}>
            <Icon size={16} aria-hidden="true" />{label}
          </Link>
        ))}
      </div>
    </section>

    <section aria-labelledby="today" className="mb-8">
      <h2 id="today" className="font-display text-lg font-bold text-[#0b5ea2]">Today</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Inside now" value={`${count(data.occupancy.current)} of ${count(data.occupancy.capacity)}`} />
        <Fact label="Out on loan" value={count(data.kpis.activeBorrowed)} />
        <Fact label="Returned today" value={count(data.kpis.returnedToday)} />
        <Fact label="Today's hours" value={hours.label} note={hours.closure ? `Next closure ${hours.closure.date} · ${hours.closure.reason}` : undefined} />
      </div>
    </section>

    <section aria-labelledby="library-report">
      <h2 id="library-report" className="font-display text-lg font-bold text-[#0b5ea2]">Library report</h2>
      <div className="mt-3 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <SectionCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/55">Visitor analytics</p>
          <h3 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Weekly attendance</h3>
          <div className="mt-8 flex h-52 items-end gap-3 sm:gap-5">
            {data.weeklyAttendance.map((item) => (
              <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="relative flex flex-1 items-end rounded-t-lg bg-[#0b5ea2]/5">
                  <div style={{ height: `${Math.max(item.value ? 8 : 0, item.value / max * 100)}%` }} className="relative w-full rounded-t-lg bg-[#0b5ea2]">
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0b5ea2]">{item.value}</span>
                  </div>
                </div>
                <span className="text-center text-xs font-semibold text-[#0b5ea2]/55">{item.label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/55">Collection demand</p>
          <h3 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Popular categories</h3>
          <div className="mt-6 space-y-5">
            {data.popularCategories.length ? data.popularCategories.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between gap-3 text-xs">
                  <span className="font-semibold text-[#0b5ea2]">{item.label}</span>
                  <span className="text-[#0b5ea2]/55">{item.value} borrows</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#0b5ea2]/5">
                  <div style={{ width: `${item.value / categoryMax * 100}%` }} className="h-full rounded-full bg-[#0b5ea2]" />
                </div>
              </div>
            )) : <Empty text="No borrowing activity in the last 30 days." />}
          </div>
        </SectionCard>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <TableShell
          title="Recent circulation"
          mobileRows={(
            <MobileList empty={!data.recentCirculation.length ? <Empty text="No circulation activity yet." /> : null}>
              {data.recentCirculation.map((item) => (
                <MobileListItem
                  key={item.id}
                  title={<Link to="/librarian/circulation" className="underline-offset-2 hover:underline">{item.title}</Link>}
                  meta={`${item.userName} · ${item.schoolId} · ${item.barcode}`}
                  status={<span className="text-xs font-bold text-[#0b5ea2] dark:text-white">{item.status}</span>}
                  detail={<span className="text-xs">{item.eventAt}</span>}
                />
              ))}
            </MobileList>
          )}
        >
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[#0b5ea2]/5 text-xs uppercase tracking-wider text-[#0b5ea2]/65">
              <tr><th className="px-5 py-3">User and resource</th><th className="px-5 py-3">Activity date</th><th className="px-5 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-[#0b5ea2]/10">
              {data.recentCirculation.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4">
                    <Link to="/librarian/circulation" className="font-semibold text-[#0b5ea2] underline-offset-2 hover:underline">{item.title}</Link>
                    <p className="mt-1 text-xs text-[#0b5ea2]/65">{item.userName} · {item.schoolId} · {item.barcode}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-[#0b5ea2]/65">{item.eventAt}</td>
                  <td className="px-5 py-4 text-xs font-bold text-[#0b5ea2]">{item.status}</td>
                </tr>
              ))}
              {!data.recentCirculation.length ? <tr><td colSpan={3}><Empty text="No circulation activity yet." /></td></tr> : null}
            </tbody>
          </table>
        </TableShell>
        <SectionCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/55">Live conditions</p>
          <h3 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Library occupancy</h3>
          <div className="mt-6 flex items-end gap-2">
            <span className="font-display text-5xl font-bold text-[#0b5ea2]">{data.occupancy.current}</span>
            <span className="mb-1 text-sm text-[#0b5ea2]/55">of {data.occupancy.capacity} seats</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#0b5ea2]/5">
            <div style={{ width: `${Math.min(100, Math.round(data.occupancy.current / data.occupancy.capacity * 100))}%` }} className="h-full rounded-full bg-[#0b5ea2]" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Fact label="Peak hour" value={data.occupancy.peakHour ?? '—'} />
            <Fact label="Avg. visit" value={data.occupancy.averageMinutes ? `${data.occupancy.averageMinutes} min` : '—'} />
          </div>
        </SectionCard>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/55">Attendance purpose today</p>
          <h3 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Why visitors came in</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.purposeBreakdown.map((item) => <Fact key={item.label} label={item.label} value={String(item.value)} />)}
            {!data.purposeBreakdown.length ? <Empty text="No attendance recorded today." /> : null}
          </div>
        </SectionCard>
        <SectionCard className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/55">Operational feed</p>
          <h3 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Recent activity</h3>
          <div className="mt-3 divide-y divide-[#0b5ea2]/10">
            {data.recentActivity.map((item) => (
              <div key={item.id} className="py-3">
                <p className="text-sm font-semibold text-[#0b5ea2]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[#0b5ea2]/65">{item.message}</p>
                <p className="mt-1 text-xs text-[#0b5ea2]/45">{item.createdAt}</p>
              </div>
            ))}
            {!data.recentActivity.length ? <Empty text="No recent operational events." /> : null}
          </div>
        </SectionCard>
      </div>
    </section>
    <p className="mt-4 text-right text-xs text-[#0b5ea2]/45">Last updated {new Date(data.generatedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
  </>
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-[#0b5ea2]/5 p-3">
      <p className="text-xs font-bold text-[#0b5ea2]/55">{label}</p>
      <p className="mt-1 font-bold text-[#0b5ea2]">{value}</p>
      {note ? <p className="mt-1 text-xs text-[#0b5ea2]/65">{note}</p> : null}
    </div>
  )
}

function DashboardLoading() {
  return (
    <div className="space-y-4" aria-label="Loading dashboard">
      <div className="h-10 w-72 animate-pulse rounded-xl bg-[#0b5ea2]/10" />
      <div className="h-24 animate-pulse rounded-2xl bg-[#0b5ea2]/5" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-11 animate-pulse rounded-xl bg-[#0b5ea2]/5" />)}</div>
    </div>
  )
}

function DashboardError({ message, retry }: { message: string; retry: () => Promise<void> }) {
  return (
    <SectionCard className="p-8 text-center">
      <p className="font-display text-xl font-bold text-[#0b5ea2]">Dashboard unavailable</p>
      <p className="mt-2 text-sm text-[#0b5ea2]/65">{message}</p>
      <Button className="mt-5" onClick={() => void retry()}><RotateCcw size={16} />Try again</Button>
    </SectionCard>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-[#0b5ea2]/55">{text}</p>
}
