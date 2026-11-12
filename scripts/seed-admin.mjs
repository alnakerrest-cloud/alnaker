// Seed أول مستخدم تجريبي للتطوير فقط (dev-only). Idempotent: يمكن تشغيله أكثر من مرة بأمان.
// لا يُنشئ الحساب تلقائيًا في الإنتاج إلا بقصد صريح عبر ALLOW_DEMO_ADMIN=1.
// Usage: npm run db:seed-admin
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import bcrypt from "bcryptjs";
import pg from "pg";

const DEMO_EMAIL = "admin@naqer-menu.local";
const DEMO_PASSWORD = "CHANGE_ME_DEV_ONLY_PASSWORD";
const DEMO_NAME = "مدير تجريبي";

const isProd = process.env.NODE_ENV === "production";
if (isProd && process.env.ALLOW_DEMO_ADMIN !== "1") {
  console.error("REFUSED: demo admin seed is development-only (set ALLOW_DEMO_ADMIN=1 to override intentionally).");
  process.exit(2);
}

const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true, channelBinding: "require" });
await db.connect();
try {
  const existing = await db.query('select id, "isActive" from "AdminUser" where email=$1', [DEMO_EMAIL]);
  if (existing.rows.length > 0) {
    // تحديث آمن في بيئة التطوير فقط (كلمة المرور + تفعيل الحساب).
    await db.query('update "AdminUser" set "passwordHash"=$1, "isActive"=true, "updatedAt"=now() where email=$2', [hash, DEMO_EMAIL]);
    console.log(`SEED updated existing demo admin: ${DEMO_EMAIL}`);
  } else {
    await db.query(
      `insert into "AdminUser" (id, email, "passwordHash", "displayName", role, "isActive", "createdAt", "updatedAt")
       values (gen_random_uuid(), $1, $2, $3, 'OWNER', true, now(), now())`,
      [DEMO_EMAIL, hash, DEMO_NAME],
    );
    console.log(`SEED created demo admin: ${DEMO_EMAIL}`);
  }
  const count = await db.query('select count(*)::int n from "AdminUser"');
  console.log(`AdminUser total = ${count.rows[0].n}`);
} finally {
  await db.end();
}
