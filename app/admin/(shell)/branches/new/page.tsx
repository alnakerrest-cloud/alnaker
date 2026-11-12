import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import BranchForm from "../branch-form";
import { createBranch } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewBranchPage() {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") redirect("/admin/branches");
  return (
    <>
      <div className="admin-topbar">
        <h1>فرع جديد</h1>
        <Link href="/admin/branches" className="admin-btn">عودة</Link>
      </div>
      <BranchForm action={createBranch} submitLabel="إنشاء الفرع" />
    </>
  );
}
