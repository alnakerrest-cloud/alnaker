// سجل التعديلات (Audit Trail). يُنادى داخل كل Server Action للكتابة.
// لا يخزّن أي كلمات مرور أو أسرار أو توكنات — يُصفّي الحقول الحسّاسة تلقائيًا.
import { prisma } from "@/lib/prisma";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "passwordconfirm",
  "token",
  "tokenhash",
  "secret",
  "apisecret",
  "sessionsecret",
]);

/** يحذف المفاتيح الحسّاسة بشكل عشّي قبل التخزين في changes. */
function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

export type AuditInput = {
  adminId: string | null;
  action: "create" | "update" | "delete" | "publish" | "import" | "login" | "logout";
  entityType: string; // Category | Product | ... | Settings | Image | Import
  entityId?: string | null;
  summaryAr?: string | null;
  changes?: { before?: unknown; after?: unknown } | null;
};

/** يسجّل عملية إدارية. لا يفشل العملية الأساسية لو فشل التسجيل (best-effort). */
export async function logAction(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summaryAr ?? null,
        changes: input.changes ? (sanitize(input.changes) as object) : undefined,
      },
    });
  } catch (err) {
    // لا نطبع أي بيانات حسّاسة؛ فقط تنبيه عام.
    console.error("audit log write failed", (err as Error)?.name);
  }
}
