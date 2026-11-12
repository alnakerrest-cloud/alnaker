import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
async function run() {
  await pool.query('DELETE FROM "Offer"');
  console.log('Cleaned all offers.');
  await pool.end();
}
run();

