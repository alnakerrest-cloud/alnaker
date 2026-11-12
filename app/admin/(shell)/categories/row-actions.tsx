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
    <div className="row-actions">
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} onClick={call(toggleCategoryVisible)}>
        {isVisible ? "إخفاء" : "إظهار"}
      </button>
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} title="تحريك لأعلى" onClick={dir("up")}>↑</button>
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} title="تحريك لأسفل" onClick={dir("down")}>↓</button>
      {canDelete ? <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" disabled={pending} onClick={doDelete}>حذف</button> : null}
    </div>
  );
}
