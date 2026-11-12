// Phase 2 baseline: read-only row counts to prove additive migrations cause no data loss.
// Usage: node scripts/baseline.mjs   (prints counts, writes nothing, mutates nothing)
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import pg from "pg";

const d = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true, channelBinding: "require" });
await d.connect();
try {
  const r = await d.query(`select
    (select count(*) from "Category")::int cats,
    (select count(*) from "Section")::int secs,
    (select count(*) from "Product")::int prods,
    (select count(*) from "ProductVariant")::int vars,
    (select count(*) from "ProductImage")::int imgs,
    (select count(*) from "Branch")::int br,
    (select count(*) from "RestaurantSettings")::int rs,
    (select count(*) from "AdminUser")::int adm,
    (select count(*) from "AuditLog")::int audit,
    (select count(*) from "ImportJob")::int jobs`);
  console.log("BASELINE " + JSON.stringify(r.rows[0]));
} finally {
  await d.end();
}
