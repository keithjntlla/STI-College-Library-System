import mysql from 'mysql2/promise';

async function seed() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Sqlpasword123',
    database: 'sti_ormoc_library',
  });

  const uiCategories = [
    'Business', 'Engineering', 'Education', 'Health Sciences', 'Arts & Humanities'
  ];

  for (const cat of uiCategories) {
    await connection.execute(
      `INSERT IGNORE INTO categories (category_name, description, shelf_location, shelf_column, shelf_row, created_at)
       VALUES (?, '', 'Shelf Z', 1, 1, NOW())`,
      [cat]
    );
  }

  const [cats] = await connection.execute('SELECT * FROM categories');
  const catMap = {};
  for (const c of cats) catMap[c.category_name] = c.category_id;

  const manualBooks = [
    { title: 'Principles of Economics', author: 'N. Gregory Mankiw', isbn: '9780073527086', cat: 'Business' },
    { title: 'Corporate Finance', author: 'Stephen Ross', isbn: '9781259253457', cat: 'Business' },
    { title: 'Mechanical Engineering Design', author: 'Richard Budynas', isbn: '9780073398068', cat: 'Engineering' },
    { title: 'Fundamentals of Engineering', author: 'John Doe', isbn: '9780073398069', cat: 'Engineering' },
    { title: 'Educational Psychology', author: 'Anita Woolfolk', isbn: '9780133281149', cat: 'Education' },
    { title: 'The Teachers Guide', author: 'Jane Smith', isbn: '9780133281150', cat: 'Education' },
    { title: 'Fundamentals of Nursing', author: 'Carol Taylor', isbn: '9781451192711', cat: 'Health Sciences' },
    { title: 'Human Anatomy', author: 'Elaine Marieb', isbn: '9781451192712', cat: 'Health Sciences' },
    { title: 'Art History', author: 'Marilyn Stokstad', isbn: '9780205244922', cat: 'Arts & Humanities' },
    { title: 'World Literature', author: 'Donna Rosenberg', isbn: '9780205244923', cat: 'Arts & Humanities' }
  ];

  for (const book of manualBooks) {
    try {
      const categoryId = catMap[book.cat];
      if (!categoryId) {
        console.log('Category missing:', book.cat);
        continue;
      }

      const [res] = await connection.execute(
        `INSERT IGNORE INTO titles (record_type, title, isbn, publication_year, publisher, call_number, category_id, lifecycle_status, created_at, cover_image_path)
         VALUES ('Book', ?, ?, 2021, 'Academic Press', ?, ?, 'Active', NOW(), NULL)`,
        [book.title, book.isbn, `CN-${book.isbn}`, categoryId]
      );
      
      const titleId = res.insertId;
      if (titleId) {
        await connection.execute(
          `INSERT INTO authors (title_id, author_name, normalized_name) VALUES (?, ?, ?)`,
          [titleId, book.author, book.author.toLowerCase()]
        );

        await connection.execute(
          `INSERT INTO physical_copies (title_id, accession_number, barcode, shelf_location, condition_status, availability_status, lifecycle_status, created_at)
           VALUES (?, ?, ?, 'Shelf Z', 'Good', 'Available', 'Active', NOW())`,
          [titleId, `AC-${book.isbn}-1`, `BC-${book.isbn}-1`]
        );
      }
      console.log(`Inserted ${book.title}`);
    } catch (err) {
      console.error('Error on', book.isbn, err);
    }
  }

  // Update existing books. Let's remap any 'Database Systems' or 'Computer Networks' to 'Computer Science' 
  // so they fall under a major category for the UI.
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

  if (catMap['Education'] && catMap['General Education']) {
    await connection.execute(`UPDATE titles SET category_id = ? WHERE category_id = ?`, [catMap['Education'], catMap['General Education']]);
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed();
