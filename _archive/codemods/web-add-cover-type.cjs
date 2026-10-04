const fs = require('fs');
let types = fs.readFileSync('src/features/catalog/types.ts', 'utf8');

types = types.replace(
  "barcode: string\n  qrCodeData: string",
  "barcode: string\n  coverImagePath?: string | null\n  qrCodeData: string"
);

fs.writeFileSync('src/features/catalog/types.ts', types);
