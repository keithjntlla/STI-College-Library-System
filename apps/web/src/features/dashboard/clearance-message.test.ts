import { describe, expect, it } from 'vitest'
import { buildClearanceMessage } from './clearance-message'

describe('buildClearanceMessage', () => {
  it('returns null when cleared', () => {
    expect(buildClearanceMessage({
      clearanceStatus: 'Cleared',
      clearanceReason: 'No library obligations',
      activeLoans: 0,
      outstandingFines: 0,
      prefix: '/student',
    })).toBeNull()
  })

  it('describes active loans only', () => {
    const message = buildClearanceMessage({
      clearanceStatus: 'Not Cleared',
      clearanceReason: '2 unreturned books',
      activeLoans: 2,
      outstandingFines: 0,
      prefix: '/student',
    })
    expect(message?.title).toBe('Account not cleared')
    expect(message?.description).toMatch(/2 active loans/)
    expect(message?.pillLabel).toBe('Clearance: 2 active loans')
    expect(message?.cta).toEqual({ label: 'View clearance', to: '/student/clearance' })
  })

  it('describes unpaid fines only', () => {
    const message = buildClearanceMessage({
      clearanceStatus: 'Not Cleared',
      clearanceReason: 'PHP 50.00 unpaid obligations',
      activeLoans: 0,
      outstandingFines: 50,
      prefix: '/student',
    })
    expect(message?.description).toMatch(/unpaid obligations/)
    expect(message?.cta).toEqual({ label: 'View fines', to: '/student/fines' })
  })

  it('describes loans and fines together', () => {
    const message = buildClearanceMessage({
      clearanceStatus: 'Not Cleared',
      activeLoans: 1,
      outstandingFines: 25,
      prefix: '/faculty',
    })
    expect(message?.description).toMatch(/1 active loan/)
    expect(message?.description).toMatch(/unpaid obligations/)
    expect(message?.cta.to).toBe('/faculty/clearance')
  })

  it('uses warning for authorized override', () => {
    const message = buildClearanceMessage({
      clearanceStatus: 'Cleared',
      clearanceReason: 'Authorized override',
      activeLoans: 1,
      outstandingFines: 0,
      prefix: '/student',
    })
    expect(message?.type).toBe('warning')
    expect(message?.title).toBe('Clearance override active')
  })
})
