"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { OfferActionState } from "./actions";

export type AvailableProduct = { id: string; nameAr: string; categoryNameAr?: string };
export type AvailableCategory = { id: string; nameAr: string };
export type AvailableBranch = { id: string; nameAr: string; cityAr: string };

export type OfferFormValues = {
  id?: string;
  titleAr: string;
  titleEn?: string | null;
  descAr?: string | null;
  descEn?: string | null;
  offerType: "PERCENTAGE" | "FIXED_AMOUNT" | "SPECIAL_PRICE" | "BUNDLE" | "BUY_X_GET_Y";
  discountValue?: number | null;
  promoPrice?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
  minOrderAmount?: number | null;
  minQuantity?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  sortOrder: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  badgeAr?: string | null;
  badgeEn?: string | null;
  productIds: string[];
  categoryIds: string[];
  locationIds: string[];
};

type Props = {
  action: (prev: OfferActionState, fd: FormData) => Promise<OfferActionState>;
  initial?: OfferFormValues;
  products: AvailableProduct[];
  categories: AvailableCategory[];
  branches: AvailableBranch[];
  submitLabel: string;
};

const empty: OfferFormValues = {
  titleAr: "",
  titleEn: "",
  descAr: "",
  descEn: "",
  offerType: "PERCENTAGE",
  discountValue: 15,
  promoPrice: null,
  buyQty: 1,
  getQty: 1,
  minOrderAmount: null,
  minQuantity: 1,
  startDate: null,
  endDate: null,
  isActive: false, // Created inactive by default per instructions
  sortOrder: 0,
  imageUrl: null,
  imagePublicId: null,
  badgeAr: "عرض خاص",
  badgeEn: "Special Offer",
  productIds: [],
  categoryIds: [],
  locationIds: [],
};

