import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookQuotationModal } from './BookQuotationModal'

const api = vi.hoisted(() => ({
  quotations: vi.fn(),
  uploadQuotation: vi.fn(),
  downloadQuotation: vi.fn(),
}))

vi.mock('./catalog-api', () => ({ catalogApi: api }))

describe('BookQuotationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.quotations.mockResolvedValue([])
    api.uploadQuotation.mockResolvedValue(undefined)
  })

  afterEach(() => cleanup())

  it('keeps Upload disabled with amount only until a file is chosen', async () => {
    render(<BookQuotationModal titleId={11} title="Clean Code" onClose={() => undefined} />)
    expect(await screen.findByText('No quotation uploaded for this book.')).toBeTruthy()

    const upload = screen.getByRole('button', { name: 'Upload quotation' }) as HTMLButtonElement
    expect(upload.disabled).toBe(true)
    expect(screen.getByText('Choose a supplier quotation file (PDF, JPEG, or PNG) to continue.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Quoted replacement amount (PHP)'), { target: { value: '450.50' } })
    expect(upload.disabled).toBe(true)
    expect(screen.getByText('Choose a supplier quotation file (PDF, JPEG, or PNG) to continue.')).toBeTruthy()
  })

  it('enables Upload after file and valid amount, then submits both', async () => {
    render(<BookQuotationModal titleId={11} title="Clean Code" onClose={() => undefined} />)
    const upload = await screen.findByRole('button', { name: 'Upload quotation' }) as HTMLButtonElement
    expect(upload.disabled).toBe(true)

    const file = new File(['%PDF-1.4'], 'supplier-quote.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Supplier quotation file'), { target: { files: [file] } })
    expect(screen.getByText('Selected: supplier-quote.pdf')).toBeTruthy()
    expect(upload.disabled).toBe(true)
    expect(screen.getByText('Enter a valid quoted amount greater than 0 (up to two decimal places).')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Quoted replacement amount (PHP)'), { target: { value: '450.50' } })
    expect(upload.disabled).toBe(false)

    fireEvent.submit(upload.closest('form')!)
    await waitFor(() => expect(api.uploadQuotation).toHaveBeenCalledWith(11, file, 450.5))
  })
})
