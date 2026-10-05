import { getAccessToken } from '../auth/auth-storage'
import type { Announcement, LibrarySchedule, NotificationList } from './types'

export class NotificationAuthError extends Error {
  constructor(message: string, public code = 'JWT_REQUIRED') {
    super(message)
  }
}

export function isNotificationAuthError(error: unknown): error is NotificationAuthError {
  return error instanceof NotificationAuthError
}

async function request<T>(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  const token = getAccessToken()
  if (!token) throw new NotificationAuthError('A valid Bearer token is required.', 'JWT_REQUIRED')
  headers.set('Authorization', `Bearer ${token}`)
  if (options.body) headers.set('Content-Type', 'application/json')
  const response = await fetch(url, { ...options, headers, credentials: 'include' })
  const payload = await response.json().catch(() => null) as {
    success?: boolean
    data?: T
    message?: string
    code?: string
  } | null
  if (response.status === 401 || payload?.code === 'JWT_REQUIRED' || payload?.code === 'JWT_INVALID' || payload?.code === 'ACCOUNT_ACCESS_REVOKED') {
    throw new NotificationAuthError(payload?.message ?? 'Sign in again.', payload?.code ?? 'JWT_INVALID')
  }
  if (!response.ok || !payload?.success) throw new Error(payload?.message ?? 'The notification request failed.')
  return payload.data as T
}

export type NotificationListQuery = {
  limit?: number
  page?: number
  status?: 'unread' | 'all'
}

export const notificationApi = {
  list: (query: NotificationListQuery = {}) => {
    const params = new URLSearchParams()
    if (query.limit) params.set('limit', String(query.limit))
    if (query.page) params.set('page', String(query.page))
    if (query.status && query.status !== 'all') params.set('status', query.status)
    const suffix = params.toString()
    return request<NotificationList>(`/api/v1/notifications${suffix ? `?${suffix}` : ''}`)
  },
  schedule: () => request<LibrarySchedule>('/api/v1/notifications/schedule'),
  markRead: (id: number) => request(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/api/v1/notifications/read-all', { method: 'PATCH' }),
  remove: (id: number) => request(`/api/v1/notifications/${id}`, { method: 'DELETE' }),
  removeAll: () => request('/api/v1/notifications', { method: 'DELETE' }),
  announcements: () => request<Announcement[]>('/api/v1/admin/announcements'),
  createAnnouncement: (input: { title: string; body: string; priority: string; publishAt?: string | null; expiresAt?: string | null }) =>
    request('/api/v1/admin/announcements', { method: 'POST', body: JSON.stringify(input) }),
}
