import { db } from '../src/config/db.js'
import { enrichHoldingsMetadata, resetIncompleteMetadata } from '../src/modules/catalog/holdings-metadata.ts'

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : 25
const retryMissing = process.argv.includes('--retry-missing')
let totalChecked = 0
let totalCovers = 0
let totalSynopses = 0
let failedRounds = 0

try {
  if (retryMissing) {
    const reset = await resetIncompleteMetadata(db)
    console.log(`Queued ${reset} titles that still need a real cover or a description.`)
  }

  for (;;) {
    const batch = await enrichHoldingsMetadata(db, { limit: Number.isFinite(limit) ? limit : 25, delayMs: 800 })
    totalChecked += batch.checked
    totalCovers += batch.covers
    totalSynopses += batch.synopses
    console.log(`Checked ${batch.checked} of ${batch.attempted} titles (${totalCovers} covers, ${totalSynopses} synopses so far).`)
    if (batch.attempted === 0) break
    if (batch.checked === 0) {
      failedRounds += 1
      const pauseMs = Math.min(30_000 * (2 ** (failedRounds - 1)), 180_000)
      console.log(`Every lookup in this batch failed. Waiting ${Math.round(pauseMs / 1000)}s before trying those titles again.`)
      await new Promise((resolve) => setTimeout(resolve, pauseMs))
      continue
    }
    failedRounds = 0
  }

  console.log(`Metadata lookup finished. ${totalChecked} titles checked, ${totalCovers} covers saved, ${totalSynopses} synopses saved.`)
} finally {
  await db.end?.()
}
