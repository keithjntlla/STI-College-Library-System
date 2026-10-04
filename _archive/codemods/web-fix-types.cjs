const fs = require('fs');
let types = fs.readFileSync('src/features/catalog/types.ts', 'utf8');

types = types.replace(/export type GeneratedBookLabel = \{[\s\S]*?\n\s*coverImagePath[\s\S]*?barcodeImageData\?: string;[\s\S]*?physicalCopyId:/, 'export type GeneratedBookLabel = {\n  physicalCopyId:'); // Clean up the botched replace

// Just replace the original export type
const fixed = `export type GeneratedBookLabel = {
  coverImagePath?: string | null;
  accessionNumber?: string;
  barcode?: string;
  shelfLocation?: string;
  conditionStatus?: string;
  barcodeImageData?: string;
  physicalCopyId: number;`;
  
types = types.replace(/export type GeneratedBookLabel = \{\r?\n\s*physicalCopyId:/, fixed);
fs.writeFileSync('src/features/catalog/types.ts', types);
