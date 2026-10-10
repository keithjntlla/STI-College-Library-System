import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'mysql2/promise'
import { applyChedHoldings, BOOK_WIPE_STATEMENTS, HoldingsImportError } from './ched-holdings-import.ts'
import type { HoldingsCatalog } from './ched-holdings.ts'

const catalog: HoldingsCatalog = {
  categories: [{
    name: 'LANGUAGE', shelfLocation: 'GE', description: 'GE holdings: LANGUAGE', programNames: ['General Education'],
  }],
  skipped: [],
  isbnIssues: [],
  titles: [{
    sheetCode: 'GE',
    sourceRows: [7],
    categoryName: 'LANGUAGE',
    shelfLocation: 'GE',
    programNames: ['General Education'],
    title: 'Pocketbook of English Grammar (2nd edition)',
    authors: ['Leo Finkelstein, Jr.'],
    isbn: null,
    publicationYear: null,
    publisher: null,
    accessions: ['GE-0007-1', 'GE-0007-2'],
  }],
}

function fakePool(openLoans: number) {
  const state = { sql: [] as string[], commits: 0, rollbacks: 0, copyBarcodes: [] as unknown[] }
  let categoryId = 0
  let titleId = 0
  let materialId = 0
  const connection = {
    async beginTransaction() {},
    async commit() { state.commits += 1 },
    async rollback() { state.rollbacks += 1 },
    release() {},
    async execute(sql: string, parameters: unknown[] = []) {
      state.sql.push(sql)
      if (sql.includes('AS open_loans')) return [[{ open_loans: openLoans }]]
      if (sql.startsWith('DELETE') || sql.startsWith('UPDATE')) return [{ affectedRows: 0 }]
      if (sql.includes('FROM categories WHERE')) return [categoryId ? [[{ category_id: categoryId }]] : [[]]]
      if (sql.includes('INSERT INTO categories')) { categoryId = 4; return [{ insertId: categoryId }] }
      if (sql.includes('FROM programs WHERE')) return [[{ program_id: 8 }]]
      if (sql.includes('INSERT INTO programs')) return [{ insertId: 8 }]
      if (sql.includes('INSERT INTO program_categories')) return [{ affectedRows: 1 }]
      if (sql.includes('INSERT INTO titles')) { titleId += 1; return [{ insertId: 20 + titleId }] }
      if (sql.includes('INSERT INTO authors')) return [{ insertId: 1 }]
      if (sql.includes('INSERT INTO materials')) { materialId += 1; return [{ insertId: 70 + materialId }] }
      if (sql.includes('INSERT INTO physical_copies')) { state.copyBarcodes.push(parameters[2]); return [{ insertId: 90 }] }
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  return { state, database: { getConnection: async () => connection } as unknown as Pool }
}

test('refuses to replace the catalog while a book is borrowed or reserved, and ignores a confirmed loss', async () => {
  const { state, database } = fakePool(2)
  await assert.rejects(() => applyChedHoldings(database, catalog), (error: unknown) => (
    error instanceof HoldingsImportError && /borrowed or reserved/.test(error.message)
  ))
  assert.equal(state.commits, 0)
  assert.equal(state.rollbacks, 1)
  assert.equal(state.sql.some((sql) => sql.includes('INSERT INTO titles')), false)
  assert.match(state.sql[0] ?? '', /lost_confirmed_at IS NULL/)
})

test('removes only book rows, then stores generated accession numbers as barcodes', async () => {
  const { state, database } = fakePool(0)
  const result = await applyChedHoldings(database, catalog)
  assert.deepEqual(result, { titles: 1, copies: 2, categories: 1 })
  assert.equal(state.commits, 1)
  const wipeStart = state.sql.findIndex((sql) => sql.startsWith('DELETE'))
  const insertStart = state.sql.findIndex((sql) => sql.includes('INSERT INTO titles'))
  assert.ok(wipeStart > 0 && insertStart > wipeStart)
  assert.ok(state.sql.some((sql) => sql.includes("record_type = 'Book'") && sql.startsWith('DELETE FROM titles')))
  assert.equal(state.sql.filter((sql) => sql.startsWith('DELETE') || sql.startsWith('UPDATE')).length, BOOK_WIPE_STATEMENTS.length)
  assert.deepEqual(state.copyBarcodes, ['GE-0007-1', 'GE-0007-2'])
  const titleInsert = state.sql.find((sql) => sql.includes('INSERT INTO titles')) ?? ''
  assert.match(titleInsert, /copyright_year/)
  assert.doesNotMatch(titleInsert, /Research/)
})
