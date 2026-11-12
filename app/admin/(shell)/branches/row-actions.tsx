"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBranchActive, moveBranch, deleteBranch } from "./actions";

type Props = { id: string; nameAr: string; isActive: boolean };

export default function BranchRowActions({ id, nameAr, isActive }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const call = (fn: (fd: FormData) => Promise<unknown>) => () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await fn(fd);
      router.refresh();
    });

  const dir = (d: "up" | "down") => () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("dir", d);
      await moveBranch(fd);
      router.refresh();
    });

  const doDelete = () =>
    start(async () => {
      if (!window.confirm(`حذف فرع «${nameAr}» نهائيًا؟`)) return;
      const fd = new FormData();
      fd.set("id", id);
      await deleteBranch(fd);
      router.refresh();
    });

  return (
    <div className="row-actions">
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} onClick={call(toggleBranchActive)}>
        {isActive ? "تعطيل" : "تفعيل"}
      </button>
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} title="تحريك لأعلى" onClick={dir("up")}>↑</button>
      <button type="button" className="admin-btn admin-btn-sm" disabled={pending} title="تحريك لأسفل" onClick={dir("down")}>↓</button>
      <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" disabled={pending} onClick={doDelete}>حذف</button>
    </div>
  );
}
