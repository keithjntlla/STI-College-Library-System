import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import { DashboardRepository } from './dashboard.repository.ts'

function rowPacket(rows: Array<Record<string, unknown>>) {
  return [rows as RowDataPacket[]] as [RowDataPacket[], unknown]
}

function mockPool(handlers: Array<{ match: (sql: string) => boolean; rows: Array<Record<string, unknown>> }>) {
  return {
    async execute(sql: string) {
      const hit = handlers.find((handler) => handler.match(sql))
      return rowPacket(hit?.rows ?? [])
    },
  } as unknown as Pool
}

const identityRows = [{ account_id: 1, user_id: 7, full_name: 'Ada Student', school_id: 'STI-7', program: 'BSIT' }]
const profileRows = [{ library_name: 'STI Ormoc Library', seat_capacity: 80, information_text: null, map_asset_path: null }]
const scheduleRows = [{ day_of_week: 1, is_open: 1, opens_at: '08:00:00', closes_at: '17:00:00' }]

test('user dashboard marks confirmed lost awaiting quotation as Not Cleared without a return reminder', async () => {
  let capturedLoanSql = ''
  const repository = new DashboardRepository({
    async execute(sql: string) {
      if (sql.includes('lost_report_status') && sql.includes('CASE WHEN bt.transaction_status')) capturedLoanSql = sql
      const pool = mockPool([
        { match: (s) => s.includes('FROM accounts a'), rows: identityRows },
        { match: (s) => s.includes('FROM library_profile_settings'), rows: profileRows },
        { match: (s) => s.includes('FROM library_operating_schedule'), rows: scheduleRows },
        { match: (s) => s.includes('FROM library_closed_days'), rows: [] },
        {
          match: (s) => s.includes('open_confirmed_losses') && s.includes('awaiting_quotation'),
          rows: [{
            active_loans: 0, pending_book_requests: 0, active_reservations: 0, unread_notifications: 0,
            override_status: null, open_confirmed_losses: 1, awaiting_quotation: 1, outstanding_fines: 0,
          }],
        },
        { match: (s) => s.includes('FROM attendance_logs'), rows: [{ currently_inside: 0 }] },
      ])
      return pool.execute(sql)
    },
  } as unknown as Pool)

  const data = await repository.user({ accountId: 1, role: 'Student' })
  assert.match(capturedLoanSql, /lost_confirmed_at IS NULL/)
  assert.doesNotMatch(capturedLoanSql, /charge_resolution IN \('Awaiting Quotation','Quoted'\)/)
  assert.doesNotMatch(capturedLoanSql, /\(lbr\.report_status='Confirmed'\) DESC/)
  assert.equal(data.summary.clearanceStatus, 'Not Cleared')
  assert.match(data.summary.clearanceReason ?? '', /awaiting quotation/i)
  assert.equal(data.currentLoan, null)
})

test('user dashboard computes live Overdue for a past-due Borrowed loan', async () => {
  let capturedLoanSql = ''
  const repository = new DashboardRepository({
    async execute(sql: string) {
      if (sql.includes('CASE WHEN bt.transaction_status')) capturedLoanSql = sql
      const pool = mockPool([
        { match: (s) => s.includes('FROM accounts a'), rows: identityRows },
        { match: (s) => s.includes('FROM library_profile_settings'), rows: profileRows },
        { match: (s) => s.includes('FROM library_operating_schedule'), rows: scheduleRows },
        { match: (s) => s.includes('FROM library_closed_days'), rows: [] },
        {
          match: (s) => s.includes('open_confirmed_losses') && s.includes('awaiting_quotation'),
          rows: [{
            active_loans: 1, pending_book_requests: 0, active_reservations: 0, unread_notifications: 0,
            override_status: null, open_confirmed_losses: 0, awaiting_quotation: 0, outstanding_fines: 0,
          }],
        },
        {
          match: (s) => s.includes('CASE WHEN bt.transaction_status'),
          rows: [{
            transaction_id: 21, title: 'Clean Code', author: 'Robert C. Martin', barcode: 'BC-21',
            shelf_location: 'B-2', transaction_status: 'Overdue', lost_report_status: null,
            due_at: '2026-09-01 08:59 AM', cover_image_path: null,
          }],
        },
        { match: (s) => s.includes('FROM attendance_logs'), rows: [{ currently_inside: 0 }] },
      ])
      return pool.execute(sql)
    },
  } as unknown as Pool)

  const data = await repository.user({ accountId: 1, role: 'Student' })
  assert.match(capturedLoanSql, /due_at < NOW\(\)/)
  assert.equal(data.currentLoan?.status, 'Overdue')
  assert.equal(data.summary.clearanceStatus, 'Not Cleared')
})

test('user dashboard recommends only books linked to the student course', async () => {
  let capturedSql = ''
  let capturedParameters: unknown[] = []
  const repository = new DashboardRepository({
    async execute(sql: string, parameters?: unknown[]) {
      if (sql.includes('program_categories course_link')) {
        capturedSql = sql
        capturedParameters = parameters ?? []
      }
      const pool = mockPool([
        { match: (statement) => statement.includes('FROM accounts a'), rows: [{ ...identityRows[0], program: 'Information Technology' }] },
        { match: (statement) => statement.includes('FROM library_profile_settings'), rows: profileRows },
        { match: (statement) => statement.includes('FROM library_operating_schedule'), rows: scheduleRows },
        { match: (statement) => statement.includes('FROM library_closed_days'), rows: [] },
        {
          match: (statement) => statement.includes('open_confirmed_losses') && statement.includes('awaiting_quotation'),
          rows: [{
            active_loans: 0, pending_book_requests: 0, active_reservations: 0, unread_notifications: 0,
            override_status: null, open_confirmed_losses: 0, awaiting_quotation: 0, outstanding_fines: 0,
          }],
        },
        { match: (statement) => statement.includes('FROM attendance_logs'), rows: [{ currently_inside: 0 }] },
      ])
      return pool.execute(sql)
    },
  } as unknown as Pool)

  await repository.user({ accountId: 1, role: 'Student' })
  assert.match(capturedSql, /program_categories course_link/)
  assert.match(capturedSql, /course_program\.program_name/)
  assert.match(capturedSql, /CHAR_LENGTH\(\?\) >= 8/)
  assert.equal(capturedParameters[0], 'Information Technology')
  assert.ok(capturedParameters.includes('Information Technology'))
  assert.equal(capturedParameters.at(-1), 7)
  assert.equal(capturedParameters.at(-2), 7)
})

test('user dashboard treats paid confirmed loss as cleared when no other obligations remain', async () => {
  const repository = new DashboardRepository(mockPool([
    { match: (sql) => sql.includes('FROM accounts a'), rows: identityRows },
    { match: (sql) => sql.includes('FROM library_profile_settings'), rows: profileRows },
    { match: (sql) => sql.includes('FROM library_operating_schedule'), rows: scheduleRows },
    { match: (sql) => sql.includes('FROM library_closed_days'), rows: [] },
    {
      match: (sql) => sql.includes('open_confirmed_losses') && sql.includes('awaiting_quotation'),
      rows: [{
        active_loans: 0, pending_book_requests: 0, active_reservations: 0, unread_notifications: 0,
        override_status: null, open_confirmed_losses: 0, awaiting_quotation: 0, outstanding_fines: 0,
      }],
    },
    { match: (sql) => sql.includes('FROM attendance_logs'), rows: [{ currently_inside: 0 }] },
  ]))

  const data = await repository.user({ accountId: 1, role: 'Student' })
  assert.equal(data.summary.clearanceStatus, 'Cleared')
  assert.equal(data.currentLoan, null)
})
