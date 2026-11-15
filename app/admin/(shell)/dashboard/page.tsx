import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

export default async function DashboardPage() {
  const [categories, products, available, hidden, variants, images, recentAudit, recentImports] =
    await Promise.all([
      prisma.category.count(),
      prisma.product.count(),
      prisma.product.count({ where: { isAvailable: true, isVisible: true } }),
      prisma.product.count({ where: { OR: [{ isAvailable: false }, { isVisible: false }] } }),
      prisma.productVariant.count(),
      prisma.productImage.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { admin: { select: { displayName: true } } },
      }),
      prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  const stats = [
    { label: "الأقسام", value: categories, href: "/admin/categories" },
    { label: "المنتجات", value: products, href: "/admin/products" },
    { label: "متاحة", value: available, href: "/admin/products" },
    { label: "مخفية/غير متاحة", value: hidden, href: "/admin/products" },
    { label: "الأسعار (Variants)", value: variants, href: "/admin/products" },
    { label: "الصور", value: images, href: "/admin/images" },
  ];

  return (
    <>
      <div className="admin-topbar">
        <h1>الرئيسية</h1>
        <span className="admin-user-chip">مرحبًا 👋</span>
      </div>

      <div className="admin-stats">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="admin-stat" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="num">{fmt(s.value)}</div>
            <div className="label">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="admin-toolbar" style={{ marginBottom: 22 }}>
        <Link href="/admin/products/new" className="admin-btn admin-btn-primary">+ منتج جديد</Link>
        <Link href="/admin/categories/new" className="admin-btn">+ قسم جديد</Link>
        <Link href="/admin/import" className="admin-btn">استيراد من PDF</Link>
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel-header"><h2>آخر التعديلات</h2></div>
          {recentAudit.length === 0 ? (
            <p className="admin-empty">لا سجلات بعد.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: "10px 18px", display: "grid", gap: 10 }}>
              {recentAudit.map((a) => (
                <li key={a.id} style={{ fontSize: 13.5, padding: "8px 10px", background: "var(--bg-2)", borderRadius: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span className="admin-badge gold">{a.action}</span>{" "}
                  <span style={{ fontWeight: 600 }}>{a.summary ?? a.entityType}</span>
                  <span style={{ marginInlineStart: "auto", color: "var(--muted)", fontSize: 12 }}>{a.admin?.displayName ?? "النظام"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header"><h2>آخر عمليات الاستيراد</h2></div>
          {recentImports.length === 0 ? (
            <p className="admin-empty">لا عمليات استيراد.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table-cards">
                <thead><tr><th>المصدر</th><th>الحالة</th><th>العناصر</th></tr></thead>
                <tbody>
                  {recentImports.map((j) => (
                    <tr key={j.id}>
                      <td className="cell-primary" data-label="المصدر"><strong>{j.source}</strong></td>
                      <td data-label="الحالة"><span className="admin-badge on">{j.status}</span></td>
                      <td data-label="العناصر">{fmt(j.processed)}/{fmt(j.totalItems)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
