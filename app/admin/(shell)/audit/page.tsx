import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  publish: "نشر",
  import: "استيراد",
  login: "دخول",
  logout: "خروج",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  await requireAdmin();
  const { type, q } = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: {
      AND: [
        type ? { entityType: type } : {},
        q ? { summary: { contains: q, mode: "insensitive" } } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { admin: { select: { displayName: true, role: true } } },
  });

  const entityTypes = await prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } });

  return (
    <>
      <div className="admin-topbar">
        <h1>سجل التعديلات</h1>
        <span className="admin-user-chip">آخر {logs.length} عملية</span>
      </div>

      <form className="admin-panel" style={{ marginBottom: 18 }} method="GET" action="/admin/audit">
        <div className="admin-panel-header">
          <div className="admin-toolbar">
            <input type="search" name="q" defaultValue={q ?? ""} placeholder="ابحث في الملخص…" />
            <select name="type" defaultValue={type ?? ""}>
              <option value="">كل الأنواع</option>
              {entityTypes.map((e) => <option key={e.entityType} value={e.entityType}>{e.entityType}</option>)}
            </select>
            <button className="admin-btn" type="submit">تطبيق</button>
            {(q || type) ? <a href="/admin/audit" className="admin-btn">مسح</a> : null}
          </div>
        </div>
      </form>

      <section className="admin-panel">
        <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>الكيان</th><th>الملخص</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td dir="ltr" style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td>{l.admin?.displayName ?? "—"}</td>
                <td><span className="admin-badge gold">{ACTION_LABEL[l.action] ?? l.action}</span></td>
                <td>{l.entityType}</td>
                <td>{l.summary ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 ? <tr><td colSpan={5} className="admin-empty">لا سجلات.</td></tr> : null}
          </tbody>
        </table>
        </div>
      </section>
    </>
  );
}
