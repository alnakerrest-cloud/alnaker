import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { verifyCloudinaryAccess } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export default async function ImagesPage() {
  await requireAdmin();

  // فحص اتصال فعلي (رفع رمزي + حذف) — لا يكفي وجود المتغيرات وحدها.
  const access = await verifyCloudinaryAccess(true);

  const [logo, cats, productImages] = await Promise.all([
    prisma.restaurantSettings.findUnique({ where: { id: "default" }, select: { logoUrl: true, logoPublicId: true } }),
    prisma.category.findMany({ where: { imageUrl: { not: null } }, select: { id: true, nameAr: true, imageUrl: true, imagePublicId: true }, orderBy: { sortOrder: "asc" } }),
    prisma.productImage.findMany({
      select: { id: true, url: true, publicId: true, productId: true, product: { select: { nameAr: true, id: true } } },
      orderBy: [{ publicId: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const chip = (ok: boolean) => <span className={`admin-badge ${ok ? "on" : "off"}`}>{ok ? "متصل" : "غير متاح"}</span>;

  return (
    <>
      <div className="admin-topbar">
        <h1>إدارة الصور</h1>
        <span className="admin-user-chip">وحدة مستقلة — Cloudinary</span>
      </div>

      <p className="admin-flash" style={{ background: access.ok ? "#e3f4e1" : "var(--bg-2)", border: "1px solid var(--line)", color: "var(--ink)" }}>
        {access.ok ? (
          <>حالة الاتصال: <b>{chip(true)}</b> — الرفع والاستبدال والحذف مُفعّلان. تُدار الصور من داخل صفحة كل منتج/قسم ومن صفحة الإعدادات (الشعار).</>
        ) : (
          <>حالة الاتصال: <b>{chip(false)}</b> — {access.reason ?? "تعذّر التحقق من Cloudinary."} الرفع مُعطّل حتى توفير صلاحيات كافية للمفتاح، ولن تُربط أي صورة بمنتج قبل التحقق.</>
        )}
      </p>

      <div className="admin-stats">
        <div className="admin-stat"><div className="num">{productImages.length}</div><div className="label">صور منتجات</div></div>
        <div className="admin-stat"><div className="num">{cats.length}</div><div className="label">أقسام بصورة</div></div>
        <div className="admin-stat"><div className="num">{logo?.logoUrl ? "1" : "0"}</div><div className="label">شعار مرفوع</div></div>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-header"><h2>الشعار</h2></div>
        <div style={{ padding: 18, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 96, height: 96, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)", background: "var(--bg-2)" }}>
            {logo?.logoUrl ? (
              <Image src={logo.logoUrl} alt="الشعار" fill sizes="96px" style={{ objectFit: "contain" }} />
            ) : (
              <span style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: 12 }}>افتراضي</span>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, color: "var(--muted)" }} dir="ltr">{logo?.logoPublicId ?? "—"}</div>
            <Link href="/admin/settings" className="admin-btn admin-btn-sm" style={{ marginTop: 8 }}>إدارة الشعار</Link>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header"><h2>صور الأقسام ({cats.length})</h2></div>
        {cats.length === 0 ? (
          <p style={{ padding: 18, color: "var(--muted)" }}>لا توجد أقسام بصورة بعد.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, padding: 18 }}>
            {cats.map((c) => (
              <div key={c.id} style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--bg-2)" }}>
                  <Image src={c.imageUrl!} alt={c.nameAr} fill sizes="200px" style={{ objectFit: "cover" }} />
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>{c.nameAr}</div>
                  <Link href={`/admin/categories/${c.id}`} className="admin-btn admin-btn-sm">إدارة</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header"><h2>صور المنتجات</h2></div>
        {productImages.length === 0 ? (
          <p style={{ padding: 18, color: "var(--muted)" }}>لا توجد صور منتجات بعد. ارفع من صفحة كل منتج.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, padding: 18 }}>
            {productImages.map((img) => (
              <div key={img.id} style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ position: "relative", aspectRatio: "1 / 1", background: "var(--bg-2)" }}>
                  <Image src={img.url} alt={img.product.nameAr} fill sizes="180px" style={{ objectFit: "cover" }} />
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>{img.product.nameAr}</div>
                  <Link href={`/admin/products/${img.product.id}`} className="admin-btn admin-btn-sm">إدارة</Link>
                </div>
              </div>
            ))}
          </div>
        )}
        <p style={{ padding: "0 18px 16px", color: "var(--muted)", fontSize: 13 }}>
          الحذف/الاستبدال يتمان من داخل صفحة المنتج أو القسم لتجنّب كسر أي مرجع مستخدم. لا تُوضع الصور في قاعدة البيانات كـ Binary؛
          يُخزَّن الرابط الآمن (<code>secure_url</code>) ومعرّف Cloudinary (<code>public_id</code>) فقط.
        </p>
      </section>
    </>
  );
}
