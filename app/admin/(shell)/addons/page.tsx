import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import AddonRowActions from "./row-actions";
import AdminFilterBar from "../admin-filter-bar";

export const dynamic = "force-dynamic";

export default async function AddonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const admin = await requireAdmin(["OWNER", "EDITOR"]);
  const { q, status } = await searchParams;

  const groups = await prisma.optionGroup.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { nameAr: { contains: q, mode: "insensitive" } },
                { nameEn: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {},
      ],
    },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
      },
      productAssignments: {
        include: {
          product: { select: { id: true, nameAr: true } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <div className="admin-topbar">
        <h1>إدارة الإضافات والخيارات</h1>
        <Link href="/admin/addons/new" className="admin-btn admin-btn-primary">
          + مجموعة إضافات جديدة
        </Link>
      </div>

      <AdminFilterBar
        action="/admin/addons"
        searchValue={q ?? ""}
        searchPlaceholder="ابحث باسم مجموعة الإضافات…"
        totalCount={groups.length}
        countLabel="مجموعة"
        clearHref="/admin/addons"
        quickChips={[
          { label: "الكل", href: "/admin/addons" + (q ? `?q=${encodeURIComponent(q)}` : ""), active: !status },
          { label: "مفعّل", href: `/admin/addons?status=active` + (q ? `&q=${encodeURIComponent(q)}` : ""), active: status === "active" },
          { label: "معطّل", href: `/admin/addons?status=inactive` + (q ? `&q=${encodeURIComponent(q)}` : ""), active: status === "inactive" },
        ]}
        filters={[
          {
            name: "status",
            label: "الحالة",
            value: status ?? "",
            options: [
              { value: "", label: "الحالة: الكل" },
              { value: "active", label: "مفعّل" },
              { value: "inactive", label: "معطّل" },
            ],
          },
        ]}
      />

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table admin-table-cards">
            <thead>
              <tr>
                <th>اسم المجموعة</th>
                <th>الخيارات</th>
                <th>نوع الاختيار</th>
                <th>المنتجات المرتبطة</th>
                <th>الحالة</th>
                <th>الترتيب</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td className="cell-primary" data-label="اسم المجموعة">
                    <strong>{g.nameAr}</strong>
                    {g.nameEn ? (
                      <small style={{ display: "block", color: "var(--muted)", fontSize: 11 }}>
                        {g.nameEn}
                      </small>
                    ) : null}
                  </td>
                  <td data-label="الخيارات">
                    <span style={{ fontWeight: 600 }}>{g.options.length} خيارات</span>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: 11, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {g.options.map((o) => `${o.nameAr} (${o.price} ج)`).join("، ")}
                    </small>
                  </td>
                  <td data-label="نوع الاختيار">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      <span className={`admin-badge ${g.isRequired ? "on" : "off"}`}>
                        {g.isRequired ? "مطلوبة" : "اختيارية"}
                      </span>
                      <span className="admin-badge" style={{ background: "rgba(255,255,255,0.06)" }}>
                        {g.isMulti ? `متعدد (${g.minSelect}–${g.maxSelect})` : "فردي"}
                      </span>
                    </div>
                  </td>
                  <td data-label="المنتجات المرتبطة">
                    <span className="admin-badge" style={{ background: "rgba(224, 90, 43, 0.15)", color: "var(--brand, #e05a2b)" }}>
                      {g.productAssignments.length} منتج
                    </span>
                  </td>
                  <td data-label="الحالة">
                    <span className={`admin-badge ${g.isActive ? "on" : "off"}`}>
                      {g.isActive ? "مفعّل" : "معطّل"}
                    </span>
                  </td>
                  <td data-label="الترتيب">{g.sortOrder}</td>
                  <td className="cell-actions">
                    <div className="row-actions">
                      <Link href={`/admin/addons/${g.id}`} className="admin-btn admin-btn-sm">
                        تعديل
                      </Link>
                      <AddonRowActions id={g.id} nameAr={g.nameAr} isActive={g.isActive} />
                    </div>
                  </td>
                </tr>
              ))}
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-empty">
                    لا توجد مجموعات إضافات مطابقة.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

