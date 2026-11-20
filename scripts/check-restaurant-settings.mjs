import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSettingsTable() {
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'RestaurantSettings';
  `);
  console.log('RestaurantSettings columns:');
  console.log(cols.rows);

  const rows = await pool.query(`SELECT * FROM "RestaurantSettings";`);
  console.log('\nRestaurantSettings rows:');
  console.log(rows.rows);

  await pool.end();
}

checkSettingsTable().catch(console.error);
