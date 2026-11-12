import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: '.env.local' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
async function run() {
  const prods = (await pool.query('SELECT id, "nameAr", "createdAt" FROM "Product" WHERE "nameAr" LIKE \'ZZ%\' OR "nameAr" LIKE \'%اختبار%\'')).rows;
  console.log('Test products before delete:', prods);
  if (prods.length > 0) {
    await pool.query('DELETE FROM "ProductVariant" WHERE "productId" = ANY($1)', [prods.map(p => p.id)]);
    await pool.query('DELETE FROM "ProductImage" WHERE "productId" = ANY($1)', [prods.map(p => p.id)]);
    await pool.query('DELETE FROM "Product" WHERE id = ANY($1)', [prods.map(p => p.id)]);
    console.log('Deleted test products.');
  }

  const cats = (await pool.query('SELECT id, "nameAr" FROM "Category" WHERE "nameAr" LIKE \'ZZ%\' OR "nameAr" LIKE \'%اختبار%\'')).rows;
  console.log('Test categories before delete:', cats);
  if (cats.length > 0) {
    await pool.query('DELETE FROM "Section" WHERE "categoryId" = ANY($1)', [cats.map(c => c.id)]);
    await pool.query('DELETE FROM "Category" WHERE id = ANY($1)', [cats.map(c => c.id)]);
    console.log('Deleted test categories.');
  }

  const pCount = await pool.query('SELECT count(*) FROM "Product"');
  const cCount = await pool.query('SELECT count(*) FROM "Category"');
  console.log('Final DB state:', { products: Number(pCount.rows[0].count), categories: Number(cCount.rows[0].count) });

  await pool.end();
}
run();
