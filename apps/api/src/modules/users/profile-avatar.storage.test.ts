import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { HttpError } from '../../core/http-error.ts'
import { readLocalAvatar, resolveAvatarUrl, validateAvatarFile } from './profile-avatar.storage.ts'

const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../storage/profile-avatars')
const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])

test('validateAvatarFile accepts a genuine PNG under 2 MB', () => {
  const result = validateAvatarFile({
    mimetype: 'image/png',
    size: pngHeader.length,
    buffer: pngHeader,
    originalname: 'face.png',
  } as Express.Multer.File)
  assert.equal(result.extension, 'png')
})

test('validateAvatarFile rejects mismatched content', () => {
  assert.throws(
    () => validateAvatarFile({
      mimetype: 'image/png',
      size: 8,
      buffer: Buffer.from('not-a-png'),
      originalname: 'face.png',
    } as Express.Multer.File),
    (error: unknown) => error instanceof HttpError && error.code === 'AVATAR_INVALID',
  )
})

test('local signed avatar URLs round-trip through the HMAC file reader', async () => {
  const objectPath = `1/00000000-0000-4000-8000-000000000001.png`
  const absolute = path.join(uploadDirectory, objectPath)
  await mkdir(path.dirname(absolute), { recursive: true })
  await writeFile(absolute, pngHeader)
  try {
    const url = await resolveAvatarUrl(objectPath)
    const parsed = new URL(url, 'http://localhost')
    const file = await readLocalAvatar(
      String(parsed.searchParams.get('p')),
      String(parsed.searchParams.get('e')),
      String(parsed.searchParams.get('s')),
    )
    assert.equal(file.mime, 'image/png')
    assert.ok(file.buffer.equals(pngHeader))
  } finally {
    await rm(absolute, { force: true })
  }
})
