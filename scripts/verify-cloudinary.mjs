// فحص اتصال Cloudinary عبر SDK (طابق لسلوك التطبيق): يتحقق من صحة الاعتماد ثم من الرفع والحذف الفعليين.
// يطبع تشخيصًا واضحًا فقط — لا يطبع أي سرّ. يقرأ من .env.local. يحذف أي أثر تجريبي.
// التشغيل:  node scripts/verify-cloudinary.mjs
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, "..", ".env.local") });

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET;

if (!cloud_name || !api_key || !api_secret) {
  console.error("MISSING_CREDENTIALS — عرّف CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET في .env.local");
  process.exit(2);
}
cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

// PNG 1x1 (أثر رمزي فقط، ليس محتوى حقيقيًا).
const PROBE_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function statusOf(e) {
  return e?.http_code ?? e?.response?.status ?? "?";
}

let createdPid = null;
try {
  // 1) تحقق المصادقة (ping)
  const ping = await cloudinary.api.ping();
  console.log("[auth/ping] OK", JSON.stringify(ping).slice(0, 80));

  // 2) رفع فعلي (صلاحية create)
  const up = await cloudinary.uploader.upload(PROBE_URI, {
    folder: "naqer-menu/_connection-test",
    resource_type: "image",
    overwrite: true,
  });
  createdPid = up.public_id;
  console.log("[upload] OK — public_id=", createdPid);

  // 3) حذف فعلي (صلاحية delete) — يتأكد من زوال الأثر
  const del = await cloudinary.uploader.destroy(createdPid, { resource_type: "image" });
  console.log("[destroy] result=", del.result);
  if (del.result !== "ok") {
    console.error("VERDICT: حذفت الصورة لكن الرد غير ok — راجع.");
    process.exit(1);
  }
  console.log("VERDICT: Cloudinary جاهز — المصادقة + الرفع + الحذف كلها ناجحة، وتم حذف الأثر التجريبي.");
  process.exit(0);
} catch (e) {
  const st = statusOf(e);
  const msg = String(e?.message ?? e);
  if (st === 401 || /Sign|auth|credential|Invalid credentials/i.test(msg)) {
    console.error("VERDICT: فشل التحقق (401/bad credentials). راجع cloud_name/api_key/api_secret.");
  } else if (st === 403 || /permission|not allowed/i.test(msg)) {
    console.error("VERDICT: 403 — المفتاح بلا الصلاحيات المطلوبة (create/delete/read).");
  } else {
    console.error("VERDICT: فشل الاختبار. status=", st, "message=", msg.slice(0, 200));
  }
  // تنظيف أخير إن رُفعت صورة وقبل أن يُحذف الأثر
  if (createdPid) {
    try {
      await cloudinary.uploader.destroy(createdPid, { resource_type: "image" });
      console.error("(cleanup) حُذف الأثر التجريبي بعد الفشل.");
    } catch {
      console.error("(cleanup) تعذّر حذف الأثر التجريبي:", createdPid);
    }
  }
  process.exit(1);
}
