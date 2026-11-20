import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function clean() {
  await pool.query('DELETE FROM "OrderStore" WHERE "orderNumber" = $1', ['ORD-20261120-F35C5E']);
  try {
    await pool.query('DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "orderNumber" = $1)', ['ORD-20261120-F35C5E']);
    await pool.query('DELETE FROM "Order" WHERE "orderNumber" = $1', ['ORD-20261120-F35C5E']);
  } catch {}
  console.log('Cleaned test order ORD-20261120-F35C5E');
  await pool.end();
}

clean();
