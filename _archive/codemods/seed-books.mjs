import fs from 'fs'
import path from 'path'
import { db } from './apps/api/src/config/db.js'
import crypto from 'crypto'
import https from 'https'

const BOOKS = [
  {
    title: 'The Pragmatic Programmer: Your Journey To Mastery',
    authors: ['David Thomas', 'Andrew Hunt'],
    isbn: '9780135957059',
    publication_year: 2019,
    publisher: 'Addison-Wesley Professional',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg',
    categoryName: 'Information Technology'
  },
  {
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    authors: ['Robert C. Martin'],
    isbn: '9780132350884',
    publication_year: 2008,
    publisher: 'Prentice Hall',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
    categoryName: 'Computer Science'
  },
  {
    title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
    authors: ['Erich Gamma', 'Richard Helm', 'Ralph Johnson', 'John Vlissides'],
    isbn: '9780201633610',
    publication_year: 1994,
    publisher: 'Addison-Wesley',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg',
    categoryName: 'Computer Science'
  },
  {
    title: 'The Lean Startup',
    authors: ['Eric Ries'],
    isbn: '9780307887894',
    publication_year: 2011,
    publisher: 'Crown Business',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg',
    categoryName: 'Business'
  },
  {
    title: 'Dune',
    authors: ['Frank Herbert'],
    isbn: '9780441172719',
    publication_year: 1965,
    publisher: 'Chilton Books',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg',
    categoryName: 'Fiction'
  }
];

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log('Starting seed...');
  
  // Create cover directory if not exists
  const coverDir = path.join('apps', 'web', 'public', 'covers');
  if (!fs.existsSync(coverDir)) {
    fs.mkdirSync(coverDir, { recursive: true });
  }

  // Get categories
  const [categories] = await db.query("SELECT category_id, category_name FROM categories");
  const getCategory = (name) => categories.find(c => c.category_name.toLowerCase() === name.toLowerCase())?.category_id || categories[0].category_id;

  for (const book of BOOKS) {
    console.log(`Processing ${book.title}...`);
    
    // Download cover
    const coverFile = `${book.isbn}.jpg`;
    const coverDest = path.join(coverDir, coverFile);
    await downloadImage(book.cover_url, coverDest);
    
    const catId = getCategory(book.categoryName);
    
    // Insert Title
    const callNumber = `${book.categoryName.substring(0,2).toUpperCase()}-${book.publication_year}-${Math.floor(Math.random() * 1000)}`;
    
    let titleId;
    const [result] = await db.execute(
      `INSERT IGNORE INTO titles (record_type, title, normalized_title, isbn, publication_year, publisher, call_number, category_id, cover_image_path)
       VALUES ('Book', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [book.title, book.title.toLowerCase(), book.isbn, book.publication_year, book.publisher, callNumber, catId, `/covers/${coverFile}`]
    );
    
    if (result.insertId) {
      titleId = result.insertId;
    } else {
      const [existing] = await db.execute('SELECT title_id FROM titles WHERE isbn = ?', [book.isbn]);
      if (existing.length) titleId = existing[0].title_id;
    }

    if (!titleId) continue;

    // Insert Authors
    let authorOrder = 1;
    for (const author of book.authors) {
      await db.execute(
        `INSERT IGNORE INTO authors (title_id, author_name, normalized_name, author_order) VALUES (?, ?, ?, ?)`,
        [titleId, author, author.toLowerCase(), authorOrder++]
      );
    }

    // Insert Physical Copies
    for (let i = 0; i < 3; i++) {
      const barcode = `BC-${book.isbn}-${i+1}`;
      await db.execute(
        `INSERT IGNORE INTO physical_copies (title_id, barcode, condition_status, availability_status, lifecycle_status, shelf_location)
         VALUES (?, ?, 'Good', 'Available', 'Active', 'Shelf A')`,
        [titleId, barcode]
      );
    }
  }

  console.log('Seed complete!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
