const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'Sqlpasword123', database: 'sti_ormoc_library' });
  try {
     const [rows] = await connection.execute(`
        SELECT pc.physical_copy_id, pc.barcode, pc.shelf_location, t.title, t.category_id,
               COALESCE((SELECT a.author_name FROM authors a WHERE a.title_id = t.title_id LIMIT 1), 'Unknown') as author
        FROM physical_copies pc
        JOIN titles t ON t.title_id = pc.title_id
        WHERE pc.material_id IS NULL
     `);
     console.log(`Found ${rows.length} copies without material_id.`);
     
     for (const row of rows) {
        const [result] = await connection.execute(
           'INSERT INTO materials (material_type, barcode, title, author, shelf_location, category_id) VALUES (?, ?, ?, ?, ?, ?)',
           ['Book', row.barcode, row.title, row.author, row.shelf_location, row.category_id]
        );
        const materialId = result.insertId;
        
        await connection.execute(
           'UPDATE physical_copies SET material_id = ? WHERE physical_copy_id = ?',
           [materialId, row.physical_copy_id]
        );
     }
     console.log('Successfully generated materials for all floating physical copies.');
  } catch (e) {
     console.error('Failed!', e);
  }
  await connection.end();
})();
