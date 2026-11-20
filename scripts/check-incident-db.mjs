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
    const res = await pool.query(`
      SELECT id, "orderNumber", "createdAt", 
             data->>'customerName' as name, 
             data->>'customerPhone' as phone, 
             data->>'total' as total, 
             data->>'deliveryAddress' as address
      FROM "OrderStore"
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);
    console.log('Recent 10 orders:');
    console.log(JSON.stringify(res.rows, null, 2));

    const searchRes = await pool.query(`
      SELECT id, "orderNumber", "createdAt", 
             data->>'customerName' as name,
             data->>'total' as total, 
             data->>'deliveryAddress' as address
      FROM "OrderStore"
      WHERE data->>'deliveryAddress' ILIKE '%ss%' 
         OR data->>'total' = '2130' 
         OR data->>'total' = '2100';
    `);
    console.log('Search matches for total 2130/2100 or address ss:');
    console.log(JSON.stringify(searchRes.rows, null, 2));

    // Also check if there are other order tables or error logs
    const tablesRes = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `);
    console.log('Tables:', tablesRes.rows.map(r => r.table_name));

  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await pool.end();
  }
}

main();
