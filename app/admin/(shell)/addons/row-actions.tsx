"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleOptionGroupActive, deleteOptionGroup } from "./actions";

type Props = { id: string; nameAr: string; isActive: boolean };

export default function AddonRowActions({ id, nameAr, isActive }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const doToggle = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await toggleOptionGroupActive(fd);
      router.refresh();
    });

  const doDelete = () =>
    start(async () => {
      if (!window.confirm(`حذف مجموعة الإضافات «${nameAr}» نهائيًا؟`)) return;
      const fd = new FormData();
      fd.set("id", id);
      await deleteOptionGroup(fd);
      router.refresh();
    });

  return (
    <div className="row-actions">
      <button
        type="button"
        className="admin-btn admin-btn-sm"
        disabled={pending}
        onClick={doToggle}
      >
        {isActive ? "تعطيل" : "تفعيل"}
      </button>
      <button
        type="button"
        className="admin-btn admin-btn-sm admin-btn-danger"
        disabled={pending}
        onClick={doDelete}
      >
        حذف
      </button>
    </div>
  );
}

