import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Logo from "@/components/Logo";
import PasswordChangeForm from "../password-change-form";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminChangePasswordPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  // إذا لم يكن مطلوباً منه تغيير كلمة المرور، يوجّه مباشرة للوحة
  if (!admin.mustChangePassword) {
    redirect("/admin/dashboard");
  }

  const settings = await prisma.restaurantSettings
    .findUnique({ where: { id: "default" }, select: { logoUrl: true, brandNameAr: true } })
    .catch(() => null);
  const brand = settings?.brandNameAr ?? "قرية الناقر";

  return (
    <main className="admin-login-shell">
      <div className="admin-login-bg" aria-hidden />
      <section className="admin-login-card" style={{ width: "min(500px, 100%)" }}>
        <div className="admin-login-accent" aria-hidden />
        <div className="admin-login-medallion">
          <Logo size={80} src={settings?.logoUrl} />
        </div>
        <h1 className="admin-login-title">تعيين كلمة مرور جديدة</h1>
        <p className="admin-login-sub">
          حساب المالك: <strong dir="ltr">{admin.email}</strong>
        </p>

        <PasswordChangeForm mode="forced" />

        <div style={{ marginTop: "20px", borderTop: "1px solid var(--line)", paddingTop: "14px", textAlign: "center" }}>
          <form action={logoutAction}>
            <button
              type="submit"
              className="admin-btn admin-btn-sm"
              style={{ background: "transparent", border: "none", color: "var(--muted)", textDecoration: "underline", cursor: "pointer" }}
            >
              تسجيل الخروج والعودة لاحقاً
            </button>
          </form>
        </div>

        <p className="admin-login-foot">
          © {new Date().getFullYear()} {brand} — نظام الأمان والحماية
        </p>
      </section>
    </main>
  );
}
