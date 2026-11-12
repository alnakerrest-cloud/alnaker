import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

const TABLES = [
  'RestaurantSettings',
  'Branch',
  'Category',
  'Section',
  'Product',
  'ProductVariant',
  'ProductImage',
  'OptionGroup',
  'OptionItem',
  'ProductOptionGroup',
  'Offer',
  'OfferProductTarget',
  'OfferCategoryTarget',
  'OfferLocationTarget',
  'AdminUser'
];

async function main() {
  console.log('=== NAQER MENU: DATABASE BACKUP & ISOLATED RESTORE VERIFICATION ===\n');

  // STEP 1: BACKUP
  console.log('[1/4] Creating complete logical database backup from production...');
  const backupData = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  for (const table of TABLES) {
    const res = await pool.query(`SELECT * FROM public."${table}"`);
    backupData.tables[table] = res.rows;
    console.log(`  - Exported ${table}: ${res.rows.length} records`);
  }

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFilePath = path.join(backupDir, 'backup-naqer-verified.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
  const backupSize = (fs.statSync(backupFilePath).size / 1024).toFixed(1);
  console.log(`[BACKUP CREATED] Saved to ${backupFilePath} (${backupSize} KB)\n`);

  // STEP 2: PREPARE ISOLATED RESTORE ENVIRONMENT
  console.log('[2/4] Setting up isolated sandbox schema "isolated_restore_test"...');
  await pool.query('DROP SCHEMA IF EXISTS isolated_restore_test CASCADE');
  await pool.query('CREATE SCHEMA isolated_restore_test');

  for (const table of TABLES) {
    await pool.query(`CREATE TABLE isolated_restore_test."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  }
  console.log('  - All 13 relational tables cloned into isolated schema.\n');

  // STEP 3: RESTORE INTO ISOLATED SCHEMA
  console.log('[3/4] Restoring records into isolated schema...');
  for (const table of TABLES) {
    const rows = backupData.tables[table];
    if (rows.length === 0) continue;

    const cols = Object.keys(rows[0]);
    const colNames = cols.map(c => `"${c}"`).join(', ');

    for (const row of rows) {
      const values = cols.map(c => row[c]);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      await pool.query(
        `INSERT INTO isolated_restore_test."${table}" (${colNames}) VALUES (${placeholders})`,
        values
      );
    }
    console.log(`  - Restored ${table}: ${rows.length} rows`);
  }
  console.log('[RESTORE COMPLETED] All tables successfully populated.\n');

  // STEP 4: INTEGRITY VERIFICATION ON RESTORED DATA
  console.log('[4/4] Running strict integrity audit on RESTORED isolated database...');
  const [
    pCount,
    cCount,
    sCount,
    vCount,
    bCount,
    orphanProducts,
    orphanSections,
    orphanVariants
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM isolated_restore_test."Product"'),
    pool.query('SELECT COUNT(*) FROM isolated_restore_test."Category"'),
    pool.query('SELECT COUNT(*) FROM isolated_restore_test."Section"'),
    pool.query('SELECT COUNT(*) FROM isolated_restore_test."ProductVariant"'),
    pool.query('SELECT COUNT(*) FROM isolated_restore_test."Branch" WHERE "isActive" = true'),
    pool.query('SELECT COUNT(*) FROM isolated_restore_test."Product" WHERE "sectionId" NOT IN (SELECT id FROM isolated_restore_test."Section")'),
    pool.query('SELECT COUNT(*) FROM isolated_restore_test."Section" WHERE "categoryId" NOT IN (SELECT id FROM isolated_restore_test."Category")'),
    pool.query('SELECT COUNT(*) FROM isolated_restore_test."ProductVariant" WHERE "productId" NOT IN (SELECT id FROM isolated_restore_test."Product")')
  ]);

  const restoredProducts = Number(pCount.rows[0].count);
  const restoredCategories = Number(cCount.rows[0].count);
  const restoredSections = Number(sCount.rows[0].count);
  const restoredVariants = Number(vCount.rows[0].count);
  const restoredBranches = Number(bCount.rows[0].count);
  const orphans = Number(orphanProducts.rows[0].count) + Number(orphanSections.rows[0].count) + Number(orphanVariants.rows[0].count);

  console.log('=== RESTORE AUDIT RESULTS ===');
  console.log(`  Products:         ${restoredProducts} (Baseline: 151) -> ${restoredProducts === 151 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`  Categories:       ${restoredCategories} (Baseline: 18)  -> ${restoredCategories === 18 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`  Sections:         ${restoredSections} (Baseline: 27)  -> ${restoredSections === 27 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`  Variants:         ${restoredVariants} (Baseline: 167) -> ${restoredVariants === 167 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`  Active Branches:  ${restoredBranches} (Baseline: 2)   -> ${restoredBranches === 2 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`  Orphaned Records: ${orphans} (Baseline: 0)   -> ${orphans === 0 ? 'MATCH' : 'MISMATCH'}`);

  const passed =
    restoredProducts === 151 &&
    restoredCategories === 18 &&
    restoredSections === 27 &&
    restoredVariants === 167 &&
    restoredBranches === 2 &&
    orphans === 0;

  // CLEANUP ISOLATED SCHEMA
  await pool.query('DROP SCHEMA isolated_restore_test CASCADE');
  console.log('\n[CLEANUP] Isolated schema "isolated_restore_test" cleanly dropped.');

  await pool.end();

  if (passed) {
    console.log('\n>>> DATABASE BACKUP AND RESTORE: 100% SUCCESSFUL <<<');
    process.exit(0);
  } else {
    console.error('\n>>> DATABASE BACKUP AND RESTORE: FAILED VERIFICATION <<<');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
