// lib/database-url.ts
// ==============================================================================
// مصدر واحد لحل عنوان قاعدة البيانات على السيرفر.
//
// سبب وجود هذا الملف: كان `lib/prisma.ts` يحوّل تلقائيًا بعيدًا عن عنقود الإنتاج
// القديم المتوقف (ep-withered-bread) بينما كانت مسارات `pg` الخام في orders-store
// و customer-store و customer-hub-store تقرأ DATABASE_URL مباشرة. عندما بقي متغير
// Vercel يشير للعنقود القديم، نجحت قراءات المنيو (Prisma/backup) وفشل حفظ الطلب فقط.
//
// قواعد أمنية ثابتة في هذا الملف:
//   1. لا يوجد أي عنوان اتصال أو كلمة مرور مكتوب داخل الكود المصدري إطلاقًا.
//      كل قيمة تأتي من متغير بيئة على السيرفر فقط (ليس NEXT_PUBLIC_).
//   2. لا تحويل صامت. إذا كان العنوان المضبوط يشير للعنقود المتوقف، يفشل الحل
//      برسالة واضحة؛ ولا يستبدل المضيف بآخر بشكل مخفي.
//   3. التحويل الوحيد المسموح هو إلى NAQER_ACTIVE_DATABASE_URL الذي يضبطه
//      المشغّل صراحة، ويُسجَّل في السجلات حتى لا يكون صامتًا.
//   4. غياب الإعداد يفشل بوضوح في المسارات التي تحتاج قاعدة البيانات، ويسمح
//      بالتشغيل المؤقت (null) في المسارات التي تتعامل مع ذلك صراحة.
//   5. كل عملاء قاعدة البيانات (Prisma + برك pg الثلاث) يستخدمون هذه الدوال،
//      فيستهدفون جميعًا نفس القاعدة المضبوطة.
// ==============================================================================

/** علامة عنقود الإنتاج القديم المتوقف/المحجوز. */
export const RETIRED_PROD_HOST_MARKER = "ep-withered-bread";

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

/** هل مضيف العنوان هو العنقود المتوقف؟ (يفحص المضيف فقط، لا كلمة المرور). */
function isRetiredHost(connectionString: string): boolean {
  try {
    return new URL(connectionString).hostname.includes(RETIRED_PROD_HOST_MARKER);
  } catch {
    // عنوان غير قابل للتحليل: نفحص النص كاملًا حتى لا يمرّ عنوان متوقف صامتًا.
    return connectionString.includes(RETIRED_PROD_HOST_MARKER);
  }
}

/**
 * يعيد عنوان قاعدة البيانات المضبوط، أو null إذا لم يُضبط أي عنوان.
 *
 * الترتيب (متغيرات سيرفر فقط، لا تُرسل للمتصفح):
 *   DATABASE_URL  ->  "DATABASE_URL " (مفتاح قديم بمسافة زائدة)  ->  NAQER_ACTIVE_DATABASE_URL
 *
 * NAQER_ACTIVE_DATABASE_URL هو البديل الصريح الوحيد: يُستخدم فقط عندما يكون
 * DATABASE_URL مفقودًا أو يشير للعنقود المتوقف، ويُسجَّل استخدامه في السجلات.
 * لا توجد قيمة افتراضية مكتوبة في الكود. لا تُطبع قيمة العنوان أبدًا في الأخطاء.
 */
export function getConfiguredDatabaseUrl(): string | null {
  const primary = (process.env.DATABASE_URL || process.env["DATABASE_URL "] || "").trim();
  const fallback = (process.env.NAQER_ACTIVE_DATABASE_URL || "").trim();

  const primaryIsRetired = primary.length > 0 && isRetiredHost(primary);
  const fallbackIsRetired = fallback.length > 0 && isRetiredHost(fallback);

  if (fallbackIsRetired) {
    throw new DatabaseConfigurationError(
      `NAQER_ACTIVE_DATABASE_URL points to the retired Neon cluster ("${RETIRED_PROD_HOST_MARKER}"). ` +
        "Set it to the intended active database; refusing to use it.",
    );
  }

  if (primary && !primaryIsRetired) {
    return primary;
  }

  if (fallback) {
    // قرار صريح من المشغّل، وليس تحويلًا مخفيًا: نُسجّله حتى يظهر في المراجعة.
    console.warn(
      "[database-url] Using explicitly configured NAQER_ACTIVE_DATABASE_URL because DATABASE_URL is " +
        (primaryIsRetired ? "pointing at the retired Neon cluster" : "not set") +
        ".",
    );
    return fallback;
  }

  if (primaryIsRetired) {
    throw new DatabaseConfigurationError(
      `DATABASE_URL points to the retired Neon cluster ("${RETIRED_PROD_HOST_MARKER}") and no ` +
        "NAQER_ACTIVE_DATABASE_URL fallback is configured. Refusing to redirect silently. " +
        "Set DATABASE_URL (or NAQER_ACTIVE_DATABASE_URL) to the intended active database.",
    );
  }

  return null;
}

/**
 * كالسابق لكنه يفشل بوضوح إذا لم يُضبط أي عنوان.
 * يُستخدم في المسارات التي لا يمكنها العمل بدون قاعدة بيانات.
 */
export function resolveDatabaseUrl(): string {
  const url = getConfiguredDatabaseUrl();
  if (!url) {
    throw new DatabaseConfigurationError(
      "No database URL configured. Set the server-side DATABASE_URL " +
        "(or NAQER_ACTIVE_DATABASE_URL) environment variable.",
    );
  }
  return url;
}

/** إعدادات SSL المتوافقة مع Neon، مشتقة من العنوان المضبوط فقط. */
export function pgSslConfig(connectionString: string) {
  const str = connectionString.toLowerCase();
  const requiresSsl =
    str.includes("sslmode=require") ||
    str.includes("sslmode=verify-full") ||
    str.includes("sslmode=verify-ca") ||
    str.includes("ssl=true") ||
    str.includes(".neon.tech");

  return requiresSsl ? { rejectUnauthorized: false } : undefined;
}
