import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info, MoreHorizontal, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

/** Semantic status tones for pills, banners, and modals. Prefer these over ad-hoc yellow/red classes. */
export type StatusTone = 'error' | 'warning' | 'success' | 'info'

export const statusToneStyles: Record<StatusTone, {
  pill: string
  banner: string
  bannerBorder: string
  iconBg: string
  iconOutline: string
  title: string
  description: string
  icon: LucideIcon
}> = {
  error: {
    pill: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-500/30',
    banner: 'bg-red-50 dark:bg-red-950/40',
    bannerBorder: 'bg-red-500',
    iconBg: 'bg-red-500 text-white',
    iconOutline: 'text-red-600 dark:text-red-400',
    title: 'text-red-950 dark:text-red-100',
    description: 'text-red-800/80 dark:text-red-200/80',
    icon: AlertTriangle,
  },
  warning: {
    pill: 'bg-[#FFF200]/55 text-[#0b5ea2] ring-[#0b5ea2]/15 dark:bg-[#FFF200]/40 dark:text-[#0b5ea2] dark:ring-[#FFF200]/50',
    banner: 'bg-[#FFF200]/20 dark:bg-[#FFF200]/15',
    bannerBorder: 'bg-[#e6d900]',
    iconBg: 'bg-[#FFF200] text-[#0b5ea2]',
    iconOutline: 'text-[#0b5ea2]',
    title: 'text-[#0b5ea2] dark:text-[#FFF200]',
    description: 'text-[#0b5ea2]/75 dark:text-[#f7f9ff]/80',
    icon: AlertTriangle,
  },
  success: {
    pill: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/30',
    banner: 'bg-emerald-50 dark:bg-emerald-950/40',
    bannerBorder: 'bg-emerald-500',
    iconBg: 'bg-emerald-500 text-white',
    iconOutline: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-950 dark:text-emerald-100',
    description: 'text-emerald-800/80 dark:text-emerald-200/80',
    icon: CheckCircle2,
  },
  info: {
    pill: 'bg-[#0b5ea2]/10 text-[#0b5ea2] ring-[#0b5ea2]/15 dark:bg-white/10 dark:text-[#f7f9ff] dark:ring-white/20',
    banner: 'bg-[#0b5ea2]/5 dark:bg-white/5',
    bannerBorder: 'bg-[#0b5ea2]',
    iconBg: 'bg-[#0b5ea2] text-white',
    iconOutline: 'text-[#0b5ea2] dark:text-[#7eb6ff]',
    title: 'text-[#0b5ea2] dark:text-white',
    description: 'text-[#0b5ea2]/70 dark:text-white/70',
    icon: Info,
  },
}

/** Compact status pill/chip. Use for recorded, pending, blocked, and other short status labels. */
export function StatusPill({
  tone,
  children,
  icon: Icon,
  className,
}: {
  tone: StatusTone
  children: ReactNode
  icon?: LucideIcon | false
  className?: string
}) {
  const styles = statusToneStyles[tone]
  const ResolvedIcon = Icon === false ? null : (Icon ?? styles.icon)
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset', styles.pill, className)}>
      {ResolvedIcon ? <ResolvedIcon size={14} strokeWidth={2.5} aria-hidden /> : null}
      {children}
    </span>
  )
}

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0b5ea2] dark:text-[#f2f6ff]">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b5ea2] sm:text-3xl dark:text-white">{title}</h1>
      </div>
      {action}
    </div>
  )
}

export function Button({ children, variant = 'primary', className, type = 'button', onClick, disabled = false }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; className?: string; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean }) {
  const variants = {
    primary: 'bg-[#0b5ea2] text-white shadow-sm hover:bg-[#0b5ea2]',
    secondary: 'border border-[#0b5ea2]/15 bg-white text-[#0b5ea2] hover:border-[#0b5ea2]/15 hover:text-[#0b5ea2] dark:border-white/20 dark:bg-[#001a4d] dark:text-[#f2f6ff]',
    ghost: 'text-[#0b5ea2]/65 hover:bg-[#0b5ea2]/5 hover:text-[#0b5ea2] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white',
  }
  return <button type={type} onClick={onClick} disabled={disabled} className={cn('inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45', variants[variant], className)}>{children}</button>
}

export function SectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl border border-[#0b5ea2]/10 bg-white shadow-[0_1px_3px_rgba(11,94,162,0.08)] dark:border-white/10 dark:bg-[#001a4d] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]', className)}>{children}</section>
}

