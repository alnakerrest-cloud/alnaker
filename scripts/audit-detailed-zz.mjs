import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function runDetailedAudit() {
  const client = await pool.connect();
  try {
    const zzProducts = await client.query(`
      SELECT p.id, p."nameAr", p."descAr", p."isVisible", p."isAvailable", p."createdAt",
             s.id as section_id, s."titleAr" as section_title,
             c.id as category_id, c."nameAr" as category_name,
             (SELECT COUNT(*) FROM "ProductVariant" pv WHERE pv."productId" = p.id) as variants,
             (SELECT COUNT(*) FROM "ProductImage" pi WHERE pi."productId" = p.id) as images
      FROM "Product" p
      JOIN "Section" s ON p."sectionId" = s.id
      JOIN "Category" c ON s."categoryId" = c.id
      WHERE p."nameAr" LIKE 'ZZ%'
      ORDER BY p."createdAt" ASC
    `);

    const zzBranches = await client.query(`
      SELECT b.id, b."nameAr", b."nameEn", b."isActive", b."isOrderable", b."cityAr", b."phoneIntl", b."whatsappNumber", b."sortOrder"
      FROM "Branch" b
      WHERE b."nameAr" LIKE 'ZZ%'
      ORDER BY b."sortOrder" ASC
    `);

    const duplicates = await client.query(`
      SELECT p.id, p."nameAr", p."descAr", p."isVisible", p."isAvailable", p."createdAt",
             s."titleAr" as section_title, c."nameAr" as category_name,
             (SELECT json_agg(json_build_object('price', pv.price, 'label', pv."labelAr")) FROM "ProductVariant" pv WHERE pv."productId" = p.id) as variants,
             (SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary")) FROM "ProductImage" pi WHERE pi."productId" = p.id) as images
      FROM "Product" p
      JOIN "Section" s ON p."sectionId" = s.id
      JOIN "Category" c ON s."categoryId" = c.id
      WHERE p."nameAr" IN ('كراميل', 'بطاطس', 'عكاوي')
      ORDER BY p."nameAr", p."createdAt" ASC
    `);

    // Check images HTTP status sample and general format
    const imagesQuery = await client.query(`
      SELECT pi.id, pi.url, pi."publicId", pi."isPrimary", p.id as product_id, p."nameAr" as product_name
      FROM "ProductImage" pi
      LEFT JOIN "Product" p ON pi."productId" = p.id
    `);

    console.log(JSON.stringify({
      zzProducts: zzProducts.rows,
      zzBranches: zzBranches.rows,
      duplicates: duplicates.rows,
      imageStats: {
        total: imagesQuery.rows.length,
        httpsCount: imagesQuery.rows.filter(i => i.url.startsWith('https://') || i.url.startsWith('/')).length,
        cloudinaryCount: imagesQuery.rows.filter(i => i.url.includes('cloudinary.com')).length,
        localCount: imagesQuery.rows.filter(i => i.url.startsWith('/images/')).length,
        orphanedImages: imagesQuery.rows.filter(i => !i.product_id).length,
      }
    }, null, 2));

  } finally {
    client.release();
    await pool.end();
  }
}

runDetailedAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
