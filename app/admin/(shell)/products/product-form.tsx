"use client";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import type { ProductActionState } from "./actions";

export type VariantValue = { id?: string; labelAr: string; price: string; maxPrice: string; isAvailable: boolean };
export type ProductFormValues = {
  id?: string;
  nameAr: string;
  descAr: string;
  sectionId: string;
  badge: "" | "SIGNATURE" | "OFFER";
  ingredientsAr: string;
  isAvailable: boolean;
  isVisible: boolean;
  isFeatured: boolean;
  sortOrder: number;
  variants: VariantValue[];
};

type SectionOption = { id: string; label: string };
type Props = {
  action: (prev: ProductActionState, fd: FormData) => Promise<ProductActionState>;
  sections: SectionOption[];
  initial?: ProductFormValues;
  submitLabel: string;
};

const newVariant = (): VariantValue => ({ labelAr: "", price: "", maxPrice: "", isAvailable: true });

export default function ProductForm({ action, sections, initial, submitLabel }: Props) {
  const [state, formAction] = useActionState<ProductActionState, FormData>(action, {});
  const [variants, setVariants] = useState<VariantValue[]>(initial?.variants?.length ? initial.variants : [newVariant()]);
  const [defaultSection] = useState(sections[0]?.id ?? "");

  const variantsJson = useMemo(() => JSON.stringify(
    variants.map((v, i) => ({
      id: v.id,
      labelAr: v.labelAr,
      price: v.price,
      maxPrice: v.maxPrice,
      isAvailable: v.isAvailable,
      sortOrder: i,
    })),
  ), [variants]);

  const setV = (i: number, patch: Partial<VariantValue>) =>
    setVariants((arr) => arr.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const v = initial ?? {
    nameAr: "", descAr: "", sectionId: defaultSection, badge: "" as const, ingredientsAr: "",
    isAvailable: true, isVisible: true, isFeatured: false, sortOrder: 0, variants: [],
  };

  return (
    <form action={formAction} className="admin-panel">
      <input type="hidden" name="variants" value={variantsJson} />
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="admin-form">
        {state.error ? <p className="admin-flash err">{state.error}</p> : null}
        {state.ok && !initial?.id ? <p className="admin-flash ok">تم الإنشاء. <Link href="/admin/products">عودة</Link></p> : null}
        {state.ok && initial?.id ? <p className="admin-flash ok">تم حفظ التعديلات.</p> : null}

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="nameAr">اسم المنتج (عربي) *</label>
            <input id="nameAr" name="nameAr" defaultValue={v.nameAr} />
          </div>
          <div className="admin-field">
            <label htmlFor="sectionId">القسم / العنبر *</label>
            <select id="sectionId" name="sectionId" defaultValue={v.sectionId || defaultSection} required>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="descAr">الوصف (اختياري — لا تختلق وصفًا)</label>
          <textarea id="descAr" name="descAr" defaultValue={v.descAr} />
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="badge">شارة</label>
            <select id="badge" name="badge" defaultValue={v.badge}>
              <option value="">بدون</option>
              <option value="SIGNATURE">مميز</option>
              <option value="OFFER">عرض</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="sortOrder">ترتيب العرض</label>
            <input id="sortOrder" name="sortOrder" type="number" step="1" defaultValue={v.sortOrder} />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="ingredientsAr">مكوّنات الصينية (مفصولة بفواصل/أسطر — للصواني فقط)</label>
          <textarea id="ingredientsAr" name="ingredientsAr" defaultValue={v.ingredientsAr} />
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <label className="admin-checkbox"><input type="checkbox" name="isVisible" defaultChecked={v.isVisible} /> ظاهر</label>
          <label className="admin-checkbox"><input type="checkbox" name="isAvailable" defaultChecked={v.isAvailable} /> متوفر</label>
          <label className="admin-checkbox"><input type="checkbox" name="isFeatured" defaultChecked={v.isFeatured} /> مميّز (Featured)</label>
        </div>

        <div className="admin-field">
          <label>الأسعار / الأحجام *</label>
          <div className="admin-variants">
            <div className="admin-variant-row" style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)" }}>
              <span>الملصق (ثلث كيلو/سنجل/…)</span><span>السعر</span><span>حد أقصى (نطاق)</span><span>متوفر</span><span></span>
            </div>
            {variants.map((vr, i) => (
              <div key={i} className="admin-variant-row">
                <input placeholder="بدون ملصق" value={vr.labelAr} onChange={(e) => setV(i, { labelAr: e.target.value })} />
                <input type="number" step="0.5" placeholder="السعر" value={vr.price} onChange={(e) => setV(i, { price: e.target.value })} />
                <input type="number" step="0.5" placeholder="—" value={vr.maxPrice} onChange={(e) => setV(i, { maxPrice: e.target.value })} />
                <label className="admin-checkbox" style={{ justifyContent: "center" }}>
                  <input type="checkbox" checked={vr.isAvailable} onChange={(e) => setV(i, { isAvailable: e.target.checked })} />
                </label>
                <button type="button" className="admin-btn admin-btn-sm" onClick={() => setVariants((a) => (a.length > 1 ? a.filter((_, idx) => idx !== i) : a))}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" className="admin-btn admin-btn-sm" style={{ marginTop: 8, width: "fit-content" }} onClick={() => setVariants((a) => [...a, newVariant()])}>
            + إضافة سعر
          </button>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary">{submitLabel}</button>
          <Link href="/admin/products" className="admin-btn">إلغاء</Link>
        </div>
      </div>
    </form>
  );
}
