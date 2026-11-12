import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 3,
});

async function q(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function main() {
  const products = await q(`
    SELECT 
      p.id,
      p."nameAr",
      p."descAr",
      p."ingredientsAr",
      p.badge,
      p."isVisible",
      p."isAvailable",
      s.id as "sectionId",
      s."titleAr" as "sectionTitleAr",
      c.id as "categoryId",
      c.slug as "categorySlug",
      c."nameAr" as "categoryNameAr",
      c."group" as "categoryGroup",
      c.layout as "categoryLayout",
      (
        SELECT json_agg(json_build_object('price', v.price, 'labelAr', v."labelAr"))
        FROM "ProductVariant" v 
        WHERE v."productId" = p.id
      ) as variants,
      (
        SELECT json_agg(json_build_object('id', img.id, 'url', img.url, 'publicId', img."publicId", 'isPrimary', img."isPrimary"))
        FROM "ProductImage" img 
        WHERE img."productId" = p.id
      ) as images
    FROM "Product" p
    JOIN "Section" s ON p."sectionId" = s.id
    JOIN "Category" c ON s."categoryId" = c.id
    ORDER BY c."sortOrder" ASC, s."sortOrder" ASC, p."sortOrder" ASC
  `);

  console.log(`Fetched ${products.length} products from Neon DB.`);

  // Load menu.ts for EN names
  let enMap = new Map();
  try {
    const menuRaw = fs.readFileSync(path.resolve(__dirname, '..', 'data', 'menu.ts'), 'utf8');
    // Simple regex parse or fallback
    const itemsRegex = /name:\s*\{\s*ar:\s*['"]([^'"]+)['"],\s*en:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = itemsRegex.exec(menuRaw)) !== null) {
      enMap.set(match[1].trim(), match[2].trim());
    }
  } catch (err) {
    console.warn('Could not read menu.ts for EN matching:', err.message);
  }

  const inventory = products.map((p) => {
    const variants = p.variants || [];
    const images = p.images || [];
    const primaryImg = images.find((i) => i.isPrimary) || images[0];

    const nameEn = enMap.get(p.nameAr.trim()) || '';

    let imageStatus = 'NO_IMAGE';
    let imageSource = 'NONE';

    if (primaryImg && primaryImg.url) {
      if (primaryImg.publicId && primaryImg.publicId.includes('pdf-')) {
        imageStatus = 'PDF_ORIGINAL';
        imageSource = 'PDF_EXTRACT';
      } else if (primaryImg.url.startsWith('/images/')) {
        imageStatus = 'LOCAL';
        imageSource = 'LOCAL_FILE';
      } else if (primaryImg.url.includes('cloudinary')) {
        imageStatus = 'CLOUDINARY_TEST';
        imageSource = 'CLOUDINARY';
      } else {
        imageStatus = 'EXTERNAL';
        imageSource = 'EXTERNAL_URL';
      }
    }

    return {
      id: p.id,
      nameAr: p.nameAr,
      nameEn,
      categorySlug: p.categorySlug,
      categoryNameAr: p.categoryNameAr,
      group: p.categoryGroup, // 'FOOD' or 'DRINKS'
      layout: p.categoryLayout,
      currentImage: primaryImg?.url || '',
      publicId: primaryImg?.publicId || '',
      imageSource,
      imageStatus,
      price: variants[0]?.price ? Number(variants[0].price) : 0,
      variantsCount: variants.length,
      ingredients: p.ingredientsAr || [],
      descAr: p.descAr || '',
    };
  });

  console.log('--- SUMMARY STATS ---');
  console.log(`Total Products: ${inventory.length}`);
  const foodProducts = inventory.filter((i) => i.group === 'FOOD');
  const drinksProducts = inventory.filter((i) => i.group === 'DRINKS');
  console.log(`Food: ${foodProducts.length}, Drinks: ${drinksProducts.length}`);
  const withImages = inventory.filter((i) => i.currentImage).length;
  console.log(`With Image: ${withImages}, Without Image: ${inventory.length - withImages}`);

  const byCat = {};
  for (const item of inventory) {
    if (!byCat[item.categoryNameAr]) {
      byCat[item.categoryNameAr] = {
        slug: item.categorySlug,
        group: item.group,
        total: 0,
        withImg: 0,
      };
    }
    byCat[item.categoryNameAr].total++;
    if (item.currentImage) byCat[item.categoryNameAr].withImg++;
  }
  console.table(byCat);

  fs.writeFileSync(
    path.resolve(__dirname, '..', 'product-inventory-data.json'),
    JSON.stringify(inventory, null, 2),
    'utf8'
  );
  console.log('Saved product-inventory-data.json successfully.');

  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
