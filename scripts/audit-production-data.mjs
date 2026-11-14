import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function runAudit() {
  const client = await pool.connect();
  try {
    // 1. Overall counts
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Product") as products,
        (SELECT COUNT(*) FROM "Category") as categories,
        (SELECT COUNT(*) FROM "Section") as sections,
        (SELECT COUNT(*) FROM "ProductVariant") as variants,
        (SELECT COUNT(*) FROM "Branch") as branches,
        (SELECT COUNT(*) FROM "ProductImage") as images,
        (SELECT COUNT(*) FROM "Offer") as offers,
        (SELECT COUNT(*) FROM "OptionGroup") as option_groups,
        (SELECT COUNT(*) FROM "OptionItem") as option_items,
        (SELECT COUNT(*) FROM "AuditLog") as audit_logs,
        (SELECT COUNT(*) FROM "ImportJob") as import_jobs,
        (SELECT COUNT(*) FROM "ImportItem") as import_items
    `);

    // 2. Investigate all ZZ Categories
    const zzCategories = await client.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM "Section" s WHERE s."categoryId" = c.id) as section_count,
        (SELECT COUNT(*) FROM "Product" p JOIN "Section" s ON p."sectionId" = s.id WHERE s."categoryId" = c.id) as product_count,
        (SELECT COUNT(*) FROM "OfferCategoryTarget" oct WHERE oct."categoryId" = c.id) as offer_ref_count
      FROM "Category" c
      WHERE c."nameAr" LIKE 'ZZ%' OR c.slug LIKE 'zz%'
      ORDER BY c."createdAt" ASC
    `);

    // 3. Investigate all ZZ Products
    const zzProducts = await client.query(`
      SELECT p.*, s."titleAr" as section_title, c."nameAr" as category_name, c.id as category_id,
        (SELECT COUNT(*) FROM "ProductVariant" pv WHERE pv."productId" = p.id) as variant_count,
        (SELECT COUNT(*) FROM "ProductImage" pi WHERE pi."productId" = p.id) as image_count,
        (SELECT COUNT(*) FROM "OfferProductTarget" opt WHERE opt."productId" = p.id) as offer_ref_count,
        (SELECT COUNT(*) FROM "ProductOptionGroup" pog WHERE pog."productId" = p.id) as option_group_ref_count,
        (SELECT COUNT(*) FROM "AuditLog" al WHERE al."entityId" = p.id) as audit_log_count
      FROM "Product" p
      JOIN "Section" s ON p."sectionId" = s.id
      JOIN "Category" c ON s."categoryId" = c.id
      WHERE p."nameAr" LIKE 'ZZ%'
      ORDER BY p."createdAt" ASC
    `);

    // 4. Investigate all ZZ Branches
    const zzBranches = await client.query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM "OfferLocationTarget" olt WHERE olt."targetLocationId" = b.id) as offer_ref_count,
        (SELECT COUNT(*) FROM "AuditLog" al WHERE al."entityId" = b.id) as audit_log_count
      FROM "Branch" b
      WHERE b."nameAr" LIKE 'ZZ%'
      ORDER BY b."sortOrder" ASC
    `);

    // 5. Investigate Duplicates: كراميل, بطاطس, عكاوي
    const duplicateProducts = await client.query(`
      SELECT p.id, p."nameAr", p."descAr", p."isVisible", p."isAvailable", p."isFeatured", p."createdAt",
             s.id as section_id, s."titleAr" as section_title,
             c.id as category_id, c."nameAr" as category_name,
             (SELECT json_agg(json_build_object('id', pv.id, 'labelAr', pv."labelAr", 'price', pv.price, 'maxPrice', pv."maxPrice", 'isAvailable', pv."isAvailable"))
              FROM "ProductVariant" pv WHERE pv."productId" = p.id) as variants,
             (SELECT json_agg(json_build_object('id', pi.id, 'url', pi.url, 'isPrimary', pi."isPrimary"))
              FROM "ProductImage" pi WHERE pi."productId" = p.id) as images
      FROM "Product" p
      JOIN "Section" s ON p."sectionId" = s.id
      JOIN "Category" c ON s."categoryId" = c.id
      WHERE p."nameAr" IN ('كراميل', 'بطاطس', 'عكاوي')
      ORDER BY p."nameAr", p."createdAt" ASC
    `);

    // 6. Image Integrity Checks
    const allImages = await client.query(`
      SELECT pi.id, pi."productId", pi.url, pi."publicId", pi."isPrimary", pi."sortOrder",
             p."nameAr" as product_name, p."isVisible" as product_visible
      FROM "ProductImage" pi
      LEFT JOIN "Product" p ON pi."productId" = p.id
    `);

    // 7. Products with multiple primary images or no primary images
    const primaryImgCheck = await client.query(`
      SELECT "productId", COUNT(*) as primary_count
      FROM "ProductImage"
      WHERE "isPrimary" = true
      GROUP BY "productId"
      HAVING COUNT(*) != 1
    `);

    // 8. Public visibility of ZZ items
    const publicVisibleZZ = await client.query(`
      SELECT 'Category' as type, id, "nameAr", "isVisible" FROM "Category" WHERE ("nameAr" LIKE 'ZZ%' OR slug LIKE 'zz%') AND "isVisible" = true
      UNION ALL
      SELECT 'Product' as type, p.id, p."nameAr", p."isVisible" FROM "Product" p 
        JOIN "Section" s ON p."sectionId" = s.id 
        JOIN "Category" c ON s."categoryId" = c.id 
      WHERE p."nameAr" LIKE 'ZZ%' AND p."isVisible" = true AND p."isAvailable" = true AND c."isVisible" = true
      UNION ALL
      SELECT 'Branch' as type, id, "nameAr", "isActive" as isVisible FROM "Branch" WHERE "nameAr" LIKE 'ZZ%' AND "isActive" = true
    `);

    console.log(JSON.stringify({
      counts: counts.rows[0],
      zzCategories: zzCategories.rows,
      zzProducts: zzProducts.rows,
      zzBranches: zzBranches.rows,
      duplicateProducts: duplicateProducts.rows,
      imageCount: allImages.rows.length,
      primaryImgCheck: primaryImgCheck.rows,
      publicVisibleZZ: publicVisibleZZ.rows,
      imagesSample: allImages.rows.slice(0, 5)
    }, null, 2));

  } finally {
    client.release();
    await pool.end();
  }
}

runAudit().catch(err => {
  console.error("Audit error:", err);
  process.exit(1);
});
