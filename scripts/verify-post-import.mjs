// scripts/verify-post-import.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
import pg from 'pg';

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('================================================================');
  console.log('[READ-ONLY POST-IMPORT VERIFICATION REPORT]');
  console.log('================================================================');

  const tables = [
    'Category',
    'Section',
    'Product',
    'ProductVariant',
    'ProductImage',
    'Branch',
    'OptionGroup',
    'OptionItem',
    'ProductOptionGroup',
    'RestaurantSettings',
    'AdminUser',
    'OrderStore',
    'Order',
    'Customer',
    'Session',
    'AuditLog',
  ];

  console.log('\n1. Table Counts:');
  for (const t of tables) {
    const res = await pool.query(`SELECT count(*)::int as c FROM "${t}"`);
    console.log(`   - ${t.padEnd(20)}: ${res.rows[0].c}`);
  }

  console.log('\n2. Branches in Neon:');
  const branches = await pool.query(`SELECT id, "nameAr", "cityAr", "isActive", "isOrderable" FROM "Branch" ORDER BY "sortOrder" ASC`);
  for (const b of branches.rows) {
    console.log(`   - [${b.id}] ${b.nameAr} (${b.cityAr}) | Active: ${b.isActive} | Orderable: ${b.isOrderable}`);
  }

  console.log('\n3. Admin Users (Intact & Preserved):');
  const users = await pool.query(`SELECT email, role, "mustChangePassword" FROM "AdminUser" ORDER BY email ASC`);
  for (const u of users.rows) {
    console.log(`   - ${u.email.padEnd(35)} | Role: ${u.role.padEnd(12)} | mustChangePassword: ${u.mustChangePassword}`);
  }

  console.log('\n4. Product Images Breakdown:');
  const imgStats = await pool.query(`
    SELECT 
      count(*)::int as total,
      count(*) FILTER (WHERE url LIKE '%res.cloudinary.com%' OR "publicId" IS NOT NULL)::int as cloudinary_count,
      count(*) FILTER (WHERE url LIKE '/images/%')::int as local_path_count
    FROM "ProductImage"
  `);
  console.log(`   - Total Images:      ${imgStats.rows[0].total}`);
  console.log(`   - Cloudinary Images:  ${imgStats.rows[0].cloudinary_count}`);
  console.log(`   - Local Path Images:  ${imgStats.rows[0].local_path_count}`);

  const sampleCloudinary = await pool.query(`SELECT pi.url, pi."publicId", p."nameAr" FROM "ProductImage" pi JOIN "Product" p ON pi."productId" = p.id WHERE pi.url LIKE '%res.cloudinary.com%' LIMIT 2`);
  if (sampleCloudinary.rows.length > 0) {
    console.log('   - Sample Cloudinary Images:');
    for (const img of sampleCloudinary.rows) {
      console.log(`     • ${img.nameAr}: ${img.url}`);
    }
  }

  console.log('\n5. Latest Audit Log Entry:');
  const audit = await pool.query(`SELECT action, summary, changes, "createdAt" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 1`);
  if (audit.rows.length > 0) {
    const a = audit.rows[0];
    console.log(`   - Action:    ${a.action}`);
    console.log(`   - Summary:   ${a.summary}`);
    console.log(`   - Changes:   ${JSON.stringify(a.changes)}`);
    console.log(`   - Timestamp: ${a.createdAt.toISOString()}`);
  }

  console.log('================================================================');
  await pool.end();
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
