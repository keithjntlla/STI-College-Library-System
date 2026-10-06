import fs from 'fs'
import csvParser from 'csv-parser'
import type { Pool } from 'mysql2/promise'
import { db } from '../../config/db.js'
import { HttpError } from '../../core/http-error.ts'
import { renderBookLabel } from './book-label.renderer.ts'
import {
  ensureBookLocationExists,
  reserveBarcodeSequence,
} from './bulk-book.repository.ts'
import {
  buildBookSearchText,
  buildThesisSearchText,
  ensureCategoryExists,
  findBookTitleByIsbnForUpdate,
  findDuplicatePhysicalCopyForUpdate,
  findResearchCodeForUpdate,
  insertAuthors,
  insertLegacyBookMaterial,
  insertPhysicalCopy,
  insertResearchInventory,
  insertResearchRecord,
  insertTitle,
} from './catalog.repository.ts'
import { resolveAllowedResearchProgram } from './research-programs.ts'

export interface BulkImportRow {
  Title: string
  Author: string
  ISBN: string
  Publication_Year: string
  Category_ID: string
  Quantity: string
}

export interface ResearchBulkImportRow {
  Title?: string
  Authors?: string
  Author?: string
  Adviser?: string
  Publication_Year?: string
  Department_Or_Program?: string
  Research_Code?: string
  Abstract?: string
  Keywords?: string
  Shelf_Location?: string
}

export function parseCsvFile<T extends Record<string, string> = BulkImportRow>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = []
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

function splitAuthors(value: string) {
  if (value.includes(';')) return value.split(/\s*;\s*/).map((name) => name.trim()).filter(Boolean)
  return value.split(/\s*,\s*/).map((name) => name.trim()).filter(Boolean)
}

function isValidIsbn(isbn: string) {
  const clean = isbn.replace(/[- ]/g, '')
  return /^\d{9}[\dX]$|^\d{13}$/.test(clean)
}

