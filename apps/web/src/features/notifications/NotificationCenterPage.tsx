import { Bell, BookMarked, CalendarClock, CheckCircle2, Megaphone, Printer, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertMessage, Button, PageHeader, SectionCard, StatusPill, cn } from '../../components/ui'
import { getCurrentIdentity } from '../auth/auth-storage'
import { notificationApi } from './notification-api'
import type { NotificationItem, NotificationList } from './types'

type InboxFilter = 'all' | 'unread'

function formatAbsolute(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function formatWhen(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const deltaMs = Date.now() - parsed.getTime()
  if (deltaMs < 0) return formatAbsolute(value)
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatAbsolute(value)
}

function icon(type: string) {
  if (type === 'Due Date' || type === 'Overdue Penalty') return CalendarClock
  if (type === 'Reservation Arrival') return BookMarked
  if (type === 'Printing Update') return Printer
  if (type === 'Announcement') return Megaphone
  return Bell
}

function route(path: string | null) {
  if (!path) return null
  return getCurrentIdentity()?.role === 'Faculty' ? path.replace('/student/', '/faculty/') : path
}

function priorityTone(priority: NotificationItem['priority']) {
  if (priority === 'Urgent') return 'error' as const
  if (priority === 'Important') return 'warning' as const
  return 'info' as const
}

export function NotificationCenterPage() {
  const [data, setData] = useState<NotificationList | null>(null)
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async (nextFilter: InboxFilter = filter) => {
    setError('')
    try {
      const items = await notificationApi.list({
        limit: 100,
        status: nextFilter === 'unread' ? 'unread' : 'all',
      })
      setData(items)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Notifications are unavailable.')
    }
  }, [filter])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  async function read(item: NotificationItem) {
    if (!item.isRead) await notificationApi.markRead(item.notificationId)
    const target = route(item.actionPath)
    if (target) navigate(target)
    await load(filter)
  }

  async function readAll() {
    setBusy(true)
    try {
      await notificationApi.markAllRead()
      await load(filter)
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: NotificationItem) {
    setDeletingId(item.notificationId)
    setError('')
    try {
      await notificationApi.remove(item.notificationId)
      await load(filter)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The notification could not be deleted.')
    } finally {
      setDeletingId(null)
    }
  }

  async function removeAll() {
    setBusy(true)
    setError('')
    try {
      await notificationApi.removeAll()
      setShowDeleteAllConfirm(false)
      await load(filter)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The notifications could not be deleted.')
    } finally {
      setBusy(false)
    }
  }

  const emptyText = filter === 'unread' ? 'No unread notifications.' : "You're all caught up."

  return (
    <>
      <PageHeader
        eyebrow="Activity center"
        title="Notifications"
        description="Due reminders, reservation updates, printing progress, announcements, and library alerts."
        action={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void load(filter)}><RefreshCw size={16} /> Refresh</Button>
            <Button disabled={busy || !data?.unreadCount} onClick={() => void readAll()}><CheckCircle2 size={16} /> Mark all read</Button>
            <Button
              variant="secondary"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/40"
              disabled={busy || !data?.items.length}
              onClick={() => setShowDeleteAllConfirm(true)}
            >
              <Trash2 size={16} /> Delete all
            </Button>
          </div>
        )}
      />

      {error ? <AlertMessage type="error" description={error} /> : null}

      <SectionCard className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#0b5ea2]/15 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-[#0b5ea2] dark:text-white">Inbox</h2>
            <p className="text-xs text-[#0b5ea2]/60 dark:text-white/60">{data?.unreadCount ?? 0} unread</p>
          </div>
          <div className="inline-flex rounded-xl border border-[#0b5ea2]/15 p-1 dark:border-white/15" role="group" aria-label="Notification filter">
            {([
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
            ] as const).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                  filter === option.id
                    ? 'bg-[#0b5ea2] text-white dark:bg-white/15 dark:text-white'
                    : 'text-[#0b5ea2]/70 hover:bg-[#0b5ea2]/5 dark:text-white/70 dark:hover:bg-white/10',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#0b5ea2]/10 dark:divide-white/10">
          {data?.items.length ? data.items.map((item) => {
            const Icon = icon(item.type)
            return (
              <div
                key={item.notificationId}
                className={cn(
                  'flex items-start gap-2 p-3 transition hover:bg-[#0b5ea2]/5 dark:hover:bg-white/5',
                  item.isRead ? 'bg-white dark:bg-transparent' : 'bg-[#FFF200]/20 dark:bg-[#FFF200]/10',
                )}
              >
                <button type="button" onClick={() => void read(item)} className="flex min-w-0 flex-1 gap-4 rounded-xl p-2 text-left">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b5ea2]/10 text-[#0b5ea2] dark:bg-white/10 dark:text-white">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-[#0b5ea2] dark:text-white">{item.title}</strong>
                      <StatusPill tone={priorityTone(item.priority)} icon={false}>{item.priority}</StatusPill>
                      {!item.isRead ? <span className="h-2 w-2 rounded-full bg-[#0b5ea2] dark:bg-[#FFF200]" aria-label="Unread" /> : null}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#0b5ea2]/70 dark:text-white/70">{item.body}</span>
                    <span className="mt-2 block text-xs text-[#0b5ea2]/50 dark:text-white/50" title={formatAbsolute(item.createdAt)}>
                      {item.type} · {formatWhen(item.createdAt)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${item.title}`}
                  title="Delete notification"
                  disabled={deletingId === item.notificationId}
                  onClick={() => void remove(item)}
                  className="mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-45 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            )
          }) : (
            <div className="p-12 text-center font-semibold text-[#0b5ea2] dark:text-white/80">{emptyText}</div>
          )}
        </div>
      </SectionCard>

      {showDeleteAllConfirm ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0b5ea2]/65 p-4 backdrop-blur-sm dark:bg-black/60">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-all-notifications-title"
            aria-describedby="delete-all-notifications-description"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[#0b5ea2]/15 bg-white shadow-2xl shadow-[#0b5ea2]/30 dark:border-white/15 dark:bg-[#1a1b22] dark:shadow-black/40"
          >
            <div className="h-2 bg-[#FFF200]" />
            <div className="p-6 sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"><Trash2 size={23} /></span>
              <h2 id="delete-all-notifications-title" className="mt-5 font-display text-2xl font-bold text-[#0b5ea2] dark:text-white">Delete all notifications?</h2>
              <p id="delete-all-notifications-description" className="mt-2 text-sm leading-6 text-[#0b5ea2]/65 dark:text-white/65">
                This will clear every notification currently in your inbox. This action cannot be undone.
              </p>
              <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" disabled={busy} onClick={() => setShowDeleteAllConfirm(false)}>Cancel</Button>
                <Button className="bg-red-600 text-white hover:bg-red-700" disabled={busy} onClick={() => void removeAll()}>
                  <Trash2 size={16} />{busy ? 'Deleting…' : 'Delete notifications'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
