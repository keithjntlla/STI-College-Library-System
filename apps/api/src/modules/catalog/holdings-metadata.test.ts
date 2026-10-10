import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import test from 'node:test'
import type { Pool } from 'mysql2/promise'
import { coverDataUri, enrichHoldingsMetadata, findHoldingMetadata, isRetryableMetadataError, keepCoverPath, keepMetadataText, plainCoverRedrawSql, plainSynopsis, resetIncompleteMetadata, titlesAreClose, titlesMatch } from './holdings-metadata.ts'
import { isCurrentGeneratedCover, isGeneratedCover, renderGeneratedCoverPng } from './generated-cover.ts'

test('holdings metadata migration adds the synopsis and checked-at columns', async () => {
  const postgres = await readFile(new URL('../../../../../database/supabase/022_holdings_metadata.sql', import.meta.url), 'utf8')
  const mysql = await readFile(new URL('../../../../../database/migrations/20261010_052_holdings_metadata.sql', import.meta.url), 'utf8')
  assert.match(postgres, /ADD COLUMN IF NOT EXISTS synopsis TEXT/)
  assert.match(postgres, /ADD COLUMN IF NOT EXISTS metadata_checked_at/)
  assert.match(mysql, /`synopsis` TEXT/)
  assert.match(mysql, /`metadata_checked_at` DATETIME/)
})

test('accepts the same title and ignores edition notes and placeholder values', () => {
  assert.equal(titlesMatch('Pocketbook of English Grammar (2nd edition)', 'Pocketbook of English Grammar'), true)
  assert.equal(titlesMatch('Basic Calculus', 'Advanced Calculus'), false)
  assert.equal(titlesAreClose('Basic Calculus', 'Basic Calculus for Senior High'), true)
  assert.equal(titlesAreClose('Basic Calculus', 'Advanced Calculus'), false)
  assert.equal(plainSynopsis('<p>A short &amp; useful book.</p>'), 'A short & useful book.')
  assert.equal(keepMetadataText('[No synopsis available]', null), null)
  assert.equal(keepCoverPath('none', null), null)
  assert.equal(keepCoverPath('/covers/a.jpg', null), '/covers/a.jpg')
})

test('rejects a tiny or non-image cover payload', () => {
  assert.equal(coverDataUri(Buffer.from([0xff, 0xd8, 0xff, 1, 2]), 'image/jpeg'), null)
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(220, 7)])
  assert.match(coverDataUri(jpeg, 'application/octet-stream') ?? '', /^data:image\/jpeg;base64,/)
})

test('uses an ISBN lookup before a title search, and only an exact title match without one', async () => {
  const calls: string[] = []
  const fetcher = async (url: string | URL) => {
    const href = String(url)
    calls.push(href)
    if (href.includes('openlibrary.org/api/books')) {
      return json({ 'ISBN:9780132350884': { excerpts: [{ text: '<b>Clean code</b> matters.' }], cover: { large: 'https://covers.example/large.jpg' } } })
    }
    if (href.includes('search.json')) {
      return json({ docs: [{ title: 'Different Book', cover_i: 9, first_sentence: 'Nope.' }, { title: 'Basic Calculus', cover_i: 42, first_sentence: ['A calculus course.'] }] })
    }
    return json({})
  }
  const byIsbn = await findHoldingMetadata({ isbn: '978-0-13-235088-4', title: 'Clean Code', author: 'Martin' }, fetcher)
  assert.equal(byIsbn.synopsis, 'Clean code matters.')
  assert.equal(byIsbn.imageUrl, 'https://covers.example/large.jpg')
  assert.equal(calls.some((url) => url.includes('search.json')), false)

  const byTitle = await findHoldingMetadata({ isbn: null, title: 'Basic Calculus (1st edition)', author: 'McGraw Hill' }, fetcher)
  assert.equal(byTitle.imageUrl, 'https://covers.openlibrary.org/b/id/42-L.jpg')
  assert.equal(byTitle.synopsis, 'A calculus course.')
  assert.equal(calls.some((url) => url.includes('googleapis.com')), false)
})

