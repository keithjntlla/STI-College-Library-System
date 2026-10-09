/** Maps archive API failures to actionable librarian guidance. */
export function archiveErrorMessage(error: unknown, fallback = 'The record could not be archived.') {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: string }).code ?? '') : ''
  const message = error instanceof Error ? error.message : ''
  switch (code) {
    case 'PHYSICAL_COPY_HAS_ACTIVE_LOAN':
      return message || 'An active loan or pending claim is blocking archive. Return the book or cancel the claim in Circulation first.'
    case 'TITLE_HAS_ACTIVE_RESERVATION':
      return message || 'Cancel or complete active reservations for this title before archiving.'
    case 'PHYSICAL_COPY_HAS_ACTIVE_RESERVATION':
      return message || 'Cancel or complete the reservation on this copy before archiving.'
    case 'CATALOG_ALREADY_ARCHIVED':
    case 'PHYSICAL_COPY_ARCHIVED':
      return message || 'This record is already archived. Open Book Archive to inspect it.'
    case 'ARCHIVE_REASON_REQUIRED':
      return 'Enter a brief archive reason before continuing.'
    case 'ARCHIVE_REASON_TOO_LONG':
      return 'Archive reason must not exceed 255 characters.'
    default:
      return message || fallback
  }
}
