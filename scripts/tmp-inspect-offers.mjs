import dotenv from 'dotenv';
import path from 'node:path';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function main() {
  const offers = await pool.query('SELECT * FROM "Offer"');
  console.log('Offers count in DB:', offers.rows.length);
  console.log('Offers:', offers.rows);
  const targets = await pool.query('SELECT * FROM "OfferProductTarget"');
  console.log('Product targets:', targets.rows);
  const locTargets = await pool.query('SELECT * FROM "OfferLocationTarget"');
  console.log('Location targets:', locTargets.rows);
  await pool.end();
}

main().catch(console.error);
