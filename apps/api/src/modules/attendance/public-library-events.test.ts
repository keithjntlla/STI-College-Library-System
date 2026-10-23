import assert from 'node:assert/strict'
import test from 'node:test'
import { loadPublicLibraryEvents, shapePublicEvents } from './public-library-events.ts'

const now = new Date('2026-10-20T02:00:00.000Z')

test('public events keep a future class and drop a cancelled or finished one', () => {
  const events = shapePublicEvents([
    { title: 'Finished class', event_kind: 'Class', space_name: 'Room A', starts_at: '2026-10-20T00:00:00.000Z', ends_at: '2026-10-20T01:00:00.000Z', seat_capacity: 10, allow_walk_ins: 1, allow_borrowing: 1, allow_printing: 1, lifecycle_status: 'Active' },
    { title: 'Cancelled seminar', event_kind: 'Seminar', space_name: 'Room B', starts_at: '2026-10-20T03:00:00.000Z', ends_at: '2026-10-20T04:00:00.000Z', seat_capacity: 12, allow_walk_ins: 1, allow_borrowing: 1, allow_printing: 1, lifecycle_status: 'Cancelled' },
    { title: 'Thesis defense', event_kind: 'Meeting', space_name: 'Main reading area', starts_at: '2026-10-20T04:00:00.000Z', ends_at: '2026-10-20T05:00:00.000Z', seat_capacity: 20, allow_walk_ins: 0, allow_borrowing: 1, allow_printing: 0, lifecycle_status: 'Active' },
  ], now)
  assert.deepEqual(events, [{
    title: 'Thesis defense', kind: 'Meeting', space: 'Main reading area',
    startsAt: '2026-10-20T04:00:00.000Z', endsAt: '2026-10-20T05:00:00.000Z',
    seats: 20, allowWalkIns: false, allowBorrowing: true, allowPrinting: false, active: false,
  }])
})

test('the schedule query asks only for active events that have not ended', async () => {
  let seen = ''
  const database = { execute: async (query: string) => { seen = query; return [[{ title: 'Live class', event_kind: 'Class', space_name: 'Hall', starts_at: '2026-10-20T01:00:00.000Z', ends_at: '2026-10-20T03:00:00.000Z', seat_capacity: 15, allow_walk_ins: true, allow_borrowing: true, allow_printing: true, lifecycle_status: 'Active' }]] } }
  const events = await loadPublicLibraryEvents(database as never, now)
  assert.match(seen, /lifecycle_status = 'Active'/)
  assert.match(seen, /ends_at > \?/)
  assert.equal(events[0]?.title, 'Live class')
  assert.equal(events[0]?.active, true)
})
