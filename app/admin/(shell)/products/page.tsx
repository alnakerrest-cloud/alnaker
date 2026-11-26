import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import ProductRowActions from "./row-actions";
import AdminFilterBar, { FilterFieldConfig, QuickChip } from "../admin-filter-bar";
import TablePagination from "../components/table-pagination";

export const dynamic = "force-dynamic";

/** يحوّل أسعار المنتج إلى نص عرض مختصر (سعر ثابت أو نطاق). */
function priceLabel(variants: { price: unknown; maxPrice: unknown }[]): string {
  if (!variants.length) return "—";
  const nums = variants.map((v) => Number(v.price));
  const maxes = variants.map((v) => (v.maxPrice == null ? null : Number(v.maxPrice)));
  const min = Math.min(...nums);
  const maxCandidates = [...nums, ...maxes.filter((x): x is number => x != null)];
  const max = Math.max(...maxCandidates);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; sec?: string; vis?: string; avail?: string; page?: string; limit?: string }>;
}) {
  const admin = await requireAdmin();
  const canDelete = admin.role === "OWNER";
  const { q, cat, sec, vis, avail, page: pageParam, limit: limitParam } = await searchParams;
  const allowedLimits = [10, 20, 50];
  const limit = allowedLimits.includes(Number(limitParam)) ? Number(limitParam) : 10;
  const requestedPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, nameAr: true, sections: { orderBy: { sortOrder: "asc" }, select: { id: true, titleAr: true } } },
  });

  const where = {
    AND: [
      q ? { nameAr: { contains: q, mode: "insensitive" as const } } : {},
      cat ? { section: { categoryId: cat } } : {},
      sec ? { sectionId: sec } : {},
      vis === "visible" ? { isVisible: true } : vis === "hidden" ? { isVisible: false } : {},
      avail === "available" ? { isAvailable: true } : avail === "unavailable" ? { isAvailable: false } : {},
    ],
  };
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const products = await prisma.product.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      section: { select: { id: true, titleAr: true, category: { select: { nameAr: true } } } },
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  const activeSections = cat ? cats.find((c) => c.id === cat)?.sections ?? [] : [];

  const productFilters: FilterFieldConfig[] = [
    {
      name: "cat",
      label: "القسم",
      value: cat ?? "",
      options: [
        { value: "", label: "كل الأقسام" },
        ...cats.map((c) => ({ value: c.id, label: c.nameAr })),
      ],
    },
    ...(cat && activeSections.length > 0
      ? [
          {
            name: "sec",
            label: "العنبر",
            value: sec ?? "",
            options: [
              { value: "", label: "كل العنابر" },
              ...activeSections.map((s) => ({ value: s.id, label: s.titleAr ?? "(بدون عنوان)" })),
            ],
          },
        ]
      : []),
    {
      name: "vis",
      label: "الظهور",
      value: vis ?? "",
      options: [
        { value: "", label: "الظهور: الكل" },
        { value: "visible", label: "ظاهر" },
        { value: "hidden", label: "مخفي" },
      ],
    },
    {
      name: "avail",
      label: "التوفر",
      value: avail ?? "",
      options: [
        { value: "", label: "التوفر: الكل" },
        { value: "available", label: "متوفر" },
        { value: "unavailable", label: "غير متوفر" },
      ],
    },
  ];

  const buildQuery = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (cat) sp.set("cat", cat);
    if (sec) sp.set("sec", sec);
    if (vis) sp.set("vis", vis);
    if (avail) sp.set("avail", avail);
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const str = sp.toString();
    return str ? `/admin/products?${str}` : "/admin/products";
  };

  const quickChips: QuickChip[] = [
    { label: "الكل", href: buildQuery({ vis: undefined, avail: undefined }), active: !vis && !avail },
    { label: "ظاهر", href: buildQuery({ vis: "visible" }), active: vis === "visible" },
    { label: "مخفي", href: buildQuery({ vis: "hidden" }), active: vis === "hidden" },
    { label: "متوفر", href: buildQuery({ avail: "available" }), active: avail === "available" },
    { label: "غير متوفر", href: buildQuery({ avail: "unavailable" }), active: avail === "unavailable" },
  ];

  return (
    <>
      <div className="admin-topbar">
        <h1>المنتجات</h1>
        <Link href="/admin/products/new" className="admin-btn admin-btn-primary">+ منتج جديد</Link>
      </div>

      <AdminFilterBar
        action="/admin/products"
        searchValue={q ?? ""}
        searchPlaceholder="ابحث باسم المنتج…"
        totalCount={total}
        countLabel="منتج"
        clearHref="/admin/products"
        quickChips={quickChips}
        filters={productFilters}
      />

      <section className="admin-panel">
        <div className="admin-table-wrap">
        <table className="admin-table admin-table-cards">
          <thead>
            <tr><th>المنتج</th><th>القسم</th><th>السعر</th><th>أسعار</th><th>شارة</th><th>ظاهر</th><th>متوفر</th><th>مميّز</th><th>ترتيب</th><th></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="cell-primary" data-label="المنتج"><strong>{p.nameAr}</strong></td>
                <td data-label="القسم" style={{ color: "var(--muted)", fontSize: 13 }}>
                  {p.section.category.nameAr}{p.section.titleAr ? " › " + p.section.titleAr : ""}
                </td>
                <td data-label="السعر">{priceLabel(p.variants)}</td>
                <td data-label="عدد الأسعار">{p.variants.length}</td>
                <td data-label="الشارة">
                  {p.badge ? <span className="admin-badge gold">{p.badge === "SIGNATURE" ? "مميز" : "عرض"}</span> : "—"}
                </td>
                <td data-label="الظهور"><span className={`admin-badge ${p.isVisible ? "on" : "off"}`}>{p.isVisible ? "ظاهر" : "مخفي"}</span></td>
                <td data-label="التوفر"><span className={`admin-badge ${p.isAvailable ? "on" : "off"}`}>{p.isAvailable ? "متوفر" : "غير متوفر"}</span></td>
                <td data-label="مميّز">{p.isFeatured ? "★ نعم" : "—"}</td>
                <td data-label="الترتيب">{p.sortOrder}</td>
                <td className="cell-actions" style={{minWidth:"210px"}}>
                  <div className="row-actions">
                    <Link href={`/admin/products/${p.id}`} className="admin-btn admin-btn-sm">تعديل</Link>
                    <ProductRowActions
                      id={p.id}
                      nameAr={p.nameAr}
                      isVisible={p.isVisible}
                      isAvailable={p.isAvailable}
                      isFeatured={p.isFeatured}
                      canDelete={canDelete}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr><td colSpan={10} className="admin-empty">لا منتجات مطابقة.</td></tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </section>
    </>
  );
}
