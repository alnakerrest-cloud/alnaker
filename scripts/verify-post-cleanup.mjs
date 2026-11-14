import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: '.env.local' });

const ALLOWLIST = {
  categories: [
    'cmwdhd79m001duwvywetp3zw2',
    'cmwdivf42000dh8vyzlvcoevu',
    'cmwdkj576000fbgvypd7lzu1c',
    'cmwdkq3xi0016bgvyjq37zoc7'
  ],
  products: [
    'cmwdjvx7v0035h8vyh6pz26r2',
    'cmwdk9jyb003uh8vy8ce0q70v',
    'cmwdkg3az0002bgvy8izlgdxz',
    'cmwdkm2fc000tbgvy6jhzhsox',
    'cmwdkt29q001nbgvy0p6gb2is',
    'cmwdlcq8m0042bgvyyxxms4yv',
    'cmwdlfxts004cbgvyiilunzc4'
  ],
  branches: [
    'cmwdiydao000ph8vyqkl1bu2y',
    'cmwdjs7b5002yh8vylkgchigr',
    'cmwdk5uzz003nh8vy9bgpnhu8',
    'cmwdkzn2t002gbgvye36mpawx'
  ]
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function verifyPostCleanup() {
  const client = await pool.connect();
  try {
    console.log("=== EXECUTING POST-CLEANUP DATABASE VERIFICATION ===");

    // 1. Check all 15 records directly
    const cats = await client.query(
      `SELECT id, "nameAr", "isVisible" FROM "Category" WHERE id = ANY($1::text[])`,
      [ALLOWLIST.categories]
    );
    const prods = await client.query(
      `SELECT id, "nameAr", "isVisible", "isAvailable" FROM "Product" WHERE id = ANY($1::text[])`,
      [ALLOWLIST.products]
    );
    const branches = await client.query(
      `SELECT id, "nameAr", "isActive", "isOrderable" FROM "Branch" WHERE id = ANY($1::text[])`,
      [ALLOWLIST.branches]
    );

    const allCatsHidden = cats.rows.every(c => c.isVisible === false);
    const allProdsHiddenAndUnavailable = prods.rows.every(p => p.isVisible === false && p.isAvailable === false);
    const allBranchesInactiveAndNotOrderable = branches.rows.every(b => b.isActive === false && b.isOrderable === false);

    console.log(`All 4 Categories hidden (isVisible=false): ${allCatsHidden} (${cats.rows.length}/4 found)`);
    console.log(`All 7 Products hidden & unavailable (isVisible=false, isAvailable=false): ${allProdsHiddenAndUnavailable} (${prods.rows.length}/7 found)`);
    console.log(`All 4 Branches inactive & not orderable (isActive=false, isOrderable=false): ${allBranchesInactiveAndNotOrderable} (${branches.rows.length}/4 found)`);

    // 2. Check total counts (NO RECORDS DELETED)
    const totalCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Product") as products,
        (SELECT COUNT(*) FROM "Category") as categories,
        (SELECT COUNT(*) FROM "Section") as sections,
        (SELECT COUNT(*) FROM "ProductVariant") as variants,
        (SELECT COUNT(*) FROM "Branch") as branches,
        (SELECT COUNT(*) FROM "ProductImage") as images
    `);
    console.log("\nTotal Database Counts (Comparing with initial 158/22/31/174/6/151):");
    console.log(totalCounts.rows[0]);

    // 3. Check public query simulation (What actually appears to customers)
    const publicCategories = await client.query(`
      SELECT c.id, c."nameAr", c.slug, COUNT(p.id) as visible_products_count
      FROM "Category" c
      JOIN "Section" s ON s."categoryId" = c.id
      JOIN "Product" p ON p."sectionId" = s.id
      WHERE c."isVisible" = true AND p."isVisible" = true AND p."isAvailable" = true
      GROUP BY c.id, c."nameAr", c.slug
      ORDER BY c."sortOrder" ASC
    `);
    console.log(`\nPublicly Visible Categories count: ${publicCategories.rows.length} (Expected: exactly 18 real categories)`);
    const zzInPublicCategories = publicCategories.rows.filter(c => c.nameAr.startsWith('ZZ'));
    console.log(`ZZ categories in public query: ${zzInPublicCategories.length}`);

    const publicProducts = await client.query(`
      SELECT p.id, p."nameAr", c."nameAr" as category_name
      FROM "Product" p
      JOIN "Section" s ON p."sectionId" = s.id
      JOIN "Category" c ON s."categoryId" = c.id
      WHERE p."isVisible" = true AND p."isAvailable" = true AND c."isVisible" = true
    `);
    console.log(`\nPublicly Visible Products count: ${publicProducts.rows.length} (Expected: exactly 151 real products)`);
    const zzInPublicProducts = publicProducts.rows.filter(p => p.nameAr.startsWith('ZZ'));
    console.log(`ZZ products in public query: ${zzInPublicProducts.length}`);

    const publicBranches = await client.query(`
      SELECT b.id, b."nameAr", b."nameEn", b."isActive", b."isOrderable"
      FROM "Branch" b
      WHERE b."isActive" = true
      ORDER BY b."sortOrder" ASC
    `);
    console.log(`\nPublicly Active Branches count: ${publicBranches.rows.length} (Expected: exactly 2 real branches)`);
    for (const b of publicBranches.rows) {
      console.log(`- Active Branch: ${b.id} | ${b.nameAr} (${b.nameEn}) | isOrderable: ${b.isOrderable}`);
    }

    // 4. Check duplicate products intact
    const duplicates = await client.query(`
      SELECT p.id, p."nameAr", c."nameAr" as category, pv.price
      FROM "Product" p
      JOIN "Section" s ON p."sectionId" = s.id
      JOIN "Category" c ON s."categoryId" = c.id
      JOIN "ProductVariant" pv ON pv."productId" = p.id
      WHERE p."nameAr" IN ('بطاطس', 'عكاوي', 'كراميل')
      ORDER BY p."nameAr", pv.price ASC
    `);
    console.log(`\nDuplicate products verification: ${duplicates.rows.length} / 6 rows found (3 pairs):`);
    for (const d of duplicates.rows) {
      console.log(`- ${d.nameAr} (${d.category}): ${d.price} EGP (ID: ${d.id})`);
    }

    // 5. Check orphan count
    const orphans = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Product" WHERE "sectionId" NOT IN (SELECT id FROM "Section")) as orphaned_products,
        (SELECT COUNT(*) FROM "ProductImage" WHERE "productId" NOT IN (SELECT id FROM "Product")) as orphaned_images,
        (SELECT COUNT(*) FROM "ProductVariant" WHERE "productId" NOT IN (SELECT id FROM "Product")) as orphaned_variants
    `);
    console.log("\nOrphan Check:", orphans.rows[0]);

  } finally {
    client.release();
    await pool.end();
  }
}

verifyPostCleanup().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
