import { db } from './src/config/db.js';

async function updateCovers() {
  console.log("Updating cover images to use ?default=false...");
  
  const [rows] = await db.execute('SELECT title_id, cover_image_path FROM titles WHERE cover_image_path LIKE "https://covers.openlibrary.org%"');
  
  for (const row of (rows as any[])) {
    let url = row.cover_image_path;
    if (!url.includes('default=false')) {
      url = url + (url.includes('?') ? '&' : '?') + 'default=false';
      await db.execute('UPDATE titles SET cover_image_path = ? WHERE title_id = ?', [url, row.title_id]);
    }
  }

  console.log("Covers updated!");
  process.exit(0);
}

updateCovers().catch(err => {
  console.error(err);
  process.exit(1);
});
