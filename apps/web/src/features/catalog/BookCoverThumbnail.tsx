import { useState } from 'react'
import { DefaultBookCover, isPlaceholderCover } from './DefaultBookCover'

type BookCoverThumbnailProps = {
  title: string
  author?: string | null
  coverImagePath?: string | null
  className?: string
}

export function BookCoverThumbnail({ title, author, coverImagePath, className = 'h-20 w-14' }: BookCoverThumbnailProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const available = Boolean(coverImagePath && coverImagePath !== failedSource && !isPlaceholderCover(coverImagePath))

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0b5ea2] text-[#FFF200] ${className}`}>
      {available
        ? <img src={coverImagePath!} alt={`${title} cover`} className="h-full w-full object-cover" onError={() => setFailedSource(coverImagePath!)} />
        : <DefaultBookCover title={title} author={author} />}
    </div>
  )
}
