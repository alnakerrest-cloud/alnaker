"use client";
import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "./actions";

export type BranchFormValues = {
  id?: string;
  nameAr: string;
  nameEn?: string | null;
  addressAr: string;
  addressEn?: string | null;
  cityAr: string;
  mapQuery?: string | null;
  phoneIntl?: string | null;
  whatsappNumber?: string | null;
  isOrderable?: boolean;
  openingHoursAr?: string | null;
  openingHoursEn?: string | null;
  isActive: boolean;
  sortOrder: number;
};

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: BranchFormValues;
  submitLabel: string;
};

const empty: BranchFormValues = {
  nameAr: "",
  nameEn: "",
  addressAr: "",
  addressEn: "",
  cityAr: "",
  mapQuery: "",
  phoneIntl: "",
  whatsappNumber: "",
  isOrderable: true,
  openingHoursAr: "",
  openingHoursEn: "",
  isActive: true,
  sortOrder: 0,
};

export default function BranchForm({ action, initial = empty, submitLabel }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const v = { ...empty, ...initial };
  return (
    <form action={formAction} className="admin-panel">
      <div className="admin-form">
        {state.error ? <p className="admin-flash err">{state.error}</p> : null}
        {state.ok && !initial.id ? <p className="admin-flash ok">تم الإنشاء. <Link href="/admin/branches">عودة</Link></p> : null}
        {state.ok && initial.id ? <p className="admin-flash ok">تم حفظ التعديلات.</p> : null}
        {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="nameAr">اسم الفرع (عربي) *</label>
            <input id="nameAr" name="nameAr" defaultValue={v.nameAr} />
          </div>
          <div className="admin-field">
            <label htmlFor="nameEn">اسم الفرع (English)</label>
            <input id="nameEn" name="nameEn" defaultValue={v.nameEn ?? ""} dir="ltr" placeholder="e.g. Gamasa Branch" />
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="cityAr">المدينة *</label>
            <input id="cityAr" name="cityAr" defaultValue={v.cityAr} />
          </div>
          <div className="admin-field">
            <label htmlFor="mapQuery">استعلام الخرائط (اختياري)</label>
            <input id="mapQuery" name="mapQuery" defaultValue={v.mapQuery ?? ""} dir="ltr" placeholder="اسم أو إحداثيات للبحث في خرائط" />
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="addressAr">العنوان (عربي) *</label>
            <textarea id="addressAr" name="addressAr" defaultValue={v.addressAr} rows={2} />
          </div>
          <div className="admin-field">
            <label htmlFor="addressEn">العنوان (English)</label>
            <textarea id="addressEn" name="addressEn" defaultValue={v.addressEn ?? ""} dir="ltr" rows={2} placeholder="e.g. Coastal Road, opposite Delta Univ." />
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="phoneIntl">هاتف الاتصال بالفرع (دولي)</label>
            <input id="phoneIntl" name="phoneIntl" defaultValue={v.phoneIntl ?? ""} dir="ltr" placeholder="+201094965222" />
            <span className="hint">رقم الهاتف لاستقبال مكالمات الزبائن.</span>
          </div>
          <div className="admin-field">
            <label htmlFor="whatsappNumber">رقم واتساب الطلبات المخصص لهذا الفرع *</label>
            <input id="whatsappNumber" name="whatsappNumber" defaultValue={v.whatsappNumber ?? ""} dir="ltr" placeholder="+201094965222" />
            <span className="hint">الرقم المستلم لطلبات الواتساب عند اختيار هذا الفرع.</span>
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="openingHoursAr">مواعيد العمل (عربي)</label>
            <input id="openingHoursAr" name="openingHoursAr" defaultValue={v.openingHoursAr ?? ""} placeholder="يومياً: ١٠:٠٠ ص – ١:٠٠ ص" />
          </div>
          <div className="admin-field">
            <label htmlFor="openingHoursEn">مواعيد العمل (English)</label>
            <input id="openingHoursEn" name="openingHoursEn" defaultValue={v.openingHoursEn ?? ""} dir="ltr" placeholder="Daily: 10:00 AM – 1:00 AM" />
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="sortOrder">ترتيب العرض</label>
            <input id="sortOrder" name="sortOrder" type="number" step="1" defaultValue={v.sortOrder} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignSelf: "end" }}>
            <label className="admin-checkbox">
              <input type="checkbox" name="isActive" defaultChecked={v.isActive} /> فرع مُفعّل (يظهر في الموقع)
            </label>
            <label className="admin-checkbox">
              <input type="checkbox" name="isOrderable" defaultChecked={v.isOrderable ?? true} /> استقبال الطلبات متاح (مفتوح للطلب عبر واتساب)
            </label>
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary">{submitLabel}</button>
          <Link href="/admin/branches" className="admin-btn">إلغاء</Link>
        </div>
      </div>
    </form>
  );
}
