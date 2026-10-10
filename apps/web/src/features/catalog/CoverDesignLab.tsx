import { Link } from 'react-router-dom'

type SampleCover = {
  title: string
  author: string
}

const samples: SampleCover[] = [
  { title: 'College English', author: 'Department of General Education' },
  { title: 'Introduction to Hospitality Management and Tourism Operations', author: 'College of Tourism and Hospitality' },
  { title: 'Discrete Mathematics', author: '' },
]

const designs = [
  { id: '5', name: 'Blue plate', render: BluePlate },
  { id: '1', name: 'Blue field', render: BlueField },
  { id: '2', name: 'White plate', render: WhitePlate },
  { id: '3', name: 'Split', render: SplitCover },
  { id: '4', name: 'Index', render: IndexCover },
]

function authorLine(author: string) {
  return author.trim() || 'Author not recorded'
}

function initial(title: string) {
  return title.trim().charAt(0).toUpperCase() || 'B'
}

function BlueField({ title, author }: SampleCover) {
  return (
    <div className="flex aspect-[3/4] w-full flex-col justify-between p-4 text-left" style={{ backgroundColor: '#0b5ea2' }}>
      <p className="line-clamp-6 font-display text-lg font-black leading-tight" style={{ color: '#FFF200' }}>{title}</p>
      <p className="text-xs font-semibold leading-5" style={{ color: '#ffffff' }}>{authorLine(author)}</p>
    </div>
  )
}

function BluePlate({ title, author }: SampleCover) {
  return (
    <div className="relative flex aspect-[3/4] w-full flex-col justify-between p-4 pl-6 text-left" style={{ backgroundColor: '#0b5ea2' }}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2.5" style={{ backgroundColor: '#FFF200' }} />
      <p className="line-clamp-6 font-display text-lg font-black leading-tight" style={{ color: '#FFF200' }}>{title}</p>
      <p className="text-xs font-semibold leading-5" style={{ color: '#ffffff' }}>{authorLine(author)}</p>
    </div>
  )
}

function WhitePlate({ title, author }: SampleCover) {
  return (
    <div className="relative flex aspect-[3/4] w-full flex-col justify-between p-4 pl-6 text-left" style={{ backgroundColor: '#ffffff' }}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2.5" style={{ backgroundColor: '#0b5ea2' }} />
      <span aria-hidden="true" className="absolute right-3 top-3 h-4 w-4" style={{ backgroundColor: '#FFF200' }} />
      <p className="line-clamp-6 pr-6 font-display text-lg font-black leading-tight" style={{ color: '#0b5ea2' }}>{title}</p>
      <p className="text-xs font-semibold leading-5" style={{ color: '#3d6f93' }}>{authorLine(author)}</p>
    </div>
  )
}

function SplitCover({ title, author }: SampleCover) {
  return (
    <div className="flex aspect-[3/4] w-full flex-col text-left" style={{ backgroundColor: '#0b5ea2' }}>
      <div className="flex flex-1 items-start p-4">
        <p className="line-clamp-6 font-display text-lg font-black leading-tight" style={{ color: '#FFF200' }}>{title}</p>
      </div>
      <div className="px-4 py-4" style={{ backgroundColor: '#FFF200' }}>
        <p className="line-clamp-3 text-xs font-semibold leading-5" style={{ color: '#0b5ea2' }}>{authorLine(author)}</p>
      </div>
    </div>
  )
}

function IndexCover({ title, author }: SampleCover) {
  return (
    <div className="flex aspect-[3/4] w-full flex-col justify-between text-left" style={{ backgroundColor: '#f4f4f5' }}>
      <div className="p-4">
        <p aria-hidden="true" className="font-display text-5xl font-black leading-none" style={{ color: '#0b5ea2' }}>{initial(title)}</p>
        <p className="mt-4 line-clamp-5 font-display text-base font-bold leading-tight" style={{ color: '#0b5ea2' }}>{title}</p>
      </div>
      <div>
        <p className="px-4 pb-3 text-xs font-semibold leading-5" style={{ color: '#3d6f93' }}>{authorLine(author)}</p>
        <div aria-hidden="true" className="h-2" style={{ backgroundColor: '#0b5ea2' }} />
      </div>
    </div>
  )
}

export function CoverDesignLab() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-black text-[#0b5ea2] dark:text-[#FFF200]">Cover previews</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Preview only. These designs are not applied to catalog books. Pick a number, then the chosen design can replace generated covers that have no official artwork.
            </p>
          </div>
          <Link to="/" className="rounded-full bg-[#0b5ea2] px-4 py-2 text-sm font-bold text-white active:scale-[0.98] dark:bg-[#FFF200] dark:text-[#0b5ea2]">
            Return to library
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-12 px-6 py-10">
        {designs.map((design) => {
          const Cover = design.render
          return (
            <section key={design.id}>
              <h2 className="font-display text-xl font-black text-zinc-900 dark:text-white">{design.id}. {design.name}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
                {samples.map((sample) => (
                  <article key={`${design.id}-${sample.title}`} className="max-w-[220px] overflow-hidden rounded-md shadow-sm ring-1 ring-black/10">
                    <Cover title={sample.title} author={sample.author} />
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}
