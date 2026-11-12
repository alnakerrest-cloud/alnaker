import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import BranchRowActions from "./row-actions";

export const dynamic = "force-dynamic";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const admin = await requireAdmin();
  const canManage = admin.role === "OWNER";
  const { q, status } = await searchParams;

  const branches = await prisma.branch.findMany({
    where: {
      AND: [
        q ? { OR: [{ nameAr: { contains: q, mode: "insensitive" } }, { cityAr: { contains: q, mode: "insensitive" } }] } : {},
        status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {},
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <div className="admin-topbar">
        <h1>الفروع</h1>
        {canManage ? <Link href="/admin/branches/new" className="admin-btn admin-btn-primary">+ فرع جديد</Link> : null}
      </div>

      {!canManage ? <p className="admin-flash err">عرض فقط: إدارة الفروع متاحة للمالك فقط.</p> : null}

      <form className="admin-panel" style={{ marginBottom: 18 }} method="GET" action="/admin/branches">
        <div className="admin-panel-header">
          <div className="admin-toolbar">
            <input type="search" name="q" defaultValue={q ?? ""} placeholder="ابحث باسم الفرع أو المدينة…" />
            <select name="status" defaultValue={status ?? ""}>
              <option value="">الحالة: الكل</option>
              <option value="active">مفعّل</option>
              <option value="inactive">معطّل</option>
            </select>
            <button className="admin-btn" type="submit">تطبيق</button>
            {(q || status) ? <Link href="/admin/branches" className="admin-btn">مسح</Link> : null}
          </div>
          <span className="admin-user-chip">{branches.length} فرع</span>
        </div>
      </form>

      <section className="admin-panel">
        <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>الفرع</th><th>المدينة</th><th>العنوان</th><th>هاتف الفرع</th><th>واتساب الطلبات</th><th>الحالة</th><th>الطلبات</th><th>ترتيب</th>{canManage ? <th></th> : null}</tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id}>
                <td>
                  <strong>{b.nameAr}</strong>
                  {b.nameEn ? <small style={{ display: "block", color: "var(--muted)", fontSize: 11 }}>{b.nameEn}</small> : null}
                </td>
                <td>{b.cityAr}</td>
                <td style={{ color: "var(--muted)", fontSize: 13 }}>{b.addressAr}</td>
                <td dir="ltr">{b.phoneIntl ?? "— (افتراضي)"}</td>
                <td dir="ltr">{b.whatsappNumber ? <span style={{ color: "#25d366", fontWeight: 600 }}>{b.whatsappNumber}</span> : <span style={{ color: "#d32f2f" }}>غير مهيأ</span>}</td>
                <td><span className={`admin-badge ${b.isActive ? "on" : "off"}`}>{b.isActive ? "مفعّل" : "معطّل"}</span></td>
                <td><span className={`admin-badge ${b.isOrderable ? "on" : "off"}`}>{b.isOrderable ? "متاح" : "متوقف"}</span></td>
                <td>{b.sortOrder}</td>
                {canManage ? (
                  <td>
                    <div className="row-actions">
                      <Link href={`/admin/branches/${b.id}`} className="admin-btn admin-btn-sm">تعديل</Link>
                      <BranchRowActions id={b.id} nameAr={b.nameAr} isActive={b.isActive} />
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {branches.length === 0 ? (
              <tr><td colSpan={canManage ? 9 : 8} className="admin-empty">لا فروع مطابقة.</td></tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </section>
    </>
  );
}
