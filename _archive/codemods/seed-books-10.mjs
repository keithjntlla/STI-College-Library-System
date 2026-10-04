import fs from 'fs'
import path from 'path'
import { db } from './apps/api/src/config/db.js'
import { pipeline } from 'stream/promises';

const BOOKS = [
  {
    title: 'To Kill a Mockingbird',
    authors: ['Harper Lee'],
    isbn: '9780060935467',
    publication_year: 1960,
    publisher: 'J. B. Lippincott & Co.',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780060935467-L.jpg',
    categoryName: 'Fiction'
  },
  {
    title: '1984',
    authors: ['George Orwell'],
    isbn: '9780451524935',
    publication_year: 1949,
    publisher: 'Secker & Warburg',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg',
    categoryName: 'Fiction'
  },
  {
    title: 'The Great Gatsby',
    authors: ['F. Scott Fitzgerald'],
    isbn: '9780743273565',
    publication_year: 1925,
    publisher: "Charles Scribner's Sons",
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg',
    categoryName: 'Fiction'
  },
  {
    title: 'Thinking, Fast and Slow',
    authors: ['Daniel Kahneman'],
    isbn: '9780374533557',
    publication_year: 2011,
    publisher: 'Farrar, Straus and Giroux',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',
    categoryName: 'Business'
  },
  {
    title: 'Sapiens: A Brief History of Humankind',
    authors: ['Yuval Noah Harari'],
    isbn: '9780062316097',
    publication_year: 2011,
    publisher: 'Harper',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg',
    categoryName: 'Education'
  },
  {
    title: 'Introduction to Algorithms',
    authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
    isbn: '9780262033848',
    publication_year: 2009,
    publisher: 'MIT Press',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg',
    categoryName: 'Computer Science'
  },
  {
    title: "Gray's Anatomy",
    authors: ['Henry Gray'],
    isbn: '9780702077050',
    publication_year: 2020,
    publisher: 'Elsevier',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780702077050-L.jpg',
    categoryName: 'Health Sciences'
  },
  {
    title: 'The Art of Electronics',
    authors: ['Paul Horowitz', 'Winfield Hill'],
    isbn: '9780521809269',
    publication_year: 2015,
    publisher: 'Cambridge University Press',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780521809269-L.jpg',
    categoryName: 'Engineering'
  },
  {
    title: 'Principles of Economics',
    authors: ['N. Gregory Mankiw'],
    isbn: '9781305585126',
    publication_year: 2017,
    publisher: 'Cengage Learning',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9781305585126-L.jpg',
    categoryName: 'Business'
  },
  {
    title: 'Artificial Intelligence: A Modern Approach',
    authors: ['Stuart Russell', 'Peter Norvig'],
    isbn: '9780134610993',
    publication_year: 2020,
    publisher: 'Pearson',
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780134610993-L.jpg',
    categoryName: 'Information Technology'
  }
];

async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`unexpected response ${res.statusText}`);
  const fileStream = fs.createWriteStream(dest);
  await pipeline(res.body, fileStream);
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
    try {
      await downloadImage(book.cover_url, coverDest);
    } catch(e) {
      console.log('Failed to download image for', book.title, e);
    }
    
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
