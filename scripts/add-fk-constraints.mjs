import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connStr = process.env.DATABASE_URL;

async function addForeignKeys() {
  const pool = new pg.Pool({ connectionString: connStr });
  console.log("Adding Foreign Key constraints to Customer tables...");

  const queries = [
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerAddress_customerId_fkey') THEN
        ALTER TABLE "CustomerAddress"
          ADD CONSTRAINT "CustomerAddress_customerId_fkey"
          FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE;
      END IF;
    END $$;`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerFavorite_customerId_fkey') THEN
        ALTER TABLE "CustomerFavorite"
          ADD CONSTRAINT "CustomerFavorite_customerId_fkey"
          FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE;
      END IF;
    END $$;`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerFavorite_productId_fkey') THEN
        ALTER TABLE "CustomerFavorite"
          ADD CONSTRAINT "CustomerFavorite_productId_fkey"
          FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE;
      END IF;
    END $$;`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerNotification_customerId_fkey') THEN
        ALTER TABLE "CustomerNotification"
          ADD CONSTRAINT "CustomerNotification_customerId_fkey"
          FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE;
      END IF;
    END $$;`
  ];

  for (const q of queries) {
    await pool.query(q);
  }
  console.log("✔ Foreign Key constraints successfully verified/added in Neon DB!");
  await pool.end();
}

addForeignKeys().catch(console.error);
