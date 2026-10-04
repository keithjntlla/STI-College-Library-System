import { db } from './src/config/db.js';

async function reset() {
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  
  const tablesToTruncate = [
    'borrow_transactions',
    'borrow_records', // Add borrow_records just in case
    'reservations',
    'fines',
    'fine_infractions',
    'fine_adjustments',
    'fine_payment_allocations',
    'fine_payment_receipts',
    'customer_invoices',
    'clearance_statuses',
    'clearance_overrides',
    'lost_book_reports',
    'book_quotations',
    'notifications',
    'admin_notifications',
    'print_requests',
    'print_status_history',
    'print_cash_payments',
    'print_payment_receipts',
    'print_file_download_audit'
  ];

  for (const table of tablesToTruncate) {
    try {
      await db.query(`TRUNCATE TABLE ${table}`);
      console.log(`Truncated ${table}`);
    } catch (e) {
      console.error(`Failed to truncate ${table}:`, e.message);
    }
  }

  const [updateRes] = await db.query(`UPDATE physical_copies SET availability_status = 'Available' WHERE availability_status IN ('Borrowed', 'Reserved')`);
  console.log(`Reset ${updateRes.affectedRows} physical copies to Available`);

  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  process.exit(0);
}

reset().catch(console.error);
