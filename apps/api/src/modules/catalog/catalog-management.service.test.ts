import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'mysql2/promise'
import { HttpError } from '../../core/http-error.ts'
import { createCatalogManagementService } from './catalog-management.service.ts'

function catalogPool(options: { recordType?: 'Book' | 'Research/Thesis'; rowVersion?: number } = {}) {
  const state = { commits: 0, rollbacks: 0, statements: [] as Array<{ sql: string; values: unknown[] }> }
  const recordType = options.recordType ?? 'Book'
  const connection = {
    async beginTransaction() {},
    async commit() { state.commits += 1 },
    async rollback() { state.rollbacks += 1 },
    release() {},
    async execute(sql: string, values: unknown[] = []) {
      state.statements.push({ sql, values })
      if (sql.includes('FROM titles t') && sql.includes('LIMIT 1 FOR UPDATE')) return [[{
        title_id: 14, title: 'Harry Potter', record_type: recordType, lifecycle_status: 'Active',
        category_id: 2, category_name: 'Action', category_shelf_location: 'Shelf A', row_version: options.rowVersion ?? 3,
      }]]
      if (sql.includes('FROM categories c') && sql.includes('floor_plan_shelves')) return [[{
        category_id: 8, category_name: 'Fantasy', shelf_location: 'Shelf F', shelf_id: 11,
      }]]
      if (sql.includes('FROM physical_copies') && sql.includes('FOR UPDATE')) return [[
        { physical_copy_id: 30, material_id: 40, shelf_location: 'Shelf A' },
        { physical_copy_id: 31, material_id: 41, shelf_location: 'Shelf A' },
      ]]
      if (sql.includes('FROM research_inventory') && sql.includes('FOR UPDATE')) return [[
        { research_inventory_id: 51, shelf_location: 'Shelf A' },
      ]]
      if (sql.startsWith('UPDATE') || sql.includes('UPDATE ')) return [{ affectedRows: 1 }]
      if (sql.includes('INSERT INTO floor_plan_events')) return [{ insertId: 1 }]
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  return { state, database: { getConnection: async () => connection } as unknown as Pool }
}

test('changes a book title category and synchronizes every active physical copy in one audited transaction', async () => {
  const { state, database } = catalogPool()
  const result = await createCatalogManagementService(database).changeTitleCategory(14, { targetCategoryId: 8, expectedRowVersion: 3 }, 5)
  assert.equal(result.categoryName, 'Fantasy')
  assert.equal(result.shelfLocation, 'Shelf F')
  assert.equal(result.bookCopies, 2)
  assert.equal(result.researchCopies, 0)
  assert.equal(result.rowVersion, 4)
  assert.equal(state.commits, 1)
  assert.equal(state.rollbacks, 0)
  assert.ok(state.statements.some(({ sql, values }) => sql.includes('UPDATE physical_copies') && values[0] === 'Shelf F'))
  assert.ok(state.statements.some(({ sql, values }) => sql.includes('UPDATE materials') && values[0] === 8 && values[1] === 'Shelf F'))
  assert.ok(state.statements.some(({ sql }) => sql.includes('INSERT INTO floor_plan_events')))
})

test('changes a research title category and synchronizes its active research inventory', async () => {
  const { state, database } = catalogPool({ recordType: 'Research/Thesis' })
  const result = await createCatalogManagementService(database).changeTitleCategory(14, { targetCategoryId: 8, expectedRowVersion: 3 }, 5)
  assert.equal(result.researchCopies, 1)
  assert.equal(result.bookCopies, 0)
  assert.ok(state.statements.some(({ sql, values }) => sql.includes('UPDATE research_inventory') && values[0] === 'Shelf F'))
  assert.equal(state.statements.some(({ sql }) => sql.includes('UPDATE physical_copies')), false)
})

test('rolls back a stale category change without updating inventory', async () => {
  const { state, database } = catalogPool({ rowVersion: 4 })
  await assert.rejects(
    createCatalogManagementService(database).changeTitleCategory(14, { targetCategoryId: 8, expectedRowVersion: 3 }, 5),
    (error: unknown) => error instanceof HttpError && error.status === 409 && error.code === 'CATALOG_TITLE_CHANGED',
  )
  assert.equal(state.commits, 0)
  assert.equal(state.rollbacks, 1)
  assert.equal(state.statements.some(({ sql }) => sql.includes('UPDATE physical_copies')), false)
})

function archivePool(options: { loan?: boolean; reservation?: boolean } = {}) {
  const state = { commits: 0, rollbacks: 0, statements: [] as Array<{ sql: string; values: unknown[] }> }
  const connection = {
    async beginTransaction() {},
    async commit() { state.commits += 1 },
    async rollback() { state.rollbacks += 1 },
    release() {},
    async execute(sql: string, values: unknown[] = []) {
      state.statements.push({ sql, values })
      if (sql.includes('FROM titles t') && sql.includes('LIMIT 1 FOR UPDATE')) {
        return [[{ title_id: 14, title: 'Clean Code', record_type: 'Book', lifecycle_status: 'Active', category_id: 2, row_version: 1 }]]
      }
      if (sql.includes('transaction_status IN') && sql.includes('Pending')) {
        return [options.loan ? [{ physical_copy_id: 30, accession_number: 'ACC-30', transaction_id: 9, transaction_status: 'Pending' }] : []]
      }
      if (sql.includes('FROM reservations') || sql.includes('reservation_status')) {
        return [options.reservation ? [{ reservation_id: 3 }] : []]
      }
      if (sql.includes('FROM accounts a')) return [[{ user_id: 5, label: 'Ma\'am Juday' }]]
      if (sql.includes('INSERT INTO inventory_audit_events')) return [{ affectedRows: 2 }]
      if (sql.startsWith('UPDATE') || sql.includes('UPDATE ')) return [{ affectedRows: 1 }]
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  return { state, database: { getConnection: async () => connection } as unknown as Pool }
}

test('archives a book title, writes per-copy audit rows, and commits', async () => {
  const { state, database } = archivePool()
  const result = await createCatalogManagementService(database).archiveTitle(14, 'Book', 'Outdated edition', 9)
  assert.equal(result.lifecycleStatus, 'Archived')
  assert.equal(result.reason, 'Outdated edition')
  assert.equal(state.commits, 1)
  assert.ok(state.statements.some(({ sql }) => sql.includes('INSERT INTO inventory_audit_events')))
  assert.ok(state.statements.some(({ sql }) => sql.includes("lifecycle_status = 'Archived'") && sql.includes('FROM titles') === false))
})

test('blocks title archive while a pending claim exists', async () => {
  const { state, database } = archivePool({ loan: true })
  await assert.rejects(
    createCatalogManagementService(database).archiveTitle(14, 'Book', 'Weeding review', 9),
    (error: unknown) => error instanceof HttpError && error.code === 'PHYSICAL_COPY_HAS_ACTIVE_LOAN',
  )
  assert.equal(state.commits, 0)
  assert.equal(state.rollbacks, 1)
})

test('blocks title archive while an active reservation exists', async () => {
  const { state, database } = archivePool({ reservation: true })
  await assert.rejects(
    createCatalogManagementService(database).archiveTitle(14, 'Book', 'Weeding review', 9),
    (error: unknown) => error instanceof HttpError && error.code === 'TITLE_HAS_ACTIVE_RESERVATION',
  )
  assert.equal(state.commits, 0)
  assert.equal(state.rollbacks, 1)
})
