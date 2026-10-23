import assert from 'node:assert/strict'
import test from 'node:test'
import { HttpError } from '../../core/http-error.ts'
import { parseClosure, parseWeeklyHours } from './attendance-hours.validation.ts'

const open = (dayOfWeek: number, opensAt = '07:00', closesAt = '19:00') => ({ dayOfWeek, isOpen: true, opensAt, closesAt })
const week = [1, 2, 3, 4, 5, 6].map((day) => open(day)).concat([{ dayOfWeek: 7, isOpen: false, opensAt: null, closesAt: null }])

test('weekly hours keep a later closing time and one open day', () => {
  assert.deepEqual(parseWeeklyHours({ days: week })[0], open(1))
  assert.equal(parseWeeklyHours({ days: week }).at(-1)?.isOpen, false)
})

test('weekly hours reject a closing time that is not later and a fully closed week', () => {
  assert.throws(() => parseWeeklyHours({ days: week.map((day) => day.dayOfWeek === 1 ? open(1, '19:00', '07:00') : day) }), (error: unknown) => error instanceof HttpError && error.code === 'LIBRARY_HOURS_ORDER')
  assert.throws(() => parseWeeklyHours({ days: week.map((day) => ({ ...day, isOpen: false, opensAt: null, closesAt: null })) }), (error: unknown) => error instanceof HttpError && error.code === 'LIBRARY_HOURS_CLOSED')
})

test('a closed date must be today or later and include a reason', () => {
  assert.deepEqual(parseClosure({ date: '2026-12-25', reason: ' Christmas ' }, '2026-10-19'), { date: '2026-12-25', reason: 'Christmas' })
  assert.throws(() => parseClosure({ date: '2026-10-18', reason: 'Past' }, '2026-10-19'), (error: unknown) => error instanceof HttpError && error.code === 'LIBRARY_CLOSURE_DATE')
})
