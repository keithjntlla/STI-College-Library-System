import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, BookText, QrCode, X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { BookCoverThumbnail } from '../catalog/BookCoverThumbnail'

type ExpectedBook = {
  title: string
  barcode: string
  accessionNumber?: string | null
  coverUrl?: string | null
}

interface Props {
  onScan: (data: string) => void
  onClose: () => void
  mode?: 'checkout' | 'return'
  expectedBook?: ExpectedBook | null
}

export function CirculationScannerModal({ onScan, onClose, mode = 'checkout', expectedBook = null }: Props) {
  const containerId = 'circulation-qr-reader'
  const [error, setError] = useState('')
  const [initializing, setInitializing] = useState(true)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanning = useRef(false)
  const onScanRef = useRef(onScan)

  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    let mounted = true
    const initScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach((track) => track.stop())
        if (!mounted) return

        const html5QrCode = new Html5Qrcode(containerId)
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, aspectRatio: 1.0, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (isScanning.current) return
            isScanning.current = true
            html5QrCode.stop().then(() => {
              onScanRef.current(decodedText)
            }).catch(console.error)
          },
          () => {},
        )
        if (mounted) setInitializing(false)
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Camera access denied or not available.')
          setInitializing(false)
        }
      }
    }

    void initScanner()

    return () => {
      mounted = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])

  const heading = mode === 'return' ? 'Scan book to return' : 'Scan for checkout'
  const hint = mode === 'return'
    ? 'Scan the book accession or barcode QR for the expected copy below.'
    : 'Hold a student attendance QR or book accession QR up to the camera.'

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b5ea2]/50 p-4 backdrop-blur-sm lg:left-[var(--sidebar-offset,0px)]">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-[#FFFFFF] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#0b5ea2]/10 bg-[#FFFFFF] px-6 py-4">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-[#0b5ea2]">
            <QrCode size={20} />
            {heading}
          </div>
          <button type="button" onClick={onClose} aria-label="Close scanner" className="rounded-xl p-2 text-[#0b5ea2]/60 hover:bg-[#0b5ea2]/5 hover:text-[#0b5ea2]">
            <X size={20} />
          </button>
        </div>

        <div className="relative p-6">
          <p className="mb-4 text-center text-sm font-semibold text-[#0b5ea2]/70">{hint}</p>

          {mode === 'return' && expectedBook ? (
            <div className="mb-4 flex gap-3 rounded-2xl border border-[#0b5ea2]/15 bg-zinc-50 p-3">
              {expectedBook.coverUrl ? (
                <BookCoverThumbnail title={expectedBook.title} coverImagePath={expectedBook.coverUrl} className="h-20 w-14 shrink-0" />
              ) : (
                <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0b5ea2]/10 text-[#0b5ea2]">
                  <BookText size={22} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0b5ea2]/55">Expected book</p>
                <p className="mt-0.5 font-bold text-[#0b5ea2] line-clamp-2">{expectedBook.title}</p>
                <p className="mt-1 font-mono text-xs text-[#0b5ea2]/70">{expectedBook.accessionNumber || expectedBook.barcode}</p>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl bg-black">
            {error ? (
              <div className="flex aspect-square flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="mb-2 text-red-500" size={32} />
                <p className="text-sm font-bold text-red-500">Camera Error</p>
                <p className="mt-1 text-xs text-white/70">{error}</p>
              </div>
            ) : (
              <div id={containerId} className="w-full [&_video]:w-full [&_video]:object-cover" />
            )}
          </div>

          {initializing && !error ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <p className="animate-pulse font-bold text-[#0b5ea2]">Starting camera...</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
