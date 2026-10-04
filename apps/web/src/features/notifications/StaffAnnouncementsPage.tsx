import { useEffect, useState } from 'react'
import { PageHeader, SectionCard } from '../../components/ui'
import { notificationApi } from './notification-api'
import type { Announcement } from './types'

export function StaffAnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([])
  const [error, setError] = useState('')
  useEffect(() => { void notificationApi.announcements().then(setRows).catch(cause => setError(cause instanceof Error ? cause.message : 'Unable to load announcements.')) }, [])
  return <><PageHeader eyebrow="Staff workspace" title="Announcements" />
    {error ? <p role="alert" className="mb-4 rounded-xl bg-[#FFF200] p-4 text-[#0b5ea2]">{error}</p> : null}
    <div className="space-y-3">{rows.map(row => <SectionCard key={row.announcementId} className="p-5"><h2 className="font-bold text-[#0b5ea2]">{row.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-[#0b5ea2]/70">{row.body}</p><p className="mt-2 text-xs text-[#0b5ea2]/50">{row.status}</p></SectionCard>)}{rows.length === 0 ? <SectionCard className="p-6 text-[#0b5ea2]">No announcements yet.</SectionCard> : null}</div>
  </>
}
