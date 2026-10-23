export function libraryDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short', hour12: true })
}

export function eventAccessLine(event: { seats: number; allowWalkIns: boolean; allowBorrowing: boolean; allowPrinting: boolean }) {
  const closed = [event.allowWalkIns ? '' : 'walk-ins', event.allowBorrowing ? '' : 'borrowing', event.allowPrinting ? '' : 'printing'].filter(Boolean)
  if (!closed.length) return `The library stays open with ${event.seats} seats.`
  return `${closed.join(', ')} closed. ${event.seats} seats remain for visitors.`
}

export function libraryClock(value: string | null | undefined) {
  if (!value) return ''
  const text = value.trim().replace(/\s+/g, ' ')
  if (/[AP]M/i.test(text)) return text.replace(/^0(\d)/, '$1')
  const match = /^(\d{1,2}):(\d{2})/.exec(text)
  if (!match) return text
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`
}
