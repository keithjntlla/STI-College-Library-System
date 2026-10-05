import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LibrarianReportsPage } from './LibrarianReportsPage'

const auth = vi.hoisted(() => ({ getAccessToken: vi.fn(() => 'token') }))
vi.mock('../auth/auth-storage', () => auth)

describe('LibrarianReportsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/csv' },
      blob: async () => new Blob(['title'], { type: 'text/csv' }),
    }))
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:report') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    HTMLAnchorElement.prototype.click = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('downloads inventory and weeding exports from the reports module', async () => {
    render(<LibrarianReportsPage />)
    expect(screen.getByRole('heading', { name: 'Reports' })).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Export CSV' })[0])
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/reports/catalog/inventory.csv', expect.any(Object)))
    fireEvent.click(screen.getAllByRole('button', { name: 'Export CSV' })[1])
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/reports/catalog/weeding.csv', expect.any(Object)))
  })
})
