import { describe, expect, it } from 'vitest'
import { archiveErrorMessage } from './archive-error-message'
import { ApiError } from './catalog-api'

describe('archiveErrorMessage', () => {
  it('maps loan and reservation codes to actionable copy', () => {
    expect(archiveErrorMessage(new ApiError('loan blocked', 'PHYSICAL_COPY_HAS_ACTIVE_LOAN'))).toContain('loan blocked')
    expect(archiveErrorMessage(new ApiError('', 'TITLE_HAS_ACTIVE_RESERVATION'))).toMatch(/reservations/i)
    expect(archiveErrorMessage(new ApiError('', 'PHYSICAL_COPY_HAS_ACTIVE_RESERVATION'))).toMatch(/reservation/i)
  })

  it('falls back for unknown failures', () => {
    expect(archiveErrorMessage(new Error('network down'), 'fallback')).toBe('network down')
    expect(archiveErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