export async function bulkImportBooks(filePath: string, database: Pool = db) {
  const rows = await parseCsvFile(filePath)
  if (rows.length === 0) {
    throw new HttpError(400, 'EMPTY_CSV', 'The uploaded CSV file is empty.')
  }

  const connection = await database.getConnection()
  let booksCreated = 0
  let copiesCreated = 0

  try {
    await connection.beginTransaction()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +1 for 0-index, +1 for header

      const title = row.Title?.trim()
      const author = row.Author?.trim()
      const isbn = row.ISBN?.trim().replace(/[- ]/g, '')
      const year = parseInt(row.Publication_Year?.trim(), 10)
      const categoryId = parseInt(row.Category_ID?.trim(), 10)
      let quantity = parseInt(row.Quantity?.trim(), 10)

      if (!title) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Title is required.`)
      if (!author) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Author is required.`)
      if (!isbn || !isValidIsbn(isbn)) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Valid ISBN is required.`)
      if (isNaN(year) || year < 1000 || year > 2100) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Valid Publication Year is required.`)
      if (isNaN(categoryId)) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Valid Category ID is required.`)
      if (isNaN(quantity) || quantity < 1) quantity = 1 // Default to 1 if missing or invalid

      if (!await ensureCategoryExists(connection, categoryId)) {
        throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Category ID ${categoryId} does not exist.`)
      }

      // Check idempotency for title
      const existingTitle = await findBookTitleByIsbnForUpdate(connection, isbn)
      let titleId = existingTitle?.title_id

      if (!titleId) {
        titleId = await insertTitle(connection, {
          categoryId,
          recordType: 'Book',
          title,
          isbn,
          publicationYear: year,
          publisher: 'Academic Press', // Default for imported books if not provided
          callNumber: `QA76.M${Math.floor(Math.random() * 1000)}`, // Generate dummy call number
          searchText: buildBookSearchText({ title, isbn, authors: [author], publisher: 'Academic Press' } as any),
        })
        await insertAuthors(connection, titleId, [author])
        booksCreated++
      }

      // Add physical copies
      for (let c = 1; c <= quantity; c++) {
        // Generate random but unique barcodes/accessions for import
        const rand = Math.floor(Math.random() * 999999)
        const barcode = `BC-IMP-${titleId}-${c}-${rand}`
        const accessionNumber = `ACC-IMP-${titleId}-${c}-${rand}`
        const shelfLocation = `Shelf-${categoryId}`

        const copyInput = {
          barcode,
          accessionNumber,
          shelfLocation,
          conditionStatus: 'Good' as const,
        }

        const duplicateCopy = await findDuplicatePhysicalCopyForUpdate(connection, copyInput as any)
        if (duplicateCopy) {
          throw new HttpError(409, 'CSV_INVALID', `Row ${rowNum}: Auto-generated barcode collision. Try again.`)
        }

        const materialId = await insertLegacyBookMaterial(connection, {
          title,
          authors: [author],
          isbn,
          publicationYear: year,
          copy: copyInput as any,
          categoryId
        } as any)

        await insertPhysicalCopy(connection, titleId, { ...copyInput, legacyMaterialId: Number(materialId) })
        copiesCreated++
      }
    }

    await connection.commit()
    return { booksCreated, copiesCreated }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function bulkImportResearch(filePath: string, database: Pool = db) {
  const rows = await parseCsvFile<ResearchBulkImportRow>(filePath)
  if (rows.length === 0) {
    throw new HttpError(400, 'EMPTY_CSV', 'The uploaded CSV file is empty.')
  }

  const connection = await database.getConnection()
  let thesesCreated = 0

  try {
    await connection.beginTransaction()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      const title = row.Title?.trim() ?? ''
      const authorsRaw = (row.Authors ?? row.Author ?? '').trim()
      const authors = splitAuthors(authorsRaw)
      const adviser = row.Adviser?.trim() ?? ''
      const year = Number.parseInt(row.Publication_Year?.trim() ?? '', 10)
      const department = resolveAllowedResearchProgram(row.Department_Or_Program?.trim() ?? '')
      const researchCode = (row.Research_Code?.trim() ?? '').toUpperCase()
      const abstract = row.Abstract?.trim() ?? ''
      const keywords = row.Keywords?.trim() || null
      const shelfLocation = row.Shelf_Location?.trim() ?? ''

      if (!title) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Title is required.`)
      if (!authors.length) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Authors is required.`)
      if (!adviser) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Adviser is required.`)
      if (!Number.isFinite(year) || year < 1000 || year > 2100) {
        throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Valid Publication_Year is required.`)
      }
      if (!department) {
        throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Department_Or_Program must match a campus program.`)
      }
      if (!researchCode) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Research_Code is required.`)
      if (abstract.length < 20) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Abstract must contain at least 20 characters.`)
      if (!shelfLocation) throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Shelf_Location is required.`)
      if (!await ensureBookLocationExists(connection, shelfLocation)) {
        throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Shelf_Location must match an existing managed location.`)
      }

      const existingResearch = await findResearchCodeForUpdate(connection, researchCode)
      if (existingResearch) {
        throw new HttpError(422, 'CSV_INVALID', `Row ${rowNum}: Research_Code ${researchCode} already exists.`)
      }

      const thesisInput = {
        title,
        authors,
        adviser,
        year,
        abstract,
        categoryId: null as number | null,
        researchCode,
        departmentOrProgram: department,
        keywords,
        copy: {
          barcode: '',
          accessionNumber: '',
          shelfLocation,
          conditionStatus: 'Good' as const,
          legacyMaterialId: null as number | null,
        },
      }

      const titleId = await insertTitle(connection, {
        categoryId: null,
        recordType: 'Research/Thesis',
        title,
        isbn: null,
        publicationYear: year,
        publisher: null,
        callNumber: null,
        searchText: buildThesisSearchText(thesisInput),
      })
      await insertAuthors(connection, titleId, authors)
      await insertResearchRecord(connection, titleId, thesisInput)

      const currentYear = new Date().getFullYear()
      const sequence = await reserveBarcodeSequence(connection, currentYear, 1)
      const serial = String(sequence).padStart(6, '0')
      thesisInput.copy.barcode = `STIORMOC${currentYear}${serial}`
      thesisInput.copy.accessionNumber = `STI-RES-${currentYear}-${serial}`
      const label = await renderBookLabel({
        title_id: titleId,
        barcode: thesisInput.copy.barcode,
        accession_number: thesisInput.copy.accessionNumber,
      })
      await insertResearchInventory(connection, thesisInput, titleId, label.qrCodeData)
      thesesCreated += 1
    }

    await connection.commit()
    return { thesesCreated }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
