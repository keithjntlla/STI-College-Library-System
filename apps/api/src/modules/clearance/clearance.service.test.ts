import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'mysql2/promise'
import { createClearanceService } from './clearance.service.ts'

test('admin clearance list exposes pending lost-book reports for review', async () => {
  const database = {
    async execute(sql: string) {
      if (sql.includes("WHERE l.report_status='Pending'")) return [[{
        lost_book_report_id: 12, user_id: 7, school_id: '02000871654',
        full_name: 'Test Borrower', user_role: 'Student', title: 'Emma',
        reported_at: '2026-09-26T01:00:00.000Z',
      }]]
      return [[]]
    },
  } as unknown as Pool

  const result = await createClearanceService(database).list({ role: 'Admin' }, {})
  assert.deepEqual(result.pendingLostReports, [{
    lostBookReportId: 12, userId: 7, schoolId: '02000871654',
    borrowerName: 'Test Borrower', role: 'Student', title: 'Emma',
    reportedAt: '2026-09-26T01:00:00.000Z',
  }])
})

test('confirmed lost awaiting quotation keeps student clearance Not Cleared', async () => {
  const statements: string[] = []
  const database = {
    async execute(sql: string) {
      statements.push(sql)
      if (sql.includes('FROM users u WHERE u.user_id')) {
        return [[{ user_id: 7, school_id: 'STI-7', full_name: 'Ada Student', course_or_strand: 'BSIT', section: 'A', account_status: 'Active' }]]
      }
      if (sql.includes('FROM borrow_transactions bt INNER JOIN materials') && sql.includes('lost_confirmed_at IS NULL')) {
        return [[]]
      }
      if (sql.includes('FROM fines f') || sql.includes('calculated.fine_amount')) {
        return [[]]
      }
      if (sql.includes('FROM lost_book_reports l')) {
        return [[{
          lost_book_report_id: 12, transaction_id: 20, report_status: 'Confirmed',
          purchase_price_snapshot: null, replacement_charge: 0, charge_resolution: 'Awaiting Quotation',
          resolution_reason: null, payment_status: 'Unpaid', reported_at: '2026-10-01T00:00:00.000Z',
          verified_at: '2026-10-02T00:00:00.000Z', title_id: 5, current_quotation_id: null,
          current_quotation_amount: null, title: 'Emma',
        }]]
      }
      if (sql.includes('FROM clearance_overrides')) return [[]]
      if (sql.includes('INSERT INTO clearance_statuses') || sql.includes('ON CONFLICT') || sql.includes('ON DUPLICATE KEY')) {
        return [{ affectedRows: 1 }]
      }
      return [[]]
    },
  } as unknown as Pool

  const result = await createClearanceService(database).compute(7)
  assert.equal(result.computedStatus, 'Not Cleared')
  assert.equal(result.status, 'Not Cleared')
  assert.match(result.reason, /awaiting quotation/i)
  assert.equal(result.summary.unpaidReplacementCharges, 0)
  assert.equal(result.summary.blockCount, 1)
  assert.equal(result.lostBooks[0]?.status, 'Confirmed')
  assert.equal(result.lostBooks[0]?.chargeResolution, 'Awaiting Quotation')
})

test('quoted unpaid lost charge still blocks clearance with the replacement amount', async () => {
  const database = {
    async execute(sql: string) {
      if (sql.includes('FROM users u WHERE u.user_id')) {
        return [[{ user_id: 7, school_id: 'STI-7', full_name: 'Ada Student', course_or_strand: 'BSIT', section: 'A', account_status: 'Active' }]]
      }
      if (sql.includes('FROM borrow_transactions bt INNER JOIN materials') && sql.includes('lost_confirmed_at IS NULL')) return [[]]
      if (sql.includes('FROM fines f') || sql.includes('calculated.fine_amount')) return [[]]
      if (sql.includes('FROM lost_book_reports l')) {
        return [[{
          lost_book_report_id: 12, transaction_id: 20, report_status: 'Confirmed',
          purchase_price_snapshot: 500, replacement_charge: 650, charge_resolution: 'Quoted',
          resolution_reason: null, payment_status: 'Unpaid', reported_at: '2026-10-01T00:00:00.000Z',
          verified_at: '2026-10-02T00:00:00.000Z', title_id: 5, current_quotation_id: 3,
          current_quotation_amount: 650, title: 'Emma',
        }]]
      }
      if (sql.includes('FROM clearance_overrides')) return [[]]
      if (sql.includes('INSERT INTO clearance_statuses') || sql.includes('ON CONFLICT') || sql.includes('ON DUPLICATE KEY')) {
        return [{ affectedRows: 1 }]
      }
      return [[]]
    },
  } as unknown as Pool

  const result = await createClearanceService(database).compute(7)
  assert.equal(result.computedStatus, 'Not Cleared')
  assert.equal(result.summary.unpaidReplacementCharges, 650)
  assert.match(result.reason, /650\.00/)
})

