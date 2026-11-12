import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import ProductRowActions from "./row-actions";

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
  searchParams: Promise<{ q?: string; cat?: string; sec?: string; vis?: string; avail?: string }>;
}) {
  const admin = await requireAdmin();
  const canDelete = admin.role === "OWNER";
  const { q, cat, sec, vis, avail } = await searchParams;

  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, nameAr: true, sections: { orderBy: { sortOrder: "asc" }, select: { id: true, titleAr: true } } },
  });

  const products = await prisma.product.findMany({
    where: {
      AND: [
        q ? { nameAr: { contains: q, mode: "insensitive" } } : {},
        cat ? { section: { categoryId: cat } } : {},
        sec ? { sectionId: sec } : {},
        vis === "visible" ? { isVisible: true } : vis === "hidden" ? { isVisible: false } : {},
        avail === "available" ? { isAvailable: true } : avail === "unavailable" ? { isAvailable: false } : {},
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      section: { select: { id: true, titleAr: true, category: { select: { nameAr: true } } } },
    },
  });

  const activeSections = cat ? cats.find((c) => c.id === cat)?.sections ?? [] : [];

  return (
    <>
      <div className="admin-topbar">
        <h1>المنتجات</h1>
        <Link href="/admin/products/new" className="admin-btn admin-btn-primary">+ منتج جديد</Link>
      </div>

      <form className="admin-panel" style={{ marginBottom: 18 }} method="GET" action="/admin/products">
        <div className="admin-panel-header">
          <div className="admin-toolbar">
            <input type="search" name="q" defaultValue={q ?? ""} placeholder="ابحث باسم المنتج…" />
            <select name="cat" defaultValue={cat ?? ""}>
              <option value="">كل الأقسام</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
            {cat ? (
              <select name="sec" defaultValue={sec ?? ""}>
                <option value="">كل العنابر</option>
                {activeSections.map((s) => <option key={s.id} value={s.id}>{s.titleAr ?? "(بدون عنوان)"}</option>)}
              </select>
            ) : null}
            <select name="vis" defaultValue={vis ?? ""}>
              <option value="">الظهور: الكل</option>
              <option value="visible">ظاهر</option>
              <option value="hidden">مخفي</option>
            </select>
            <select name="avail" defaultValue={avail ?? ""}>
              <option value="">التوفر: الكل</option>
              <option value="available">متوفر</option>
              <option value="unavailable">غير متوفر</option>
            </select>
            <button className="admin-btn" type="submit">تطبيق</button>
            {(q || cat || sec || vis || avail) ? <Link href="/admin/products" className="admin-btn">مسح</Link> : null}
          </div>
          <span className="admin-user-chip">{products.length} منتج</span>
        </div>
      </form>

      <section className="admin-panel">
        <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>المنتج</th><th>القسم</th><th>السعر</th><th>أسعار</th><th>شارة</th><th>ظاهر</th><th>متوفر</th><th>مميّز</th><th>ترتيب</th><th></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.nameAr}</td>
                <td style={{ color: "var(--muted)", fontSize: 13 }}>
                  {p.section.category.nameAr}{p.section.titleAr ? " › " + p.section.titleAr : ""}
                </td>
                <td>{priceLabel(p.variants)}</td>
                <td>{p.variants.length}</td>
                <td>
                  {p.badge ? <span className="admin-badge gold">{p.badge === "SIGNATURE" ? "مميز" : "عرض"}</span> : "—"}
                </td>
                <td><span className={`admin-badge ${p.isVisible ? "on" : "off"}`}>{p.isVisible ? "نعم" : "لا"}</span></td>
                <td><span className={`admin-badge ${p.isAvailable ? "on" : "off"}`}>{p.isAvailable ? "نعم" : "لا"}</span></td>
                <td>{p.isFeatured ? "★" : "—"}</td>
                <td>{p.sortOrder}</td>
                <td>
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
