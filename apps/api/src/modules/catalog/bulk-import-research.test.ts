import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { HttpError } from '../../core/http-error.ts'
import { bulkImportResearch } from './bulk-import.service.ts'
import { resolveAllowedResearchProgram } from './research-programs.ts'

test('resolves campus research programs case-insensitively', () => {
  assert.equal(
    resolveAllowedResearchProgram('bachelor of science in information technology'),
    'Bachelor of Science in Information Technology',
  )
  assert.equal(resolveAllowedResearchProgram('Unknown College Track'), null)
})

test('bulkImportResearch rejects unknown departments before writing', async () => {
  const filePath = path.join(os.tmpdir(), `research-import-${Date.now()}.csv`)
  fs.writeFileSync(
    filePath,
    [
      'Title,Authors,Adviser,Publication_Year,Department_Or_Program,Research_Code,Abstract,Keywords,Shelf_Location',
      'Sample Thesis,Jane Doe,Prof. Smith,2024,Unknown Department,RES-UNKNOWN-1,This abstract is long enough for validation.,keywords,Shelf A-1',
    ].join('\n'),
  )

  const database = {
    getConnection: async () => ({
      beginTransaction: async () => undefined,
      commit: async () => undefined,
      rollback: async () => undefined,
      release: () => undefined,
      execute: async () => [[]],
    }),
  }

  await assert.rejects(
    () => bulkImportResearch(filePath, database as never),
    (error: unknown) => {
      assert.ok(error instanceof HttpError)
      assert.equal(error.code, 'CSV_INVALID')
      assert.match(error.message, /Department_Or_Program/)
      return true
    },
  )

  fs.unlinkSync(filePath)
})

test('bulkImportResearch creates a thesis when shelf and program are valid', async () => {
  const filePath = path.join(os.tmpdir(), `research-import-ok-${Date.now()}.csv`)
  fs.writeFileSync(
    filePath,
    [
      'Title,Authors,Adviser,Publication_Year,Department_Or_Program,Research_Code,Abstract,Keywords,Shelf_Location',
      'Campus Network Audit,Ana Reyes; Luis Cruz,Prof. Dela Cruz,2025,Bachelor of Science in Information Technology,RES-IT-2025-01,This abstract describes a campus network audit for STI Ormoc.,networks;security,Shelf A-1',
    ].join('\n'),
  )

  const inserts: string[] = []
  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined,
    execute: async (sql: string) => {
      const normalized = sql.replace(/\s+/g, ' ')
      if (normalized.includes('FROM categories WHERE shelf_location') || normalized.includes('FROM floor_plan_shelves')) {
        return [[{ category_id: 1 }]]
      }
      if (normalized.includes('FROM research_records') && normalized.includes('research_code')) {
        return [[]]
      }
      if (normalized.includes('INSERT INTO barcode_sequences') || normalized.includes('INSERT INTO barcode_sequences'.toUpperCase())) {
        return [{ insertId: 0, affectedRows: 1 }]
      }
      if (normalized.includes('FROM barcode_sequences') && normalized.includes('FOR UPDATE')) {
        return [[{ last_value: 4 }]]
      }
      if (normalized.includes('UPDATE barcode_sequences')) {
        return [{ affectedRows: 1 }]
      }
      if (normalized.includes('INSERT INTO titles')) {
        inserts.push('titles')
        return [{ insertId: 501 }]
      }
      if (normalized.includes('INSERT INTO authors')) {
        inserts.push('authors')
        return [{ insertId: 1 }]
      }
      if (normalized.includes('INSERT INTO research_records')) {
        inserts.push('research_records')
        return [{ insertId: 601 }]
      }
      if (normalized.includes('INSERT INTO research_inventory')) {
        inserts.push('research_inventory')
        return [{ insertId: 701 }]
      }
      return [{ insertId: 1, affectedRows: 1 }]
    },
  }

  const result = await bulkImportResearch(filePath, {
    getConnection: async () => connection,
  } as never)

  assert.equal(result.thesesCreated, 1)
  assert.ok(inserts.includes('titles'))
  assert.ok(inserts.includes('authors'))
  assert.ok(inserts.includes('research_records'))
  assert.ok(inserts.includes('research_inventory'))
  fs.unlinkSync(filePath)
})
