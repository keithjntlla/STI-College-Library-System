import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { env } from '../../config/env.js'
import { HttpError } from '../../core/http-error.ts'

const bucket = 'profile-avatars'
const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../storage/profile-avatars')
const allowed: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
const storage = env.supabase.url && env.supabase.secretKey
  ? createClient(env.supabase.url, env.supabase.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }).storage.from(bucket)
  : null

export function validateAvatarFile(file?: Express.Multer.File) {
  if (!file || !allowed[file.mimetype] || file.size < 1 || file.size > 2 * 1024 * 1024) {
    throw new HttpError(422, 'AVATAR_INVALID', 'Choose a PNG, JPEG, or WebP image up to 2 MB.')
  }
  const valid = file.mimetype === 'image/png'
    ? file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : file.mimetype === 'image/jpeg'
      ? file.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      : file.buffer.subarray(0, 4).toString('ascii') === 'RIFF' && file.buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  if (!valid) throw new HttpError(422, 'AVATAR_INVALID', 'The image content does not match its file type.')
  return { file, extension: allowed[file.mimetype] }
}

function assertRelativeObjectPath(objectPath: string) {
  if (!/^\d+\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(objectPath)) {
    throw new HttpError(404, 'AVATAR_NOT_FOUND', 'The profile image is no longer available.')
  }
}

function localSignature(objectPath: string, expires: number) {
  return createHmac('sha256', env.jwt.secret).update(`${objectPath}:${expires}`).digest('hex')
}

export async function storeAvatar(accountId: number, file: Express.Multer.File) {
  const { extension } = validateAvatarFile(file)
  const objectPath = `${accountId}/${randomUUID()}.${extension}`
  if (storage) {
    const { error } = await storage.upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false })
    if (error) throw new HttpError(503, 'AVATAR_STORAGE_UNAVAILABLE', 'Image upload failed. Try again.')
    return objectPath
  }
  if (process.env.VERCEL) throw new HttpError(503, 'AVATAR_STORAGE_UNAVAILABLE', 'Profile image storage is not configured.')
  const absolute = path.join(uploadDirectory, objectPath)
  await mkdir(path.dirname(absolute), { recursive: true })
  await writeFile(absolute, file.buffer, { flag: 'wx' })
  return objectPath
}

export async function removeAvatar(objectPath: string) {
  assertRelativeObjectPath(objectPath)
  if (storage) {
    await storage.remove([objectPath])
    return
  }
  await rm(path.join(uploadDirectory, objectPath), { force: true })
}

export async function resolveAvatarUrl(objectPath: string) {
  assertRelativeObjectPath(objectPath)
  if (storage) {
    const { data, error } = await storage.createSignedUrl(objectPath, 300)
    if (error || !data?.signedUrl) throw new HttpError(503, 'AVATAR_STORAGE_UNAVAILABLE', 'Unable to show the image right now.')
    return data.signedUrl
  }
  const expires = Math.floor(Date.now() / 1000) + 300
  const signature = localSignature(objectPath, expires)
  return `/api/v1/profile/avatar/file?p=${encodeURIComponent(objectPath)}&e=${expires}&s=${signature}`
}

export async function readLocalAvatar(objectPath: string, expiresRaw: string, signature: string) {
  assertRelativeObjectPath(objectPath)
  const expires = Number(expiresRaw)
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) {
    throw new HttpError(404, 'AVATAR_NOT_FOUND', 'The profile image link has expired.')
  }
  const expected = Buffer.from(localSignature(objectPath, expires))
  const provided = Buffer.from(signature)
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new HttpError(404, 'AVATAR_NOT_FOUND', 'The profile image is no longer available.')
  }
  if (storage) throw new HttpError(404, 'AVATAR_NOT_FOUND', 'The profile image is no longer available.')
  const candidate = path.resolve(uploadDirectory, objectPath)
  if (!candidate.startsWith(uploadDirectory + path.sep)) {
    throw new HttpError(404, 'AVATAR_NOT_FOUND', 'The profile image is no longer available.')
  }
  try {
    const [resolved, details] = await Promise.all([realpath(candidate), stat(candidate)])
    if (!resolved.startsWith(uploadDirectory + path.sep) || !details.isFile()) throw new Error('invalid')
    const buffer = await readFile(resolved)
    const extension = path.extname(resolved).slice(1)
    const mime = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'
    return { buffer, mime }
  } catch {
    throw new HttpError(404, 'AVATAR_NOT_FOUND', 'The profile image is no longer available.')
  }
}
