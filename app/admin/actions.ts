"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod/v3";
import { prisma, withDbRetry, isTransientDbError } from "@/lib/prisma";
import { verifyPassword, createSession, destroySession, getSessionAdmin } from "@/lib/auth";
import { consumeAttempt, resetAttempts } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginState = { error?: string; success?: boolean };

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
  await createSession(admin.id);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await logAction({ adminId: admin.id, action: "login", entityType: "AdminUser", entityId: admin.id, summaryAr: `تسجيل دخول: ${admin.displayName}` });

  return { success: true };
}

export async function logoutAction(): Promise<void> {
  const who = await getSessionAdmin();
  await destroySession();
  if (who) {
    await logAction({ adminId: who.id, action: "logout", entityType: "AdminUser", entityId: who.id, summaryAr: `تسجيل خروج: ${who.displayName}` });
  }
  redirect("/admin/login");
}
