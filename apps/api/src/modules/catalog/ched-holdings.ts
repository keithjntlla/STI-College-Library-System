import JSZip from 'jszip'
import { isValidIsbn, normalizeIsbn } from './catalog.validation.ts'

export const GENERAL_EDUCATION_PROGRAM = 'General Education'
export const GENERAL_EDUCATION_CATEGORY = 'General Education'
export const SHS_PROGRAMS = [
  'STEM',
  'ABM',
  'HUMSS',
  'General Academic',
  'IT in Mobile App and Web Development',
  'Computer and Communications Technology',
  'Tourism Operations',
  'Culinary Arts',
] as const

export type SheetCode = 'GE' | 'SHS' | 'HRM' | 'TM' | 'IT'

export type HoldingsSheet = {
  name: string
  rows: Record<number, Record<string, string>>
}

export type HoldingsTitle = {
  sheetCode: SheetCode
  sourceRows: number[]
  categoryName: string
  shelfLocation: string
  programNames: string[]
  title: string
  authors: string[]
  isbn: string | null
  publicationYear: number | null
  publisher: string | null
  accessions: string[]
}

export type HoldingsCategory = {
  name: string
  shelfLocation: string
  description: string
  programNames: string[]
}

export type HoldingsIssue = {
  sheet: string
  row: number
  title: string
  reason: string
}

export type HoldingsCatalog = {
  titles: HoldingsTitle[]
  categories: HoldingsCategory[]
  skipped: HoldingsIssue[]
  isbnIssues: HoldingsIssue[]
}

const PROGRAMS: Record<SheetCode, readonly string[]> = {
  GE: [GENERAL_EDUCATION_PROGRAM],
  SHS: SHS_PROGRAMS,
  HRM: ['Bachelor of Science in Hospitality Management'],
  TM: ['Bachelor of Science in Tourism Management'],
  IT: ['Bachelor of Science in Information Technology'],
}

const COLLECTION_CATEGORY: Record<Exclude<SheetCode, 'GE'>, string> = {
  SHS: 'Senior High School',
  HRM: 'Hospitality Management',
  TM: 'Tourism Management',
  IT: 'Information Technology',
}

const AUTHOR_SUFFIX = /^(jr|sr|ii|iii|iv|inc|ltd|llc|ph\.?d)\.?$/i

function clean(value: string | undefined, maximum = 255) {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, maximum)
}

function cell(row: Record<string, string> | undefined, column: string) {
  return clean(row?.[column], 1000)
}

export function sheetCode(name: string): SheetCode | null {
  const upper = name.toUpperCase()
  if (upper.includes('SHS')) return 'SHS'
  if (upper.includes('HRM')) return 'HRM'
  if (upper.includes('GE')) return 'GE'
  if (/\bTM\b/.test(upper) || upper.includes('TOURISM')) return 'TM'
  if (upper.includes('IT')) return 'IT'
  return null
}

export function splitHoldingAuthors(value: string) {
  const pieces = clean(value, 1000).split(/\s*;\s*|\s+&\s+|\s+\band\b\s+/i).flatMap((part) => {
    const folded: string[] = []
    for (const piece of part.split(/\s*,\s*/)) {
      const name = clean(piece)
      if (!name) continue
      if (folded.length && AUTHOR_SUFFIX.test(name)) folded[folded.length - 1] += `, ${name}`
      else folded.push(name)
    }
    return folded
  })
  const unique = new Map<string, string>()
  for (const name of pieces) {
    const key = name.toLocaleLowerCase('en-US')
    if (!unique.has(key)) unique.set(key, name.slice(0, 255))
  }
  return [...unique.values()]
}

function usableIsbn(value: string) {
  const isbn = normalizeIsbn(value)
  if (!isbn) return null
  if (isValidIsbn(isbn)) return isbn
  if (/^97[89]\d{10}$/.test(isbn) || /^\d{9}[\dX]$/.test(isbn)) return isbn
  return null
}

function publicationYear(value: string) {
  if (!/^\d{4}$/.test(value)) return null
  const year = Number(value)
  const ceiling = new Date().getFullYear() + 1
  return year >= 1000 && year <= ceiling ? year : null
}

function copyCount(value: string) {
  if (!value) return 1
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 500 ? parsed : null
}

function withEdition(title: string, edition: string) {
  const label = clean(edition)
  if (!label || label === '-' || label === '—' || /^n\/?a$/i.test(label)) return title.slice(0, 255)
  if (title.toLocaleLowerCase('en-US').includes(label.toLocaleLowerCase('en-US'))) return title.slice(0, 255)
  const suffix = ` (${label})`
  return `${title.slice(0, Math.max(0, 255 - suffix.length))}${suffix}`
}

function isAcquisitionBand(label: string) {
  return /acquisition/i.test(label)
}

function isNoteRow(values: string[]) {
  const text = values.join(' ').toLocaleLowerCase('en-US')
  return /subtotal|prepared by|certified true|school librarian|school administrator|^total\b/.test(text)
}

function numbered(value: string) {
  return /^\d+$/.test(value)
}

function accession(code: SheetCode, row: number, copy: number) {
  return `${code}-${String(row).padStart(4, '0')}-${copy}`
}

type Draft = {
  sheetCode: SheetCode
  sheetName: string
  sourceRows: number[]
  categoryName: string
  title: string
  authors: string[]
  isbn: string | null
  publicationYear: number | null
  publisher: string | null
  accessions: string[]
}

function identity(draft: Draft) {
  return [
    draft.sheetCode,
    draft.categoryName.toLocaleLowerCase('en-US'),
    draft.title.toLocaleLowerCase('en-US'),
    draft.authors.map((author) => author.toLocaleLowerCase('en-US')).join('|'),
    draft.publicationYear ?? '',
    (draft.publisher ?? '').toLocaleLowerCase('en-US'),
  ].join('||')
}

function addCopies(draft: Draft, row: number, copies: number) {
  for (let copy = 1; copy <= copies; copy += 1) draft.accessions.push(accession(draft.sheetCode, row, copy))
  draft.sourceRows.push(row)
}

