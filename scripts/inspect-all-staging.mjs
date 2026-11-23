import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const stagingPath = path.resolve('.env.staging.local');
const stagingEnv = dotenv.parse(fs.readFileSync(stagingPath));
const stagingDbUrl = stagingEnv.DATABASE_URL;

const pool = new pg.Pool({ connectionString: stagingDbUrl, ssl: true });

async function fullAudit() {
  const client = await pool.connect();
  try {
    const cats = await client.query('SELECT id, slug, "nameAr", "sortOrder" FROM "Category" ORDER BY "sortOrder"');
    console.log('Categories (' + cats.rows.length + '):');
    console.table(cats.rows);

    const zzAny = await client.query(`
      SELECT 'Category' as tbl, id, "nameAr" as name FROM "Category" WHERE "nameAr" ILIKE '%zz%' OR slug ILIKE '%zz%'
      UNION ALL
      SELECT 'Section' as tbl, id, "titleAr" as name FROM "Section" WHERE "titleAr" ILIKE '%zz%'
      UNION ALL
      SELECT 'Product' as tbl, id, "nameAr" as name FROM "Product" WHERE "nameAr" ILIKE '%zz%'
      UNION ALL
      SELECT 'Branch' as tbl, id, "nameAr" as name FROM "Branch" WHERE "nameAr" ILIKE '%zz%' OR "nameEn" ILIKE '%zz%'
    `);
    console.log('ZZ artifacts found across DB:', zzAny.rows);

    const auditLogs = await client.query('SELECT count(*) FROM "AuditLog"');
    console.log('AuditLog count:', auditLogs.rows[0].count);

    const adminUsers = await client.query('SELECT id, email, role, "isActive", "mustChangePassword" FROM "AdminUser"');
    console.log('AdminUsers:');
    console.table(adminUsers.rows);

    const branches = await client.query('SELECT id, "nameAr", "nameEn", "isOrderable", "isActive" FROM "Branch"');
    console.log('Branches:');
    console.table(branches.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

fullAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
