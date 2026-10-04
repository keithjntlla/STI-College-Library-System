const fs = require('fs');
let code = fs.readFileSync('apps/api/src/app.js', 'utf8');

// 1. Remove the misplaced public route block
const publicRouteMatch = /  app\.get\('\/api\/v1\/public\/catalog\/books'[\s\S]*?\}\);/m;
code = code.replace(publicRouteMatch, '');

// 2. Insert it BEFORE app.use('/api/v1', authenticateJwt, ensureActiveJwtAccount)
const insertionPoint = "  app.use('/api/v1', authenticateJwt, ensureActiveJwtAccount)";
const publicRoutes = `
  app.get('/api/v1/public/catalog/books', async (req, res, next) => {
    try {
      const { searchCatalog, parseCatalogSearchFilters } = await import('./modules/catalog/catalog-search.repository.ts');
      const { db } = await import('./config/db.js');
      const filters = parseCatalogSearchFilters(req.query);
      const data = await searchCatalog(db, filters);
      res.json({ success: true, data, filters });
    } catch (e) { next(e) }
  });
`;
code = code.replace(insertionPoint, publicRoutes + '\n' + insertionPoint);

fs.writeFileSync('apps/api/src/app.js', code);
