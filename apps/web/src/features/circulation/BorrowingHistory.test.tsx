import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BorrowingHistory } from './BorrowingHistory'

const api = vi.hoisted(() => ({ history: vi.fn(), cancelRequest: vi.fn() }))
const clearance = vi.hoisted(() => ({ reportLost: vi.fn() }))
const catalogApi = vi.hoisted(() => ({ fetchBookOverview: vi.fn(), fetchCatalogCopyAsset: vi.fn() }))
vi.mock('./circulation-api', () => ({ circulationApi: api }))
vi.mock('../clearance/clearance-api', () => ({ clearanceApi: clearance }))
vi.mock('../catalog/book-catalog-api', () => catalogApi)
vi.mock('../catalog/AssetCodeCanvas', () => ({ AssetCodeCanvas: ({ testId }: { testId?: string }) => <canvas data-testid={testId} /> }))

describe('BorrowingHistory', () => {
  it('renders the live student capacity, due cutoff, and transaction lifecycle', async () => {
    api.history.mockResolvedValue({
      summary: { role: 'Student', activeLoans: 1, activeReservations: 0, activeStackCount: 1, loanLimit: 2, remainingLoanSlots: 1, nextDueAt: '2026-08-24T08:59:00', dueCutoffLabel: '8:59 AM' },
      items: [{ transactionId: 1, titleId: 5, title: 'Clean Code', author: 'Robert C. Martin', coverImagePath: '/api/assets/covers/clean-code.png', accessionNumber: 'ACC-1', barcode: 'BOOK-1', borrowDate: '2026-08-23T10:00:00', dueDate: '2026-08-24T08:59:00', returnDate: null, status: 'Borrowed' }],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    })
    render(<BorrowingHistory />)
    expect(await screen.findByText('Clean Code')).toBeTruthy()
    expect(screen.getAllByAltText('Clean Code cover').some((image) => (image as HTMLImageElement).src.includes('/api/assets/covers/clean-code.png'))).toBe(true)
    expect(screen.getByText('1 of 2')).toBeTruthy()
    expect(screen.getByText('Next deadline · Due: 8:59 AM')).toBeTruthy()
    expect(screen.queryByText('Due: 8:59 AM')).toBeNull()
    expect(screen.getByText('Borrowed')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Returned' })).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: 'Author' })).toBeNull()
    expect(screen.getByRole('button', { name: 'View details' })).toBeTruthy()
  })

  it('shows the saved cover in borrowing-history book details', async () => {
    api.history.mockResolvedValue({
      summary: { role: 'Student', activeLoans: 1, activeReservations: 0, activeStackCount: 1, loanLimit: 2, remainingLoanSlots: 1, nextDueAt: null, dueCutoffLabel: '8:59 AM' },
      items: [{ transactionId: 1, titleId: 5, title: 'Clean Code', author: 'Robert C. Martin', coverImagePath: '/api/assets/covers/clean-code.png', accessionNumber: 'ACC-1', barcode: 'BOOK-1', borrowDate: '2026-08-23T10:00:00', dueDate: '2026-08-24T08:59:00', returnDate: null, status: 'Borrowed' }],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    })
    catalogApi.fetchBookOverview.mockResolvedValue({
      titleId: 5, title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', publisher: 'Prentice Hall', publicationYear: 2008,
      categoryId: 1, categoryName: 'Programming', callNumber: 'QA76', shelfLocation: 'Shelf A-1', currentAvailabilityStatus: 'Borrowed',
      totalCopiesCount: 1, availableCopiesCount: 0, reservableMaterialId: 5, previewBarcode: 'BOOK-1', coverImagePath: '/api/assets/covers/clean-code.png',
    })
    catalogApi.fetchCatalogCopyAsset.mockResolvedValue({
      physicalCopyId: 21, titleId: 5, title: 'Clean Code', author: 'Robert C. Martin', accessionNumber: 'ACC-1', barcode: 'BOOK-1', shelfLocation: 'Shelf A-1', conditionStatus: 'For Repair', barcodeImageData: 'data:image/svg+xml;base64,barcode',
    })
    render(<BorrowingHistory />)
    fireEvent.click(await screen.findByRole('button', { name: 'View details' }))
    expect(await screen.findByText('For Repair')).toBeTruthy()
    expect(screen.queryByTestId('book-detail-barcode')).toBeNull()
    expect(screen.queryByText('BOOK-1')).toBeNull()
    expect(screen.getAllByAltText('Clean Code cover').some((image) => (image as HTMLImageElement).src.includes('/api/assets/covers/clean-code.png'))).toBe(true)
  })

  it('lets the student confirm cancellation and synchronizes history without reloading the page', async () => {
    const pending = {
      summary: { role: 'Student', activeLoans: 1, activeReservations: 0, activeStackCount: 1, loanLimit: 2, remainingLoanSlots: 1, nextDueAt: null, dueCutoffLabel: '8:59 AM' },
      items: [{ transactionId: 12, titleId: 5, title: 'Clean Code', author: 'Robert C. Martin', coverImagePath: null, accessionNumber: 'ACC-1', barcode: 'BOOK-1', borrowDate: null, dueDate: null, returnDate: null, status: 'Pending' }],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    }
    api.history.mockResolvedValue(pending)
    api.cancelRequest.mockResolvedValue({ transactionId: 12, status: 'Cancelled', copyAvailability: 'Available' })
    render(<BorrowingHistory />)
    expect(await screen.findByText('Clean Code')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel request' }).at(-1)!)
    await waitFor(() => expect(api.cancelRequest).toHaveBeenCalledWith(12, ''))
    expect(await screen.findByText('Clean Code request was cancelled and its copy is available again.')).toBeTruthy()
  })

  it('submits a lost report through an in-page confirmation and shows the result', async () => {
    api.history.mockResolvedValue({
      summary: { role: 'Student', activeLoans: 1, activeReservations: 0, activeStackCount: 1, loanLimit: 2, remainingLoanSlots: 1, nextDueAt: null, dueCutoffLabel: '8:59 AM' },
      items: [{ transactionId: 21, titleId: 5, title: 'Clean Code', author: 'Robert C. Martin', coverImagePath: null, accessionNumber: 'ACC-1', barcode: 'BOOK-1', borrowDate: '2026-08-23T10:00:00', dueDate: '2026-08-24T08:59:00', returnDate: null, status: 'Borrowed', lostReportStatus: null }],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    })
    clearance.reportLost.mockResolvedValue({ lostBookReportId: 3, status: 'Pending' })
    render(<BorrowingHistory />)
    fireEvent.click(await screen.findByRole('button', { name: 'Report lost' }))
    expect(screen.getByRole('dialog', { name: 'Report this book as lost?' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Submit lost report' }))
    await waitFor(() => expect(clearance.reportLost).toHaveBeenCalledWith(21))
    expect(await screen.findByText('Clean Code was reported lost. Library staff have been notified.')).toBeTruthy()
  })

  it('keeps Borrowed visible when a lost report is pending', async () => {
    api.history.mockResolvedValue({
      summary: { role: 'Student', activeLoans: 1, activeReservations: 0, activeStackCount: 1, loanLimit: 2, remainingLoanSlots: 1, nextDueAt: null, dueCutoffLabel: '8:59 AM' },
      items: [{ transactionId: 21, titleId: 5, title: 'Clean Code', author: 'Robert C. Martin', coverImagePath: null, accessionNumber: 'ACC-1', barcode: 'BOOK-1', borrowDate: '2026-08-23T10:00:00', dueDate: '2026-08-24T08:59:00', returnDate: null, status: 'Borrowed', lostReportStatus: 'Pending' }],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    })
    render(<BorrowingHistory />)
    expect(await screen.findByText('Borrowed')).toBeTruthy()
    expect(screen.getByText('Lost report pending')).toBeTruthy()
    expect(screen.queryByText('BOOK-1')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Report lost' })).toBeNull()
  })

  it('keeps the list mounted while a background refresh is in flight', async () => {
    const payload = {
      summary: { role: 'Student', activeLoans: 1, activeReservations: 0, activeStackCount: 1, loanLimit: 2, remainingLoanSlots: 1, nextDueAt: null, dueCutoffLabel: '8:59 AM' },
      items: [{ transactionId: 1, titleId: 5, title: 'Clean Code', author: 'Robert C. Martin', coverImagePath: null, accessionNumber: 'ACC-1', barcode: 'BOOK-1', borrowDate: '2026-08-23T10:00:00', dueDate: '2026-08-24T08:59:00', returnDate: null, status: 'Borrowed', lostReportStatus: null }],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    }
    api.history.mockResolvedValue(payload)
    render(<BorrowingHistory />)
    expect(await screen.findByText('Clean Code')).toBeTruthy()

    let release: (value: typeof payload) => void = () => {}
    api.history.mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const calls = api.history.mock.calls.length
    window.dispatchEvent(new Event('smartlib:circulation-updated'))
    await waitFor(() => expect(api.history.mock.calls.length).toBeGreaterThan(calls))

    expect(screen.queryByText('Loading borrowing records…')).toBeNull()
    expect(screen.getByText('Clean Code')).toBeTruthy()
    release(payload)
  })

  it('loads the next page of history without swapping the list for a loading message', async () => {
    api.history.mockImplementation((page = 1) => Promise.resolve({
      summary: { role: 'Student', activeLoans: 0, activeReservations: 0, activeStackCount: 0, loanLimit: 2, remainingLoanSlots: 2, nextDueAt: null, dueCutoffLabel: '8:59 AM' },
      items: [{
        transactionId: page, titleId: 5, title: page === 1 ? 'Clean Code' : 'Refactoring', author: 'Martin Fowler',
        coverImagePath: null, accessionNumber: 'ACC-1', barcode: 'BOOK-1', borrowDate: '2026-08-23T10:00:00',
        dueDate: '2026-08-24T08:59:00', returnDate: '2026-08-24T09:00:00', status: 'Returned', lostReportStatus: null,
      }],
      pagination: { page, limit: 25, total: 26, totalPages: 2 },
    }))
    render(<BorrowingHistory />)
    expect(await screen.findByText('Clean Code')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Returned' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByText('Refactoring')).toBeTruthy()
    expect(screen.queryByText('Loading borrowing records…')).toBeNull()
    expect(api.history).toHaveBeenCalledWith(2)
  })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })
