const GENERATED_COVER = /\/generated-(?:v\d+-)?[a-f0-9-]{36}\.png(?:$|\?)/i

export function isPlaceholderCover(src?: string | null) {
  return !src || GENERATED_COVER.test(src)
}

/** Blue plate used by the previous library for titles without official artwork. */
export function DefaultBookCover({ title, author }: { title: string; author?: string | null }) {
  const name = title.trim() || 'Untitled'
  const byline = (author ?? '').trim() || 'Author not recorded'
  return (
    <div
      role="img"
      aria-label={`${name} cover`}
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#0b5ea2] py-[7%] pl-[11%] pr-[7%] text-left"
      style={{ containerType: 'inline-size' }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[4.5%] bg-[#FFF200]" />
      <p className="line-clamp-6 font-display text-[clamp(0.55rem,8.2cqw,1.125rem)] font-black leading-tight text-[#FFF200]">{name}</p>
      <p className="line-clamp-3 text-[clamp(0.45rem,5.5cqw,0.75rem)] font-semibold leading-snug text-white">{byline}</p>
    </div>
  )
}
