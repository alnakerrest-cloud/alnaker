import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import CategoryForm from "../category-form";
import { createCategory } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  await requireAdmin();
  return (
    <>
      <div className="admin-topbar">
        <h1>قسم جديد</h1>
        <Link href="/admin/categories" className="admin-btn">عودة</Link>
      </div>
      <CategoryForm action={createCategory} submitLabel="إنشاء القسم" />
    </>
  );
}
