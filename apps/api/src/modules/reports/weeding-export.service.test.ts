import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { createWeedingCsvStream, type WeedingExportRow } from './weeding-export.service.ts'
import { CSV_INTEGRITY_MARKER, verifyIntegrityProtectedCsv } from './csv-integrity.ts'

async function* rows(): AsyncGenerator<WeedingExportRow> {
  yield {
    title: 'Clean Code',
    authors: 'Robert C. Martin',
    category: 'Programming',
    copyrightYear: '2008',
    publicationYear: '2009',
    ageYears: '18',
    activeCopies: '2',
    reviewStatus: 'Review for weeding',
  }
}

async function collect(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []
  stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
  await once(stream, 'end')
  return Buffer.concat(chunks)
}

test('streams a weeding review CSV with copyright year columns', async () => {
  const buffer = await collect(createWeedingCsvStream(rows()))
  const output = buffer.toString('utf8')
  assert.match(output, /Copyright Year/)
  assert.match(output, /Clean Code/)
  assert.match(output, /Review for weeding/)
  assert.match(output, new RegExp(CSV_INTEGRITY_MARKER))
  assert.deepEqual(verifyIntegrityProtectedCsv(buffer), { valid: true, dataset: 'weeding_list' })
})
