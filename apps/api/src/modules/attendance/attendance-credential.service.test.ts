import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import test from 'node:test'
import { env } from '../../config/env.js'
import { HttpError } from '../../core/http-error.ts'
import { issueAttendanceCredential, parseAttendanceQr, validateAttendanceCredential } from './attendance-credential.service.ts'

function passHash(publicId: string, userId: number, version: number) {
  const secret = createHmac('sha256', env.attendanceQr.secret).update(`${publicId}:${userId}:${version}`, 'utf8').digest('base64url')
  return createHash('sha256').update(secret, 'utf8').digest()
}

test('issues an opaque permanent QR without embedding personal data',async()=>{
  const writes:string[]=[]
  const database={execute:async(sql:string)=>{writes.push(sql);if(sql.includes('SELECT credential_id'))return[[]];return[{insertId:44}]}} as never
  const pass=await issueAttendanceCredential(database,19)
  assert.match(pass.payload,/^STILIB\.ATTENDANCE\.1\./)
  assert.equal(pass.payload.includes('student'),false)
  assert.equal(parseAttendanceQr(pass.payload).publicId,pass.publicId)
  assert.equal(writes.some(sql=>sql.includes('INSERT INTO attendance_qr_credentials')),true)
})

test('rejects arbitrary and malformed QR payloads',()=>{
  assert.throws(()=>parseAttendanceQr('02000871654'),(error:unknown)=>error instanceof HttpError&&error.code==='ATTENDANCE_QR_INVALID')
})

test('repeated requests and sign-in sessions reuse the same permanent credential without writes',async()=>{
  let updates=0
  const database={execute:async(sql:string)=>{if(!sql.startsWith('SELECT'))updates++;return [[{credential_id:4,user_id:19,public_id:'permanentpublicid1234',secret_hash:passHash('permanentpublicid1234',19,1),credential_version:1,issued_at:'2026-10-01',credential_status:'Active'}]]}} as never
  const first=await issueAttendanceCredential(database,19)
  const nextSession=await issueAttendanceCredential(database,19)
  assert.equal(first.payload,nextSession.payload)
  assert.equal(first.credentialId,nextSession.credentialId)
  assert.equal(parseAttendanceQr(first.payload).purpose,null)
  assert.equal(updates,0)
})

test('a downloaded pass matches a buffer hash and a postgres hex hash', async () => {
  const database = { execute: async (sql: string) => { if (sql.includes('SELECT credential_id')) return [[]]; return [{ insertId: 44 }] } } as never
  const pass = await issueAttendanceCredential(database, 19)
  const hash = createHash('sha256').update(parseAttendanceQr(pass.payload).secret, 'utf8').digest()
  const visitor = { credential_id: 44, user_id: 19, credential_status: 'Active', issued_at: '2026-10-01', last_used_at: null, school_id: '0200', full_name: 'Ada Student', user_role: 'Student', account_status: 'Active', course_or_strand: 'BSIT', section: null }
  const bufferDb = { execute: async () => [[{ ...visitor, secret_hash: hash }]] } as never
  const hexDb = { execute: async () => [[{ ...visitor, secret_hash: `\\x${hash.toString('hex')}` }]] } as never
  assert.equal((await validateAttendanceCredential(bufferDb, pass.payload)).schoolId, '0200')
  assert.equal((await validateAttendanceCredential(hexDb, pass.payload)).name, 'Ada Student')
})

test('reprinting an active pass refreshes a stale hash without changing its public id', async () => {
  const writes: string[] = []
  const database = { execute: async (sql: string) => { if (!sql.startsWith('SELECT')) writes.push(sql); return [[{ credential_id: 4, user_id: 19, public_id: 'permanentpublicid1234', secret_hash: Buffer.from('00'), credential_version: 1, issued_at: '2026-10-01', credential_status: 'Active' }]] } } as never
  const pass = await issueAttendanceCredential(database, 19)
  assert.equal(parseAttendanceQr(pass.payload).publicId, 'permanentpublicid1234')
  assert.equal(writes.some((sql) => sql.includes('SET secret_hash') && !sql.includes('public_id')), true)
})
