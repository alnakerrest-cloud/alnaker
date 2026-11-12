import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
const branchCols = await pool.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_name ILIKE '%branch%'`);
console.log('Branch columns count:', branchCols.rows.length);
const offers = await pool.query('SELECT id, "titleAr", "isActive" FROM "Offer"');
console.log('Active offers in DB:', offers.rows);
await pool.end();
