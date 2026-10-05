import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminCirculationMonitor } from './AdminCirculationMonitor'
import { attendanceApi } from '../attendance/attendance-api'
import { catalogApi } from '../catalog/catalog-api'
import { usersApi } from '../users/users-api'

const api = vi.hoisted(() => ({
  monitor: vi.fn(),
  confirmCheckout: vi.fn(),
  returnBook: vi.fn(),
  calculatePenalty: vi.fn(),
  cancelRequest: vi.fn(),
  reportLost: vi.fn(),
  checkoutEligibility: vi.fn(),
}))
vi.mock('./circulation-api', () => ({ circulationApi: api }))
vi.mock('../attendance/attendance-api', () => ({ attendanceApi: { resolveScan: vi.fn() } }))
vi.mock('./CirculationScannerModal', () => ({
  CirculationScannerModal: ({ onScan, mode = 'checkout' }: { onScan: (value: string) => void; mode?: 'checkout' | 'return' }) => (
    <div role="dialog" aria-label={mode === 'return' ? 'Scan book to return' : 'Scan for checkout'}>
      <button type="button" onClick={() => onScan(mode === 'return' ? 'ACC-RETURN' : 'STILIB.ATTENDANCE.token')}>
        {mode === 'return' ? 'Simulate return scan' : 'Simulate student scan'}
      </button>
    </div>
  ),
}))
vi.mock('../catalog/catalog-api', () => ({ catalogApi: { copyByBarcode: vi.fn() } }))
vi.mock('../users/users-api', () => ({ usersApi: { getAvatar: vi.fn() } }))

const monitor = {
  summary: { pendingClaims: 0, activeLoans: 1, overdueLoans: 0, returnedToday: 0, dueToday: 1 },
  items: [{
    transactionId: 4, userName: 'A Student', schoolId: 'STI-4', role: 'Student', title: 'Database Systems',
    accessionNumber: 'ACC-4', barcode: 'BOOK-4', requestedAt: '2026-08-23T08:55:00',
    borrowDate: '2026-08-23T09:00:00', dueDate: '2026-08-24T08:59:00', returnDate: null, status: 'Borrowed', lostReportStatus: null,
  }],
  pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
}

function openTypedEntry() {
  fireEvent.click(screen.getByRole('button', { name: /Type instead/i }))
}

function schoolIdInput() {
  return screen.getByPlaceholderText(/Type school ID only if the scanner failed/i) as HTMLInputElement
}

function bookCodeInput() {
  return screen.getByPlaceholderText(/Type accession or barcode only if the scanner failed/i) as HTMLInputElement
}

