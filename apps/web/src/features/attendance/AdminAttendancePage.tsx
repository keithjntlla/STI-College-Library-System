import { Activity, Camera, ChevronDown, Clock3, Download, RefreshCw, Search, Settings2, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertMessage, Button, PageHeader, SectionCard, StatCard, StatusPill } from '../../components/ui'
import { AttendanceScannerModal } from './AttendanceScannerModal'
import { attendanceApi, type AcademicTerm, type AttendanceAnalytics, type AttendanceFilters, type AttendanceRow, type AttendanceSummary, type Capacity, type Pagination } from './attendance-api'

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const initial: AttendanceFilters = { period: 'daily', date: today, weekStart: today, year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)), academicTermId: '', q: '', role: '', purpose: '', presence: '', page: 1, limit: 25 }
const field = 'h-10 rounded-xl border border-[#0b5ea2]/20 bg-white px-3 text-sm text-[#0b5ea2] outline-none focus:border-[#0b5ea2]'
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function presenceBadge(presence: string) {
  if (presence === 'Inside') return 'bg-[#FFF200]/55 text-[#0b5ea2] ring-[#0b5ea2]/15'
  if (presence === 'Closed at library hours') return 'bg-[#0b5ea2]/10 text-[#0b5ea2] ring-[#0b5ea2]/20'
  return 'bg-white text-[#0b5ea2] ring-[#0b5ea2]/20'
}

function heatmapTone(visits: number, max: number) {
  if (!visits) return 'bg-[#0b5ea2]/5 text-transparent'
  const ratio = visits / Math.max(max, 1)
  if (ratio >= 0.7) return 'bg-[#0b5ea2] text-white'
  if (ratio >= 0.35) return 'bg-[#0b5ea2]/55 text-white'
  return 'bg-[#0b5ea2]/20 text-[#0b5ea2]'
}

