import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import { parseHoldings, readHoldingsWorkbook, splitHoldingAuthors, summarizeHoldings } from './ched-holdings.ts'

test('splits two authors and keeps a generational suffix on one name', () => {
  assert.deepEqual(splitHoldingAuthors('Leo Finkelstein, Jr.'), ['Leo Finkelstein, Jr.'])
  assert.deepEqual(splitHoldingAuthors('Sarah Mason, Ailsa Petchey'), ['Sarah Mason', 'Ailsa Petchey'])
  assert.deepEqual(splitHoldingAuthors('Ana Reyes; Luis Cruz'), ['Ana Reyes', 'Luis Cruz'])
})

test('maps each holdings sheet onto categories, editions, and generated copy numbers', () => {
  const catalog = parseHoldings([
    {
      name: 'GE BOOKS',
      rows: {
        4: { B: 'Accesion #', C: 'AUTHOR', D: 'BOOK TITLE', E: 'EDITION', F: 'CPS.' },
        6: { C: 'LANGUAGE' },
        7: { A: '1', C: 'Leo Finkelstein, Jr.', D: 'Pocketbook of English Grammar', E: '2nd edition', F: '2' },
        8: { C: '2014 Acquisitions' },
        9: { A: '2', C: 'STI', D: 'Basic Writing Skills', F: '1' },
        10: { E: 'Subtotal', F: '3' },
      },
    },
    {
      name: 'SHS BOOKS',
      rows: {
        6: { A: '1', C: 'McGraw Hill', D: 'Basic Calculus', E: 'Mcgraw Hill Education', F: '2016', G: '693', H: '8' },
      },
    },
    {
      name: 'CHED HRM',
      rows: {
        8: { A: '1', C: 'Australia', D: 'Sarah Mason, Ailsa Petchey', E: 'Periplus Editions', F: '2000', H: '962-593-592-4', I: '1' },
        9: { A: '2', C: 'Country Cooking', D: 'Editor', E: 'Home Press', F: '1992', H: '1-3579-10864-2', I: '1' },
        10: { A: '3', C: 'Australia', D: 'Sarah Mason, Ailsa Petchey', E: 'Periplus Editions', F: '2000', H: '962-593-592-4', I: '2' },
      },
    },
    {
      name: 'CHED TM',
      rows: {
        8: { A: '3', C: 'Australia', D: 'Wendy Hutton', E: 'Periplus Editions', F: '2000', H: '962-593-592-4', I: '1' },
      },
    },
    {
      name: 'IT BOOKS',
      rows: {
        6: { A: '1', C: 'Joe Kraynak', D: '10 Minute Guide to Quattro Pro 4', E: '2nd edition', F: '1992', G: 'SAMS', H: '2' },
        7: { C: 'Prepared by:', E: 'Certified True and correct:' },
      },
    },
  ])

  const grammar = catalog.titles.find((title) => title.title.startsWith('Pocketbook'))
  assert.equal(grammar?.title, 'Pocketbook of English Grammar (2nd edition)')
  assert.deepEqual(grammar?.authors, ['Leo Finkelstein, Jr.'])
  assert.deepEqual(grammar?.accessions, ['GE-0007-1', 'GE-0007-2'])
  assert.equal(grammar?.categoryName, 'LANGUAGE')
  assert.deepEqual(grammar?.programNames, ['General Education'])

  const writing = catalog.titles.find((title) => title.title === 'Basic Writing Skills')
  assert.equal(writing?.categoryName, 'General Education')
  assert.deepEqual(writing?.accessions, ['GE-0009-1'])

  const calculus = catalog.titles.find((title) => title.title === 'Basic Calculus')
  assert.equal(calculus?.publicationYear, 2016)
  assert.equal(calculus?.publisher, 'Mcgraw Hill Education')
  assert.equal(calculus?.accessions.length, 8)
  assert.equal(calculus?.categoryName, 'Senior High School')
  assert.ok(calculus?.programNames.includes('STEM'))

  const australia = catalog.titles.find((title) => title.sheetCode === 'HRM' && title.title === 'Australia')
  assert.equal(australia?.isbn, '9625935924')
  assert.deepEqual(australia?.authors, ['Sarah Mason', 'Ailsa Petchey'])
  assert.deepEqual(australia?.accessions, ['HRM-0008-1', 'HRM-0010-1', 'HRM-0010-2'])

  const cooking = catalog.titles.find((title) => title.title === 'Country Cooking')
  assert.equal(cooking?.isbn, null)
  assert.ok(catalog.isbnIssues.some((issue) => issue.title === 'Country Cooking'))

  const tourism = catalog.titles.find((title) => title.sheetCode === 'TM')
  assert.equal(tourism?.isbn, null)
  assert.equal(tourism?.categoryName, 'Tourism Management')
  assert.ok(catalog.isbnIssues.some((issue) => issue.reason.includes('already used')))

  const quattro = catalog.titles.find((title) => title.sheetCode === 'IT')
  assert.equal(quattro?.title, '10 Minute Guide to Quattro Pro 4 (2nd edition)')
  assert.equal(quattro?.publisher, 'SAMS')
  assert.deepEqual(quattro?.accessions, ['IT-0006-1', 'IT-0006-2'])

  assert.ok(catalog.categories.some((category) => category.name === 'LANGUAGE' && category.shelfLocation === 'GE'))
  assert.ok(catalog.skipped.some((row) => row.reason === 'Totals or signature row.'))
  const summary = summarizeHoldings(catalog)
  assert.equal(summary.titles, catalog.titles.length)
  assert.equal(summary.copies, catalog.titles.reduce((total, title) => total + title.accessions.length, 0))
})

