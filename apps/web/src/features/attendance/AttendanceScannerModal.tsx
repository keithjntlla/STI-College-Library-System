import { Camera, UserCircle, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Html5Qrcode as Html5QrcodeInstance } from 'html5-qrcode'
import { AlertMessage, Button, StatusPill } from '../../components/ui'
import { usersApi } from '../users/users-api'
import { attendanceApi, type ScanConfirmation, type ScanResult } from './attendance-api'

const purposes = ['Library Visit', 'Study', 'Research', 'Book Borrowing', 'Printing', 'Photocopy'] as const
const readerId = 'smartlib-attendance-qr-reader'
const purposeKey = 'smartlib-attendance-last-purpose'

function lastPurpose() {
  try {
    const stored = sessionStorage.getItem(purposeKey)
    return purposes.includes(stored as (typeof purposes)[number]) ? stored! : 'Library Visit'
  } catch {
    return 'Library Visit'
  }
}

function rememberPurpose(value: string) {
  try { sessionStorage.setItem(purposeKey, value) } catch { /* private browsing */ }
}

async function loadAvatar(schoolId: string) {
  try {
    return (await usersApi.getAvatar(schoolId)).avatarUrl
  } catch {
    return null
  }
}

function VerificationPhoto({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${name} profile photo`}
        className="h-40 w-40 shrink-0 rounded-2xl border-2 border-[#0b5ea2]/20 object-cover shadow-md xl:h-44 xl:w-44"
      />
    )
  }
  return (
    <div className="flex h-40 w-40 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0b5ea2]/25 bg-[#0b5ea2]/5 text-[#0b5ea2] xl:h-44 xl:w-44">
      <UserCircle size={56} />
      <p className="mt-2 px-3 text-center text-[11px] font-semibold text-[#0b5ea2]/60">No profile photo</p>
    </div>
  )
}

export function AttendanceScannerModal({ open, onClose, onRecorded }: { open: boolean; onClose: () => void; onRecorded?: () => void }) {
  const scanner = useRef<Html5QrcodeInstance | null>(null)
  const handling = useRef(false)
  const [scanning, setScanning] = useState(false)
  const [payload, setPayload] = useState('')
  const [resolved, setResolved] = useState<ScanResult | null>(null)
  const [confirmation, setConfirmation] = useState<ScanConfirmation | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('Use the live camera at the entrance. Check-out is automatic when the visitor is already inside.')

  const stop = async () => {
    const instance = scanner.current
    if (!instance) return
    try {
      if (instance.isScanning) await instance.stop()
      await instance.clear()
    } catch { /* camera may already be released */ }
    finally {
      scanner.current = null
      setScanning(false)
    }
  }

  const clearScanState = () => {
    handling.current = false
    setPayload('')
    setResolved(null)
    setConfirmation(null)
    setAvatarUrl(null)
    setError('')
    setBusy(false)
  }

  const start = async () => {
    await stop()
    clearScanState()
    setHint('Point the live camera at the visitor QR. Exit is automatic; entry asks for purpose after you verify the photo.')
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras.length) throw new Error('No camera was found on this device.')
      const instance = new Html5Qrcode(readerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false })
      scanner.current = instance
      setScanning(true)
      const preferred = cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0]
      await instance.start(
        preferred.id,
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => { void onDecoded(decoded) },
        () => undefined,
      )
    } catch (cause) {
      await stop()
      setError(cause instanceof Error ? cause.message : 'Camera access could not be started. Use HTTPS and allow camera permission.')
    }
  }

  const showSuccess = async (data: ScanConfirmation, photo: string | null) => {
    setConfirmation(data)
    setResolved(null)
    setAvatarUrl(photo)
    onRecorded?.()
  }

  const onDecoded = async (value: string) => {
    if (handling.current) return
    handling.current = true
    setError('')
    setBusy(true)
    setConfirmation(null)
    try {
      await stop()
      const result = await attendanceApi.resolveScan(value)
      setPayload(value)
      const photo = await loadAvatar(result.visitor.schoolId)
      setAvatarUrl(photo)
      if (result.openVisit) {
        setHint(`Checking out ${result.visitor.name}…`)
        const data = await attendanceApi.checkOut(value)
        await showSuccess(data, photo)
        return
      }
      setResolved(result)
      setHint(`Verify the photo, then choose a purpose to check in ${result.visitor.name}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify this QR code.')
      handling.current = false
    } finally {
      setBusy(false)
    }
  }

  const upload = async (file: File | null) => {
    if (!file) return
    await stop()
    clearScanState()
    setBusy(true)
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
      const instance = new Html5Qrcode(readerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false })
      scanner.current = instance
      const decoded = await instance.scanFile(file, true)
      await onDecoded(decoded)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No valid QR code was found in that image.')
      handling.current = false
    } finally {
      setBusy(false)
      await stop()
    }
  }

  const checkInWithPurpose = async (purpose: string) => {
    if (!payload || !resolved) return
    setBusy(true)
    setError('')
    try {
      rememberPurpose(purpose)
      const data = await attendanceApi.checkIn(payload, purpose, crypto.randomUUID().replaceAll('-', ''))
      await showSuccess(data, avatarUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attendance could not be recorded.')
      handling.current = false
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!open) {
      void stop().then(clearScanState)
      return
    }
    setHint('Use the live camera at the entrance. Check-out is automatic when the visitor is already inside.')
    return () => { void stop() }
  }, [open])

  if (!open) return null

  const preferredPurpose = lastPurpose()
  const displayName = confirmation?.visitor.name ?? resolved?.visitor.name ?? ''

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b5ea2]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Attendance QR scanner">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#0b5ea2]/15 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#0b5ea2]/55">Library entrance</p>
            <h2 className="mt-1 font-display text-xl font-bold">Scan attendance QR</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close attendance scanner" className="rounded-xl p-2 hover:bg-[#0b5ea2]/5"><X /></button>
        </div>
        <div className="space-y-4 p-5">
          <p className="rounded-xl bg-[#0b5ea2]/5 px-3 py-2 text-sm text-[#0b5ea2]/80">{hint}</p>

          {confirmation ? (
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-5 text-center">
              <StatusPill tone="success">Recorded</StatusPill>
              <h3 className="mt-3 font-display text-xl font-bold text-[#0b5ea2]">{confirmation.message}</h3>
              <div className="mt-4 flex justify-center">
                <VerificationPhoto name={confirmation.visitor.name} avatarUrl={avatarUrl} />
              </div>
              <p className="mt-4 text-base font-bold text-[#0b5ea2]">{confirmation.visitor.name}</p>
              <p className="mt-1 text-sm text-[#0b5ea2]/75">{confirmation.visitor.schoolId} · {confirmation.visitor.role}</p>
              {confirmation.attendance.purpose ? (
                <p className="mt-3 inline-block rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#0b5ea2] ring-1 ring-[#0b5ea2]/15">
                  Purpose: {confirmation.attendance.purpose}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-[#0b5ea2]/60">Occupancy {confirmation.occupancy.current} / {confirmation.occupancy.capacity}</p>
              <Button className="mt-5" onClick={() => void start()}>Scan next visitor</Button>
            </div>
          ) : null}

          {!confirmation ? (
            <>
              <div id={readerId} className="min-h-16 overflow-hidden rounded-2xl border border-[#0b5ea2]/15 bg-[#0b5ea2]/5" />
              {!resolved ? (
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => void start()} disabled={scanning || busy}>
                    <Camera size={16} />{scanning ? 'Camera active' : 'Start camera'}
                  </Button>
                  <label className="block cursor-pointer text-center text-xs font-semibold text-[#0b5ea2]/65 underline-offset-2 hover:text-[#0b5ea2] hover:underline">
                    Upload image instead
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => void upload(event.target.files?.[0] ?? null)} />
                  </label>
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl border border-[#0b5ea2]/15 bg-[#f7fafc] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0b5ea2]/55">Visitor verification</p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <VerificationPhoto name={displayName} avatarUrl={avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-black text-[#0b5ea2]">{resolved.visitor.name}</h3>
                      <p className="mt-1 text-sm font-bold text-[#0b5ea2]/80">{resolved.visitor.schoolId}</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-[#0b5ea2]/60">{resolved.visitor.role}</p>
                      {resolved.visitor.program ? <p className="mt-2 text-sm text-[#0b5ea2]/70">{resolved.visitor.program}</p> : null}
                      <p className="mt-3 text-xs text-[#0b5ea2]/65">
                        Ready to check in · Occupancy {resolved.occupancy.current}/{resolved.occupancy.capacity}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#0b5ea2]/55">Purpose of visit</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {purposes.map((purpose) => (
                        <button
                          key={purpose}
                          type="button"
                          disabled={busy}
                          onClick={() => void checkInWithPurpose(purpose)}
                          className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${
                            purpose === preferredPurpose
                              ? 'border-[#0b5ea2] bg-[#0b5ea2] text-white'
                              : 'border-[#0b5ea2]/20 hover:border-[#0b5ea2] hover:bg-[#0b5ea2]/5'
                          }`}
                        >
                          {purpose}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => void start()} disabled={busy}>Scan another code</Button>
                </div>
              )}
            </>
          ) : null}

          {busy && !confirmation ? (
            <p className="text-sm font-semibold text-[#0b5ea2]/70">Saving attendance…</p>
          ) : null}
          {error ? <AlertMessage type="error" variant="compact" description={error} className="mb-0" /> : null}
        </div>
      </div>
    </div>
  )
}
