const fs = require('fs');
const path = require('path');
const outPath = path.join(process.cwd(), 'books-import-template.csv');

const books = [
  // Fiction (Cat 1)
  { title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "9780060935467", year: 1960, cat: 1, desc: "A novel about the serious issues of rape and racial inequality." },
  { title: "1984", author: "George Orwell", isbn: "9780451524935", year: 1949, cat: 1, desc: "A dystopian social science fiction novel and cautionary tale." },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "9780743273565", year: 1925, cat: 1, desc: "A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan." },
  { title: "Pride and Prejudice", author: "Jane Austen", isbn: "9781503290563", year: 1813, cat: 1, desc: "A romantic novel of manners." },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", isbn: "9780316769174", year: 1951, cat: 1, desc: "A novel about teenage rebellion and alienation." },
  { title: "The Hobbit", author: "J.R.R. Tolkien", isbn: "9780547928227", year: 1937, cat: 1, desc: "A children's fantasy novel." },
  { title: "Fahrenheit 451", author: "Ray Bradbury", isbn: "9781451673319", year: 1953, cat: 1, desc: "A dystopian novel about a future American society where books are outlawed." },
  { title: "Moby-Dick", author: "Herman Melville", isbn: "9781503280786", year: 1851, cat: 1, desc: "The epic tale of the voyage of the whaling ship Pequod." },
  { title: "Jane Eyre", author: "Charlotte Brontë", isbn: "9780141441146", year: 1847, cat: 1, desc: "Follows the emotions and experiences of its eponymous heroine." },
  { title: "The Lord of the Rings", author: "J.R.R. Tolkien", isbn: "9780544003415", year: 1954, cat: 1, desc: "An epic high-fantasy novel." },

  // Computer Science (Cat 2)
  { title: "Code: The Hidden Language of Computer Hardware and Software", author: "Charles Petzold", isbn: "9780735611313", year: 2000, cat: 2, desc: "A unique journey through the history of computing." },
  { title: "The Mythical Man-Month", author: "Frederick P. Brooks Jr.", isbn: "9780201835953", year: 1975, cat: 2, desc: "Essays on software engineering." },
  { title: "Structure and Interpretation of Computer Programs", author: "Harold Abelson", isbn: "9780262510875", year: 1984, cat: 2, desc: "A computer science textbook." },
  { title: "The Art of Computer Programming", author: "Donald Knuth", isbn: "9780201896831", year: 1968, cat: 2, desc: "Comprehensive monograph on programming algorithms and their analysis." },
  { title: "Cracking the Coding Interview", author: "Gayle Laakmann McDowell", isbn: "9780984782857", year: 2015, cat: 2, desc: "Programming interview questions and solutions." },
  { title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", year: 2008, cat: 2, desc: "A Handbook of Agile Software Craftsmanship." },
  { title: "Design Patterns", author: "Erich Gamma", isbn: "9780201633610", year: 1994, cat: 2, desc: "Elements of Reusable Object-Oriented Software." },
  { title: "Introduction to Algorithms", author: "Thomas H. Cormen", isbn: "9780262033848", year: 1990, cat: 2, desc: "A widely used textbook on algorithms." },
  { title: "The Pragmatic Programmer", author: "Andrew Hunt", isbn: "9780201616224", year: 1999, cat: 2, desc: "From Journeyman to Master." },
  { title: "Refactoring", author: "Martin Fowler", isbn: "9780201485677", year: 1999, cat: 2, desc: "Improving the Design of Existing Code." },

  // Business / Management (Cat 3)
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", isbn: "9780374533557", year: 2011, cat: 3, desc: "A book on behavioral psychology and decision-making." },
  { title: "Principles of Marketing", author: "Philip Kotler", isbn: "9780134492513", year: 2017, cat: 3, desc: "A comprehensive textbook on marketing." },
  { title: "Good to Great", author: "Jim Collins", isbn: "9780066620992", year: 2001, cat: 3, desc: "Why some companies make the leap and others don't." },
  { title: "Shoe Dog", author: "Phil Knight", isbn: "9781501135927", year: 2016, cat: 3, desc: "A memoir by the creator of Nike." },
  { title: "Zero to One", author: "Peter Thiel", isbn: "9780804139298", year: 2014, cat: 3, desc: "Notes on Startups, or How to Build the Future." },
  { title: "The Lean Startup", author: "Eric Ries", isbn: "9780307887894", year: 2011, cat: 3, desc: "How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses." },
  { title: "Dare to Lead", author: "Brené Brown", isbn: "9780399592522", year: 2018, cat: 3, desc: "Brave Work. Tough Conversations. Whole Hearts." },
  { title: "Atomic Habits", author: "James Clear", isbn: "9780735211292", year: 2018, cat: 3, desc: "An Easy & Proven Way to Build Good Habits & Break Bad Ones." },
  { title: "Deep Work", author: "Cal Newport", isbn: "9781455586691", year: 2016, cat: 3, desc: "Rules for Focused Success in a Distracted World." },
  { title: "Start with Why", author: "Simon Sinek", isbn: "9781591846444", year: 2009, cat: 3, desc: "How Great Leaders Inspire Everyone to Take Action." },

  // Engineering / Sciences (Cat 4)
  { title: "Fundamentals of Electric Circuits", author: "Charles K. Alexander", isbn: "9780078028229", year: 2016, cat: 4, desc: "A textbook on circuit analysis." },
  { title: "Engineering Mechanics: Dynamics", author: "J.L. Meriam", isbn: "9781118885840", year: 2015, cat: 4, desc: "A solid foundation of mechanics principles." },
  { title: "Materials Science and Engineering", author: "William D. Callister Jr.", isbn: "9781118324578", year: 2013, cat: 4, desc: "Promotes student understanding of the three primary types of materials." },
  { title: "A Brief History of Time", author: "Stephen Hawking", isbn: "9780553380163", year: 1988, cat: 4, desc: "From the Big Bang to Black Holes." },
  { title: "The Selfish Gene", author: "Richard Dawkins", isbn: "9780192860927", year: 1976, cat: 4, desc: "A book on evolution." },
  { title: "Cosmos", author: "Carl Sagan", isbn: "9780345331359", year: 1980, cat: 4, desc: "A popular science book exploring the universe." },
  { title: "Sapiens: A Brief History of Humankind", author: "Yuval Noah Harari", isbn: "9780062316097", year: 2011, cat: 4, desc: "Explores the history of our species." },
  { title: "The Origin of Species", author: "Charles Darwin", isbn: "9780451529060", year: 1859, cat: 4, desc: "The foundation of evolutionary biology." },
  { title: "Astrophysics for People in a Hurry", author: "Neil deGrasse Tyson", isbn: "9780393609394", year: 2017, cat: 4, desc: "A brief introduction to astrophysics." },
  { title: "Silent Spring", author: "Rachel Carson", isbn: "9780618249060", year: 1962, cat: 4, desc: "An environmental science book." },

  // Education & Arts (Cat 5 & 7)
  { title: "Educational Psychology", author: "Anita Woolfolk", isbn: "9780134774329", year: 2018, cat: 5, desc: "An introduction to educational psychology." },
  { title: "Democracy and Education", author: "John Dewey", isbn: "9781680922837", year: 1916, cat: 5, desc: "A philosophy of education." },
  { title: "Pedagogy of the Oppressed", author: "Paulo Freire", isbn: "9780826412768", year: 1968, cat: 5, desc: "A foundational text of critical pedagogy." },
  { title: "The Story of Art", author: "E.H. Gombrich", isbn: "9780714832470", year: 1950, cat: 7, desc: "A survey of the history of art." },
  { title: "A History of the World in 6 Glasses", author: "Tom Standage", isbn: "9780802715524", year: 2005, cat: 7, desc: "World history told through beverages." },
  { title: "Ways of Seeing", author: "John Berger", isbn: "9780140135152", year: 1972, cat: 7, desc: "A seminal text on visual culture." },
  { title: "Guns, Germs, and Steel", author: "Jared Diamond", isbn: "9780393317558", year: 1997, cat: 7, desc: "The Fates of Human Societies." },
  { title: "The Elements of Style", author: "William Strunk Jr.", isbn: "9780205309023", year: 1918, cat: 7, desc: "A prescriptive American English writing style guide." },
  { title: "On Writing: A Memoir of the Craft", author: "Stephen King", isbn: "9781439156810", year: 2000, cat: 7, desc: "A memoir and master class on the craft of writing." },
  { title: "Steal Like an Artist", author: "Austin Kleon", isbn: "9780761169253", year: 2012, cat: 7, desc: "10 Things Nobody Told You About Being Creative." }
];

function escapeCSV(str) {
  if (typeof str !== 'string') return str;
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const header = 'Title,Author,ISBN,Publication_Year,Category_ID,Quantity\n';
const rows = books.map(b => [
  escapeCSV(b.title),
  escapeCSV(b.author),
  escapeCSV(b.isbn),
  b.year,
  b.cat,
  Math.floor(Math.random() * 5) + 1 // 1 to 5 copies
].join(',')).join('\n');

fs.writeFileSync(outPath, header + rows);
console.log('Successfully wrote ' + books.length + ' real books to ' + outPath);
