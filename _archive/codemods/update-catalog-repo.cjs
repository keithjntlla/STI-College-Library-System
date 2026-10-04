const fs = require('fs');
const file = 'apps/api/src/modules/catalog/catalog-search.repository.ts';
let code = fs.readFileSync(file, 'utf8');

// Add t.synopsis to the SELECT fields
code = code.replace(
  't.title_id, t.record_type, t.title, t.cover_image_path, t.isbn, t.publication_year,',
  't.title_id, t.record_type, t.title, t.cover_image_path, t.isbn, t.publication_year, t.synopsis,'
);

// Add t.synopsis to GROUP BY
code = code.replace(
  'GROUP BY t.title_id, t.record_type, t.title, t.cover_image_path, t.isbn, t.publication_year,',
  'GROUP BY t.title_id, t.record_type, t.title, t.cover_image_path, t.isbn, t.publication_year, t.synopsis,'
);

// Add synopsis mapping to `toCatalogItem`
const toCatalogItemStart = 'coverImagePath: row.cover_image_path ? String(row.cover_image_path) : null,';
const toCatalogItemEnd = 'coverImagePath: row.cover_image_path ? String(row.cover_image_path) : null,\n    synopsis: row.synopsis ? String(row.synopsis) : null,';
code = code.replace(toCatalogItemStart, toCatalogItemEnd);

fs.writeFileSync(file, code);