test('prefers the Open Library work description over a one-line excerpt', async () => {
  const fetcher = async (url: string | URL) => {
    const href = String(url)
    if (href.includes('/works/OL1W.json')) return json({ description: { value: 'A full description of the calculus course for students.' } })
    if (href.includes('search.json')) return json({ docs: [{ title: 'Basic Calculus', key: '/works/OL1W', cover_i: 7, first_sentence: 'Short.' }] })
    return json({})
  }
  const hit = await findHoldingMetadata({ title: 'Basic Calculus', author: 'McGraw Hill' }, fetcher, { googleBooksApiKey: '' })
  assert.equal(hit.synopsis, 'A full description of the calculus course for students.')
  assert.equal(hit.imageUrl, 'https://covers.openlibrary.org/b/id/7-L.jpg')
})

test('asks Google Books for a missing description only when an API key is configured', async () => {
  const calls: string[] = []
  const fetcher = async (url: string | URL) => {
    calls.push(String(url))
    if (String(url).includes('googleapis.com')) return json({ items: [{ volumeInfo: { title: 'Basic Calculus', description: 'Google description.' } }] })
    return json({ docs: [] })
  }
  await findHoldingMetadata({ title: 'Basic Calculus', author: 'Hill' }, fetcher, { googleBooksApiKey: '' })
  assert.equal(calls.some((url) => url.includes('googleapis.com')), false)
  const hit = await findHoldingMetadata({ title: 'Basic Calculus', author: 'Hill' }, fetcher, { googleBooksApiKey: 'test-key' })
  assert.equal(hit.synopsis, 'Google description.')
})

test('waits and retries a rate-limited lookup without marking it checked', async () => {
  const waits: number[] = []
  let calls = 0
  const updates: unknown[][] = []
  const database = {
    async execute(sql: string, parameters: unknown[] = []) {
      if (sql.includes('FROM titles')) return [[{ title_id: 9, title: 'Networks', isbn: null, cover_image_path: null, synopsis: null, author_name: 'Tanenbaum' }]]
      updates.push(parameters)
      return [{ affectedRows: 1 }]
    },
  }
  const fetcher = async () => {
    calls += 1
    if (calls === 1) {
      const error = new Error('Metadata provider returned 429.')
      throw error
    }
    return json({ docs: [{ title: 'Networks', first_sentence: 'A book about computer networks and how they work.' }] })
  }
  const result = await enrichHoldingsMetadata(database as unknown as Pool, {
    fetcher, limit: 1, delayMs: 0, sleep: async (ms) => { waits.push(ms) }, generateCover: async () => 'generated.png', googleBooksApiKey: '',
  })
  assert.deepEqual(waits, [30000])
  assert.equal(result.attempted, 1)
  assert.equal(result.checked, 1)
  assert.equal(isRetryableMetadataError(new Error('This operation was aborted')), true)
  assert.equal(updates.length, 1)
})

test('records a completed lookup without writing a placeholder when nothing is found', async () => {
  const updates: unknown[][] = []
  const database = {
    async execute(sql: string, parameters: unknown[] = []) {
      if (sql.includes('FROM titles')) {
        return [[{ title_id: 5, title: 'Local Textbook', isbn: null, cover_image_path: 'none', synopsis: '[No synopsis available]', author_name: 'STI' }]]
      }
      updates.push(parameters)
      return [{ affectedRows: 1 }]
    },
  }
  const fetcher = async () => json({ docs: [{ title: 'Someone Else', first_sentence: 'No.' }] })
  const result = await enrichHoldingsMetadata(database as unknown as Pool, {
    fetcher, limit: 5, delayMs: 0, generateCover: async () => '/api/assets/covers/generated-11111111-1111-1111-1111-111111111111.png', googleBooksApiKey: '',
  })
  assert.deepEqual(result, { attempted: 1, checked: 1, covers: 1, synopses: 0 })
  assert.equal(isGeneratedCover(String(updates[0][0])), true)
  assert.equal(updates[0][1], null)
  assert.equal(updates[0][2], 5)
})

