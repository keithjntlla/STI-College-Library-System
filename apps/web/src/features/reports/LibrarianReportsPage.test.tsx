import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LibrarianReportsPage } from './LibrarianReportsPage'

function renderPage() {
  return render(<MemoryRouter><LibrarianReportsPage /></MemoryRouter>)
}

const auth = vi.hoisted(() => ({ getAccessToken: vi.fn(() => 'token') }))
vi.mock('../auth/auth-storage', () => auth)

describe('LibrarianReportsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
      const url = String(input)
      if (url.includes('/api/reports/catalog/weeding') && !url.includes('.csv') && !url.includes('.pdf')) {
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: [{
            titleId: 42, title: 'Database Systems', authors: 'SmartLib QA', category: 'Programming',
            copyrightYear: '2018', publicationYear: '2026', ageYears: '8', activeCopies: 2, reviewStatus: 'Review for weeding',
          }] }),
        }
      }
      return {
        ok: true,
        headers: { get: () => 'text/csv' },
        blob: async () => new Blob(['title'], { type: 'text/csv' }),
      }
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
    renderPage()
    expect(screen.getByRole('heading', { name: 'Reports' })).toBeTruthy()
    expect(await screen.findByText('Database Systems')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Archive in catalog/i }).getAttribute('href')).toContain('action=archive&titleId=42')
    fireEvent.click(screen.getAllByRole('button', { name: 'Export CSV' })[0])
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/reports/catalog/inventory.csv', expect.any(Object)))
    fireEvent.click(screen.getAllByRole('button', { name: 'Export CSV' })[1])
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/reports/catalog/weeding.csv', expect.any(Object)))
  })
})
