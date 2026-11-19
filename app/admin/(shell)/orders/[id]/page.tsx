import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOrderById, getOrderByIdAsync } from "@/lib/orders-store";
import OrderStatusControl from "@/components/admin/OrderStatusControl";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

const fmt = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const admin = await requireAdmin(["OWNER", "ADMIN", "EDITOR", "ORDERS_STAFF"]);
  const { id } = await params;
  const order = await getOrderByIdAsync(id);

  if (!order) {
    return (
      <div className="admin-panel" style={{ padding: "40px", textAlign: "center" }}>
        <h2>الطلب غير موجود</h2>
        <p>لم يتم العثور على سجل طلب بالمعرف المحدد.</p>
        <Link href="/admin/orders" className="admin-btn">
          العودة لقائمة الطلبات
        </Link>
      </div>
    );
  }

  const isConfirmed = [
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "COMPLETED",
  ].includes(order.status);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link
              href="/admin/orders"
              style={{
                textDecoration: "none",
                fontSize: "14px",
                color: "#6b7280",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              ← الطلبات
            </Link>
            <span style={{ color: "#d1d5db" }}>/</span>
            <h1 style={{ margin: 0, fontSize: "20px" }}>طلب رقم {order.orderNumber}</h1>
          </div>
          <p className="admin-topbar-subtitle">
            كود التحقق: <strong>{order.verificationCode}</strong> • تم الإنشاء في:{" "}
            {new Date(order.createdAt).toLocaleString("ar-EG")}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href={`/ar/receipt/${order.orderNumber}?token=${order.verificationToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-sm"
            style={{
              background: "#b8860b",
              color: "#fff",
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            🖨️ فتح الإيصال الرسمي للطباعة
          </a>
        </div>
      </div>

      <div className="admin-panel" style={{ padding: "20px" }}>
        {/* State Banner */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: isConfirmed ? "#ecfdf5" : "#fffbeb",
            border: isConfirmed ? "1px solid #a7f3d0" : "1px solid #fde68a",
            color: isConfirmed ? "#065f46" : "#92400e",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
              {isConfirmed
                ? "✅ طلب معتمد ومقبول رسمياً من المطعم"
                : "⏳ طلب غير مؤكد — في انتظار مراجعة وقبول الإدارة"}
            </div>
            <div style={{ fontSize: "13px" }}>
              {isConfirmed
                ? `تم الاعتماد بواسطة: ${order.confirmedBy || "الإدارة"} في ${new Date(order.confirmedAt || "").toLocaleString("ar-EG")}`
                : "العميل أرسل تفاصيل الطلب ولا يعتبر الطلب قيد التنفيذ قبل النقر على 'قبول الطلب' أدناه."}
            </div>
          </div>
          <div style={{ textAlign: "left", fontSize: "13px" }}>
            <div>رمز الأمان: <code style={{ background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: "4px" }}>{order.verificationCode}</code></div>
          </div>
        </div>

        {/* Order Lifecycle Control */}
        <OrderStatusControl order={order} />

        {/* Grid layout for Customer & Order Info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {/* Customer Information */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "18px",
            }}
          >
            <h3 style={{ margin: "0 0 14px", fontSize: "16px", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              بيانات العميل والتوصيل
            </h3>
            <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 0", color: "#6b7280", width: "120px" }}>الاسم:</td>
                  <td style={{ padding: "6px 0", fontWeight: 600 }}>{order.customerName || "—"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", color: "#6b7280" }}>رقم الهاتف:</td>
                  <td style={{ padding: "6px 0", fontWeight: 600 }} dir="ltr">
                    <a
                      href={`https://wa.me/${order.customerPhoneNormalized}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#16a34a", textDecoration: "none" }}
                    >
                      💬 {order.customerPhone}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", color: "#6b7280" }}>نوع الطلب:</td>
                  <td style={{ padding: "6px 0", fontWeight: 600 }}>
                    {order.type === "DELIVERY" ? "توصيل للمنزل 🚚" : "استلام من الفرع 🏢"}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", color: "#6b7280" }}>الفرع:</td>
                  <td style={{ padding: "6px 0", fontWeight: 600 }}>{order.branchNameAr}</td>
                </tr>
                {order.type === "DELIVERY" && (
                  <tr>
                    <td style={{ padding: "6px 0", color: "#6b7280" }}>عنوان التوصيل:</td>
                    <td style={{ padding: "6px 0", fontWeight: 600 }}>{order.deliveryAddress || "—"}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: "6px 0", color: "#6b7280" }}>طريقة الدفع:</td>
                  <td style={{ padding: "6px 0", fontWeight: 600 }}>
                    {order.paymentMethod === "CASH" ? "نقداً عند الاستلام" : "بطاقة إلكترونية"}
                  </td>
                </tr>
                {order.customerNotes && (
                  <tr>
                    <td style={{ padding: "6px 0", color: "#6b7280" }}>ملاحظات العميل:</td>
                    <td style={{ padding: "6px 0", color: "#b45309", fontWeight: 500 }}>
                      {order.customerNotes}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "18px",
            }}
          >
            <h3 style={{ margin: "0 0 14px", fontSize: "16px", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              الملخص المالي المحسوب سيرفر
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>المجموع الفرعي للأصناف:</span>
                <span>{fmt(order.subtotal + order.totalDiscount)} {order.currency}</span>
              </div>
              {order.totalDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                  <span>خصم العروض المطبقة:</span>
                  <span>-{fmt(order.totalDiscount)} {order.currency}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                <span>المجموع بعد الخصم:</span>
                <span>{fmt(order.subtotal)} {order.currency}</span>
              </div>
              {order.type === "DELIVERY" && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>رسوم التوصيل:</span>
                  <span>{fmt(order.deliveryFee)} {order.currency}</span>
                </div>
              )}
              {order.serviceCharge > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>خدمة صالة (12%):</span>
                  <span>{fmt(order.serviceCharge)} {order.currency}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "18px",
                  fontWeight: 700,
                  borderTop: "2px solid #f3f4f6",
                  paddingTop: "10px",
                  color: "#0f172a",
                }}
              >
                <span>الإجمالي النهائي:</span>
                <span>{fmt(order.total)} {order.currency}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#9ca3af", textAlign: "left" }}>
                {order.vatNote || "الأسعار تشمل ضريبة القيمة المضافة"}
              </div>
            </div>
          </div>
        </div>

        {/* Frozen Items Snapshot */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "18px",
            marginTop: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 14px", fontSize: "16px", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
            الأصناف المجمدة في الطلب ({order.items.length} صنف)
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", textAlign: "right" }}>
                  <th style={{ padding: "10px" }}>#</th>
                  <th style={{ padding: "10px" }}>اسم الصنف</th>
                  <th style={{ padding: "10px" }}>الحجم / الحصة</th>
                  <th style={{ padding: "10px" }}>الإضافات</th>
                  <th style={{ padding: "10px" }}>العرض المطبق</th>
                  <th style={{ padding: "10px" }}>سعر الوحدة</th>
                  <th style={{ padding: "10px", textAlign: "center" }}>الكمية</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px", color: "#9ca3af" }}>{idx + 1}</td>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{item.productName}</td>
                    <td style={{ padding: "10px", color: "#4b5563" }}>{item.variantLabel || "—"}</td>
                    <td style={{ padding: "10px" }}>
                      {item.selectedOptions && item.selectedOptions.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {item.selectedOptions.map((opt) => (
                            <span
                              key={opt.id}
                              style={{
                                background: "#f3f4f6",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "12px",
                              }}
                            >
                              {opt.name} (+{opt.price})
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: "10px" }}>
                      {item.appliedOffer ? (
                        <span style={{ color: "#dc2626", fontSize: "12px", fontWeight: 600 }}>
                          🏷️ {item.appliedOffer.title} (-{item.appliedOffer.discountPerUnit})
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: "10px" }}>{fmt(item.unitPrice)} ج.م</td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: 600 }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "10px", textAlign: "left", fontWeight: 700 }}>
                      {fmt(item.totalPrice)} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Timeline */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "18px",
            marginTop: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 14px", fontSize: "16px", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
            سجل التغييرات ومسار الطلب (Audit Timeline)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {order.timeline.map((entry, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  fontSize: "13px",
                  paddingBottom: "10px",
                  borderBottom: i < order.timeline.length - 1 ? "1px dashed #e5e7eb" : "none",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "12px",
                  }}
                >
                  ⏱️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      {entry.actor === "customer"
                        ? "العميل"
                        : entry.actor === "system"
                        ? "النظام التلقائي"
                        : entry.actor}
                    </span>
                    <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                      {new Date(entry.timestamp).toLocaleString("ar-EG")}
                    </span>
                  </div>
                  <div style={{ color: "#4b5563", marginTop: "2px" }}>
                    الإجراء: <strong>{entry.action}</strong>
                    {entry.fromStatus && entry.toStatus && (
                      <span> (من {entry.fromStatus} إلى {entry.toStatus})</span>
                    )}
                  </div>
                  {entry.note && (
                    <div style={{ color: "#6b7280", fontStyle: "italic", marginTop: "2px" }}>
                      ملاحظة: {entry.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
