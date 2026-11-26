"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCategoryVisible, moveCategory, deleteCategory } from "./actions";

export default function CategoryRowActions({ id, nameAr, isVisible, canDelete = true }: { id: string; nameAr: string; isVisible: boolean; canDelete?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const call = (fn: (fd: FormData) => Promise<unknown>) => () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await fn(fd);
      router.refresh();
    });

  const doDelete = () =>
    start(async () => {
      if (!window.confirm(`حذف قسم «${nameAr}» نهائيًا؟ سيُحذف كل ما بداخله من منتجات وأسعار.`)) return;
      const fd = new FormData();
      fd.set("id", id);
      fd.set("force", "1");
      await deleteCategory(fd);
      router.refresh();
    });

  const dir = (d: "up" | "down") => () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("dir", d);
      await moveCategory(fd);
      router.refresh();
    });

  return (
    <div className="row-actions row-actions-compact">
      <button type="button" className="admin-icon-btn" disabled={pending} onClick={call(toggleCategoryVisible)} title={isVisible ? "إخفاء" : "إظهار"} aria-label={isVisible ? "إخفاء القسم" : "إظهار القسم"}>
        {isVisible ? "👁" : "🙈"}
      </button>
      <button type="button" className="admin-icon-btn" disabled={pending} title="تحريك لأعلى" aria-label="تحريك لأعلى" onClick={dir("up")}>↑</button>
      <button type="button" className="admin-icon-btn" disabled={pending} title="تحريك لأسفل" aria-label="تحريك لأسفل" onClick={dir("down")}>↓</button>
      {canDelete ? <button type="button" className="admin-icon-btn admin-icon-btn-danger" disabled={pending} title="حذف" aria-label="حذف القسم" onClick={doDelete}>🗑</button> : null}
    </div>
  );
}
