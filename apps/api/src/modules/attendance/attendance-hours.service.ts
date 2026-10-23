import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { db } from '../../config/db.js'
import { currentDate, excluded, formatDate, isPostgres } from '../../config/sql-dialect.js'
import { HttpError } from '../../core/http-error.ts'
import { manilaDate } from './attendance-intervals.ts'
import { parseClosure, parseWeeklyHours, type WeeklyHour } from './attendance-hours.validation.ts'

const clockSql = (expr: string) => isPostgres ? `to_char((${expr})::time, 'HH24:MI')` : `TIME_FORMAT(${expr}, '%H:%i')`
const dateValue = isPostgres ? '?::date' : 'DATE(?)'
const upsertHours = `INSERT INTO library_operating_schedule (day_of_week,is_open,opens_at,closes_at,updated_by_user_id,updated_at)
           VALUES (?,?,?,?,?,NOW()) ${isPostgres
    ? `ON CONFLICT (day_of_week) DO UPDATE SET is_open=${excluded('is_open')},opens_at=${excluded('opens_at')},closes_at=${excluded('closes_at')},updated_by_user_id=${excluded('updated_by_user_id')},updated_at=NOW()`
    : 'ON DUPLICATE KEY UPDATE is_open=VALUES(is_open),opens_at=VALUES(opens_at),closes_at=VALUES(closes_at),updated_by_user_id=VALUES(updated_by_user_id),updated_at=NOW()'}`

async function editor(connection: Pool | PoolConnection, accountId: number) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT a.role,a.account_status,a.user_id,u.account_status AS user_status
       FROM accounts a LEFT JOIN users u ON u.user_id=a.user_id WHERE a.account_id=?`,
    [accountId],
  )
  const account = rows[0]
  if (!account || account.account_status !== 'Active' || (account.user_status && account.user_status !== 'Active') || !['Librarian', 'Admin'].includes(String(account.role))) {
    throw new HttpError(403, 'LIBRARY_HOURS_FORBIDDEN', 'Your account cannot change library hours.')
  }
  return account.user_id ? Number(account.user_id) : null
}

export function createAttendanceHours(pool: Pool = db) {
  async function read() {
    const [weekly] = await pool.execute<RowDataPacket[]>(
      `SELECT day_of_week,is_open,${clockSql('opens_at')} opens_at,${clockSql('closes_at')} closes_at
         FROM library_operating_schedule ORDER BY day_of_week`,
    )
    const [closures] = await pool.execute<RowDataPacket[]>(
      `SELECT ${formatDate('closed_date', '%Y-%m-%d', 'YYYY-MM-DD')} closed_date,reason
         FROM library_closed_days WHERE closed_date>=${currentDate()} ORDER BY closed_date LIMIT 40`,
    )
    return {
      weekly: weekly.map((row) => ({
        dayOfWeek: Number(row.day_of_week),
        isOpen: Boolean(row.is_open),
        opensAt: row.opens_at ? String(row.opens_at).trim() : null,
        closesAt: row.closes_at ? String(row.closes_at).trim() : null,
      })),
      closures: closures.map((row) => ({ date: String(row.closed_date).slice(0, 10), reason: String(row.reason) })),
    }
  }

  async function save(accountId: number, body: unknown) {
    const days = parseWeeklyHours(body)
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const userId = await editor(connection, accountId)
      for (const day of days) {
        await connection.execute(upsertHours, [day.dayOfWeek, day.isOpen ? 1 : 0, day.opensAt, day.closesAt, userId])
      }
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
    return read()
  }

  async function addClosure(accountId: number, body: unknown) {
    const input = parseClosure(body, manilaDate(new Date()))
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const userId = await editor(connection, accountId)
      const [existing] = await connection.execute<RowDataPacket[]>(`SELECT closed_date FROM library_closed_days WHERE closed_date=${dateValue}`, [input.date])
      if (existing.length) throw new HttpError(409, 'LIBRARY_CLOSURE_EXISTS', 'That date is already closed.')
      await connection.execute(`INSERT INTO library_closed_days (closed_date,reason,created_by_user_id) VALUES (${dateValue},?,?)`, [input.date, input.reason, userId])
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
    return read()
  }

  async function removeClosure(accountId: number, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(422, 'LIBRARY_CLOSURE_DATE', 'Choose a valid closed date.')
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await editor(connection, accountId)
      const [result] = await connection.execute<ResultSetHeader>(`DELETE FROM library_closed_days WHERE closed_date=${dateValue}`, [date])
      if (!result.affectedRows) throw new HttpError(404, 'LIBRARY_CLOSURE_NOT_FOUND', 'That closed date was not found.')
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
    return read()
  }

  return { read, save, addClosure, removeClosure }
}

export const attendanceHours = createAttendanceHours()
export type { WeeklyHour }
