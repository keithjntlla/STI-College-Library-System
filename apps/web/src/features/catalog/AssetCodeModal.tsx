import { Download, QrCode, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { catalogApi } from './catalog-api'
import { AssetCodeCanvas } from './AssetCodeCanvas'
import type { AdminBookAsset } from './types'

type AssetCodeModalProps =
  | { assetType?: never; physicalCopyId: number; researchInventoryId?: never; onClose: () => void }
  | { assetType: 'research'; researchInventoryId: number; physicalCopyId?: never; onClose: () => void }

export function AssetCodeModal(props: AssetCodeModalProps) {
  const { onClose } = props
  const isResearch = props.assetType === 'research'
  const assetType = isResearch ? 'research' : 'book'
  const assetId = isResearch ? props.researchInventoryId : props.physicalCopyId
  const [asset, setAsset] = useState<AdminBookAsset | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setAsset(null)
    setError('')
    const load = assetType === 'research' ? catalogApi.researchAsset : catalogApi.asset
    load(assetId, controller.signal).then(setAsset).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The asset codes could not be loaded.')
    })
    return () => controller.abort()
  }, [assetId, assetType])

  async function downloadQr() {
    if (!asset || downloading) return
    setDownloading(true)
    setError('')
    try {
      if (assetType === 'research') await catalogApi.downloadAssetPng(assetId, 'qr', 'research')
      else await catalogApi.downloadAssetPng(assetId, 'qr')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The PNG file could not be downloaded.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-code-title"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b5ea2]/65 p-4 backdrop-blur-sm lg:left-[var(--sidebar-offset,0px)]"
    >
      <button type="button" aria-label="Close asset codes" onClick={onClose} className="absolute inset-0" />
      <section className="relative z-10 max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#0b5ea2]/15 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#0b5ea2]/15 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b5ea2]/60">
              {assetType === 'research' ? 'Research inventory asset' : 'Physical copy asset'}
            </p>
            <h2 id="asset-code-title" className="mt-1 font-display text-xl font-black text-[#0b5ea2]">Asset codes</h2>
            <p className="mt-1 max-w-xl text-xs font-semibold text-[#0b5ea2]/65">
              QR is used for borrow and return camera scans.
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-xl border border-[#0b5ea2]/15 p-2 text-[#0b5ea2]">
            <X size={19} />
          </button>
        </header>
        <div className="p-5 sm:p-6">
          {error ? <div role="alert" className="mb-4 rounded-xl bg-[#FFF200] p-3 text-sm font-semibold text-[#0b5ea2]">{error}</div> : null}
          {!asset && !error ? <div className="py-20 text-center text-sm font-semibold text-[#0b5ea2]">Loading asset codes…</div> : null}
          {asset ? (
            <>
              <div className="mb-5 rounded-xl bg-[#0b5ea2] p-4 text-white">
                <h3 className="font-display text-lg font-bold">{asset.title}</h3>
                <p className="mt-1 text-sm text-white/80">{asset.author}</p>
                <p className="mt-2 font-mono text-xs">Accession {asset.accessionNumber}</p>
              </div>
              <article className="mx-auto max-w-md rounded-xl border border-[#0b5ea2]/20 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 font-bold text-[#0b5ea2]">
                  <QrCode size={18} /> QR code
                </div>
                <p className="mb-3 text-[11px] font-semibold text-[#0b5ea2]/60">Desk camera scan for borrow and return</p>
                <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-[#0b5ea2]/15 p-4">
                  <AssetCodeCanvas dataUri={asset.qrCodeData} kind="QR code" testId="admin-qr-code" />
                </div>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => void downloadQr()}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#FFF200] px-4 text-sm font-bold text-[#0b5ea2] disabled:opacity-50"
                >
                  <Download size={16} />
                  {downloading ? 'Downloading…' : 'Download QR Code PNG'}
                </button>
              </article>
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}
