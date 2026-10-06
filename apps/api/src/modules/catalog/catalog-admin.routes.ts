import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import fs from 'fs'
import { requireJwtRoles } from '../auth/jwt-auth.middleware.ts'
import { catalogController } from './catalog.controller.ts'
import { bookArchive } from './book-archive.ts'
import { bookQuotationController, quotationUpload } from './book-quotation.ts'

const upload = multer({ dest: 'uploads/' })

type Controller = Pick<typeof catalogController, 'changeTitleCategory' | 'bulkImport' | 'bulkImportResearch'>

export function createCatalogAdminRouter(controller: Controller = catalogController) {
  const router = Router()
  const get = (fn: (request: Request) => Promise<unknown>) => (request: Request, response: Response, next: NextFunction) => {
    void fn(request).then(data => response.json({ success: true, data })).catch(next)
  }
  router.get('/archive', requireJwtRoles('Librarian'), get(request => bookArchive.list(request.query.q)))
  router.get('/archive/deleted-snapshots', requireJwtRoles('Librarian'), get(request => bookArchive.deletedSnapshots(request.query.q)))
  router.get('/archive/:titleId', requireJwtRoles('Librarian'), get(request => bookArchive.detail(request.params.titleId)))
  router.patch('/titles/:titleId/category', requireJwtRoles('Librarian'), controller.changeTitleCategory)
  router.get('/titles/:titleId/quotations', requireJwtRoles('Librarian'), bookQuotationController.list)
  router.post('/titles/:titleId/quotations', requireJwtRoles('Librarian'), quotationUpload, bookQuotationController.upload)
  router.get('/titles/:titleId/quotations/:quotationId/file', requireJwtRoles('Librarian'), bookQuotationController.download)
  router.post('/bulk-import', requireJwtRoles('Librarian', 'Admin'), upload.single('file'), controller.bulkImport)
  router.post('/bulk-import-research', requireJwtRoles('Librarian', 'Admin'), upload.single('file'), controller.bulkImportResearch)
  return router
}

export const catalogAdminRouter = createCatalogAdminRouter()
