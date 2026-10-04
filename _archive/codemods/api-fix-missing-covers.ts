import { db } from './src/config/db.js';

async function run() {
  console.log("Checking for books with missing covers...");

  const [rows] = await db.execute('SELECT title_id, title, author_name, cover_image_path FROM titles LEFT JOIN authors USING(title_id)');
  
  let fixedCount = 0;

  for (const row of (rows as any[])) {
    const { title_id, title, author_name, cover_image_path } = row;
    if (!cover_image_path) continue;

    try {
      const response = await fetch(cover_image_path, { method: 'HEAD' });
      
      if (response.status === 404) {
        console.log(`[Missing] ${title} - Attempting fallback search...`);
        
        const q = encodeURIComponent(`${title} ${author_name || ''}`.trim());
        const searchUrl = `https://openlibrary.org/search.json?q=${q}`;
        
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        
        const docsWithCover = searchData.docs?.filter((d: any) => d.cover_i);
        if (docsWithCover && docsWithCover.length > 0) {
          const coverId = docsWithCover[0].cover_i;
          const newCoverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`;
          
          await db.execute('UPDATE titles SET cover_image_path = ? WHERE title_id = ?', [newCoverUrl, title_id]);
          console.log(`  -> Fixed! New cover ID: ${coverId}`);
          fixedCount++;
        } else {
          console.log(`  -> Still missing (No cover found in search)`);
        }
      }
    } catch (e) {
      console.error(`Error processing ${title}:`, e);
    }
  }

  console.log(`Finished! Fixed ${fixedCount} covers.`);
  process.exit(0);
}

run().catch(console.error);
