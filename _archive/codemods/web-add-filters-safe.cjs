const fs = require('fs');
let types = fs.readFileSync('src/features/catalog/types.ts', 'utf8');

types = types.replace(/export type CatalogFilters = \{/, 'export type CatalogFilters = {\n  page?: number;\n  limit?: number;');

fs.writeFileSync('src/features/catalog/types.ts', types);
