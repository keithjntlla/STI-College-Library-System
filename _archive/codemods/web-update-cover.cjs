const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

code = code.replace(/setBookInfo\(\{ title: result\.title, authors: result\.author \|\| '', coverUrl: null \}\);/g, "setBookInfo({ title: result.title, authors: result.author || '', coverUrl: result.coverImagePath || null });");

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
