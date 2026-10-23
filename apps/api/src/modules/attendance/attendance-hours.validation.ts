import { HttpError } from '../../core/http-error.ts'

export type WeeklyHour = { dayOfWeek: number; isOpen: boolean; opensAt: string | null; closesAt: string | null }

function minutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) throw new HttpError(422, 'LIBRARY_HOURS_INVALID', 'Enter opening and closing times for each open day.')
  return Number(match[1]) * 60 + Number(match[2])
}

export function parseWeeklyHours(value: unknown): WeeklyHour[] {
  const days = (value && typeof value === 'object' ? (value as { days?: unknown }).days : undefined)
  if (!Array.isArray(days) || days.length !== 7) throw new HttpError(422, 'LIBRARY_HOURS_INVALID', 'Set all seven days before saving.')
  const seen = new Set<number>()
  const parsed = days.map((entry) => {
    const day = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    const dayOfWeek = Number(day.dayOfWeek)
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7 || seen.has(dayOfWeek)) {
      throw new HttpError(422, 'LIBRARY_HOURS_INVALID', 'Set all seven days before saving.')
    }
    seen.add(dayOfWeek)
    const isOpen = day.isOpen === true
    if (!isOpen) return { dayOfWeek, isOpen: false, opensAt: null, closesAt: null }
    const opensAt = String(day.opensAt ?? '')
    const closesAt = String(day.closesAt ?? '')
    if (minutes(closesAt) <= minutes(opensAt)) throw new HttpError(422, 'LIBRARY_HOURS_ORDER', 'Closing time must be after opening time.')
    return { dayOfWeek, isOpen: true, opensAt, closesAt }
  })
  if (!parsed.some((day) => day.isOpen)) throw new HttpError(422, 'LIBRARY_HOURS_CLOSED', 'Keep at least one day open.')
  return parsed.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
}

export function parseClosure(value: unknown, today: string) {
  const body = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const date = String(body.date ?? '')
  const reason = String(body.reason ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || date < today) {
    throw new HttpError(422, 'LIBRARY_CLOSURE_DATE', 'Choose today or a future closed date.')
  }
  if (!reason || reason.length > 191) throw new HttpError(422, 'LIBRARY_CLOSURE_REASON', 'Enter a reason of 191 characters or fewer.')
  return { date, reason }
}
