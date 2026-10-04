import { db } from './src/config/db.js';

const realBooks = [
  { title: "Clean Code", author: "Robert C. Martin", cat: 2, isbn: "978-0132350884", year: 2008, desc: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees." },
  { title: "Design Patterns", author: "Erich Gamma", cat: 2, isbn: "978-0201633610", year: 1994, desc: "Capturing a wealth of experience about the design of object-oriented software." },
  { title: "Introduction to Algorithms", author: "Thomas H. Cormen", cat: 2, isbn: "978-0262033848", year: 2009, desc: "The latest edition of the essential text and professional reference, with substantial new material on such topics as vEB trees, multithreaded algorithms, dynamic programming, and edge-based flow." },
  { title: "The Pragmatic Programmer", author: "Andrew Hunt", cat: 2, isbn: "978-0201616224", year: 1999, desc: "Straight from the programming trenches, The Pragmatic Programmer cuts through the increasing specialization and technicalities of modern software development to examine the core process--taking a requirement and producing working, maintainable code that delights its users." },
  { title: "Database System Concepts", author: "Abraham Silberschatz", cat: 2, isbn: "978-0073523323", year: 2010, desc: "Database System Concepts by Silberschatz, Korth and Sudarshan is now in its 6th edition and is one of the cornerstone texts of database education." },
  { title: "Computer Networks", author: "Andrew S. Tanenbaum", cat: 2, isbn: "978-0132126953", year: 2010, desc: "Appropriate for Computer Networking or Introduction to Networking courses at both the undergraduate and graduate level in Computer Science, Electrical Engineering, CIS, MIS, and Business Departments." },
  { title: "Artificial Intelligence: A Modern Approach", author: "Stuart Russell", cat: 2, isbn: "978-0136042594", year: 2009, desc: "The long-anticipated revision of Artificial Intelligence: A Modern Approach explores the full breadth and depth of the field of artificial intelligence (AI)." },
  { title: "Business Adventures", author: "John Brooks", cat: 3, isbn: "978-1497644892", year: 2014, desc: "Twelve Classic Tales from the World of Wall Street. What do the $350 million Ford Motor Company disaster known as the Edsel, the fast and incredible rise of Xerox, and the unbelievable scandals at General Electric and Texas Gulf Sulphur have in common? Each is an example of how an iconic company was defined by a particular moment of fame or notoriety." },
  { title: "The Innovator's Dilemma", author: "Clayton M. Christensen", cat: 3, isbn: "978-1633691780", year: 2015, desc: "The Innovator's Dilemma is the revolutionary business book that has forever changed corporate America. Based on a truly radical idea—that great companies can fail precisely because they do everything right—this Wall Street Journal, Businessweek, and New York Times Business bestseller is one of the most provocative and important business books ever written." },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", cat: 3, isbn: "978-0374533557", year: 2013, desc: "The phenomenal New York Times Bestseller by Nobel Prize-winner Daniel Kahneman, Thinking, Fast and Slow offers a whole new look at the way our minds work, and how we make decisions." },
  { title: "Principles of Marketing", author: "Philip Kotler", cat: 3, isbn: "978-0134492513", year: 2017, desc: "For Principles of Marketing courses that require a comprehensive text. Help students learn how to create value through customer connections and engagement." },
  { title: "Fundamentals of Electric Circuits", author: "Charles K. Alexander", cat: 4, isbn: "978-0078028229", year: 2016, desc: "Fundamentals of Electric Circuits continues in the spirit of its successful previous editions, with the objective of presenting circuit analysis in a manner that is clearer, more interesting, and easier to understand than other, more traditional texts." },
  { title: "Engineering Mechanics: Dynamics", author: "J.L. Meriam", cat: 4, isbn: "978-1118885840", year: 2015, desc: "Known for its accuracy, clarity, and dependability, Meriam, Kraige, and Bolton's Engineering Mechanics: Dynamics 8th Edition has provided a solid foundation of mechanics principles for more than 60 years." },
  { title: "Materials Science and Engineering", author: "William D. Callister Jr.", cat: 4, isbn: "978-1118324578", year: 2013, desc: "Building on the extraordinary success of eight best-selling editions, Callister's new Ninth Edition of Materials Science and Engineering continues to promote student understanding of the three primary types of materials." },
  { title: "Human Anatomy & Physiology", author: "Elaine N. Marieb", cat: 6, isbn: "978-0134580999", year: 2018, desc: "For the two-semester A&P course. Equipping learners with 21st-century skills to succeed in A&P and beyond." },
  { title: "Gray's Anatomy for Students", author: "Richard Drake", cat: 6, isbn: "978-0323393041", year: 2019, desc: "Easy to read, superbly illustrated, and clinically relevant, Gray's Anatomy for Students, 4th Edition, is medical students' go-to text for essential information in human anatomy." },
  { title: "A History of the World in 6 Glasses", author: "Tom Standage", cat: 7, isbn: "978-0802715524", year: 2006, desc: "Tom Standage starts with a bold hypothesis—that each epoch, from the Stone Age to the present, has had its signature beverage—and takes readers on an extraordinary trip through world history." },
  { title: "The Story of Art", author: "E.H. Gombrich", cat: 7, isbn: "978-0714832470", year: 1995, desc: "The Story of Art, one of the most famous and popular books on art ever written, has been a world bestseller for over four decades." },
  { title: "Educational Psychology", author: "Anita Woolfolk", cat: 5, isbn: "978-0134774329", year: 2018, desc: "The 14th Edition of this foundational text continues to offer the most current research and comprehensive, engaging, and readable introduction to educational psychology." },
  { title: "Democracy and Education", author: "John Dewey", cat: 5, isbn: "978-1680922837", year: 1916, desc: "In Democracy and Education, Dewey argues that the primary ineluctable facts of the birth and death of each one of the constituent members in a social group determine the necessity of education." },
  { title: "Code: The Hidden Language of Computer Hardware and Software", author: "Charles Petzold", cat: 2, isbn: "978-0735611313", year: 2000, desc: "What do flashlights, the British invasion, black cats, and seesaws have to do with computers? In CODE, they show us the ingenious ways we manipulate language and invent new means of communicating with each other." },
  { title: "The Mythical Man-Month", author: "Frederick P. Brooks Jr.", cat: 2, isbn: "978-0201835953", year: 1995, desc: "Few books on software project management have been as influential and timeless as The Mythical Man-Month." },
  { title: "Structure and Interpretation of Computer Programs", author: "Harold Abelson", cat: 2, isbn: "978-0262510875", year: 1996, desc: "Structure and Interpretation of Computer Programs has had a dramatic impact on computer science curricula over the past decade." },
  { title: "The Art of Computer Programming, Vol. 1", author: "Donald E. Knuth", cat: 2, isbn: "978-0201896831", year: 1997, desc: "The bible of all fundamental algorithms and the work that taught many of today’s software developers most of what they know about computer programming." },
  { title: "Cracking the Coding Interview", author: "Gayle Laakmann McDowell", cat: 2, isbn: "978-0984782857", year: 2015, desc: "189 programming interview questions, ranging from the basics to the trickiest algorithm problems." },
  { title: "Good to Great", author: "Jim Collins", cat: 3, isbn: "978-0066620992", year: 2001, desc: "Why Some Companies Make the Leap...And Others Don't. How can good companies, mediocre companies, even bad companies achieve enduring greatness?" },
  { title: "Shoe Dog", author: "Phil Knight", cat: 3, isbn: "978-1501135927", year: 2016, desc: "In this candid and riveting memoir, for the first time ever, Nike founder and board chairman Phil Knight shares the inside story of the company’s early days." },
  { title: "Zero to One", author: "Peter Thiel", cat: 3, isbn: "978-0804139298", year: 2014, desc: "The great secret of our time is that there are still uncharted frontiers to explore and new inventions to create. In Zero to One, legendary entrepreneur and investor Peter Thiel shows how we can find singular ways to create those new things." }
];

async function run() {
  console.log("Cleaning up dummy books...");
  await db.execute(`DELETE FROM physical_copies WHERE title_id IN (SELECT title_id FROM titles WHERE title LIKE 'Dummy Book Title%')`);
  await db.execute(`DELETE FROM authors WHERE title_id IN (SELECT title_id FROM titles WHERE title LIKE 'Dummy Book Title%')`);
  await db.execute(`DELETE FROM titles WHERE title LIKE 'Dummy Book Title%'`);

  console.log("Seeding real mock books...");
  for (let i = 0; i < realBooks.length; i++) {
    const book = realBooks[i];
    const catId = book.cat;
    
    // Check if exists
    const [existing] = await db.execute('SELECT title_id FROM titles WHERE isbn = ?', [book.isbn]);
    if ((existing as any).length > 0) continue;

    const [result] = await db.execute(
      `INSERT INTO titles (record_type, title, normalized_title, isbn, publication_year, publisher, call_number, category_id, lifecycle_status, synopsis) 
       VALUES ('Book', ?, ?, ?, ?, 'Academic Press', ?, ?, 'Active', ?)`,
       [book.title, book.title.toLowerCase(), book.isbn, book.year, `QA76.M${i+100}`, catId, book.desc]
    );
    
    const titleId = (result as any).insertId;
    
    await db.execute(
      `INSERT INTO authors (title_id, author_name, normalized_name) VALUES (?, ?, ?)`,
      [titleId, book.author, book.author.toLowerCase()]
    );

    const copies = Math.floor(Math.random() * 4) + 1;
    for (let c = 1; c <= copies; c++) {
      const barcode = `BC-${titleId}-${c}`;
      
      const [matResult] = await db.execute(
        `INSERT INTO materials (material_type, title, author, barcode, shelf_location, category_id) VALUES ('Book', ?, ?, ?, ?, ?)`,
        [book.title, book.author, barcode, `Shelf-${catId}`, catId]
      );
      const materialId = (matResult as any).insertId;

      await db.execute(
        `INSERT INTO physical_copies (title_id, material_id, barcode, accession_number, shelf_location, availability_status, lifecycle_status) 
         VALUES (?, ?, ?, ?, ?, 'Available', 'Active')`,
        [titleId, materialId, barcode, `ACC-${titleId}-${c}`, `Shelf-${catId}`]
      );
    }
  }

  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
