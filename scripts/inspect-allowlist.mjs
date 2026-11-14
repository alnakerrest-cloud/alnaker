import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

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

async function inspectAllowlist() {
  const client = await pool.connect();
  try {
    console.log("=== INSPECTING ALLOWLIST RECORDS (READ-ONLY) ===");
    
    // 1. Categories
    const catRes = await client.query(
      `SELECT id, "nameAr", slug, "isVisible", "sortOrder", "createdAt" FROM "Category" WHERE id = ANY($1::text[]) ORDER BY id`,
      [ALLOWLIST.categories]
    );
    console.log(`Categories found: ${catRes.rows.length} / ${ALLOWLIST.categories.length}`);
    for (const c of catRes.rows) {
      console.log(`- Cat: ${c.id} | ${c.nameAr} | isVisible: ${c.isVisible} | created: ${c.createdAt.toISOString()}`);
    }

    // 2. Products
    const prodRes = await client.query(
      `SELECT id, "nameAr", "sectionId", "isVisible", "isAvailable", "createdAt" FROM "Product" WHERE id = ANY($1::text[]) ORDER BY id`,
      [ALLOWLIST.products]
    );
    console.log(`\nProducts found: ${prodRes.rows.length} / ${ALLOWLIST.products.length}`);
    for (const p of prodRes.rows) {
      console.log(`- Prod: ${p.id} | ${p.nameAr} | isVisible: ${p.isVisible} | isAvailable: ${p.isAvailable} | created: ${p.createdAt.toISOString()}`);
    }

    // 3. Branches
    const branchRes = await client.query(
      `SELECT id, "nameAr", "cityAr", "isActive", "isOrderable", "sortOrder" FROM "Branch" WHERE id = ANY($1::text[]) ORDER BY id`,
      [ALLOWLIST.branches]
    );
    console.log(`\nBranches found: ${branchRes.rows.length} / ${ALLOWLIST.branches.length}`);
    for (const b of branchRes.rows) {
      console.log(`- Branch: ${b.id} | ${b.nameAr} | isActive: ${b.isActive} | isOrderable: ${b.isOrderable}`);
    }

    const matches = (
      catRes.rows.length === ALLOWLIST.categories.length &&
      prodRes.rows.length === ALLOWLIST.products.length &&
      branchRes.rows.length === ALLOWLIST.branches.length
    );

    console.log(`\nALL 15 RECORDS MATCH AUDIT ALLOWLIST: ${matches}`);

  } finally {
    client.release();
    await pool.end();
  }
}

inspectAllowlist().catch(err => {
  console.error("Inspection error:", err);
  process.exit(1);
});
