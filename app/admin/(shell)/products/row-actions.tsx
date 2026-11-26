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
    <div className="row-actions row-actions-compact">
      <button type="button" className="admin-icon-btn" disabled={pending} onClick={toggleFlag("isVisible")} title={isVisible ? "إخفاء" : "إظهار"} aria-label={isVisible ? "إخفاء المنتج" : "إظهار المنتج"}>{isVisible ? "👁" : "🙈"}</button>
      <button type="button" className="admin-icon-btn" disabled={pending} onClick={toggleFlag("isAvailable")} title={isAvailable ? "تعطيل التوفر" : "تفعيل التوفر"} aria-label={isAvailable ? "تعطيل التوفر" : "تفعيل التوفر"}>{isAvailable ? "✓" : "⦸"}</button>
      <button type="button" className="admin-icon-btn" disabled={pending} onClick={toggleFlag("isFeatured")} title={isFeatured ? "إلغاء التمييز" : "تمييز"} aria-label={isFeatured ? "إلغاء التمييز" : "تمييز"}>{isFeatured ? "★" : "☆"}</button>
      <button type="button" className="admin-icon-btn" disabled={pending} title="تحريك لأعلى" aria-label="تحريك لأعلى" onClick={dir("up")}>↑</button>
      <button type="button" className="admin-icon-btn" disabled={pending} title="تحريك لأسفل" aria-label="تحريك لأسفل" onClick={dir("down")}>↓</button>
      {canDelete ? <button type="button" className="admin-icon-btn admin-icon-btn-danger" disabled={pending} title="حذف" aria-label="حذف المنتج" onClick={doDelete}>🗑</button> : null}
    </div>
  );
}
