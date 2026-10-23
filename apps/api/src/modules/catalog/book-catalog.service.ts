import type { Pool } from 'mysql2/promise'
import { db } from '../../config/db.js'
import { env } from '../../config/env.js'
import { HttpError } from '../../core/http-error.ts'
import { isMissingSchemaError } from '../../core/schema-readiness.ts'
import { createBorrowingPolicyService } from '../circulation/borrowing-policy.service.ts'
import { roleBookLimit } from '../circulation/borrowing-policy.types.ts'
import { reservationService } from '../reservations/reservation.service.ts'
import {
  queryBookCatalog,
  queryBookCategories,
  queryBookOverview,
  queryBookCopyDetails,
  queryReservationTarget,
  queryViewerActiveBookCount,
} from './book-catalog.repository.ts'
import { parseBookCatalogFilters, parseBookTitleId } from './book-catalog.validation.ts'

export type CatalogViewer = { accountId: number; role: 'Librarian' | 'Student' | 'Faculty' }

function localBorrowingPolicy() {
  return {
    versionId: 0,
    effectiveOn: '2026-01-01',
    studentMaxActiveBooks: 3,
    facultyMaxActiveBooks: null,
    borrowingDays: 3,
    dueTimeCutoff: '17:00:00',
    maxRenewals: 0,
    renewalExtensionDays: 0,
    studentMaxActiveReservations: 1,
    facultyMaxActiveReservations: null,
    blockRenewalIfOverdue: true,
    blockRenewalIfUnpaidFines: true,
    blockRenewalIfReserved: true,
    longOverdueAfterDays: null,
    changeReason: '',
    createdByUserId: null,
    createdAt: new Date(0),
    materialRules: [],
  }
}

export function createBookCatalogService(database: Pool = db) {
  return {
    categories: () => queryBookCategories(database),

    async list(query: Record<string, unknown>, viewer: CatalogViewer) {
      const policyService = createBorrowingPolicyService(database)
      const catalog = await queryBookCatalog(database, parseBookCatalogFilters(query))
      let activeBookCount = 0
      let policy = localBorrowingPolicy()
      if (!env.localDirectLogin) {
        ;[activeBookCount, policy] = await Promise.all([
          viewer.role === 'Student' || viewer.role === 'Faculty' ? queryViewerActiveBookCount(database, viewer.accountId) : Promise.resolve(0),
          policyService.resolveActive(database),
        ])
      } else {
        try {
          ;[activeBookCount, policy] = await Promise.all([
            viewer.role === 'Student' || viewer.role === 'Faculty' ? queryViewerActiveBookCount(database, viewer.accountId) : Promise.resolve(0),
            policyService.resolveActive(database),
          ])
        } catch (error) {
          if (!isMissingSchemaError(error)) throw error
        }
      }
      return {
        ...catalog,
        viewer: {
          role: viewer.role,
          activeBookCount,
          bookLimit: roleBookLimit(policy, viewer.role),
          policyVersionId: policy.versionId,
        },
      }
    },

    async overview(titleIdValue: unknown) {
      const titleId = parseBookTitleId(titleIdValue)
      const book = await queryBookOverview(database, titleId)
      if (!book) throw new HttpError(404, 'BOOK_TITLE_NOT_FOUND', 'The requested book title does not exist or is archived.')
      return { ...book, copies: await queryBookCopyDetails(database, titleId) }
    },

    async reserve(titleIdValue: unknown, viewer: CatalogViewer, body: unknown = {}) {
      if (!['Student', 'Faculty'].includes(viewer.role)) {
        throw new HttpError(403, 'BOOK_RESERVATION_ROLE_FORBIDDEN', 'Only Student or Faculty accounts may reserve catalog books.')
      }
      const titleId = parseBookTitleId(titleIdValue)
      const target = await queryReservationTarget(database, viewer.accountId, titleId)
      if (!target || !target.userId || !target.materialId) {
        throw new HttpError(422, 'BOOK_RESERVATION_UNAVAILABLE', 'This account or title is not linked to a reservable physical copy.')
      }
      return reservationService.create(target.userId, { materialId: target.materialId,
        requestId: body && typeof body==='object' ? (body as Record<string,unknown>).requestId : undefined })
    },
  }
}

export const bookCatalogService = createBookCatalogService()