function clearedAfterResolvedLoss(chargeResolution: 'Waived' | 'Quoted', paymentStatus: 'Unpaid' | 'Paid') {
  return {
    async execute(sql: string) {
      if (sql.includes('FROM users u WHERE u.user_id')) {
        return [[{ user_id: 7, school_id: 'STI-7', full_name: 'Ada Student', course_or_strand: 'BSIT', section: 'A', account_status: 'Active' }]]
      }
      if (sql.includes('FROM borrow_transactions bt INNER JOIN materials') && sql.includes('lost_confirmed_at IS NULL')) return [[]]
      if (sql.includes('FROM fines f') || sql.includes('calculated.fine_amount')) return [[]]
      if (sql.includes('FROM lost_book_reports l')) {
        return [[{
          lost_book_report_id: 12, transaction_id: 20, report_status: 'Confirmed',
          purchase_price_snapshot: chargeResolution === 'Quoted' ? 500 : null,
          replacement_charge: chargeResolution === 'Quoted' ? 650 : 0,
          charge_resolution: chargeResolution,
          resolution_reason: chargeResolution === 'Waived' ? 'Staff waiver' : null,
          payment_status: paymentStatus, reported_at: '2026-10-01T00:00:00.000Z',
          verified_at: '2026-10-02T00:00:00.000Z', title_id: 5,
          current_quotation_id: chargeResolution === 'Quoted' ? 3 : null,
          current_quotation_amount: chargeResolution === 'Quoted' ? 650 : null, title: 'Emma',
        }]]
      }
      if (sql.includes('FROM clearance_overrides')) return [[]]
      if (sql.includes('INSERT INTO clearance_statuses') || sql.includes('ON CONFLICT') || sql.includes('ON DUPLICATE KEY')) {
        return [{ affectedRows: 1 }]
      }
      return [[]]
    },
  } as unknown as Pool
}

test('waived confirmed loss no longer blocks clearance', async () => {
  const result = await createClearanceService(clearedAfterResolvedLoss('Waived', 'Unpaid')).compute(7)
  assert.equal(result.computedStatus, 'Cleared')
  assert.equal(result.summary.blockCount, 0)
  assert.equal(result.reason, 'No library obligations')
})

test('paid quoted loss no longer blocks clearance', async () => {
  const result = await createClearanceService(clearedAfterResolvedLoss('Quoted', 'Paid')).compute(7)
  assert.equal(result.computedStatus, 'Cleared')
  assert.equal(result.summary.blockCount, 0)
  assert.equal(result.summary.unpaidReplacementCharges, 0)
  assert.equal(result.reason, 'No library obligations')
})

test('unpaid started print request blocks clearance with print charge amount', async () => {
  const database = {
    async execute(sql: string) {
      if (sql.includes('FROM users u WHERE u.user_id')) {
        return [[{ user_id: 7, school_id: 'STI-7', full_name: 'Ada Student', course_or_strand: 'BSIT', section: 'A', account_status: 'Active' }]]
      }
      if (sql.includes('FROM borrow_transactions bt INNER JOIN materials') && sql.includes('lost_confirmed_at IS NULL')) return [[]]
      if (sql.includes('FROM fines f') || sql.includes('calculated.fine_amount')) return [[]]
      if (sql.includes('FROM lost_book_reports l')) return [[]]
      if (sql.includes('FROM print_requests')) {
        return [[{
          request_id: 44, file_name: 'thesis.pdf', calculated_cost: 36,
          job_status: 'Ready for Pickup', payment_status: 'Unpaid',
          started_at: '2026-10-06T08:00:00.000Z', created_at: '2026-10-06T07:30:00.000Z',
        }]]
      }
      if (sql.includes('FROM clearance_overrides')) return [[]]
      if (sql.includes('INSERT INTO clearance_statuses') || sql.includes('ON CONFLICT') || sql.includes('ON DUPLICATE KEY')) {
        return [{ affectedRows: 1 }]
      }
      return [[]]
    },
  } as unknown as Pool

  const result = await createClearanceService(database).compute(7)
  assert.equal(result.computedStatus, 'Not Cleared')
  assert.equal(result.summary.unpaidPrintCharges, 36)
  assert.equal(result.summary.totalOutstanding, 36)
  assert.equal(result.summary.blockCount, 1)
  assert.match(result.reason, /unpaid printing charge/i)
  assert.equal(result.printCharges.length, 1)
  assert.equal(result.printCharges[0]?.requestId, 44)
  assert.equal(result.printCharges[0]?.amount, 36)
})

test('resolveLost waive writes Waived resolution and lost_book_resolved admin notice', async () => {
  const statements: string[] = []
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql: string) {
      statements.push(sql)
      if (sql.includes('FROM lost_book_reports l') && sql.includes('FOR UPDATE')) {
        return [[{
          lost_book_report_id: 12, transaction_id: 20, user_id: 7, report_status: 'Confirmed',
          charge_resolution: 'Awaiting Quotation', title: 'Emma',
          current_quotation_id: null, current_quotation_amount: null,
        }]]
      }
      if (sql.includes('FROM accounts') && sql.includes('user_id')) {
        return [[{ user_id: 99 }]]
      }
      return [{ affectedRows: 1 }]
    },
  }
  const database = {
    async getConnection() { return connection },
  } as unknown as Pool

  const result = await createClearanceService(database).resolveLost(
    { accountId: 1, role: 'Librarian' },
    12,
    { action: 'Waive', reason: 'Replacement copy donated by the program.' },
  )

  assert.deepEqual(result, { lostBookReportId: 12, chargeResolution: 'Waived' })
  assert.ok(statements.some((sql) => sql.includes("charge_resolution='Waived'") && sql.includes('resolution_reason')))
  assert.ok(statements.some((sql) => sql.includes("'lost_book_resolved'") && sql.includes('admin_notifications')))
})