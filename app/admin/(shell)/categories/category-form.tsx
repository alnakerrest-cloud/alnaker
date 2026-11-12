"use client";
import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "./actions";

export type CategoryFormValues = {
  id?: string;
  nameAr: string;
  slug: string;
  icon: string;
  group: "FOOD" | "DRINKS";
  layout: "TRAYS" | "LIST";
  noteAr: string;
  isVisible: boolean;
  sortOrder: number;
};

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: CategoryFormValues;
  submitLabel: string;
  cancelHref?: string;
};

const empty: CategoryFormValues = { nameAr: "", slug: "", icon: "🍽️", group: "FOOD", layout: "LIST", noteAr: "", isVisible: true, sortOrder: 0 };

export default function CategoryForm({ action, initial = empty, submitLabel, cancelHref = "/admin/categories" }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const v = { ...empty, ...initial };
  return (
    <form action={formAction} className="admin-panel">
      <div className="admin-form">
        {state.error ? <p className="admin-flash err">{state.error}</p> : null}
        {state.ok && !initial.id ? <p className="admin-flash ok">تم الإنشاء بنجاح. <Link href="/admin/categories">عودة للقائمة</Link></p> : null}
        {state.ok && initial.id ? <p className="admin-flash ok">تم حفظ التعديلات.</p> : null}
        {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="nameAr">اسم القسم (عربي) *</label>
            <input id="nameAr" name="nameAr" defaultValue={v.nameAr} />
          </div>
          <div className="admin-field">
            <label htmlFor="slug">المعرّف slug</label>
            <input id="slug" name="slug" defaultValue={v.slug} dir="ltr" placeholder="اختياري — يُولّد تلقائيًا" />
            <span className="hint">للاستقرار في الروابط؛ اتركه فارغًا لإنشاء معرّف جديد.</span>
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="group">المجموعة</label>
            <select id="group" name="group" defaultValue={v.group}>
              <option value="FOOD">أطعمة</option>
              <option value="DRINKS">مشروبات</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="layout">نوع العرض</label>
            <select id="layout" name="layout" defaultValue={v.layout}>
              <option value="LIST">قائمة</option>
              <option value="TRAYS">صواني</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="admin-field">
            <label htmlFor="icon">أيقونة (emoji)</label>
            <input id="icon" name="icon" defaultValue={v.icon} maxLength={8} />
          </div>
          <div className="admin-field">
            <label htmlFor="sortOrder">ترتيب العرض</label>
            <input id="sortOrder" name="sortOrder" type="number" step="1" defaultValue={v.sortOrder} />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="noteAr">ملاحظة القسم (اختياري)</label>
          <textarea id="noteAr" name="noteAr" defaultValue={v.noteAr} />
        </div>

        <label className="admin-checkbox">
          <input type="checkbox" name="isVisible" defaultChecked={v.isVisible} /> ظاهر في المنيو العام
        </label>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary">{submitLabel}</button>
          <Link href={cancelHref} className="admin-btn">إلغاء</Link>
        </div>
      </div>
    </form>
  );
}
