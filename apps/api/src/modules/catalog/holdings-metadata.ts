import type { Pool, RowDataPacket } from 'mysql2/promise'
import { env } from '../../config/env.js'
import { removeStoredCover, storeCoverImage } from './cover-image.storage.ts'
import { isCurrentGeneratedCover, isGeneratedCover, renderGeneratedCoverPng } from './generated-cover.ts'

const OPEN_LIBRARY_JSON_API = 'https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:'
const OPEN_LIBRARY_IMG_API = 'https://covers.openlibrary.org/b/isbn/'
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'
const OPEN_LIBRARY_ORIGIN = 'https://openlibrary.org'
const APPLE_SEARCH = 'https://itunes.apple.com/search'

export type MetadataHit = {
  imageUrl: string | null
  fallbackImageUrls: string[]
  synopsis: string | null
  googleChecked: boolean
  appleChecked: boolean
}

type OpenLibraryHit = { imageUrl: string | null; confirmed: boolean; synopsis: string | null }

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<{
  ok: boolean
  status?: number
  headers: { get(name: string): string | null }
  json(): Promise<unknown>
  arrayBuffer(): Promise<ArrayBuffer>
}>

type LookupOptions = { googleBooksApiKey?: string }

export function plainSynopsis(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)
}

function looseTitle(value: string) {
  return value
    .toLocaleLowerCase('en-US')
    .replace(/\([^)]*edition[^)]*\)/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function titlesMatch(left: string, right: string) {
  const expected = looseTitle(left)
  return expected.length > 0 && expected === looseTitle(right)
}

export function titlesAreClose(left: string, right: string) {
  if (titlesMatch(left, right)) return true
  const expected = looseTitle(left)
  const candidate = looseTitle(right)
  if (expected.length < 12 || candidate.length < 12) return false
  return expected.includes(candidate) || candidate.includes(expected)
}

export function coverDataUri(buffer: Buffer, contentType: string | null) {
  if (buffer.length <= 200 || buffer.length > 2 * 1024 * 1024) return null
  const declared = contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const webp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  const type = jpeg ? 'image/jpeg' : png ? 'image/png' : webp ? 'image/webp' : declared === 'image/jpg' ? 'image/jpeg' : ''
  if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) return null
  if ((type === 'image/jpeg' && !jpeg) || (type === 'image/png' && !png) || (type === 'image/webp' && !webp)) return null
  return `data:${type};base64,${buffer.toString('base64')}`
}

export function keepMetadataText(existing: string | null, found: string | null) {
  if (found) return found
  if (!existing || existing === '[No synopsis available]') return null
  return existing
}

export function keepCoverPath(existing: string | null, found: string | null) {
  if (found) return found
  if (!existing || existing === 'none' || isGeneratedCover(existing)) return null
  return existing
}

export function isRetryableMetadataError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /429|aborted|timeout|timed out|ECONNRESET|ETIMEDOUT|fetch failed/i.test(message)
}

export async function findHoldingMetadata(
  input: { isbn?: string | null; title: string; author?: string | null },
  fetcher: Fetcher = fetch,
  options: LookupOptions = {},
): Promise<MetadataHit> {
  const isbn = input.isbn?.replace(/[^0-9X]/gi, '').toUpperCase() ?? ''
  const validIsbn = isbn.length === 10 || isbn.length === 13
  const openLibrary = validIsbn
    ? await findByIsbn(isbn, fetcher)
    : await findByTitle(input.title, input.author ?? '', fetcher)
  let synopsis = openLibrary.synopsis
  const fallbackImageUrls: string[] = []
  const googleChecked = Boolean(options.googleBooksApiKey && (!synopsis || !openLibrary.confirmed))
  if (googleChecked && options.googleBooksApiKey) {
    const google = await googleVolume(input, validIsbn ? isbn : '', fetcher, options.googleBooksApiKey)
    if (!synopsis) synopsis = google.synopsis
    if (google.imageUrl) fallbackImageUrls.push(google.imageUrl)
  }
  if (!openLibrary.confirmed) {
    const apple = await appleCoverImage({ isbn: validIsbn ? isbn : null, title: input.title, author: input.author }, fetcher)
    if (apple) fallbackImageUrls.push(apple)
  }
  return { imageUrl: openLibrary.imageUrl, fallbackImageUrls, synopsis, googleChecked, appleChecked: !openLibrary.confirmed }
}

