import type { Pool, RowDataPacket } from 'mysql2/promise'
import { db } from '../../config/db.js'
import { authorsAgg, isPostgres } from '../../config/sql-dialect.js'
import { createIntegrityProtectedCsvStream } from './csv-integrity.ts'
import { createBrandedTablePdf, type PdfTableColumn } from './branded-table-pdf.ts'

export type WeedingExportRow = {
  titleId: string
  title: string
  authors: string
  category: string
  copyrightYear: string
  publicationYear: string
  ageYears: string
  activeCopies: string
  reviewStatus: string
}

function academicCutoffYear(now = new Date()) {
  return now.getFullYear() - 5
}

export async function* iterateWeedingRows(database: Pool = db, now = new Date()): AsyncGenerator<WeedingExportRow> {
  const cutoff = academicCutoffYear(now)
  const [rows] = await database.execute<RowDataPacket[]>(
    `SELECT t.title_id, t.title, t.copyright_year, t.publication_year, c.category_name,
            (SELECT ${authorsAgg('a')} FROM authors a WHERE a.title_id = t.title_id) AS authors,
            COUNT(pc.physical_copy_id) AS active_copies
       FROM titles t
       JOIN categories c ON c.category_id = t.category_id AND c.textbook_recency_rule IS TRUE
       LEFT JOIN physical_copies pc ON pc.title_id = t.title_id AND pc.lifecycle_status = 'Active'
      WHERE t.record_type = 'Book' AND t.lifecycle_status = 'Active'
        AND t.copyright_year IS NOT NULL AND t.copyright_year <= ?
      GROUP BY t.title_id, t.title, t.copyright_year, t.publication_year, c.category_name
      ORDER BY t.copyright_year ASC, t.title ASC`,
    [cutoff],
  )
  for (const row of rows) {
    const copyrightYear = Number(row.copyright_year)
    yield {
      titleId: String(Number(row.title_id)),
      title: String(row.title ?? ''),
      authors: String(row.authors ?? ''),
      category: String(row.category_name ?? ''),
      copyrightYear: String(copyrightYear),
      publicationYear: row.publication_year == null ? '' : String(row.publication_year),
      ageYears: String(now.getFullYear() - copyrightYear),
      activeCopies: String(Number(row.active_copies ?? 0)),
      reviewStatus: 'Review for weeding',
    }
  }
}

export async function notifyWeedingCrossings(database: Pool = db, now = new Date()) {
  const cutoff = academicCutoffYear(now)
  const [rows] = await database.execute<RowDataPacket[]>(
    `SELECT t.title_id, t.title, t.copyright_year
       FROM titles t
       JOIN categories c ON c.category_id = t.category_id AND c.textbook_recency_rule IS TRUE
      WHERE t.record_type = 'Book' AND t.lifecycle_status = 'Active'
        AND t.copyright_year IS NOT NULL AND t.copyright_year <= ?`,
    [cutoff],
  )
  const recentWindow = isPostgres ? `NOW() - INTERVAL '180 day'` : 'DATE_SUB(NOW(), INTERVAL 180 DAY)'
  for (const row of rows) {
    const titleId = Number(row.title_id)
    const title = String(row.title)
    const year = Number(row.copyright_year)
    const [existing] = await database.execute<RowDataPacket[]>(
      `SELECT admin_notification_id FROM admin_notifications
        WHERE event_type = 'weeding_review' AND book_title_id = ?
          AND created_at >= ${recentWindow} LIMIT 1`,
      [titleId],
    )
    if (existing[0]) continue
    await database.execute(
      `INSERT INTO admin_notifications (event_type, book_title_id, message_title, message_body)
       VALUES ('weeding_review', ?, 'Textbook due for weeding review', ?)`,
      [titleId, `${title} (copyright ${year}) is older than five academic years and needs weeding review.`],
    )
  }
  return rows.length
}

function safeSpreadsheetValue(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

function csvCell(value: string) {
  return `"${safeSpreadsheetValue(value).replace(/"/g, '""')}"`
}

const CSV_COLUMNS: Array<[keyof WeedingExportRow, string]> = [
  ['titleId', 'Title ID'], ['title', 'Title'], ['authors', 'Authors'], ['category', 'Category'],
  ['copyrightYear', 'Copyright Year'], ['publicationYear', 'Publication Year'],
  ['ageYears', 'Age (Years)'], ['activeCopies', 'Active Copies'], ['reviewStatus', 'Review Status'],
]

export function createWeedingCsvStream(rows: AsyncIterable<WeedingExportRow>) {
  async function* content() {
    yield '\uFEFF' + CSV_COLUMNS.map(([, label]) => csvCell(label)).join(',') + '\r\n'
    for await (const row of rows) yield CSV_COLUMNS.map(([key]) => csvCell(row[key])).join(',') + '\r\n'
  }
  return createIntegrityProtectedCsvStream(content(), 'weeding_list', CSV_COLUMNS.length)
}

export function createWeedingPdf(rows: AsyncIterable<WeedingExportRow>) {
  const columns: Array<PdfTableColumn<WeedingExportRow>> = [
    { key: 'title', label: 'TITLE', width: 180 },
    { key: 'authors', label: 'AUTHOR(S)', width: 130 },
    { key: 'category', label: 'CATEGORY', width: 100 },
    { key: 'copyrightYear', label: 'COPYRIGHT', width: 70 },
    { key: 'publicationYear', label: 'PUB YEAR', width: 70 },
    { key: 'ageYears', label: 'AGE', width: 45 },
    { key: 'activeCopies', label: 'COPIES', width: 55 },
    { key: 'reviewStatus', label: 'STATUS', width: 110 },
  ]
  return createBrandedTablePdf(rows, {
    title: 'WEEDING REVIEW LIST',
    subtitle: 'Textbook categories marked for the five-year copyright review. Full inventory is unchanged.',
    emptyMessage: 'No titles currently need weeding review.',
    columns,
  })
}

export function weedingRows() {
  return iterateWeedingRows(db)
}

export async function listWeedingReview(database: Pool = db, now = new Date()) {
  const rows: WeedingExportRow[] = []
  for await (const row of iterateWeedingRows(database, now)) rows.push(row)
  return rows
}
