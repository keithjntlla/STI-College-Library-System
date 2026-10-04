const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/catalog-api.ts', 'utf8');

code = code.replace(
  "asset: (physicalCopyId: number, signal?: AbortSignal)",
  "copyByBarcode: (barcode: string, signal?: AbortSignal) => request<GeneratedBookLabel>(`/api/catalog/books/copies/\${encodeURIComponent(barcode)}`, { signal }),\n  asset: (physicalCopyId: number, signal?: AbortSignal)"
);

fs.writeFileSync('src/features/catalog/catalog-api.ts', code);
