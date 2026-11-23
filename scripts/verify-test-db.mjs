import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env.test.local");
if (!existsSync(envPath)) {
  console.error("[verify-test-db] Missing .env.test.local");
  process.exit(1);
}
dotenv.config({ path: envPath, override: true });
const db = process.env.DATABASE_URL || "";
if (!db) {
  console.error("[verify-test-db] DATABASE_URL not set");
  process.exit(1);
}
// Must be the expected testing branch host per the request.
const EXPECTED_HOST = "ep-sparkling-glitter-bdwqquhi-pooler.c-8.us-east-2.aws.neon.tech";
const EXPECTED_PROJECT_ID = "royal-silence-22995540";
const EXPECTED_BRANCH_NAME = "naqer-menu-local-testing";
const FORBIDDEN_TARGETS = ['ep-soft-dawn-bdu5de43', 'ep-withered-bread-bemwq8ns'];
for (const forbidden of FORBIDDEN_TARGETS) {
  if (db.includes(forbidden)) {
    console.error(`[verify-test-db] CRITICAL REFUSAL: DATABASE_URL in .env.test.local points to forbidden/production host: ${forbidden}`);
    process.exit(2);
  }
}
console.error("[verify-test-db] SAFETY STOP: .env.test.local is currently DISABLED for database testing until an isolated test branch is verified.");
process.exit(2);
if (!db.includes("sslmode=")) {
  console.warn("[verify-test-db] Warning: expected sslmode in URL (still continuing only for host check).");
}
const pool = new pg.Pool({ connectionString: db, max: 1, connectionTimeoutMillis: 20000 });
try {
  const r1 = await pool.query(
    "select current_database() as db, current_user as usr, inet_server_addr()::text as hostip, inet_server_port() as port"
  );
  console.log("[verify-test-db] Connected (metadata only):", JSON.stringify(r1.rows[0]));
  // Best-effort Neon/system checks if extensions/tables expose branch info are not guaranteed; we log what we can.
  console.log("[verify-test-db] Expected (per instruction): Neon project", EXPECTED_PROJECT_ID, "branch", EXPECTED_BRANCH_NAME, "(host contains ep-sparkling-glitter-bdwqquhi).");
  console.log("[verify-test-db] IMPORTANT: Positive branch identity (project/branch name) cannot be fully proven from SQL alone unless Neon exposes it; you must confirm in Neon console the branch is naqer-menu-local-testing under project royal-silence-22995540 and is NOT production.");
  await pool.end();
  process.exit(0);
} catch (e) {
  console.error("[verify-test-db] Connection/query failed:", e && typeof e === "object" && "message" in e ? e.message : String(e));
  try { await pool.end(); } catch {}
  process.exit(3);
}
