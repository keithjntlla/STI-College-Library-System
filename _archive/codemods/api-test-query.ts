import { db } from './src/config/db.ts'
async function run() {
  const [rows] = await db.execute('SELECT * FROM physical_copies WHERE barcode = ?', ['BC-IMP-145-1-668548'])
  console.log(rows)
  process.exit(0)
}
run()
