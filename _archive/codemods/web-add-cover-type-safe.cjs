const fs = require('fs');
let types = fs.readFileSync('src/features/catalog/types.ts', 'utf8');

types = types.replace(/export type GeneratedBookLabel = \{/, 'export type GeneratedBookLabel = {\n  coverImagePath?: string | null;\n  conditionStatus?: string;');

fs.writeFileSync('src/features/catalog/types.ts', types);
