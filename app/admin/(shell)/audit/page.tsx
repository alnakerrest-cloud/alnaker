import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import AdminFilterBar from "../admin-filter-bar";

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

      <AdminFilterBar
        action="/admin/audit"
        searchValue={q ?? ""}
        searchPlaceholder="ابحث في الملخص…"
        totalCount={logs.length}
        countLabel="عملية"
        clearHref="/admin/audit"
        quickChips={[
          { label: "الكل", href: "/admin/audit" + (q ? `?q=${encodeURIComponent(q)}` : ""), active: !type },
          ...entityTypes.map((e) => ({
            label: e.entityType,
            href: `/admin/audit?type=${encodeURIComponent(e.entityType)}` + (q ? `&q=${encodeURIComponent(q)}` : ""),
            active: type === e.entityType,
          })),
        ]}
        filters={[
          {
            name: "type",
            label: "نوع الكيان",
            value: type ?? "",
            options: [
              { value: "", label: "كل الأنواع" },
              ...entityTypes.map((e) => ({ value: e.entityType, label: e.entityType })),
            ],
          },
        ]}
      />

      <section className="admin-panel">
        <div className="admin-table-wrap">
        <table className="admin-table admin-table-cards">
          <thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>الكيان</th><th>الملخص</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td data-label="الوقت" dir="ltr" style={{ color: "var(--muted)", fontSize: 12 }}>{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td data-label="المستخدم">{l.admin?.displayName ?? "—"}</td>
                <td className="cell-primary" data-label="العملية"><span className="admin-badge gold">{ACTION_LABEL[l.action] ?? l.action}</span></td>
                <td data-label="الكيان">{l.entityType}</td>
                <td data-label="الملخص">{l.summary ?? "—"}</td>
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
