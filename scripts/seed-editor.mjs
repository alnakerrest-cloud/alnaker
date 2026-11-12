// Dev-only: ينشئ أدمن EDITOR مؤقت لاختبار الصلاحيات في المتصفح (CREATOR للمحتوى، بلا حذف/إعدادات/فروع/استيراد).
// Idempotent. Usage: node scripts/seed-editor.mjs
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import bcrypt from "bcryptjs";
import pg from "pg";

const EMAIL = "editor@naqer-menu.local";
const PASSWORD = "CHANGE_ME_DEV_ONLY_PASSWORD";
const NAME = "محرر تجريبي";

const isProd = process.env.NODE_ENV === "production";
if (isProd && process.env.ALLOW_DEMO_ADMIN !== "1") {
  console.error("REFUSED: dev-only. Set ALLOW_DEMO_ADMIN=1 to override intentionally.");
  process.exit(2);
}

const hash = await bcrypt.hash(PASSWORD, 12);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true, channelBinding: "require" });
await db.connect();
try {
  const existing = await db.query('select id from "AdminUser" where email=$1', [EMAIL]);
  if (existing.rows.length > 0) {
    await db.query('update "AdminUser" set "passwordHash"=$1, role=$2, "isActive"=true, "updatedAt"=now() where email=$3', [hash, "EDITOR", EMAIL]);
    console.log(`SEED updated existing editor: ${EMAIL}`);
  } else {
    await db.query(
      `insert into "AdminUser" (id, email, "passwordHash", "displayName", role, "isActive", "createdAt", "updatedAt")
       values (gen_random_uuid(), $1, $2, $3, 'EDITOR', true, now(), now())`,
      [EMAIL, hash, NAME],
    );
    console.log(`SEED created EDITOR: ${EMAIL} / ${PASSWORD}`);
  }
} finally {
  await db.end();
}
