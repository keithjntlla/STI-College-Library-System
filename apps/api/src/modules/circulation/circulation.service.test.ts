import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'mysql2/promise'
import { HttpError } from '../../core/http-error.ts'
import { createCirculationService } from './circulation.service.ts'

function checkoutPool(role: 'Student' | 'Faculty', activeCount = 0, readyClaim: boolean | 'cart' = false, condition = 'Good') {
  const state = { commits: 0, rollbacks: 0, borrowInserts: 0, queueCompactions: 0, notifications: 0, capacitySql: '' }
  const connection = {
    async beginTransaction() {}, async commit() { state.commits += 1 }, async rollback() { state.rollbacks += 1 }, release() {},
    async execute(sql: string) {
      if (sql.includes('SELECT user_id FROM accounts')) return [[{ user_id: 2 }]]
      if (sql.includes('FROM users u INNER JOIN roles')) return [[{ user_id: 7, full_name: 'Test Borrower', institutional_id: 'STI-7', school_id: 'STI-7', role_name: role, account_status: 'Active' }]]
      if (sql.includes('FROM physical_copies pc INNER JOIN titles')) return [[{ physical_copy_id: 20, title_id: 10, material_id: 30, accession_number: 'ACC-20', barcode: 'BOOK-20', condition_status: condition, availability_status: 'Available', lifecycle_status: 'Active', title: 'Clean Code', material_type: 'Book' }]]
      if (sql.includes('SELECT transaction_id, user_id, transaction_status')) return [readyClaim ? [{ transaction_id: 54, user_id: 7, transaction_status: 'Pending', request_group_id: 'group-1', reservation_id: readyClaim === true ? 99 : null }] : []]
      if (sql.includes('FROM reservations') && sql.includes('ORDER BY queue_position')) return [readyClaim === true ? [{ reservation_id: 99, user_id: 7, queue_position: 1, reservation_status: 'ready_for_pickup' }] : []]
      if (sql.includes('COUNT(DISTINCT activity.title_id)')) {
        state.capacitySql = sql
        return [[{ active_count: activeCount, target_already_active: 0 }]]
      }
      if (sql.includes('as unpaid')) return [[{ unpaid: 0 }]]
      if (sql.includes('as overdue')) return [[{ overdue: 0 }]]
      if (sql.includes('FROM library_closed_days')) return [[]]
      if (sql.includes('FROM library_operating_schedule')) return [[{ closes_at: '17:00:00', is_open: 1 }]]
      if (sql.includes('FROM attendance_logs')) return [[]]
      if (sql.includes('INSERT INTO attendance_logs')) return [{ insertId: 1, affectedRows: 1 }]
      if (sql.includes('INSERT INTO borrow_transactions')) { state.borrowInserts += 1; return [{ insertId: 55, affectedRows: 1 }] }
      if (sql.includes('UPDATE borrow_transactions')) return [{ affectedRows: 1 }]
      if (sql.includes("UPDATE reservations SET reservation_status = 'claimed'")) return [{ affectedRows: 1 }]
      if (sql.includes('UPDATE reservations SET queue_position')) { state.queueCompactions += 1; return [{ affectedRows: 1 }] }
      if (sql.includes('INTO notifications') || sql.includes('INSERT INTO admin_notifications')) { state.notifications += 1; return [{ insertId: 1, affectedRows: 1 }] }
      if (sql.includes('UPDATE physical_copies') || sql.includes('UPDATE materials')) return [{ affectedRows: 1 }]
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  return { state, database: { getConnection: async () => connection } as unknown as Pool }
}

test('student checkout at the combined two-item cap rolls back before inserting', async () => {
  const { state, database } = checkoutPool('Student', 2)
  await assert.rejects(createCirculationService(database).confirmCheckout(1, { barcode: 'book-20', school_id: 'sti-7' }), (error: unknown) => {
    assert.ok(error instanceof HttpError); assert.equal(error.status, 422); assert.equal(error.code, 'STUDENT_BORROW_LIMIT_REACHED'); return true
  })
  assert.equal(state.borrowInserts, 0); assert.equal(state.commits, 0); assert.equal(state.rollbacks, 1)
  assert.match(state.capacitySql, /lost_confirmed_at IS NULL/)
})

test('faculty checkout bypasses the cap and commits synchronized availability and alerts', async () => {
  const { state, database } = checkoutPool('Faculty', 12)
  const result = await createCirculationService(database, () => new Date(2026, 7, 24, 14, 0)).confirmCheckout(1, { barcode: 'book-20', school_id: 'sti-7' })
  assert.equal(result.transactionId, 55); assert.equal(new Date(result.dueAt).getHours(), 8); assert.equal(new Date(result.dueAt).getMinutes(), 59)
  assert.equal(state.borrowInserts, 1); assert.equal(state.notifications, 2); assert.equal(state.commits, 1); assert.equal(state.rollbacks, 0)
})

test('checkout accepts a damaged copy when its manual availability is Available', async () => {
  const { state, database } = checkoutPool('Student', 0, false, 'Damaged')
  const result = await createCirculationService(database).confirmCheckout(1, { barcode: 'book-20', school_id: 'sti-7' })
  assert.equal(result.transactionId, 55)
  assert.equal(state.borrowInserts, 1)
  assert.equal(state.commits, 1)
  assert.equal(state.rollbacks, 0)
})

test('physical desk fulfillment activates only the matching ready reservation claim', async () => {
  const { state, database } = checkoutPool('Student', 1, true)
  const result = await createCirculationService(database, () => new Date(2026, 7, 24, 14, 0))
    .fulfillClaim({ accountId: 1, role: 'Librarian' }, { barcode: 'book-20', school_id: 'sti-7' })
  assert.equal(result.transactionId, 54)
  assert.equal(result.status, 'Borrowed')
  assert.equal(state.borrowInserts, 0)
  assert.equal(state.commits, 1)
})

test('physical desk fulfillment accepts an online-cart pending claim without a reservation link', async () => {
  const { state, database } = checkoutPool('Student', 1, 'cart')
  const result = await createCirculationService(database, () => new Date(2026, 7, 24, 14, 0))
    .fulfillClaim({ accountId: 1, role: 'Librarian' }, { barcode: 'book-20', school_id: 'sti-7' })
  assert.equal(result.transactionId, 54)
  assert.equal(result.status, 'Borrowed')
  assert.equal(state.commits, 1)
})

test('return assigns the copy to the first waiting reservation atomically', async () => {
  const state = { commits: 0, rollbacks: 0, readyUpdates: 0, reservedUpdates: 0 }
  const connection = {
    async beginTransaction() {}, async commit() { state.commits += 1 }, async rollback() { state.rollbacks += 1 }, release() {},
    async execute(sql: string) {
      if (sql.includes('SELECT user_id FROM accounts')) return [[{ user_id: 2 }]]
      if (sql.includes('FROM borrow_transactions bt')) return [[{ transaction_id: 8, user_id: 7, material_id: 30, physical_copy_id: 20, due_at: new Date(), transaction_status: 'Borrowed', title_id: 10, accession_number: 'ACC-20', title: 'Clean Code' }]]
      if (sql.startsWith("UPDATE borrow_transactions")) return [{ affectedRows: 1 }]
      if (sql.includes('SELECT reservation_id, user_id, queue_position')) return [[{ reservation_id: 99, user_id: 11, queue_position: 1 }]]
      if (sql.includes("reservation_status = 'ready_for_pickup'")) { state.readyUpdates += 1; return [{ affectedRows: 1 }] }
      if (sql.includes('INSERT INTO borrow_transactions')) return [{ insertId: 91, affectedRows: 1 }]
      if (sql.includes("availability_status = 'Reserved'")) { state.reservedUpdates += 1; return [{ affectedRows: 1 }] }
      if (sql.includes('INSERT INTO notifications') || sql.includes('INSERT INTO admin_notifications')) return [{ insertId: 1, affectedRows: 1 }]
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  const result = await createCirculationService({ getConnection: async () => connection } as unknown as Pool).returnBook(1, 8)
  assert.equal(result.nextReservationId, 99); assert.equal(result.copyAvailability, 'Reserved')
  assert.equal(state.readyUpdates, 1); assert.equal(state.reservedUpdates, 2); assert.equal(state.commits, 1); assert.equal(state.rollbacks, 0)
})

test('librarian cancellation releases a pending physical copy and commits the audit event', async () => {
  const state = { commits: 0, rollbacks: 0, transactionStatus: '', copyStatus: '', materialStatus: '', notifications: 0 }
  const connection = {
    async beginTransaction() {}, async commit() { state.commits += 1 }, async rollback() { state.rollbacks += 1 }, release() {},
    async execute(sql: string, values: unknown[] = []) {
      if (sql.includes('SELECT user_id FROM accounts')) return [[{ user_id: 99 }]]
      if (sql.includes('FROM borrow_transactions bt') && sql.includes('COALESCE(t.title')) return [[{
        transaction_id: 41, user_id: 7, material_id: 30, physical_copy_id: 20,
        transaction_status: 'Pending', title_id: 10, condition_status: 'Good', lifecycle_status: 'Active', title: 'Clean Code',
      }]]
      if (sql.includes('FROM reservations')) return [[]]
      if (sql.startsWith('UPDATE borrow_transactions')) { state.transactionStatus = String(values[0]); return [{ affectedRows: 1 }] }
      if (sql.startsWith('UPDATE physical_copies')) { state.copyStatus = String(values[0]); return [{ affectedRows: 1 }] }
      if (sql.startsWith('UPDATE materials')) { state.materialStatus = String(values[0]); return [{ affectedRows: 1 }] }
      if (sql.includes('INSERT INTO admin_notifications')) { state.notifications += 1; return [{ insertId: 1 }] }
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  const result = await createCirculationService({ getConnection: async () => connection } as unknown as Pool, () => new Date('2026-08-24T10:00:00+08:00'))
    .cancelRequest({ accountId: 3, role: 'Librarian' }, 41, { reason: 'Student cancelled verbally.' })
  assert.equal(result.status, 'Cancelled')
  assert.equal(result.copyAvailability, 'Available')
  assert.equal(state.copyStatus, 'Available'); assert.equal(state.materialStatus, 'Available')
  assert.equal(state.notifications, 1); assert.equal(state.commits, 1); assert.equal(state.rollbacks, 0)
})

test('student owner can cancel their pending request while another student is forbidden', async () => {
  function databaseFor(actorUserId: number) {
    const state = { commits: 0, rollbacks: 0 }
    const connection = {
      async beginTransaction() {}, async commit() { state.commits += 1 }, async rollback() { state.rollbacks += 1 }, release() {},
      async execute(sql: string) {
        if (sql.includes('SELECT user_id FROM accounts')) return [[{ user_id: actorUserId }]]
        if (sql.includes('FROM borrow_transactions bt') && sql.includes('COALESCE(t.title')) return [[{
          transaction_id: 42, user_id: 7, material_id: 31, physical_copy_id: 21,
          transaction_status: 'Pending', title_id: 11, condition_status: 'Good', lifecycle_status: 'Active', title: 'Networks',
        }]]
        if (sql.includes('FROM reservations')) return [[]]
        if (sql.startsWith('UPDATE ') || sql.includes('INSERT INTO admin_notifications')) return [{ affectedRows: 1 }]
        throw new Error(`Unexpected SQL: ${sql}`)
      },
    }
    return { state, database: { getConnection: async () => connection } as unknown as Pool }
  }

  const owner = databaseFor(7)
  const result = await createCirculationService(owner.database).cancelRequest({ accountId: 7, role: 'Student' }, 42, {})
  assert.equal(result.status, 'Cancelled'); assert.equal(owner.state.commits, 1)

  const stranger = databaseFor(8)
  await assert.rejects(
    createCirculationService(stranger.database).cancelRequest({ accountId: 8, role: 'Student' }, 42, {}),
    (error: unknown) => error instanceof HttpError && error.status === 403 && error.code === 'BORROW_REQUEST_NOT_OWNED',
  )
  assert.equal(stranger.state.commits, 0); assert.equal(stranger.state.rollbacks, 1)
})

test('borrowing history exposes the normalized title cover path', async () => {
  const database = {
    async execute(sql: string) {
      if (sql.includes('SELECT user_id, role FROM accounts')) return [[{ user_id: 7, role: 'Student' }]]
      if (sql.includes('FROM borrow_transactions bt INNER JOIN materials')) return [[{
        transaction_id: 41, title_id: 9, title: 'Clean Code', author: 'Robert C. Martin',
        cover_image_path: '/api/assets/covers/clean-code.png', accession_number: 'ACC-9', barcode: 'BOOK-9',
        borrowed_at: null, due_at: null, returned_at: null, transaction_status: 'Pending',
      }]]
      if (sql.includes('COUNT(*) AS total FROM borrow_transactions')) return [[{ total: 1 }]]
      if (sql.includes('AS active_loans')) return [[{ active_loans: 1, active_reservations: 0, next_due_at: null }]]
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  } as unknown as Pool

  const result = await createCirculationService(database).history(1, { page: 1, limit: 25 })
  assert.equal(result.items[0].coverImagePath, '/api/assets/covers/clean-code.png')
})

function eligibilityPool(row: Record<string, unknown> | null, loans: Array<Record<string, unknown>> = []) {
  return {
    async execute(sql: string, params: unknown[]) {
      if (sql.includes('FROM users u')) {
        assert.match(sql, /lost_confirmed_at IS NULL/)
        assert.deepEqual(params, ['STI-7'])
        return [row ? [row] : []]
      }
      if (sql.includes('FROM borrow_transactions bt')) {
        assert.deepEqual(params, [row?.user_id])
        return [loans]
      }
      if (sql.includes('unpaid_replacement_count')) {
        assert.deepEqual(params, [row?.user_id, row?.user_id, row?.user_id])
        return [[{ overdue_count: 0, unpaid_fine_count: 0, unpaid_replacement_count: 0 }]]
      }
      if (sql.includes("reservation_status='ready_for_pickup'")) {
        assert.deepEqual(params, [row?.user_id])
        return [[]]
      }
      if (sql.includes('FROM attendance_logs')) {
        assert.deepEqual(params, [row?.user_id])
        return [[]]
      }
      throw new Error(`Unexpected eligibility SQL: ${sql}`)
    },
  } as unknown as Pool
}

test('checkout scan rejects a student who already holds the two-book limit', async () => {
  const result = await createCirculationService(eligibilityPool({
    user_id: 7, full_name: 'Ada Student', school_id: 'STI-7', role_name: 'Student', account_status: 'Active', active_loans: 2,
  })).checkoutEligibility('sti-7')
  assert.equal(result.allowed, false)
  assert.equal(result.activeLoans, 2)
  assert.equal(result.loanLimit, 2)
  assert.deepEqual(result.openLoans, [])
  assert.match(result.message ?? '', /2 active loans/)
})

test('checkout scan includes open loans so a blocked student can be returned from the desk', async () => {
  const result = await createCirculationService(eligibilityPool({
    user_id: 7, full_name: 'Ada Student', school_id: 'STI-7', role_name: 'Student', account_status: 'Active', active_loans: 2,
  }, [
    { transaction_id: 11, title: 'Clean Code', accession_number: 'ACC-11', barcode: 'BOOK-11', due_at: '2026-08-24T08:59:00', transaction_status: 'Borrowed' },
    { transaction_id: 12, title: 'Database Systems', accession_number: null, barcode: 'BOOK-12', due_at: '2026-08-23T08:59:00', transaction_status: 'Overdue' },
  ])).checkoutEligibility('sti-7')
  assert.equal(result.allowed, false)
  assert.deepEqual(result.openLoans, [
    { transactionId: 11, title: 'Clean Code', accessionNumber: 'ACC-11', barcode: 'BOOK-11', dueDate: '2026-08-24T08:59:00', status: 'Borrowed' },
    { transactionId: 12, title: 'Database Systems', accessionNumber: null, barcode: 'BOOK-12', dueDate: '2026-08-23T08:59:00', status: 'Overdue' },
  ])
})

test('checkout scan still accepts a student with an open loan slot', async () => {
  const result = await createCirculationService(eligibilityPool({
    user_id: 7, full_name: 'Ada Student', school_id: 'STI-7', role_name: 'Student', account_status: 'Active', active_loans: 1,
  })).checkoutEligibility('STI-7')
  assert.equal(result.allowed, true)
  assert.deepEqual(result.openLoans, [])
  assert.equal(result.message, null)
})

test('checkout scan does not apply the student loan cap to faculty', async () => {
  const result = await createCirculationService(eligibilityPool({
    user_id: 8, full_name: 'Jun Faculty', school_id: 'STI-7', role_name: 'Faculty', account_status: 'Active', active_loans: 6,
  })).checkoutEligibility('STI-7')
  assert.equal(result.allowed, true)
  assert.equal(result.loanLimit, null)
})
