import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing!');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function postTestCleanup() {
  console.log('--- Cleaning Staging Test Orders ---');
  try {
    await pool.query('DELETE FROM "OrderItem"');
    await pool.query('DELETE FROM "OrderStore"');
    await pool.query('DELETE FROM "Order"');
    console.log('Cleaned test orders and order items.');
  } catch (err) {
    console.warn('Order cleanup warning:', err.message);
  }

  console.log('--- Resetting qa-mustchange password state for test idempotency ---');
  const tempHash = await bcrypt.hash('TempOwnerPass2026!', 10);
  await pool.query(
    'UPDATE "AdminUser" SET "passwordHash" = $1, "mustChangePassword" = true WHERE email = $2',
    [tempHash, 'qa-mustchange@naqer-menu.local']
  );
  console.log('Reset qa-mustchange@naqer-menu.local to mustChangePassword: true');

  await pool.end();
  console.log('Cleanup completed successfully.');
}

postTestCleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
