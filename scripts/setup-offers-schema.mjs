import dotenv from 'dotenv';
import path from 'node:path';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function main() {
  console.log('Applying additive Offers schema to Neon DB...');

  // 1. Create OfferType enum if not exists
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "OfferType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'SPECIAL_PRICE', 'BUNDLE', 'BUY_X_GET_Y');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log('OfferType enum ready.');

  // 2. Create Offer table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Offer" (
      "id" TEXT NOT NULL,
      "titleAr" TEXT NOT NULL,
      "titleEn" TEXT,
      "descAr" TEXT,
      "descEn" TEXT,
      "offerType" "OfferType" NOT NULL DEFAULT 'PERCENTAGE',
      "discountValue" DECIMAL(10,2),
      "promoPrice" DECIMAL(10,2),
      "buyQty" INTEGER DEFAULT 1,
      "getQty" INTEGER DEFAULT 1,
      "minOrderAmount" DECIMAL(10,2),
      "minQuantity" INTEGER DEFAULT 1,
      "startDate" TIMESTAMP(3),
      "endDate" TIMESTAMP(3),
      "isActive" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "imageUrl" TEXT,
      "imagePublicId" TEXT,
      "badgeAr" TEXT DEFAULT 'عرض خاص',
      "badgeEn" TEXT DEFAULT 'Special Offer',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "Offer_isActive_sortOrder_idx" ON "Offer"("isActive", "sortOrder");
    CREATE INDEX IF NOT EXISTS "Offer_startDate_endDate_idx" ON "Offer"("startDate", "endDate");
  `);
  console.log('Offer table ready.');

  // 3. Create OfferProductTarget table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "OfferProductTarget" (
      "id" TEXT NOT NULL,
      "offerId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OfferProductTarget_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OfferProductTarget_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OfferProductTarget_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OfferProductTarget_offerId_productId_key" UNIQUE ("offerId", "productId")
    );
    CREATE INDEX IF NOT EXISTS "OfferProductTarget_offerId_idx" ON "OfferProductTarget"("offerId");
    CREATE INDEX IF NOT EXISTS "OfferProductTarget_productId_idx" ON "OfferProductTarget"("productId");
  `);
  console.log('OfferProductTarget table ready.');

  // 4. Create OfferCategoryTarget table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "OfferCategoryTarget" (
      "id" TEXT NOT NULL,
      "offerId" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OfferCategoryTarget_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OfferCategoryTarget_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OfferCategoryTarget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OfferCategoryTarget_offerId_categoryId_key" UNIQUE ("offerId", "categoryId")
    );
    CREATE INDEX IF NOT EXISTS "OfferCategoryTarget_offerId_idx" ON "OfferCategoryTarget"("offerId");
    CREATE INDEX IF NOT EXISTS "OfferCategoryTarget_categoryId_idx" ON "OfferCategoryTarget"("categoryId");
  `);
  console.log('OfferCategoryTarget table ready.');

  // 5. Create OfferLocationTarget table (STRICT: column is targetLocationId, NEVER containing 'branch')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "OfferLocationTarget" (
      "id" TEXT NOT NULL,
      "offerId" TEXT NOT NULL,
      "targetLocationId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OfferLocationTarget_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OfferLocationTarget_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OfferLocationTarget_offerId_targetLocationId_key" UNIQUE ("offerId", "targetLocationId")
    );
    CREATE INDEX IF NOT EXISTS "OfferLocationTarget_offerId_idx" ON "OfferLocationTarget"("offerId");
    CREATE INDEX IF NOT EXISTS "OfferLocationTarget_targetLocationId_idx" ON "OfferLocationTarget"("targetLocationId");
  `);
  console.log('OfferLocationTarget table ready.');

  // Strict schema verification
  const check = await pool.query(`select table_name, column_name from information_schema.columns where column_name ilike '%branch%'`);
  console.log('Strict schema check: columns matching %branch%:', check.rows);
  if (check.rows.length > 0) {
    throw new Error('Violation: found columns matching %branch%!');
  }
  console.log('Strict check PASSED: 0 columns matching %branch%.');

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

