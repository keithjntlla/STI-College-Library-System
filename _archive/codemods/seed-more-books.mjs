import mysql from 'mysql2/promise';

async function seed() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Sqlpasword123',
    database: 'sti_ormoc_library',
  });

  // 1. Insert missing UI categories
  const uiCategories = [
    'Business',
    'Engineering',
    'Education',
    'Health Sciences',
    'Arts & Humanities'
  ];

  for (const cat of uiCategories) {
    await connection.execute(
      `INSERT IGNORE INTO categories (category_name, description, shelf_location, shelf_column, shelf_row, created_at)
       VALUES (?, '', 'Shelf Z', 1, 1, NOW())`,
      [cat]
    );
  }

  // 2. Fetch all categories so we have their IDs
  const [cats] = await connection.execute('SELECT * FROM categories');
  const catMap = {};
  for (const c of cats) catMap[c.category_name] = c.category_id;

  // Re-map some old books to the general 'Computer Science' if they were too specific and not showing in UI
  // The user asked to "add the respective categories to the current exisiting books"
  // Let's just update all books that are in Software Eng, DB systems, Computer Networks, IS&M to 'Computer Science'
  await connection.execute(`
    UPDATE titles 
    SET category_id = ? 
    WHERE category_id IN (?, ?, ?, ?)
  `, [
    catMap['Computer Science'],
    catMap['Software Engineering'],
    catMap['Database Systems'],
    catMap['Computer Networks'],
    catMap['Information Systems & Management']
  ]);
  
  // Re-map 'General Education' to 'Education'
  if (catMap['Education'] && catMap['General Education']) {
    await connection.execute(`UPDATE titles SET category_id = ? WHERE category_id = ?`, [catMap['Education'], catMap['General Education']]);
  }

  // 3. Add new books for the missing categories
  const newBooks = [
    { isbn: '9780073527086', cat: 'Business' }, // Principles of Economics
    { isbn: '9781259253457', cat: 'Business' }, // Corporate Finance
    { isbn: '9780073398068', cat: 'Engineering' }, // Mechanical Engineering Design
    { isbn: '9780133281149', cat: 'Education' }, // Educational Psychology
    { isbn: '9781451192711', cat: 'Health Sciences' }, // Fundamentals of Nursing
    { isbn: '9780205244922', cat: 'Arts & Humanities' } // Art History
  ];

  for (const book of newBooks) {
    try {
      console.log(`Fetching ${book.isbn}...`);
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${book.isbn}&format=json&jscmd=data`);
      const data = await response.json();
      const bookData = data[`ISBN:${book.isbn}`];

      if (!bookData) {
        console.log(`Could not find ${book.isbn}`);
        continue;
      }

      const title = bookData.title;
      const authors = bookData.authors ? bookData.authors.map(a => a.name) : ['Unknown'];
      const year = bookData.publish_date ? parseInt(bookData.publish_date.slice(-4)) : 2020;
      const publisher = bookData.publishers ? bookData.publishers[0].name : 'Unknown';
      const categoryId = catMap[book.cat];

      const [res] = await connection.execute(
        `INSERT INTO titles (record_type, title, isbn, publication_year, publisher, call_number, category_id, lifecycle_status, created_at, cover_image_path)
         VALUES ('Book', ?, ?, ?, ?, ?, ?, 'Active', NOW(), ?)`,
        [title, book.isbn, year, publisher, `CN-${book.isbn}`, categoryId, `/covers/${book.isbn}.jpg`]
      );
      const titleId = res.insertId;

      for (const author of authors) {
        await connection.execute(
          `INSERT INTO authors (title_id, author_name, normalized_name) VALUES (?, ?, ?)`,
          [titleId, author, author.toLowerCase()]
        );
      }

      await connection.execute(
        `INSERT INTO physical_copies (title_id, accession_number, barcode, shelf_location, condition_status, availability_status, lifecycle_status, created_at)
         VALUES (?, ?, ?, ?, 'Good', 'Available', 'Active', NOW())`,
        [titleId, `AC-${book.isbn}-1`, `BC-${book.isbn}-1`, 'Shelf Z']
      );
      
      // Attempt to download cover
      if (bookData.cover && bookData.cover.large) {
        const coverRes = await fetch(bookData.cover.large);
        const buffer = await coverRes.arrayBuffer();
        const fs = require('fs');
        fs.writeFileSync(`apps/web/public/covers/${book.isbn}.jpg`, Buffer.from(buffer));
        console.log(`Downloaded cover for ${title}`);
      }
      
    } catch (err) {
      console.error('Error on', book.isbn, err);
    }
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed();
