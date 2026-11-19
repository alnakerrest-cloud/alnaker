// Prisma Client singleton (Prisma 7 + @prisma/adapter-pg driver adapter for Neon).
// نسخة واحدة لكل عملية (singleton) لتفادي استنفاد اتصالات الـ pooler على بيئة serverless.
//
// لماذا pool مضبوط؟ Neon يعلّق الـ compute تلقائيًا عند الخمول (auto-suspend)، فأول استعلام بعد
// فترة سكون قد يسبق استيقاظ الخادم وترجع pg بخطأ «Can't reach database server» (Prisma P1001).
// هذا ليس خللًا في الكود، بل عارض شبكي مؤقت. لذلك: بركة pg واحدة مستديمة بخيارات تتحمّل الإقلاع
// البارد (مهلة اتصال أطول + keepAlive)، ومساعد withDbRetry يُعيد المحاولة لثوانٍ قليلة عند الأعطال
// المؤقتة فقط. لا نعيد محاولة أخطاء المنطق (مثل P2025 سجل غير موجود).
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { getLocalDbEngine } from "./local-db-engine";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pool?: pg.Pool };

let instance: PrismaClient | null = null;

const MODEL_MAP: Record<string, string> = {
  category: "Category",
  section: "Section",
  product: "Product",
  productVariant: "ProductVariant",
  productImage: "ProductImage",
  branch: "Branch",
  restaurantSettings: "RestaurantSettings",
  offer: "Offer",
  addonGroup: "AddonGroup",
  addon: "Addon",
  optionGroup: "OptionGroup",
  optionItem: "OptionItem",
  productOptionGroup: "ProductOptionGroup",
  auditLog: "AuditLog",
  importJob: "ImportJob",
  order: "Order",
  orderItem: "OrderItem",
};

function getClient(): PrismaClient {
  if (instance) return instance;
  if (globalForPrisma.prisma) {
    instance = globalForPrisma.prisma;
    return instance;
  }

  let connectionString = process.env.DATABASE_URL || process.env["DATABASE_URL "];
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  if (connectionString.includes("ep-withered-bread")) {
    connectionString = connectionString.replace(
      "ep-withered-bread-bemwq8ns-pooler.c-9.us-east-2.aws.neon.tech",
      "ep-soft-dawn-bdu5de43-pooler.c-8.us-east-2.aws.neon.tech"
    );
  }

  // بركة pg واحدة تُعاد استخدامها داخل نفس العملية. القيم مناسبة لـ Neon pooler على serverless.
  const pool =
    globalForPrisma.pool ??
    new pg.Pool({
      connectionString,
      max: 5, // اتصالات متزامنة قليلة — يكفي admin/public ولا يُرهق الـ pooler
      connectionTimeoutMillis: 15_000, // مهلة أطول تمنح compute وقتًا للاستيقاظ بدل الفشل السريع
      idleTimeoutMillis: 30_000,
      keepAlive: true, // إبقاء الوصلة حيّة يقلّل إعادة الـ DNS/connect المتكررة
      ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    });
  // أخطاء الوصلات الخاملة (قطع من طرف Neon) يجب ألا تُسقط العملية.
  pool.on("error", (err) => {
    console.error("[pg-pool] idle connection error:", err.message);
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  instance = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = instance;
  return instance;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (prop === "then") return undefined;

    // Unified Local Mode: if USE_BACKUP_DATA is active (default in local development),
    // delegate all queries and mutations to the LocalDbEngine
    const useLocal = process.env.USE_BACKUP_DATA !== "false";
    if (useLocal) {
      if (prop === "$transaction") {
        return async (arg: any) => {
          if (typeof arg === "function") {
            return await arg(prisma);
          }
          if (Array.isArray(arg)) {
            return await Promise.all(arg);
          }
          return arg;
        };
      }

      if (typeof prop === "string" && MODEL_MAP[prop]) {
        const engine = getLocalDbEngine();
        return engine.getDelegate(MODEL_MAP[prop] as any);
      }
    }

    const client = getClient();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(client) : val;
  },
});

/* ---- إعادة المحاولة للأعطال المؤقتة (cold-start / شبكة) ---- */
const TRANSIENT_CODES = new Set([
  // Node/OS
  "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "EHOSTUNREACH", "ENETUNREACH", "ECONNRESET",
  // Postgres / pg
  "53300", "08000", "08001", "08003", "08004", "08006", "08007", "57P01", "57P02", "57P03",
  // Prisma
  "P1001", "P1017", "P1008",
]);

/** هل هذا الخطأ عارضٌ يستحق إعادة المحاولة؟ (وليس خطأ منطق/بيانات). */
export function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const code = e.code;
  if (typeof code === "string" && TRANSIENT_CODES.has(code)) return true;
  const msg = String(e.message ?? "").toLowerCase();
  return (
    msg.includes("can't reach database server") ||
    msg.includes("cannot connect") ||
    msg.includes("connection terminated") ||
    msg.includes("connection refused") ||
    msg.includes("connection reset") ||
    msg.includes("timeout exceeded")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * ينفّذ دالة استعلام مع إعادة محاولة تصاعدية محدودة عند الأعطال المؤقتة فقط.
 * نافذة افتراضية ≈ 7 ثوانٍ (500+1000+2000+4000) تغطي معظم حالات إقلاع Neon البارد.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseMs?: number } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 5;
  const baseMs = opts.baseMs ?? 500;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // أعِد المحاولة فقط إذا كان الخطأ مؤقتًا وما زالت هناك محاولات متبقية.
      if (!isTransientDbError(err) || i === attempts - 1) throw err;
      await sleep(baseMs * 2 ** i);
    }
  }
  throw lastErr;
}
