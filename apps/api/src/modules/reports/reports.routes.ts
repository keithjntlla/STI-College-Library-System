import { Router } from 'express'
import { reports } from '../../data/mock-data.ts'
import { ok } from '../../core/http.ts'
import { requireCatalogManager } from '../catalog/catalog.rbac.ts'
import { parseCatalogSearchFilters } from '../catalog/catalog-search.repository.ts'
import { createCsvStream, createInventoryPdf, inventoryRows, type InventoryExportRow } from './catalog-export.service.ts'
import {
  createWeedingCsvStream,
  createWeedingPdf,
  notifyWeedingCrossings,
  weedingRows,
  type WeedingExportRow,
} from './weeding-export.service.ts'

type ExportDependencies = {
  rows: (filters: ReturnType<typeof parseCatalogSearchFilters>) => AsyncIterable<InventoryExportRow>
  csv: typeof createCsvStream
  pdf: typeof createInventoryPdf
  weeding: () => AsyncIterable<WeedingExportRow>
  weedingCsv: typeof createWeedingCsvStream
  weedingPdf: typeof createWeedingPdf
  notifyWeeding: typeof notifyWeedingCrossings
}

export function createReportsRouter(dependencies: ExportDependencies = {
  rows: inventoryRows,
  csv: createCsvStream,
  pdf: createInventoryPdf,
  weeding: weedingRows,
  weedingCsv: createWeedingCsvStream,
  weedingPdf: createWeedingPdf,
  notifyWeeding: notifyWeedingCrossings,
}) {
  const router = Router()
  router.get('/', (_request, response) => ok(response, reports))

  router.get('/catalog/inventory.csv', requireCatalogManager, (request, response, next) => {
    try {
      const filters = parseCatalogSearchFilters(request.query as Record<string, unknown>)
      response.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sti-library-inventory.csv"',
        'Cache-Control': 'private, no-store',
        'X-SmartLib-CSV-Integrity': 'HMAC-SHA256; version=v1',
      })
      dependencies.csv(dependencies.rows(filters)).on('error', next).pipe(response)
    } catch (error) { next(error) }
  })

  router.get('/catalog/inventory.pdf', requireCatalogManager, (request, response, next) => {
    try {
      const filters = parseCatalogSearchFilters(request.query as Record<string, unknown>)
      response.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="sti-library-inventory.pdf"',
        'Cache-Control': 'private, no-store',
      })
      dependencies.pdf(dependencies.rows(filters)).on('error', next).pipe(response)
    } catch (error) { next(error) }
  })

  router.get('/catalog/weeding.csv', requireCatalogManager, async (_request, response, next) => {
    try {
      await dependencies.notifyWeeding()
      response.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sti-library-weeding-list.csv"',
        'Cache-Control': 'private, no-store',
        'X-SmartLib-CSV-Integrity': 'HMAC-SHA256; version=v1',
      })
      dependencies.weedingCsv(dependencies.weeding()).on('error', next).pipe(response)
    } catch (error) { next(error) }
  })

  router.get('/catalog/weeding.pdf', requireCatalogManager, async (_request, response, next) => {
    try {
      await dependencies.notifyWeeding()
      response.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="sti-library-weeding-list.pdf"',
        'Cache-Control': 'private, no-store',
      })
      dependencies.weedingPdf(dependencies.weeding()).on('error', next).pipe(response)
    } catch (error) { next(error) }
  })

  return router
}

export const reportsRouter = createReportsRouter()
