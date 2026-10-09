import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { inspectPrintDocument, isDocxAutoCountAvailable } from './printing.document.ts'

const require = createRequire(import.meta.url)
const JSZip = require('jszip') as {
  new (): {
    file: (name: string, content: string) => void
    generateAsync: (options: { type: 'nodebuffer' }) => Promise<Buffer>
  }
}

async function pdf(pageCount: number) {
  const document = await PDFDocument.create()
  for (let index = 0; index < pageCount; index += 1) document.addPage()
  return Buffer.from(await document.save())
}

async function minimalDocx(options: { macros?: boolean } = {}) {
  const zip = new JSZip()
  const contentTypes = options.macros
    ? `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/>
</Types>`
    : `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  zip.file('[Content_Types].xml', contentTypes)
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>`)
  if (options.macros) zip.file('word/vbaProject.bin', 'not-real-vba')
  return zip.generateAsync({ type: 'nodebuffer' })
}

function uploaded(buffer: Buffer, name: string, mimetype: string) {
  return { buffer, originalname: name, mimetype, size: buffer.length } as Express.Multer.File
}

test('reads actual PDF pages and retains the same printable document', async () => {
  const source = uploaded(await pdf(3), 'report.pdf', 'application/pdf')
  const inspected = await inspectPrintDocument(source)
  assert.equal(inspected.pageCount, 3)
  assert.equal(inspected.printableFile, source)
  assert.match(inspected.sourceHash, /^[a-f0-9]{64}$/)
})

test('rejects a PDF with a signature but unreadable contents', async () => {
  await assert.rejects(inspectPrintDocument(uploaded(Buffer.from('%PDF-broken'), 'broken.pdf', 'application/pdf')), { code: 'PRINT_PDF_UNREADABLE' })
})

test('docx auto-count availability follows renderer URL, token, and Vercel rules', () => {
  const previousUrl = process.env.DOCX_RENDERER_URL
  const previousToken = process.env.DOCX_RENDERER_TOKEN
  const previousVercel = process.env.VERCEL
  const previousNodeEnv = process.env.NODE_ENV
  try {
    process.env.DOCX_RENDERER_URL = 'https://private-renderer.example'
    process.env.DOCX_RENDERER_TOKEN = 'secret-token'
    delete process.env.VERCEL
    process.env.NODE_ENV = 'development'
    assert.equal(isDocxAutoCountAvailable(), true)

    process.env.NODE_ENV = 'production'
    delete process.env.DOCX_RENDERER_TOKEN
    assert.equal(isDocxAutoCountAvailable(), false)

    process.env.DOCX_RENDERER_TOKEN = 'secret-token'
    assert.equal(isDocxAutoCountAvailable(), true)

    process.env.DOCX_RENDERER_URL = ''
    delete process.env.DOCX_RENDERER_TOKEN
    process.env.VERCEL = '1'
    process.env.NODE_ENV = 'development'
    assert.equal(isDocxAutoCountAvailable(), false)
  } finally {
    if (previousUrl == null) delete process.env.DOCX_RENDERER_URL
    else process.env.DOCX_RENDERER_URL = previousUrl
    if (previousToken == null) delete process.env.DOCX_RENDERER_TOKEN
    else process.env.DOCX_RENDERER_TOKEN = previousToken
    if (previousVercel == null) delete process.env.VERCEL
    else process.env.VERCEL = previousVercel
    if (previousNodeEnv == null) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
  }
})

test('counts converted DOCX pages and keeps the rendered PDF for staff', async () => {
  const rendered = await pdf(2)
  const docx = uploaded(await minimalDocx(), 'thesis.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  let called = false
  const inspected = await inspectPrintDocument(docx, {
    rendererUrl: 'https://private-renderer.example',
    rendererToken: 'test-token',
    fetchImpl: async (url, init) => {
      called = true
      assert.equal(String(url), 'https://private-renderer.example/forms/libreoffice/convert')
      assert.equal(init?.method, 'POST')
      assert.equal((init?.headers as Record<string, string> | undefined)?.Authorization, 'Bearer test-token')
      return new Response(new Uint8Array(rendered), { status: 200, headers: { 'content-type': 'application/pdf' } })
    },
  })
  assert.equal(called, true)
  assert.equal(inspected.pageCount, 2)
  assert.equal(inspected.printableName, 'thesis.pdf')
  assert.deepEqual(inspected.printableFile.buffer, rendered)
})

test('rejects macro-enabled DOCX packages before conversion', async () => {
  const docx = uploaded(await minimalDocx({ macros: true }), 'macro.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  await assert.rejects(inspectPrintDocument(docx, { rendererUrl: 'https://private-renderer.example', rendererToken: 'x' }), { code: 'PRINT_DOCX_MACROS' })
})
