import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { branch: true },
  });

  return (
    <>
      <div className="admin-topbar">
        <h1>الطلبات</h1>
      </div>
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table admin-table-cards">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>النوع</th>
                <th>العميل</th>
                <th>الهاتف</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="cell-primary" data-label="رقم الطلب"><strong>{o.orderNumber}</strong></td>
                  <td data-label="النوع">{o.type === "DELIVERY" ? "توصيل" : "استلام"}</td>
                  <td data-label="العميل">{o.customerName || "—"}</td>
                  <td data-label="الهاتف" dir="ltr">{o.customerPhone}</td>
                  <td data-label="الإجمالي">{fmt(Number(o.total))} ج.م</td>
                  <td data-label="الحالة"><span className="admin-badge on">{o.status}</span></td>
                  <td data-label="التاريخ">{new Date(o.createdAt).toLocaleString("ar-EG")}</td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="admin-empty">لا توجد طلبات بعد.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ padding: "0 12px 12px" }}>تُعرض آخر 100 طلب.</p>
      </div>
    </>
  );
}
