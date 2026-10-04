import { db } from './src/config/db.js';

async function updateCovers() {
  console.log("Updating cover images using OpenLibrary API...");
  
  // We fetch all books
  const [rows] = await db.execute('SELECT title_id, isbn FROM titles');
  
  for (const row of (rows as any[])) {
    if (!row.isbn) continue;
    
    // Clean ISBN (remove hyphens)
    const cleanIsbn = row.isbn.replace(/-/g, '');
    
    // OpenLibrary Cover URL format: https://covers.openlibrary.org/b/isbn/9780385533225-L.jpg
    const coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
    
    await db.execute('UPDATE titles SET cover_image_path = ? WHERE title_id = ?', [coverUrl, row.title_id]);
  }

  console.log("Covers updated!");
  process.exit(0);
}

updateCovers().catch(err => {
  console.error(err);
  process.exit(1);
});
