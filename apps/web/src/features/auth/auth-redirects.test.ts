import { describe, expect, it } from 'vitest'
import {
  isPrivilegedPortalPath,
  loginPathForPathname,
  postLogoutPath,
  sessionEndLoginPath,
} from './auth-redirects'

describe('auth-redirects', () => {
  it('detects privileged portal paths without treating /admin/login as a portal tree', () => {
    expect(isPrivilegedPortalPath('/librarian/dashboard')).toBe(true)
    expect(isPrivilegedPortalPath('/staff/circulation')).toBe(true)
    expect(isPrivilegedPortalPath('/admin/users')).toBe(true)
    expect(isPrivilegedPortalPath('/admin/login')).toBe(false)
    expect(isPrivilegedPortalPath('/student/dashboard')).toBe(false)
    expect(isPrivilegedPortalPath('/login')).toBe(false)
  })

  it('maps pathname to the correct login entry', () => {
    expect(loginPathForPathname('/librarian/catalog')).toBe('/admin/login')
    expect(loginPathForPathname('/staff/dashboard')).toBe('/admin/login')
    expect(loginPathForPathname('/student/dashboard')).toBe('/login')
    expect(loginPathForPathname('/faculty/fines')).toBe('/login')
  })

  it('keeps Student and Faculty off admin login even on privileged URLs', () => {
    expect(sessionEndLoginPath('/librarian/dashboard', 'Student')).toBe('/login')
    expect(sessionEndLoginPath('/staff/dashboard', 'Faculty')).toBe('/login')
    expect(sessionEndLoginPath('/librarian/dashboard', null)).toBe('/admin/login')
    expect(sessionEndLoginPath('/librarian/dashboard', 'Staff')).toBe('/admin/login')
    expect(sessionEndLoginPath('/student/dashboard', null)).toBe('/login')
  })

  it('sends voluntary sign-out to landing for users and admin login for staff roles', () => {
    expect(postLogoutPath('Student')).toBe('/')
    expect(postLogoutPath('Faculty')).toBe('/')
    expect(postLogoutPath('student')).toBe('/')
    expect(postLogoutPath('Librarian')).toBe('/admin/login')
    expect(postLogoutPath('Staff')).toBe('/admin/login')
    expect(postLogoutPath('librarian')).toBe('/admin/login')
    expect(postLogoutPath('Admin')).toBe('/admin/login')
  })
})
