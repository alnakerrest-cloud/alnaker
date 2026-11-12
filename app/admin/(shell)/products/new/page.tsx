import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import ProductForm from "../product-form";
import { createProduct } from "../actions";
import { getSectionOptions } from "../section-options";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();
  const sections = await getSectionOptions();
  return (
    <>
      <div className="admin-topbar">
        <h1>منتج جديد</h1>
        <Link href="/admin/products" className="admin-btn">عودة</Link>
      </div>
      {sections.length === 0 ? (
        <p className="admin-flash err">لا توجد أقسام بعد. أنشئ قسمًا أولًا من «الأقسام».</p>
      ) : null}
      <ProductForm action={createProduct} sections={sections} submitLabel="إنشاء المنتج" />
    </>
  );
}
