import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { isPostgres } from '../../config/sql-dialect.js'
import type { HoldingsCatalog, HoldingsCategory, HoldingsTitle } from './ched-holdings.ts'

export class HoldingsImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HoldingsImportError'
  }
}

const BOOK_COPIES = `SELECT pc.physical_copy_id
   FROM physical_copies pc
   JOIN titles t ON t.title_id = pc.title_id
  WHERE t.record_type = 'Book'`

const BOOK_MATERIALS = `SELECT pc.material_id
   FROM physical_copies pc
   JOIN titles t ON t.title_id = pc.title_id
  WHERE t.record_type = 'Book' AND pc.material_id IS NOT NULL`

const BOOK_TITLES = `SELECT title_id FROM titles WHERE record_type = 'Book'`

const BOOK_TRANSACTIONS = `SELECT bt.transaction_id
   FROM borrow_transactions bt
   LEFT JOIN physical_copies pc ON pc.physical_copy_id = bt.physical_copy_id
   LEFT JOIN titles copy_title ON copy_title.title_id = pc.title_id
   LEFT JOIN materials m ON m.material_id = bt.material_id
  WHERE copy_title.record_type = 'Book' OR m.material_type = 'Book'`

export const BOOK_WIPE_STATEMENTS = [
  `DELETE FROM fine_payment_allocations
    WHERE lost_book_report_id IN (
      SELECT lost_book_report_id FROM (
        SELECT lr.lost_book_report_id
          FROM lost_book_reports lr
         WHERE lr.transaction_id IN (${BOOK_TRANSACTIONS})
      ) book_reports
    )
       OR fine_id IN (
      SELECT fine_id FROM (
        SELECT f.fine_id
          FROM fines f
         WHERE f.transaction_id IN (${BOOK_TRANSACTIONS})
      ) book_fines
    )`,
  `DELETE FROM lost_book_reports WHERE transaction_id IN (${BOOK_TRANSACTIONS})`,
  `DELETE FROM inventory_audit_events
    WHERE physical_copy_id IN (SELECT physical_copy_id FROM (${BOOK_COPIES}) book_copies)`,
  `DELETE FROM physical_copy_asset_code_history
    WHERE title_id IN (SELECT title_id FROM (${BOOK_TITLES}) book_titles)`,
  `UPDATE research_inventory
      SET title_id = NULL
    WHERE title_id IN (SELECT title_id FROM (${BOOK_TITLES}) book_titles)`,
  `DELETE FROM borrow_transactions WHERE transaction_id IN (SELECT transaction_id FROM (${BOOK_TRANSACTIONS}) book_transactions)`,
  `DELETE FROM reservations
    WHERE book_title_id IN (SELECT title_id FROM (${BOOK_TITLES}) book_titles)
       OR material_id IN (SELECT material_id FROM (${BOOK_MATERIALS}) book_materials)
       OR assigned_physical_copy_id IN (SELECT physical_copy_id FROM (${BOOK_COPIES}) book_copies)`,
  `DELETE FROM book_quotations
    WHERE title_id IN (SELECT title_id FROM (${BOOK_TITLES}) book_titles)`,
  `DELETE FROM materials
    WHERE material_id IN (SELECT material_id FROM (${BOOK_MATERIALS}) book_materials)`,
  `DELETE FROM physical_copies
    WHERE physical_copy_id IN (SELECT physical_copy_id FROM (${BOOK_COPIES}) book_copies)`,
  `DELETE FROM materials
    WHERE material_type = 'Book'
      AND material_id NOT IN (
        SELECT material_id FROM (
          SELECT material_id FROM physical_copies WHERE material_id IS NOT NULL
        ) still_used
      )`,
  `DELETE FROM titles WHERE record_type = 'Book'`,
]

const OPEN_LOAN_SQL = `SELECT COUNT(*) AS open_loans
   FROM physical_copies pc
   JOIN titles t ON t.title_id = pc.title_id
  WHERE t.record_type = 'Book'
    AND (
      pc.availability_status IN ('Borrowed', 'Reserved')
      OR EXISTS (
        SELECT 1 FROM borrow_transactions bt
         WHERE bt.physical_copy_id = pc.physical_copy_id
           AND bt.transaction_status IN ('Pending', 'Borrowed', 'Overdue')
           AND bt.lost_confirmed_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM reservations r
         WHERE r.book_title_id = t.title_id
           AND r.reservation_status IN ('pending', 'approved', 'ready_for_pickup')
      )
    )`

const PROGRAM_GROUPS: Record<string, string> = {
  'General Education': 'College',
  'Bachelor of Science in Information Technology': 'College',
  'Bachelor of Science in Tourism Management': 'College',
  'Bachelor of Science in Hospitality Management': 'College',
  STEM: 'SHS Academic',
  ABM: 'SHS Academic',
  HUMSS: 'SHS Academic',
  'General Academic': 'SHS Academic',
  'IT in Mobile App and Web Development': 'SHS TechPro',
  'Computer and Communications Technology': 'SHS TechPro',
  'Tourism Operations': 'SHS TechPro',
  'Culinary Arts': 'SHS TechPro',
}

