const fs = require('fs');
let code = fs.readFileSync('seed-books-10.mjs', 'utf8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync('seed-books-10.mjs', code);
