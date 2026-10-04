import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminCirculationMonitor } from './AdminCirculationMonitor'
import { catalogApi } from '../catalog/catalog-api'
import { usersApi } from '../users/users-api'

const api = vi.hoisted(() => ({
  monitor: vi.fn(),
  confirmCheckout: vi.fn(),
  returnBook: vi.fn(),
  calculatePenalty: vi.fn(),
  cancelRequest: vi.fn(),
  reportLost: vi.fn(),
}))
vi.mock('./circulation-api', () => ({ circulationApi: api }))
vi.mock('../attendance/attendance-api', () => ({ attendanceApi: { resolveScan: vi.fn() } }))
vi.mock('../catalog/catalog-api', () => ({ catalogApi: { copyByBarcode: vi.fn() } }))
vi.mock('../users/users-api', () => ({ usersApi: { getAvatar: vi.fn() } }))

const monitor = {
  summary: { pendingClaims: 0, activeLoans: 1, overdueLoans: 0, returnedToday: 0, dueToday: 1 },
  items: [{
    transactionId: 4, userName: 'A Student', schoolId: 'STI-4', role: 'Student', title: 'Database Systems',
    accessionNumber: 'ACC-4', barcode: 'BOOK-4', requestedAt: '2026-08-23T08:55:00',
    borrowDate: '2026-08-23T09:00:00', dueDate: '2026-08-24T08:59:00', returnDate: null, status: 'Borrowed',
  }],
  pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
}