export function parseHoldings(sheets: HoldingsSheet[]): HoldingsCatalog {
  const drafts: Draft[] = []
  const skipped: HoldingsIssue[] = []
  const isbnIssues: HoldingsIssue[] = []
  const byIdentity = new Map<string, Draft>()
  const byIsbn = new Map<string, Draft>()

  for (const sheet of sheets) {
    const code = sheetCode(sheet.name)
    if (!code) {
      skipped.push({ sheet: sheet.name, row: 0, title: '', reason: 'Unrecognized sheet.' })
      continue
    }
    let subject = GENERAL_EDUCATION_CATEGORY
    const rowNumbers = Object.keys(sheet.rows).map(Number).sort((a, b) => a - b)
    for (const rowNumber of rowNumbers) {
      const row = sheet.rows[rowNumber]
      const values = Object.values(row).map((value) => clean(value, 500)).filter(Boolean)
      if (!values.length) continue
      if (isNoteRow(values)) {
        skipped.push({ sheet: sheet.name, row: rowNumber, title: values.join(' ').slice(0, 120), reason: 'Totals or signature row.' })
        continue
      }

      if (code === 'GE' && cell(row, 'C') && !cell(row, 'D') && !numbered(cell(row, 'A'))) {
        const band = cell(row, 'C')
        subject = isAcquisitionBand(band) ? GENERAL_EDUCATION_CATEGORY : band.slice(0, 100)
        continue
      }

      const parsed = readBookRow(code, sheet.name, rowNumber, row, subject)
      if (!parsed) {
        if (values.some((value) => /author|title|accession|isbn|copies/i.test(value))) continue
        skipped.push({ sheet: sheet.name, row: rowNumber, title: values.join(' ').slice(0, 120), reason: 'Row is not a numbered holding.' })
        continue
      }
      if (parsed.isbnIssue) isbnIssues.push({ sheet: sheet.name, row: rowNumber, title: parsed.draft.title, reason: parsed.isbnIssue })
      if (parsed.yearIssue) isbnIssues.push({ sheet: sheet.name, row: rowNumber, title: parsed.draft.title, reason: parsed.yearIssue })

      const key = identity(parsed.draft)
      const existing = byIdentity.get(key)
      if (existing) {
        if (parsed.draft.isbn && existing.isbn && parsed.draft.isbn !== existing.isbn) {
          isbnIssues.push({ sheet: sheet.name, row: rowNumber, title: parsed.draft.title, reason: `ISBN ${parsed.draft.isbn} differs from the first copy of this book.` })
        } else if (parsed.draft.isbn && !existing.isbn) {
          claimIsbn(existing, parsed.draft.isbn, byIsbn, isbnIssues, sheet.name, rowNumber)
        }
        addCopies(existing, rowNumber, parsed.copies)
        continue
      }
      if (parsed.draft.isbn) claimIsbn(parsed.draft, parsed.draft.isbn, byIsbn, isbnIssues, sheet.name, rowNumber)
      addCopies(parsed.draft, rowNumber, parsed.copies)
      byIdentity.set(key, parsed.draft)
      drafts.push(parsed.draft)
    }
  }

  const categories = new Map<string, HoldingsCategory>()
  const titles: HoldingsTitle[] = drafts.map((draft) => {
    const programNames = [...PROGRAMS[draft.sheetCode]]
    const current = categories.get(draft.categoryName)
    if (!current) {
      categories.set(draft.categoryName, {
        name: draft.categoryName,
        shelfLocation: draft.sheetCode,
        description: `${draft.sheetCode} holdings: ${draft.categoryName}`.slice(0, 255),
        programNames,
      })
    }
    return {
      sheetCode: draft.sheetCode,
      sourceRows: draft.sourceRows,
      categoryName: draft.categoryName,
      shelfLocation: draft.sheetCode,
      programNames,
      title: draft.title,
      authors: draft.authors,
      isbn: draft.isbn,
      publicationYear: draft.publicationYear,
      publisher: draft.publisher,
      accessions: draft.accessions,
    }
  })

  return { titles, categories: [...categories.values()], skipped, isbnIssues }
}

function claimIsbn(draft: Draft, isbn: string, byIsbn: Map<string, Draft>, issues: HoldingsIssue[], sheet: string, row: number) {
  const owner = byIsbn.get(isbn)
  if (!owner) {
    draft.isbn = isbn
    byIsbn.set(isbn, draft)
    return
  }
  if (owner === draft) return
  draft.isbn = null
  issues.push({ sheet, row, title: draft.title, reason: `ISBN ${isbn} is already used by “${owner.title}”.` })
}

function readBookRow(code: SheetCode, sheetName: string, rowNumber: number, row: Record<string, string>, subject: string) {
  if (code === 'GE') return readColumns(code, sheetName, rowNumber, row, subject, { number: 'A', author: 'C', title: 'D', edition: 'E', copies: 'F' })
  if (code === 'SHS') return readColumns(code, sheetName, rowNumber, row, COLLECTION_CATEGORY.SHS, { number: 'A', author: 'C', title: 'D', publisher: 'E', year: 'F', copies: 'H' })
  if (code === 'IT') return readColumns(code, sheetName, rowNumber, row, COLLECTION_CATEGORY.IT, { number: 'A', author: 'C', title: 'D', edition: 'E', year: 'F', publisher: 'G', copies: 'H' })
  return readColumns(code, sheetName, rowNumber, row, COLLECTION_CATEGORY[code], { number: 'A', title: 'C', author: 'D', publisher: 'E', year: 'F', isbn: 'H', copies: 'I' })
}

