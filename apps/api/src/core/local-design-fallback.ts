import type { RowDataPacket } from 'mysql2/promise'
import { db } from '../config/db.js'
import { loadPublicLibraryEvents, type PublicLibraryEvent } from '../modules/attendance/public-library-events.ts'

type Identity = { accountId?: number; schoolId?: string; role?: string }

const now = () => new Date().toISOString()
const page = { page: 1, limit: 24, total: 0, totalPages: 0, total_pages: 0 }
const weekly = [
  { day: 1, dayOfWeek: 1, isOpen: true, opensAt: '08:00:00', closesAt: '17:00:00' },
  { day: 2, dayOfWeek: 2, isOpen: true, opensAt: '08:00:00', closesAt: '17:00:00' },
  { day: 3, dayOfWeek: 3, isOpen: true, opensAt: '08:00:00', closesAt: '17:00:00' },
  { day: 4, dayOfWeek: 4, isOpen: true, opensAt: '08:00:00', closesAt: '17:00:00' },
  { day: 5, dayOfWeek: 5, isOpen: true, opensAt: '08:00:00', closesAt: '17:00:00' },
  { day: 6, dayOfWeek: 6, isOpen: false, opensAt: null, closesAt: null },
  { day: 7, dayOfWeek: 7, isOpen: false, opensAt: null, closesAt: null },
]

function clockLabel(value: unknown) {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getHours() % 12 || 12}:${String(value.getMinutes()).padStart(2, '0')} ${value.getHours() >= 12 ? 'PM' : 'AM'}`
  }
  const text = String(value).trim().replace(/\s+/g, ' ')
  if (/[AP]M/i.test(text)) return text.replace(/^0(\d)/, '$1')
  const match = /(\d{1,2}):(\d{2})/.exec(text)
  if (!match) return text
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`
}

async function savedWeekly() {
  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT day_of_week, is_open, opens_at, closes_at FROM library_operating_schedule ORDER BY day_of_week',
    )
    if (!rows.length) return weekly
    return rows.map((row) => ({
      day: Number(row.day_of_week),
      dayOfWeek: Number(row.day_of_week),
      isOpen: Boolean(row.is_open),
      opensAt: row.is_open ? clockLabel(row.opens_at) : null,
      closesAt: row.is_open ? clockLabel(row.closes_at) : null,
    }))
  } catch {
    return weekly
  }
}

async function libraryProfile(name: string) {
  return { name, seatCapacity: 40, information: null, mapPath: null, schedule: await savedWeekly(), nextClosure: null }
}

