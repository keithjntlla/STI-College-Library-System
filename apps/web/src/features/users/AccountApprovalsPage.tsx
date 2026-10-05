import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, ShieldCheck, X } from 'lucide-react'
import { AlertMessage, Button, PageHeader, SectionCard, StatusPill } from '../../components/ui'
import { getAccessToken } from '../auth/auth-storage'

type Request = { request_id: number; school_id: string; email: string; first_name: string; last_name: string; requested_role: string; created_at: string }
type Avatar = { id: number; accountId: number; schoolId: string; name: string; submittedAt: string; previewUrl: string }
type Review = { kind: 'account'; row: Request; decision: 'approve' | 'reject' } | { kind: 'avatar'; row: Avatar; decision: 'approve' | 'reject' }

const headers = () => ({ Authorization: `Bearer ${getAccessToken() ?? ''}`, Accept: 'application/json', 'Content-Type': 'application/json' })
const formatWhen = (value: string) => new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function trapTab(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== 'Tab' || !container) return
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('button:not([disabled])')]
  if (!buttons.length) return
  if (event.shiftKey && document.activeElement === buttons[0]) {
    event.preventDefault()
    buttons.at(-1)?.focus()
  } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
    event.preventDefault()
    buttons[0]?.focus()
  }
}

export function AccountApprovalsPage() {
  const [rows, setRows] = useState<Request[]>([])
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [error, setError] = useState('')
  const [registrationNote, setRegistrationNote] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingReview, setPendingReview] = useState<Review | null>(null)
  const [lightbox, setLightbox] = useState<Avatar | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const lightboxCloseRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const lightboxRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [response, avatarResponse] = await Promise.all([
        fetch('/api/v1/auth/registration-requests', { headers: headers() }),
        fetch('/api/v1/profile/avatar/submissions', { headers: headers() }),
      ])
      const payload = await response.json() as { data?: Request[]; message?: string; code?: string }
      const avatarPayload = await avatarResponse.json() as { data?: Avatar[]; message?: string }
      const nextErrors: string[] = []
      if (response.ok) {
        setRows(payload.data ?? [])
        setRegistrationNote('')
      } else {
        setRows([])
        if (payload.code === 'SUPABASE_REQUIRED') {
          setRegistrationNote('Account registration review needs the Supabase database. Profile picture reviews still work here.')
        } else {
          setRegistrationNote('')
          nextErrors.push(payload.message ?? 'Unable to load account registrations.')
        }
      }
      if (avatarResponse.ok) {
        setAvatars(avatarPayload.data ?? [])
      } else {
        setAvatars([])
        nextErrors.push(avatarPayload.message ?? 'Unable to load picture requests.')
      }
      setError(nextErrors.join(' '))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load requests.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (pendingReview) cancelRef.current?.focus() }, [pendingReview])
  useEffect(() => { if (lightbox) lightboxCloseRef.current?.focus() }, [lightbox])
  useEffect(() => {
    if (!pendingReview && !lightbox && busy === null) openerRef.current?.focus()
  }, [pendingReview, lightbox, busy])

  useEffect(() => {
    if (!pendingReview) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && busy === null) closeReview()
      trapTab(event, dialogRef.current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingReview, busy])

  useEffect(() => {
    if (!lightbox) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox()
      trapTab(event, lightboxRef.current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightbox])

  function closeReview() {
    setPendingReview(null)
  }

  function closeLightbox() {
    setLightbox(null)
  }

  function openReview(next: Review) {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setError('')
    setPendingReview(next)
  }

  function openLightbox(row: Avatar) {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setLightbox(row)
  }

  async function review(row: Request, decision: 'approve' | 'reject') {
    setBusy(row.request_id)
    setError('')
    try {
      const response = await fetch(`/api/v1/auth/registration-requests/${row.request_id}/review`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ decision }),
      })
      const payload = await response.json() as { message?: string }
      if (!response.ok) throw new Error(payload.message ?? 'Review failed.')
      closeReview()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review failed.')
    } finally {
      setBusy(null)
    }
  }

  async function reviewAvatar(row: Avatar, decision: 'approve' | 'reject') {
    setBusy(row.id)
    setError('')
    try {
      const response = await fetch(`/api/v1/profile/avatar/submissions/${row.id}/review`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ decision }),
      })
      const payload = await response.json() as { message?: string }
      if (!response.ok) throw new Error(payload.message ?? 'Picture review failed.')
      closeReview()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Picture review failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Users"
        title="Account approvals"
        description="Review verified account registrations and pending profile pictures before they go live."
        action={(
          <Button variant="secondary" disabled={loading || busy !== null} onClick={() => void load()}>
            <RefreshCw size={16} /> {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        )}
      />
      {error && !pendingReview ? <AlertMessage type="error" description={error} variant="compact" /> : null}
      {registrationNote ? <AlertMessage type="info" description={registrationNote} variant="compact" /> : null}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold text-[#0b5ea2] dark:text-white">Account registrations</h2>
        <StatusPill tone="info">{rows.length} pending</StatusPill>
      </div>
      <p className="mt-1 text-sm text-[#0b5ea2]/70 dark:text-white/65">
        New accounts appear here after their school email is verified. Approve an account before its owner can sign in.
      </p>
      <div className="mt-3 space-y-3">
        {rows.map(row => (
          <SectionCard key={row.request_id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-bold text-[#0b5ea2] dark:text-white">{row.first_name} {row.last_name} · {row.requested_role}</p>
              <p className="text-sm text-[#0b5ea2]/70 dark:text-white/70">{row.school_id} · {row.email}</p>
              <p className="mt-1 text-xs text-[#0b5ea2]/50 dark:text-white/50">Registered {formatWhen(row.created_at)}</p>
            </div>
            <div className="flex gap-2">
              <button disabled={busy !== null} onClick={() => openReview({ kind: 'account', row, decision: 'approve' })} className="rounded-xl bg-[#0b5ea2] px-4 py-2 font-bold text-white disabled:opacity-50">Approve</button>
              <button disabled={busy !== null} onClick={() => openReview({ kind: 'account', row, decision: 'reject' })} className="rounded-xl border border-[#0b5ea2]/20 px-4 py-2 font-bold text-[#0b5ea2] disabled:opacity-50 dark:border-white/20 dark:text-white">Reject</button>
            </div>
          </SectionCard>
        ))}
        {rows.length === 0 ? (
          <SectionCard className="p-6 text-sm text-[#0b5ea2]/70 dark:text-white/65">
            No account registrations awaiting approval.
          </SectionCard>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold text-[#0b5ea2] dark:text-white">Profile pictures</h2>
        <StatusPill tone="warning">{avatars.length} pending</StatusPill>
      </div>
      <p className="mt-1 text-sm text-[#0b5ea2]/70 dark:text-white/65">
        Click a picture to enlarge it. Approve only clear photos that match the account holder.
      </p>
      <div className="mt-3 space-y-3">
        {avatars.map(row => (
          <SectionCard key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => openLightbox(row)}
                className="shrink-0 rounded-2xl ring-2 ring-[#0b5ea2]/15 transition hover:ring-[#0b5ea2]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2] dark:ring-white/20"
                aria-label={`Enlarge picture for ${row.name}`}
              >
                <img
                  src={row.previewUrl}
                  alt={`Pending picture for ${row.name}`}
                  className="h-24 w-24 rounded-2xl object-cover"
                />
              </button>
              <div>
                <p className="font-bold text-[#0b5ea2] dark:text-white">{row.name}</p>
                <p className="text-sm text-[#0b5ea2]/70 dark:text-white/70">{row.schoolId}</p>
                <p className="mt-1 text-xs text-[#0b5ea2]/50 dark:text-white/50">Submitted {formatWhen(row.submittedAt)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button disabled={busy !== null} onClick={() => openReview({ kind: 'avatar', row, decision: 'approve' })} className="rounded-xl bg-[#0b5ea2] px-4 py-2 font-bold text-white disabled:opacity-50">Approve picture</button>
              <button disabled={busy !== null} onClick={() => openReview({ kind: 'avatar', row, decision: 'reject' })} className="rounded-xl border border-[#0b5ea2]/20 px-4 py-2 font-bold text-[#0b5ea2] disabled:opacity-50 dark:border-white/20 dark:text-white">Reject</button>
            </div>
          </SectionCard>
        ))}
        {avatars.length === 0 ? (
          <SectionCard className="p-6 text-sm text-[#0b5ea2]/70 dark:text-white/65">
            No pending pictures to review.
          </SectionCard>
        ) : null}
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0b5ea2]/75 p-4 backdrop-blur-sm"
          onClick={event => { if (event.target === event.currentTarget) closeLightbox() }}
        >
          <section
            ref={lightboxRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="picture-lightbox-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[#0b5ea2]/15 bg-white shadow-2xl dark:border-white/15 dark:bg-[#001a4d]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#0b5ea2]/10 px-5 py-4 dark:border-white/10">
              <div>
                <h2 id="picture-lightbox-title" className="font-display text-lg font-bold text-[#0b5ea2] dark:text-white">{lightbox.name}</h2>
                <p className="text-sm text-[#0b5ea2]/70 dark:text-white/70">{lightbox.schoolId}</p>
              </div>
              <button
                ref={lightboxCloseRef}
                type="button"
                aria-label="Close enlarged picture"
                onClick={closeLightbox}
                className="rounded-xl p-2 text-[#0b5ea2] hover:bg-[#0b5ea2]/5 dark:text-white dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <img
                src={lightbox.previewUrl}
                alt={`Enlarged pending picture for ${lightbox.name}`}
                className="mx-auto max-h-[min(70vh,28rem)] w-full max-w-[28rem] rounded-2xl object-contain"
              />
              <p className="mt-3 text-center text-xs text-[#0b5ea2]/55 dark:text-white/55">Submitted {formatWhen(lightbox.submittedAt)}</p>
            </div>
          </section>
        </div>
      ) : null}

      {pendingReview ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0b5ea2]/65 p-4 backdrop-blur-sm">
          <section
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="approval-dialog-title"
            aria-describedby="approval-dialog-description"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[#0b5ea2]/15 bg-white shadow-2xl shadow-[#0b5ea2]/30 dark:border-white/15 dark:bg-[#001a4d]"
          >
            <div className="h-2 bg-[#FFF200]" />
            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF200] text-[#0b5ea2]">
                  <ShieldCheck size={24} />
                </span>
                <button type="button" aria-label="Close confirmation" disabled={busy !== null} onClick={closeReview} className="rounded-xl p-2 text-[#0b5ea2] hover:bg-[#0b5ea2]/5 disabled:opacity-50 dark:text-white dark:hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>
              <h2 id="approval-dialog-title" className="mt-5 font-display text-2xl font-black text-[#0b5ea2] dark:text-white">
                {pendingReview.decision === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
              </h2>
              {pendingReview.kind === 'avatar' ? (
                <img
                  src={pendingReview.row.previewUrl}
                  alt={`Pending picture for ${pendingReview.row.name}`}
                  className="mt-4 h-40 w-40 rounded-2xl object-cover ring-2 ring-[#0b5ea2]/15 dark:ring-white/20"
                />
              ) : null}
              <p id="approval-dialog-description" className="mt-3 text-sm leading-6 text-[#0b5ea2]/75 dark:text-white/70">
                {pendingReview.kind === 'account'
                  ? `${pendingReview.decision === 'approve' ? 'Approve' : 'Reject'} the ${pendingReview.row.requested_role} account for ${pendingReview.row.first_name} ${pendingReview.row.last_name} (${pendingReview.row.school_id})?`
                  : `${pendingReview.decision === 'approve' ? 'Approve' : 'Reject'} the profile picture for ${pendingReview.row.name} (${pendingReview.row.schoolId})?`}
              </p>
              {error ? <p role="alert" className="mt-4 rounded-xl bg-[#FFF200] p-3 text-sm font-bold text-[#0b5ea2]">{error}</p> : null}
              <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button ref={cancelRef} type="button" disabled={busy !== null} onClick={closeReview} className="rounded-xl border border-[#0b5ea2]/20 px-5 py-2.5 font-bold text-[#0b5ea2] disabled:opacity-50 dark:border-white/20 dark:text-white">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void (pendingReview.kind === 'account'
                    ? review(pendingReview.row, pendingReview.decision)
                    : reviewAvatar(pendingReview.row, pendingReview.decision))}
                  className="rounded-xl bg-[#0b5ea2] px-5 py-2.5 font-bold text-white disabled:opacity-50"
                >
                  {busy !== null
                    ? 'Saving…'
                    : pendingReview.decision === 'approve'
                      ? pendingReview.kind === 'account' ? 'Approve account' : 'Approve picture'
                      : pendingReview.kind === 'account' ? 'Reject account' : 'Reject picture'}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
