import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";
import AdminSidebar from "./admin-sidebar";

export const dynamic = "force-dynamic";

// يغلّف كل صفحات اللوحة المحميّة داخل مجموعة المسار (shell). يقرأ الجلسة من الكوكي + القاعدة.
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/change-password");

  return (
    <div className="admin-shell">
      <AdminSidebar
        adminName={admin.displayName}
        adminRole={admin.role}
        logoutAction={logoutAction}
      />
      <main className="admin-main">{children}</main>
    </div>
  );
}
