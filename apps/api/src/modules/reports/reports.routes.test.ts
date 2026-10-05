import assert from 'node:assert/strict'
import test from 'node:test'
import express from 'express'
import request from 'supertest'
import { createCsvStream, createInventoryPdf, type InventoryExportRow } from './catalog-export.service.ts'
import { createWeedingCsvStream, createWeedingPdf, type WeedingExportRow } from './weeding-export.service.ts'
import { createReportsRouter } from './reports.routes.ts'

const row: InventoryExportRow = {
  recordType: 'Book', title: 'Database Systems', authors: 'SmartLib QA', isbn: '9780132350884',
  category: 'Programming', publicationYear: '2026', copyrightYear: '2018', weedingReview: 'Review for weeding',
  accessionNumber: 'ACC-001', barcode: 'BC-001',
  shelfLocation: 'Shelf A-1', condition: 'Good', availability: 'Available', researchCode: '', adviser: '',
}

const weedingRow: WeedingExportRow = {
  title: 'Database Systems', authors: 'SmartLib QA', category: 'Programming',
  copyrightYear: '2018', publicationYear: '2026', ageYears: '8', activeCopies: '2', reviewStatus: 'Review for weeding',
}

function appFor(role: string) {
  const app = express()
  app.use((_request, response, next) => { response.locals.authenticatedUser = { role }; next() })
  app.use('/api/reports', createReportsRouter({
    rows: async function* () { yield row },
    csv: createCsvStream,
    pdf: createInventoryPdf,
    weeding: async function* () { yield weedingRow },
    weedingCsv: createWeedingCsvStream,
    weedingPdf: createWeedingPdf,
    notifyWeeding: async () => 1,
  }))
  return app
}

test('authorized Librarian streams a CSV attachment with inventory rows', async () => {
  const response = await request(appFor('Librarian')).get('/api/reports/catalog/inventory.csv')
  assert.equal(response.status, 200)
  assert.match(response.headers['content-type'], /text\/csv/)
  assert.match(response.headers['content-disposition'], /sti-library-inventory\.csv/)
  assert.equal(response.headers['x-smartlib-csv-integrity'], 'HMAC-SHA256; version=v1')
  assert.match(response.text, /Database Systems/)
  assert.match(response.text, /Copyright Year/)
  assert.match(response.text, /Weeding Review/)
})

test('authorized Librarian streams a valid PDF attachment', async () => {
  const response = await request(appFor('Librarian')).get('/api/reports/catalog/inventory.pdf').buffer(true)
  assert.equal(response.status, 200)
  assert.match(response.headers['content-type'], /application\/pdf/)
  assert.match(response.headers['content-disposition'], /sti-library-inventory\.pdf/)
  assert.equal(Buffer.from(response.body).subarray(0, 5).toString('ascii'), '%PDF-')
})

test('authorized Librarian streams the weeding review CSV', async () => {
  const response = await request(appFor('Librarian')).get('/api/reports/catalog/weeding.csv')
  assert.equal(response.status, 200)
  assert.match(response.headers['content-disposition'], /sti-library-weeding-list\.csv/)
  assert.match(response.text, /Review for weeding/)
})

test('Student cannot download administrative inventory reports', async () => {
  const response = await request(appFor('Student')).get('/api/reports/catalog/inventory.csv')
  assert.equal(response.status, 403)
  assert.equal(response.body.code, 'CATALOG_ADMIN_FORBIDDEN')
})
