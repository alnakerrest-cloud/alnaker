// scripts/execute-targeted-content-import.mjs
// ==============================================================================
// Approved Targeted Atomic Content Import from CLIENT_DATABASE_IMPORT_DATASET.json
// ==============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_HOST_SUBSTR = 'ep-soft-dawn-bdu5de43';
const EXPECTED_DB = 'neondb';
const SHOEIB_BRANCH_ID = 'cmwmi3amp000h4cvy2h30gxzz';

async function main() {
  console.log('================================================================');
  console.log('[TARGETED IMPORT] Starting Authoritative Content Import to Neon');
  console.log('================================================================');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL missing in environment');

  const parsedUrl = new URL(databaseUrl);
  const hostname = parsedUrl.hostname;
  const dbName = parsedUrl.pathname.replace(/^\//, '');

  if (!hostname.includes(EXPECTED_HOST_SUBSTR)) {
    throw new Error(`SAFETY ABORT: Host "${hostname}" does not match expected target "${EXPECTED_HOST_SUBSTR}"`);
  }
  if (dbName.toLowerCase() !== EXPECTED_DB) {
    throw new Error(`SAFETY ABORT: Database "${dbName}" does not match expected "${EXPECTED_DB}"`);
  }
  console.log(`[TARGET GUARD OK] Host: ${hostname} | Database: ${dbName}`);

  // Load authoritative dataset
  const datasetPath = path.resolve(process.cwd(), 'CLIENT_DATABASE_IMPORT_DATASET.json');
  if (!fs.existsSync(datasetPath)) throw new Error('CLIENT_DATABASE_IMPORT_DATASET.json missing');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const tables = dataset.tables;

  console.log('[DATASET LOADED] Target authoritative records to insert:');
  console.log(`  - Category:           ${tables.Category?.length}`);
  console.log(`  - Section:            ${tables.Section?.length}`);
  console.log(`  - Product:            ${tables.Product?.length}`);
  console.log(`  - ProductVariant:     ${tables.ProductVariant?.length}`);
  console.log(`  - ProductImage:       ${tables.ProductImage?.length}`);
  console.log(`  - Branch:             ${tables.Branch?.length}`);
  console.log(`  - OptionGroup:        ${tables.OptionGroup?.length}`);
  console.log(`  - OptionItem:         ${tables.OptionItem?.length}`);
  console.log(`  - ProductOptionGroup: ${tables.ProductOptionGroup?.length}`);
  console.log(`  - RestaurantSettings: ${tables.RestaurantSettings?.length}`);

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();

  try {
    // 1. Capture Pre-Import Sensitive Baseline
    console.log('\n[1/5] Capturing baseline state for AdminUser, OrderStore, and Customers...');
    const preUsersRes = await client.query('SELECT id, email, role, "mustChangePassword" FROM "AdminUser" ORDER BY email ASC');
    const preOrderStoreRes = await client.query('SELECT count(*)::int as count FROM "OrderStore"');
    const preOrderRes = await client.query('SELECT count(*)::int as count FROM "Order"');
    const preCustomerRes = await client.query('SELECT count(*)::int as count FROM "Customer"');
    const preSessionRes = await client.query('SELECT count(*)::int as count FROM "Session"');
    
    const preUserCount = preUsersRes.rows.length;
    const preOrderStoreCount = preOrderStoreRes.rows[0].count;
    const preOrderCount = preOrderRes.rows[0].count;
    const preCustomerCount = preCustomerRes.rows[0].count;
    const preSessionCount = preSessionRes.rows[0].count;

    console.log(`  - Pre-import AdminUser count: ${preUserCount} accounts`);
    for (const u of preUsersRes.rows) {
      console.log(`    • ${u.email} (${u.role}) [mustChangePassword=${u.mustChangePassword}]`);
    }
    console.log(`  - Pre-import OrderStore count: ${preOrderStoreCount} orders`);
    console.log(`  - Pre-import Order count:      ${preOrderCount} orders`);
    console.log(`  - Pre-import Customer count:   ${preCustomerCount} customers`);
    console.log(`  - Pre-import Session count:    ${preSessionCount} sessions`);

    // 2. Verify shoeib branch references
    console.log('\n[2/5] Inspecting branch "shoeib" before safe removal...');
    const shoeibCheck1 = await client.query('SELECT count(*)::int as count FROM "Order" WHERE "branchId" = $1', [SHOEIB_BRANCH_ID]);
    const shoeibCheck2 = await client.query('SELECT count(*)::int as count FROM "OrderStore" WHERE data::text LIKE $1', [`%${SHOEIB_BRANCH_ID}%`]);
    
    if (shoeibCheck1.rows[0].count > 0 || shoeibCheck2.rows[0].count > 0) {
      throw new Error(`SAFETY ABORT: Branch shoeib is referenced in orders (Order: ${shoeibCheck1.rows[0].count}, OrderStore: ${shoeibCheck2.rows[0].count}). Cannot delete.`);
    }
    console.log('  - Confirmed: 0 orders reference branch "shoeib". Safe to delete.');

    // 3. Execute Atomic Transaction
    console.log('\n[3/5] Starting atomic PostgreSQL transaction (BEGIN)...');
    await client.query('BEGIN');

    // Clean out obsolete partial content rows before inserting full authoritative dataset
    console.log('  - Clearing old partial content tables inside transaction...');
    await client.query('DELETE FROM "ProductOptionGroup"');
    await client.query('DELETE FROM "ProductImage"');
    await client.query('DELETE FROM "ProductVariant"');
    await client.query('DELETE FROM "Product"');
    await client.query('DELETE FROM "Section"');
    await client.query('DELETE FROM "Category"');
    await client.query('DELETE FROM "OptionItem"');
    await client.query('DELETE FROM "OptionGroup"');
    await client.query('DELETE FROM "Branch" WHERE id = $1', [SHOEIB_BRANCH_ID]);
    console.log('  - Cleared old partial content rows safely.');

    // Step A: Upsert RestaurantSettings
    console.log(`  - Inserting RestaurantSettings (${tables.RestaurantSettings.length})...`);
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

    // Step B: Insert Branches
    console.log(`  - Inserting Branches (${tables.Branch.length})...`);
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

    // Step C: Insert Categories
    console.log(`  - Inserting Categories (${tables.Category.length})...`);
    for (const c of tables.Category) {
      await client.query(`
        INSERT INTO "Category" (
          "id", "slug", "nameAr", "icon", "group", "layout", "noteAr",
          "imageUrl", "imagePublicId", "isVisible", "sortOrder",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5::"MenuGroup", $6::"CategoryLayout", $7, $8, $9, $10, $11, $12, NOW())
      `, [
        c.id, c.slug, c.nameAr, c.icon, c.group || "FOOD", c.layout || "LIST", c.noteAr,
        c.imageUrl, c.imagePublicId, c.isVisible ?? true, c.sortOrder ?? 0,
        c.createdAt ? new Date(c.createdAt) : new Date()
      ]);
    }

    // Step D: Insert Sections
    console.log(`  - Inserting Sections (${tables.Section.length})...`);
    for (const sec of tables.Section) {
      await client.query(`
        INSERT INTO "Section" (
          "id", "categoryId", "titleAr", "sortOrder", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        sec.id, sec.categoryId, sec.titleAr, sec.sortOrder ?? 0,
        sec.createdAt ? new Date(sec.createdAt) : new Date()
      ]);
    }

    // Step E: Insert Products
    console.log(`  - Inserting Products (${tables.Product.length})...`);
    for (const p of tables.Product) {
      await client.query(`
        INSERT INTO "Product" (
          "id", "sectionId", "nameAr", "descAr", "badge", "ingredientsAr",
          "isAvailable", "isVisible", "isFeatured", "sortOrder",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5::"ProductBadge", $6, $7, $8, $9, $10, $11, NOW())
      `, [
        p.id, p.sectionId, p.nameAr, p.descAr, p.badge, p.ingredientsAr || [],
        p.isAvailable ?? true, p.isVisible ?? true, p.isFeatured ?? false, p.sortOrder ?? 0,
        p.createdAt ? new Date(p.createdAt) : new Date()
      ]);
    }

    // Step F: Insert ProductVariants
    console.log(`  - Inserting ProductVariants (${tables.ProductVariant.length})...`);
    for (const v of tables.ProductVariant) {
      await client.query(`
        INSERT INTO "ProductVariant" (
          "id", "productId", "labelAr", "price", "maxPrice", "sortOrder", "isAvailable"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        v.id, v.productId, v.labelAr, Number(v.price),
        v.maxPrice ? Number(v.maxPrice) : null,
        v.sortOrder ?? 0, v.isAvailable ?? true
      ]);
    }

    // Step G: Insert ProductImages
    console.log(`  - Inserting ProductImages (${tables.ProductImage.length})...`);
    for (const img of tables.ProductImage) {
      await client.query(`
        INSERT INTO "ProductImage" (
          "id", "productId", "url", "publicId", "altAr", "isPrimary", "sortOrder", "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        img.id, img.productId, img.url, img.publicId, img.altAr,
        img.isPrimary ?? false, img.sortOrder ?? 0,
        img.createdAt ? new Date(img.createdAt) : new Date()
      ]);
    }

    // Step H: Insert OptionGroups
    console.log(`  - Inserting OptionGroups (${tables.OptionGroup.length})...`);
    for (const og of tables.OptionGroup) {
      await client.query(`
        INSERT INTO "OptionGroup" (
          "id", "nameAr", "nameEn", "isRequired", "isMulti",
          "minSelect", "maxSelect", "sortOrder", "isActive",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        og.id, og.nameAr, og.nameEn, og.isRequired ?? false, og.isMulti ?? false,
        og.minSelect ?? 0, og.maxSelect ?? 1, og.sortOrder ?? 0, og.isActive ?? true,
        og.createdAt ? new Date(og.createdAt) : new Date()
      ]);
    }

    // Step I: Insert OptionItems
    console.log(`  - Inserting OptionItems (${tables.OptionItem.length})...`);
    for (const oi of tables.OptionItem) {
      await client.query(`
        INSERT INTO "OptionItem" (
          "id", "groupId", "nameAr", "nameEn", "price",
          "isActive", "sortOrder", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        oi.id, oi.groupId, oi.nameAr, oi.nameEn, Number(oi.price || 0),
        oi.isActive ?? true, oi.sortOrder ?? 0,
        oi.createdAt ? new Date(oi.createdAt) : new Date()
      ]);
    }

    // Step J: Insert ProductOptionGroups
    console.log(`  - Inserting ProductOptionGroups (${tables.ProductOptionGroup.length})...`);
    for (const pog of tables.ProductOptionGroup) {
      await client.query(`
        INSERT INTO "ProductOptionGroup" (
          "id", "productId", "groupId", "sortOrder"
        ) VALUES ($1, $2, $3, $4)
      `, [
        pog.id, pog.productId, pog.groupId, pog.sortOrder ?? 0
      ]);
    }

    // Step K: In-Transaction Integrity Assertions
    console.log('\n[4/5] Executing In-Transaction Safety & Integrity Assertions...');

    // 1. Assert AdminUsers strictly unchanged
    const postUsersRes = await client.query('SELECT count(*)::int as count FROM "AdminUser"');
    if (postUsersRes.rows[0].count !== preUserCount) {
      throw new Error(`CRITICAL INTEGRITY VIOLATION: AdminUser count changed from ${preUserCount} to ${postUsersRes.rows[0].count}!`);
    }

    // 2. Assert OrderStore strictly unchanged
    const postOrderStoreRes = await client.query('SELECT count(*)::int as count FROM "OrderStore"');
    if (postOrderStoreRes.rows[0].count !== preOrderStoreCount) {
      throw new Error(`CRITICAL INTEGRITY VIOLATION: OrderStore count changed from ${preOrderStoreCount} to ${postOrderStoreRes.rows[0].count}!`);
    }

    // 3. Assert Order strictly unchanged
    const postOrderRes = await client.query('SELECT count(*)::int as count FROM "Order"');
    if (postOrderRes.rows[0].count !== preOrderCount) {
      throw new Error(`CRITICAL INTEGRITY VIOLATION: Order count changed from ${preOrderCount} to ${postOrderRes.rows[0].count}!`);
    }

    // 4. Assert Customer strictly unchanged
    const postCustomerRes = await client.query('SELECT count(*)::int as count FROM "Customer"');
    if (postCustomerRes.rows[0].count !== preCustomerCount) {
      throw new Error(`CRITICAL INTEGRITY VIOLATION: Customer count changed from ${preCustomerCount} to ${postCustomerRes.rows[0].count}!`);
    }

    // 5. Assert Content Counts Match Dataset Exactly
    const countCategory = (await client.query('SELECT count(*)::int as c FROM "Category"')).rows[0].c;
    const countSection = (await client.query('SELECT count(*)::int as c FROM "Section"')).rows[0].c;
    const countProduct = (await client.query('SELECT count(*)::int as c FROM "Product"')).rows[0].c;
    const countVariant = (await client.query('SELECT count(*)::int as c FROM "ProductVariant"')).rows[0].c;
    const countImage = (await client.query('SELECT count(*)::int as c FROM "ProductImage"')).rows[0].c;
    const countBranch = (await client.query('SELECT count(*)::int as c FROM "Branch"')).rows[0].c;
    const countOptionGroup = (await client.query('SELECT count(*)::int as c FROM "OptionGroup"')).rows[0].c;
    const countOptionItem = (await client.query('SELECT count(*)::int as c FROM "OptionItem"')).rows[0].c;
    const countProductOptionGroup = (await client.query('SELECT count(*)::int as c FROM "ProductOptionGroup"')).rows[0].c;

    if (countCategory !== tables.Category.length) throw new Error(`Category mismatch: ${countCategory} vs ${tables.Category.length}`);
    if (countSection !== tables.Section.length) throw new Error(`Section mismatch: ${countSection} vs ${tables.Section.length}`);
    if (countProduct !== tables.Product.length) throw new Error(`Product mismatch: ${countProduct} vs ${tables.Product.length}`);
    if (countVariant !== tables.ProductVariant.length) throw new Error(`Variant mismatch: ${countVariant} vs ${tables.ProductVariant.length}`);
    if (countImage !== tables.ProductImage.length) throw new Error(`Image mismatch: ${countImage} vs ${tables.ProductImage.length}`);
    if (countBranch !== tables.Branch.length) throw new Error(`Branch mismatch: ${countBranch} vs ${tables.Branch.length}`);
    if (countOptionGroup !== tables.OptionGroup.length) throw new Error(`OptionGroup mismatch: ${countOptionGroup} vs ${tables.OptionGroup.length}`);
    if (countOptionItem !== tables.OptionItem.length) throw new Error(`OptionItem mismatch: ${countOptionItem} vs ${tables.OptionItem.length}`);
    if (countProductOptionGroup !== tables.ProductOptionGroup.length) throw new Error(`ProductOptionGroup mismatch: ${countProductOptionGroup} vs ${tables.ProductOptionGroup.length}`);

    // Audit log
    await client.query(`
      INSERT INTO "AuditLog" ("id", "action", "entityType", "entityId", "summary", "changes", "createdAt")
      VALUES (
        'audit-targeted-content-import-' || floor(extract(epoch from now())),
        'IMPORT_TARGETED_CONTENT',
        'System',
        'production-release',
        'Targeted atomic import of 151 products, 167 variants, 151 images, 2 branches from CLIENT_DATABASE_IMPORT_DATASET.json',
        $1::jsonb,
        NOW()
      );
    `, [
      JSON.stringify({
        categories: countCategory,
        sections: countSection,
        products: countProduct,
        variants: countVariant,
        images: countImage,
        branches: countBranch,
        optionGroups: countOptionGroup,
        optionItems: countOptionItem,
        productOptionGroups: countProductOptionGroup,
        preservedUsers: preUserCount,
        preservedOrders: preOrderStoreCount,
        preservedCustomers: preCustomerCount,
      })
    ]);

    // Commit Transaction
    await client.query('COMMIT');
    console.log('✅ TRANSACTION COMMITTED SUCCESSFULLY.');

    // 5. Post-Commit Summary
    console.log('\n================================================================');
    console.log('[SUCCESS] All Authoritative Content Successfully Imported to Neon');
    console.log('================================================================');
    console.log(`- Categories:          ${countCategory} / 17`);
    console.log(`- Sections:            ${countSection} / 26`);
    console.log(`- Products:            ${countProduct} / 151`);
    console.log(`- ProductVariants:     ${countVariant} / 167`);
    console.log(`- ProductImages:       ${countImage} / 151`);
    console.log(`- Branches:            ${countBranch} / 2 (فرع جمصة + فرع دمياط الجديدة)`);
    console.log(`- OptionGroups:        ${countOptionGroup} / 9`);
    console.log(`- OptionItems:         ${countOptionItem} / 20`);
    console.log(`- ProductOptionGroups: ${countProductOptionGroup} / 30`);
    console.log(`- AdminUsers:          ${postUsersRes.rows[0].count} (Preserved 100%)`);
    console.log(`- OrderStore:          ${postOrderStoreRes.rows[0].count} (Preserved 100%)`);
    console.log(`- Customer:            ${postCustomerRes.rows[0].count} (Preserved 100%)`);
    console.log('================================================================');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ CRITICAL: TRANSACTION ROLLED BACK DUE TO ERROR:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
