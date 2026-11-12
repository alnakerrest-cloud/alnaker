import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CategoryRowActions from "./row-actions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string }>;
}) {
  const admin = await requireAdmin();
  const canDelete = admin.role === "OWNER";
  const { q, group } = await searchParams;

  const cats = await prisma.category.findMany({
    where: {
      AND: [
        q ? { nameAr: { contains: q, mode: "insensitive" } } : {},
        group === "FOOD" || group === "DRINKS" ? { group } : {},
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { sections: true } }, sections: { select: { products: true } } },
  });

  const productCount = (c: (typeof cats)[number]) => c.sections.reduce((a, s) => a + s.products.length, 0);

  return (
    <>
      <div className="admin-topbar">
        <h1>الأقسام</h1>
        <Link href="/admin/categories/new" className="admin-btn admin-btn-primary">+ قسم جديد</Link>
      </div>

      <form className="admin-panel" style={{ marginBottom: 18 }} method="GET" action="/admin/categories">
        <div className="admin-panel-header">
          <div className="admin-toolbar">
            <input type="search" name="q" defaultValue={q ?? ""} placeholder="ابحث باسم القسم…" />
            <select name="group" defaultValue={group ?? ""}>
              <option value="">كل المجموعات</option>
              <option value="FOOD">أطعمة</option>
              <option value="DRINKS">مشروبات</option>
            </select>
            <button className="admin-btn" type="submit">تطبيق</button>
            {(q || group) ? <Link href="/admin/categories" className="admin-btn">مسح</Link> : null}
          </div>
          <span className="admin-user-chip">{cats.length} قسم</span>
        </div>
      </form>

      <section className="admin-panel">
        <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>أيقونة</th><th>الاسم</th><th>slug</th><th>مجموعة</th><th>عرض</th><th>منتجات</th><th>الحالة</th><th>ترتيب</th><th></th></tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id}>
                <td>{c.icon ?? "—"}</td>
                <td>{c.nameAr}</td>
                <td dir="ltr" style={{ color: "var(--muted)", fontSize: 12 }}>{c.slug}</td>
                <td>{c.group === "FOOD" ? "أطعمة" : "مشروبات"}</td>
                <td>{c.layout === "TRAYS" ? "صواني" : "قائمة"}</td>
                <td>{productCount(c)}</td>
                <td>
                  <span className={`admin-badge ${c.isVisible ? "on" : "off"}`}>{c.isVisible ? "ظاهر" : "مخفي"}</span>
                </td>
                <td>{c.sortOrder}</td>
                <td>
                  <div className="row-actions">
                    <Link href={`/admin/categories/${c.id}`} className="admin-btn admin-btn-sm">تعديل</Link>
                    <CategoryRowActions id={c.id} nameAr={c.nameAr} isVisible={c.isVisible} canDelete={canDelete} />
                  </div>
                </td>
              </tr>
            ))}
            {cats.length === 0 ? (
              <tr><td colSpan={9} className="admin-empty">لا أقسام مطابقة.</td></tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </section>
    </>
  );
}
