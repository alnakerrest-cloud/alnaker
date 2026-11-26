import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CategoryRowActions from "./row-actions";
import AdminFilterBar from "../admin-filter-bar";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string; page?: string; limit?: string }>;
}) {
  const admin = await requireAdmin();
  const canDelete = admin.role === "OWNER";
  const { q, group, page: pageParam, limit: limitParam } = await searchParams;
  const allowedLimits = [10, 20, 50];
  const limit = allowedLimits.includes(Number(limitParam)) ? Number(limitParam) : 10;
  const requestedPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  const where = {
    AND: [
      q ? { nameAr: { contains: q, mode: "insensitive" as const } } : {},
      group === "FOOD" || group === "DRINKS" ? { group: group as "FOOD" | "DRINKS" } : {},
    ],
  };
  const total = await prisma.category.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const cats = await prisma.category.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { sections: true } }, sections: { select: { products: true } } },
    skip: (page - 1) * limit,
    take: limit,
  });

  const productCount = (c: (typeof cats)[number]) => c.sections.reduce((a, s) => a + s.products.length, 0);

  return (
    <>
      <div className="admin-topbar">
        <h1>الأقسام</h1>
        <Link href="/admin/categories/new" className="admin-btn admin-btn-primary">+ قسم جديد</Link>
      </div>

      <AdminFilterBar
        action="/admin/categories"
        searchValue={q ?? ""}
        searchPlaceholder="ابحث باسم القسم…"
        totalCount={total}
        countLabel="قسم"
        clearHref="/admin/categories"
        quickChips={[
          { label: "الكل", href: "/admin/categories" + (q ? `?q=${encodeURIComponent(q)}` : ""), active: !group },
          { label: "أطعمة", href: `/admin/categories?group=FOOD` + (q ? `&q=${encodeURIComponent(q)}` : ""), active: group === "FOOD" },
          { label: "مشروبات", href: `/admin/categories?group=DRINKS` + (q ? `&q=${encodeURIComponent(q)}` : ""), active: group === "DRINKS" },
        ]}
        filters={[
          {
            name: "group",
            label: "المجموعة",
            value: group ?? "",
            options: [
              { value: "", label: "كل المجموعات" },
              { value: "FOOD", label: "أطعمة" },
              { value: "DRINKS", label: "مشروبات" },
            ],
          },
        ]}
      />

      <section className="admin-panel">
        <div className="admin-table-wrap">
        <table className="admin-table admin-table-cards">
          <thead>
            <tr><th>أيقونة</th><th>الاسم</th><th>slug</th><th>مجموعة</th><th>عرض</th><th>منتجات</th><th>الحالة</th><th>ترتيب</th><th></th></tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id}>
                <td data-label="الأيقونة">{c.icon ?? "—"}</td>
                <td className="cell-primary" data-label="الاسم"><strong>{c.nameAr}</strong></td>
                <td data-label="المعرّف (slug)"><code dir="ltr" style={{ color: "var(--muted)", fontSize: 12 }}>{c.slug}</code></td>
                <td data-label="المجموعة">{c.group === "FOOD" ? "أطعمة" : "مشروبات"}</td>
                <td data-label="طريقة العرض">{c.layout === "TRAYS" ? "صواني" : "قائمة"}</td>
                <td data-label="عدد المنتجات">{productCount(c)}</td>
                <td data-label="الحالة">
                  <span className={`admin-badge ${c.isVisible ? "on" : "off"}`}>{c.isVisible ? "ظاهر" : "مخفي"}</span>
                </td>
                <td data-label="الترتيب">{c.sortOrder}</td>
                <td className="cell-actions" style={{minWidth:"170px"}}>
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
