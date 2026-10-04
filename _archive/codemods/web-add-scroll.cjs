const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace('<html lang="en">', '<html lang="en" className="scroll-smooth" style="scroll-behavior: smooth;">');

fs.writeFileSync('index.html', code);
