import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertMessage, PageHeader, SectionCard, StatusPill } from '../../components/ui'
import { getAccessToken } from '../auth/auth-storage'
import { usersApi, type OwnProfile } from './users-api'

type AvatarState = {
  currentUrl: string | null
  pending: { id: number; submittedAt: string } | null
  lastRejection?: { reviewedAt: string; reason: string } | null
}

const fieldClass = 'mt-1 w-full rounded-xl border border-[#0b5ea2]/15 bg-[#0b5ea2]/5 p-3 text-[#0b5ea2] opacity-80 dark:border-white/15 dark:bg-white/5 dark:text-white'

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="text-sm font-bold text-[#0b5ea2] dark:text-white">
      {label}
      <input value={value} readOnly aria-label={label} className={fieldClass} />
    </label>
  )
}

export function ProfileAvatarPage() {
  const [data, setData] = useState<AvatarState | null>(null)
  const [profile, setProfile] = useState<OwnProfile | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/v1/profile/avatar/me', { headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` } })
    const payload = await response.json() as { data?: AvatarState; message?: string }
    if (!response.ok || !payload.data) throw new Error(payload.message ?? 'Unable to load your picture.')
    setData(payload.data)
  }, [])

  useEffect(() => {
    void load().catch(cause => setMessage({ type: 'error', text: cause instanceof Error ? cause.message : 'Unable to load your picture.' }))
  }, [load])

  useEffect(() => {
    void usersApi.myProfile().then(setProfile).catch(cause => {
      setMessage({ type: 'error', text: cause instanceof Error ? cause.message : 'Unable to load your profile.' })
    })
  }, [])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    setBusy(true)
    setMessage(null)
    try {
      const form = new FormData()
      form.set('image', file)
      const response = await fetch('/api/v1/profile/avatar/me', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
        body: form,
      })
      const payload = await response.json() as { message?: string; data?: { status?: string } }
      if (!response.ok) throw new Error(payload.message ?? 'Unable to upload your picture.')
      const approvedNow = payload.data?.status === 'Approved'
      setFile(null)
      setMessage({
        type: approvedNow ? 'success' : 'info',
        text: approvedNow ? 'Your profile picture is now active.' : 'Your new picture is awaiting Librarian approval.',
      })
      await load()
    } catch (cause) {
      setMessage({ type: 'error', text: cause instanceof Error ? cause.message : 'Unable to upload your picture.' })
    } finally {
      setBusy(false)
    }
  }

  const librarianSelf = profile?.role === 'Librarian' || profile?.role === 'Admin'
  const displayPreview = previewUrl ?? data?.currentUrl

  return (
    <>
      <PageHeader
        eyebrow="My account"
        title="My profile"
        description={librarianSelf
          ? 'Review your account identity and update your profile picture.'
          : 'Review your account identity and submit a profile picture for Librarian approval.'}
      />

      {message ? (
        <AlertMessage type={message.type} description={message.text} onDismiss={() => setMessage(null)} variant="compact" />
      ) : null}

      {data?.lastRejection ? (
        <AlertMessage
          type="warning"
          title="Previous picture not approved"
          description={data.lastRejection.reason}
          variant="compact"
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <SectionCard className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-[#0b5ea2] dark:text-white">Profile details</h2>
            {profile ? <StatusPill tone="info">{profile.role}</StatusPill> : null}
          </div>
          <p className="mt-1 text-sm text-[#0b5ea2]/70 dark:text-white/65">
            These details are fixed from registration. Contact the library if something needs a correction. Only your picture can be changed here.
          </p>
          {profile ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="School ID" value={profile.school_id} />
              <ReadOnlyField label="School email" value={profile.email ?? ''} />
              <ReadOnlyField label="First name" value={profile.first_name ?? ''} />
              <ReadOnlyField label="Last name" value={profile.last_name ?? ''} />
              {profile.role === 'Student' ? (
                <>
                  <ReadOnlyField label="Program / strand" value={profile.program_strand ?? ''} />
                  <ReadOnlyField label="Year / grade level" value={profile.year_grade_level ?? ''} />
                </>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#0b5ea2]/70 dark:text-white/65">Loading profile…</p>
          )}
        </SectionCard>

        <SectionCard className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-[#0b5ea2] dark:text-white">{librarianSelf ? 'Profile picture' : 'Approved picture'}</h2>
            {data?.pending ? <StatusPill tone="warning">Awaiting review</StatusPill> : null}
          </div>
          <p className="mt-1 text-sm text-[#0b5ea2]/70 dark:text-white/65">
            {data?.pending
              ? 'A replacement is awaiting Librarian review.'
              : librarianSelf
                ? 'Upload a new picture to replace the current one.'
                : 'Upload a new picture below for approval.'}
          </p>

          <div className="mt-5 flex items-center gap-5">
            {displayPreview ? (
              <img
                src={displayPreview}
                alt={previewUrl ? 'Selected picture preview' : 'Your approved profile picture'}
                className="h-32 w-32 rounded-full object-cover ring-2 ring-[#0b5ea2]/20 dark:ring-white/20"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#0b5ea2]/10 text-sm font-semibold text-[#0b5ea2] dark:bg-white/10 dark:text-white/80">
                No picture
              </div>
            )}
            <div className="min-w-0 text-sm text-[#0b5ea2]/70 dark:text-white/65">
              {previewUrl ? 'Preview of your selected file. Submit to send it for review.' : 'PNG, JPEG, or WebP up to 2 MB.'}
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-[#0b5ea2] dark:text-white">
              New picture
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={event => setFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#0b5ea2] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
              />
            </label>
            <button
              disabled={busy || !file}
              className="w-full rounded-xl bg-[#0b5ea2] px-5 py-3 font-bold text-white disabled:opacity-50 sm:w-auto"
            >
              {busy ? 'Uploading…' : librarianSelf ? 'Save picture' : 'Submit for approval'}
            </button>
          </form>
        </SectionCard>
      </div>
    </>
  )
}
