"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod/v3";
import { prisma, withDbRetry, isTransientDbError } from "@/lib/prisma";
import {
  verifyPassword,
  hashPassword,
  createAtomicLoginSession,
  executeAtomicPasswordChange,
  setSessionCookie,
  destroySession,
  getSessionAdmin,
  requireAdmin,
} from "@/lib/auth";
import { consumeAttempt, resetAttempts } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginState = { error?: string; success?: boolean; mustChangePassword?: boolean };

/**
 * يجلب الأدمن بالبريد مع معالج الإقلاع البارد لـ Neon. يعيد:
 *  - { kind: "ok", admin } عند نجاح الاتصال (admin قد يكون null لو البريد غير موجود).
 *  - { kind: "db" } إذا تعطّل الاتصال بعد إعادة المحاولات (عطل مؤقت، وليس كلمة مرور خاطئة).
 * يبقى admin كـ const في المستدعي حتى تعمل تحليلات TS للاختصار الآمن.
 */
async function findAdminByEmail(email: string): Promise<
  | { kind: "ok"; admin: Awaited<ReturnType<typeof prisma.adminUser.findUnique>> }
  | { kind: "db" }
> {
  try {
    const admin = await withDbRetry(() => prisma.adminUser.findUnique({ where: { email } }));
    return { kind: "ok", admin };
  } catch (err) {
    if (isTransientDbError(err)) return { kind: "db" };
    throw err;
  }
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  const { email, password } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rlKey = `${ip}:${email}`;
  const attempt = consumeAttempt(rlKey);
  if (!attempt.ok) {
    return { error: `محاولات كثيرة. انتظر ${attempt.retryAfterSec} ثانية ثم أعد المحاولة.` };
  }

  const fetched = await findAdminByEmail(email);
  if (fetched.kind === "db") {
    // عطل مؤقت في الاتصال — رسالة مختلفة عن كلمة المرور الخاطئة حتى لا نُضلّل المستخدم.
    return { error: "تعذّر الاتصال بقاعدة البيانات، حاول مرة أخرى بعد لحظات." };
  }
  const admin = fetched.admin;
  const ok = admin?.isActive && (await verifyPassword(password, admin.passwordHash));
  if (!ok) {
    // رسالة موحّدة حتى لا نكشف وجود البريد من عدمه.
    return { error: "بيانات الدخول غير صحيحة" };
  }

  resetAttempts(rlKey);

  // تسجيل دخول ذري بالكامل: CAS مشروط بقفل الصف + إنشاء الجلسة داخل نفس المعاملة
  const sessionResult = await createAtomicLoginSession(admin.id, admin.passwordHash);
  if (!sessionResult) {
    // تغيرت كلمة المرور أو أُلغي تفعيل الحساب تزامناً مع تسجيل الدخول — نرفض فوراً دون إنشاء جلسة
    return { error: "بيانات الدخول غير صحيحة" };
  }

  // كتابة الكوكي تتم حصراً بعد نجاح الـ COMMIT التام للمعاملة
  await setSessionCookie(sessionResult.rawToken);
  await logAction({ adminId: admin.id, action: "login", entityType: "AdminUser", entityId: admin.id, summaryAr: `تسجيل دخول: ${admin.displayName}` });

  return { success: true, mustChangePassword: Boolean(admin.mustChangePassword) };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(8, "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف").max(128),
  confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
});

export type ChangePasswordState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const admin = await requireAdmin(["OWNER"], { allowPendingPasswordChange: true });

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { error: "كلمة المرور الجديدة وتأكيدها غير متطابقين" };
  }

  if (currentPassword === newPassword) {
    return { error: "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية" };
  }

  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return { error: "كلمة المرور الجديدة يجب أن تحتوي على حرف ورقم على الأقل" };
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: admin.id },
  });

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "كلمة المرور الحالية غير صحيحة" };
  }

  const newHash = await hashPassword(newPassword);

  // تغيير كلمة المرور وتدوير الجلسة ذرياً (Atomic Password Change & Session Rotation):
  // 1. CAS يتأكد من ثبات الهاش الحالي
  // 2. تحديث passwordHash وإلغاء mustChangePassword
  // 3. إبطال كافة الجلسات السابقة للمستخدم
  // 4. إنشاء جلسة جديدة مدوّرة لمنع تثبيت الجلسة
  const rotateResult = await executeAtomicPasswordChange(admin.id, user.passwordHash, newHash);
  if (!rotateResult) {
    return { error: "تعذّر تغيير كلمة المرور، حاول مرة أخرى." };
  }

  // تدوير الكوكي بعد نجاح المعاملة فقط
  await setSessionCookie(rotateResult.newRawToken);

  await logAction({
    adminId: admin.id,
    action: "update",
    entityType: "AdminUser",
    entityId: admin.id,
    summaryAr: "تغيير كلمة مرور المشرف بنجاح وتدوير الجلسة ذرياً",
  });

  return { success: true, message: "تم تغيير كلمة المرور بنجاح" };
}

export async function logoutAction(): Promise<void> {
  const who = await getSessionAdmin();
  await destroySession();
  if (who) {
    await logAction({ adminId: who.id, action: "logout", entityType: "AdminUser", entityId: who.id, summaryAr: `تسجيل خروج: ${who.displayName}` });
  }
  redirect("/admin/login");
}