const toneClasses: Record<string, string> = {
  active: 'bg-[#0b5ea2]/5 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-[#f7f9ff] dark:ring-white/15',
  available: 'bg-[#0b5ea2]/5 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-[#f7f9ff] dark:ring-white/15',
  ready_for_pickup: 'bg-[#0b5ea2]/5 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-[#f7f9ff] dark:ring-white/15',
  cleared: 'bg-[#0b5ea2]/5 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-[#f7f9ff] dark:ring-white/15',
  paid: 'bg-[#0b5ea2]/5 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-[#f7f9ff] dark:ring-white/15',
  returned: 'bg-[#0b5ea2]/5 text-[#0b5ea2]/65 ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-white/80 dark:ring-white/15',
  queued: 'bg-[#FFF200]/35 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-[#FFF200]/40 dark:text-[#0b5ea2] dark:ring-[#FFF200]/50',
  pending: 'bg-[#FFF200]/35 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-[#FFF200]/40 dark:text-[#0b5ea2] dark:ring-[#FFF200]/50',
  partially_paid: 'bg-[#FFF200]/35 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-[#FFF200]/40 dark:text-[#0b5ea2] dark:ring-[#FFF200]/50',
  printing: 'bg-[#FFF200]/35 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-[#FFF200]/40 dark:text-[#0b5ea2] dark:ring-[#FFF200]/50',
  overdue: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-500/30',
  borrowed: 'bg-[#0b5ea2]/5 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-[#f7f9ff] dark:ring-white/15',
  reserved: 'bg-[#FFF200]/35 text-[#0b5ea2] ring-[#0b5ea2]/10 dark:bg-[#FFF200]/40 dark:text-[#0b5ea2] dark:ring-[#FFF200]/50',
  blocked: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-500/30',
  unpaid: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-500/30',
  unavailable: 'bg-[#0b5ea2]/5 text-[#0b5ea2]/65 ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-white/80 dark:ring-white/15',
  inactive: 'bg-[#0b5ea2]/5 text-[#0b5ea2]/65 ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-white/80 dark:ring-white/15',
  lost_report_pending: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/30',
  lost_report_confirmed: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-500/30',
  lost_report_rejected: 'bg-[#0b5ea2]/5 text-[#0b5ea2]/65 ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-white/80 dark:ring-white/15',
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll(' ', '_')
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset', toneClasses[normalized] ?? 'bg-[#0b5ea2]/5 text-[#0b5ea2]/65 ring-[#0b5ea2]/10 dark:bg-white/10 dark:text-white/80 dark:ring-white/15')}>{status.replaceAll('_', ' ')}</span>
}

const statTones: Record<string, string> = {
  emerald: 'bg-[#0b5ea2]/5 text-[#0b5ea2] dark:bg-white/10 dark:text-[#f7f9ff]',
  blue: 'bg-[#0b5ea2]/5 text-[#0b5ea2] dark:bg-white/10 dark:text-[#f7f9ff]',
  teal: 'bg-[#0b5ea2]/5 text-[#0b5ea2] dark:bg-white/10 dark:text-[#f7f9ff]',
  orange: 'bg-[#FFF200]/35 text-[#0b5ea2] dark:bg-[#FFF200]/40 dark:text-[#0b5ea2]',
  violet: 'bg-[#0b5ea2]/5 text-[#0b5ea2] dark:bg-white/10 dark:text-[#f7f9ff]',
  cyan: 'bg-[#0b5ea2]/5 text-[#0b5ea2] dark:bg-white/10 dark:text-[#f7f9ff]',
  pink: 'bg-[#0b5ea2]/5 text-[#0b5ea2] dark:bg-white/10 dark:text-[#f7f9ff]',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  amber: 'bg-[#FFF200]/35 text-[#0b5ea2] dark:bg-[#FFF200]/40 dark:text-[#0b5ea2]',
}

export function StatCard({ label, value, icon: Icon, tone = 'emerald' }: { label: string; value: string | number; note?: string; icon?: LucideIcon; tone?: string }) {
  return (
    <SectionCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#0b5ea2]/65 dark:text-white/70">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-[#0b5ea2] dark:text-white">{value}</p>
        </div>
        {Icon && <div className={cn('rounded-xl p-2.5', statTones[tone] ?? statTones.emerald)}><Icon size={18} /></div>}
      </div>
    </SectionCard>
  )
}

export function TableSearch({ placeholder = 'Search records...', value, onChange }: { placeholder?: string; value?: string; onChange?: (value: string) => void }) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0b5ea2]/45 dark:text-white/45" size={16} />
      <input value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-[#0b5ea2]/15 bg-[#0b5ea2]/5 pl-9 pr-3 text-sm outline-none transition focus:border-[#0b5ea2]/15 focus:bg-white focus:ring-4 focus:ring-[#0b5ea2]/10 dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:bg-[#002266]" />
    </label>
  )
}

