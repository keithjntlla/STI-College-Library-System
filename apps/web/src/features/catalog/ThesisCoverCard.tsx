import { cn } from '../../components/ui'
import {
  formatThesisCoverDate,
  resolveDegreeLine,
  splitThesisAuthors,
  thesisCoverTheme,
} from './thesis-cover'

type ThesisCoverCardProps = {
  title: string
  authors: string
  department: string
  publicationYear?: number | null
  className?: string
}

export function ThesisCoverCard({
  title,
  authors,
  department,
  publicationYear = null,
  className,
}: ThesisCoverCardProps) {
  const theme = thesisCoverTheme(department)
  const authorLines = splitThesisAuthors(authors)
  const degree = resolveDegreeLine(department)
  const departmentLine = department.trim() || 'Campus Program'

  return (
    <div
      className={cn(
        'relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-md px-3.5 py-4 text-center shadow-md ring-1 ring-black/15 sm:px-4 sm:py-5',
        className,
      )}
      style={{ backgroundColor: theme.background, color: theme.text }}
      aria-label={`${title} thesis cover`}
    >
      <div className="space-y-2">
        <p className="line-clamp-3 font-serif text-[10px] font-bold uppercase leading-snug tracking-wide">
          {title}
        </p>
        <div className="mx-auto space-y-0.5 font-serif text-[10px] leading-snug" style={{ color: theme.muted }}>
          <p>A Capstone Project</p>
          <p>Presented to the Faculty of the</p>
          <p className="line-clamp-2">{departmentLine}</p>
          <p>STI College Ormoc</p>
        </div>
      </div>

      <div className="mx-auto font-serif text-[10px] leading-snug" style={{ color: theme.muted }}>
        <p>In Partial Fulfillment</p>
        <p>of the Requirements for the Degree</p>
        <p className="mt-1 line-clamp-2 font-semibold" style={{ color: theme.text }}>{degree}</p>
      </div>

      <div className="space-y-1.5">
        <div className="mx-auto max-h-14 space-y-0.5 overflow-hidden font-serif text-[10px] font-semibold leading-snug">
          {authorLines.length ? authorLines.map((name) => <p key={name} className="truncate">{name}</p>) : <p>Author not recorded</p>}
        </div>
        <p className="font-serif text-[11px] font-bold uppercase tracking-[0.12em] [font-variant-numeric:lining-nums]">
          {formatThesisCoverDate(publicationYear)}
        </p>
      </div>
    </div>
  )
}
