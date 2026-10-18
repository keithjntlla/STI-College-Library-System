import type { RowDataPacket } from 'mysql2/promise'
import { db } from '../../config/db.js'
import { HttpError } from '../../core/http-error.ts'
import { clean, positiveId } from './holdings-parser.ts'

const fail = (message: string, status = 422) => new HttpError(status, 'CATALOG_REVIEW_REQUIRED', message)

function likeTerm(value: string) {
  return `%${value.replace(/[\\%_]/g, match => `\\${match}`)}%`
}

function filters(query: Record<string, unknown>) {
  const clauses = [
    "t.lifecycle_status = 'Active'",
    "(t.record_type = 'Book' OR EXISTS (SELECT 1 FROM research_records rr WHERE rr.title_id = t.title_id))",
  ]
  const values: Array<string | number> = []
  const q = clean(query.q).slice(0, 120)
  if (q) {
    const term = likeTerm(q)
    clauses.push(`(t.title LIKE ? ESCAPE '\\\\' OR t.isbn LIKE ? ESCAPE '\\\\' OR EXISTS (SELECT 1 FROM authors a WHERE a.title_id = t.title_id AND a.author_name LIKE ? ESCAPE '\\\\'))`)
    values.push(term, term, term)
  }
  if (['Book', 'Research/Thesis'].includes(String(query.kind))) {
    clauses.push('t.record_type = ?')
    values.push(String(query.kind))
  }
  const categoryId = positiveId(query.categoryId)
  if (categoryId) {
    clauses.push('t.category_id = ?')
    values.push(categoryId)
  }
  const programId = positiveId(query.programId)
  if (programId) {
    clauses.push('EXISTS (SELECT 1 FROM program_categories link WHERE link.category_id = t.category_id AND link.program_id = ?)')
    values.push(programId)
  }
  if (positiveId(query.courseId) || positiveId(query.typeId)) clauses.push('1 = 0')
  const department = clean(query.department).slice(0, 150)
  if (department) {
    clauses.push(`EXISTS (SELECT 1 FROM research_records rr WHERE rr.title_id = t.title_id AND rr.department_or_program LIKE ? ESCAPE '\\\\')`)
    values.push(likeTerm(department))
  }
  const year = Number(clean(query.publicationYear))
  if (Number.isInteger(year) && year >= 1000 && year <= new Date().getFullYear()) {
    clauses.push('t.publication_year = ?')
    values.push(year)
  }
  const author = clean(query.author).slice(0, 120)
  if (author) {
    clauses.push(`EXISTS (SELECT 1 FROM authors a WHERE a.title_id = t.title_id AND a.author_name LIKE ? ESCAPE '\\\\')`)
    values.push(likeTerm(author))
  }
  const adviser = clean(query.adviser).slice(0, 120)
  if (adviser) {
    clauses.push(`EXISTS (SELECT 1 FROM research_records rr WHERE rr.title_id = t.title_id AND rr.adviser_name LIKE ? ESCAPE '\\\\')`)
    values.push(likeTerm(adviser))
  }
  return { sql: clauses.join(' AND '), values }
}

const listSelect = `SELECT t.title_id AS id, t.title, t.record_type AS kind, t.cover_image_path AS coverImagePath,
    t.isbn, t.publisher, t.publication_year AS publicationYear, t.call_number AS callNumber, c.category_name AS category,
    COALESCE((SELECT GROUP_CONCAT(a.author_name ORDER BY a.author_order SEPARATOR ', ') FROM authors a WHERE a.title_id = t.title_id), '') AS author,
    COALESCE((SELECT rr.department_or_program FROM research_records rr WHERE rr.title_id = t.title_id LIMIT 1), '') AS department,
    COALESCE((SELECT rr.adviser_name FROM research_records rr WHERE rr.title_id = t.title_id LIMIT 1), '') AS adviser,
    t.copyright_year AS copyrightYear, t.synopsis, t.row_version AS version,
    (SELECT COUNT(*) FROM physical_copies pc WHERE pc.title_id = t.title_id AND pc.lifecycle_status = 'Active') AS copyCount,
    (SELECT COUNT(*) FROM physical_copies pc WHERE pc.title_id = t.title_id AND pc.lifecycle_status = 'Active' AND pc.availability_status = 'Available' AND pc.condition_status NOT IN ('Lost', 'Damaged', 'For Repair')) AS available,
    COALESCE((SELECT rr.abstract_text FROM research_records rr WHERE rr.title_id = t.title_id LIMIT 1), '') AS abstract
  FROM titles t
  LEFT JOIN categories c ON c.category_id = t.category_id`