async function person(identity: Identity | undefined) {
  const fallback = {
    name: identity?.schoolId || 'Library user',
    schoolId: identity?.schoolId || '',
    role: identity?.role || 'Student',
    program: null as string | null,
    firstName: null as string | null,
    lastName: null as string | null,
    email: null as string | null,
  }
  if (!identity?.accountId) return fallback
  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT a.school_id, a.role, u.full_name, u.email, sp.first_name, sp.last_name, sp.program_strand
         FROM accounts a
         LEFT JOIN users u ON u.user_id = a.user_id
         LEFT JOIN student_profiles sp ON sp.account_id = a.account_id
        WHERE a.account_id = ? LIMIT 1`,
      [identity.accountId],
    )
    const row = rows[0]
    if (!row) return fallback
    const fromParts = [row.first_name, row.last_name].filter(Boolean).join(' ')
    return {
      name: String(fromParts || row.full_name || row.school_id),
      schoolId: String(row.school_id),
      role: String(row.role),
      program: row.program_strand ? String(row.program_strand) : null,
      firstName: row.first_name ? String(row.first_name) : null,
      lastName: row.last_name ? String(row.last_name) : null,
      email: row.email ? String(row.email) : null,
    }
  } catch {
    return fallback
  }
}

async function savedEvents(): Promise<PublicLibraryEvent[]> {
  try { return await loadPublicLibraryEvents(db) } catch { return [] }
}

async function userDashboard(who: Awaited<ReturnType<typeof person>>) {
  return {
    generatedAt: now(),
    clearanceSchedule: null,
    user: { name: who.name, schoolId: who.schoolId, program: who.program, role: who.role },
    profile: await libraryProfile('STI College Ormoc Library'),
    summary: { activeLoans: 0, activeBookCount: 0, borrowingLimit: 3, activeReservations: 0, unreadNotifications: 0, outstandingFines: 0, clearanceStatus: 'Cleared', clearanceComputedStatus: 'Cleared' },
    occupancy: { current: 0, capacity: 40 },
    events: await savedEvents(),
    currentLoan: null,
    reservation: null,
    printRequest: null,
    latestNotification: null,
    announcement: null,
    recentHistory: [],
    recommendations: [],
  }
}

async function adminDashboard(who: Awaited<ReturnType<typeof person>>) {
  return {
    generatedAt: now(),
    staff: { name: who.name, schoolId: who.schoolId },
    profile: await libraryProfile('STI College Ormoc Library'),
    kpis: { totalBooks: 0, activeBorrowed: 0, availableBooks: 0, overdueBooks: 0, activeUsers: 0, dailyAttendance: 0, activeReservations: 0, outstandingFines: 0, returnedToday: 0 },
    weeklyAttendance: [],
    purposeBreakdown: [],
    popularCategories: [],
    recentCirculation: [],
    recentActivity: [],
    occupancy: { current: 0, capacity: 40, peakOccupancy: 0, serviceVisits: 0, state: 'Open', peakHour: null, averageMinutes: 0 },
  }
}

const emptyList = new Set([
  '/api/v1/printing/requests',
  '/api/v1/printing/receipts',
  '/api/v1/admin/printing/requests',
  '/api/v1/reservations',
  '/api/v1/admin/reservations',
  '/api/v1/fines/terms',
  '/api/v1/fines/receipts',
  '/api/v1/admin/fines/terms',
  '/api/v1/admin/users/programs',
  '/api/v1/admin/users/directory',
  '/api/v1/admin/announcements',
  '/api/v1/borrowing/in-library',
  '/api/v1/auth/registration-requests',
  '/api/v1/profile/avatar/submissions',
  '/api/v1/admin/clearance/schedule/terms',
  '/api/v1/admin/attendance/events',
  '/api/v1/admin/attendance/academic-terms',
  '/api/v1/admin/attendance/logs',
  '/api/inventory/copies',
])

function borrowingHistory(who: Awaited<ReturnType<typeof person>>) {
  return {
    summary: { role: who.role, activeLoans: 0, activeReservations: 0, activeStackCount: 0, loanLimit: 3, remainingLoanSlots: 3, nextDueAt: null, dueCutoffLabel: '' },
    items: [],
    pagination: page,
  }
}

function clearanceRecord(who: Awaited<ReturnType<typeof person>>, accountId?: number) {
  return {
    schedule: { termId: null, deadlineAt: null, version: 0 },
    student: { userId: accountId ?? 0, schoolId: who.schoolId, name: who.name, program: who.program, section: null, accountStatus: 'Active' },
    status: 'Cleared',
    computedStatus: 'Cleared',
    reason: '',
    checkedAt: now(),
    summary: { activeLoans: 0, unpaidOverdueFines: 0, unpaidReplacementCharges: 0, totalOutstanding: 0, blockCount: 0 },
    loans: [],
    fines: [],
    lostBooks: [],
    activeOverride: null,
    overrideHistory: [],
  }
}

function fineList() {
  return {
    range: { from: '', to: '', label: 'All dates', termId: null },
    summary: { assessed: 0, outstanding: 0, collected: 0, waived: 0, accountsWithBalance: 0 },
    items: [],
    pagination: page,
  }
}

export async function localDesignData(originalUrl: string, identity?: Identity) {
  const path = originalUrl.split('?')[0]
  const who = await person(identity)
  if (emptyList.has(path) || path.startsWith('/api/v1/admin/announcements')) return []
  if (path === '/api/v1/dashboard') return userDashboard(who)
  if (path === '/api/v1/admin/dashboard') return adminDashboard(who)
  if (path === '/api/v1/admin/account-dashboard') return { activeUsers: 0, cleared: 0, notCleared: 0, unknown: 0, generatedAt: now() }
  if (path === '/api/v1/workspace/tasks') {
    return {
      generatedAt: now(),
      role: who.role,
      cards: [],
      pickups: [],
      operations: { state: 'Open', capacity: 40, serviceVisits: 0, allowBorrowing: true, allowPrinting: true, events: [] },
      enrollment: 'No live task tables are available on this laptop.',
    }
  }
  if (path === '/api/v1/profile/me') {
    return {
      id: identity?.accountId ?? 0,
      school_id: who.schoolId,
      role: who.role,
      account_status: 'Active',
      email: who.email,
      user_id: null,
      first_name: who.firstName,
      last_name: who.lastName,
      program_strand: who.program,
      year_grade_level: null,
      full_name: who.name,
    }
  }
  if (path === '/api/v1/profile/avatar/me') return { currentUrl: null, pending: null }
  if (path === '/api/v1/notifications/schedule') {
    const schedule = await savedWeekly()
    let upcomingClosures: Array<{ date: string; reason: string }> = []
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT closed_date, reason FROM library_closed_days WHERE closed_date >= CURRENT_DATE ORDER BY closed_date LIMIT 20',
      )
      upcomingClosures = rows.map((row) => ({
        date: row.closed_date instanceof Date ? row.closed_date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : String(row.closed_date).slice(0, 10),
        reason: String(row.reason),
      }))
    } catch { /* The weekly hours still come from the saved schedule. */ }
    return { timezone: 'Asia/Manila', weekly: schedule.map((entry) => ({ dayOfWeek: entry.dayOfWeek, isOpen: entry.isOpen, opensAt: entry.opensAt, closesAt: entry.closesAt })), upcomingClosures, events: await savedEvents() }
  }
  if (path === '/api/v1/notifications' || path.startsWith('/api/v1/notifications/')) return { items: [], unreadCount: 0, pagination: page }
  if (path === '/api/v1/floor-plan/image') return { imageUrl: null, originalName: '', uploadedAt: '', uploadedBy: '' }
  if (path.startsWith('/api/v1/floor-plan')) return { revision: 0, layout: null, published: null, shelves: [], categories: [], updatedAt: null, items: [], matches: [], total: 0 }
  if (path === '/api/v1/borrowing/history' || path === '/api/v1/borrowing/my-books') return borrowingHistory(who)
  if (path.startsWith('/api/v1/admin/circulation') || path === '/api/v1/circulation') {
    return { summary: { pendingClaims: 0, activeLoans: 0, overdueLoans: 0, returnedToday: 0, dueToday: 0 }, items: [], requests: [], pagination: page }
  }
  if (path === '/api/v1/clearance/me' || /^\/api\/v1\/admin\/clearance\/\d+$/.test(path)) return clearanceRecord(who, identity?.accountId)
  if (path === '/api/v1/admin/clearance') return { summary: { totalStudents: 0, cleared: 0, pending: 0, activeOverrides: 0 }, pendingLostReports: [], items: [], pagination: page }
  if (path === '/api/v1/clearance/schedule' || path === '/api/v1/admin/clearance/schedule') return { termId: null, deadlineAt: null, version: 0 }
  if (path === '/api/v1/fines/me' || path === '/api/v1/admin/fines') return fineList()
  if (path === '/api/v1/printing/service-status' || path === '/api/v1/admin/printing/service-status') return { accepting_requests: 1, unavailable_reason: null }
  if (path === '/api/v1/attendance/pass') {
    return {
      profile: { userId: identity?.accountId ?? 0, schoolId: who.schoolId, name: who.name, role: who.role, program: who.program, section: null },
      credential: { credentialId: 0, publicId: 'local-preview', issuedAt: now() },
      summary: { visitsThisMonth: 0, todayCheckIn: null, commonPurpose: null },
      history: [],
    }
  }
  if (path === '/api/v1/admin/attendance/summary') {
    return { total_visits: 0, unique_visitors: 0, currently_inside: 0, average_visit: null, peak_hour: null, purpose_breakdown: [], role_breakdown: [], range: { from: '', to: '', label: 'All dates' } }
  }
  if (path === '/api/v1/admin/attendance/analytics') return { range: { from: '', to: '', label: 'All dates' }, hourly: [], heatmap: [], daily: [] }
  if (path === '/api/v1/admin/attendance/capacity' || path === '/api/v1/admin/attendance/state') {
    return { current: 0, baseCapacity: 40, capacity: 40, available: 40, percentage: 0, overCapacity: false, state: 'Open', entryOpen: true, serviceVisits: 0, totalInside: 0, cutoffAt: null, closesAt: null, allowWalkIns: true, allowBorrowing: true, allowPrinting: true, events: [], policy: { servicePurposes: [], preclosingMinutes: null, version: 0, configured: false } }
  }
  if (path === '/api/v1/admin/users/summary') return { active_accounts: 0, deactivated_accounts: 0, archived_accounts: 0, student_accounts: 0, faculty_accounts: 0, staff_accounts: 0 }
  if (path === '/api/v1/admin/collection-review') {
    return { reference: { id: 0, academicYear: '', referenceYear: new Date().getFullYear(), reviewAge: 0, version: 0, approvalSource: '' }, books: [], requirements: [], sources: [], alerts: [], referenceVersions: [], requirementHistory: [] }
  }
  if (path.startsWith('/api/v1/admin/reports')) {
    return { title: 'Report', label: 'All dates', timezone: 'Asia/Manila', generatedAt: now(), columns: [], rows: [], total: 0, note: '', metrics: {}, terms: [] }
  }
  if (path === '/api/inventory/summary') return { total_catalog_materials: 0, total_physical_copies: 0, damaged_copies_count: 0, lost_copies_count: 0 }
  return { items: [], rows: [], pagination: page, unreadCount: 0, total: 0, generatedAt: now() }
}

export function localDesignMeta(originalUrl: string) {
  const path = originalUrl.split('?')[0]
  if (path === '/api/inventory/copies' || path === '/api/v1/admin/attendance/logs') return { pagination: page }
  return undefined
}

export function localDesignFallbackAllowed(method: string, path: string) {
  if (method !== 'GET' || /\.(pdf|png|csv|xlsx)$/i.test(path)) return false
  if (path.startsWith('/api/public/catalog') || path.startsWith('/api/v1/catalog')) return false
  return true
}
