const fs = require('fs');

function fixImg(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // For PublicCatalog.tsx
  code = code.replace(
    /<img src=\{book\.coverImagePath\} alt=\{book\.title\} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" \/>/g,
    `<img src={book.coverImagePath} alt={book.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = \`https://placehold.co/400x600/f4f4f5/a1a1aa?text=\${encodeURIComponent(book.title)}\`; }} />`
  );

  // For PublicBookDetailModal.tsx
  code = code.replace(
    /<img src=\{book\.coverImagePath\} alt=\{book\.title\} className="w-full h-full object-cover" \/>/g,
    `<img src={book.coverImagePath} alt={book.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = \`https://placehold.co/400x600/f4f4f5/a1a1aa?text=\${encodeURIComponent(book.title)}\`; }} />`
  );
  
  fs.writeFileSync(file, code);
}

fixImg('src/features/catalog/PublicCatalog.tsx');
fixImg('src/features/catalog/PublicBookDetailModal.tsx');
