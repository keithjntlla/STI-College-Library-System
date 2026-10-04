import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { BookCart } from './BookCart'
import { clearBookCartForTests, useBookCart } from './book-cart-store'

const api = vi.hoisted(() => ({ submitBorrowRequest: vi.fn() }))
const catalogApi = vi.hoisted(() => ({ fetchBookOverview: vi.fn(), fetchBookCatalog: vi.fn(), fetchCatalogCopyAsset: vi.fn(), reserveBookTitle: vi.fn() }))
vi.mock('./book-cart-api', () => ({ submitBorrowRequest: api.submitBorrowRequest }))
vi.mock('./book-catalog-api', () => catalogApi)
vi.mock('../auth/auth-storage', () => ({
  getCurrentClaims: () => ({ userId: 5, schoolId: 'STI-5', role: 'Student', exp: 9999999999 }),
  getCurrentIdentity: () => ({ userId: 5, schoolId: 'STI-5', role: 'Student', source: 'jwt' }),
}))
vi.mock('./AssetCodeCanvas', () => ({ AssetCodeCanvas: ({ testId }: { testId?: string }) => <canvas data-testid={testId} /> }))

function AddFixture() {
  const { addItem } = useBookCart()
  return <button onClick={() => addItem({ titleId: 4, title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', shelfLocation: 'Shelf A-1', callNumber: 'QA76', previewBarcode: 'STIORMOC2026000142', coverImagePath: '/api/assets/covers/clean-code.png' })}>Add fixture</button>
}

describe('BookCart', () => {
  it('disables checkout when empty and removes a selected row locally', async () => {
    render(<MemoryRouter><AddFixture /><BookCart /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Browse catalog' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Submit Borrow Request' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Add fixture' }))
    expect(await screen.findByText('Clean Code')).toBeTruthy()
    expect(screen.getAllByAltText('Clean Code cover').some((image) => (image as HTMLImageElement).src.includes('/api/assets/covers/clean-code.png'))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Clean Code' }))
    expect(screen.queryByText('Clean Code')).toBeNull()
    expect((screen.getByRole('button', { name: 'Submit Borrow Request' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('submits title IDs, clears the cart, and shows counter-claim instructions', async () => {
    api.submitBorrowRequest.mockResolvedValue({ requestGroupId: 'group-1', status: 'pending_claim', instructions: 'Go to the library to claim and confirm books.', items: [] })
    render(<MemoryRouter><AddFixture /><BookCart /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Add fixture' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Submit Borrow Request' }))
    await waitFor(() => expect(api.submitBorrowRequest).toHaveBeenCalledWith([4]))
    expect(await screen.findByText('Go to the library to claim and confirm books.')).toBeTruthy()
    expect(screen.getByText('Your cart is empty')).toBeTruthy()
  })

  it('opens the shared book overview from cart details', async () => {
    catalogApi.fetchBookOverview.mockResolvedValue({
      titleId: 4, title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', publisher: 'Prentice Hall', publicationYear: 2008,
      categoryId: 1, categoryName: 'Programming', callNumber: 'QA76', shelfLocation: 'Shelf A-1', currentAvailabilityStatus: 'Available',
      currentConditionStatus: 'Damaged', totalCopiesCount: 1, availableCopiesCount: 1, reservableMaterialId: 5, previewBarcode: 'STIORMOC2026000142', coverImagePath: '/api/assets/covers/clean-code.png',
    })
    catalogApi.fetchBookCatalog.mockResolvedValue({ items: [], pagination: { page: 1, limit: 24, total: 0, totalPages: 0 }, viewer: { role: 'Student', activeBookCount: 0, bookLimit: 2 } })
    render(<MemoryRouter><AddFixture /><BookCart /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Add fixture' }))
    fireEvent.click(await screen.findByRole('button', { name: 'View details' }))
    expect(await screen.findByRole('dialog', { name: 'Clean Code' })).toBeTruthy()
    expect(screen.getByText('Damaged')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Generate APA reference' })).toBeTruthy()
    expect(screen.queryByTestId('cart-qr-code')).toBeNull()
    expect(screen.queryByText('QR code')).toBeNull()
  })
})

afterEach(() => { cleanup(); clearBookCartForTests(); vi.clearAllMocks() })