export function TableShell({ title, controls, children }: { title: string; subtitle?: string; controls?: ReactNode; children: ReactNode }) {
  return (
    <SectionCard className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[#0b5ea2]/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        <h2 className="font-display text-base font-bold text-[#0b5ea2] dark:text-white">{title}</h2>
        {controls}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </SectionCard>
  )
}

export function MoreButton() {
  return <button aria-label="More actions" className="rounded-lg p-2 text-[#0b5ea2]/45 transition hover:bg-[#0b5ea2]/5 hover:text-[#0b5ea2] dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"><MoreHorizontal size={17} /></button>
}

export function CardLink({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0b5ea2]">{children}<ArrowUpRight size={13} /></span>
}

export function BookCover({ code, accent, className }: { code: string; accent: string; className?: string }) {
  return (
    <div className={cn('relative flex aspect-[3/4] items-end overflow-hidden rounded-xl bg-gradient-to-br p-3 text-white shadow-lg shadow-[#0b5ea2]/10', accent, className)}>
      <div className="absolute inset-y-0 left-2 w-px bg-white/20" />
      <div className="absolute right-3 top-3 h-5 w-5 rounded-full border border-white/20" />
      <span className="font-display text-xl font-black tracking-tight">{code}</span>
    </div>
  )
}


export function StatusModal({ type = 'success', title, description, onClose }: { type?: StatusTone; title?: string; description: ReactNode; onClose: () => void }) {
  const styles = statusToneStyles[type]
  const Icon = styles.icon
  const defaultTitle = { error: 'Error', warning: 'Warning', success: 'Success', info: 'Notice' }[type]
  const button = {
    error: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-[#0b5ea2] hover:bg-[#094d87] text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    info: 'bg-[#0b5ea2] hover:bg-[#094d87] text-white',
  }[type]

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl bg-[#FFFFFF] p-6 shadow-2xl dark:bg-[#001a4d] border border-white/10 flex flex-col items-center text-center">
        <div className={cn('mb-4 flex h-16 w-16 items-center justify-center rounded-full', styles.iconBg)}>
          <Icon size={32} strokeWidth={2.5} />
        </div>
        <h3 className={cn('font-display text-xl font-bold', styles.title)}>{title || defaultTitle}</h3>
        <p className={cn('mt-2 text-sm', styles.description)}>{description}</p>
        <button onClick={onClose} className={cn('mt-6 w-full rounded-xl px-4 py-2.5 font-bold shadow-sm', button)}>Close</button>
      </div>
    </div>
  )
}

export function ConfirmModal({ title, description, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }: { title: string; description: ReactNode; confirmText?: string; cancelText?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm lg:left-[var(--sidebar-offset,0px)]" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="w-full max-w-sm rounded-3xl bg-[#FFFFFF] p-6 shadow-2xl dark:bg-[#001a4d] border border-white/10">
        <h3 id="confirm-modal-title" className="font-display text-xl font-bold text-[#0b5ea2] dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-[#0b5ea2]/70 dark:text-white/60">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="h-10 rounded-xl px-4 text-sm font-bold text-[#0b5ea2] hover:bg-zinc-100 transition-colors dark:text-white/80 dark:hover:bg-white/10">{cancelText}</button>
          <button type="button" onClick={onConfirm} className="h-10 rounded-xl bg-[#0b5ea2] px-4 text-sm font-bold text-[#FFFFFF] hover:bg-[#004488] transition-colors">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

export function AlertMessage({
  type = 'error',
  title,
  description,
  onDismiss,
  variant = 'detailed',
  className,
  action,
}: {
  type?: StatusTone
  title?: string
  description: ReactNode
  onDismiss?: () => void
  variant?: 'detailed' | 'compact'
  className?: string
  action?: ReactNode
}) {
  const styles = statusToneStyles[type]
  const Icon = styles.icon

  if (variant === 'compact') {
    return (
      <div role="alert" className={cn('mb-5 flex items-center gap-3 rounded-xl px-4 py-3', styles.banner, className)}>
        <Icon size={18} strokeWidth={2.25} className={cn('shrink-0', styles.iconOutline)} />
        <div className={cn('min-w-0 flex-1 text-sm font-semibold', styles.title)}>{description}</div>
        {action}
        {onDismiss ? (
          <button type="button" aria-label="Dismiss" onClick={onDismiss} className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200">
            <X size={16} />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div role="alert" className={cn('relative mb-5 flex items-start gap-3 overflow-hidden rounded-xl p-4 pl-5', styles.banner, className)}>
      <div className={cn('absolute inset-y-0 left-0 w-1.5', styles.bannerBorder)} />
      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', styles.iconBg)}>
        <Icon size={15} strokeWidth={2.75} />
      </div>
      <div className="min-w-0 flex-1">
        {title ? <h3 className={cn('text-sm font-bold', styles.title)}>{title}</h3> : null}
        <div className={cn('text-sm', styles.description, title ? 'mt-0.5' : 'mt-0.5 font-semibold')}>{description}</div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="ml-2 mt-0.5 shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200">
          <X size={16} />
        </button>
      ) : null}
    </div>
  )
}
