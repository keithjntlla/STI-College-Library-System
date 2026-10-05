import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { db } from '../../config/db.js'
import { isPostgres } from '../../config/sql-dialect.js'
import { HttpError } from '../../core/http-error.ts'

const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

export function manilaDateYmd(now: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

export function manilaWeekdayMon1(now: Date) {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }).format(now)
  return weekdayMap[day] ?? 7
}

export function manilaTimeHms(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  const second = parts.find((part) => part.type === 'second')?.value ?? '00'
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`
}

function normalizeTime(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  return `${match[1].padStart(2, '0')}:${match[2]}:${(match[3] ?? '00').padStart(2, '0')}`
}

export type LibraryHoursState = {
  dateYmd: string
  weekday: number
  isOpen: boolean
  opensAt: string | null
  closesAt: string | null
  closedDay: boolean
  outsideHours: boolean
  afterClosing: boolean
}

export async function loadLibraryHoursState(
  executor: Pool | PoolConnection,
  now: Date = new Date(),
): Promise<LibraryHoursState> {
  const dateYmd = manilaDateYmd(now)
  const weekday = manilaWeekdayMon1(now)
  const timeHms = manilaTimeHms(now)
  const [[scheduleRows], [closedRows]] = await Promise.all([
    executor.execute<RowDataPacket[]>(
      'SELECT is_open, opens_at, closes_at FROM library_operating_schedule WHERE day_of_week = ? LIMIT 1',
      [weekday],
    ),
    executor.execute<RowDataPacket[]>(
      'SELECT closed_date FROM library_closed_days WHERE closed_date = ? LIMIT 1',
      [dateYmd],
    ),
  ])
  const schedule = scheduleRows[0]
  const isOpen = Boolean(schedule?.is_open)
  const opensAt = normalizeTime(schedule?.opens_at)
  const closesAt = normalizeTime(schedule?.closes_at)
  const closedDay = Boolean(closedRows[0]) || !isOpen
  const beforeOpening = Boolean(opensAt && timeHms < opensAt)
  const afterClosing = Boolean(closesAt && timeHms >= closesAt)
  const outsideHours = closedDay || beforeOpening || afterClosing || !opensAt || !closesAt
  return { dateYmd, weekday, isOpen, opensAt, closesAt, closedDay, outsideHours, afterClosing: closedDay || afterClosing }
}

export async function assertLibraryOpenForCheckIn(executor: Pool | PoolConnection, now: Date = new Date()) {
  const hours = await loadLibraryHoursState(executor, now)
  if (hours.closedDay) {
    throw new HttpError(409, 'LIBRARY_CLOSED', 'The library is closed today. Check-in is unavailable.')
  }
  if (hours.opensAt && manilaTimeHms(now) < hours.opensAt) {
    throw new HttpError(409, 'LIBRARY_NOT_OPEN_YET', `The library opens at ${hours.opensAt.slice(0, 5)}. Check-in is unavailable until then.`)
  }
  if (hours.closesAt && manilaTimeHms(now) >= hours.closesAt) {
    throw new HttpError(409, 'LIBRARY_CLOSED_FOR_DAY', `The library closed at ${hours.closesAt.slice(0, 5)}. New check-ins are blocked; scan remaining visitors out if needed.`)
  }
  return hours
}

/**
 * Closes forgotten open visits after closing (or on closed days), and always clears
 * stale open visits from prior attendance dates. System exits leave checked_out_by_user_id NULL.
 */
export async function closeOpenAttendanceAfterHours(database: Pool = db, now: Date = new Date()) {
  const hours = await loadLibraryHoursState(database, now)
  const connection = await database.getConnection()
  try {
    await connection.beginTransaction()
    let closedStale = 0
    let closedAfterHours = 0

    const [stale] = await connection.execute<ResultSetHeader>(
      `UPDATE attendance_logs
          SET time_out = COALESCE(?, ${isPostgres ? 'LOCALTIME' : 'CURTIME()'}),
              checked_out_at = NOW(),
              checked_out_by_user_id = NULL
        WHERE time_out IS NULL AND attendance_date < ?`,
      [hours.closesAt, hours.dateYmd],
    )
    closedStale = Number(stale.affectedRows ?? 0)

    if (hours.afterClosing) {
      const exitTime = hours.closesAt ?? manilaTimeHms(now)
      const checkedOutAt = hours.closesAt
        ? `${hours.dateYmd} ${hours.closesAt}`
        : now
      const [afterHours] = await connection.execute<ResultSetHeader>(
        `UPDATE attendance_logs
            SET time_out = ?,
                checked_out_at = ?,
                checked_out_by_user_id = NULL
          WHERE time_out IS NULL AND attendance_date = ?`,
        [exitTime, checkedOutAt, hours.dateYmd],
      )
      closedAfterHours = Number(afterHours.affectedRows ?? 0)
    }

    await connection.commit()
    return {
      dateYmd: hours.dateYmd,
      afterClosing: hours.afterClosing,
      closesAt: hours.closesAt,
      closedStale,
      closedAfterHours,
      closedTotal: closedStale + closedAfterHours,
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
