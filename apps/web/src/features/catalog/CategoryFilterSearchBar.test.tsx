import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CategoryFilterSearchBar } from './CategoryFilterSearchBar'

const api = vi.hoisted(() => ({ fetchBookCategories: vi.fn() }))
vi.mock('./book-catalog-api', () => api)

describe('CategoryFilterSearchBar', () => {
  it('renders categories in a dropdown and passes the selected ID to its parent', async () => {
    api.fetchBookCategories.mockResolvedValue([
      { categoryId: 7, categoryName: 'Artificial Intelligence' },
      { categoryId: 11, categoryName: 'Cybersecurity' },
    ])
    const onCategoryChange = vi.fn()
    const onQueryChange = vi.fn()

    render(<CategoryFilterSearchBar query="" selectedCategoryId={null} onQueryChange={onQueryChange} onCategoryChange={onCategoryChange} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Filter by category' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Cybersecurity' }))
    expect(onCategoryChange).toHaveBeenCalledWith(11)

    fireEvent.change(screen.getByRole('textbox', { name: 'Search books' }), { target: { value: 'network' } })
    expect(onQueryChange).toHaveBeenCalledWith('network')
  })

  it('shows the active category in the dropdown trigger and allows clearing it', async () => {
    api.fetchBookCategories.mockResolvedValue([{ categoryId: 7, categoryName: 'Artificial Intelligence' }])
    const onCategoryChange = vi.fn()
    render(
      <CategoryFilterSearchBar
        query=""
        selectedCategoryId={7}
        onQueryChange={() => undefined}
        onCategoryChange={onCategoryChange}
      />,
    )

    const trigger = await screen.findByRole('button', { name: 'Filter by category' })
    expect(trigger.textContent).toContain('Artificial Intelligence')
    fireEvent.click(screen.getByRole('button', { name: 'Clear category Artificial Intelligence' }))
    expect(onCategoryChange).toHaveBeenCalledWith(null)
  })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })
