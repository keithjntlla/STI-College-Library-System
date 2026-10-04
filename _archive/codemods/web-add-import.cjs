const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/catalog-api.ts', 'utf8');

code = code.replace(
  "import type { AdminBookAsset, BulkBookResult, CatalogFilters, CatalogItem, Category, CategoryAssignmentResult, IsbnMetadata, PhysicalCopy } from './types'",
  "import type { AdminBookAsset, BulkBookResult, CatalogFilters, CatalogItem, Category, CategoryAssignmentResult, IsbnMetadata, PhysicalCopy, GeneratedBookLabel } from './types'"
);

fs.writeFileSync('src/features/catalog/catalog-api.ts', code);