test('uses Google Books, then Apple Books, when Open Library has no cover', async () => {
  const calls: string[] = []
  const fetcher = async (url: string | URL) => {
    const href = String(url)
    calls.push(href)
    if (href.includes('googleapis.com')) {
      return json({
        items: [{
          volumeInfo: {
            title: 'Basic Calculus',
            description: 'A course description.',
            imageLinks: { thumbnail: 'http://books.google.com/books/content?id=abc&zoom=1' },
          },
        }],
      })
    }
    if (href.includes('itunes.apple.com')) {
      return json({
        results: [
          { trackName: 'Unrelated Stories', artworkUrl100: 'https://example.com/100x100bb.jpg' },
          { trackName: 'Basic Calculus', artworkUrl100: 'https://example.com/art/100x100bb.jpg' },
        ],
      })
    }
    return json({ docs: [] })
  }
  const hit = await findHoldingMetadata({ title: 'Basic Calculus', author: 'Hill' }, fetcher, { googleBooksApiKey: 'test-key' })
  assert.equal(hit.imageUrl, null)
  assert.deepEqual(hit.fallbackImageUrls, [
    'https://books.google.com/books/content?id=abc&zoom=3',
    'https://example.com/art/600x600bb.jpg',
  ])
  assert.equal(hit.synopsis, 'A course description.')
  assert.equal(hit.appleChecked, true)
  assert.equal(calls.filter((url) => url.includes('googleapis.com')).length, 1)
})

test('skips a shop cover whose title does not match', async () => {
  const fetcher = async (url: string | URL) => {
    if (String(url).includes('itunes.apple.com')) return json({ results: [{ trackName: 'Advanced Statistics', artworkUrl100: 'https://example.com/100x100bb.jpg' }] })
    if (String(url).includes('googleapis.com')) return json({ items: [{ volumeInfo: { title: 'Advanced Statistics', imageLinks: { large: 'https://books.example/wrong.jpg' } } }] })
    return json({ docs: [] })
  }
  const hit = await findHoldingMetadata({ title: 'Basic Calculus', author: 'Hill' }, fetcher, { googleBooksApiKey: 'test-key' })
  assert.deepEqual(hit.fallbackImageUrls, [])
})

test('tries the next cover when the first download is not a real picture', async () => {
  const stored: string[] = []
  const database = {
    async execute(sql: string) {
      if (sql.includes('FROM titles')) {
        return [[{ title_id: 3, title: 'Basic Calculus', isbn: null, cover_image_path: null, synopsis: null, author_name: 'Hill' }]]
      }
      return [{ affectedRows: 1 }]
    },
  }
  const fetcher = async (url: string | URL) => {
    if (String(url).includes('googleapis.com')) {
      return json({ items: [{ volumeInfo: { title: 'Basic Calculus', imageLinks: { large: 'https://books.example/cover.jpg' } } }] })
    }
    if (String(url).includes('itunes.apple.com')) {
      return json({ results: [{ trackName: 'Basic Calculus', artworkUrl100: 'https://example.com/100x100bb.jpg' }] })
    }
    return json({ docs: [] })
  }
  const result = await enrichHoldingsMetadata(database as unknown as Pool, {
    fetcher,
    limit: 1,
    delayMs: 0,
    googleBooksApiKey: 'test-key',
    store: async (imageUrl) => {
      stored.push(imageUrl)
      return imageUrl.includes('books.example') ? null : '/api/assets/covers/apple.jpg'
    },
    generateCover: async () => 'should-not-run',
  })
  assert.deepEqual(stored, ['https://books.example/cover.jpg', 'https://example.com/600x600bb.jpg'])
  assert.equal(result.covers, 1)
})

