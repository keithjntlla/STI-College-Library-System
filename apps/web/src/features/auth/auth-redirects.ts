import type { AuthRole } from './auth-storage'

export type PortalRole = 'student' | 'faculty' | 'librarian' | 'staff'
export type LoginPath = '/login' | '/admin/login'
export type PostLogoutPath = '/' | '/admin/login'

const PORTAL_ROLE_TO_AUTH: Record<PortalRole, AuthRole> = {
  student: 'Student',
  faculty: 'Faculty',
  librarian: 'Librarian',
  staff: 'Staff',
}

function startsWithPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Librarian/Staff (and legacy /admin page) trees — not the public /admin/login form itself. */
export function isPrivilegedPortalPath(pathname: string) {
  if (startsWithPath(pathname, '/admin/login')) return false
  return startsWithPath(pathname, '/librarian')
    || startsWithPath(pathname, '/staff')
    || startsWithPath(pathname, '/admin')
}

export function loginPathForPathname(pathname: string): LoginPath {
  return isPrivilegedPortalPath(pathname) ? '/admin/login' : '/login'
}

/**
 * Where to send a denied/expired protected-route visit.
 * Student/Faculty tokens never land on admin login, even if the URL was privileged.
 */
export function sessionEndLoginPath(pathname: string, claimsRole: AuthRole | null | undefined): LoginPath {
  if (claimsRole === 'Student' || claimsRole === 'Faculty') return '/login'
  return loginPathForPathname(pathname)
}

export function postLogoutPath(role: AuthRole | PortalRole): PostLogoutPath {
  const authRole = (role in PORTAL_ROLE_TO_AUTH ? PORTAL_ROLE_TO_AUTH[role as PortalRole] : role) as AuthRole
  if (authRole === 'Student' || authRole === 'Faculty') return '/'
  return '/admin/login'
}
