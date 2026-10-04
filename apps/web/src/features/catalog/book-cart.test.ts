import { describe, expect, it } from 'vitest'
import { catalogActionLabel, validateBookCartAddition, validateStudentBookCommitment } from './book-cart'

describe('book cart safeguards', () => {
  it('blocks a Student from selecting a third active book', () => {
    expect(validateBookCartAddition({
      role: 'Student', activeBookCount: 1, selectedBookCount: 1, alreadySelected: false,
    })).toEqual({
      allowed: false,
      message: 'You already have 2 of 2 active book commitments. Remove a cart item, cancel a waiting request, or return a book before adding or reserving another.',
    })
  })

  it('blocks reserve when cart selections already fill the student limit', () => {
    expect(validateStudentBookCommitment({
      role: 'Student', activeBookCount: 1, selectedBookCount: 1, bookLimit: 2,
    }).allowed).toBe(false)
  })

  it('derives Add to cart or Reserve only from the live available-copy count', () => {
    expect(catalogActionLabel(1)).toBe('Add to cart')
    expect(catalogActionLabel(0)).toBe('Reserve')
  })
})
