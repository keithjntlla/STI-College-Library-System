import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssetCodeModal } from './AssetCodeModal'

const api = vi.hoisted(() => ({ asset: vi.fn(), researchAsset: vi.fn(), downloadAssetPng: vi.fn() }))
vi.mock('./catalog-api', () => ({ catalogApi: api }))
vi.mock('./AssetCodeCanvas', () => ({ AssetCodeCanvas: ({ testId }: { testId?: string }) => <canvas data-testid={testId} /> }))

describe('AssetCodeModal', () => {
  it('renders the QR code and downloads its PNG', async () => {
    api.asset.mockResolvedValue({
      physicalCopyId: 21, titleId: 8, title: 'Clean Code', author: 'Robert C. Martin', accessionNumber: 'STI-ACC-2026-000142',
      barcode: 'STIORMOC2026000142', shelfLocation: 'Shelf A-1', qrCodeData: 'data:image/png;base64,qr', barcodeImageData: 'data:image/svg+xml;base64,barcode',
    })
    api.downloadAssetPng.mockResolvedValue(undefined)
    render(<AssetCodeModal physicalCopyId={21} onClose={() => undefined} />)
    expect(await screen.findByTestId('admin-qr-code')).toBeTruthy()
    expect(screen.queryByText('Barcode')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Download Barcode PNG' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Download QR Code PNG' }))
    await waitFor(() => expect(api.downloadAssetPng).toHaveBeenCalledWith(21, 'qr'))
  })

  it('loads and downloads the selected research inventory codes', async () => {
    api.researchAsset.mockResolvedValue({
      researchInventoryId: 31, titleId: 18, title: 'Smart Library Study', author: 'STI Researchers',
      accessionNumber: 'STI-RES-2026-000031', barcode: 'STIORMOCR2026000031', shelfLocation: 'Research A',
      qrCodeData: 'data:image/png;base64,qr', barcodeImageData: 'data:image/svg+xml;base64,barcode',
    })
    api.downloadAssetPng.mockResolvedValue(undefined)
    render(<AssetCodeModal assetType="research" researchInventoryId={31} onClose={() => undefined} />)
    expect(await screen.findByText('Smart Library Study')).toBeTruthy()
    expect(screen.getByText('Research inventory asset')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Download Barcode PNG' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Download QR Code PNG' }))
    await waitFor(() => expect(api.downloadAssetPng).toHaveBeenCalledWith(31, 'qr', 'research'))
  })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })
