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

async function executeDeactivation() {
  const client = await pool.connect();
  try {
    console.log("=== STARTING CONTROLLED TRANSACTION FOR ALLOWLIST DEACTIVATION ===");
    await client.query('BEGIN');

    // 1. Capture BEFORE state
    const beforeCategories = await client.query(
      `SELECT id, "nameAr", "isVisible" FROM "Category" WHERE id = ANY($1::text[]) ORDER BY id`,
      [ALLOWLIST.categories]
    );
    const beforeProducts = await client.query(
      `SELECT id, "nameAr", "isVisible", "isAvailable" FROM "Product" WHERE id = ANY($1::text[]) ORDER BY id`,
      [ALLOWLIST.products]
    );
    const beforeBranches = await client.query(
      `SELECT id, "nameAr", "isActive", "isOrderable" FROM "Branch" WHERE id = ANY($1::text[]) ORDER BY id`,
      [ALLOWLIST.branches]
    );

    if (beforeCategories.rows.length !== 4) {
      throw new Error(`Aborting: Expected 4 categories before update, found ${beforeCategories.rows.length}`);
    }
    if (beforeProducts.rows.length !== 7) {
      throw new Error(`Aborting: Expected 7 products before update, found ${beforeProducts.rows.length}`);
    }
    if (beforeBranches.rows.length !== 4) {
      throw new Error(`Aborting: Expected 4 branches before update, found ${beforeBranches.rows.length}`);
    }

    // 2. Execute Category Deactivation
    const updateCatRes = await client.query(
      `UPDATE "Category" 
       SET "isVisible" = false, "updatedAt" = now() 
       WHERE id = ANY($1::text[]) 
       RETURNING id, "nameAr", "isVisible"`,
      [ALLOWLIST.categories]
    );
    if (updateCatRes.rowCount !== 4) {
      throw new Error(`Rollback triggered: Categories updated count was ${updateCatRes.rowCount}, expected 4`);
    }

    // 3. Execute Product Deactivation
    const updateProdRes = await client.query(
      `UPDATE "Product" 
       SET "isVisible" = false, "isAvailable" = false, "updatedAt" = now() 
       WHERE id = ANY($1::text[]) 
       RETURNING id, "nameAr", "isVisible", "isAvailable"`,
      [ALLOWLIST.products]
    );
    if (updateProdRes.rowCount !== 7) {
      throw new Error(`Rollback triggered: Products updated count was ${updateProdRes.rowCount}, expected 7`);
    }

    // 4. Execute Branch Deactivation
    const updateBranchRes = await client.query(
      `UPDATE "Branch" 
       SET "isActive" = false, "isOrderable" = false, "updatedAt" = now() 
       WHERE id = ANY($1::text[]) 
       RETURNING id, "nameAr", "isActive", "isOrderable"`,
      [ALLOWLIST.branches]
    );
    if (updateBranchRes.rowCount !== 4) {
      throw new Error(`Rollback triggered: Branches updated count was ${updateBranchRes.rowCount}, expected 4`);
    }

    // 5. Commit Transaction
    await client.query('COMMIT');
    console.log("=== TRANSACTION SUCCESSFULLY COMMITTED ===");

    console.log("\n--- MODIFIED CATEGORIES (4) ---");
    for (const c of updateCatRes.rows) {
      console.log(`[Category] ${c.id} | ${c.nameAr} | isVisible: ${c.isVisible}`);
    }

    console.log("\n--- MODIFIED PRODUCTS (7) ---");
    for (const p of updateProdRes.rows) {
      console.log(`[Product] ${p.id} | ${p.nameAr} | isVisible: ${p.isVisible} | isAvailable: ${p.isAvailable}`);
    }

    console.log("\n--- MODIFIED BRANCHES (4) ---");
    for (const b of updateBranchRes.rows) {
      console.log(`[Branch] ${b.id} | ${b.nameAr} | isActive: ${b.isActive} | isOrderable: ${b.isOrderable}`);
    }

    return {
      before: { categories: beforeCategories.rows, products: beforeProducts.rows, branches: beforeBranches.rows },
      after: { categories: updateCatRes.rows, products: updateProdRes.rows, branches: updateBranchRes.rows }
    };

  } catch (err) {
    console.error("TRANSACTION FAILED - INITIATING ROLLBACK:", err.message);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

executeDeactivation().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
