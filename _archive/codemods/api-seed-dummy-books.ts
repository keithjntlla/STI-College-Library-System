import { db } from './src/config/db.js';

async function seed() {
  console.log("Generating 50 dummy books...");
  for (let i = 1; i <= 50; i++) {
    const catId = Math.floor(Math.random() * 7) + 1;
    const year = 2000 + Math.floor(Math.random() * 24);
    
    const [result] = await db.execute(
      `INSERT INTO titles (record_type, title, normalized_title, isbn, publication_year, publisher, call_number, category_id, lifecycle_status, synopsis) 
       VALUES ('Book', 'Dummy Book Title ${i}', 'dummy book title ${i}', '978-0-${Math.floor(Math.random() * 99999)}-0', ${year}, 'Test Publisher', 'QA76.DUMMY.${i}', ${catId}, 'Active', 'This is an automatically generated synopsis for dummy book ${i}. It provides some text to test the UI layout and pagination logic across multiple pages.')`
    );
    
    const titleId = (result as any).insertId;
    
    await db.execute(
      `INSERT INTO authors (title_id, author_name, normalized_name) VALUES (?, ?, ?)`,
      [titleId, `Author Name ${i}`, `author name ${i}`]
    );

    await db.execute(
      `INSERT INTO physical_copies (title_id, barcode, accession_number, shelf_location, availability_status, lifecycle_status) 
       VALUES (?, ?, ?, ?, 'Available', 'Active')`,
      [titleId, `DUMMY-BARCODE-${titleId}-${i}`, `ACC-${titleId}-${i}`, `Shelf-${catId}`]
    );
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
