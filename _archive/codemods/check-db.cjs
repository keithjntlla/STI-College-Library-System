const mysql = require('mysql2/promise');
async function run() {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'smartlib' });
  const [rows] = await db.execute("SELECT c.category_name, COUNT(t.title_id) as count FROM titles t LEFT JOIN categories c ON t.category_id = c.category_id GROUP BY c.category_name");
  console.log(rows);
  process.exit(0);
}
run();
