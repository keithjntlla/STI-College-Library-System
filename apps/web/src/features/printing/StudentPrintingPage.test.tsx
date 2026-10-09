import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StudentPrintingPage } from './StudentPrintingPage'

const api = vi.hoisted(() => ({
  serviceStatus: vi.fn(),
  pricing: vi.fn(),
  mine: vi.fn(),
  receipts: vi.fn(),
  quote: vi.fn(),
  submit: vi.fn(),
  cancel: vi.fn(),
  downloadReceipt: vi.fn(),
}))
vi.mock('./printing-api', () => ({ printingApi: api }))

const receipt = {
  print_receipt_id: 8,
  request_id: 4,
  receipt_number: 'PR-20260923-000021',
  verification_code: 'A1B2C3D4E5F60708',
  receipt_status: 'Issued' as const,
  document_label: 'Payment Record',
  student_name: 'Student User',
  school_id: '0200000001',
  file_name: 'capstone.pdf',
  page_count: 6,
  number_of_copies: 2,
  total_sheets: 12,
  print_type: 'Monochrome',
  paper_size: 'A4',
  amount_received: 36,
  payment_method: 'Cash' as const,
  received_by: 'Library Admin',
  received_at: '2026-09-23T10:30:00+08:00',
}

beforeEach(() => {
  api.serviceStatus.mockResolvedValue({ accepting_requests: 1, unavailable_reason: null, docx_auto_count_available: true })
  api.pricing.mockResolvedValue([{ pricing_rule_id: 1, print_type: 'Monochrome', paper_size: 'A4', price_per_page: 3 }])
  api.mine.mockResolvedValue([{
    request_id: 4,
    file_name: 'capstone.pdf',
    number_of_copies: 2,
    print_type: 'Monochrome',
    paper_size: 'A4',
    page_count: 6,
    total_sheets: 12,
    calculated_cost: 36,
    payment_status: 'Paid',
    job_status: 'Ready for Pickup',
    created_at: '2026-09-23T09:00:00+08:00',
    print_receipt_id: 8,
    receipt_number: receipt.receipt_number,
    verification_code: receipt.verification_code,
    receipt_status: 'Issued',
  }])
  api.receipts.mockResolvedValue([receipt])
  api.downloadReceipt.mockResolvedValue(undefined)
})
afterEach(cleanup)

it('shows printing payment records inside the Printing Service page', async () => {
  render(<StudentPrintingPage />)
  expect(await screen.findByText('Payment records')).toBeTruthy()
  expect(screen.getByText('Printing payment records only. Any approved tax invoice appears in Invoices.')).toBeTruthy()
  expect(screen.getAllByText('PR-20260923-000021').length).toBeGreaterThan(0)
})

it('opens the printing payment record without using the fines page', async () => {
  render(<StudentPrintingPage />)
  await screen.findByText('Payment records')
  fireEvent.click(screen.getAllByRole('button', { name: /View payment/i }).at(-1)!)
  expect(screen.getByRole('dialog', { name: 'Printing payment record' })).toBeTruthy()
  expect(screen.getByText('This payment record is not a tax invoice. Approved invoices appear in Invoices.')).toBeTruthy()
})

it('reads pages automatically and requotes when copies change', async () => {
  api.quote.mockImplementation(async (form: FormData) => ({
    page_count: 12,
    total_sheets: 12 * Number(form.get('number_of_copies')),
    calculated_cost: 36 * Number(form.get('number_of_copies')),
    document_sha256: 'abc',
    printable_file_name: 'course.pdf',
  }))
  render(<StudentPrintingPage />)
  await screen.findByText('Payment records')
  const copies = screen.getByLabelText('Copies') as HTMLInputElement
  fireEvent.change(screen.getByLabelText('Print document'), { target: { files: [new File(['%PDF-test'], 'course.pdf', { type: 'application/pdf' })] } })
  await waitFor(() => expect(screen.getByLabelText('Pages in document').textContent).toBe('12'))
  fireEvent.change(copies, { target: { value: '' } })
  expect(copies.value).toBe('')
  fireEvent.change(copies, { target: { value: '2' } })
  expect(copies.value).toBe('2')
  await waitFor(() => expect(screen.getByText('₱72.00')).toBeTruthy())
})

it('highlights ready-for-pickup jobs and shows next-step copy', async () => {
  render(<StudentPrintingPage />)
  expect(await screen.findByText('Ready for pickup')).toBeTruthy()
  expect(screen.getAllByText(/ready at the library counter/i).length).toBeGreaterThan(0)
  expect(screen.getByText('Ready at the library counter. Check in at attendance, then claim with your school ID.')).toBeTruthy()
})

it('shows balance due and pay-on-claim copy for unpaid ready jobs', async () => {
  api.mine.mockResolvedValue([{
    request_id: 5,
    file_name: 'essay.pdf',
    number_of_copies: 1,
    print_type: 'Monochrome',
    paper_size: 'A4',
    page_count: 4,
    total_sheets: 4,
    calculated_cost: 12,
    payment_status: 'Unpaid',
    job_status: 'Ready for Pickup',
    started_at: '2026-10-06T08:00:00+08:00',
    created_at: '2026-09-23T09:00:00+08:00',
  }])
  api.receipts.mockResolvedValue([])
  render(<StudentPrintingPage />)
  expect(await screen.findByText('Balance due')).toBeTruthy()
  expect(screen.getByText(/Check in at attendance, pay ₱12\.00 cash, then claim with your school ID/i)).toBeTruthy()
  expect(screen.getByText(/4\.\s*Pay & pick up/i)).toBeTruthy()
})

it('guides PDF-only upload when DOCX auto-count is unavailable', async () => {
  api.serviceStatus.mockResolvedValue({ accepting_requests: 1, unavailable_reason: null, docx_auto_count_available: false })
  render(<StudentPrintingPage />)
  expect(await screen.findByText(/Upload a PDF\. DOCX conversion is unavailable/i)).toBeTruthy()
  const input = screen.getByLabelText('Print document') as HTMLInputElement
  expect(input.accept).toContain('.pdf')
  expect(input.accept).not.toContain('.docx')
})

it('notes staff printing and no virus scan when DOCX is available', async () => {
  api.serviceStatus.mockResolvedValue({ accepting_requests: 1, unavailable_reason: null, docx_auto_count_available: true })
  render(<StudentPrintingPage />)
  expect(await screen.findByText(/does not virus-scan uploads/i)).toBeTruthy()
  const input = screen.getByLabelText('Print document') as HTMLInputElement
  expect(input.accept).toContain('.docx')
})