export default function OfferForm({
  action,
  initial = empty,
  products,
  categories,
  branches,
  submitLabel,
}: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<OfferActionState, FormData>(action, {});
  const v = { ...empty, ...initial };

  const [offerType, setOfferType] = useState<OfferFormValues["offerType"]>(v.offerType);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(v.productIds);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(v.categoryIds);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(v.locationIds);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (state.ok) {
      router.push("/admin/offers");
    }
  }, [state.ok, router]);

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const term = productSearch.toLowerCase();
    const nameMatch = p.nameAr ? p.nameAr.toLowerCase().includes(term) : false;
    const catMatch = p.categoryNameAr ? p.categoryNameAr.toLowerCase().includes(term) : false;
    return nameMatch || catMatch;
  });

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleLocation = (id: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <form action={formAction} className="admin-panel" encType="multipart/form-data">
      <div className="admin-form">
        {state.error ? <p className="admin-flash err">{state.error}</p> : null}
        {state.ok ? <p className="admin-flash ok">تم الحفظ بنجاح! جاري التحويل...</p> : null}
        {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        {/* Hidden inputs for selected arrays */}
        <input type="hidden" name="productIds" value={JSON.stringify(selectedProductIds)} />
        <input type="hidden" name="categoryIds" value={JSON.stringify(selectedCategoryIds)} />
        <input type="hidden" name="locationIds" value={JSON.stringify(selectedLocationIds)} />

        {/* 1. Basic Info */}
        <h3 style={{ margin: "4px 0 12px", color: "var(--brand)", fontSize: "1.1rem" }}>
          بيانات العرض الأساسية
        </h3>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="titleAr">عنوان أو اسم العرض (عربي) *</label>
            <input
              id="titleAr"
              name="titleAr"
              defaultValue={v.titleAr}
              required
              placeholder="مثال: خصم خاص 20% على المشويات"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="titleEn">عنوان العرض (English)</label>
            <input
              id="titleEn"
              name="titleEn"
              defaultValue={v.titleEn ?? ""}
              dir="ltr"
              placeholder="e.g. 20% Off on All Grills"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="descAr">وصف العرض والترويج (عربي)</label>
            <textarea
              id="descAr"
              name="descAr"
              defaultValue={v.descAr ?? ""}
              rows={2}
              placeholder="اكتب تفاصيل وشروط العرض للزبائن..."
            />
          </div>
          <div className="admin-field">
            <label htmlFor="descEn">وصف العرض (English)</label>
            <textarea
              id="descEn"
              name="descEn"
              defaultValue={v.descEn ?? ""}
              dir="ltr"
              rows={2}
              placeholder="Promotional details and conditions..."
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="badgeAr">شارة العرض (عربي)</label>
            <input
              id="badgeAr"
              name="badgeAr"
              defaultValue={v.badgeAr ?? "عرض خاص"}
              placeholder="عرض خاص / توفير كبير / وجبة اليوم"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="badgeEn">شارة العرض (English)</label>
            <input
              id="badgeEn"
              name="badgeEn"
              defaultValue={v.badgeEn ?? "Special Offer"}
              dir="ltr"
              placeholder="Special Offer / Best Value"
            />
          </div>
        </div>

        {/* 2. Offer Type & Pricing Configuration */}
        <h3 style={{ margin: "16px 0 12px", color: "var(--brand)", fontSize: "1.1rem" }}>
          نوع الخصم والتسعير
        </h3>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="offerType">نوع العرض والخصم *</label>
            <select
              id="offerType"
              name="offerType"
              value={offerType}
              onChange={(e) => setOfferType(e.target.value as any)}
            >
              <option value="PERCENTAGE">نسبة مئوية (Percentage Discount %)</option>
              <option value="FIXED_AMOUNT">مبلغ خصم ثابت (Fixed Discount EGP)</option>
              <option value="SPECIAL_PRICE">سعر ترويجي محدد (Special Promotional Price)</option>
              <option value="BUNDLE">عرض باقة / كومبو (Bundle / Combo Offer)</option>
              <option value="BUY_X_GET_Y">اشترِ X واحصل على Y مجاناً (Buy X Get Y)</option>
            </select>
          </div>

          {offerType === "PERCENTAGE" && (
            <div className="admin-field">
              <label htmlFor="discountValue">نسبة الخصم المئوية (%) *</label>
              <input
                id="discountValue"
                name="discountValue"
                type="number"
                step="0.5"
                min="1"
                max="100"
                defaultValue={v.discountValue ?? 15}
                required
                placeholder="15"
              />
              <span className="hint">مثال: 15 تعني خصم 15% من سعر الصنف.</span>
            </div>
          )}

          {offerType === "FIXED_AMOUNT" && (
            <div className="admin-field">
              <label htmlFor="discountValue">مبلغ الخصم للقطعة (ج.م) *</label>
              <input
                id="discountValue"
                name="discountValue"
                type="number"
                step="1"
                min="1"
                defaultValue={v.discountValue ?? 30}
                required
                placeholder="30"
              />
              <span className="hint">مثال: 30 تعني خصم 30 ج.م من سعر الصنف.</span>
            </div>
          )}

          {offerType === "SPECIAL_PRICE" && (
            <div className="admin-field">
              <label htmlFor="promoPrice">السعر الترويجي النهائي (ج.م) *</label>
              <input
                id="promoPrice"
                name="promoPrice"
                type="number"
                step="1"
                min="1"
                defaultValue={v.promoPrice ?? 199}
                required
                placeholder="199"
              />
              <span className="hint">مثال: 199 تعني بيع الصنف بهذا السعر المخفض.</span>
            </div>
          )}

          {offerType === "BUY_X_GET_Y" && (
            <div style={{ display: "flex", gap: "12px" }}>
              <div className="admin-field" style={{ flex: 1 }}>
                <label htmlFor="buyQty">اشترِ عدد (X) *</label>
                <input
                  id="buyQty"
                  name="buyQty"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={v.buyQty ?? 2}
                  required
                />
              </div>
              <div className="admin-field" style={{ flex: 1 }}>
                <label htmlFor="getQty">واحصل على مجاناً (Y) *</label>
                <input
                  id="getQty"
                  name="getQty"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={v.getQty ?? 1}
                  required
                />
              </div>
            </div>
          )}

          {offerType === "BUNDLE" && (
            <div className="admin-field">
              <label htmlFor="promoPrice">سعر الباقة الإجمالي (ج.م) *</label>
              <input
                id="promoPrice"
                name="promoPrice"
                type="number"
                step="1"
                min="1"
                defaultValue={v.promoPrice ?? 299}
                required
                placeholder="299"
              />
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="minQuantity">الحد الأدنى للكمية لتطبيق العرض</label>
            <input
              id="minQuantity"
              name="minQuantity"
              type="number"
              min="1"
              step="1"
              defaultValue={v.minQuantity ?? 1}
            />
            <span className="hint">1 يعني يطبق فور اختيار قطعة واحدة أو أكثر.</span>
          </div>
          <div className="admin-field">
            <label htmlFor="minOrderAmount">الحد الأدنى لقيمة الطلب (اختياري)</label>
            <input
              id="minOrderAmount"
              name="minOrderAmount"
              type="number"
              min="0"
              step="10"
              defaultValue={v.minOrderAmount ?? ""}
              placeholder="مثال: 500"
            />
          </div>
        </div>

        {/* 3. Scheduling & Priority */}
        <h3 style={{ margin: "16px 0 12px", color: "var(--brand)", fontSize: "1.1rem" }}>
          المواعيد وجدولة العرض
        </h3>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="startDate">تاريخ وبداية سريان العرض (اختياري)</label>
            <input
              id="startDate"
              name="startDate"
              type="datetime-local"
              defaultValue={v.startDate ? v.startDate.slice(0, 16) : ""}
            />
            <span className="hint">فارغ = يبدأ فور التفعيل.</span>
          </div>
          <div className="admin-field">
            <label htmlFor="endDate">تاريخ ووقت انتهاء العرض (اختياري)</label>
            <input
              id="endDate"
              name="endDate"
              type="datetime-local"
              defaultValue={v.endDate ? v.endDate.slice(0, 16) : ""}
            />
            <span className="hint">فارغ = مستمر حتى إيقافه يدوياً.</span>
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="sortOrder">ترتيب العرض (الأولوية)</label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              step="1"
              defaultValue={v.sortOrder}
            />
            <span className="hint">الرقم الأقل يظهر أولاً وله الأولوية في التطبيق.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "18px" }}>
            <label className="admin-checkbox" style={{ fontWeight: 700, fontSize: "1rem" }}>
              <input type="checkbox" name="isActive" defaultChecked={v.isActive} /> تفعيل العرض (يظهر
              في الموقع العام)
            </label>
            <label className="admin-checkbox" style={{ fontWeight: 800, fontSize: "0.95rem", color: "#b45309" }}>
              <input
                type="checkbox"
                name="isFeatured"
                id="isFeatured"
                defaultChecked={v.sortOrder < 0 || (v.badgeAr ? v.badgeAr.includes("مميز") : false)}
              />
              ⭐ عرض مميز (Featured Offer) — يتصدر السلايدر وله الأولوية البصرية
            </label>
          </div>
        </div>

        {/* 4. Promotional Image */}
        <h3 style={{ margin: "16px 0 12px", color: "var(--brand)", fontSize: "1.1rem" }}>
          صورة العرض الترويجية
        </h3>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="imageFile">رفع صورة جديدة للعرض</label>
            <input id="imageFile" name="imageFile" type="file" accept="image/*" />
            <span className="hint">صورة ترويجية للعرض في الموقع العام وقسم العروض.</span>
          </div>
          {v.imageUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ position: "relative", width: 80, height: 60, borderRadius: 8, overflow: "hidden" }}>
                <Image src={v.imageUrl} alt={v.titleAr} fill style={{ objectFit: "cover" }} />
              </div>
              <label className="admin-checkbox" style={{ color: "#b91c1c" }}>
                <input type="checkbox" name="removeImage" /> حذف الصورة الحالية
              </label>
              <input type="hidden" name="imageUrl" value={v.imageUrl} />
              {v.imagePublicId && <input type="hidden" name="imagePublicId" value={v.imagePublicId} />}
            </div>
          )}
        </div>

        {/* 5. Target Branches */}
        <h3 style={{ margin: "16px 0 8px", color: "var(--brand)", fontSize: "1.1rem" }}>
          الفروع المشمولة بالعرض
        </h3>
        <p className="hint" style={{ marginBottom: "12px" }}>
          إذا لم تحدد أي فرع، سيسري العرض تلقائياً على <strong>جميع الفروع</strong>.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          {branches.map((b) => {
            const isChecked = selectedLocationIds.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleLocation(b.id)}
                className={`admin-btn${isChecked ? " admin-btn-primary" : ""}`}
                style={{ borderRadius: 999 }}
              >
                {isChecked ? "✓ " : "+ "}
                {b.nameAr} {b.cityAr ? `(${b.cityAr})` : ""}
              </button>
            );
          })}
        </div>

        {/* 6. Target Categories */}
        <h3 style={{ margin: "16px 0 8px", color: "var(--brand)", fontSize: "1.1rem" }}>
          الأقسام المشمولة بالعرض (اختياري)
        </h3>
        <p className="hint" style={{ marginBottom: "12px" }}>
          اختيار قسم يطبق العرض على كافة منتجاته.
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {categories.map((c) => {
            const isChecked = selectedCategoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={`admin-btn${isChecked ? " admin-btn-primary" : ""}`}
                style={{ borderRadius: 999, fontSize: "0.88rem" }}
              >
                {isChecked ? "✓ " : "+ "}
                {c.nameAr}
              </button>
            );
          })}
        </div>

        {/* 7. Target Products Multi-selector */}
        <h3 style={{ margin: "16px 0 8px", color: "var(--brand)", fontSize: "1.1rem" }}>
          المنتجات المحددة المشمولة بالعرض ({selectedProductIds.length} منتج محدد)
        </h3>
        <div className="admin-field" style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="ابحث باسم المنتج لتحديده للعرض..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>

        <div
          style={{
            maxHeight: 220,
            overflowY: "auto",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: "8px 12px",
            background: "var(--surface)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "6px",
          }}
        >
          {filteredProducts.map((p) => {
            const isChecked = selectedProductIds.includes(p.id);
            return (
              <label
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: isChecked ? "var(--gold-soft)" : "transparent",
                  fontSize: "0.9rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleProduct(p.id)}
                />
                <span style={{ fontWeight: isChecked ? 700 : 400 }}>{p.nameAr}</span>
                {p.categoryNameAr && (
                  <small style={{ color: "var(--muted)", marginInlineStart: "auto" }}>
                    {p.categoryNameAr}
                  </small>
                )}
              </label>
            );
          })}
        </div>

        {/* Actions */}
        <div className="admin-form-actions" style={{ marginTop: "24px" }}>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isPending}
          >
            {isPending ? "جاري الحفظ..." : submitLabel}
          </button>
          <Link href="/admin/offers" className="admin-btn">
            إلغاء
          </Link>
        </div>
      </div>
    </form>
  );
}

