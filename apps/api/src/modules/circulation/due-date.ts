const DUE_HOUR = 8
const DUE_MINUTE = 59
const CLOSING_HOUR = 17
const CLOSING_MINUTE = 0

function localDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Sundays and configured campus closures are not operating days. */
export function nextOperatingDueDate(borrowedAt: Date, closedDates: ReadonlySet<string> = new Set()) {
  const due = new Date(borrowedAt)
  due.setDate(due.getDate() + 1)
  due.setHours(DUE_HOUR, DUE_MINUTE, 0, 0)
  for (let inspected = 0; inspected < 366; inspected += 1) {
    if (due.getDay() !== 0 && !closedDates.has(localDateKey(due))) return due
    due.setDate(due.getDate() + 1)
  }
  throw new Error('No operating day could be resolved within one year.')
}

/** Inside-library loans are due at closing the same operating day. */
export function sameDayClosingDueDate(borrowedAt: Date, closesAt: string | null = null) {
  const due = new Date(borrowedAt)
  const match = closesAt?.match(/^(\d{1,2}):(\d{2})/)
  if (match) {
    due.setHours(Number(match[1]), Number(match[2]), 0, 0)
  } else {
    due.setHours(CLOSING_HOUR, CLOSING_MINUTE, 0, 0)
  }
  if (due.getTime() <= borrowedAt.getTime()) {
    due.setTime(borrowedAt.getTime() + 30 * 60 * 1000)
  }
  return due
}

export const circulationDuePolicy = { hour: DUE_HOUR, minute: DUE_MINUTE, closingHour: CLOSING_HOUR, closingMinute: CLOSING_MINUTE }
