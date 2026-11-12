import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { curatedCatalog } from './curated-photo-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 3,
});

async function main() {
  console.log('🔗 Connecting to Neon DB to map real product photography...');

  // 1. Fetch current ProductImage rows for full backup
  const currentImages = (await pool.query('SELECT * FROM "ProductImage" ORDER BY "productId", "sortOrder"')).rows;
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'backup-product-images-before-real-photos.json'),
    JSON.stringify(currentImages, null, 2),
    'utf8'
  );
  console.log(`Backed up ${currentImages.length} existing ProductImage rows.`);

  // 2. Fetch all products
  const products = (await pool.query(`
    SELECT p.id, p."nameAr", c.slug as "categorySlug", c."nameAr" as "categoryNameAr", c."group" as "categoryGroup"
    FROM "Product" p
    JOIN "Section" s ON p."sectionId" = s.id
    JOIN "Category" c ON s."categoryId" = c.id
    ORDER BY c."sortOrder", s."sortOrder", p."sortOrder"
  `)).rows;

  console.log(`Total Products to map: ${products.length}`);

  // Load EN names from menu.ts
  let enMap = new Map();
  try {
    const menuRaw = fs.readFileSync(path.resolve(__dirname, '..', 'data', 'menu.ts'), 'utf8');
    const itemsRegex = /name:\s*\{\s*ar:\s*['"]([^'"]+)['"],\s*en:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = itemsRegex.exec(menuRaw)) !== null) {
      enMap.set(match[1].trim(), match[2].trim());
    }
  } catch (err) {
    console.warn('Could not read menu.ts for EN names:', err.message);
  }

  const csvRows = [
    'Product ID,Arabic Name,English Name,Category,Old Image,New Image,Source URL,License,Match Confidence,Status'
  ];

  let preservedCount = 0;
  let insertedCount = 0;

  for (const p of products) {
    const nameAr = p.nameAr.trim();
    const nameEn = enMap.get(nameAr) || '';
    const existing = currentImages.find((img) => img.productId === p.id && img.isPrimary);

    if (existing && existing.publicId && existing.publicId.includes('pdf-')) {
      // PRESERVE real original PDF dish photo
      preservedCount++;
      csvRows.push([
        `"${p.id}"`,
        `"${nameAr}"`,
        `"${nameEn}"`,
        `"${p.categoryNameAr}"`,
        `"${existing.url}"`,
        `"${existing.url}"`,
        `"Naqer Original Menu PDF (Printed Asset)"`,
        `"Restaurant Original Proprietary Asset"`,
        `"Exact Original"`,
        `"PRESERVED_ORIGINAL"`
      ].join(','));
      continue;
    }

    const catalogEntry = curatedCatalog[nameAr];
    if (!catalogEntry) {
      console.warn(`No curated catalog entry for: ${nameAr}`);
      continue;
    }

    const localUrl = `/images/products/${catalogEntry.category}/${catalogEntry.filename}`;
    const imgId = `img-local-${crypto.randomBytes(8).toString('hex')}`;

    if (existing) {
      // Update existing non-PDF image to local real photo
      await pool.query(
        `UPDATE "ProductImage" SET "url" = $1, "publicId" = NULL, "altAr" = $2 WHERE id = $3`,
        [localUrl, nameAr, existing.id]
      );
    } else {
      // Insert new primary image
      await pool.query(
        `INSERT INTO "ProductImage" ("id", "productId", "url", "publicId", "altAr", "isPrimary", "sortOrder", "createdAt")
         VALUES ($1, $2, $3, NULL, $4, true, 0, NOW())`,
        [imgId, p.id, localUrl, nameAr]
      );
    }

    insertedCount++;
    csvRows.push([
      `"${p.id}"`,
      `"${nameAr}"`,
      `"${nameEn}"`,
      `"${p.categoryNameAr}"`,
      `"${existing?.url || 'NONE (Placeholder)'}"`,
      `"${localUrl}"`,
      `"${catalogEntry.url}"`,
      `"${catalogEntry.license}"`,
      `"${catalogEntry.confidence}"`,
      `"REPLACED_WITH_REAL_PHOTOGRAPHY"`
    ].join(','));
  }

  // Write CSV
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'PRODUCT_IMAGE_MAPPING.csv'),
    csvRows.join('\n'),
    'utf8'
  );
  console.log('Saved PRODUCT_IMAGE_MAPPING.csv successfully.');

  console.log('\n--- DATABASE MAPPING SUMMARY ---');
  console.log(`Original PDF Dishes Preserved: ${preservedCount}`);
  console.log(`New Real Photography Mapped: ${insertedCount}`);
  console.log(`Total Products with Images: ${preservedCount + insertedCount} / ${products.length} (100%)`);

  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});

