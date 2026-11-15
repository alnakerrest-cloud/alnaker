import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { collectCandidates, annotateWithDb, existingKeys } from "@/lib/admin/import-source";
import ImportReview from "./import-review";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") redirect("/admin/dashboard");

  const candidates = await annotateWithDb(collectCandidates());
  const existing = await existingKeys();

  const lastJobs = await prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 5 });

  return (
    <>
      <div className="admin-topbar">
        <h1>استيراد المنيو — مراجعة نصية</h1>
        <span className="admin-user-chip">المصدر: 50500.pdf (نص مُسوّى مع data/menu.ts)</span>
      </div>

      <p className="admin-flash" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--ink)" }}>
        هذا استيراد <b>نصي</b> فقط (أقسام/منتجات/أسعار). لا يشمل صور الأطباق؛ الصور تُدار في وحدة مستقلة عند توفّر بيانات Cloudinary.
        لا يتم دمج تلقائي: أي عنصر مطابق لموجود حالي يُتخطّى عند الاستيراد.
      </p>

      <ImportReview candidates={candidates} existing={existing} />

      <section className="admin-panel" style={{ marginTop: 18 }}>
        <div className="admin-panel-header"><h2>آخر عمليات الاستيراد</h2></div>
        <div className="admin-table-wrap">
        <table className="admin-table admin-table-cards">
          <thead><tr><th>المصدر</th><th>الحالة</th><th>الإجمالي</th><th>معالَج</th><th>فاشل</th><th>التاريخ</th></tr></thead>
          <tbody>
            {lastJobs.map((j) => (
              <tr key={j.id}>
                <td className="cell-primary" data-label="المصدر"><strong>{j.source}</strong></td>
                <td data-label="الحالة"><span className={`admin-badge ${j.status === "SUCCESS" ? "on" : j.status === "FAILED" ? "off" : "gold"}`}>{j.status}</span></td>
                <td data-label="الإجمالي">{j.totalItems}</td>
                <td data-label="معالَج">{j.processed}</td>
                <td data-label="فاشل">{j.failed}</td>
                <td data-label="التاريخ" dir="ltr" style={{ color: "var(--muted)", fontSize: 12 }}>{j.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
            {lastJobs.length === 0 ? <tr><td colSpan={6} className="admin-empty">لا عمليات بعد.</td></tr> : null}
          </tbody>
        </table>
        </div>
        <p style={{ padding: "0 18px 16px" }}><Link href="/admin/audit" className="admin-btn admin-btn-sm">سجل التعديلات الكامل</Link></p>
      </section>
    </>
  );
}