function record(row: RowDataPacket) {
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    kind: String(row.kind ?? ''),
    coverImagePath: row.coverImagePath ? String(row.coverImagePath) : null,
    author: String(row.author ?? ''),
    department: String(row.department ?? ''),
    adviser: String(row.adviser ?? ''),
    isbn: row.isbn == null ? null : String(row.isbn),
    publicationYear: row.publicationYear == null ? null : Number(row.publicationYear),
    copyrightYear: row.copyrightYear == null ? null : Number(row.copyrightYear),
    publisher: row.publisher == null ? null : String(row.publisher),
    category: row.category == null ? null : String(row.category),
    callNumber: row.callNumber == null ? null : String(row.callNumber),
    edition: null,
    pages: null,
    synopsis: String(row.synopsis ?? ''),
    glossary: '',
    abstract: String(row.abstract ?? ''),
    typeId: null,
    resourceType: null,
    version: Number(row.version ?? 0),
    available: Number(row.available ?? 0),
    copyCount: Number(row.copyCount ?? 0),
    programs: [] as Array<{ id: number; name: string; code?: string }>,
    courses: [] as Array<{ id: number; name: string; programId?: number; code?: string }>,
  }
}

async function queryRows(sql: string, values: Array<string | number> = []) {
  const [data] = await db.execute<RowDataPacket[]>(sql, values)
  return data
}

export async function mysqlCatalogOptions(publicOnly = false) {
  const [programs, categories] = await Promise.all([
    queryRows(`SELECT program_id AS id, program_name AS name, CASE WHEN is_active = 1 THEN 'Active' ELSE 'Archived' END AS status, 1 AS version FROM programs ${publicOnly ? 'WHERE is_active = 1' : ''} ORDER BY program_name`),
    queryRows("SELECT category_id AS id, category_name AS name, 'Active' AS status, 1 AS version FROM categories ORDER BY category_name"),
  ])
  return { locations: [], programs, courses: [], types: [], categories }
}

export async function mysqlPublicCatalog(query: Record<string, unknown>) {
  const where = filters(query)
  const page = Math.max(1, Math.min(10000, positiveId(query.page) ?? 1))
  const limit = 24
  const [items, count] = await Promise.all([
    queryRows(`${listSelect} WHERE ${where.sql} ORDER BY t.title, t.title_id LIMIT ${limit} OFFSET ${(page - 1) * limit}`, where.values),
    queryRows(`SELECT COUNT(*) AS total FROM titles t WHERE ${where.sql}`, where.values),
  ])
  return { items: items.map(record), pagination: { page, limit, total: Number(count[0]?.total ?? 0) } }
}

export async function mysqlPublicDetail(value: unknown) {
  const titleId = positiveId(value)
  if (!titleId) throw fail('Choose a valid record.')
  const where = filters({})
  const book = (await queryRows(`${listSelect} WHERE ${where.sql} AND t.title_id = ?`, [...where.values, titleId]))[0]
  if (!book) throw fail('This catalog entry is unavailable.', 404)
  const mapped = record(book)
  const copies = mapped.kind === 'Book'
    ? await queryRows("SELECT physical_copy_id AS id, accession_number AS accession, barcode, shelf_location AS shelf, condition_status AS `condition`, availability_status AS availability FROM physical_copies WHERE title_id = ? AND lifecycle_status = 'Active' ORDER BY physical_copy_id", [titleId])
    : await queryRows("SELECT research_inventory_id AS id, accession_number AS accession, barcode, shelf_location AS shelf, condition_state AS `condition`, availability_status AS availability FROM research_inventory WHERE title_id = ? AND lifecycle_status = 'Active' ORDER BY research_inventory_id", [titleId])
  return { ...mapped, copies, files: [] }
}
