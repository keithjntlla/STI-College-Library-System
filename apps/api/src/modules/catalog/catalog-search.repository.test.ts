import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCatalogSearchQuery, buildPublicBookCategoriesQuery, parseCatalogSearchFilters } from './catalog-search.repository.ts'

test('builds one prepared query for combined category, author, year, availability, and text filters', () => {
  const filters = parseCatalogSearchFilters({
    q: 'database', scope: 'books', categoryId: '4', author: 'Date', publicationYear: '2019',
    availability: 'Available', page: '2', limit: '20',
  })
  const query = buildCatalogSearchQuery(filters)

  assert.match(query.dataSql, /t\.category_id = \?/)
  assert.match(query.dataSql, /af\.normalized_name LIKE \?/)
  assert.match(query.dataSql, /t\.publication_year = \?/)
  assert.match(query.dataSql, /pcf\.availability_status = 'Available'/)
  assert.deepEqual(query.dataParameters.slice(0, 3), [4, 2019, '%date%'])
  assert.match(query.dataSql, /LIMIT 20 OFFSET 20/)
  assert.ok(!query.dataSql.includes('database'), 'user text must never be interpolated into SQL')
  assert.ok(query.dataParameters.includes('%database%'))
})

test('rejects malformed search filters with 422 semantics', () => {
  assert.throws(() => parseCatalogSearchFilters({ categoryId: '1 OR 1=1' }), (error: unknown) => {
    return typeof error === 'object' && error !== null && 'status' in error && error.status === 422
  })
})

test('catalog results include the active research inventory identifier needed by the code viewer', () => {
  const query = buildCatalogSearchQuery(parseCatalogSearchFilters({ scope: 'research' }))
  assert.match(query.dataSql, /MIN\(research_inventory_id\) AS research_inventory_id/)
  assert.match(query.dataSql, /ri_lookup\.research_inventory_id/)
})

test('public category list counts active books and omits shelf data', () => {
  const query = buildPublicBookCategoriesQuery()
  assert.match(query.sql, /t\.record_type = 'Book'/)
  assert.match(query.sql, /t\.lifecycle_status = 'Active'/)
  assert.match(query.sql, /COUNT\(DISTINCT t\.title_id\) AS book_count/)
  assert.doesNotMatch(query.sql, /shelf_location|call_number|row_version|program_categories/)
  assert.deepEqual(query.parameters, [])
})

test('public course filter narrows books and categories through program links', () => {
  const books = buildCatalogSearchQuery(parseCatalogSearchFilters({ scope: 'books', programId: '3', categoryId: '9' }))
  assert.match(books.dataSql, /program_link\.program_id = \?/)
  assert.ok(books.dataParameters.includes(3))
  assert.ok(!books.dataSql.includes('3'), 'course id must stay a bound parameter')

  const categories = buildPublicBookCategoriesQuery(3)
  assert.match(categories.sql, /program_categories pc/)
  assert.match(categories.sql, /pc\.program_id = \?/)
  assert.deepEqual(categories.parameters, [3])
  assert.doesNotMatch(categories.sql, /shelf_location|call_number/)
})

test('catalog results expose the authoritative category shelf and actual active inventory shelves', () => {
  const query = buildCatalogSearchQuery(parseCatalogSearchFilters({}))
  assert.match(query.dataSql, /c\.shelf_location AS category_shelf_location/)
  assert.match(query.dataSql, /book_shelf_locations/)
  assert.match(query.dataSql, /active_inventory_count/)
  assert.match(query.dataSql, /t\.row_version/)
})
