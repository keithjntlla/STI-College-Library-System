type Props = {
  status: string
  availableCopiesCount: number
}

export function CatalogAvailabilityBadge({ status, availableCopiesCount }: Props) {
  const ready = availableCopiesCount > 0 || status === 'Available'
  const label = ready
    ? 'Available'
    : status === 'Reserved'
      ? 'Reserved'
      : status === 'Borrowed'
        ? 'Borrowed'
        : status === 'Unavailable'
          ? 'Unavailable'
          : 'Waitlist'

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${ready ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {label}
    </span>
  )
}
