import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_9ruYQlds5vTx@ep-aged-feather-bej8rk3r-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function syncEnum() {
  await pool.query(`ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'ADMIN';`);
  await pool.query(`ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'ORDERS_STAFF';`);
  const r = await pool.query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'AdminRole'`);
  console.log('Production AdminRole enum labels:', r.rows.map(x => x.enumlabel));
  await pool.end();
}

syncEnum().catch(e => {
  console.error('Enum sync error:', e);
  pool.end();
  process.exit(1);
});
