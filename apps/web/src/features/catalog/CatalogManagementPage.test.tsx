import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CatalogManagementPage } from './CatalogManagementPage'
import type { CatalogItem, PhysicalCopy } from './types'

const api = vi.hoisted(() => ({
  search: vi.fn(),
  copies: vi.fn(),
  categories: vi.fn(),
  downloadInventory: vi.fn(),
  changeTitleCategory: vi.fn(),
  archiveBook: vi.fn(),
  bulkImport: vi.fn(),
}))

vi.mock('./catalog-api', () => ({ catalogApi: api }))
vi.mock('./AddMultipleCopiesModal', () => ({
  AddMultipleCopiesModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Add book modal">
      <button type="button" onClick={onClose}>Close add book</button>
    </div>
  ),
}))
vi.mock('./AddResearchModal', () => ({
  AddResearchModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Add thesis modal">
      <button type="button" onClick={onClose}>Close add thesis</button>
    </div>
  ),
}))
vi.mock('./BookOverview', () => ({ BookOverview: () => null }))
vi.mock('./AssetCodeModal', () => ({
  AssetCodeModal: ({ physicalCopyId }: { physicalCopyId?: number }) => (
    <div role="dialog" aria-label="Asset codes">{physicalCopyId ? `Codes for copy ${physicalCopyId}` : 'Asset codes'}</div>
  ),
}))
vi.mock('./ChangeTitleCategoryModal', () => ({ ChangeTitleCategoryModal: () => null }))
vi.mock('./BookQuotationModal', () => ({
  BookQuotationModal: ({ titleId, title, onClose }: { titleId: number; title: string; onClose: () => void }) => (
    <div role="dialog" aria-label={`Supplier quotations for ${title}`}>
      <p>Quotations for title {titleId}</p>
      <button type="button" onClick={onClose}>Close quotations</button>
    </div>
  ),
}))
vi.mock('./BookCoverThumbnail', () => ({
  BookCoverThumbnail: ({ title }: { title: string }) => <span>{title} cover</span>,
}))

function renderCatalog(path = '/librarian/catalog') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CatalogManagementPage />
    </MemoryRouter>,
  )
}

const sampleBook: CatalogItem = {
  titleId: 11,
  recordType: 'Book',
  title: 'Clean Code',
  coverImagePath: null,
  authors: ['Robert C. Martin'],
  isbn: '9780132350884',
  publicationYear: 2008,
  categoryId: 1,
  categoryName: 'Programming',
  rowVersion: 1,
  shelfLocation: 'Shelf A-1',
  actualShelfLocations: ['Shelf A-1'],
  activeInventoryCount: 2,
  shelfStatus: 'Mapped',
  availability: 'Available',
  totalCopies: 2,
  availableCopies: 2,
  research: null,
}

const sampleCopy: PhysicalCopy = {
  physicalCopyId: 41,
  title: 'Clean Code',
  barcode: 'STIORMOC2026000041',
  accessionNumber: 'STI-ACC-2026-0041',
  shelfLocation: 'Shelf A-1',
  conditionStatus: 'Good',
  availabilityStatus: 'Available',
  lifecycleStatus: 'Active',
  lastScannedAt: null,
}

describe('CatalogManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.search.mockResolvedValue({ items: [sampleBook], total: 1 })
    api.copies.mockResolvedValue([sampleCopy])
    api.categories.mockResolvedValue([{ categoryId: 1, categoryName: 'Programming', shelfLocation: 'Shelf A-1' }])
    api.bulkImport.mockResolvedValue({
      booksCreated: 3,
      copiesCreated: 5,
      message: 'Successfully imported 3 books and 5 copies.',
    })
  })

  afterEach(() => cleanup())

  it('shows ops toolbar actions and template download href without a hardware scanner', async () => {
    renderCatalog()
    expect((await screen.findAllByText('Clean Code')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Hardware scanner')).toBeNull()
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add book' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add thesis' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Refresh catalog' })).toBeTruthy()
    const template = screen.getByRole('link', { name: 'Download template' })
    expect(template.getAttribute('href')).toBe('/templates/books-import-template.csv')
    expect(template.getAttribute('download')).not.toBeNull()
  })

  it('imports a CSV through confirm dialog and refreshes the list', async () => {
    renderCatalog()
    expect((await screen.findAllByText('Clean Code')).length).toBeGreaterThan(0)
    expect(api.search).toHaveBeenCalled()

    const file = new File(['Title,Author,ISBN,Publication_Year,Category_ID,Quantity\nA,B,1,2020,1,1'], 'stock.csv', {
      type: 'text/csv',
    })
    fireEvent.change(screen.getByLabelText('Choose CSV file to import'), { target: { files: [file] } })

    expect(await screen.findByRole('dialog', { name: 'Import CSV books?' })).toBeTruthy()
    expect(screen.getByText('stock.csv')).toBeTruthy()

    api.search.mockResolvedValue({ items: [sampleBook, { ...sampleBook, titleId: 12, title: 'Imported Title' }], total: 2 })
    fireEvent.click(screen.getByRole('button', { name: 'Yes, import' }))

    await waitFor(() => expect(api.bulkImport).toHaveBeenCalledWith(file))
    expect(await screen.findByRole('dialog', { name: 'Import complete' })).toBeTruthy()
    expect(screen.getByText(/3 books · 5 copies/)).toBeTruthy()
    expect(await screen.findByText('Imported Title')).toBeTruthy()
  })

  it('shows empty-state CTAs when filters return no titles', async () => {
    api.search.mockResolvedValue({ items: [], total: 0 })
    renderCatalog()

    expect(await screen.findByText('No records match these filters')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Import CSV' }).length).toBeGreaterThan(1)
    expect(screen.getAllByRole('button', { name: 'Add book' }).length).toBeGreaterThan(1)
  })

  it('opens Add book from the toolbar and exposes compact catalog actions', async () => {
    renderCatalog()
    expect(await screen.findByRole('button', { name: /^View$/ })).toBeTruthy()
    expect(screen.getByLabelText('More actions for Clean Code')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add book' }))
    expect(await screen.findByRole('dialog', { name: 'Add book modal' })).toBeTruthy()
  })

  it('opens View Codes from the physical copy register', async () => {
    renderCatalog()
    expect(await screen.findByText('STI-ACC-2026-0041')).toBeTruthy()
    expect(screen.getByText('Copy ID')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^View Codes$/ }))
    expect(await screen.findByRole('dialog', { name: 'Asset codes' })).toBeTruthy()
    expect(screen.getByText('Codes for copy 41')).toBeTruthy()
  })

  it('opens the supplier quotation modal from clearance deep-link query params', async () => {
    renderCatalog('/librarian/catalog?titleId=11&action=quotation&title=Clean%20Code')
    expect(await screen.findByRole('dialog', { name: 'Supplier quotations for Clean Code' })).toBeTruthy()
    expect(screen.getByText('Quotations for title 11')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close quotations' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Supplier quotations for Clean Code' })).toBeNull())
  })
})
