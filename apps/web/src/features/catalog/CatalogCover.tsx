import { useState } from 'react'
import { DefaultBookCover, isPlaceholderCover } from './DefaultBookCover'

export function CatalogCover({ title, author, src, className = '', flush = false }: { title: string; author?: string | null; src?: string | null; className?: string; flush?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const available = Boolean(src && src !== failedSource && !isPlaceholderCover(src))

  return (
    <div className={`overflow-hidden ${flush ? '' : 'rounded-xl'} ${className}`}>
      {available ? (
        <div className={`flex h-full items-center justify-center ${flush ? 'bg-white dark:bg-[#001a4d]' : 'bg-[#edf2ff] p-3 dark:bg-[#00225e]'}`}>
          <img src={src!} alt={`${title} book cover`} loading="lazy" className="h-full w-full object-contain" onError={() => setFailedSource(src!)} />
        </div>
      ) : (
        <DefaultBookCover title={title} author={author} />
      )}
    </div>
  )
}