describe('AdminCirculationMonitor', () => {
  it('submits terminal checkout after confirmation and refreshes the monitor', async () => {
    api.monitor.mockResolvedValue(monitor)
    api.confirmCheckout.mockResolvedValue({ transactionId: 5 })
    render(<AdminCirculationMonitor />)
    fireEvent.click(await screen.findByRole('tab', { name: /Active loans/i }))
    expect(await screen.findByText('Database Systems')).toBeTruthy()
    openTypedEntry()
    fireEvent.change(bookCodeInput(), { target: { value: 'BOOK-5' } })
    fireEvent.change(schoolIdInput(), { target: { value: 'STI-5' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm checkout/i }))
    fireEvent.click(screen.getByRole('button', { name: /yes, check out/i }))
    await waitFor(() => expect(api.confirmCheckout).toHaveBeenCalledWith('BOOK-5', 'STI-5', 'TakeHome'))
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
    openTypedEntry()
    await waitFor(() => expect(bookCodeInput().value).toBe('BOOK-4'))
    expect(schoolIdInput().value).toBe('STI-4')
    expect(await screen.findByAltText('A Student profile photo')).toBeTruthy()
    expect(screen.getByAltText('Computer Networks cover')).toBeTruthy()
    expect(screen.getByText('Shelf N-1')).toBeTruthy()
    expect(await screen.findByRole('dialog', { name: 'Success' })).toBeTruthy()
    expect(screen.getByText(/Confirm checkout after verifying/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Scan student or book/i })).toBeTruthy()
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
    expect(await screen.findByText('Pending counter claims')).toBeTruthy()
    const claimButtons = screen.getAllByRole('button', { name: /Clean Code/i })
    fireEvent.click(claimButtons[claimButtons.length - 1])
    openTypedEntry()
    await waitFor(() => expect(bookCodeInput().value).toBe('BOOK-11'))
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

  it('refuses a scanned student who already has two active loans', async () => {
    api.monitor.mockResolvedValue(monitor)
    vi.mocked(attendanceApi.resolveScan).mockResolvedValue({
      visitor: { userId: 7, schoolId: 'STI-7', name: 'Ada Student', role: 'Student', program: 'BSIT', section: null },
      openVisit: null,
      occupancy: { current: 1, capacity: 80, available: 79, percentage: 1, overCapacity: false },
    })
    api.checkoutEligibility.mockResolvedValue({
      allowed: false,
      schoolId: 'STI-7',
      name: 'Ada Student',
      role: 'Student',
      activeLoans: 2,
      loanLimit: 2,
      message: 'This student already has 2 active loans, which is the 2-book limit. Checkout is not allowed until a book is returned.',
    })
    render(<AdminCirculationMonitor />)
    fireEvent.click(await screen.findByRole('button', { name: /Scan student or book/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Simulate student scan' }))
    expect(await screen.findByRole('alertdialog', { name: 'Action needed' })).toBeTruthy()
    expect(screen.getByText('Scanned student')).toBeTruthy()
    expect(screen.getByText('Ada Student')).toBeTruthy()
    expect(screen.getByText('STI-7')).toBeTruthy()
    expect(screen.getByText(/Student · BSIT/i)).toBeTruthy()
    expect(screen.getByText(/already has 2 active loans/i)).toBeTruthy()
    openTypedEntry()
    expect(schoolIdInput().value).toBe('')
    await new Promise((resolve) => setTimeout(resolve, 5200))
    expect(screen.getByRole('alertdialog', { name: 'Action needed' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.queryByRole('alertdialog', { name: 'Action needed' })).toBeNull()
  }, 12000)

  it('opens the return scanner when a blocked student has one open loan', async () => {
    api.monitor.mockResolvedValue(monitor)
    vi.mocked(usersApi.getAvatar).mockResolvedValue({ avatarUrl: '/avatars/sti-7.png' })
    vi.mocked(attendanceApi.resolveScan).mockResolvedValue({
      visitor: { userId: 7, schoolId: 'STI-7', name: 'Ada Student', role: 'Student', program: 'BSIT', section: null },
      openVisit: null,
      occupancy: { current: 1, capacity: 80, available: 79, percentage: 1, overCapacity: false },
    })
    api.checkoutEligibility.mockResolvedValue({
      allowed: false,
      schoolId: 'STI-7',
      name: 'Ada Student',
      role: 'Student',
      activeLoans: 2,
      loanLimit: 2,
      openLoans: [{
        transactionId: 11, title: 'Clean Code', accessionNumber: 'ACC-11', barcode: 'BOOK-11',
        dueDate: '2026-08-24T08:59:00', status: 'Borrowed',
      }],
      message: 'This student already has 2 active loans, which is the 2-book limit. Checkout is not allowed until a book is returned.',
    })
    render(<AdminCirculationMonitor />)
    fireEvent.click(await screen.findByRole('button', { name: /Scan student or book/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Simulate student scan' }))
    expect(await screen.findByRole('dialog', { name: 'Scan book to return' })).toBeTruthy()
    expect(screen.getByText(/already has 2 active loans/i)).toBeTruthy()
    expect(screen.getByText('Clean Code')).toBeTruthy()
    openTypedEntry()
    expect(schoolIdInput().value).toBe('')
    expect(bookCodeInput().value).toBe('')
    expect((screen.getByRole('button', { name: /confirm checkout/i }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('alertdialog', { name: 'Action needed' })).toBeNull()
  })

  it('lists both open loans when a blocked student must choose which book to return', async () => {
    api.monitor.mockResolvedValue(monitor)
    vi.mocked(usersApi.getAvatar).mockResolvedValue({ avatarUrl: '/avatars/sti-7.png' })
    vi.mocked(attendanceApi.resolveScan).mockResolvedValue({
      visitor: { userId: 7, schoolId: 'STI-7', name: 'Ada Student', role: 'Student', program: 'BSIT', section: null },
      openVisit: null,
      occupancy: { current: 1, capacity: 80, available: 79, percentage: 1, overCapacity: false },
    })
    api.checkoutEligibility.mockResolvedValue({
      allowed: false,
      schoolId: 'STI-7',
      name: 'Ada Student',
      role: 'Student',
      activeLoans: 2,
      loanLimit: 2,
      openLoans: [
        { transactionId: 11, title: 'Clean Code', accessionNumber: 'ACC-11', barcode: 'BOOK-11', dueDate: '2026-08-24T08:59:00', status: 'Borrowed' },
        { transactionId: 12, title: 'Refactoring', accessionNumber: 'ACC-12', barcode: 'BOOK-12', dueDate: '2026-08-23T08:59:00', status: 'Overdue' },
      ],
      message: 'This student already has 2 active loans, which is the 2-book limit. Checkout is not allowed until a book is returned.',
    })
    render(<AdminCirculationMonitor />)
    fireEvent.click(await screen.findByRole('button', { name: /Scan student or book/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Simulate student scan' }))
    expect(await screen.findByText('Clean Code')).toBeTruthy()
    expect(screen.getByText('Refactoring')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Scan book to return' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Process return' })).toHaveLength(2)
    openTypedEntry()
    expect(schoolIdInput().value).toBe('')
    expect(bookCodeInput().value).toBe('')
    expect((screen.getByRole('button', { name: /confirm checkout/i }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getAllByRole('button', { name: 'Process return' })[0])
    expect(await screen.findByRole('dialog', { name: 'Scan book to return' })).toBeTruthy()
  })

  it('loads a scanned student who still has a loan slot', async () => {
    api.monitor.mockResolvedValue(monitor)
    vi.mocked(usersApi.getAvatar).mockResolvedValue({ avatarUrl: '/avatars/sti-7.png' })
    vi.mocked(attendanceApi.resolveScan).mockResolvedValue({
      visitor: { userId: 7, schoolId: 'STI-7', name: 'Ada Student', role: 'Student', program: 'BSIT', section: null },
      openVisit: null,
      occupancy: { current: 1, capacity: 80, available: 79, percentage: 1, overCapacity: false },
    })
    api.checkoutEligibility.mockResolvedValue({
      allowed: true,
      schoolId: 'STI-7',
      name: 'Ada Student',
      role: 'Student',
      activeLoans: 1,
      loanLimit: 2,
      message: null,
    })
    render(<AdminCirculationMonitor />)
    fireEvent.click(await screen.findByRole('button', { name: /Scan student or book/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Simulate student scan' }))
    expect(await screen.findByText('Scanned student')).toBeTruthy()
    expect(screen.getAllByText('Ada Student').length).toBeGreaterThan(0)
    openTypedEntry()
    expect(schoolIdInput().value).toBe('STI-7')
    expect(screen.getByRole('dialog', { name: 'Success' })).toBeTruthy()
    await new Promise((resolve) => setTimeout(resolve, 4000))
    expect(screen.getByRole('dialog', { name: 'Success' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.queryByRole('dialog', { name: 'Success' })).toBeNull()
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

  it('opens the overdue lane from the dashboard query', async () => {
    window.history.pushState({}, '', '/librarian/circulation?lane=overdue')
    api.monitor.mockResolvedValue({
      ...monitor,
      summary: { ...monitor.summary, overdueLoans: 1, activeLoans: 0 },
      items: [{ ...monitor.items[0], status: 'Overdue', title: 'Late Networks' }],
    })
    render(<AdminCirculationMonitor />)
    const tab = await screen.findByRole('tab', { name: /Overdue/i })
    expect(tab.getAttribute('aria-selected')).toBe('true')
    expect(await screen.findByText('Late Networks')).toBeTruthy()
  })

  it('keeps Borrowed visible and badges a pending lost report on active loans', async () => {
    api.monitor.mockResolvedValue({
      ...monitor,
      items: [{ ...monitor.items[0], lostReportStatus: 'Pending' }],
    })
    render(<AdminCirculationMonitor />)
    fireEvent.click(await screen.findByRole('tab', { name: /Active loans/i }))
    expect(await screen.findByText('Borrowed')).toBeTruthy()
    expect(screen.getByText('Lost report pending')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Report lost' })).toBeNull()
  })
})

afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.pushState({}, '', '/') })
