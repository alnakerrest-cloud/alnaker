import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  listOrders,
  getOrdersStats,
  getMenuSettings,
  type OrderStatus,
} from "@/lib/orders-store";
import { getSiteData } from "@/lib/site-db";

export const dynamic = "force-dynamic";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

type SearchParams = {
  q?: string;
  type?: string;
  status?: string;
  branch?: string;
  payment?: string;
  dateFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  page?: string;
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; color: string; border: string; icon: string }
> = {
  DRAFT: { label: "مسودة", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", icon: "📝" },
  PENDING_WHATSAPP: { label: "بانتظار واتساب", bg: "#fffbeb", color: "#b45309", border: "#fde68a", icon: "💬" },
  CUSTOMER_CONFIRMED_SENT: { label: "أرسله العميل", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", icon: "📨" },
  RECEIVED: { label: "تم الاستلام", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", icon: "📥" },
  CONFIRMED: { label: "مؤكد ومعتمد", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", icon: "✅" },
  PREPARING: { label: "قيد التحضير", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", icon: "👨‍🍳" },
  READY: { label: "جاهز للتسليم", bg: "#f0fdfa", color: "#0f766e", border: "#99f6e4", icon: "📦" },
  OUT_FOR_DELIVERY: { label: "في الطريق", bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe", icon: "🚚" },
  COMPLETED: { label: "مكتمل بنجاح", bg: "#f0fdf4", color: "#166534", border: "#86efac", icon: "🌟" },
  REJECTED: { label: "معتذر عنه", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", icon: "❌" },
  CANCELLED: { label: "ملغي", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", icon: "🚫" },
  EXPIRED: { label: "منتهي الصلاحية", bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff", icon: "⏱️" },
};

function calculateDateRange(filter?: string): { from?: string; to?: string } {
  if (!filter || filter === "all") return {};
  const now = new Date();
  const cairo = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));

  const startOfDay = new Date(cairo);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(cairo);
  endOfDay.setHours(23, 59, 59, 999);

  switch (filter) {
    case "today":
      return { from: startOfDay.toISOString(), to: endOfDay.toISOString() };
    case "yesterday": {
      const yStart = new Date(startOfDay);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(endOfDay);
      yEnd.setDate(yEnd.getDate() - 1);
      return { from: yStart.toISOString(), to: yEnd.toISOString() };
    }
    case "7days": {
      const s = new Date(startOfDay);
      s.setDate(s.getDate() - 6);
      return { from: s.toISOString(), to: endOfDay.toISOString() };
    }
    case "thisMonth": {
      const s = new Date(cairo.getFullYear(), cairo.getMonth(), 1, 0, 0, 0);
      return { from: s.toISOString(), to: endOfDay.toISOString() };
    }
    default:
      return {};
  }
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR", "ORDERS_STAFF"]);
  const isOwnerOrAdmin = admin.role === "OWNER" || admin.role === "ADMIN";

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const dateFilterRange = calculateDateRange(params.dateFilter);
  const dateFrom = params.dateFrom ? new Date(params.dateFrom).toISOString() : dateFilterRange.from;
  const dateTo = params.dateTo ? new Date(params.dateTo + "T23:59:59.999Z").toISOString() : dateFilterRange.to;

  const listResult = listOrders({
    q: params.q,
    status: params.status,
    type: params.type,
    branchId: params.branch,
    paymentMethod: params.payment,
    sortBy: params.sortBy || "newest",
    dateFrom,
    dateTo,
    page,
    pageSize: 15,
  });

  const stats = getOrdersStats();
  const menuSettings = getMenuSettings();
  const siteData = await getSiteData("ar");

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>
              إدارة ومتابعة الطلبات | Orders
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                background: "#f0fdf4",
                color: "#166534",
                border: "1px solid #bbf7d0",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "inline-block",
                }}
              />
              تحديث مباشر
            </span>
          </div>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
            مراجعة، قبول، ومطابقة تدفق الطلبات من السلة إلى التسليم للعميل.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {isOwnerOrAdmin && (
            <Link
              href="/admin/order-settings"
              className="admin-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#334155",
                fontWeight: 600,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              <span>🛠️</span>
              <span>إعدادات الطلبات</span>
            </Link>
          )}

          <Link
            href="/admin/orders"
            className="admin-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              background: "#b8860b",
              borderRadius: "8px",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            <span>🔄</span>
            <span>تحديث</span>
          </Link>
        </div>
      </div>

      {/* KPI Statistics Bar - 6 Structured Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {/* 1. Total Orders */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
            <span>إجمالي الطلبات</span>
            <span>📋</span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>
            {fmt(stats.totalOrders)}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
            جميع العمليات المسجلة
          </div>
        </div>

        {/* 2. New / Pending */}
        <div
          style={{
            background: stats.newOrders > 0 ? "#fffbeb" : "#fff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: stats.newOrders > 0 ? "1px solid #fde68a" : "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: stats.newOrders > 0 ? "#b45309" : "#64748b", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
            <span>طلبات جديدة</span>
            <span>🔔</span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: stats.newOrders > 0 ? "#d97706" : "#0f172a" }}>
            {fmt(stats.newOrders)}
          </div>
          <div style={{ fontSize: "11px", color: stats.newOrders > 0 ? "#b45309" : "#94a3b8", marginTop: "4px" }}>
            بانتظار مراجعة الإدارة
          </div>
        </div>

        {/* 3. In Progress */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
            <span>قيد التنفيذ</span>
            <span>👨‍🍳</span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#2563eb" }}>
            {fmt(stats.inProgressOrders)}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
            تحضير وتجهيز وتسليم
          </div>
        </div>

        {/* 4. Completed */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
            <span>مكتملة</span>
            <span>✅</span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a" }}>
            {fmt(stats.completedOrders)}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
            تم استلامها بنجاح
          </div>
        </div>

        {/* 5. Cancelled / Rejected */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
            <span>مرفوضة / ملغاة</span>
            <span>❌</span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#64748b" }}>
            {fmt(stats.cancelledOrRejectedOrders)}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
            معتذر عنها أو منتهية
          </div>
        </div>

        {/* 6. Confirmed Sales (Golden Card) */}
        <div
          style={{
            background: "linear-gradient(135deg, #fffdfa 0%, #fff9ec 100%)",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #fde68a",
            boxShadow: "0 2px 4px rgba(184, 134, 11, 0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#92400e", fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
            <span>مبيعات معتمدة</span>
            <span>💰</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 900, color: "#b8860b" }}>
            {fmt(stats.totalRevenue)}{" "}
            <span style={{ fontSize: "14px", fontWeight: 600 }}>ج.م</span>
          </div>
          <div style={{ fontSize: "11px", color: "#b45309", marginTop: "4px" }}>
            للطلبات المؤكدة فقط
          </div>
        </div>
      </div>

      {/* Main Content Card: Filter Bar + Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Search & Filter Toolbar */}
        <form
          method="GET"
          action="/admin/orders"
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            background: "#fafafa",
          }}
        >
          <div style={{ flex: "1 1 240px", minWidth: "220px" }}>
            <input
              type="text"
              name="q"
              placeholder="بحث برقم الطلب / كود التحقق / الهاتف / اسم العميل..."
              defaultValue={params.q || ""}
              style={{
                width: "100%",
                padding: "9px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#fff",
              }}
            />
          </div>

          <select
            name="status"
            defaultValue={params.status || "ALL"}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="ALL">جميع الحالات</option>
            <option value="PENDING_WHATSAPP">بانتظار واتساب</option>
            <option value="CUSTOMER_CONFIRMED_SENT">أرسله العميل</option>
            <option value="RECEIVED">تم الاستلام</option>
            <option value="CONFIRMED">مؤكد ومعتمد</option>
            <option value="PREPARING">قيد التحضير</option>
            <option value="READY">جاهز للتسليم</option>
            <option value="OUT_FOR_DELIVERY">في الطريق (توصيل)</option>
            <option value="COMPLETED">مكتمل</option>
            <option value="REJECTED">مرفوض</option>
            <option value="CANCELLED">ملغي</option>
            <option value="EXPIRED">منتهي</option>
          </select>

          <select
            name="type"
            defaultValue={params.type || "ALL"}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="ALL">جميع الأنواع</option>
            <option value="DELIVERY">توصيل للمنزل 🚚</option>
            <option value="TAKEAWAY">استلام من الفرع 🏢</option>
          </select>

          <select
            name="branch"
            defaultValue={params.branch || "ALL"}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="ALL">جميع الفروع</option>
            {siteData.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameAr}
              </option>
            ))}
          </select>

          <select
            name="dateFilter"
            defaultValue={params.dateFilter || "all"}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="all">كل الأوقات</option>
            <option value="today">اليوم</option>
            <option value="yesterday">أمس</option>
            <option value="7days">آخر 7 أيام</option>
            <option value="thisMonth">هذا الشهر</option>
          </select>

          <select
            name="sortBy"
            defaultValue={params.sortBy || "newest"}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="newest">الأحدث أولاً</option>
            <option value="oldest">الأقدم أولاً</option>
            <option value="totalDesc">الأعلى إجمالياً</option>
            <option value="totalAsc">الأقل إجمالياً</option>
          </select>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              style={{
                padding: "9px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              تصفية
            </button>

            <Link
              href="/admin/orders"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "9px 14px",
                borderRadius: "8px",
                background: "#f1f5f9",
                color: "#475569",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 600,
                border: "1px solid #cbd5e1",
              }}
            >
              إعادة ضبط
            </Link>
          </div>
        </form>

        {/* Orders Table */}
        {listResult.orders.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
            <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "#1e293b" }}>
              لا توجد طلبات تطابق معايير البحث
            </h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              جرّب تغيير خيارات التصفية أو إزالة كلمة البحث للعودة لكافة الطلبات.
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-cards">
              <thead>
                <tr>
                  <th style={{ width: "160px" }}>رقم الطلب</th>
                  <th style={{ width: "100px" }}>كود الأمان</th>
                  <th style={{ width: "130px" }}>العميل</th>
                  <th style={{ width: "140px" }}>الهاتف</th>
                  <th style={{ width: "140px" }}>الفرع</th>
                  <th style={{ width: "110px" }}>النوع</th>
                  <th style={{ width: "110px" }}>الإجمالي</th>
                  <th style={{ width: "140px" }}>الحالة</th>
                  <th style={{ width: "150px" }}>الوقت</th>
                  <th style={{ width: "110px", textAlign: "center" }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {listResult.orders.map((o) => {
                  const cfg = STATUS_CONFIG[o.status] || {
                    label: o.status,
                    bg: "#f8fafc",
                    color: "#475569",
                    border: "#e2e8f0",
                    icon: "📋",
                  };

                  return (
                    <tr key={o.id}>
                      <td className="cell-primary" data-label="رقم الطلب">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "13px",
                            color: "#0f172a",
                            textDecoration: "none",
                          }}
                        >
                          {o.orderNumber}
                        </Link>
                      </td>

                      <td data-label="كود الأمان">
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "12px",
                            background: "#f1f5f9",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            color: "#334155",
                            fontWeight: 600,
                          }}
                        >
                          {o.verificationCode}
                        </span>
                      </td>

                      <td data-label="العميل">
                        <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b" }}>
                          {o.customerName || "—"}
                        </span>
                      </td>

                      <td data-label="الهاتف" dir="ltr">
                        <a
                          href={`https://wa.me/${o.customerPhoneNormalized}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#16a34a",
                            textDecoration: "none",
                            fontWeight: 600,
                            fontSize: "13px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>💬</span>
                          <span>{o.customerPhone}</span>
                        </a>
                      </td>

                      <td data-label="الفرع">
                        <span style={{ fontSize: "13px", color: "#334155" }}>
                          {o.branchNameAr}
                        </span>
                      </td>

                      <td data-label="النوع">
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: o.type === "DELIVERY" ? "#eff6ff" : "#faf5ff",
                            color: o.type === "DELIVERY" ? "#1d4ed8" : "#7e22ce",
                          }}
                        >
                          {o.type === "DELIVERY" ? "توصيل 🚚" : "استلام 🏢"}
                        </span>
                      </td>

                      <td data-label="الإجمالي">
                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                          {fmt(o.total)}
                        </strong>{" "}
                        <small style={{ color: "#64748b" }}>ج.م</small>
                      </td>

                      <td data-label="الحالة">
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          <span>{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      <td data-label="الوقت" style={{ fontSize: "12px", color: "#64748b" }}>
                        {new Date(o.createdAt).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {new Date(o.createdAt).toLocaleDateString("ar-EG")}
                      </td>

                      <td data-label="الإجراء" style={{ textAlign: "center" }}>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="admin-btn admin-btn-sm"
                          style={{
                            padding: "5px 12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            textDecoration: "none",
                            background: "#0f172a",
                            color: "#fff",
                            display: "inline-block",
                          }}
                        >
                          التفاصيل
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {listResult.totalPages > 1 && (
          <div
            style={{
              padding: "14px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fafafa",
              borderTop: "1px solid #f1f5f9",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            <div>
              عرض {listResult.orders.length} من أصل {fmt(listResult.total)} طلب
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {listResult.page > 1 && (
                <Link
                  href={`/admin/orders?page=${listResult.page - 1}${params.q ? `&q=${params.q}` : ""}${params.status ? `&status=${params.status}` : ""}${params.type ? `&type=${params.type}` : ""}${params.branch ? `&branch=${params.branch}` : ""}${params.sortBy ? `&sortBy=${params.sortBy}` : ""}`}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#334155",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  ← السابق
                </Link>
              )}

              <span>
                صفحة <strong>{listResult.page}</strong> من{" "}
                <strong>{listResult.totalPages}</strong>
              </span>

              {listResult.page < listResult.totalPages && (
                <Link
                  href={`/admin/orders?page=${listResult.page + 1}${params.q ? `&q=${params.q}` : ""}${params.status ? `&status=${params.status}` : ""}${params.type ? `&type=${params.type}` : ""}${params.branch ? `&branch=${params.branch}` : ""}${params.sortBy ? `&sortBy=${params.sortBy}` : ""}`}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#334155",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  التالي →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
