// lib/auth.ts
// ==============================================================================
// نواة المصادقة وإدارة دورة حياة الجلسات (Unified & Atomic Session Lifecycle)
// ==============================================================================
// المبادئ الأمنية الصارمة:
// 1. الذرية (Atomicity): عمليات Login وPassword Change ومعاملات الجلسات تتم داخل
//    معاملة قاعدة بيانات واحدة تضمن عدم تشتت الحالة.
// 2. التحقق الذري المشروط (Compare-And-Swap): لا تُنشأ أي جلسة إلا بعد تأكيد ثبات
//    passwordHash وحالة النشاط عبر قفل الصف الحصري.
// 3. فصل الكوكيز عن المعاملات (Post-Commit Cookies): لا يُكتب الكوكي في المتصفح إلا
//    بعد نجاح COMMIT للمعاملة تماماً؛ وفي حال حدوث Rollback لا يُصدر أي كوكي.
// 4. تدوير الجلسات (Session Rotation): تغيير كلمة المرور يُبطل الجلسات السابقة ويصدر
//    رمز جلسة جديداً لمنع هجمات تثبيت الجلسة (Session Fixation).
// 5. التخزين الآمن: تخزين HMAC-SHA256 المجزأ فقط لرموز الجلسات في قاعدة البيانات.
// ==============================================================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma, withDbRetry } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
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

/* ---- رموز الجلسات وتجزئتها ---- */
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

/** تجزئة مشفرة لرمز الجلسة باستخدام HMAC-SHA256 لمنع تزوير الجلسات عند تسريب القاعدة */
export function hashToken(token: string): string {
  return createHmac("sha256", getSessionSecret()).update(token).digest("hex");
}

/** توليد رمز جلسة خام مع التجزئة المشفرة وتاريخ الانتهاء */
export function generateSessionToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  return { rawToken, tokenHash, expiresAt };
}

/* ---- إدارة الكوكيز (تُستدعى فقط بعد نجاح الـ COMMIT) ---- */

/** تعيين كوكي الجلسة للمتصفح بعد نجاح المعاملة فقط */
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

/**
 * ينشئ جلسة جديدة ذرياً داخل معامَلة:
 * 1. ينفّذ CAS على صف AdminUser: يطلب قفل الصف ويتأكد أن passwordHash لم يتغير وأن الحساب نشط.
 * 2. إذا فشل الشرط (تغير الهاش أو ألغي التفعيل)، يُلغى كل شيء ويعود بـ null.
 * 3. إذا نجح الشرط، يُنشئ صف الجلسة في جدول Session مستخدماً نفس المعاملة وقبل فك قفل الصف.
 * 4. يُرجع الرمز الخام للتوكن (ولا يُكتب الكوكي هنا بل بعد commit).
 */
