import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BookArchivePage } from './BookArchivePage'

const api = vi.hoisted(() => ({
  archivedBooks: vi.fn(),
  deletedBookSnapshots: vi.fn(),
  archivedBookDetail: vi.fn(),
}))
vi.mock('./catalog-api', () => ({ catalogApi: api }))

beforeEach(() => {
  api.archivedBooks.mockResolvedValue([{
    titleId: 11,
    copyId: 55,
    title: 'Active Title',
    isbn: null,
    authors: 'Bob',
    accession: 'ACC-55',
    barcode: 'BC-55',
    archivedAt: '2026-10-02T00:00:00.000Z',
    reason: 'Damaged',
    archivedBy: 'Desk Staff',
    copyCount: 1,
    recordKind: 'Archived copy',
  }])
  api.deletedBookSnapshots.mockResolvedValue([])
  api.archivedBookDetail.mockResolvedValue({
    titleId: 11,
    title: 'Active Title',
    isbn: null,
    authors: 'Bob',
    reason: null,
    archivedAt: null,
    archivedBy: null,
    copies: [{
      copyId: 55, accession: 'ACC-55', barcode: 'BC-55', shelf: 'A-1', condition: 'Good',
      archivedAt: '2026-10-02T00:00:00.000Z', reason: 'Damaged', borrowingCount: 0,
    }],
    borrowings: [],
    auditEvents: [],
  })
})
afterEach(cleanup)

it('shows page header and opens copy-focused archive detail', async () => {
  render(<BookArchivePage />)
  expect(await screen.findByRole('heading', { name: 'Book archive' })).toBeTruthy()
  expect(screen.getByText(/Weeding review is a separate Reports list/i)).toBeTruthy()
  fireEvent.click(await screen.findByRole('button', { name: 'View record' }))
  expect(await screen.findByRole('dialog', { name: 'Archived book record' })).toBeTruthy()
  expect(screen.getByText(/Focused copy/i)).toBeTruthy()
  await waitFor(() => expect(api.archivedBookDetail).toHaveBeenCalledWith(11))
})