test('keeps a current plain cover and redraws an older one', async () => {
  const current = '/api/assets/covers/generated-v4-11111111-1111-1111-1111-111111111111.png'
  const older = '/api/assets/covers/generated-v2-22222222-2222-2222-2222-222222222222.png'
  assert.equal(isGeneratedCover(current), true)
  assert.equal(isCurrentGeneratedCover(current), true)
  assert.equal(isGeneratedCover(older), true)
  assert.equal(isCurrentGeneratedCover(older), false)
  const updates: unknown[][] = []
  let generated = 0
  const database = {
    async execute(sql: string, parameters: unknown[] = []) {
      if (sql.includes('FROM titles')) {
        return [[{ title_id: 8, title: 'Local Textbook', isbn: null, cover_image_path: current, synopsis: 'Already written.', author_name: 'STI' }]]
      }
      updates.push(parameters)
      return [{ affectedRows: 1 }]
    },
  }
  const fetcher = async () => json({ docs: [], results: [] })
  await enrichHoldingsMetadata(database as unknown as Pool, {
    fetcher, limit: 1, delayMs: 0, googleBooksApiKey: '', generateCover: async () => { generated += 1; return 'new.png' },
  })
  assert.equal(generated, 0)
  assert.equal(updates[0][0], current)
  updates.length = 0
  database.execute = async (sql: string, parameters: unknown[] = []) => {
    if (sql.includes('FROM titles')) {
      return [[{ title_id: 8, title: 'Local Textbook', isbn: null, cover_image_path: older, synopsis: null, author_name: 'STI' }]]
    }
    updates.push(parameters)
    return [{ affectedRows: 1 }]
  }
  await enrichHoldingsMetadata(database as unknown as Pool, {
    fetcher, limit: 1, delayMs: 0, googleBooksApiKey: '', generateCover: async () => { generated += 1; return current },
  })
  assert.equal(generated, 1)
  assert.equal(updates[0][0], current)
})

test('plain cover redraw skips official artwork and current blue plates', () => {
  const sql = plainCoverRedrawSql(40)
  assert.match(sql, /generated-%/)
  assert.match(sql, /NOT LIKE '%\/generated-v4-%'/)
  assert.match(sql, /LIMIT 40/)
  assert.doesNotMatch(sql, /openlibrary|synopsis/)
})

test('a generated cover is a blue plate PNG and a retry clears only incomplete titles', async () => {
  const png = renderGeneratedCoverPng('College English', 'STI')
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.deepEqual(pngPixel(png, 4, 4), [0xff, 0xf2, 0x00])
  assert.deepEqual(pngPixel(png, 80, 20), [0x0b, 0x5e, 0xa2])
  assert.notDeepEqual(png, renderGeneratedCoverPng('Other Book', 'Author'))
  const statements: string[] = []
  await resetIncompleteMetadata({
    async execute(sql: string) {
      statements.push(sql)
      return [{ affectedRows: 4 }]
    },
  } as unknown as Pool)
  assert.match(statements[0], /metadata_checked_at = NULL/)
  assert.match(statements[0], /generated-/)
  assert.match(statements[0], /synopsis IS NULL/)
})

test('the server does not look up covers on its own', async () => {
  const source = await readFile(new URL('./metadata-fetcher.worker.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /setInterval/)
})

function json(body: unknown) {
  return { ok: true, headers: { get: () => 'application/json' }, json: async () => body, arrayBuffer: async () => new ArrayBuffer(0) }
}

function pngPixel(png: Buffer, x: number, y: number) {
  let offset = 8
  const parts: Buffer[] = []
  let width = 0
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('ascii')
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') width = data.readUInt32BE(0)
    if (type === 'IDAT') parts.push(data)
    offset += 12 + length
  }
  const raw = inflateSync(Buffer.concat(parts))
  const start = y * (1 + width * 3) + 1 + x * 3
  return [raw[start], raw[start + 1], raw[start + 2]]
}
