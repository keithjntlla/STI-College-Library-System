import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '../features/theme/ThemeProvider'
import { MockAuthProvider } from '../features/inventory/MockAuthContext'
import { PortalLayout } from './PortalLayout'

const profileApi = vi.hoisted(() => ({
  myProfile: vi.fn(),
}))

const notificationApi = vi.hoisted(() => ({
  list: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}))

vi.mock('../features/auth/auth-storage', async () => {
  const actual = await vi.importActual<typeof import('../features/auth/auth-storage')>('../features/auth/auth-storage')
  return {
    ...actual,
    getAccessToken: () => 'test-token',
    getCurrentIdentity: () => ({
      userId: 9,
      schoolId: 'STI-9',
      role: 'Student' as const,
      fullName: 'Test Student',
      source: 'jwt' as const,
    }),
    setSessionIdentity: vi.fn(),
  }
})

vi.mock('../features/auth/auth-api', () => ({
  logout: vi.fn(async () => undefined),
}))

vi.mock('../features/users/users-api', () => ({
  usersApi: profileApi,
}))

vi.mock('../features/notifications/notification-api', async () => {
  const actual = await vi.importActual<typeof import('../features/notifications/notification-api')>('../features/notifications/notification-api')
  return {
    ...actual,
    notificationApi,
  }
})

beforeEach(() => {
  profileApi.myProfile.mockResolvedValue({
    id: 9,
    school_id: 'STI-9',
    role: 'Student',
    account_status: 'Active',
    email: 'student@ormoc.sti.edu.ph',
    user_id: 18,
    first_name: 'Test',
    last_name: 'Student',
    program_strand: 'BSIT',
    year_grade_level: '2nd Year',
    full_name: 'Test Student',
  })
  notificationApi.list.mockResolvedValue({
    items: [],
    unreadCount: 0,
    pagination: { page: 1, limit: 8, total: 0, totalPages: 0 },
  })
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
    const url = String(input)
    if (url.includes('/profile/avatar/me')) {
      return { ok: true, json: async () => ({ data: { currentUrl: '/api/v1/profile/avatar/file?p=test.png' } }) }
    }
    return { ok: true, json: async () => ({}) }
  }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('dark')
})

function renderStudentPortal(path = '/student/dashboard') {
  return render(
    <ThemeProvider>
      <MockAuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<PortalLayout role="student" />}>
              <Route path="/student/dashboard" element={<p>Dashboard content</p>} />
              <Route path="/student/profile" element={<p>Profile content</p>} />
              <Route path="/student/notifications" element={<p>Notifications content</p>} />
            </Route>
            <Route path="/" element={<p>Signed out home</p>} />
          </Routes>
        </MemoryRouter>
      </MockAuthProvider>
    </ThemeProvider>,
  )
}

it('shows the signed-in user avatar, name, school ID, and role in the account menu', async () => {
  renderStudentPortal()

  expect(screen.queryByRole('link', { name: 'My profile' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Notifications' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
  expect(screen.queryByText('STI-9')).toBeNull()

  const accountButton = await screen.findByRole('button', { name: 'Account menu for Test Student' })
  expect(accountButton.querySelector('img')?.getAttribute('src')).toBe('/api/v1/profile/avatar/file?p=test.png')

  fireEvent.click(accountButton)
  const menu = screen.getByRole('menu', { name: 'Account options' })
  expect(within(menu).getByText('Test Student')).toBeTruthy()
  expect(within(menu).getByText('STI-9')).toBeTruthy()
  expect(within(menu).getByText('Student')).toBeTruthy()
  expect(within(menu).getByRole('menuitem', { name: 'Dark mode' })).toBeTruthy()
  expect(within(menu).getByRole('menuitem', { name: 'My profile' })).toBeTruthy()
  expect(within(menu).getByRole('menuitem', { name: 'Sign out' })).toBeTruthy()
  expect(profileApi.myProfile).toHaveBeenCalled()

  fireEvent.click(within(menu).getByRole('menuitem', { name: 'My profile' }))
  expect(await screen.findByText('Profile content')).toBeTruthy()
})

it('opens notifications from the header bell instead of the sidebar', async () => {
  notificationApi.list.mockResolvedValue({
    items: [{
      notificationId: 3,
      title: 'Fine reminder',
      body: 'Please settle your library fine.',
      type: 'Overdue Penalty',
      sourceType: null,
      sourceId: null,
      actionPath: '/student/fines',
      priority: 'Important' as const,
      isRead: false,
      createdAt: '2026-09-05T08:00:00.000Z',
      readAt: null,
      expiresAt: null,
    }],
    unreadCount: 1,
    pagination: { page: 1, limit: 8, total: 1, totalPages: 1 },
  })
  renderStudentPortal()

  expect(screen.queryByRole('link', { name: 'Notifications' })).toBeNull()
  fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
  expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeTruthy()
  expect(screen.getByText('Fine reminder')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'View all' }))
  expect(await screen.findByText('Notifications content')).toBeTruthy()
})

it('toggles theme from the account menu and confirms sign out', async () => {
  renderStudentPortal()

  fireEvent.click(await screen.findByRole('button', { name: 'Account menu for Test Student' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Dark mode' }))
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(screen.getByRole('menuitem', { name: 'Light mode' })).toBeTruthy()

  fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
  expect(screen.queryByRole('menu', { name: 'Account options' })).toBeNull()
  expect(screen.getByRole('heading', { name: 'Sign Out' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('heading', { name: 'Sign Out' })).toBeNull()
})