async function findByIsbn(isbn: string, fetcher: Fetcher): Promise<OpenLibraryHit> {
  let imageUrl: string | null = null
  let synopsis: string | null = null
  const openLibrary = await readJson(fetcher, `${OPEN_LIBRARY_JSON_API}${encodeURIComponent(isbn)}`)
  const book = openLibrary?.[`ISBN:${isbn}`] as { cover?: { large?: string; medium?: string }; excerpts?: Array<{ text?: string }> } | undefined
  if (book?.cover?.large) imageUrl = book.cover.large
  else if (book?.cover?.medium) imageUrl = book.cover.medium
  const confirmed = Boolean(imageUrl)
  if (book?.excerpts?.[0]?.text) synopsis = plainSynopsis(book.excerpts[0].text)
  const workText = await openLibraryWorkSynopsis(fetcher, `${OPEN_LIBRARY_ORIGIN}/isbn/${encodeURIComponent(isbn)}.json`)
  if (workText) synopsis = workText
  if (!imageUrl) imageUrl = `${OPEN_LIBRARY_IMG_API}${encodeURIComponent(isbn)}-L.jpg`
  return { imageUrl, confirmed, synopsis }
}

async function findByTitle(title: string, author: string, fetcher: Fetcher): Promise<OpenLibraryHit> {
  const url = new URL(OPEN_LIBRARY_SEARCH)
  url.searchParams.set('title', title.replace(/\([^)]*edition[^)]*\)/gi, ' '))
  if (author) url.searchParams.set('author', author)
  url.searchParams.set('limit', '5')
  url.searchParams.set('fields', 'title,author_name,cover_i,first_sentence,key')
  const payload = await readJson(fetcher, url)
  const docs = (payload?.docs ?? []) as Array<{ title?: string; cover_i?: number; first_sentence?: string | string[]; key?: string }>
  const match = docs.find((doc) => typeof doc.title === 'string' && titlesAreClose(title, doc.title))
  if (!match) return { imageUrl: null, confirmed: false, synopsis: null }
  const sentence = Array.isArray(match.first_sentence) ? match.first_sentence[0] : match.first_sentence
  const workText = match.key ? await openLibraryWorkSynopsis(fetcher, `${OPEN_LIBRARY_ORIGIN}${match.key}.json`) : null
  const imageUrl = match.cover_i ? `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg` : null
  return {
    imageUrl,
    confirmed: Boolean(imageUrl),
    synopsis: workText ?? (typeof sentence === 'string' ? plainSynopsis(sentence) : null),
  }
}

async function openLibraryWorkSynopsis(fetcher: Fetcher, recordUrl: string) {
  const record = await readJson(fetcher, recordUrl)
  if (!record) return null
  const direct = descriptionText(record.description)
  if (direct) return direct
  const workKey = Array.isArray(record.works) ? (record.works[0] as { key?: string } | undefined)?.key : null
  if (!workKey) return null
  const work = await readJson(fetcher, `${OPEN_LIBRARY_ORIGIN}${workKey}.json`)
  return work ? descriptionText(work.description) : null
}

function descriptionText(value: unknown) {
  if (typeof value === 'string') return plainSynopsis(value) || null
  if (value && typeof value === 'object' && typeof (value as { value?: unknown }).value === 'string') {
    return plainSynopsis((value as { value: string }).value) || null
  }
  return null
}

