const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

// Fix catalog search call 1
const search1 = "await catalogApi.search({ q: accession, page: 1, limit: 1, status: '', author: '', publicationYear: '', availability: '' });";
const newSearch1 = "await catalogApi.search({ q: accession, page: 1, limit: 1, scope: 'all', categoryId: '', author: '', publicationYear: '', availability: '' });";
code = code.replace(search1, newSearch1);

// Fix assignment 1
const assign1 = "setBookInfo({ title: b.title, authors: b.authors ?? '', coverUrl: null });";
const newAssign1 = "setBookInfo({ title: b.title, authors: b.authors?.join(', ') ?? '', coverUrl: b.coverImagePath });";
code = code.replace(assign1, newAssign1);

// Remove the physicalCopies block
const physicalBlock = /if \(b\.physicalCopies\?\.\[0\]\?\.id\) \{[\s\S]*?\}/;
code = code.replace(physicalBlock, '');

// Fix catalog search call 2
const search2 = "await catalogApi.search({ q: data, page: 1, limit: 1, status: '', author: '', publicationYear: '', availability: '' });";
const newSearch2 = "await catalogApi.search({ q: data, page: 1, limit: 1, scope: 'all', categoryId: '', author: '', publicationYear: '', availability: '' });";
code = code.replace(search2, newSearch2);

// Fix assignment 2
const assign2 = "setBookInfo({ title: result.items[0].title, authors: result.items[0].authors ?? '', coverUrl: null });";
const newAssign2 = "setBookInfo({ title: result.items[0].title, authors: result.items[0].authors?.join(', ') ?? '', coverUrl: result.items[0].coverImagePath });";
code = code.replace(assign2, newAssign2);

// Fix the JSX typo at the end of the form
const jsxFix = /\{\/\* Book Profile Card \*\/\}[\s\S]*?<\/div>\s*<\/div>/;
// Wait, the previous replacement worked. Let's just write this to file.

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
