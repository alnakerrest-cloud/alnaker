import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const stagingPath = path.resolve('.env.staging.local');
const stagingEnv = dotenv.parse(fs.readFileSync(stagingPath));
const stagingDbUrl = stagingEnv.DATABASE_URL;

const parsed = new URL(stagingDbUrl);
if (!parsed.hostname.startsWith('ep-ancient-hill-beec491j')) {
  console.error('REFUSAL: Target is not approved staging DB!');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: stagingDbUrl, ssl: true });

async function verifyIntegrity() {
  const client = await pool.connect();
  const errors = [];
  try {
    console.log('=== STAGING DATABASE INTEGRITY AUDIT ===');
    console.log('Host:', parsed.hostname);

    // 1. Entity Counts
    const counts = {
      Category: Number((await client.query('SELECT count(*) FROM "Category"')).rows[0].count),
      Section: Number((await client.query('SELECT count(*) FROM "Section"')).rows[0].count),
      Product: Number((await client.query('SELECT count(*) FROM "Product"')).rows[0].count),
      ProductVariant: Number((await client.query('SELECT count(*) FROM "ProductVariant"')).rows[0].count),
      ProductImage: Number((await client.query('SELECT count(*) FROM "ProductImage"')).rows[0].count),
      OptionGroup: Number((await client.query('SELECT count(*) FROM "OptionGroup"')).rows[0].count),
      OptionItem: Number((await client.query('SELECT count(*) FROM "OptionItem"')).rows[0].count),
      ProductOptionGroup: Number((await client.query('SELECT count(*) FROM "ProductOptionGroup"')).rows[0].count),
      Branch: Number((await client.query('SELECT count(*) FROM "Branch"')).rows[0].count),
      RestaurantSettings: Number((await client.query('SELECT count(*) FROM "RestaurantSettings"')).rows[0].count),
    };

    console.log('\nEntity Counts:', counts);

    const expected = {
      Category: 17,
      Section: 26,
      Product: 151,
      ProductVariant: 167,
      ProductImage: 151,
      OptionGroup: 9,
      OptionItem: 20,
      ProductOptionGroup: 30,
      Branch: 2,
      RestaurantSettings: 1
    };

    for (const [entity, exp] of Object.entries(expected)) {
      if (counts[entity] !== exp) {
        errors.push(`COUNT MISMATCH: ${entity} expected ${exp}, found ${counts[entity]}`);
      }
    }

    // 2. Orphan checks
    const orphanSections = await client.query('SELECT id FROM "Section" WHERE "categoryId" NOT IN (SELECT id FROM "Category")');
    if (orphanSections.rows.length > 0) errors.push(`Orphan sections found: ${orphanSections.rows.length}`);

    const orphanProducts = await client.query('SELECT id FROM "Product" WHERE "sectionId" NOT IN (SELECT id FROM "Section")');
    if (orphanProducts.rows.length > 0) errors.push(`Orphan products found: ${orphanProducts.rows.length}`);

    const orphanVariants = await client.query('SELECT id FROM "ProductVariant" WHERE "productId" NOT IN (SELECT id FROM "Product")');
    if (orphanVariants.rows.length > 0) errors.push(`Orphan variants found: ${orphanVariants.rows.length}`);

    const orphanImages = await client.query('SELECT id FROM "ProductImage" WHERE "productId" NOT IN (SELECT id FROM "Product")');
    if (orphanImages.rows.length > 0) errors.push(`Orphan images found: ${orphanImages.rows.length}`);

    const orphanOptionItems = await client.query('SELECT id FROM "OptionItem" WHERE "groupId" NOT IN (SELECT id FROM "OptionGroup")');
    if (orphanOptionItems.rows.length > 0) errors.push(`Orphan option items found: ${orphanOptionItems.rows.length}`);

    const orphanPOGProduct = await client.query('SELECT id FROM "ProductOptionGroup" WHERE "productId" NOT IN (SELECT id FROM "Product")');
    if (orphanPOGProduct.rows.length > 0) errors.push(`Orphan POG (missing Product) found: ${orphanPOGProduct.rows.length}`);

    const orphanPOGGroup = await client.query('SELECT id FROM "ProductOptionGroup" WHERE "groupId" NOT IN (SELECT id FROM "OptionGroup")');
    if (orphanPOGGroup.rows.length > 0) errors.push(`Orphan POG (missing OptionGroup) found: ${orphanPOGGroup.rows.length}`);

    // 3. Test artifacts check
    const testArtifacts = await client.query(`
      SELECT 'Category' as tbl, id, "nameAr" as name FROM "Category" WHERE "nameAr" ILIKE '%zz%' OR slug ILIKE '%zz%' OR id = 'cmws5hw4l00190cvycgrhxma9'
      UNION ALL
      SELECT 'Section' as tbl, id, "titleAr" as name FROM "Section" WHERE "titleAr" ILIKE '%zz%'
      UNION ALL
      SELECT 'Product' as tbl, id, "nameAr" as name FROM "Product" WHERE "nameAr" ILIKE '%zz%'
      UNION ALL
      SELECT 'Branch' as tbl, id, "nameAr" as name FROM "Branch" WHERE "nameAr" ILIKE '%zz%'
    `);
    if (testArtifacts.rows.length > 0) {
      errors.push(`Test artifacts found: ${JSON.stringify(testArtifacts.rows)}`);
    }

    // 4. Branches check
    const branches = await client.query('SELECT id, "nameAr", "nameEn", "isOrderable", "isActive" FROM "Branch" ORDER BY "sortOrder"');
    console.log('\nBranches:', branches.rows);
    if (branches.rows.length !== 2) {
      errors.push(`Expected 2 branches, got ${branches.rows.length}`);
    }

    // 5. Settings check
    const settings = await client.query('SELECT id, "brandNameAr", "deliveryFee", "phoneDisplay" FROM "RestaurantSettings"');
    console.log('\nRestaurant Settings:', settings.rows);
    if (settings.rows.length !== 1 || settings.rows[0].id !== 'default') {
      errors.push('RestaurantSettings singleton mismatch');
    }

    // 6. Admin Users check
    const admins = await client.query('SELECT id, email, role, "isActive", "mustChangePassword" FROM "AdminUser"');
    console.log('\nAdmin Users:', admins.rows);

    // 7. Orders check (PII check)
    const orders = await client.query('SELECT count(*) FROM "Order"');
    const orderItems = await client.query('SELECT count(*) FROM "OrderItem"');
    console.log(`\nOrders count: ${orders.rows[0].count}, OrderItems count: ${orderItems.rows[0].count}`);

    if (errors.length === 0) {
      console.log('\n✅ ALL INTEGRITY CHECKS PASSED PERFECTLY!');
    } else {
      console.error('\n❌ INTEGRITY ERRORS:', errors);
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

verifyIntegrity().catch(err => {
  console.error(err);
  process.exit(1);
});
