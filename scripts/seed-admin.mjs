// Seed default OWNER user for initial setup. Idempotent: safe to run multiple times.
// Creates the default account only if it does not already exist.
// NEVER resets password or modifies existing accounts on re-runs.
// Usage: npm run db:seed-admin
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import bcrypt from "bcryptjs";
import pg from "pg";

const DEFAULT_EMAIL = "admin@naqer-menu.local";
const DEFAULT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "test1234";
const DEFAULT_NAME = "مدير النظام (الافتراضي)";

const isProd = process.env.NODE_ENV === "production";
if (isProd && process.env.ALLOW_DEFAULT_OWNER !== "1" && process.env.ALLOW_DEMO_ADMIN !== "1") {
  console.error("REFUSED: default OWNER creation in production requires explicit confirmation (set ALLOW_DEFAULT_OWNER=1).");
  process.exit(2);
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true });
await db.connect();
try {
  const existing = await db.query(
    'SELECT id, email, role, "isActive", "mustChangePassword" FROM "AdminUser" WHERE email = $1',
    [DEFAULT_EMAIL]
  );

  if (existing.rows.length > 0) {
    console.log(`[SEED] Account "${DEFAULT_EMAIL}" already exists.`);
    console.log(`[SEED] Existing account credentials preserved — password was NOT reset.`);
  } else {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await db.query(
      `INSERT INTO "AdminUser" (id, email, "passwordHash", "displayName", role, "isActive", "mustChangePassword", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'OWNER', true, true, now(), now())`,
      [DEFAULT_EMAIL, hash, DEFAULT_NAME]
    );
    console.log(`[SEED] Created default OWNER account: "${DEFAULT_EMAIL}" with role=OWNER and mustChangePassword=true.`);
    console.log(`[SEED] First login will require an immediate password change before dashboard access.`);
  }

  const count = await db.query('SELECT count(*)::int as n FROM "AdminUser"');
  console.log(`[SEED] Total administrative accounts: ${count.rows[0].n}`);
} finally {
  await db.end();
}
