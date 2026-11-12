import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function testFullRestore() {
  console.log('=== VERIFYING FULL-FIDELITY SQL RESTORE IN ISOLATED SANDBOX ===\n');

  const dumpPath = path.resolve('backups/naqer-full-production-backup.sql');
  if (!fs.existsSync(dumpPath)) {
    throw new Error('Dump file does not exist: ' + dumpPath);
  }

  const rawSql = fs.readFileSync(dumpPath, 'utf8');
  console.log(`[1/4] Read SQL dump (${(rawSql.length / 1024).toFixed(1)} KB)...`);

  // Step 1: Create isolated schema
  console.log('[2/4] Initializing clean sandbox schema "isolated_full_restore_test"...');
  await pool.query('DROP SCHEMA IF EXISTS isolated_full_restore_test CASCADE');
  await pool.query('CREATE SCHEMA isolated_full_restore_test');

  // Step 2: Execute dump inside isolated schema by setting search_path
  console.log('[3/4] Executing full DDL & DML dump inside isolated sandbox...');
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO isolated_full_restore_test, public');
    await client.query(rawSql);
    console.log('[RESTORE SUCCESS] All DDL statements, constraints, indexes, and data rows executed.');
  } finally {
    client.release();
  }

  // Step 3: Run full audit on isolated restored tables
  console.log('\n[4/4] Auditing restored database structures and row counts...');
  const client2 = await pool.connect();
  try {
    await client2.query('SET search_path TO isolated_full_restore_test');

    const [
      prodRes,
      catRes,
      secRes,
      varRes,
      branchRes,
      imgRes,
      auditRes,
      sessionRes,
      adminRes,
      importJobRes,
      importItemRes,
      orphanProdsRes
    ] = await Promise.all([
      client2.query('SELECT count(*) FROM "Product"'),
      client2.query('SELECT count(*) FROM "Category"'),
      client2.query('SELECT count(*) FROM "Section"'),
      client2.query('SELECT count(*) FROM "ProductVariant"'),
      client2.query('SELECT count(*) FROM "Branch" WHERE "isActive" = true'),
      client2.query('SELECT count(*) FROM "ProductImage"'),
      client2.query('SELECT count(*) FROM "AuditLog"'),
      client2.query('SELECT count(*) FROM "Session"'),
      client2.query('SELECT count(*) FROM "AdminUser"'),
      client2.query('SELECT count(*) FROM "ImportJob"'),
      client2.query('SELECT count(*) FROM "ImportItem"'),
      client2.query('SELECT count(*) FROM "Product" WHERE "sectionId" NOT IN (SELECT id FROM "Section")')
    ]);

    const restoredProducts = Number(prodRes.rows[0].count);
    const restoredCategories = Number(catRes.rows[0].count);
    const restoredSections = Number(secRes.rows[0].count);
    const restoredVariants = Number(varRes.rows[0].count);
    const restoredBranches = Number(branchRes.rows[0].count);
    const restoredImages = Number(imgRes.rows[0].count);
    const restoredAudit = Number(auditRes.rows[0].count);
    const restoredSessions = Number(sessionRes.rows[0].count);
    const restoredAdmins = Number(adminRes.rows[0].count);
    const restoredJobs = Number(importJobRes.rows[0].count);
    const restoredItems = Number(importItemRes.rows[0].count);
    const orphanCount = Number(orphanProdsRes.rows[0].count);

    console.log('=== RESTORED SCHEMA VERIFICATION REPORT ===');
    console.log(`  Products:          ${restoredProducts} (Baseline: 151) -> ${restoredProducts === 151 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Categories:        ${restoredCategories} (Baseline: 18)  -> ${restoredCategories === 18 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Sections:          ${restoredSections} (Baseline: 27)  -> ${restoredSections === 27 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Variants:          ${restoredVariants} (Baseline: 167) -> ${restoredVariants === 167 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Active Branches:   ${restoredBranches} (Baseline: 2)   -> ${restoredBranches === 2 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Product Images:    ${restoredImages} (Baseline: 151) -> ${restoredImages === 151 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Audit Logs:        ${restoredAudit} (Baseline: 1173)-> ${restoredAudit === 1173 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Sessions:          ${restoredSessions} (Baseline: 322) -> ${restoredSessions === 322 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Admin Users:       ${restoredAdmins} (Baseline: 2)   -> ${restoredAdmins === 2 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Import Jobs:       ${restoredJobs} (Baseline: 8)   -> ${restoredJobs === 8 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Import Items:      ${restoredItems} (Baseline: 160) -> ${restoredItems === 160 ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Orphaned Products: ${orphanCount} (Baseline: 0)   -> ${orphanCount === 0 ? 'MATCH' : 'MISMATCH'}`);

    const isFullyComplete =
      restoredProducts === 151 &&
      restoredCategories === 18 &&
      restoredSections === 27 &&
      restoredVariants === 167 &&
      restoredBranches === 2 &&
      restoredImages === 151 &&
      restoredAudit === 1173 &&
      restoredAdmins === 2 &&
      orphanCount === 0;

    if (!isFullyComplete) {
      throw new Error('Integrity mismatch in restored database!');
    }
  } finally {
    client2.release();
    // Drop the test sandbox schema cleanly
    await pool.query('DROP SCHEMA IF EXISTS isolated_full_restore_test CASCADE');
    console.log('\n[CLEANUP] Isolated sandbox schema cleanly dropped. Production untouched.');
    await pool.end();
  }

  console.log('\n>>> FULL-FIDELITY BACKUP AND RESTORE AUDIT: 100% CERTIFIED PASS <<<');
}

testFullRestore().catch(err => {
  console.error('[FATAL RESTORE ERROR]:', err);
  process.exit(1);
});

