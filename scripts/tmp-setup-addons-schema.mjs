import dotenv from 'dotenv';
import path from 'node:path';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function main() {
  console.log('Applying additive schema updates to Neon DB...');

  // 1. Extend Branch table (all optional/defaulted, no columns with "branch" in name)
  await pool.query(`
    ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT;
    ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
    ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "addressEn" TEXT;
    ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "isOrderable" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "openingHoursAr" TEXT;
    ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "openingHoursEn" TEXT;
  `);
  console.log('Branch columns extended successfully.');

  // 2. Create OptionGroup table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "OptionGroup" (
      "id" TEXT NOT NULL,
      "nameAr" TEXT NOT NULL,
      "nameEn" TEXT,
      "isRequired" BOOLEAN NOT NULL DEFAULT false,
      "isMulti" BOOLEAN NOT NULL DEFAULT false,
      "minSelect" INTEGER NOT NULL DEFAULT 0,
      "maxSelect" INTEGER NOT NULL DEFAULT 1,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "OptionGroup_isActive_sortOrder_idx" ON "OptionGroup"("isActive", "sortOrder");
  `);
  console.log('OptionGroup table ready.');

  // 3. Create OptionItem table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "OptionItem" (
      "id" TEXT NOT NULL,
      "groupId" TEXT NOT NULL,
      "nameAr" TEXT NOT NULL,
      "nameEn" TEXT,
      "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OptionItem_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OptionItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "OptionItem_groupId_sortOrder_idx" ON "OptionItem"("groupId", "sortOrder");
  `);
  console.log('OptionItem table ready.');

  // 4. Create ProductOptionGroup table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "ProductOptionGroup" (
      "id" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "groupId" TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ProductOptionGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ProductOptionGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ProductOptionGroup_productId_groupId_key" UNIQUE ("productId", "groupId")
    );
    CREATE INDEX IF NOT EXISTS "ProductOptionGroup_productId_idx" ON "ProductOptionGroup"("productId");
    CREATE INDEX IF NOT EXISTS "ProductOptionGroup_groupId_idx" ON "ProductOptionGroup"("groupId");
  `);
  console.log('ProductOptionGroup table ready.');

  // Populate initial English names & hours for the two existing branches from curated data
  // Gamasa
  await pool.query(`
    UPDATE "Branch"
    SET "nameEn" = 'Gamasa Branch',
        "addressEn" = 'International Coastal Road, opposite Delta University',
        "openingHoursAr" = 'يومياً: ١٠:٠٠ ص – ١:٠٠ ص',
        "openingHoursEn" = 'Daily: 10:00 AM – 1:00 AM',
        "whatsappNumber" = '+201094965222',
        "isOrderable" = true
    WHERE "nameAr" LIKE '%جمصة%' AND "nameEn" IS NULL;
  `);

  // New Damietta
  await pool.query(`
    UPDATE "Branch"
    SET "nameEn" = 'New Damietta Branch',
        "addressEn" = 'Hady Mall, New Damietta',
        "openingHoursAr" = 'يومياً: ١١:٠٠ ص – ٢:٠٠ ص',
        "openingHoursEn" = 'Daily: 11:00 AM – 2:00 AM',
        "whatsappNumber" = '+201094965222',
        "isOrderable" = true
    WHERE "nameAr" LIKE '%دمياط%' AND "nameEn" IS NULL;
  `);
  console.log('Branches updated with curated initial bilingual info.');

  // Verify information_schema check from tests/05-crud-acceptance.spec.ts:
  const branchCols = await pool.query(`select table_name from information_schema.columns where column_name ilike '%branch%'`);
  console.log('information_schema check (must be 0):', branchCols.rows.length);

  await pool.end();
  console.log('All DB updates complete successfully!');
}

main().catch((err) => {
  console.error('Error applying schema updates:', err);
  process.exit(1);
});

