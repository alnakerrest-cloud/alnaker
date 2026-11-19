"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod/v3";
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
import { findUserByEmail, findUserById } from "@/lib/users-store";
import { consumeAttempt, resetAttempts } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginState = {
  error?: string;
  success?: boolean;
  mustChangePassword?: boolean;
  role?: string;
};

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

  const user = findUserByEmail(email);
  if (!user || !user.isActive) {
    return { error: "بيانات الدخول غير صحيحة" };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "بيانات الدخول غير صحيحة" };
  }

  resetAttempts(rlKey);

  const sessionResult = await createAtomicLoginSession(user.id, user.passwordHash);
  if (!sessionResult) {
    return { error: "تعذّر إنشاء الجلسة، حاول مرة أخرى." };
  }

  await setSessionCookie(sessionResult.rawToken);

  try {
    await logAction({
      adminId: user.id,
      action: "login",
      entityType: "AdminUser",
      entityId: user.id,
      summaryAr: `تسجيل دخول: ${user.displayName} (${user.role})`,
    });
  } catch (e) {
    // ignore
  }

  return {
    success: true,
    mustChangePassword: Boolean(user.mustChangePassword),
    role: user.role,
  };
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
  formData: FormData
): Promise<ChangePasswordState> {
  const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR", "ORDERS_STAFF"], {
    allowPendingPasswordChange: true,
  });

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

  const user = findUserById(admin.id);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "كلمة المرور الحالية غير صحيحة" };
  }

  const newHash = await hashPassword(newPassword);

  const rotateResult = await executeAtomicPasswordChange(admin.id, user.passwordHash, newHash);
  if (!rotateResult) {
    return { error: "تعذّر تغيير كلمة المرور، حاول مرة أخرى." };
  }

  await setSessionCookie(rotateResult.newRawToken);

  try {
    await logAction({
      adminId: admin.id,
      action: "update",
      entityType: "AdminUser",
      entityId: admin.id,
      summaryAr: "تغيير كلمة المرور بنجاح وتدوير الجلسة ذرياً",
    });
  } catch (e) {
    // ignore
  }

  return { success: true, message: "تم تغيير كلمة المرور بنجاح" };
}

export async function logoutAction(): Promise<void> {
  const who = await getSessionAdmin();
  await destroySession();
  if (who) {
    try {
      await logAction({
        adminId: who.id,
        action: "logout",
        entityType: "AdminUser",
        entityId: who.id,
        summaryAr: `تسجيل خروج: ${who.displayName}`,
      });
    } catch (e) {
      // ignore
    }
  }
  redirect("/admin/login");
}