export async function applyChedHoldings(database: Pool, catalog: HoldingsCatalog) {
  const connection = await database.getConnection()
  try {
    await connection.beginTransaction()
    const [openRows] = await connection.execute<RowDataPacket[]>(OPEN_LOAN_SQL)
    const openLoans = Number(openRows[0]?.open_loans ?? 0)
    if (openLoans > 0) {
      throw new HoldingsImportError(`${openLoans} book ${openLoans === 1 ? 'copy is' : 'copies are'} borrowed or reserved. The current catalog was left in place.`)
    }
    for (const statement of BOOK_WIPE_STATEMENTS) await connection.execute(statement)

    const categoryIds = new Map<string, number>()
    for (const category of catalog.categories) {
      categoryIds.set(category.name, await ensureCategory(connection, category))
    }
    let titles = 0
    let copies = 0
    for (const title of catalog.titles) {
      const categoryId = categoryIds.get(title.categoryName)
      if (!categoryId) throw new HoldingsImportError(`Category “${title.categoryName}” was not created.`)
      const titleId = await insertHoldingTitle(connection, title, categoryId)
      titles += 1
      for (const [index, author] of title.authors.entries()) {
        await connection.execute(
          `INSERT INTO authors (title_id, author_name, normalized_name, author_order, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [titleId, author, author.toLocaleLowerCase('en-US').slice(0, 191), index + 1],
        )
      }
      for (const code of title.accessions) {
        await insertHoldingCopy(connection, title, titleId, categoryId, code)
        copies += 1
      }
    }
    await connection.commit()
    return { titles, copies, categories: categoryIds.size }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function ensureCategory(connection: PoolConnection, category: HoldingsCategory) {
  const [existing] = await connection.execute<RowDataPacket[]>(
    'SELECT category_id FROM categories WHERE category_name = ? LIMIT 1',
    [category.name],
  )
  const categoryId = existing[0]?.category_id
    ? Number(existing[0].category_id)
    : await insertCategory(connection, category)
  for (const programName of category.programNames) {
    const programId = await ensureProgram(connection, programName)
    await connection.execute(
      `INSERT INTO program_categories (program_id, category_id, created_at)
       SELECT ?, ?, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM program_categories existing
           WHERE existing.program_id = ? AND existing.category_id = ?
        )`,
      [programId, categoryId, programId, categoryId],
    )
  }
  return categoryId
}

async function insertCategory(connection: PoolConnection, category: HoldingsCategory) {
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO categories
       (category_name, description, shelf_location, shelf_column, shelf_row, textbook_recency_rule, created_at)
     VALUES (?, ?, ?, 1, 1, ?, NOW())`,
    [category.name, category.description, category.shelfLocation, isPostgres ? false : 0],
  )
  return Number(result.insertId)
}

async function ensureProgram(connection: PoolConnection, programName: string) {
  const [existing] = await connection.execute<RowDataPacket[]>(
    'SELECT program_id FROM programs WHERE program_name = ? LIMIT 1',
    [programName],
  )
  if (existing[0]?.program_id) return Number(existing[0].program_id)
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO programs (program_name, program_group, is_active, created_at)
     SELECT ?, ?, ?, NOW()
      WHERE NOT EXISTS (SELECT 1 FROM programs WHERE program_name = ?)`,
    [programName, PROGRAM_GROUPS[programName] ?? 'College', isPostgres ? true : 1, programName],
  )
  if (result.insertId) return Number(result.insertId)
  const [created] = await connection.execute<RowDataPacket[]>(
    'SELECT program_id FROM programs WHERE program_name = ? LIMIT 1',
    [programName],
  )
  if (!created[0]?.program_id) throw new HoldingsImportError(`Program “${programName}” could not be saved.`)
  return Number(created[0].program_id)
}

async function insertHoldingTitle(connection: PoolConnection, title: HoldingsTitle, categoryId: number) {
  const searchText = [title.title, ...title.authors, title.isbn, title.publisher, title.shelfLocation]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('en-US')
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO titles
       (category_id, record_type, title, normalized_title, isbn, publication_year, copyright_year,
        publisher, call_number, search_text, lifecycle_status, created_at)
     VALUES (?, 'Book', ?, ?, ?, ?, ?, ?, NULL, ?, 'Active', NOW())`,
    [
      categoryId,
      title.title,
      title.title.toLocaleLowerCase('en-US').slice(0, 255),
      title.isbn,
      title.publicationYear,
      title.publicationYear,
      title.publisher,
      searchText,
    ],
  )
  return Number(result.insertId)
}

async function insertHoldingCopy(connection: PoolConnection, title: HoldingsTitle, titleId: number, categoryId: number, code: string) {
  const [material] = await connection.execute<ResultSetHeader>(
    `INSERT INTO materials
       (category_id, barcode, title, author, isbn, publication_year, shelf_location,
        material_type, availability_status, date_added)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Book', 'Available', NOW())`,
    [categoryId, code, title.title, title.authors.join(', ').slice(0, 255), title.isbn, title.publicationYear, title.shelfLocation],
  )
  await connection.execute(
    `INSERT INTO physical_copies
       (title_id, material_id, barcode, accession_number, shelf_location,
        condition_status, availability_status, lifecycle_status, created_at)
     VALUES (?, ?, ?, ?, ?, 'Good', 'Available', 'Active', NOW())`,
    [titleId, material.insertId, code, code, title.shelfLocation],
  )
}
