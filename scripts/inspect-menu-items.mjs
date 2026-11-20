import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const prods = await pool.query(`
      SELECT p.id, p."nameAr", p."categoryId", 
             (SELECT json_agg(pv.*) FROM "ProductVariant" pv WHERE pv."productId" = p.id) as variants,
             (SELECT json_agg(pog.*) FROM "ProductOptionGroup" pog WHERE pog."productId" = p.id) as option_groups
      FROM "Product" p
      LIMIT 20;
    `);
    console.log('Sample products from DB:');
    for (const p of prods.rows) {
      console.log(`- ${p.id}: ${p.nameAr}`);
      console.log('  Variants:', p.variants);
      console.log('  Option groups:', p.option_groups);
    }

    const branches = await pool.query(`SELECT id, "nameAr", "isOrderable", "isActive" FROM "Branch";`);
    console.log('\nBranches:', branches.rows);

    const site = await pool.query(`SELECT * FROM "RestaurantSettings" LIMIT 1;`);
    console.log('\nRestaurantSettings:', site.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
