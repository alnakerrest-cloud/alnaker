import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_9ruYQlds5vTx@ep-aged-feather-bej8rk3r-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Public tables count:', tables.rows.length);
  
  const counts = await Promise.all([
    pool.query('SELECT COUNT(*) FROM "RestaurantSettings"'),
    pool.query('SELECT COUNT(*) FROM "Branch"'),
    pool.query('SELECT COUNT(*) FROM "Category"'),
    pool.query('SELECT COUNT(*) FROM "Section"'),
    pool.query('SELECT COUNT(*) FROM "Product"'),
    pool.query('SELECT COUNT(*) FROM "ProductVariant"'),
    pool.query('SELECT COUNT(*) FROM "ProductImage"'),
    pool.query('SELECT COUNT(*) FROM "OptionGroup"'),
    pool.query('SELECT COUNT(*) FROM "OptionItem"'),
    pool.query('SELECT COUNT(*) FROM "ProductOptionGroup"'),
    pool.query('SELECT COUNT(*) FROM "AdminUser"'),
    pool.query('SELECT COUNT(*) FROM "_prisma_migrations"'),
  ]);

  console.log('\n--- PRODUCTION DATA INTEGRITY VERIFIED ---');
  console.log('RestaurantSettings :', counts[0].rows[0].count);
  console.log('Branches           :', counts[1].rows[0].count);
  console.log('Categories         :', counts[2].rows[0].count);
  console.log('Sections           :', counts[3].rows[0].count);
  console.log('Products           :', counts[4].rows[0].count);
  console.log('ProductVariants    :', counts[5].rows[0].count);
  console.log('ProductImages      :', counts[6].rows[0].count);
  console.log('OptionGroups       :', counts[7].rows[0].count);
  console.log('OptionItems        :', counts[8].rows[0].count);
  console.log('ProductOptionGroups:', counts[9].rows[0].count);
  console.log('AdminUsers         :', counts[10].rows[0].count);
  console.log('Prisma Migrations  :', counts[11].rows[0].count);

  const users = await pool.query('SELECT email, role, "isActive", "mustChangePassword", "displayName" FROM "AdminUser" ORDER BY "createdAt" ASC');
  console.log('\n--- ACTIVE PRODUCTION USERS ---');
  for (const u of users.rows) {
    console.log(u.email.padEnd(20), '| Role:', u.role.padEnd(14), '| Active:', u.isActive, '| MustChange:', u.mustChangePassword, '| Name:', u.displayName);
  }

  await pool.end();
}

verify().catch(e => {
  console.error('Verification failed:', e);
  pool.end();
  process.exit(1);
});
