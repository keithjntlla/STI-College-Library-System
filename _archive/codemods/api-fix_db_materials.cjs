const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'Sqlpasword123', database: 'sti_ormoc_library' });
  try {
     const [rows] = await connection.execute('SELECT physical_copy_id, barcode FROM physical_copies WHERE material_id IS NULL');
     console.log(`Found ${rows.length} copies without material_id.`);
     
     for (const row of rows) {
        // Insert into materials
        const [result] = await connection.execute(
           'INSERT INTO materials (material_type, barcode) VALUES (?, ?)',
           ['Book', row.barcode]
        );
        const materialId = result.insertId;
        
        // Update physical_copies
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
