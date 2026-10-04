const fs = require('fs')
let code = fs.readFileSync('apps/api/src/app.js', 'utf8')

if (!code.includes("app.use('/api/v1/public/catalog'")) {
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
  
  app.use('/api/v1/catalog', authenticateJwt`;
  
  code = code.replace("app.use('/api/v1/catalog', authenticateJwt", publicRoutes);
  fs.writeFileSync('apps/api/src/app.js', code);
}
