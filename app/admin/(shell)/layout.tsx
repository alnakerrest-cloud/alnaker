import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";
import AdminNav from "./admin-nav";

export const dynamic = "force-dynamic";

// يغلّف كل صفحات اللوحة المحميّة داخل مجموعة المسار (shell). يقرأ الجلسة من الكوكي + القاعدة.
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/change-password");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">قرية الناقر</div>
        <AdminNav fullName={admin.displayName} />
        <form action={logoutAction}>
          <button type="submit" className="admin-btn admin-nav-logout" style={{ width: "100%" }}>
            تسجيل الخروج
          </button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
