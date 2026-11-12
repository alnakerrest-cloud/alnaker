import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function inspectDb() {
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log('Total public tables count:', tables.length);

  const tableInventory = {};
  for (const t of tables) {
    const c = await pool.query(`SELECT count(*) FROM public."${t}"`);
    tableInventory[t] = Number(c.rows[0].count);
  }
  console.log('Table Row Counts:\n', JSON.stringify(tableInventory, null, 2));

  const enumsRes = await pool.query(`
    SELECT t.typname as enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
  `);
  console.log('Enums in public:\n', JSON.stringify(enumsRes.rows, null, 2));

  await pool.end();
}

inspectDb().catch(console.error);

