// lib/auth.ts
// ==============================================================================
// نواة المصادقة وإدارة دورة حياة الجلسات والصلاحيات (RBAC & Session Lifecycle)
// ==============================================================================

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  findSessionByTokenHash,
  createStoreSession,
  deleteSessionByTokenHash,
  revokeAllUserSessions,
  findUserById,
  touchLastLogin,
  updateUser,
  type AdminRole,
  type StoredUser,
} from "@/lib/users-store";

export type { AdminRole };

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

/* ---- رموز الجلسات وتجزئتها ---- */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return "naqer-menu-production-session-secret-salt-2026";
  }
  return secret;
}

/** تجزئة مشفرة لرمز الجلسة باستخدام HMAC-SHA256 لمنع تزوير الجلسات */
export function hashToken(token: string): string {
  return createHmac("sha256", getSessionSecret()).update(token).digest("hex");
}

/** توقيع بيانات الجلسة رقمياً بـ HMAC-SHA256 لضمان استمرارية الجلسة على serverless حتى عند انقطاع قاعدة البيانات */
export function signSessionPayload(userId: string, expiresAt: number): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${userId}:${expiresAt}:${nonce}`;
  const sig = createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

/** التحقق من صحة التوقيع الرقمي للجلسة */
export function verifySessionPayload(token: string): { userId: string; expiresAt: number } | null {
  try {
    if (!token || !token.includes(".")) return null;
    const [b64Payload, sig] = token.split(".");
    if (!b64Payload || !sig) return null;

    const payload = Buffer.from(b64Payload, "base64url").toString("utf8");
    const expectedSig = createHmac("sha256", getSessionSecret()).update(payload).digest("hex");

    const bufSig = Buffer.from(sig, "hex");
    const bufExpected = Buffer.from(expectedSig, "hex");

    if (bufSig.length !== bufExpected.length) return null;
    if (!timingSafeEqual(bufSig, bufExpected)) return null;

    const [userId, expiresAtStr] = payload.split(":");
    const expiresAt = Number(expiresAtStr);
    if (!userId || !expiresAt || Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }

    return { userId, expiresAt };
  } catch {
    return null;
  }
}

/** توليد رمز جلسة خام مع التجزئة المشفرة وتاريخ الانتهاء */
export function generateSessionToken(adminId?: string): { rawToken: string; tokenHash: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const rawToken = adminId ? signSessionPayload(adminId, expiresAt.getTime()) : randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash, expiresAt };
}

/* ---- إدارة الكوكيز ---- */

/** تعيين كوكي الجلسة للمتصفح */
export async function setSessionCookie(rawToken: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** مسح كوكي الجلسة من المتصفح */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/* ---- العمليات الذرية لتسجيل الدخول وإنشاء الجلسات (Atomic Login) ---- */

export async function createAtomicLoginSession(
  adminId: string,
  expectedPasswordHash: string
): Promise<{ rawToken: string } | null> {
  const user = await findUserById(adminId);
  if (!user || !user.isActive || user.passwordHash !== expectedPasswordHash) {
    return null;
  }

  await touchLastLogin(adminId);

  const { rawToken, tokenHash, expiresAt } = generateSessionToken(adminId);
  await createStoreSession(adminId, tokenHash, expiresAt);

  return { rawToken };
}

/**
 * تغيير كلمة المرور وتدوير الجلسة ذرياً (Atomic Password Change & Session Rotation)
 */
export async function executeAtomicPasswordChange(
  adminId: string,
  currentPasswordHash: string,
  newPasswordHash: string
): Promise<{ newRawToken: string } | null> {
  const user = await findUserById(adminId);
  if (!user || !user.isActive || user.passwordHash !== currentPasswordHash) {
    return null;
  }

  await updateUser(adminId, {
    passwordHash: newPasswordHash,
    mustChangePassword: false,
  });

  const { rawToken, tokenHash, expiresAt } = generateSessionToken(adminId);
  await createStoreSession(adminId, tokenHash, expiresAt);

  return { newRawToken: rawToken };
}

/* ---- التحقق من الجلسات والصلاحيات (Session Validation) ---- */

/**
 * يقرأ الكوكي ويتحقق من سلامة الجلسة في مستودع المستخدمين.
 */
export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);

  // 1. Primary: Try looking up DB/file session by token hash
  try {
    const result = await findSessionByTokenHash(tokenHash);
    if (result && result.user && result.user.isActive) {
      return {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        role: result.user.role,
        mustChangePassword: Boolean(result.user.mustChangePassword),
      };
    }
    // Database query succeeded and verified session is absent, revoked, or expired.
    return null;
  } catch (err) {
    console.warn("[auth] Session hash lookup failed due to DB error, checking signature fallback:", err);
  }

  // 2. Resilient cryptographic fallback (Serverless / Neon quota outage)
  const verified = verifySessionPayload(token);
  if (verified) {
    const user = await findUserById(verified.userId);
    if (user && user.isActive) {
      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        mustChangePassword: Boolean(user.mustChangePassword),
      };
    }
  }

  return null;
}

/**
 * حارس Server Actions والصفحات الحساسة (RBAC Guard):
 * - إذا لم يتم تحديد allowedRoles: يفرض افتراضياً ["OWNER", "ADMIN", "EDITOR"] لمنع موظفي الطلبات ORDERS_STAFF.
 * - إذا كان الدور غير مسموح: يرمي خطأ FORBIDDEN أو يعيد التوجيه.
 */
export async function requireAdmin(
  allowedRoles?: AdminRole[],
  opts?: { allowPendingPasswordChange?: boolean }
): Promise<SessionAdmin> {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  // Default allowed roles: Full admin roles (Blocks ORDERS_STAFF from administrative operations)
  const effectiveAllowed: AdminRole[] = allowedRoles || ["OWNER", "ADMIN", "EDITOR"];

  if (!effectiveAllowed.includes(admin.role)) {
    try {
      const h = await headers();
      const isAction = Boolean(h.get("next-action"));
      if (isAction) {
        throw new Error("FORBIDDEN: غير مصرح لك بتنفيذ هذه العملية");
      }
    } catch (e: any) {
      if (e.message?.startsWith("FORBIDDEN")) throw e;
    }

    if (admin.role === "ORDERS_STAFF") {
      redirect("/admin/orders");
    }
    redirect("/admin/dashboard");
  }

  if (admin.mustChangePassword && !opts?.allowPendingPasswordChange) {
    redirect("/admin/change-password");
  }

  return admin;
}

/* ---- إبطال الجلسات وإنهاء الاتصال (Session Revocation) ---- */

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await deleteSessionByTokenHash(tokenHash);
  }
  store.delete(COOKIE_NAME);
}

export async function revokeAllAdminSessions(adminId: string): Promise<number> {
  return await revokeAllUserSessions(adminId);
}

export const getAdminOrNull = getSessionAdmin;
export { COOKIE_NAME, SESSION_TTL_MS };
