import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const custRes = await pool.query('SELECT * FROM "Customer" ORDER BY "createdAt" DESC LIMIT 20;');
    console.log('Customer rows count:', custRes.rows.length);
    console.log('Customers:');
    for (const c of custRes.rows) {
      console.log(`- ID: ${c.id}, Phone: ${c.phone}, Name: ${c.name}, Created: ${c.createdAt}`);
    }

    const addrRes = await pool.query('SELECT * FROM "CustomerAddress" ORDER BY "createdAt" DESC LIMIT 10;');
    console.log('\nAddresses:');
    for (const a of addrRes.rows) {
      console.log(`- ID: ${a.id}, CustID: ${a.customerId}, Label: ${a.label}, Street: ${a.street}`);
    }

    const notifRes = await pool.query('SELECT * FROM "CustomerNotification" ORDER BY "createdAt" DESC LIMIT 10;');
    console.log('\nNotifications count:', notifRes.rows.length);

  } catch (err) {
    console.error('Inspect error:', err);
  } finally {
    await pool.end();
  }
}

main();
