import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool, PoolConnection } from 'mysql2/promise'
import {
  assertLibraryOpenForCheckIn,
  closeOpenAttendanceAfterHours,
  manilaDateYmd,
  manilaTimeHms,
  manilaWeekdayMon1,
} from './attendance-hours.service.ts'
import { HttpError } from '../../core/http-error.ts'

test('Manila helpers produce stable date and weekday values', () => {
  const noon = new Date('2026-10-05T04:00:00.000Z') // Monday 12:00 Asia/Manila
  assert.equal(manilaDateYmd(noon), '2026-10-05')
  assert.equal(manilaWeekdayMon1(noon), 1)
  assert.match(manilaTimeHms(noon), /^\d{2}:\d{2}:\d{2}$/)
})

test('check-in is rejected after scheduled closing time', async () => {
  const afterClose = new Date('2026-10-05T11:05:00.000Z') // Monday 19:05 Asia/Manila
  const database = {
    async execute(sql: string) {
      if (sql.includes('FROM library_operating_schedule')) {
        return [[{ is_open: 1, opens_at: '07:00:00', closes_at: '19:00:00' }]]
      }
      if (sql.includes('FROM library_closed_days')) return [[]]
      return [[]]
    },
  } as unknown as Pool

  await assert.rejects(
    () => assertLibraryOpenForCheckIn(database, afterClose),
    (error: unknown) => error instanceof HttpError && error.code === 'LIBRARY_CLOSED_FOR_DAY',
  )
})

test('check-in is allowed during open hours', async () => {
  const midday = new Date('2026-10-05T04:00:00.000Z') // Monday 12:00 Asia/Manila
  const database = {
    async execute(sql: string) {
      if (sql.includes('FROM library_operating_schedule')) {
        return [[{ is_open: 1, opens_at: '07:00:00', closes_at: '19:00:00' }]]
      }
      if (sql.includes('FROM library_closed_days')) return [[]]
      return [[]]
    },
  } as unknown as Pool

  const hours = await assertLibraryOpenForCheckIn(database, midday)
  assert.equal(hours.outsideHours, false)
  assert.equal(hours.closesAt, '19:00:00')
})

test('after-hours job closes today open visits and stale prior-day visits', async () => {
  const afterClose = new Date('2026-10-05T11:05:00.000Z') // Monday 19:05 Asia/Manila
  const statements: string[] = []
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql: string, params?: unknown[]) {
      statements.push(sql)
      if (sql.includes('attendance_date <')) {
        assert.deepEqual(params?.slice(-1), ['2026-10-05'])
        return [{ affectedRows: 2 }]
      }
      if (sql.includes('attendance_date =')) {
        assert.equal(params?.[0], '19:00:00')
        assert.equal(params?.[2], '2026-10-05')
        return [{ affectedRows: 3 }]
      }
      return [{ affectedRows: 0 }]
    },
  } as unknown as PoolConnection

  const database = {
    async execute(sql: string) {
      if (sql.includes('FROM library_operating_schedule')) {
        return [[{ is_open: 1, opens_at: '07:00:00', closes_at: '19:00:00' }]]
      }
      if (sql.includes('FROM library_closed_days')) return [[]]
      return [[]]
    },
    async getConnection() { return connection },
  } as unknown as Pool

  const result = await closeOpenAttendanceAfterHours(database, afterClose)
  assert.equal(result.closedStale, 2)
  assert.equal(result.closedAfterHours, 3)
  assert.equal(result.closedTotal, 5)
  assert.equal(result.afterClosing, true)
  assert.ok(statements.some((sql) => sql.includes('checked_out_by_user_id = NULL')))
})

test('before closing the job only clears stale prior-day visits', async () => {
  const midday = new Date('2026-10-05T04:00:00.000Z')
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql: string) {
      if (sql.includes('attendance_date <')) return [{ affectedRows: 1 }]
      if (sql.includes('attendance_date =')) throw new Error('should not close today before hours')
      return [{ affectedRows: 0 }]
    },
  } as unknown as PoolConnection

  const database = {
    async execute(sql: string) {
      if (sql.includes('FROM library_operating_schedule')) {
        return [[{ is_open: 1, opens_at: '07:00:00', closes_at: '19:00:00' }]]
      }
      if (sql.includes('FROM library_closed_days')) return [[]]
      return [[]]
    },
    async getConnection() { return connection },
  } as unknown as Pool

  const result = await closeOpenAttendanceAfterHours(database, midday)
  assert.equal(result.closedStale, 1)
  assert.equal(result.closedAfterHours, 0)
  assert.equal(result.afterClosing, false)
})
