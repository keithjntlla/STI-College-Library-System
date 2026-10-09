import { createRequire } from 'node:module'
import { HttpError } from '../../core/http-error.ts'

const require = createRequire(import.meta.url)
// jszip is CJS; load via createRequire for the ESM API package.
const JSZip = require('jszip') as {
  loadAsync: (data: Buffer, options?: { createFolders?: boolean }) => Promise<{
    files: Record<string, { dir: boolean; name: string; _data?: { uncompressedSize?: number }; async: (type: 'string') => Promise<string> }>
  }>
}

const maxZipEntries = 2000
const maxSingleEntryBytes = 40 * 1024 * 1024
const maxTotalUncompressedBytes = 80 * 1024 * 1024

const macroPathPattern = /(^|\/)(vbaproject(\.bin)?|vbaData\.xml|macrosheets?\/)/i
const macroContentTypePattern = /macroEnabled|vbaProject|vnd\.ms-word\.document\.macro|vnd\.ms-word\.template\.macro/i

/** Reject macro-enabled or zip-bomb style DOCX packages before conversion. */
export async function assertSafeDocxPackage(buffer: Buffer) {
  if (buffer.subarray(0, 2).toString('ascii') !== 'PK') {
    throw new HttpError(422, 'PRINT_FILE_INVALID', 'The document must be a genuine PDF or DOCX file.')
  }

  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>
  try {
    zip = await JSZip.loadAsync(buffer, { createFolders: false })
  } catch {
    throw new HttpError(422, 'PRINT_FILE_INVALID', 'The document must be a genuine PDF or DOCX file.')
  }

  const entries = Object.values(zip.files)
  if (entries.length > maxZipEntries) {
    throw new HttpError(422, 'PRINT_DOCX_UNSAFE', 'The Word document is too complex to accept. Export it as a PDF and upload that instead.')
  }

  let totalUncompressed = 0
  for (const entry of entries) {
    if (entry.dir) continue
    if (macroPathPattern.test(entry.name)) {
      throw new HttpError(422, 'PRINT_DOCX_MACROS', 'Macro-enabled Word documents are not allowed. Save as a regular .docx without macros, or upload a PDF.')
    }
    const size = Number(entry._data?.uncompressedSize ?? 0)
    if (Number.isFinite(size) && size > 0) {
      if (size > maxSingleEntryBytes) {
        throw new HttpError(422, 'PRINT_DOCX_UNSAFE', 'The Word document expands too large to accept. Export it as a PDF and upload that instead.')
      }
      totalUncompressed += size
      if (totalUncompressed > maxTotalUncompressedBytes) {
        throw new HttpError(422, 'PRINT_DOCX_UNSAFE', 'The Word document expands too large to accept. Export it as a PDF and upload that instead.')
      }
    }
  }

  const contentTypesEntry = zip.files['[Content_Types].xml']
  if (!contentTypesEntry || contentTypesEntry.dir) {
    throw new HttpError(422, 'PRINT_FILE_INVALID', 'The document must be a genuine PDF or DOCX file.')
  }
  const contentTypes = await contentTypesEntry.async('string')
  if (macroContentTypePattern.test(contentTypes)) {
    throw new HttpError(422, 'PRINT_DOCX_MACROS', 'Macro-enabled Word documents are not allowed. Save as a regular .docx without macros, or upload a PDF.')
  }
}
