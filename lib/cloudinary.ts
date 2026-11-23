// تكامل Cloudinary — على الخادم فقط. لا يُصدَّر أي سرّ إلى المتصفح.
// المجلدات ثابتة: naqer-menu/products | naqer-menu/categories | naqer-menu/branding
import { v2 as cloudinary } from "cloudinary";

export const RETIRED_CLOUDINARY_ACCOUNT = "damc35hfo";

let configured = false;
function ensureConfig() {
  if (configured) return;
  if (process.env.NAQER_TEST_ENV === "staging" && process.env.STAGING_CLOUDINARY_ENABLED !== "1") {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }
  if (cloud_name === RETIRED_CLOUDINARY_ACCOUNT) {
    throw new Error(
      `RETIRED_CLOUDINARY_ACCOUNT: Account "${RETIRED_CLOUDINARY_ACCOUNT}" is retired. Please configure the client-owned Cloudinary account.`
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

export type UploadedImage = { url: string; publicId: string };

function getBaseFolder(): string {
  return process.env.CLOUDINARY_SECURE_FOLDER || "naqer-menu";
}

function getPrefix(bucket: Bucket): string {
  return `${getBaseFolder()}/${bucket}`;
}
export type Bucket = "products" | "categories" | "branding" | "offers";

/* ---------- سياسة الأمان للرفع ---------- */
// نرفض SVG وغيره من الملفات القابلة للتضمين/التنفيذ؛ نسمح بصور نقطية شائعة فقط.
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > -1 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/** يفحص النوع والحجم والامتداد. يُرجع رسالة خطأ عربية أو null إن كان سليمًا. */
export function validateImage(file: File): string | null {
  if (!file || typeof file.size !== "number") return "لم يتم إرفاق ملف.";
  const mime = (file.type ?? "").toLowerCase();
  const ext = fileExtension(file.name);
  const hasAllowedMime = !!ALLOWED_MIME[mime];
  const hasAllowedExt = ALLOWED_EXT.has(ext);

  if (!hasAllowedMime && !hasAllowedExt) {
    return "صيغة الملف غير مسموحة. المسموح: JPG / PNG / WEBP / GIF / AVIF.";
  }
  // نرفض SVG صراحةً (قد يحمل محتوى قابل للتنفيذ) حتى لو بلّغ المتصفح عن نوعه كصورة.
  if (ext === "svg" || ext === "html" || ext === "htm" || ext === "js") {
    return "صيغة الملف غير مسموحة لأسباب أمنية.";
  }
  if (file.size === 0) return "الملف فارغ.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `حجم الملف يتجاوز الحد المسموح (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB).`;
  }
  return null;
}

/** يرفع ملف صورة (بعد التحقق) إلى مجلد معيّن ويُرجع الرابط الآمن + publicId. */
export async function uploadImage(file: File, bucket: Bucket): Promise<UploadedImage> {
  const err = validateImage(file);
  if (err) throw new UploadError(err);
  ensureConfig();
  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
  try {
    const res = await cloudinary.uploader.upload(dataUri, {
      folder: getPrefix(bucket),
      resource_type: "image",
      overwrite: true,
    });
    return { url: res.secure_url, publicId: res.public_id };
  } catch (e) {
    throw new UploadError(describeUploadError(e));
  }
}

/** يحذف صورة بـ publicId. يُستدعى فقط بعد نجاح استبدال/تأكد. */
export async function destroyImage(publicId: string): Promise<void> {
  if (!publicId) return;
  const base = getBaseFolder();
  if (process.env.NAQER_TEST_ENV === "staging" && !publicId.startsWith(`${base}/`)) {
    console.warn(`[cloudinary] STAGING GUARD: Refusing to delete asset outside staging folder ("${base}/"): ${publicId}`);
    return;
  }
  ensureConfig();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  } catch (e) {
    // لا نُفشل العملية الأساسية بسبب فشل الحذف؛ نكتفي بالتنبيه (يتجنّب orphan لكنه ليس حرجًا).
    console.error("cloudinary destroy failed:", describeUploadError(e));
  }
}

/** خطأ رفع آمن للعرض في الواجهة (رسالة عربية دون تسريب تفاصيل الخادم). */
export class UploadError extends Error {}

function describeUploadError(e: unknown): string {
  const anyErr = e as { http_code?: number; message?: string };
  const status = anyErr?.http_code;
  const msg = String(anyErr?.message ?? "");
  if (status === 403) {
    return "ترفض Cloudinary العملية: مفتاح الـ API بلا صلاحيات رفع/حذف (403 missing permissions). راجع صلاحيات المفتاح في إعدادات Cloudinary.";
  }
  if (status === 401) return "بيانات اعتماد Cloudinary غير صحيحة (401). راجع cloud_name/api_key/api_secret.";
  if (msg.includes("CLOUDINARY_NOT_CONFIGURED")) return "إعدادات Cloudinary غير مكتملة في الخادم.";
  return "تعذّر رفع الصورة إلى Cloudinary. حُفظت بياناتك دون تغيير الصورة.";
}

/* ---------- بوابة فحص الاتصال الحية (مخزّنة مؤقتًا) ---------- */
// نتحقق فعليًا من إمكانية الرفع+الحذف برمز مصغّر، لأن نجاح ping وحده لا يكفي (مفتاح مقيّد الصلاحيات).
const ACCESS_TTL_MS = 60_000;
let accessCache: { ok: boolean; reason?: string; at: number } | null = null;
const PROBE_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export async function verifyCloudinaryAccess(force = false): Promise<{ ok: boolean; reason?: string }> {
  if (!force && accessCache && Date.now() - accessCache.at < ACCESS_TTL_MS) return accessCache;
  try {
    ensureConfig();
    const up = await cloudinary.uploader.upload(PROBE_URI, {
      folder: `${getBaseFolder()}/_connection-test`,
      resource_type: "image",
      overwrite: true,
    });
    await cloudinary.uploader.destroy(up.public_id, { resource_type: "image" }).catch(() => {});
    accessCache = { ok: true, at: Date.now() };
  } catch (e) {
    accessCache = { ok: false, reason: describeUploadError(e), at: Date.now() };
  }
  return accessCache;
}