describe('AdminCirculationMonitor', () => {
  it('submits terminal checkout after confirmation and refreshes the monitor', async () => {
    api.monitor.mockResolvedValue(monitor)
    api.confirmCheckout.mockResolvedValue({ transactionId: 5 })
    render(<AdminCirculationMonitor />)
    fireEvent.click(await screen.findByRole('tab', { name: /Active loans/i }))
    expect(await screen.findByText('Database Systems')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText(/Manual Accession/i), { target: { value: 'BOOK-5' } })
    fireEvent.change(screen.getByPlaceholderText(/Manual School ID/i), { target: { value: 'STI-5' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm checkout/i }))
    fireEvent.click(screen.getByRole('button', { name: /yes, check out/i }))
    await waitFor(() => expect(api.confirmCheckout).toHaveBeenCalledWith('BOOK-5', 'STI-5'))
    expect(await screen.findByRole('dialog', { name: 'Success' })).toBeTruthy()
    expect(screen.getByText('Checkout confirmed successfully. The book is now an active loan.')).toBeTruthy()
  })

  it('renders pending claims in a searchable tabbed monitor and loads verify-borrower into the terminal', async () => {
    vi.mocked(usersApi.getAvatar).mockResolvedValue({ avatarUrl: '/avatars/sti-4.png' })
    vi.mocked(catalogApi.copyByBarcode).mockResolvedValue({
      physicalCopyId: 4,
      titleId: 2,
      title: 'Computer Networks',
      author: 'Tanenbaum',
      shelfLocation: 'Shelf N-1',
      accessionNumber: 'ACC-4',
      barcode: 'BOOK-4',
      conditionStatus: 'Good',
      coverImagePath: '/api/assets/covers/networks.png',
      barcodeImageData: 'data:image/svg+xml;base64,abc',
    })
    api.monitor.mockResolvedValue({
      ...monitor,
      summary: { ...monitor.summary, pendingClaims: 1, activeLoans: 0 },
      items: [{ ...monitor.items[0], transactionId: 9, title: 'Computer Networks', borrowDate: null, dueDate: null, status: 'Pending' }],
    })
    render(<AdminCirculationMonitor />)
    expect(await screen.findByText('Computer Networks')).toBeTruthy()
    expect(screen.getByText('Circulation monitor')).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Pending claim/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Verify borrower' }))
    await waitFor(() => expect((screen.getByPlaceholderText(/Manual Accession/i) as HTMLInputElement).value).toBe('BOOK-4'))
    expect((screen.getByPlaceholderText(/Manual School ID/i) as HTMLInputElement).value).toBe('STI-4')
    expect(await screen.findByAltText('A Student profile photo')).toBeTruthy()
    expect(screen.getByAltText('Computer Networks cover')).toBeTruthy()
    expect(screen.getByText('Shelf N-1')).toBeTruthy()
    expect(await screen.findByRole('dialog', { name: 'Success' })).toBeTruthy()
    expect(screen.getByText(/Confirm checkout after verifying/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /open scanner/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /refresh/i })).toBeTruthy()
  })

  it('shows a claim checklist for the verified student and prefills the selected book', async () => {
    vi.mocked(usersApi.getAvatar).mockResolvedValue({ avatarUrl: '/avatars/sti-4.png' })
    vi.mocked(catalogApi.copyByBarcode).mockImplementation(async (code: string) => ({
      physicalCopyId: code === 'BOOK-11' ? 11 : 4,
      titleId: code === 'BOOK-11' ? 3 : 2,
      title: code === 'BOOK-11' ? 'Clean Code' : 'Computer Networks',
      author: code === 'BOOK-11' ? 'Martin' : 'Tanenbaum',
      shelfLocation: 'Shelf N-1',
      accessionNumber: code === 'BOOK-11' ? 'ACC-11' : 'ACC-4',
      barcode: code,
      conditionStatus: 'Good',
      coverImagePath: '/api/assets/covers/book.png',
      barcodeImageData: 'data:image/svg+xml;base64,abc',
    }))
    api.monitor.mockResolvedValue({
      ...monitor,
      summary: { ...monitor.summary, pendingClaims: 2, activeLoans: 0 },
      items: [
        { ...monitor.items[0], transactionId: 9, title: 'Computer Networks', borrowDate: null, dueDate: null, status: 'Pending', barcode: 'BOOK-4', accessionNumber: 'ACC-4' },
        { ...monitor.items[0], transactionId: 11, title: 'Clean Code', borrowDate: null, dueDate: null, status: 'Pending', barcode: 'BOOK-11', accessionNumber: 'ACC-11' },
      ],
    })
    render(<AdminCirculationMonitor />)
    expect(await screen.findByText('Clean Code')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Verify borrower' })[0])
    expect(await screen.findByText('Claim queue for this borrower')).toBeTruthy()
    const claimButtons = screen.getAllByRole('button', { name: /Clean Code/i })
    fireEvent.click(claimButtons[claimButtons.length - 1])
    await waitFor(() => expect((screen.getByPlaceholderText(/Manual Accession/i) as HTMLInputElement).value).toBe('BOOK-11'))
  })

  it('filters the active monitor tab with desk search', async () => {
    api.monitor.mockResolvedValue({
      ...monitor,
      summary: { ...monitor.summary, pendingClaims: 1, activeLoans: 1 },
      items: [
        { ...monitor.items[0], transactionId: 9, title: 'Computer Networks', userName: 'A Student', schoolId: 'STI-4', status: 'Pending', borrowDate: null, dueDate: null },
        { ...monitor.items[0], transactionId: 10, title: 'Clean Code', userName: 'B Student', schoolId: 'STI-9', status: 'Pending', borrowDate: null, dueDate: null },
      ],
    })
    render(<AdminCirculationMonitor />)
    expect(await screen.findByText('Computer Networks')).toBeTruthy()
    expect(screen.getByText('Clean Code')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText(/Search school ID/i), { target: { value: 'STI-9' } })
    expect(screen.queryByText('Computer Networks')).toBeNull()
    expect(screen.getByText('Clean Code')).toBeTruthy()
  })

  it('cancels a pending claim and removes it from the admin lane without a page reload', async () => {
    api.monitor.mockResolvedValue({
      ...monitor,
      summary: { ...monitor.summary, pendingClaims: 1, activeLoans: 0 },
      items: [{ ...monitor.items[0], transactionId: 9, title: 'Computer Networks', borrowDate: null, dueDate: null, status: 'Pending' }],
    })
    api.cancelRequest.mockResolvedValue({ transactionId: 9, status: 'Cancelled', copyAvailability: 'Available' })
    render(<AdminCirculationMonitor />)
    expect(await screen.findByText('Computer Networks')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }))
    await waitFor(() => expect(api.cancelRequest).toHaveBeenCalledWith(9, ''))
    expect(await screen.findByRole('dialog', { name: 'Success' })).toBeTruthy()
    expect(screen.getByText('Computer Networks pending claim was cancelled and released.')).toBeTruthy()
  })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })
