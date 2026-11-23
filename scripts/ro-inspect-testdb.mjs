import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env.test.local");
if (!existsSync(envPath)) {
  console.error("[ro-inspect] Missing .env.test.local");
  process.exit(1);
}
dotenv.config({ path: envPath, override: true });
const db = process.env.DATABASE_URL || "";
const FORBIDDEN_TARGETS = ['ep-soft-dawn-bdu5de43', 'ep-withered-bread-bemwq8ns'];
for (const forbidden of FORBIDDEN_TARGETS) {
  if (db.includes(forbidden)) {
    console.error(`[ro-inspect] CRITICAL REFUSAL: DATABASE_URL in .env.test.local points to forbidden/production host: ${forbidden}`);
    process.exit(2);
  }
}
console.error("[ro-inspect] SAFETY STOP: .env.test.local is currently DISABLED for database testing until an isolated test branch is verified.");
process.exit(2);
const pool = new pg.Pool({ connectionString: db, max: 1, connectionTimeoutMillis: 20000 });
try {
  const t = await pool.query("select now() as server_time");
  console.log("[ro-inspect] server_time:", t.rows[0].server_time?.toISOString?.() || t.rows[0].server_time);
  const tables = await pool.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
  console.log("[ro-inspect] public tables count:", tables.rows.length);
  console.log("[ro-inspect] tables:", tables.rows.map((r)=>r.table_name).join(", "));
  // counts (read-only)
  const counts = await pool.query(`
    select
      (select count(*) from "Category") as categories,
      (select count(*) from "Product") as products,
      (select count(*) from "ProductVariant") as product_variants,
      (select count(*) from "OptionGroup") as option_groups,
      (select count(*) from "OptionItem") as option_items,
      (select count(*) from "ProductOptionGroup") as product_option_groups,
      (select count(*) from "Branch") as branches,
      (select count(*) from "RestaurantSettings") as restaurant_settings,
      (select count(*) from "Order") as orders,
      (select count(*) from "OrderItem") as order_items
  `);
  console.log("[ro-inspect] counts:", JSON.stringify(counts.rows[0], null, 0));
  const mig = await pool.query("select migration_name, finished_at, rolled_back_at from \"_prisma_migrations\" order by finished_at nulls last, migration_name limit 30");
  console.log("[ro-inspect] _prisma_migrations (top 30):", JSON.stringify(mig.rows, null, 2));
  await pool.end();
  process.exit(0);
} catch (e) {
  console.error("[ro-inspect] ERROR:", e && typeof e === "object" && "message" in e ? e.message : String(e));
  try { await pool.end(); } catch {}
  process.exit(3);
}
