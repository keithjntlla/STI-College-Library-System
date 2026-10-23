import type { Pool, RowDataPacket } from 'mysql2/promise'

export type PublicLibraryEvent = {
  title: string
  kind: string
  space: string
  startsAt: string
  endsAt: string
  seats: number
  allowWalkIns: boolean
  allowBorrowing: boolean
  allowPrinting: boolean
  active: boolean
}

const sql = `SELECT title, event_kind, space_name, starts_at, ends_at, seat_capacity,
            allow_walk_ins, allow_borrowing, allow_printing, lifecycle_status
       FROM library_operational_events
      WHERE lifecycle_status = 'Active' AND ends_at > ?
      ORDER BY starts_at, event_id
      LIMIT 8`

function flag(value: unknown) {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return value.length > 0 && value[0] !== 0
  if (typeof value === 'string') return value === '1' || /^t(rue)?$/i.test(value)
  return value === 1 || value === true
}

function instant(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function shapePublicEvents(rows: ReadonlyArray<Record<string, unknown>>, now = new Date()): PublicLibraryEvent[] {
  return rows
    .map((row) => {
      const starts = instant(row.starts_at)
      const ends = instant(row.ends_at)
      if (!starts || !ends || String(row.lifecycle_status ?? 'Active') !== 'Active' || ends.getTime() <= now.getTime()) return null
      return {
        title: String(row.title ?? ''),
        kind: String(row.event_kind ?? ''),
        space: String(row.space_name ?? ''),
        startsAt: starts.toISOString(),
        endsAt: ends.toISOString(),
        seats: Number(row.seat_capacity ?? 0),
        allowWalkIns: flag(row.allow_walk_ins),
        allowBorrowing: flag(row.allow_borrowing),
        allowPrinting: flag(row.allow_printing),
        active: starts.getTime() <= now.getTime(),
        sort: starts.getTime(),
      }
    })
    .filter((row): row is PublicLibraryEvent & { sort: number } => row !== null && row.title.length > 0)
    .sort((left, right) => left.sort - right.sort)
    .slice(0, 8)
    .map(({ sort: _sort, ...event }) => event)
}

export async function loadPublicLibraryEvents(database: Pick<Pool, 'execute'>, now = new Date()) {
  const [rows] = await database.execute<RowDataPacket[]>(sql, [now])
  return shapePublicEvents(rows, now)
}