export async function createAtomicLoginSession(
  adminId: string,
  expectedPasswordHash: string,
): Promise<{ rawToken: string } | null> {
  return await prisma.$transaction(async (tx) => {
    // 1 & 2: CAS مشروط بقفل حصري للصف في AdminUser
    const casResult = await tx.adminUser.updateMany({
      where: {
        id: adminId,
        passwordHash: expectedPasswordHash,
        isActive: true,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    if (casResult.count !== 1) {
      // الهاش تغير أو الحساب تعطل تزامناً مع فحص bcrypt
      return null;
    }

    // 3: إنشاء الجلسة داخل نفس المعاملة
    const { rawToken, tokenHash, expiresAt } = generateSessionToken();
    await tx.session.create({
      data: {
        adminId,
        tokenHash,
        expiresAt,
      },
    });

    return { rawToken };
  });
}

/**
 * تغيير كلمة المرور وتدوير الجلسة ذرياً (Atomic Password Change & Session Rotation):
 * 1. ينفّذ CAS على AdminUser للتأكد من ثبات الهاش الحالي أثناء العملية وتحديثه للهاش الجديد.
 * 2. يُبطل كافة الجلسات السابقة للمستخدم فوراً داخل المعاملة.
 * 3. يُنشئ جلسة جديدة برمز مدوّر (Rotated Token) لمنع Session Fixation.
 * 4. يُرجع الرمز الجديد ليتم كتابته في الكوكي بعد نجاح الـ Commit.
 */
export async function executeAtomicPasswordChange(
  adminId: string,
  currentPasswordHash: string,
  newPasswordHash: string,
): Promise<{ newRawToken: string } | null> {
  return await prisma.$transaction(async (tx) => {
    // 1. CAS لتحديث كلمة المرور وإلغاء راية الإجبار
    const cas = await tx.adminUser.updateMany({
      where: {
        id: adminId,
        passwordHash: currentPasswordHash,
        isActive: true,
      },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    });

    if (cas.count !== 1) {
      // فشل التحديث المشروط لوجود تعديل متزامن
      return null;
    }

    // 2. إبطال كافة الجلسات السابقة للمستخدم نهائياً
    await tx.session.deleteMany({
      where: { adminId },
    });

    // 3. تدوير الجلسة بإنشاء جلسة جديدة للمسؤول الحالي
    const { rawToken, tokenHash, expiresAt } = generateSessionToken();
    await tx.session.create({
      data: {
        adminId,
        tokenHash,
        expiresAt,
      },
    });

    return { newRawToken: rawToken };
  });
}

/* ---- التحقق من الجلسات والصلاحيات (Session Validation) ---- */

/**
 * يقرأ الكوكي ويتحقق من سلامة الجلسة في قاعدة البيانات.
 * يتحقق من: وجود التوكن، التجزئة المشفرة، عدم انتهاء الصلاحية، نشاط الحساب، وتطابق الملكية.
 * يُرجع بيانات الأدمن أو null فوراً إذا كانت الجلسة مبطلة أو غير صالحة.
 */
export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);

  // استعلام الجلسة مع معالج الإقلاع البارد لـ Neon
  const session = await withDbRetry(() =>
    prisma.session.findUnique({
      where: { tokenHash },
      include: { admin: true },
    }),
  );

  if (!session) return null;

  // التحقق من الصلاحية الزمنية
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // التحقق من حالة المستخدم وربط الملكية
  if (!session.admin || !session.admin.isActive || session.admin.id !== session.adminId) {
    return null;
  }

  return {
    id: session.admin.id,
    email: session.admin.email,
    displayName: session.admin.displayName,
    role: session.admin.role,
    mustChangePassword: Boolean(session.admin.mustChangePassword),
  };
}

/**
 * حارس Server Actions والصفحات الحساسة:
 * يطلب جلسة صالحة؛ ويرفض لو الدور غير مسموح.
 * يحول إجبارياً إلى /admin/change-password إذا كان mustChangePassword=true.
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

/* ---- إبطال الجلسات وإنهاء الاتصال (Session Revocation) ---- */

/**
 * إنهاء الجلسة الحالية:
 * حذف صف الجلسة من قاعدة البيانات ومسح الكوكي من المتصفح فوراً.
 */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session
      .deleteMany({ where: { tokenHash } })
      .catch(() => {});
  }
  store.delete(COOKIE_NAME);
}

/**
 * إبطال كافة الجلسات المسجلة لمستخدم معين:
 * يُستخدم عند تغيير كلمة المرور، أو تعطيل الحساب، أو إعادة التعيين الإدارية.
 */
export async function revokeAllAdminSessions(
  adminId: string,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const client = tx ?? prisma;
  const res = await client.session.deleteMany({
    where: { adminId },
  });
  return res.count;
}

/**
 * @deprecated غير مستخدمة في التطبيق. استخدم `executeAtomicPasswordChange` لضمان الذرية وتدوير الجلسات وحذفها داخل نفس المعاملة.
 */
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

/** دالة مساعدة متوافقة للمكونات: تُرجع الأدمن أو null */
export const getAdminOrNull = getSessionAdmin;

/**
 * @deprecated غير مستخدمة في التطبيق. استخدم `createAtomicLoginSession` لضمان قفل الصف وشرط CAS ومنع Race Conditions.
 */
export async function createSession(adminId: string): Promise<void> {
  const { rawToken, tokenHash, expiresAt } = generateSessionToken();
  await prisma.session.create({ data: { adminId, tokenHash, expiresAt } });
  await setSessionCookie(rawToken);
}

export { COOKIE_NAME, SESSION_TTL_MS };
