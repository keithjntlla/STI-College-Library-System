import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const realBooks = [
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

function escapeCSV(str) {
  if (typeof str !== 'string') return str;
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const header = "Title,Author,ISBN,Publication_Year,Category_ID,Synopsis,Quantity\n";
const rows = realBooks.map(b => {
  const qty = Math.floor(Math.random() * 4) + 1; // Random 1-4 copies
  return [
    escapeCSV(b.title),
    escapeCSV(b.author),
    escapeCSV(b.isbn),
    b.year,
    b.cat,
    escapeCSV(b.desc),
    qty
  ].join(',');
}).join('\n');

const outPath = path.join(__dirname, '..', '..', '..', 'books-import-template.csv');
fs.writeFileSync(outPath, header + rows);

console.log(`Generated template at: ${outPath}`);
