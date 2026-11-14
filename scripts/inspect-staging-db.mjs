import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'node:fs';

const stagingEnv = dotenv.parse(fs.readFileSync('.env.staging.local'));
if (stagingEnv.NAQER_TEST_ENV !== 'staging' || stagingEnv.STAGING_MODE !== '1') {
  throw new Error('Safety guard: must be staging');
}
const pool = new pg.Pool({ connectionString: stagingEnv.DATABASE_URL, ssl: true });

async function finalCleanup() {
  const testProds = (await pool.query(`
    SELECT id, "nameAr" FROM "Product" 
    WHERE "nameAr" LIKE 'ZZ%' OR "nameAr" LIKE '%اختبار%' OR "nameAr" LIKE '%مؤقت%'
  `)).rows;
  console.log('Staging test products found:', testProds.length);

  if (testProds.length > 0) {
    const ids = testProds.map(p => p.id);
    await pool.query(`DELETE FROM "OfferProductTarget" WHERE "productId" = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM "ProductOptionGroup" WHERE "productId" = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM "ProductVariant" WHERE "productId" = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM "ProductImage" WHERE "productId" = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM "Product" WHERE id = ANY($1)`, [ids]);
    console.log(`Cleaned ${ids.length} test products from staging.`);
  }

  // Clean test categories
  const testCats = (await pool.query(`
    SELECT id, "nameAr" FROM "Category"
    WHERE "nameAr" LIKE 'ZZ%' OR "nameAr" LIKE '%اختبار%'
  `)).rows;
  if (testCats.length > 0) {
    const ids = testCats.map(c => c.id);
    await pool.query(`DELETE FROM "Category" WHERE id = ANY($1)`, [ids]);
    console.log(`Cleaned ${ids.length} test categories.`);
  }

  // Clean test branches
  const testBranches = (await pool.query(`
    SELECT id, "nameAr" FROM "Branch"
    WHERE "nameAr" LIKE '%اختبار%' OR "nameAr" LIKE 'ZZ%'
  `)).rows;
  if (testBranches.length > 0) {
    const ids = testBranches.map(b => b.id);
    await pool.query(`DELETE FROM "Branch" WHERE id = ANY($1)`, [ids]);
    console.log(`Cleaned ${ids.length} test branches.`);
  }

  // Clean test option groups
  const testGroups = (await pool.query(`
    SELECT id, "nameAr" FROM "OptionGroup"
    WHERE "nameAr" LIKE '%اختبار%' OR "nameAr" LIKE 'ZZ%'
  `)).rows;
  if (testGroups.length > 0) {
    const ids = testGroups.map(g => g.id);
    await pool.query(`DELETE FROM "OptionGroup" WHERE id = ANY($1)`, [ids]);
    console.log(`Cleaned ${ids.length} test option groups.`);
  }

  // Clean test offers
  await pool.query(`
    DELETE FROM "OfferLocationTarget" WHERE "offerId" IN (SELECT id FROM "Offer" WHERE "titleAr" LIKE '%e2e%' OR "titleAr" LIKE '%تيست%' OR "titleAr" LIKE '%ZZ%' OR "titleAr" LIKE '%اختبار%')
  `);
  await pool.query(`
    DELETE FROM "OfferProductTarget" WHERE "offerId" IN (SELECT id FROM "Offer" WHERE "titleAr" LIKE '%e2e%' OR "titleAr" LIKE '%تيست%' OR "titleAr" LIKE '%ZZ%' OR "titleAr" LIKE '%اختبار%')
  `);
  await pool.query(`
    DELETE FROM "Offer" WHERE "titleAr" LIKE '%e2e%' OR "titleAr" LIKE '%تيست%' OR "titleAr" LIKE '%ZZ%' OR "titleAr" LIKE '%اختبار%'
  `);

  // Final count check
  const counts = await pool.query(`
    SELECT 
      (SELECT count(*) FROM "Product") as products,
      (SELECT count(*) FROM "Category") as categories,
      (SELECT count(*) FROM "Branch") as branches,
      (SELECT count(*) FROM "Offer") as offers,
      (SELECT count(*) FROM "AdminUser") as admin_users
  `);
  console.log('Staging DB Final Counts:', counts.rows[0]);

  await pool.end();
}

finalCleanup().catch(console.error);
