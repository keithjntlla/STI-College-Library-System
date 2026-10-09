import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'mysql2/promise'
import { createBookArchive } from './book-archive.ts'

test('book archive list merges archived titles and orphan archived copies', async () => {
  const database = {
    async execute(sql: string) {
      if (sql.includes("t.lifecycle_status='Archived'") && sql.includes('FROM titles t')) {
        return [[{
          titleId: 10, title: 'Archived Title', isbn: '9780000000001', archivedAt: '2026-10-01T00:00:00.000Z',
          reason: 'Weeding', archivedBy: 'LIB-001', authors: 'Ada', copyCount: 2,
        }]]
      }
      if (sql.includes("pc.lifecycle_status='Archived'") && sql.includes("t.lifecycle_status='Active'")) {
        return [[{
          titleId: 11, title: 'Active Title', isbn: null, copyId: 55, accession: 'ACC-55', barcode: 'BC-55',
          archivedAt: '2026-10-02T00:00:00.000Z', reason: 'Damaged', archivedBy: 'Desk Staff', authors: 'Bob',
        }]]
      }
      throw new Error(`Unexpected list SQL: ${sql}`)
    },
  } as unknown as Pool

  const rows = await createBookArchive(database).list('')
  assert.equal(rows.length, 2)
  assert.equal(rows[0]?.recordKind, 'Archived copy')
  assert.equal(rows[0]?.copyId, 55)
  assert.equal(rows[1]?.recordKind, 'Archived title')
  assert.equal(rows[1]?.titleId, 10)
})

test('book archive detail returns archived copies and audit events for a title', async () => {
  const database = {
    async execute(sql: string) {
      if (sql.includes('FROM titles t') && sql.includes('t.title_id=?')) {
        return [[{
          titleId: 10, title: 'Archived Title', isbn: null, publisher: null, publicationYear: 2020,
          archivedAt: '2026-10-01T00:00:00.000Z', reason: 'Weeding', archivedBy: 'LIB-001', authors: 'Ada',
        }]]
      }
      if (sql.includes('"borrowingCount"') || sql.includes('AS "borrowingCount"')) {
        return [[{ copyId: 55, accession: 'ACC-55', barcode: 'BC-55', shelf: 'A-1', condition: 'Good', archivedAt: '2026-10-01T00:00:00.000Z', reason: 'Weeding', borrowingCount: 1 }]]
      }
      if (sql.includes('JOIN borrow_transactions') || sql.includes('FROM borrow_transactions')) return [[]]
      if (sql.includes('inventory_audit_events')) {
        return [[{ eventId: 7, eventType: 'Archived', reason: 'Weeding', staffLabel: 'LIB-001', createdAt: '2026-10-01T00:00:00.000Z', accession: 'ACC-55' }]]
      }
      throw new Error(`Unexpected detail SQL: ${sql}`)
    },
  } as unknown as Pool

  const detail = await createBookArchive(database).detail(10)
  assert.equal(detail.titleId, 10)
  assert.equal(detail.copies.length, 1)
  assert.equal(detail.auditEvents[0]?.eventType, 'Archived')
})
