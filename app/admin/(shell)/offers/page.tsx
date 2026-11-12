import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import OfferRowActions from "./row-actions";

export const dynamic = "force-dynamic";

function getOfferTypeLabel(type: string): string {
  switch (type) {
    case "PERCENTAGE":
      return "نسبة مئوية";
    case "FIXED_AMOUNT":
      return "خصم ثابت";
    case "SPECIAL_PRICE":
      return "سعر خاص";
    case "BUNDLE":
      return "باقة كومبو";
    case "BUY_X_GET_Y":
      return "اشترِ واحصل";
    default:
      return type;
  }
}

export default async function OffersPage() {
  const admin = await requireAdmin(["OWNER", "EDITOR"]);
  const canDelete = admin.role === "OWNER";

  const offers = await prisma.offer.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      productTargets: { select: { productId: true } },
      categoryTargets: { select: { categoryId: true } },
      locationTargets: { select: { targetLocationId: true } },
    },
  });

  const now = new Date();
  const totalCount = offers.length;
  const activeCount = offers.filter((o) => {
    if (!o.isActive) return false;
    if (o.startDate && o.startDate > now) return false;
    if (o.endDate && o.endDate < now) return false;
    return true;
  }).length;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">إدارة العروض والخصومات</h1>
          <p className="admin-page-sub">
            إنشاء وجدولة العروض الترويجية والخصومات المئوية أو المحددة وربطها بالمنتجات والفروع.
          </p>
        </div>
        <Link href="/admin/offers/new" className="admin-btn admin-btn-primary">
          + إنشاء عرض جديد
        </Link>
      </div>

      <div style={{ display: "flex", gap: "14px", marginBottom: "20px" }}>
        <div className="admin-panel" style={{ flex: 1, padding: "14px 18px" }}>
          <small style={{ color: "var(--muted)" }}>إجمالي العروض</small>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--brand)" }}>
            {totalCount}
          </div>
        </div>
        <div className="admin-panel" style={{ flex: 1, padding: "14px 18px" }}>
          <small style={{ color: "var(--muted)" }}>العروض السارية الآن</small>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#15803d" }}>
            {activeCount}
          </div>
        </div>
      </div>

      <div className="admin-panel" style={{ overflowX: "auto" }}>
        {offers.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
            <p style={{ fontSize: "1.1rem", marginBottom: "14px" }}>لا توجد عروض مضافة حتى الآن.</p>
            <Link href="/admin/offers/new" className="admin-btn admin-btn-primary">
              أنشئ أول عرض الآن
            </Link>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>العرض</th>
                <th>النوع</th>
                <th>القيمة / السعر</th>
                <th>المستهدف</th>
                <th>الحالة</th>
                <th>الفترة الزمنية</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                const isUpcoming = offer.startDate && offer.startDate > now;
                const isExpired = offer.endDate && offer.endDate < now;
                const isCurrentlyLive = offer.isActive && !isUpcoming && !isExpired;

                let statusBadge = (
                  <span className="admin-badge status-inactive" style={{ background: "#fef3c7", color: "#92400e" }}>
                    غير مفعّل
                  </span>
                );
                if (offer.isActive) {
                  if (isExpired) {
                    statusBadge = (
                      <span className="admin-badge status-expired" style={{ background: "#fee2e2", color: "#991b1b" }}>
                        منتهي
                      </span>
                    );
                  } else if (isUpcoming) {
                    statusBadge = (
                      <span className="admin-badge status-upcoming" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                        قادم (مجدول)
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="admin-badge status-active" style={{ background: "#dcfce7", color: "#166534" }}>
                        سارٍ الآن
                      </span>
                    );
                  }
                }

                let valueDisplay = "—";
                if (offer.offerType === "PERCENTAGE" && offer.discountValue != null) {
                  valueDisplay = `خصم ${offer.discountValue}%`;
                } else if (offer.offerType === "FIXED_AMOUNT" && offer.discountValue != null) {
                  valueDisplay = `خصم ${offer.discountValue} ج.م`;
                } else if (offer.offerType === "SPECIAL_PRICE" && offer.promoPrice != null) {
                  valueDisplay = `${offer.promoPrice} ج.م`;
                } else if (offer.offerType === "BUY_X_GET_Y") {
                  valueDisplay = `اشترِ ${offer.buyQty} واحصل على ${offer.getQty}`;
                } else if (offer.offerType === "BUNDLE" && offer.promoPrice != null) {
                  valueDisplay = `${offer.promoPrice} ج.م`;
                }

                const targetDesc = [];
                if (offer.productTargets.length > 0) {
                  targetDesc.push(`${offer.productTargets.length} منتج`);
                }
                if (offer.categoryTargets.length > 0) {
                  targetDesc.push(`${offer.categoryTargets.length} قسم`);
                }
                if (targetDesc.length === 0) {
                  targetDesc.push("كل الأصناف");
                }
                if (offer.locationTargets.length > 0) {
                  targetDesc.push(`${offer.locationTargets.length} فرع`);
                } else {
                  targetDesc.push("كل الفروع");
                }

                return (
                  <tr key={offer.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {offer.imageUrl && (
                          <img
                            src={offer.imageUrl}
                            alt={offer.titleAr}
                            style={{ width: 44, height: 34, objectFit: "cover", borderRadius: 6 }}
                          />
                        )}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <strong>{offer.titleAr}</strong>
                            {(offer.sortOrder < 0 || (offer.badgeAr && offer.badgeAr.includes("مميز"))) && (
                              <span
                                className="admin-badge"
                                style={{
                                  background: "#fef3c7",
                                  color: "#b45309",
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  border: "1px solid rgba(217, 119, 6, 0.3)",
                                }}
                              >
                                ⭐ مميز
                              </span>
                            )}
                          </div>
                          {offer.titleEn && (
                            <div style={{ color: "var(--muted)", fontSize: "0.82rem" }} dir="ltr">
                              {offer.titleEn}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-badge" style={{ background: "var(--bg-2)", color: "var(--brand)" }}>
                        {getOfferTypeLabel(offer.offerType)}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "var(--brand)" }}>{valueDisplay}</strong>
                    </td>
                    <td>
                      <small style={{ color: "var(--muted)" }}>{targetDesc.join(" • ")}</small>
                    </td>
                    <td>{statusBadge}</td>
                    <td>
                      <small style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {offer.startDate ? new Date(offer.startDate).toLocaleDateString("ar-EG") : "فور التفعيل"}
                        {" → "}
                        {offer.endDate ? new Date(offer.endDate).toLocaleDateString("ar-EG") : "مستمر"}
                      </small>
                    </td>
                    <td>
                      <OfferRowActions
                        id={offer.id}
                        titleAr={offer.titleAr}
                        isActive={offer.isActive}
                        canDelete={canDelete}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

