const fs = require('fs');

let repo = fs.readFileSync('src/modules/catalog/asset-code.repository.ts', 'utf8');
repo = repo.replace(/barcode: String\(row\.barcode\),[\s\S]*?coverImagePath: row\.cover_image_path \? String\(row\.cover_image_path\) : null,/, 'barcode: String(row.barcode),\n    coverImagePath: row.cover_image_path ? String(row.cover_image_path) : null,');
fs.writeFileSync('src/modules/catalog/asset-code.repository.ts', repo);

let service = fs.readFileSync('src/modules/catalog/asset-code.service.ts', 'utf8');
service = service.replace(/titleId: asset\.titleId,\s*title: asset\.title,/, 'titleId: asset.titleId,\n        title: asset.title,\n        coverImagePath: asset.coverImagePath,');
fs.writeFileSync('src/modules/catalog/asset-code.service.ts', service);
