import pg from 'pg';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl?.includes('ep-ancient-hill-beec491j')) {
  console.error("REFUSAL: Target database is NOT the approved staging Neon instance.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: dbUrl, ssl: true });

await pool.query(`
  CREATE TABLE IF NOT EXISTS "OrderStore" (
    "id" TEXT PRIMARY KEY,
    "orderNumber" TEXT,
    "verificationToken" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "idx_orderstore_ordernumber" ON "OrderStore"("orderNumber");
  CREATE INDEX IF NOT EXISTS "idx_orderstore_createdat" ON "OrderStore"("createdAt" DESC);

  CREATE TABLE IF NOT EXISTS "CustomerAddress" (
    "id" TEXT PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "street" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "apartment" TEXT,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "idx_customeraddress_customerid" ON "CustomerAddress"("customerId");

  CREATE TABLE IF NOT EXISTS "CustomerFavorite" (
    "id" TEXT PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("customerId", "productId")
  );
  CREATE INDEX IF NOT EXISTS "idx_customerfavorite_customerid" ON "CustomerFavorite"("customerId");

  CREATE TABLE IF NOT EXISTS "CustomerNotification" (
    "id" TEXT PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "idx_customernotification_customerid" ON "CustomerNotification"("customerId");
`);

console.log("Successfully ensured OrderStore and Customer Hub tables in staging DB.");
await pool.end();
