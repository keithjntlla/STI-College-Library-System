import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { db } from '../src/config/db.js'
import { applyChedHoldings, HoldingsImportError } from '../src/modules/catalog/ched-holdings-import.ts'
import { readHoldingsWorkbook, summarizeHoldings } from '../src/modules/catalog/ched-holdings.ts'

const workbookPath = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : fileURLToPath(new URL('../../../../LIBRARY-HOLDINGS-CHED-FINAL.xlsx', import.meta.url))
const apply = process.argv.includes('--apply')

try {
  const catalog = await readHoldingsWorkbook(await readFile(workbookPath))
  const summary = summarizeHoldings(catalog)
  console.log(`Holdings file: ${workbookPath}`)
  console.log(`Titles ${summary.titles}, copies ${summary.copies}, categories ${summary.categories}`)
  for (const [sheet, counts] of summary.bySheet) console.log(`  ${sheet}: ${counts.titles} titles, ${counts.copies} copies`)
  console.log(`Skipped rows ${summary.skipped}, ISBN notes ${summary.isbnIssues}`)
  for (const issue of catalog.isbnIssues.slice(0, 15)) console.log(`  ${issue.sheet} row ${issue.row}: ${issue.reason}`)
  if (catalog.isbnIssues.length > 15) console.log(`  … ${catalog.isbnIssues.length - 15} more ISBN notes`)

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to replace the current book catalog.')
  } else {
    const result = await applyChedHoldings(db, catalog)
    console.log(`Replaced the book catalog with ${result.titles} titles, ${result.copies} copies, and ${result.categories} categories.`)
    console.log('Next: npm run holdings:enrich')
  }
} catch (error) {
  console.error(error instanceof HoldingsImportError ? error.message : error)
  process.exitCode = 1
} finally {
  await db.end?.()
}