function readColumns(
  code: SheetCode,
  sheetName: string,
  rowNumber: number,
  row: Record<string, string>,
  categoryName: string,
  columns: { number: string; title: string; author: string; edition?: string; publisher?: string; year?: string; isbn?: string; copies: string },
) {
  if (!numbered(cell(row, columns.number))) return null
  const rawTitle = cell(row, columns.title)
  if (!rawTitle) return null
  const title = withEdition(rawTitle.slice(0, 255), columns.edition ? cell(row, columns.edition) : '')
  const authors = splitHoldingAuthors(cell(row, columns.author))
  const rawIsbn = columns.isbn ? cell(row, columns.isbn) : ''
  const isbn = rawIsbn ? usableIsbn(rawIsbn) : null
  const rawYear = columns.year ? cell(row, columns.year) : ''
  const year = rawYear ? publicationYear(rawYear) : null
  const copies = copyCount(cell(row, columns.copies))
  const draft: Draft = {
    sheetCode: code,
    sheetName,
    sourceRows: [],
    categoryName,
    title,
    authors: authors.length ? authors : ['Unknown author'],
    isbn,
    publicationYear: year,
    publisher: columns.publisher ? clean(cell(row, columns.publisher)) || null : null,
    accessions: [],
  }
  return {
    draft,
    copies: copies ?? 1,
    isbnIssue: rawIsbn && !isbn ? `ISBN “${rawIsbn.slice(0, 40)}” is not a 10- or 13-digit ISBN.` : null,
    yearIssue: rawYear && year === null ? `Year “${rawYear.slice(0, 20)}” was left blank.` : null,
  }
}

export function summarizeHoldings(catalog: HoldingsCatalog) {
  const copies = catalog.titles.reduce((total, title) => total + title.accessions.length, 0)
  const bySheet = new Map<SheetCode, { titles: number; copies: number }>()
  for (const title of catalog.titles) {
    const current = bySheet.get(title.sheetCode) ?? { titles: 0, copies: 0 }
    current.titles += 1
    current.copies += title.accessions.length
    bySheet.set(title.sheetCode, current)
  }
  return { titles: catalog.titles.length, copies, categories: catalog.categories.length, bySheet, skipped: catalog.skipped.length, isbnIssues: catalog.isbnIssues.length }
}

export async function readHoldingsWorkbook(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const workbook = await zip.file('xl/workbook.xml')?.async('string')
  const rels = await zip.file('xl/_rels/workbook.xml.rels')?.async('string')
  if (!workbook || !rels) throw new Error('The workbook is missing its sheet list.')
  const shared = await zip.file('xl/sharedStrings.xml')?.async('string')
  const strings = shared ? readSharedStrings(shared) : []
  const targets = new Map<string, string>()
  for (const match of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    const target = match[2].startsWith('/') ? match[2].slice(1) : match[2].startsWith('xl/') ? match[2] : `xl/${match[2]}`
    targets.set(match[1], target)
  }
  const sheets: HoldingsSheet[] = []
  for (const match of workbook.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"|<sheet\b[^>]*r:id="([^"]+)"[^>]*name="([^"]+)"/g)) {
    const name = decodeXml(match[1] ?? match[4])
    const id = match[2] ?? match[3]
    const target = targets.get(id)
    const xml = target ? await zip.file(target)?.async('string') : null
    if (!xml) continue
    sheets.push({ name, rows: readSheetRows(xml, strings) })
  }
  return parseHoldings(sheets)
}

function readSharedStrings(xml: string) {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => (
    [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((text) => decodeXml(text[1])).join('')
  ))
}

function readSheetRows(xml: string, strings: string[]) {
  const rows: Record<number, Record<string, string>> = {}
  for (const match of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attributes = match[1]
    const ref = /r="([A-Z]+)(\d+)"/.exec(attributes)
    if (!ref) continue
    const column = ref[1]
    const rowNumber = Number(ref[2])
    const type = /t="([^"]+)"/.exec(attributes)?.[1] ?? ''
    const body = match[2] ?? ''
    let value = ''
    if (type === 's') {
      const index = Number(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '')
      value = strings[index] ?? ''
    } else if (type === 'inlineStr') {
      value = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((text) => decodeXml(text[1])).join('')
    } else {
      value = decodeXml(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '')
    }
    const trimmed = value.trim()
    if (!trimmed) continue
    rows[rowNumber] ??= {}
    rows[rowNumber][column] = trimmed
  }
  return rows
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}
