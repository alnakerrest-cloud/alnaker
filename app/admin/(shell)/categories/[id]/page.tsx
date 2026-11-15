import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CategoryForm from "../category-form";
import CategoryImageManager from "../category-image-manager";
import { updateCategory } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const c = await prisma.category.findUnique({
    where: { id },
    include: { sections: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } } },
  });
  if (!c) notFound();

  return (
    <>
      <div className="admin-topbar">
        <h1>تعديل: {c.nameAr}</h1>
        <div className="row-actions">
          <Link href={`/admin/products?cat=${c.id}`} className="admin-btn">منتجات هذا القسم</Link>
          <Link href="/admin/categories" className="admin-btn">عودة</Link>
        </div>
      </div>

      <CategoryForm
        action={updateCategory}
        submitLabel="حفظ التعديلات"
        initial={{
          id: c.id,
          nameAr: c.nameAr,
          slug: c.slug,
          icon: c.icon ?? "",
          group: c.group,
          layout: c.layout,
          noteAr: c.noteAr ?? "",
          isVisible: c.isVisible,
          sortOrder: c.sortOrder,
        }}
      />

      <CategoryImageManager categoryId={c.id} imageUrl={c.imageUrl} />

      <section className="admin-panel" style={{ marginTop: 18 }}>
        <div className="admin-panel-header"><h2>العنابر/الأقسام الفرعية ({c.sections.length})</h2></div>
        <div className="admin-table-wrap">
          <table className="admin-table admin-table-cards">
            <thead><tr><th>العنوان</th><th>منتجات</th><th>ترتيب</th></tr></thead>
            <tbody>
              {c.sections.map((s) => (
                <tr key={s.id}>
                  <td className="cell-primary" data-label="العنوان"><strong>{s.titleAr ?? <em style={{ color: "var(--muted)" }}>(بدون عنوان)</em>}</strong></td>
                  <td data-label="عدد المنتجات">{s._count.products} منتج</td>
                  <td data-label="الترتيب">{s.sortOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ padding: "0 18px 16px", color: "var(--muted)", fontSize: 13 }}>
          يُنشأ عنبر افتراضي تلقائيًا للأقسام الجديدة. لإضافة منتجات اختر عنبرًا من نموذج المنتج.
        </p>
      </section>
    </>
  );
}
