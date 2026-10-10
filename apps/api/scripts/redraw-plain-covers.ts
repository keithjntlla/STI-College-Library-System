import { db } from '../src/config/db.js'
import { redrawPlainCovers } from '../src/modules/catalog/holdings-metadata.ts'

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : 40
let updated = 0

try {
  for (;;) {
    const batch = await redrawPlainCovers(db, { limit: Number.isFinite(limit) ? limit : 40 })
    updated += batch.updated
    console.log(`Redrew ${batch.updated} of ${batch.attempted} plain covers (${updated} so far).`)
    if (batch.attempted === 0) break
  }
  console.log(`Plain cover redraw finished. ${updated} covers now use the blue plate.`)
} finally {
  await db.end?.()
}
