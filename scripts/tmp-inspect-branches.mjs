import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
async function main() {
  await pool.query(`update "Branch" set "isOrderable"=true`);
  const branches = await pool.query(`select id, "nameAr", "isOrderable", "isActive", "whatsappNumber" from "Branch"`);
  console.log('RESET BRANCHES IN DB:', branches.rows);
  await pool.end();
}
main().catch(console.error);