test('reads an inline-string workbook with one row from each tab', async () => {
  const catalog = await readHoldingsWorkbook(await workbookBuffer([
    ['GE BOOKS', [['', '', 'LANGUAGE'], ['1', '', 'STI', 'College English', '', '1']]],
    ['SHS BOOKS', [['1', '', 'Author', 'Biology', 'Press', '2016', '100', '2']]],
    ['CHED HRM', [['1', '', 'Soup', 'Cook', 'Press', '2001', '80', '0-89586-782-6', '1']]],
    ['CHED TM', [['1', '', 'Rail', 'Guide', 'Press', '1988', '90', '', '1']]],
    ['IT BOOKS', [['1', '', 'Author', 'DOS Guide', '-', '1991', 'SAMS', '3']]],
  ]))
  assert.deepEqual(catalog.titles.map((title) => title.sheetCode), ['GE', 'SHS', 'HRM', 'TM', 'IT'])
  assert.equal(catalog.titles[0].categoryName, 'LANGUAGE')
  assert.equal(catalog.titles[0].accessions[0], 'GE-0002-1')
  assert.equal(catalog.titles[2].isbn, '0895867826')
  assert.equal(catalog.titles[4].accessions.length, 3)
})

async function workbookBuffer(sheets: Array<[string, string[][]]>) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    </Types>`)
  const overrides = sheets.map((_, index) => (
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )).join('')
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${overrides}
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    </Types>`)
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?>
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets>${sheets.map(([name], index) => `<sheet name="${name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets>
    </workbook>`)
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}
    </Relationships>`)
  sheets.forEach(([, rows], index) => {
    const cells = rows.flatMap((row, rowIndex) => row.flatMap((value, columnIndex) => {
      if (!value) return []
      const ref = `${columnLetter(columnIndex)}${rowIndex + 1}`
      return [`<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`]
    }))
    zip.file(`xl/worksheets/sheet${index + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${cells.join('')}</row></sheetData></worksheet>`)
  })
  return zip.generateAsync({ type: 'nodebuffer' })
}

function columnLetter(index: number) {
  return String.fromCharCode(65 + index)
}
