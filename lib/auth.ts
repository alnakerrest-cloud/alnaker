// نواة المصادقة: تجزئة كلمات المرور + جلسات مخزّنة في قاعدة البيانات + كوكي httpOnly موقّع.
// الجلسات تُخزَّن كـ HASH للعشوائية (tokenHash) حتى لا ينفع تسريب قاعدة البيانات في تزوير جلسة.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma, withDbRetry } from "@/lib/prisma";
import type { AdminRole } from "@/lib/generated/prisma/enums";

const COOKIE_NAME = "naqer_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 أيام
const ROUNDS = 12;

export type SessionAdmin = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  mustChangePassword: boolean;
};

/* ---- كلمات المرور ---- */
export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/* ---- رموز الجلسات ---- */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: SESSION_SECRET environment variable is mandatory in production.");
    }
    return "naqer-menu-default-secret-salt-2026";
  }
  return secret;
}

/** Cryptographically keyed HMAC-SHA256 session token hashing */
function hashToken(token: string): string {
  return createHmac("sha256", getSessionSecret()).update(token).digest("hex");
}

/** ينشئ جلسة ويعيّن الكوكي. يُرجع التوكن الخام (يُستخدم فقط للحظة تعيين الكوكي). */
export async function createSession(adminId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { adminId, tokenHash, expiresAt } });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** يقرأ الكوكي ويتحقق من الجلسة في القاعدة. يُرجع بيانات الأدمن أو null. */
export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  // معالج الإقلاع البارد: أعِد المحاولة لثوانٍ قليلة لو كان Neon معلّقًا (كي لا ينهار الـ layout).
  const session = await withDbRetry(() =>
    prisma.session.findUnique({
      where: { tokenHash },
      include: { admin: true },
    }),
  );
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.admin.isActive) return null;
  return {
    id: session.admin.id,
    email: session.admin.email,
    displayName: session.admin.displayName,
    role: session.admin.role,
    mustChangePassword: Boolean(session.admin.mustChangePassword),
  };
}

/** إنهاء الجلسة: حذف الصف + مسح الكوكي (Invalidation فوري وحقيقي). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }
  store.delete(COOKIE_NAME);
}

/** يُبطل كل الجلسات الأخرى لنفس المستخدم مع إبقاء الجلسة الحالية فقط. */
export async function invalidateOtherSessions(adminId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const currentTokenHash = token ? hashToken(token) : null;
  if (currentTokenHash) {
    await prisma.session
      .deleteMany({
        where: {
          adminId,
          tokenHash: { not: currentTokenHash },
        },
      })
      .catch(() => {});
  } else {
    await prisma.session
      .deleteMany({ where: { adminId } })
      .catch(() => {});
  }
}

/**
 * حارس لكل Server Action / Route Handler حسّاس.
 * يطلب جلسة صالحة؛ ويرفض لو الدور غير مسموح.
 * يرفض تلقائيًا أي إجراء للمستخدم الذي يجب عليه تغيير كلمة المرور ما لم يُحدد allowPendingPasswordChange=true.
 */
export async function requireAdmin(
  allowedRoles?: AdminRole[],
  opts?: { allowPendingPasswordChange?: boolean },
): Promise<SessionAdmin> {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (allowedRoles && !allowedRoles.includes(admin.role)) throw new Error("FORBIDDEN");
  if (admin.mustChangePassword && !opts?.allowPendingPasswordChange) {
    redirect("/admin/change-password");
  }
  return admin;
}

/** للـ Server Components: يُرجع الأدمن أو null (الـ layout يحوّل لصفحة الدخول). */
export const getAdminOrNull = getSessionAdmin;

export { COOKIE_NAME };
