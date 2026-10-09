import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import type { AccessTokenClaims, AuthenticatedIdentity } from './auth-storage'

const authState = vi.hoisted(() => ({
  identity: null as AuthenticatedIdentity | null,
  claims: null as AccessTokenClaims | null,
  clearAccessToken: vi.fn(),
}))

vi.mock('./auth-storage', async () => {
  const actual = await vi.importActual<typeof import('./auth-storage')>('./auth-storage')
  return {
    ...actual,
    getCurrentIdentity: () => authState.identity,
    getCurrentClaims: () => authState.claims,
    clearAccessToken: () => authState.clearAccessToken(),
  }
})

vi.mock('./auth-api', () => ({
  resolveSessionIdentity: vi.fn(async () => null),
}))

vi.mock('../inventory/MockAuthContext', () => ({
  useMockAuth: () => ({ enabled: false, identity: null, ready: true, error: null }),
}))

function renderAt(path: string, roles: Array<'Student' | 'Librarian' | 'Staff' | 'Faculty' | 'Admin'>) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute roles={roles} />}>
          <Route path={path} element={<p>Protected content</p>} />
        </Route>
        <Route path="/login" element={<p>Public login</p>} />
        <Route path="/admin/login" element={<p>Admin login</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute session-end redirects', () => {
  beforeEach(() => {
    authState.identity = null
    authState.claims = null
    authState.clearAccessToken.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('sends an expired librarian session to admin login', async () => {
    renderAt('/librarian/dashboard', ['Librarian', 'Admin'])
    expect(await screen.findByText('Admin login')).toBeTruthy()
    expect(screen.queryByText('Protected content')).toBeNull()
  })

  it('sends an expired student session to public login', async () => {
    renderAt('/student/dashboard', ['Student'])
    expect(await screen.findByText('Public login')).toBeTruthy()
  })

  it('sends a student token on a librarian route to public login', async () => {
    authState.identity = {
      userId: 1, schoolId: 'S1', role: 'Student', source: 'jwt',
    }
    authState.claims = {
      userId: 1, schoolId: 'S1', role: 'Student', exp: Math.floor(Date.now() / 1000) + 600,
    }
    renderAt('/librarian/dashboard', ['Librarian', 'Admin'])
    expect(await screen.findByText('Public login')).toBeTruthy()
    expect(authState.clearAccessToken).toHaveBeenCalled()
  })

  it('keeps an authorized librarian on the protected page', async () => {
    authState.identity = {
      userId: 2, schoolId: 'LIB-1', role: 'Librarian', source: 'jwt',
    }
    authState.claims = {
      userId: 2, schoolId: 'LIB-1', role: 'Librarian', exp: Math.floor(Date.now() / 1000) + 600,
    }
    renderAt('/librarian/dashboard', ['Librarian', 'Admin'])
    await waitFor(() => expect(screen.getByText('Protected content')).toBeTruthy())
  })
})
