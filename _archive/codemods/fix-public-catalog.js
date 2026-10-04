const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', 'utf8');

// Fix interface
code = code.replace(/interface BookEntry \{[\s\S]*?\}/, `interface BookEntry {
  titleId: string;
  title: string;
  authors: string[];
  isbn: string;
  publicationYear: number;
  categoryName: string;
  coverImagePath: string | null;
  availableCopies: number;
  totalCopies: number;
  research?: { abstract?: string } | null;
}`);

// Fix the mapping logic
code = code.replace(/setBooks\(payload\.data\)/, "setBooks(payload.data.items || [])");

// Fix variable usages in map
code = code.replace(/key=\{book\.title_id\}/g, "key={book.titleId}");
code = code.replace(/book\.cover_image/g, "book.coverImagePath");
code = code.replace(/book\.category/g, "book.categoryName");
code = code.replace(/by \{book\.author\}/g, "by {book.authors?.join(', ') || 'Unknown'}");
code = code.replace(/book\.description/g, "book.research?.abstract");
code = code.replace(/book\.available_copies/g, "book.availableCopies");
code = code.replace(/book\.title_id/g, "book.titleId"); // for navigate returnTo

fs.writeFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', code);
