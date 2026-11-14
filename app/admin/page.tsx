import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// /admin يوجّه للوحة إذا كان مسجّل الدخول، وإلا لصفحة الدخول.
export default async function AdminIndex() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/change-password");
  redirect("/admin/dashboard");
}
