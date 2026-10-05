import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminPrintSuppliesPage } from './AdminPrintSuppliesPage'

const api = vi.hoisted(() => ({
  supplies: vi.fn(), reportPackage: vi.fn(), restock: vi.fn(), createInk: vi.fn(), createPaper: vi.fn(),
  useInkBottle: vi.fn(), openPaperReam: vi.fn(), updateInkThreshold: vi.fn(), updatePaperThreshold: vi.fn(),
  revenueReport: vi.fn(), stockExpenseReport: vi.fn(), supplyReport: vi.fn(),
}))
vi.mock('./printing-api', () => ({ printingApi: api }))

const supplyData = {
  ink: [{ ink_id: 1, cartridge_type: 'Dye ink', color_variation: 'Black', available_bottles: 2, low_stock_threshold_bottles: 1, cost_per_bottle: 100, is_low: 0 }],
  paper: [{ paper_stock_id: 1, paper_size_dimension: 'A4', unopened_reams: 2, remaining_reams: 2, low_stock_threshold_reams: 2, average_expense_cost: 100, is_low: 1 }],
  summary: { low_ink_items: 0, low_paper_items: 1, monthly_expense: 0 },
}
const reportPackage = {
  revenue: { period: 'monthly', label: '2026-08', from: '2026-08-01', to: '2026-08-31', paid_requests: 2, total_sheets: 20, total_copies: 4, total_revenue: 100 },
  revenue_entries: [],
  expenses: { period: 'monthly', label: '2026-08', from: '2026-08-01', to: '2026-08-31', restock_entries: 2, ink_expenses: 20, paper_expenses: 30, total_expenses: 50 },
  restocks: [],
  usage: [],
}

function mockReads() {
  api.supplies.mockResolvedValue(supplyData)
  api.reportPackage.mockResolvedValue(reportPackage)
}

describe('AdminPrintSuppliesPage', () => {
  it('starts on the stock desk and keeps money reports unloaded until opened', async () => {
    mockReads()
    render(<AdminPrintSuppliesPage />)
    expect(await screen.findByText(/does not connect to printer hardware/i)).toBeTruthy()
    expect(screen.getByText('Needs attention')).toBeTruthy()
    expect(api.reportPackage).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Money reports' }))
    await waitFor(() => expect(api.reportPackage).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Printing revenue')).toBeTruthy()
    expect(screen.queryByText(/Net gain|Net loss|Net impact/i)).toBeNull()
  })

  it('uses a simple paper restock form with required per-ream cost', async () => {
    mockReads(); api.restock.mockResolvedValue({})
    render(<AdminPrintSuppliesPage />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Restock' }))[1])
    expect(screen.getByLabelText('Reams to add')).toBeTruthy()
    expect(screen.getByLabelText('Cost per ream')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Reams to add'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Cost per ream'), { target: { value: '125' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add paper stock' }))
    await waitFor(() => expect(api.restock).toHaveBeenCalledWith('paper', 1, { quantity: 3, unit_cost: 125 }))
  })

  it('confirms one whole bottle usage through the in-app confirm modal', async () => {
    mockReads(); api.useInkBottle.mockResolvedValue({})
    render(<AdminPrintSuppliesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Use one bottle' }))
    expect(await screen.findByRole('dialog', { name: /Record one ink bottle opened/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm usage' }))
    await waitFor(() => expect(api.useInkBottle).toHaveBeenCalledWith(1))
  })

  it('adds a missing paper size from the stock desk', async () => {
    mockReads(); api.createPaper.mockResolvedValue({})
    render(<AdminPrintSuppliesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add paper size' }))
    fireEvent.change(screen.getByLabelText('Cost per ream'), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add paper stock' }))
    await waitFor(() => expect(api.createPaper).toHaveBeenCalled())
    expect(api.createPaper.mock.calls[0][0].paper_size_dimension).toMatch(/Short|Long/)
  })

  it('updates a low-stock alert threshold', async () => {
    mockReads(); api.updateInkThreshold.mockResolvedValue({})
    render(<AdminPrintSuppliesPage />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Alert' }))[0])
    fireEvent.change(screen.getByLabelText(/Warn when stock is at or below/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save alert' }))
    await waitFor(() => expect(api.updateInkThreshold).toHaveBeenCalledWith(1, 3))
  })

  it('downloads current stock separately from period expense reports', async () => {
    mockReads(); api.supplyReport.mockResolvedValue(undefined)
    render(<AdminPrintSuppliesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Export current stock PDF' }))
    await waitFor(() => expect(api.supplyReport).toHaveBeenCalledTimes(1))
    expect(api.stockExpenseReport).not.toHaveBeenCalled()
  })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })
