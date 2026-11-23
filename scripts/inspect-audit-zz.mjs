import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const stagingPath = path.resolve('.env.staging.local');
const stagingEnv = dotenv.parse(fs.readFileSync(stagingPath));
const pool = new pg.Pool({ connectionString: stagingEnv.DATABASE_URL, ssl: true });

async function checkAudit() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT action, "entityType", "entityId", summary, "createdAt" FROM "AuditLog" WHERE summary ILIKE \'%cmws5h%\' OR summary ILIKE \'%ZZ%\' OR "entityId" = \'cmws5hw4l00190cvycgrhxma9\' ORDER BY "createdAt" DESC LIMIT 10');
    console.log('Target entity audit log entries:', res.rows);

    const latest = await client.query('SELECT action, "entityType", "entityId", summary, "createdAt" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 10');
    console.log('Latest 10 audit logs:');
    console.table(latest.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
