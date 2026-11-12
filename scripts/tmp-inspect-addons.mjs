import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
async function main() {
  await pool.query(`delete from "OptionGroup" where "nameAr" like 'اختبار-إضافات-%'`);
  const groups = await pool.query(`select id, "nameAr" from "OptionGroup"`);
  console.log('REMAINING GROUPS:', groups.rows);
  await pool.end();
}
main().catch(console.error);
