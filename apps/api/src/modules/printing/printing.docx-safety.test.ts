import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { assertSafeDocxPackage } from './printing.docx-safety.ts'

const require = createRequire(import.meta.url)
const JSZip = require('jszip') as {
  new (): {
    file: (name: string, content: string) => void
    generateAsync: (options: { type: 'nodebuffer' }) => Promise<Buffer>
  }
}

async function packageWith(files: Record<string, string>) {
  const zip = new JSZip()
  for (const [name, content] of Object.entries(files)) zip.file(name, content)
  return zip.generateAsync({ type: 'nodebuffer' })
}

test('accepts a minimal non-macro DOCX package', async () => {
  const buffer = await packageWith({
    '[Content_Types].xml': `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    'word/document.xml': '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
  })
  await assert.doesNotReject(() => assertSafeDocxPackage(buffer))
})

test('rejects packages that declare macro-enabled content types', async () => {
  const buffer = await packageWith({
    '[Content_Types].xml': `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>`,
    'word/document.xml': '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
  })
  await assert.rejects(() => assertSafeDocxPackage(buffer), { code: 'PRINT_DOCX_MACROS' })
})

test('rejects packages that include a vbaProject part', async () => {
  const buffer = await packageWith({
    '[Content_Types].xml': `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    'word/document.xml': '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
    'word/vbaProject.bin': 'x',
  })
  await assert.rejects(() => assertSafeDocxPackage(buffer), { code: 'PRINT_DOCX_MACROS' })
})
