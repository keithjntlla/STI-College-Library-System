import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { CatalogCover } from './CatalogCover'
import { BookCoverThumbnail } from './BookCoverThumbnail'

afterEach(cleanup)

it.each(['catalog', 'thumbnail'])('%s shows the blue plate for missing, generated, or unreadable covers and recovers for a different cover', kind => {
  const cover = (title: string, src?: string, author?: string) => kind === 'catalog' ? <CatalogCover title={title} author={author} src={src} /> : <BookCoverThumbnail title={title} author={author} coverImagePath={src} />
  const { rerender } = render(cover('Harry Potter', undefined, 'J. K. Rowling'))
  expect(screen.getByRole('img', { name: 'Harry Potter cover' }).textContent).toContain('Harry Potter')
  expect(screen.getByText('J. K. Rowling')).toBeTruthy()
  rerender(cover('   ', undefined, '   '))
  expect(screen.getByRole('img', { name: 'Untitled cover' }).textContent).toContain('Author not recorded')
  rerender(cover('College English', '/api/assets/covers/generated-v4-11111111-1111-4111-8111-111111111111.png', 'STI'))
  expect(screen.getByRole('img', { name: 'College English cover' }).textContent).toContain('STI')
  expect(screen.queryByAltText('College English book cover')).toBeNull()
  rerender(cover('1984', '/covers/1984.jpg'))
  fireEvent.error(screen.getByRole('img'))
  expect(screen.getByRole('img', { name: '1984 cover' }).textContent).toContain('1984')
  expect(screen.queryByAltText('1984 book cover')).toBeNull()
  rerender(cover('1984', '/covers/replacement.jpg'))
  expect(screen.getByRole('img').getAttribute('src')).toBe('/covers/replacement.jpg')
})
