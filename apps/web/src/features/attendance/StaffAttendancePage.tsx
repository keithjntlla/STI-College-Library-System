import { Camera, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, MobileList, MobileListItem, PageHeader, SectionCard, TableShell } from '../../components/ui'
import { AttendanceScannerModal } from './AttendanceScannerModal'
import { attendanceApi, type AttendanceRow, type Capacity } from './attendance-api'

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const filters = { period: 'daily' as const, date: today, weekStart: today, year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)), academicTermId: '', q: '', role: '', purpose: '', presence: '', page: 1, limit: 50 }

function presenceBadge(presence: string) {
  if (presence === 'Inside') return 'bg-[#FFF200]'
  if (presence === 'Closed at library hours') return 'bg-[#0b5ea2]/10 border border-[#0b5ea2]/25'
  return 'border border-[#0b5ea2]/20'
}

export function StaffAttendancePage() {
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [capacity, setCapacity] = useState<Capacity | null>(null)
  const [error, setError] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  async function load() {
    try {
      const [logs, live] = await Promise.all([attendanceApi.logs(filters), attendanceApi.capacity()])
      setRows(logs.rows)
      setCapacity(live)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load attendance.')
    }
  }

  useEffect(() => { void load() }, [])

  const inside = rows.filter((row) => row.presence === 'Inside')

  return (
    <>
      <PageHeader
        eyebrow="Staff operations"
        title="Attendance today"
        action={(
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setScannerOpen(true)}><Camera size={15} />Scan QR</Button>
            <Button variant="secondary" onClick={() => void load()}><RefreshCw size={15} />Refresh</Button>
          </div>
        )}
      />

      <SectionCard className="mb-5 overflow-hidden">
        <div className="grid gap-4 bg-gradient-to-br from-[#0b5ea2] to-[#084a82] p-5 text-white sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">Scan first</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Check visitors in or out</h2>
            <p className="mt-2 text-sm text-white/80">Already inside → automatic check-out. New visit → tap a purpose chip.</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">Inside now</p>
            <p className="font-display text-3xl font-bold">{capacity?.current ?? inside.length}<span className="text-lg text-white/70">/{capacity?.capacity ?? 80}</span></p>
          </div>
        </div>
      </SectionCard>

      {error ? <p role="alert" className="mb-4 rounded-xl bg-[#FFF200] p-4 text-[#0b5ea2]">{error}</p> : null}

      <TableShell
        title="Today's visits"
        subtitle={`${rows.length} ${rows.length === 1 ? 'record' : 'records'}`}
        mobileRows={(
          <MobileList empty={rows.length === 0 ? <p className="px-5 py-10 text-center font-semibold text-[#0b5ea2] dark:text-white">No attendance records yet today.</p> : null}>
            {rows.map((row) => (
              <MobileListItem
                key={row.id}
                title={row.visitor_name}
                meta={row.school_id}
                status={<span className={`rounded-full px-2 py-1 text-xs font-bold text-[#0b5ea2] ${presenceBadge(row.presence)}`}>{row.presence}</span>}
                detail={(
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>In {row.time_in}</span>
                    <span>Out {row.time_out ?? '—'}</span>
                    <span className="col-span-2">{row.purpose}</span>
                  </div>
                )}
              />
            ))}
          </MobileList>
        )}
      >
        <table className="w-full text-left text-sm text-[#0b5ea2]">
          <thead>
            <tr>
              <th className="p-3">Visitor</th>
              <th className="p-3">Time in</th>
              <th className="p-3">Time out</th>
              <th className="p-3">Purpose</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#0b5ea2]/10">
                <td className="p-3">{row.visitor_name}<br /><span className="text-xs text-[#0b5ea2]/65">{row.school_id}</span></td>
                <td className="p-3">{row.time_in}</td>
                <td className="p-3">{row.time_out ?? '—'}</td>
                <td className="p-3">{row.purpose}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${presenceBadge(row.presence)}`}>{row.presence}</span></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={5} className="p-8 text-center font-semibold">No attendance records yet today.</td></tr> : null}
          </tbody>
        </table>
      </TableShell>

      <AttendanceScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onRecorded={() => void load()} />
    </>
  )
}
