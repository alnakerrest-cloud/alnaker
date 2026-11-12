import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function main() {
  const [
    productsRes,
    categoriesRes,
    sectionsRes,
    variantsRes,
    branchesRes,
    activeOffersRes,
    imagesRes,
    orphanedProductsRes,
    duplicateProductsRes,
    zzProductsRes,
    zzCategoriesRes
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM "Product"'),
    pool.query('SELECT COUNT(*) FROM "Category"'),
    pool.query('SELECT COUNT(*) FROM "Section"'),
    pool.query('SELECT COUNT(*) FROM "ProductVariant"'),
    pool.query('SELECT * FROM "Branch" ORDER BY "sortOrder"'),
    pool.query('SELECT COUNT(*) FROM "Offer" WHERE "isActive" = true'),
    pool.query('SELECT COUNT(*) FROM "ProductImage"'),
    pool.query('SELECT COUNT(*) FROM "Product" WHERE "sectionId" NOT IN (SELECT id FROM "Section")'),
    pool.query('SELECT "nameAr", COUNT(*) as cnt FROM "Product" GROUP BY "nameAr" HAVING COUNT(*) > 1'),
    pool.query('SELECT COUNT(*) FROM "Product" WHERE "nameAr" LIKE \'ZZ%\''),
    pool.query('SELECT COUNT(*) FROM "Category" WHERE "nameAr" LIKE \'ZZ%\'')
  ]);

  console.log(JSON.stringify({
    products: Number(productsRes.rows[0].count),
    categories: Number(categoriesRes.rows[0].count),
    sections: Number(sectionsRes.rows[0].count),
    variants: Number(variantsRes.rows[0].count),
    branchCount: branchesRes.rows.length,
    branches: branchesRes.rows.map(b => ({ id: b.id, nameAr: b.nameAr, nameEn: b.nameEn, isOrderable: b.isOrderable, isActive: b.isActive })),
    activeOffers: Number(activeOffersRes.rows[0].count),
    productImages: Number(imagesRes.rows[0].count),
    orphanedProducts: Number(orphanedProductsRes.rows[0].count),
    duplicateProductsCount: duplicateProductsRes.rows.length,
    duplicateProducts: duplicateProductsRes.rows,
    zzProducts: Number(zzProductsRes.rows[0].count),
    zzCategories: Number(zzCategoriesRes.rows[0].count)
  }, null, 2));

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
