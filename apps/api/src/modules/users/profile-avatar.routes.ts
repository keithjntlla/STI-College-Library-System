import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import type { RowDataPacket } from 'mysql2/promise'
import { db } from '../../config/db.js'
import { HttpError } from '../../core/http-error.ts'
import { requireJwtRoles } from '../auth/jwt-auth.middleware.ts'
import { readLocalAvatar, removeAvatar, resolveAvatarUrl, storeAvatar, validateAvatarFile } from './profile-avatar.storage.ts'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } }).single('image')
const handle = (fn: (request: Request, response: Response) => Promise<void>) =>
  (request: Request, response: Response, next: NextFunction) => { void fn(request, response).catch(next) }
const accountId = (response: Response) => Number(response.locals.authenticatedUser?.accountId)
const accountRole = (response: Response) => String(response.locals.authenticatedUser?.role ?? '')

export async function serveLocalAvatarFile(request: Request, response: Response, next: NextFunction) {
  try {
    const objectPath = String(request.query.p ?? '')
    const expires = String(request.query.e ?? '')
    const signature = String(request.query.s ?? '')
    const { buffer, mime } = await readLocalAvatar(objectPath, expires, signature)
    response.set('Cache-Control', 'private, max-age=60')
    response.type(mime).send(buffer)
  } catch (error) { next(error) }
}

export const profileAvatarRouter = Router()
profileAvatarRouter.get('/me', handle(async (_request, response) => {
  const id = accountId(response)
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT submission_id,storage_path,status,submitted_at,reviewed_at,review_reason
       FROM profile_avatar_submissions WHERE account_id=? ORDER BY submitted_at DESC,submission_id DESC`, [id],
  )
  const approved = rows.find(row => row.status === 'Approved')
  const pending = rows.find(row => row.status === 'Pending')
  const rejected = rows.find(row => row.status === 'Rejected' && row.review_reason !== 'Superseded by a newer upload')
  response.json({ success: true, data: {
    currentUrl: approved ? await resolveAvatarUrl(String(approved.storage_path)) : null,
    pending: pending ? { id: Number(pending.submission_id), submittedAt: pending.submitted_at } : null,
    lastRejection: rejected && (!approved || new Date(rejected.submitted_at).getTime() > new Date(approved.submitted_at).getTime())
      ? { reviewedAt: rejected.reviewed_at, reason: rejected.review_reason } : null,
  } })
}))
profileAvatarRouter.get('/user/:schoolId', requireJwtRoles('Librarian', 'Admin', 'Staff'), handle(async (request, response) => {
  const schoolId = String(request.params.schoolId)
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT p.storage_path
       FROM profile_avatar_submissions p
       JOIN accounts a ON a.account_id = p.account_id
      WHERE a.school_id = ? AND p.status = 'Approved'
      ORDER BY p.reviewed_at DESC LIMIT 1`, [schoolId],
  )
  const approved = rows[0]
  response.json({ success: true, data: {
    avatarUrl: approved ? await resolveAvatarUrl(String(approved.storage_path)) : null,
  } })
}))

profileAvatarRouter.post('/me', (request, response, next) => upload(request, response, error => {
  if ((error as { code?: string } | undefined)?.code === 'LIMIT_FILE_SIZE') return next(new HttpError(422, 'AVATAR_INVALID', 'Choose an image up to 2 MB.'))
  return error ? next(error) : next()
}), handle(async (request, response) => {
  validateAvatarFile(request.file)
  const id = accountId(response)
  const role = accountRole(response)
  const autoApprove = role === 'Librarian' || role === 'Admin'
  const objectPath = await storeAvatar(id, request.file!)
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    await connection.execute(
      `UPDATE profile_avatar_submissions SET status='Rejected',review_reason='Superseded by a newer upload',reviewed_at=NOW()
       WHERE account_id=? AND status='Pending'`, [id],
    )
    if (autoApprove) {
      await connection.execute(
        `INSERT INTO profile_avatar_submissions(account_id,storage_path,mime_type,status,reviewed_by_account_id,reviewed_at,review_reason)
         VALUES (?,?,?,'Approved',?,NOW(),?)`,
        [id, objectPath, request.file!.mimetype, id, 'Profile picture approved.'],
      )
    } else {
      await connection.execute(
        `INSERT INTO profile_avatar_submissions(account_id,storage_path,mime_type,status)
         VALUES (?,?,?,'Pending')`, [id, objectPath, request.file!.mimetype],
      )
    }
    await connection.commit()
  } catch (cause) {
    await connection.rollback()
    await removeAvatar(objectPath)
    throw cause
  } finally { connection.release() }
  response.status(201).json({ success: true, data: { status: autoApprove ? 'Approved' : 'Pending' } })
}))
profileAvatarRouter.get('/submissions', requireJwtRoles('Librarian', 'Admin'), handle(async (_request, response) => {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT p.submission_id,p.account_id,p.storage_path,p.submitted_at,a.school_id,
            COALESCE(u.full_name,a.school_id) AS full_name
       FROM profile_avatar_submissions p JOIN accounts a ON a.account_id=p.account_id
       LEFT JOIN users u ON u.user_id=a.user_id WHERE p.status='Pending'
      ORDER BY p.submitted_at ASC LIMIT 100`, [],
  )
  response.json({ success: true, data: await Promise.all(rows.map(async row => ({
    id: Number(row.submission_id), accountId: Number(row.account_id), schoolId: row.school_id,
    name: row.full_name, submittedAt: row.submitted_at, previewUrl: await resolveAvatarUrl(String(row.storage_path)),
  }))) })
}))
profileAvatarRouter.post('/submissions/:id/review', requireJwtRoles('Librarian', 'Admin'), handle(async (request, response) => {
  const id = Number(request.params.id)
  const decision = String(request.body?.decision ?? '')
  if (!Number.isSafeInteger(id) || id < 1 || !['approve', 'reject'].includes(decision)) {
    throw new HttpError(422, 'AVATAR_REVIEW_INVALID', 'Choose approve or reject.')
  }
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT submission_id,account_id FROM profile_avatar_submissions WHERE submission_id=? AND status=\'Pending\' FOR UPDATE', [id],
    )
    if (!rows.length) throw new HttpError(409, 'AVATAR_ALREADY_REVIEWED', 'This image is no longer awaiting review.')
    await connection.execute(
      `UPDATE profile_avatar_submissions SET status=?,reviewed_by_account_id=?,reviewed_at=NOW(),review_reason=?
       WHERE submission_id=?`, [
        decision === 'approve' ? 'Approved' : 'Rejected',
        accountId(response),
        decision === 'approve' ? 'Profile picture approved by Librarian.' : 'Profile picture rejected by Librarian.',
        id,
      ],
    )
    await connection.commit()
    response.json({ success: true, data: { id, status: decision === 'approve' ? 'Approved' : 'Rejected' } })
  } catch (cause) { await connection.rollback(); throw cause }
  finally { connection.release() }
}))
