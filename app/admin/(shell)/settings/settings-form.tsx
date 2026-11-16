"use client";
import { useActionState } from "react";
import type { ActionState } from "./actions";

export type SettingsFormValues = {
  brandNameAr: string;
  taglineAr: string;
  phoneDisplay: string;
  phoneIntl: string;
  currencyAr: string;
  vatNoteAr: string;
  deliveryFee: string; // نص للـ input؛ "" = null
};

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial: SettingsFormValues;
  submitLabel: string;
  readOnly?: boolean;
};

export default function SettingsForm({ action, initial, submitLabel, readOnly = false }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const v = initial;
  return (
    <form action={formAction} className="admin-panel">
      <div className="admin-form">
        {state.error ? <p className="admin-flash err">{state.error}</p> : null}
        {state.ok ? <p className="admin-flash ok">تم حفظ الإعدادات، وستظهر على الموقع العام فورًا.</p> : null}

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="brandNameAr">اسم المطعم (براند) *</label>
            <input id="brandNameAr" name="brandNameAr" defaultValue={v.brandNameAr} />
          </div>
          <div className="admin-field">
            <label htmlFor="taglineAr">الوصف/الشعار المختصر</label>
            <input id="taglineAr" name="taglineAr" defaultValue={v.taglineAr} />
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="phoneDisplay">الهاتف الظاهر</label>
            <input id="phoneDisplay" name="phoneDisplay" defaultValue={v.phoneDisplay} dir="ltr" />
          </div>
          <div className="admin-field">
            <label htmlFor="phoneIntl">الهاتف الدولي (للنقر/الواتساب)</label>
            <input id="phoneIntl" name="phoneIntl" defaultValue={v.phoneIntl} dir="ltr" placeholder="+20..." />
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="currencyAr">رمز العملة</label>
            <input id="currencyAr" name="currencyAr" defaultValue={v.currencyAr} />
          </div>
          <div className="admin-field">
            <label htmlFor="deliveryFee">رسوم التوصيل (ج.م) — اتركه فارغًا = بدون</label>
            <input id="deliveryFee" name="deliveryFee" type="number" step="0.5" min="0" defaultValue={v.deliveryFee} />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="vatNoteAr">ملاحظة الضريبة (تظهر أسفل المنيو)</label>
          <textarea id="vatNoteAr" name="vatNoteAr" defaultValue={v.vatNoteAr} />
        </div>

        <p className="hint" style={{ margin: 0 }}>
          يُدار الشعار (لوجو) وصور المنتجات من وحدة «إدارة الصور» المستقلة، ولا تُرفع من هنا.
        </p>

        <div className="admin-form-actions">
          {!readOnly ? <button type="submit" className="admin-btn admin-btn-primary">{submitLabel}</button> : <span className="hint">التعديل متاح للمالك فقط.</span>}
        </div>
      </div>
    </form>
  );
}