export function AdminAttendancePage() {
  const [f, setF] = useState(initial)
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null)
  const [capacity, setCapacity] = useState<Capacity | null>(null)
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [capacityOpen, setCapacityOpen] = useState(false)
  const [capacityInput, setCapacityInput] = useState('80')
  const [capacityReason, setCapacityReason] = useState('')
  const [savingCapacity, setSavingCapacity] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(initial.period !== 'daily')
  const key = useMemo(() => JSON.stringify(f), [f])
  const insideNow = useMemo(() => rows.filter((row) => row.presence === 'Inside').slice(0, 8), [rows])
  const topPurposes = useMemo(() => (summary?.purpose_breakdown ?? []).slice(0, 3), [summary])
  const hourlyBars = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const hour = index + 7
    const visits = analytics?.hourly.find((item) => item.hour === hour)?.visits ?? 0
    return { hour, visits }
  }), [analytics])
  const maxHourVisits = Math.max(1, ...hourlyBars.map((item) => item.visits))
  const peakHour = useMemo(() => {
    const ranked = [...hourlyBars].sort((a, b) => b.visits - a.visits || a.hour - b.hour)
    return ranked[0]?.visits ? ranked[0] : null
  }, [hourlyBars])
  const heatmapMax = useMemo(() => {
    const values = weekdays.map((_, weekday) => (
      [7, 9, 11, 13, 15, 17, 19].map((hour) => (
        analytics?.heatmap.filter((item) => item.weekday === weekday && item.hour >= hour && item.hour < hour + 2).reduce((total, item) => total + item.visits, 0) ?? 0
      ))
    )).flat()
    return Math.max(1, ...values)
  }, [analytics])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [s, l, a, c] = await Promise.all([
        attendanceApi.summary(f),
        attendanceApi.logs(f),
        attendanceApi.analytics(f),
        attendanceApi.capacity(),
      ])
      setSummary(s)
      setRows(l.rows)
      setPagination(l.pagination)
      setAnalytics(a)
      setCapacity(c)
      setCapacityInput(String(c.capacity))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load attendance.')
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => { void attendanceApi.terms().then(setTerms).catch(() => setTerms([])) }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => void attendanceApi.capacity().then(setCapacity).catch(() => undefined), 10000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    setInsightsOpen(f.period !== 'daily')
  }, [f.period])

  const update = (patch: Partial<AttendanceFilters>) => setF((value) => ({ ...value, ...patch, page: patch.page ?? 1 }))
  const exportPdf = async () => {
    setExporting(true)
    setError('')
    try { await attendanceApi.downloadPdf(f) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to export report.') }
    finally { setExporting(false) }
  }
  const saveCapacity = async () => {
    setSavingCapacity(true)
    setError('')
    try {
      const result = await attendanceApi.updateCapacity(Number(capacityInput), capacityReason)
      setCapacity(result)
      setCapacityOpen(false)
      setCapacityReason('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update capacity.')
    } finally {
      setSavingCapacity(false)
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Facility monitoring"
        title="Attendance monitoring"
        action={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setCapacityOpen((value) => !value)}><Settings2 size={15} />Capacity</Button>
            <Button variant="secondary" onClick={() => void load()}><RefreshCw size={15} />Refresh</Button>
            <Button variant="secondary" onClick={() => void exportPdf()} disabled={exporting}><Download size={15} />{exporting ? 'Generating…' : 'Export'}</Button>
          </div>
        )}
      />

      <SectionCard className="mb-5 overflow-hidden">
        <div className="grid gap-4 bg-gradient-to-br from-[#0b5ea2] to-[#084a82] p-5 text-white md:grid-cols-[1.2fr_auto] md:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">Scan first</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Door attendance</h2>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Scan a pass to check visitors out automatically when they are already inside, or tap a purpose chip to check them in.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">Inside now</p>
              <p className="font-display text-3xl font-bold">{capacity?.current ?? 0}<span className="text-lg font-semibold text-white/70">/{capacity?.capacity ?? 80}</span></p>
            </div>
            <Button className="bg-[#FFF200] !text-[#0b5ea2] font-bold hover:bg-[#ffe600] hover:!text-[#0b5ea2]" onClick={() => setScannerOpen(true)}>
              <Camera size={16} />Open scanner
            </Button>
          </div>
        </div>
        {f.period === 'daily' && f.date === today && insideNow.length > 0 ? (
          <div className="border-t border-[#0b5ea2]/10 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[#0b5ea2]/55">Currently inside</p>
              <button type="button" className="text-xs font-bold text-[#0b5ea2]" onClick={() => update({ presence: 'inside', page: 1 })}>Show open visits</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {insideNow.map((row) => (
                <StatusPill key={row.id} tone="warning" icon={false}>{row.visitor_name} · {row.time_in}</StatusPill>
              ))}
            </div>
          </div>
        ) : null}
      </SectionCard>

      {error ? <AlertMessage type="error" variant="compact" description={error} /> : null}
      {capacityOpen ? (
        <SectionCard className="mb-5 p-5">
          <h2 className="font-display font-bold">Update maximum occupancy</h2>
          <p className="mt-1 text-xs text-[#0b5ea2]/65">Changes take effect immediately. If the limit is below current occupancy, new entries are blocked until enough visitors leave.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]">
            <label className="text-xs font-bold">Maximum occupants<input className={`${field} mt-1 w-full`} type="number" min="1" max="5000" value={capacityInput} onChange={(event) => setCapacityInput(event.target.value)} /></label>
            <label className="text-xs font-bold">Reason<input className={`${field} mt-1 w-full`} value={capacityReason} onChange={(event) => setCapacityReason(event.target.value)} placeholder="Example: Updated fire-safety limit" /></label>
            <Button className="self-end" onClick={() => void saveCapacity()} disabled={savingCapacity}>{savingCapacity ? 'Saving…' : 'Save capacity'}</Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <select className={field} value={f.period} onChange={(event) => update({ period: event.target.value as AttendanceFilters['period'] })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="semester">Per semester</option>
          </select>
          {f.period === 'daily' ? <input aria-label="Attendance date" className={field} type="date" value={f.date} onChange={(event) => update({ date: event.target.value })} /> : null}
          {f.period === 'weekly' ? <input aria-label="Week start" className={field} type="date" value={f.weekStart} onChange={(event) => update({ weekStart: event.target.value })} /> : null}
          {f.period === 'monthly' ? (
            <>
              <select className={field} value={f.month} onChange={(event) => update({ month: Number(event.target.value) })}>
                {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2026, index).toLocaleString('en', { month: 'long' })}</option>)}
              </select>
              <input className={field} type="number" min="2000" max="2100" value={f.year} onChange={(event) => update({ year: Number(event.target.value) })} />
            </>
          ) : null}
          {f.period === 'semester' ? (
            <select className={field} value={f.academicTermId} onChange={(event) => update({ academicTermId: event.target.value })}>
              <option value="">Select academic term</option>
              {terms.map((term) => <option key={term.academic_term_id} value={term.academic_term_id}>{term.term_name} · {term.academic_year}</option>)}
            </select>
          ) : null}
          <select className={field} value={f.role} onChange={(event) => update({ role: event.target.value })}>
            <option value="">All roles</option>
            {['Student', 'Faculty', 'Librarian', 'Admin'].map((role) => <option key={role}>{role}</option>)}
          </select>
          <select className={field} value={f.purpose} onChange={(event) => update({ purpose: event.target.value })}>
            <option value="">All purposes</option>
            {['Library Visit', 'Study', 'Research', 'Book Borrowing', 'Printing', 'Photocopy'].map((purpose) => <option key={purpose}>{purpose}</option>)}
          </select>
          <select className={field} value={f.presence} onChange={(event) => update({ presence: event.target.value })}>
            <option value="">All presence</option>
            <option value="inside">Inside</option>
            <option value="exited">Exited</option>
          </select>
        </div>
      </SectionCard>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visits" value={String(summary?.total_visits ?? 0)} icon={Users} />
        <StatCard label="Currently inside" value={String(capacity?.current ?? 0)} icon={Activity} />
        <StatCard label="Maximum capacity" value={String(capacity?.capacity ?? 80)} note={`${capacity?.available ?? 0} spaces available`} icon={Users} />
        <StatCard label="Peak hour" value={summary?.peak_hour ?? '—'} icon={Clock3} />
      </div>

      {topPurposes.length > 0 ? (
        <SectionCard className="mb-5 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#0b5ea2]/55">Top purposes</p>
          <div className="flex flex-wrap gap-2">
            {topPurposes.map((item) => (
              <StatusPill key={item.label} tone="info" icon={false}>{item.label} · {item.count}</StatusPill>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {capacity?.overCapacity ? (
        <AlertMessage
          type="warning"
          title="Library over capacity"
          description={`New check-ins are blocked until occupancy falls below ${capacity.capacity}.`}
        />
      ) : null}

      <SectionCard className="mb-5">
        <div className="flex flex-col gap-3 border-b border-[#0b5ea2]/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Attendance logs</h2>
            <p className="text-xs text-[#0b5ea2]/65">{summary?.range.label ?? 'Selected period'} · {pagination.total} records</p>
          </div>
          <label className={`${field} flex w-full items-center gap-2 sm:max-w-xs`}>
            <Search size={15} />
            <input
              className="w-full outline-none"
              placeholder="Search name, ID, or email"
              value={f.q}
              onChange={(event) => update({ q: event.target.value })}
              aria-label="Search attendance logs"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#0b5ea2] text-white">
              <tr>{['Visitor', 'Role', 'Date', 'Time in', 'Time out', 'Purpose', 'Presence'].map((header) => <th key={header} className="px-5 py-3 text-xs">{header}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center">Loading attendance…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center font-semibold">No attendance records match these filters.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-b border-[#0b5ea2]/10">
                  <td className="px-5 py-4"><b>{row.visitor_name}</b><p className="text-xs text-[#0b5ea2]/65">{row.school_id}</p></td>
                  <td className="px-5 py-4">{row.role}</td>
                  <td className="px-5 py-4">{row.attendance_date}</td>
                  <td className="px-5 py-4">{row.time_in}</td>
                  <td className="px-5 py-4">{row.time_out ?? '—'}</td>
                  <td className="px-5 py-4">{row.purpose}</td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ring-1 ring-inset ${presenceBadge(row.presence)}`}>{row.presence}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 p-4">
          <Button variant="secondary" disabled={f.page <= 1} onClick={() => update({ page: f.page - 1 })}>Previous</Button>
          <span className="self-center text-xs font-bold">Page {pagination.page} of {Math.max(1, pagination.total_pages)}</span>
          <Button variant="secondary" disabled={f.page >= pagination.total_pages} onClick={() => update({ page: f.page + 1 })}>Next</Button>
        </div>
      </SectionCard>

      <SectionCard className="overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 p-5 text-left"
          onClick={() => setInsightsOpen((value) => !value)}
          aria-expanded={insightsOpen}
        >
          <div>
            <h2 className="font-display font-bold text-[#0b5ea2]">Usage insights</h2>
            <p className="mt-1 text-xs text-[#0b5ea2]/65">
              Hourly visits and weekly pattern for {analytics?.range.label ?? 'the selected period'}
              {peakHour ? ` · Peak ${hourLabel(peakHour.hour)} (${peakHour.visits})` : ''}
            </p>
          </div>
          <ChevronDown size={18} className={`shrink-0 text-[#0b5ea2] transition ${insightsOpen ? 'rotate-180' : ''}`} />
        </button>
        {insightsOpen ? (
          <div className="grid gap-6 border-t border-[#0b5ea2]/10 p-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-[#0b5ea2]/10 bg-[#f8fafc] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#0b5ea2]">Visits by hour</h3>
                  <p className="mt-1 text-xs text-[#0b5ea2]/65">Check-ins from 7 AM to 8 PM</p>
                </div>
                {peakHour ? <StatusPill tone="warning" icon={false}>Peak {hourLabel(peakHour.hour)}</StatusPill> : null}
              </div>
              <div className="mt-5 flex h-56 items-end gap-1.5 sm:gap-2">
                {hourlyBars.map(({ hour, visits }) => {
                  const isPeak = peakHour?.hour === hour && visits > 0
                  const height = visits ? Math.max(12, (visits / maxHourVisits) * 160) : 4
                  return (
                    <div key={hour} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                      <span className={`text-[10px] font-bold tabular-nums ${visits ? 'text-[#0b5ea2]' : 'text-[#0b5ea2]/25'}`}>
                        {visits || ''}
                      </span>
                      <div className="flex h-40 w-full items-end justify-center rounded-t-lg bg-[#0b5ea2]/5 px-0.5">
                        <div
                          title={`${hourLabel(hour)}: ${visits} ${visits === 1 ? 'visit' : 'visits'}`}
                          className={`w-full max-w-7 rounded-t-md transition ${isPeak ? 'bg-[#FFF200] ring-2 ring-[#0b5ea2]/35' : visits ? 'bg-[#0b5ea2]' : 'bg-[#0b5ea2]/15'}`}
                          style={{ height: `${height}px` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-[9px] font-semibold text-[#0b5ea2]/60">{hourLabel(hour)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#0b5ea2]/10 bg-[#f8fafc] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#0b5ea2]">Weekly utilization</h3>
                  <p className="mt-1 text-xs text-[#0b5ea2]/65">Darker cells mean more check-ins</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#0b5ea2]/65">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#0b5ea2]/20" /> Low
                  <span className="ml-1 h-2.5 w-2.5 rounded-sm bg-[#0b5ea2]/55" /> Mid
                  <span className="ml-1 h-2.5 w-2.5 rounded-sm bg-[#0b5ea2]" /> High
                </div>
              </div>
              <div className="mt-5 space-y-1.5">
                <div className="ml-9 grid grid-cols-7 gap-1.5">
                  {[7, 9, 11, 13, 15, 17, 19].map((hour) => (
                    <span key={hour} className="text-center text-[9px] font-semibold text-[#0b5ea2]/55">{hourLabel(hour)}</span>
                  ))}
                </div>
                {weekdays.map((day, weekday) => (
                  <div key={day} className="grid grid-cols-[36px_repeat(7,1fr)] items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#0b5ea2]">{day}</span>
                    {[7, 9, 11, 13, 15, 17, 19].map((hour) => {
                      const visits = analytics?.heatmap
                        .filter((item) => item.weekday === weekday && item.hour >= hour && item.hour < hour + 2)
                        .reduce((total, item) => total + item.visits, 0) ?? 0
                      return (
                        <div
                          key={hour}
                          title={`${day} ${hourLabel(hour)}: ${visits} ${visits === 1 ? 'visit' : 'visits'}`}
                          className={`flex h-8 items-center justify-center rounded-md text-[10px] font-bold tabular-nums ${heatmapTone(visits, heatmapMax)}`}
                        >
                          {visits || ''}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <AttendanceScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onRecorded={() => void load()} />
    </>
  )
}
