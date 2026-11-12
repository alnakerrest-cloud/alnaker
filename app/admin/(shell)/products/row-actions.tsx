"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProductFlags, moveProduct, deleteProduct } from "./actions";

type Props = { id: string; nameAr: string; isVisible: boolean; isAvailable: boolean; isFeatured: boolean; canDelete?: boolean };

export default function ProductRowActions({ id, nameAr, isVisible, isAvailable, isFeatured, canDelete = true }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggleFlag = (flag: "isVisible" | "isAvailable" | "isFeatured") => () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("flag", flag);
      await setProductFlags(fd);
      router.refresh();
    });

  const dir = (d: "up" | "down") => () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("dir", d);
      await moveProduct(fd);
      router.refresh();
    });

  const doDelete = () =>
    start(async () => {
      if (!window.confirm(`حذف منتج «${nameAr}» نهائيًا؟ سيُحذف معه كل الأسعار.`)) return;
      const fd = new FormData();
      fd.set("id", id);
      await deleteProduct(fd);
      router.refresh();
    });

  return (
    <div className="row-actions">
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} onClick={toggleFlag("isVisible")}>
        {isVisible ? "إخفاء" : "إظهار"}
      </button>
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} onClick={toggleFlag("isAvailable")}>
        {isAvailable ? "تعطيل" : "تفعيل"}
      </button>
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} onClick={toggleFlag("isFeatured")}>
        {isFeatured ? "إلغاء التميز" : "تميّز"}
      </button>
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} title="تحريك لأعلى" onClick={dir("up")}>↑</button>
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} title="تحريك لأسفل" onClick={dir("down")}>↓</button>
      {canDelete ? <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" disabled={pending} onClick={doDelete}>حذف</button> : null}
    </div>
  );
}