function googleImageUrl(links: Record<string, string> | undefined) {
  if (!links) return null
  const raw = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail
  if (!raw) return null
  const secure = raw.replace(/^http:\/\//i, 'https://')
  if (!links.extraLarge && !links.large && !links.medium && /zoom=\d+/.test(secure)) return secure.replace(/zoom=\d+/, 'zoom=3')
  return secure
}

async function googleVolume(
  input: { title: string; author?: string | null },
  isbn: string,
  fetcher: Fetcher,
  apiKey: string,
) {
  const url = new URL('https://www.googleapis.com/books/v1/volumes')
  url.searchParams.set('q', isbn ? `isbn:${isbn}` : `intitle:${input.title}${input.author ? ` inauthor:${input.author}` : ''}`)
  url.searchParams.set('maxResults', '3')
  url.searchParams.set('printType', 'books')
  url.searchParams.set('key', apiKey)
  const payload = await readJson(fetcher, url)
  const items = (payload?.items ?? []) as Array<{ volumeInfo?: { title?: string; description?: string; imageLinks?: Record<string, string> } }>
  const pool = isbn
    ? items
    : items.filter((item) => item.volumeInfo?.title && titlesAreClose(input.title, item.volumeInfo.title))
  const withImage = pool.find((item) => googleImageUrl(item.volumeInfo?.imageLinks))
  const withText = pool.find((item) => item.volumeInfo?.description) ?? (isbn ? items.find((item) => item.volumeInfo?.description) : undefined)
  return {
    imageUrl: googleImageUrl(withImage?.volumeInfo?.imageLinks),
    synopsis: withText?.volumeInfo?.description ? plainSynopsis(withText.volumeInfo.description) : null,
  }
}

async function appleCoverImage(
  input: { isbn?: string | null; title: string; author?: string | null },
  fetcher: Fetcher,
) {
  const isbn = input.isbn?.replace(/[^0-9X]/gi, '').toUpperCase() ?? ''
  const url = new URL(APPLE_SEARCH)
  url.searchParams.set('term', isbn.length === 10 || isbn.length === 13 ? isbn : `${input.title} ${input.author ?? ''}`.trim())
  url.searchParams.set('entity', 'ebook')
  url.searchParams.set('country', 'us')
  url.searchParams.set('limit', '5')
  const payload = await readJson(fetcher, url)
  const results = (payload?.results ?? []) as Array<{ trackName?: string; artworkUrl100?: string }>
  const match = results.find((result) => result.trackName && result.artworkUrl100 && titlesAreClose(input.title, result.trackName))
  if (!match?.artworkUrl100) return null
  return match.artworkUrl100.replace(/\/\d+x\d+bb(?=\.)/, '/600x600bb').replace(/^http:\/\//i, 'https://')
}

async function storeFirst(urls: Array<string | null | undefined>, store: (imageUrl: string) => Promise<string | null>) {
  for (const imageUrl of urls) {
    if (!imageUrl) continue
    const saved = await store(imageUrl)
    if (saved) return saved
  }
  return null
}

async function readJson(fetcher: Fetcher, url: string | URL) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetcher(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'STI-Ormoc-SmartLib/0.1' },
      signal: controller.signal,
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Metadata provider returned ${response.status ?? 'error'}.`)
    return await response.json() as Record<string, unknown>
  } finally {
    clearTimeout(timeout)
  }
}

export async function downloadCover(imageUrl: string, fetcher: Fetcher = fetch) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetcher(imageUrl, { signal: controller.signal, headers: { 'User-Agent': 'STI-Ormoc-SmartLib/0.1' } })
    if (response.status === 429) throw new Error('Metadata provider returned 429.')
    if (!response.ok) return null
    const dataUri = coverDataUri(Buffer.from(await response.arrayBuffer()), response.headers.get('content-type'))
    return dataUri ? storeCoverImage(dataUri) : null
  } finally {
    clearTimeout(timeout)
  }
}

const PENDING_SQL = (limit: number) => `SELECT t.title_id, t.title, t.isbn, t.cover_image_path, t.synopsis,
       (SELECT a.author_name FROM authors a
         WHERE a.title_id = t.title_id
         ORDER BY a.author_order, a.author_id
         LIMIT 1) AS author_name
  FROM titles t
 WHERE t.record_type = 'Book'
   AND t.metadata_checked_at IS NULL
   AND (
     t.cover_image_path IS NULL OR t.cover_image_path = '' OR t.cover_image_path = 'none'
     OR t.cover_image_path LIKE '%/generated-%'
     OR t.synopsis IS NULL OR t.synopsis = '' OR t.synopsis = '[No synopsis available]'
   )
 ORDER BY t.title_id
 LIMIT ${limit}`

export async function resetIncompleteMetadata(database: Pool) {
  const [result] = await database.execute(
    `UPDATE titles
        SET metadata_checked_at = NULL, updated_at = NOW()
      WHERE record_type = 'Book'
        AND metadata_checked_at IS NOT NULL
        AND (
          cover_image_path IS NULL OR cover_image_path = '' OR cover_image_path = 'none'
          OR cover_image_path LIKE '%/generated-%'
          OR synopsis IS NULL OR synopsis = '' OR synopsis = '[No synopsis available]'
        )`,
  )
  return Number((result as { affectedRows?: number }).affectedRows ?? 0)
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function storeGeneratedCover(title: string, author: string) {
  const png = renderGeneratedCoverPng(title, author)
  return storeCoverImage(`data:image/png;base64,${png.toString('base64')}`, { filenamePrefix: 'generated-v4' })
}

export function plainCoverRedrawSql(limit: number) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  return `SELECT t.title_id, t.title, t.cover_image_path,
       (SELECT a.author_name FROM authors a
         WHERE a.title_id = t.title_id
         ORDER BY a.author_order, a.author_id
         LIMIT 1) AS author_name
  FROM titles t
 WHERE t.record_type = 'Book'
   AND t.lifecycle_status = 'Active'
   AND (
     t.cover_image_path IS NULL OR t.cover_image_path = '' OR t.cover_image_path = 'none'
     OR t.cover_image_path LIKE '%/generated-%'
   )
   AND (t.cover_image_path IS NULL OR t.cover_image_path NOT LIKE '%/generated-v4-%')
 ORDER BY t.title_id
 LIMIT ${safeLimit}`
}

export async function redrawPlainCovers(database: Pool, options: {
  limit?: number
  generateCover?: (title: string, author: string) => Promise<string | null>
} = {}) {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 40), 1), 100)
  const generateCover = options.generateCover ?? storeGeneratedCover
  const [rows] = await database.execute<RowDataPacket[]>(plainCoverRedrawSql(limit))
  let updated = 0
  for (const row of rows) {
    const existing = row.cover_image_path ? String(row.cover_image_path) : null
    if (existing && existing !== 'none' && !isGeneratedCover(existing)) continue
    if (isCurrentGeneratedCover(existing)) continue
    const next = await generateCover(String(row.title), row.author_name ? String(row.author_name) : '').catch(() => null)
    if (!next) continue
    const [result] = await database.execute(
      `UPDATE titles
          SET cover_image_path = ?, updated_at = NOW()
        WHERE title_id = ?
          AND (
            cover_image_path IS NULL OR cover_image_path = '' OR cover_image_path = 'none'
            OR cover_image_path LIKE '%/generated-%'
          )`,
      [next, row.title_id],
    )
    const changed = Number((result as { affectedRows?: number }).affectedRows ?? 0)
    if (changed > 0 && existing && isGeneratedCover(existing)) await removeStoredCover(existing).catch(() => undefined)
    updated += changed
  }
  return { attempted: rows.length, updated }
}

export async function enrichHoldingsMetadata(database: Pool, options: {
  fetcher?: Fetcher
  limit?: number
  delayMs?: number
  store?: (imageUrl: string) => Promise<string | null>
  generateCover?: (title: string, author: string) => Promise<string | null>
  googleBooksApiKey?: string
  sleep?: (ms: number) => Promise<void>
} = {}) {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 25), 1), 200)
  const delayMs = options.delayMs ?? 800
  const fetcher = options.fetcher ?? fetch
  const store = options.store ?? ((imageUrl: string) => downloadCover(imageUrl, fetcher))
  const generateCover = options.generateCover ?? storeGeneratedCover
  const googleBooksApiKey = options.googleBooksApiKey ?? env.isbnLookup.googleBooksApiKey
  const sleep = options.sleep ?? defaultSleep
  const [rows] = await database.execute<RowDataPacket[]>(PENDING_SQL(limit))
  let covers = 0
  let synopses = 0
  let checked = 0
  for (const row of rows) {
    let waitMs = 30_000
    let saved = false
    for (let attempt = 0; attempt < 5 && !saved; attempt += 1) {
      try {
        const hit = await findHoldingMetadata({
          isbn: row.isbn ? String(row.isbn) : null,
          title: String(row.title),
          author: row.author_name ? String(row.author_name) : null,
        }, fetcher, { googleBooksApiKey })
        const existingCover = row.cover_image_path ? String(row.cover_image_path) : null
        const realCover = keepCoverPath(existingCover, null)
        let storedCover: string | null = null
        if (!realCover) {
          storedCover = await storeFirst([hit.imageUrl, ...hit.fallbackImageUrls], store)
          if (!storedCover && !hit.googleChecked && googleBooksApiKey) {
            const digits = row.isbn ? String(row.isbn).replace(/[^0-9X]/gi, '').toUpperCase() : ''
            const google = await googleVolume({
              title: String(row.title),
              author: row.author_name ? String(row.author_name) : null,
            }, digits.length === 10 || digits.length === 13 ? digits : '', fetcher, googleBooksApiKey)
            if (google.imageUrl) storedCover = await store(google.imageUrl)
          }
          if (!storedCover && !hit.appleChecked) {
            const apple = await appleCoverImage({
              isbn: row.isbn ? String(row.isbn) : null,
              title: String(row.title),
              author: row.author_name ? String(row.author_name) : null,
            }, fetcher)
            if (apple) storedCover = await store(apple)
          }
        }
        const generatedCover = realCover
          || storedCover
          || (isCurrentGeneratedCover(existingCover) ? existingCover : await generateCover(String(row.title), row.author_name ? String(row.author_name) : '').catch(() => null))
        const synopsis = keepMetadataText(row.synopsis ? String(row.synopsis) : null, hit.synopsis)
        if (storedCover) covers += 1
        else if (!realCover && generatedCover && generatedCover !== existingCover) covers += 1
        if (hit.synopsis && (!row.synopsis || row.synopsis === '[No synopsis available]')) synopses += 1
        await database.execute(
          `UPDATE titles
              SET cover_image_path = ?, synopsis = ?, metadata_checked_at = NOW(), updated_at = NOW()
            WHERE title_id = ?`,
          [generatedCover, synopsis, row.title_id],
        )
        checked += 1
        saved = true
      } catch (error) {
        const retry = isRetryableMetadataError(error)
        if (!retry || attempt === 4) {
          console.error(`Metadata lookup failed for title ${row.title_id}:`, error instanceof Error ? error.message : error)
          break
        }
        console.error(`Metadata lookup paused for title ${row.title_id}; retrying in ${Math.round(waitMs / 1000)}s.`)
        await sleep(waitMs)
        waitMs = Math.min(waitMs * 2, 180_000)
      }
    }
    if (delayMs > 0) await sleep(delayMs)
  }
  return { attempted: rows.length, checked, covers, synopses }
}
