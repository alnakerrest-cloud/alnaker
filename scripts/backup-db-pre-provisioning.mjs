import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing');

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    // List all public tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`Found ${tablesRes.rows.length} public tables in database:`);
    const backupData = {
      timestamp: new Date().toISOString(),
      databaseHost: new URL(databaseUrl).hostname,
      tables: {}
    };

    for (const row of tablesRes.rows) {
      const table = row.table_name;
      // Do not backup sensitive raw passwords in plain text if avoidable, but for pg dump we keep whatever exists in db
      const res = await client.query(`SELECT * FROM public."${table}"`);
      backupData.tables[table] = res.rows;
      console.log(`- ${table}: ${res.rows.length} records`);
    }

    const backupDir = path.resolve('backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `backup-pre-staff-${timestampStr}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
    
    const stats = fs.statSync(backupFilePath);
    console.log(`\n[SUCCESS] Backup successfully written to ${backupFilePath} (${(stats.size / 1024).toFixed(1)} KB)`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
