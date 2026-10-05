import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationAuthError } from './notification-api'
import { NotificationBell } from './NotificationBell'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}))

vi.mock('./notification-api', async () => {
  const actual = await vi.importActual<typeof import('./notification-api')>('./notification-api')
  return {
    ...actual,
    notificationApi: api,
  }
})

vi.mock('../auth/auth-storage', () => ({
  getAccessToken: () => 'test-token',
  getCurrentIdentity: () => ({
    userId: 9,
    schoolId: 'STI-9',
    role: 'Student' as const,
    source: 'jwt' as const,
  }),
}))

const notification = {
  notificationId: 12,
  title: 'Book ready for pickup',
  body: 'Your reserved book is ready at the desk.',
  type: 'Reservation Arrival',
  sourceType: 'Reservation',
  sourceId: 5,
  actionPath: '/student/reservations',
  priority: 'Urgent' as const,
  isRead: false,
  createdAt: '2026-09-05T08:00:00.000Z',
  readAt: null,
  expiresAt: null,
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.list.mockResolvedValue({
      items: [notification],
      unreadCount: 2,
      pagination: { page: 1, limit: 8, total: 2, totalPages: 1 },
    })
    api.markRead.mockResolvedValue({ read: true })
    api.markAllRead.mockResolvedValue({ updated: 2 })
  })

  afterEach(() => {
    cleanup()
  })

  function renderBell() {
    return render(
      <MemoryRouter initialEntries={['/student/dashboard']}>
        <Routes>
          <Route path="/student/dashboard" element={<NotificationBell role="student" />} />
          <Route path="/student/notifications" element={<p>Full inbox</p>} />
          <Route path="/student/reservations" element={<p>Reservations page</p>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('opens a panel with recent notifications and supports mark-all and view-all', async () => {
    renderBell()

    await waitFor(() => expect(api.list).toHaveBeenCalledWith({ limit: 1, status: 'unread' }))
    expect(await screen.findByRole('button', { name: 'Notifications, 2 unread' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 2 unread' }))
    const panel = await screen.findByRole('dialog', { name: 'Notifications' })
    expect(within(panel).getByText('Book ready for pickup')).toBeTruthy()
    expect(api.list).toHaveBeenCalledWith({ limit: 8 })

    fireEvent.click(within(panel).getByRole('button', { name: 'Mark all read' }))
    await waitFor(() => expect(api.markAllRead).toHaveBeenCalledTimes(1))

    fireEvent.click(within(panel).getByRole('button', { name: 'View all' }))
    expect(await screen.findByText('Full inbox')).toBeTruthy()
  })

  it('marks an item read and navigates to its action path', async () => {
    renderBell()
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))
    fireEvent.click(await screen.findByRole('button', { name: /Book ready for pickup/i }))
    await waitFor(() => expect(api.markRead).toHaveBeenCalledWith(12))
    expect(await screen.findByText('Reservations page')).toBeTruthy()
  })

  it('stops quiet polling when authentication fails', async () => {
    api.list.mockRejectedValue(new NotificationAuthError('A valid Bearer token is required.', 'JWT_REQUIRED'))
    renderBell()
    await waitFor(() => expect(api.list).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
  })
})
