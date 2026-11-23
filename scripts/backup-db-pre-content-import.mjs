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
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`[BACKUP] Exporting all ${tablesRes.rows.length} tables from production database...`);
    const backupData = {
      timestamp: new Date().toISOString(),
      databaseHost: new URL(databaseUrl).hostname,
      tables: {}
    };

    for (const row of tablesRes.rows) {
      const table = row.table_name;
      const res = await client.query(`SELECT * FROM public."${table}"`);
      backupData.tables[table] = res.rows;
      console.log(` - ${table}: ${res.rows.length} rows`);
    }

    const backupDir = path.resolve('backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `backup-pre-content-import-${timestampStr}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
    
    const stats = fs.statSync(backupFilePath);
    console.log(`\n[SUCCESS] Backup successfully saved to:\n${backupFilePath}\nSize: ${(stats.size / 1024).toFixed(1)} KB`);

    // Verify readability immediately
    const verifyData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    if (Object.keys(verifyData.tables).length !== tablesRes.rows.length) {
      throw new Error('Backup integrity verification failed!');
    }
    console.log(`[VERIFIED] Backup integrity confirmed: ${Object.keys(verifyData.tables).length} tables fully readable.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
