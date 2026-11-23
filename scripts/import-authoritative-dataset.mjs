// scripts/import-authoritative-dataset.mjs
// Repeatable, idempotent import procedure for authoritative menu dataset.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";

const FORBIDDEN_TARGETS = [
  "ep-soft-dawn-bdu5de43",     // Protected legacy/source database
  "ep-withered-bread-bemwq8ns" // Retired/suspended cluster
];

async function main() {
  if (process.env.DATABASE_URL) {
    // Keep explicitly provided DATABASE_URL
  } else {
    const envPath = process.env.ENV_FILE || ".env.staging.local";
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) {
    console.error("[import] ERROR: DATABASE_URL is required.");
    process.exit(1);
  }

  let hostname = "";
  try {
    hostname = new URL(dbUrl).hostname;
  } catch (err) {
    console.error("[import] ERROR: Malformed DATABASE_URL:", err.message);
    process.exit(1);
  }

  // Safety check against forbidden production/source databases
  for (const forbidden of FORBIDDEN_TARGETS) {
    if (hostname.includes(forbidden)) {
      console.error(`[import] CRITICAL SAFETY REFUSAL: Target database hostname "${hostname}" matches forbidden target: ${forbidden}`);
      process.exit(2);
    }
  }

  console.log(`[import] Connecting to target database at ${hostname.split(".")[0]}...`);

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 15000,
  });

  const datasetPath = path.resolve(process.cwd(), "CLIENT_DATABASE_IMPORT_DATASET.json");
  if (!fs.existsSync(datasetPath)) {
    console.error("[import] ERROR: CLIENT_DATABASE_IMPORT_DATASET.json not found.");
    process.exit(1);
  }

  const rawData = fs.readFileSync(datasetPath, "utf8");
  const dataset = JSON.parse(rawData);
  const tables = dataset.tables;

  const client = await pool.connect();
  try {
    console.log("[import] Beginning database transaction...");
    await client.query("BEGIN");

    // 1. RestaurantSettings
    console.log(`[import] Upserting RestaurantSettings (${tables.RestaurantSettings.length})...`);
    for (const s of tables.RestaurantSettings) {
      await client.query(`
        INSERT INTO "RestaurantSettings" (
          "id", "brandNameAr", "taglineAr", "phoneDisplay", "phoneIntl",
          "logoUrl", "logoPublicId", "vatNoteAr", "serviceNoteAr",
          "serviceChargePct", "deliveryFee", "currencyAr", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "brandNameAr" = EXCLUDED."brandNameAr",
          "taglineAr" = EXCLUDED."taglineAr",
          "phoneDisplay" = EXCLUDED."phoneDisplay",
          "phoneIntl" = EXCLUDED."phoneIntl",
          "logoUrl" = EXCLUDED."logoUrl",
          "logoPublicId" = EXCLUDED."logoPublicId",
          "vatNoteAr" = EXCLUDED."vatNoteAr",
          "serviceNoteAr" = EXCLUDED."serviceNoteAr",
          "serviceChargePct" = EXCLUDED."serviceChargePct",
          "deliveryFee" = EXCLUDED."deliveryFee",
          "currencyAr" = EXCLUDED."currencyAr",
          "updatedAt" = NOW();
      `, [
        s.id, s.brandNameAr, s.taglineAr, s.phoneDisplay, s.phoneIntl,
        s.logoUrl, s.logoPublicId, s.vatNoteAr, s.serviceNoteAr,
        s.serviceChargePct ? Number(s.serviceChargePct) : null,
        s.deliveryFee ? Number(s.deliveryFee) : null,
        s.currencyAr || "ج.م"
      ]);
    }

    // 2. Branch
    console.log(`[import] Upserting Branches (${tables.Branch.length})...`);
    for (const b of tables.Branch) {
      await client.query(`
        INSERT INTO "Branch" (
          "id", "nameAr", "nameEn", "addressAr", "addressEn", "cityAr",
          "mapQuery", "phoneIntl", "whatsappNumber", "isOrderable",
          "openingHoursAr", "openingHoursEn", "isActive", "sortOrder",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "nameAr" = EXCLUDED."nameAr",
          "nameEn" = EXCLUDED."nameEn",
          "addressAr" = EXCLUDED."addressAr",
          "addressEn" = EXCLUDED."addressEn",
          "cityAr" = EXCLUDED."cityAr",
          "mapQuery" = EXCLUDED."mapQuery",
          "phoneIntl" = EXCLUDED."phoneIntl",
          "whatsappNumber" = EXCLUDED."whatsappNumber",
          "isOrderable" = EXCLUDED."isOrderable",
          "openingHoursAr" = EXCLUDED."openingHoursAr",
          "openingHoursEn" = EXCLUDED."openingHoursEn",
          "isActive" = EXCLUDED."isActive",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW();
      `, [
        b.id, b.nameAr, b.nameEn, b.addressAr, b.addressEn, b.cityAr,
        b.mapQuery, b.phoneIntl, b.whatsappNumber, b.isOrderable ?? true,
        b.openingHoursAr, b.openingHoursEn, b.isActive ?? true, b.sortOrder ?? 0,
        b.createdAt ? new Date(b.createdAt) : new Date()
      ]);
    }

    // 3. Category
    console.log(`[import] Upserting Categories (${tables.Category.length})...`);
    for (const c of tables.Category) {
      await client.query(`
        INSERT INTO "Category" (
          "id", "slug", "nameAr", "icon", "group", "layout", "noteAr",
          "imageUrl", "imagePublicId", "isVisible", "sortOrder",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5::"MenuGroup", $6::"CategoryLayout", $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "slug" = EXCLUDED."slug",
          "nameAr" = EXCLUDED."nameAr",
          "icon" = EXCLUDED."icon",
          "group" = EXCLUDED."group",
          "layout" = EXCLUDED."layout",
          "noteAr" = EXCLUDED."noteAr",
          "imageUrl" = EXCLUDED."imageUrl",
          "imagePublicId" = EXCLUDED."imagePublicId",
          "isVisible" = EXCLUDED."isVisible",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW();
      `, [
        c.id, c.slug, c.nameAr, c.icon, c.group || "FOOD", c.layout || "LIST", c.noteAr,
        c.imageUrl, c.imagePublicId, c.isVisible ?? true, c.sortOrder ?? 0,
        c.createdAt ? new Date(c.createdAt) : new Date()
      ]);
    }

    // 4. Section
    console.log(`[import] Upserting Sections (${tables.Section.length})...`);
    for (const sec of tables.Section) {
      await client.query(`
        INSERT INTO "Section" (
          "id", "categoryId", "titleAr", "sortOrder", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "categoryId" = EXCLUDED."categoryId",
          "titleAr" = EXCLUDED."titleAr",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW();
      `, [
        sec.id, sec.categoryId, sec.titleAr, sec.sortOrder ?? 0,
        sec.createdAt ? new Date(sec.createdAt) : new Date()
      ]);
    }

    // 5. Product
    console.log(`[import] Upserting Products (${tables.Product.length})...`);
    for (const p of tables.Product) {
      await client.query(`
        INSERT INTO "Product" (
          "id", "sectionId", "nameAr", "descAr", "badge", "ingredientsAr",
          "isAvailable", "isVisible", "isFeatured", "sortOrder",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5::"ProductBadge", $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "sectionId" = EXCLUDED."sectionId",
          "nameAr" = EXCLUDED."nameAr",
          "descAr" = EXCLUDED."descAr",
          "badge" = EXCLUDED."badge",
          "ingredientsAr" = EXCLUDED."ingredientsAr",
          "isAvailable" = EXCLUDED."isAvailable",
          "isVisible" = EXCLUDED."isVisible",
          "isFeatured" = EXCLUDED."isFeatured",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW();
      `, [
        p.id, p.sectionId, p.nameAr, p.descAr, p.badge, p.ingredientsAr || [],
        p.isAvailable ?? true, p.isVisible ?? true, p.isFeatured ?? false, p.sortOrder ?? 0,
        p.createdAt ? new Date(p.createdAt) : new Date()
      ]);
    }

    // 6. ProductVariant
    console.log(`[import] Upserting ProductVariants (${tables.ProductVariant.length})...`);
    for (const v of tables.ProductVariant) {
      await client.query(`
        INSERT INTO "ProductVariant" (
          "id", "productId", "labelAr", "price", "maxPrice", "sortOrder", "isAvailable"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("id") DO UPDATE SET
          "productId" = EXCLUDED."productId",
          "labelAr" = EXCLUDED."labelAr",
          "price" = EXCLUDED."price",
          "maxPrice" = EXCLUDED."maxPrice",
          "sortOrder" = EXCLUDED."sortOrder",
          "isAvailable" = EXCLUDED."isAvailable";
      `, [
        v.id, v.productId, v.labelAr, Number(v.price),
        v.maxPrice ? Number(v.maxPrice) : null,
        v.sortOrder ?? 0, v.isAvailable ?? true
      ]);
    }

    // 7. ProductImage
    console.log(`[import] Upserting ProductImages (${tables.ProductImage.length})...`);
    for (const img of tables.ProductImage) {
      await client.query(`
        INSERT INTO "ProductImage" (
          "id", "productId", "url", "publicId", "altAr", "isPrimary", "sortOrder", "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ("id") DO UPDATE SET
          "productId" = EXCLUDED."productId",
          "url" = EXCLUDED."url",
          "publicId" = EXCLUDED."publicId",
          "altAr" = EXCLUDED."altAr",
          "isPrimary" = EXCLUDED."isPrimary",
          "sortOrder" = EXCLUDED."sortOrder";
      `, [
        img.id, img.productId, img.url, img.publicId, img.altAr,
        img.isPrimary ?? false, img.sortOrder ?? 0,
        img.createdAt ? new Date(img.createdAt) : new Date()
      ]);
    }

    // 8. OptionGroup
    console.log(`[import] Upserting OptionGroups (${tables.OptionGroup.length})...`);
    for (const og of tables.OptionGroup) {
      await client.query(`
        INSERT INTO "OptionGroup" (
          "id", "nameAr", "nameEn", "isRequired", "isMulti",
          "minSelect", "maxSelect", "sortOrder", "isActive",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "nameAr" = EXCLUDED."nameAr",
          "nameEn" = EXCLUDED."nameEn",
          "isRequired" = EXCLUDED."isRequired",
          "isMulti" = EXCLUDED."isMulti",
          "minSelect" = EXCLUDED."minSelect",
          "maxSelect" = EXCLUDED."maxSelect",
          "sortOrder" = EXCLUDED."sortOrder",
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW();
      `, [
        og.id, og.nameAr, og.nameEn, og.isRequired ?? false, og.isMulti ?? false,
        og.minSelect ?? 0, og.maxSelect ?? 1, og.sortOrder ?? 0, og.isActive ?? true,
        og.createdAt ? new Date(og.createdAt) : new Date()
      ]);
    }

    // 9. OptionItem
    console.log(`[import] Upserting OptionItems (${tables.OptionItem.length})...`);
    for (const oi of tables.OptionItem) {
      await client.query(`
        INSERT INTO "OptionItem" (
          "id", "groupId", "nameAr", "nameEn", "price",
          "isActive", "sortOrder", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "groupId" = EXCLUDED."groupId",
          "nameAr" = EXCLUDED."nameAr",
          "nameEn" = EXCLUDED."nameEn",
          "price" = EXCLUDED."price",
          "isActive" = EXCLUDED."isActive",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW();
      `, [
        oi.id, oi.groupId, oi.nameAr, oi.nameEn, Number(oi.price || 0),
        oi.isActive ?? true, oi.sortOrder ?? 0,
        oi.createdAt ? new Date(oi.createdAt) : new Date()
      ]);
    }

    // 10. ProductOptionGroup
    console.log(`[import] Upserting ProductOptionGroups (${tables.ProductOptionGroup.length})...`);
    for (const pog of tables.ProductOptionGroup) {
      await client.query(`
        INSERT INTO "ProductOptionGroup" (
          "id", "productId", "groupId", "sortOrder"
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT ("productId", "groupId") DO UPDATE SET
          "sortOrder" = EXCLUDED."sortOrder";
      `, [
        pog.id, pog.productId, pog.groupId, pog.sortOrder ?? 0
      ]);
    }

    // Record audit log
    await client.query(`
      INSERT INTO "AuditLog" ("id", "action", "entityType", "entityId", "summary", "changes", "createdAt")
      VALUES (
        'audit-authoritative-import-' || floor(extract(epoch from now())),
        'IMPORT_AUTHORITATIVE_DATASET',
        'System',
        'release-candidate',
        'Imported authoritative menu dataset from CLIENT_DATABASE_IMPORT_DATASET.json',
        $1::jsonb,
        NOW()
      );
    `, [
      JSON.stringify({
        source: "CLIENT_DATABASE_IMPORT_DATASET.json",
        counts: {
          categories: tables.Category.length,
          sections: tables.Section.length,
          products: tables.Product.length,
          variants: tables.ProductVariant.length,
          images: tables.ProductImage.length,
          optionGroups: tables.OptionGroup.length,
          optionItems: tables.OptionItem.length,
          productOptionGroups: tables.ProductOptionGroup.length,
          branches: tables.Branch.length,
          settings: tables.RestaurantSettings.length,
        },
        timestamp: new Date().toISOString()
      })
    ]);

    await client.query("COMMIT");
    console.log("✅ TRANSACTION COMMITTED SUCCESSFULLY.");

    // Verification queries
    console.log("\n--- POST-IMPORT COUNT VERIFICATION ---");
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM "RestaurantSettings"'),
      client.query('SELECT COUNT(*) FROM "Branch"'),
      client.query('SELECT COUNT(*) FROM "Category"'),
      client.query('SELECT COUNT(*) FROM "Section"'),
      client.query('SELECT COUNT(*) FROM "Product"'),
      client.query('SELECT COUNT(*) FROM "ProductVariant"'),
      client.query('SELECT COUNT(*) FROM "ProductImage"'),
      client.query('SELECT COUNT(*) FROM "OptionGroup"'),
      client.query('SELECT COUNT(*) FROM "OptionItem"'),
      client.query('SELECT COUNT(*) FROM "ProductOptionGroup"'),
    ]);

    console.log(`RestaurantSettings: ${counts[0].rows[0].count} (expected ${tables.RestaurantSettings.length})`);
    console.log(`Branch:             ${counts[1].rows[0].count} (expected ${tables.Branch.length})`);
    console.log(`Category:           ${counts[2].rows[0].count} (expected ${tables.Category.length})`);
    console.log(`Section:            ${counts[3].rows[0].count} (expected ${tables.Section.length})`);
    console.log(`Product:            ${counts[4].rows[0].count} (expected ${tables.Product.length})`);
    console.log(`ProductVariant:     ${counts[5].rows[0].count} (expected ${tables.ProductVariant.length})`);
    console.log(`ProductImage:       ${counts[6].rows[0].count} (expected ${tables.ProductImage.length})`);
    console.log(`OptionGroup:        ${counts[7].rows[0].count} (expected ${tables.OptionGroup.length})`);
    console.log(`OptionItem:         ${counts[8].rows[0].count} (expected ${tables.OptionItem.length})`);
    console.log(`ProductOptionGroup: ${counts[9].rows[0].count} (expected ${tables.ProductOptionGroup.length})`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ TRANSACTION ROLLED BACK DUE TO ERROR:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
