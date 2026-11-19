import QRCode from "qrcode";
import Link from "next/link";
import { getOrderByNumber } from "@/lib/orders-store";
import { getBackupSiteData } from "@/lib/backup-menu-db";
import ReceiptActionButtons from "@/components/ReceiptActionButtons";
import OrderTrackingTimeline from "@/components/OrderTrackingTimeline";

export const dynamic = "force-dynamic";

interface ReceiptPageProps {
  params: Promise<{ locale: string; orderNumber: string }>;
  searchParams?: Promise<{ token?: string }>;
}

const fmt = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

async function generateQrSvg(text: string): Promise<string> {
  return new Promise((resolve) => {
    QRCode.toString(
      text,
      {
        type: "svg",
        width: 140,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      },
      (err, svg) => {
        if (err || !svg) {
          resolve("");
        } else {
          resolve(svg);
        }
      }
    );
  });
}

export default async function ReceiptPage({ params, searchParams }: ReceiptPageProps) {
  const { locale, orderNumber } = await params;
  const sParams = searchParams ? await searchParams : {};
  const token = sParams.token;

  const cleanOrderNumber = decodeURIComponent(orderNumber || "").trim();
  const order = getOrderByNumber(cleanOrderNumber);
  const siteData = getBackupSiteData("ar");

  if (!order) {
    return (
      <div style={{ maxWidth: "600px", margin: "60px auto", padding: "30px", textAlign: "center", background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
        <h1 style={{ color: "#dc2626", fontSize: "24px" }}>الطلب غير موجود</h1>
        <p style={{ color: "#6b7280", margin: "16px 0 24px" }}>
          لم يتم العثور على أي طلب مسجل بالرقم: <strong style={{ color: "#111827" }}>{orderNumber}</strong>
        </p>
        <Link
          href={`/${locale || "ar"}`}
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "#b8860b",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          العودة لتصفح المنيو
        </Link>
      </div>
    );
  }

  // Security guard: verify token to prevent enumeration and leaking customer data
  if (!token || token !== order.verificationToken) {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "60px auto",
          padding: "36px 30px",
          textAlign: "center",
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #fecaca",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          direction: "rtl",
        }}
      >
        <div style={{ fontSize: "52px", marginBottom: "16px" }}>🔒</div>
        <h1 style={{ color: "#991b1b", fontSize: "22px", fontWeight: 800, margin: "0 0 10px" }}>
          صلاحية الوصول غير متوفرة
        </h1>
        <p style={{ color: "#4b5563", margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6 }}>
          لأسباب أمنية ولحماية خصوصية بيانات العميل، لا يمكن عرض تفاصيل هذا الطلب دون استخدام رمز التحقق الأصلي (Verification Token). يرجى فتح الرابط المرفق في رسالة الواتساب أو شاشة تأكيد الطلب.
        </p>
        <Link
          href={`/${locale || "ar"}`}
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "#0f172a",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          العودة للمنيو الرئيسي
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

  const isRejected = order.status === "REJECTED";
  const isCancelled = order.status === "CANCELLED";
  const isExpired = order.status === "EXPIRED";

  // Verification URL for QR code
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
  const verificationUrl = `${baseUrl}/api/orders/${order.orderNumber}/verify?token=${order.verificationToken}`;
  const qrSvg = isConfirmed ? await generateQrSvg(verificationUrl) : "";

  return (
    <>
      {/* Inline styles for Print Optimization */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background: #fff !important; color: #000 !important; }
              header, nav, .site-header, .site-footer, .receipt-actions-wrapper, .admin-btn, .btn-back { display: none !important; }
              .receipt-wrapper { max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
              .no-print { display: none !important; }
            }
          `,
        }}
      />

      <div
        className="receipt-wrapper"
        style={{
          maxWidth: "680px",
          margin: "32px auto",
          padding: "28px",
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          direction: "rtl",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Dynamic Live Order Tracking Timeline */}
        <OrderTrackingTimeline
          orderNumber={order.orderNumber}
          token={order.verificationToken}
          initialStatus={order.status}
          locale={locale}
        />

        {/* Tier 1 vs Tier 2 Status Banner */}
        {isConfirmed ? (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #10b981",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "32px" }}>✅</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: "#065f46", fontSize: "17px", fontWeight: 700 }}>
                إيصال رسمي معتمد من المطعم
              </h3>
              <p style={{ margin: "4px 0 0", color: "#047857", fontSize: "13px" }}>
                تمت مراجعة وقبول الطلب رسمياً من إدارة قرية الناقر. الطلب قيد التجهيز.
              </p>
              <div style={{ fontSize: "12px", color: "#059669", marginTop: "4px" }}>
                وقت الاعتماد: {order.confirmedAt ? new Date(order.confirmedAt).toLocaleString("ar-EG") : "—"} • المعتمد: {order.confirmedBy || "إدارة المطعم"}
              </div>
            </div>
            <div style={{ textAlign: "center", background: "#fff", padding: "6px 12px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
              <span style={{ fontSize: "11px", color: "#6b7280", display: "block" }}>كود التحقق</span>
              <strong style={{ fontFamily: "monospace", fontSize: "15px", color: "#065f46" }}>
                {order.verificationCode}
              </strong>
            </div>
          </div>
        ) : isRejected ? (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #ef4444",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "32px" }}>❌</div>
            <div>
              <h3 style={{ margin: 0, color: "#991b1b", fontSize: "17px", fontWeight: 700 }}>
                تم الاعتذار عن قبول الطلب
              </h3>
              <p style={{ margin: "4px 0 0", color: "#b91c1c", fontSize: "13px" }}>
                نعتذر لكم، تعذر قبول هذا الطلب من قبل إدارة المطعم.
              </p>
              {order.rejectionReason && (
                <div style={{ fontSize: "13px", color: "#7f1d1d", marginTop: "4px", fontWeight: 600 }}>
                  السبب: {order.rejectionReason}
                </div>
              )}
            </div>
          </div>
        ) : isCancelled ? (
          <div
            style={{
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "32px" }}>🚫</div>
            <div>
              <h3 style={{ margin: 0, color: "#374151", fontSize: "17px", fontWeight: 700 }}>
                تم إلغاء هذا الطلب
              </h3>
              {order.cancellationReason && (
                <div style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>
                  السبب: {order.cancellationReason}
                </div>
              )}
            </div>
          </div>
        ) : isExpired ? (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #f87171",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "32px" }}>⏰</div>
            <div>
              <h3 style={{ margin: 0, color: "#991b1b", fontSize: "17px", fontWeight: 700 }}>
                انتهت صلاحية الطلب (Expired)
              </h3>
              <p style={{ margin: "4px 0 0", color: "#b91c1c", fontSize: "13px" }}>
                لم يتم إرسال أو تأكيد الطلب خلال الوقت المحدد (30 دقيقة). يرجى إعادة الطلب من المنيو.
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #f59e0b",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "32px" }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: "#92400e", fontSize: "17px", fontWeight: 700 }}>
                ملخص مبدئي — في انتظار مراجعة وقبول المطعم
              </h3>
              <p style={{ margin: "4px 0 0", color: "#b45309", fontSize: "13px" }}>
                هذا ملخص بالطلب المرسل ولا يعتبر إيصالاً رسمياً معتمداً حتى يقوم المطعم بمراجعته وتأكيده.
              </p>
              <div style={{ fontSize: "12px", color: "#92400e", marginTop: "4px" }}>
                الحالة الحالية:{" "}
                <strong>
                  {order.status === "PENDING_WHATSAPP"
                    ? "في انتظار إرسال واتساب"
                    : order.status === "CUSTOMER_CONFIRMED_SENT"
                    ? "أرسل العميل واتساب — بانتظار موافقة المطعم"
                    : "تم استلام الطلب من الإدارة"}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Header */}
        <header
          style={{
            textAlign: "center",
            paddingBottom: "20px",
            borderBottom: "2px dashed #e2e8f0",
            marginBottom: "20px",
          }}
        >
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>
            {siteData.brand || "قرية الناقر"}
          </h1>
          <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#64748b" }}>
            {siteData.tagline || "أصالة المندي والمشويات والمأكولات البدوية"}
          </p>
          <div style={{ fontSize: "13px", color: "#475569" }}>
            فرع: <strong>{order.branchNameAr}</strong>
            {order.branchAddressAr ? ` — ${order.branchAddressAr}` : ""}
          </div>
        </header>

        {/* Order Meta Details */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            fontSize: "14px",
            marginBottom: "20px",
            background: "#f8fafc",
            padding: "16px",
            borderRadius: "10px",
          }}
        >
          <div>
            <span style={{ color: "#64748b" }}>رقم الطلب: </span>
            <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>{order.orderNumber}</strong>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>التاريخ: </span>
            <span>{new Date(order.createdAt).toLocaleString("ar-EG")}</span>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>نوع الطلب: </span>
            <strong>{order.type === "DELIVERY" ? "توصيل للمنزل 🚚" : "استلام من الفرع 🏢"}</strong>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>طريقة الدفع: </span>
            <strong>{order.paymentMethod === "CASH" ? "نقداً عند الاستلام" : "بطاقة دفع إلكتروني"}</strong>
          </div>
          {order.customerName && (
            <div>
              <span style={{ color: "#64748b" }}>اسم العميل: </span>
              <strong>{order.customerName}</strong>
            </div>
          )}
          <div>
            <span style={{ color: "#64748b" }}>رقم الهاتف: </span>
            <span dir="ltr"><strong>{order.customerPhone}</strong></span>
          </div>
          {order.type === "DELIVERY" && order.deliveryAddress && (
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "#64748b" }}>عنوان التوصيل: </span>
              <strong>{order.deliveryAddress}</strong>
            </div>
          )}
          {order.customerNotes && (
            <div style={{ gridColumn: "1 / -1", color: "#b45309" }}>
              <span>ملاحظات: </span>
              <span>{order.customerNotes}</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
            تفاصيل الأصناف:
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "right" }}>
                <th style={{ padding: "8px 0" }}>الصنف</th>
                <th style={{ padding: "8px 0", textAlign: "center" }}>الكمية</th>
                <th style={{ padding: "8px 0", textAlign: "left" }}>السعر</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 0" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {it.productName}
                      {it.variantLabel ? ` (${it.variantLabel})` : ""}
                    </div>
                    {it.selectedOptions && it.selectedOptions.length > 0 && (
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        إضافات: {it.selectedOptions.map((o) => `${o.name} (+${o.price})`).join("، ")}
                      </div>
                    )}
                    {it.removedIngredients && it.removedIngredients.length > 0 && (
                      <div style={{ fontSize: "12px", color: "#dc2626", marginTop: "2px", fontWeight: 600 }}>
                        🚫 استبعاد مكونات: {it.removedIngredients.map((r) => `بدون ${r}`).join("، ")}
                      </div>
                    )}
                    {it.appliedOffer && (
                      <div style={{ fontSize: "12px", color: "#dc2626", marginTop: "2px" }}>
                        🏷️ {it.appliedOffer.title} (-{it.appliedOffer.discountPerUnit} {order.currency})
                      </div>
                    )}
                    {it.notes && (
                      <div style={{ fontSize: "12px", color: "#b45309", marginTop: "2px" }}>
                        ملاحظة: {it.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "center", fontWeight: 600 }}>
                    {it.quantity}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "left", fontWeight: 700 }}>
                    {fmt(it.totalPrice)} {order.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div
          style={{
            borderTop: "2px dashed #e2e8f0",
            paddingTop: "14px",
            marginBottom: "20px",
            fontSize: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {order.totalDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
              <span>إجمالي الخصم المطبق:</span>
              <span>-{fmt(order.totalDiscount)} {order.currency}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b" }}>المجموع الفرعي:</span>
            <span>{fmt(order.subtotal)} {order.currency}</span>
          </div>
          {order.type === "DELIVERY" && order.deliveryFee > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>رسوم التوصيل:</span>
              <span>{fmt(order.deliveryFee)} {order.currency}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "18px",
              fontWeight: 800,
              color: "#0f172a",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "10px",
              marginTop: "4px",
            }}
          >
            <span>الإجمالي المستحق:</span>
            <span>{fmt(order.total)} {order.currency}</span>
          </div>
        </div>

        {/* Official QR Code & Authenticity Section (Tier 2 only) */}
        {isConfirmed && qrSvg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              background: "#f8fafc",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
                رمز التحقق الرقمي الرسمي (QR Code)
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                امسح الرمز بكاميرا هاتفك للتحقق من مصداقية الإيصال وحالة الطلب لدى المطعم.
              </p>
              <div style={{ marginTop: "6px", fontSize: "12px", color: "#059669", fontWeight: 600 }}>
                كود الأمان: {order.verificationCode}
              </div>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              style={{ flexShrink: 0, background: "#fff", padding: "4px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
        )}

        {/* VAT Note */}
        {order.vatNote && (
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
            {order.vatNote}
          </p>
        )}

        {/* Interactive Action Buttons */}
        <ReceiptActionButtons
          orderNumber={order.orderNumber}
          status={order.status}
          whatsappUrl={order.whatsappUrl}
          isConfirmed={isConfirmed}
        />
      </div>
    </>
  );
}
