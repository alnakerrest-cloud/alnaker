import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Logo from "@/components/Logo";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getSessionAdmin();
  if (admin) {
    redirect(admin.mustChangePassword ? "/admin/change-password" : "/admin/dashboard");
  }
  const isDev = process.env.NODE_ENV !== "production";
  const settings = await prisma.restaurantSettings.findUnique({ where: { id: "default" }, select: { logoUrl: true, brandNameAr: true } }).catch(() => null);
  const brand = settings?.brandNameAr ?? "قرية الناقر";

  return (
    <main className="admin-login-shell">
      <div className="admin-login-bg" aria-hidden />
      <section className="admin-login-card">
        <div className="admin-login-accent" aria-hidden />
        <div className="admin-login-medallion">
          <Logo size={80} src={settings?.logoUrl} />
        </div>
        <h1 className="admin-login-title">لوحة تحكم {brand}</h1>
        <p className="admin-login-sub">تسجيل دخول الإدارة</p>
        <LoginForm />
        {isDev ? (
          <p className="admin-demo-note" dir="ltr">
            <strong>Dev only:</strong> seed a local admin with <code>npm run db:seed-admin</code>{" "}
            (password comes from <code>SEED_ADMIN_PASSWORD</code>).
          </p>
        ) : null}
        <p className="admin-login-foot">© {new Date().getFullYear()} {brand}</p>
      </section>
    </main>
  );
}
