import type { AuthRole } from '../auth/auth-storage'

export const STUDENT_BOOK_LIMIT = 2

export function studentCommitmentCount(activeBookCount: number, selectedBookCount: number) {
  return activeBookCount + selectedBookCount
}

export function validateStudentBookCommitment(input: {
  role: AuthRole
  activeBookCount: number
  selectedBookCount: number
  bookLimit?: number | null
}) {
  if (input.role !== 'Student') return { allowed: true as const, message: null }
  const limit = input.bookLimit ?? STUDENT_BOOK_LIMIT
  const commitments = studentCommitmentCount(input.activeBookCount, input.selectedBookCount)
  if (commitments >= limit) {
    return {
      allowed: false as const,
      message: `You already have ${commitments} of ${limit} active book commitments. Remove a cart item, cancel a waiting request, or return a book before adding or reserving another.`,
    }
  }
  return { allowed: true as const, message: null }
}

export function validateBookCartAddition(input: {
  role: AuthRole
  activeBookCount: number
  selectedBookCount: number
  alreadySelected: boolean
  bookLimit?: number | null
}) {
  if (input.alreadySelected) return { allowed: true, message: 'This book is already in your borrow cart.' }
  const commitment = validateStudentBookCommitment(input)
  if (!commitment.allowed) return { allowed: false, message: commitment.message }
  return { allowed: true, message: null }
}

export function catalogActionLabel(availableCopiesCount: number) {
  return availableCopiesCount > 0 ? 'Add to cart' : 'Request'
}
