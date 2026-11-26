"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toggleOfferActive, deleteOffer } from "./actions";

export default function OfferRowActions({
  id,
  titleAr,
  isActive,
  canDelete = false,
}: {
  id: string;
  titleAr: string;
  isActive: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);

  const handleToggle = () => {
    startTransition(async () => {
      await toggleOfferActive(id, isActive);
      router.refresh();
    });
  };

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteOffer(fd);
      setConfirmDel(false);
      router.refresh();
    });
  };

  return (
    <div className="row-actions">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`admin-btn admin-btn-sm btn-toggle-active ${isActive ? "admin-btn-secondary" : "admin-btn-primary"}`}
      >
        {isActive ? "إيقاف" : "تفعيل"}
      </button>

      <Link
        href={`/admin/offers/${id}`}
        className="admin-btn admin-btn-sm"
      >
        تعديل
      </Link>

      {canDelete && !confirmDel && (
        <button
          type="button"
          onClick={() => setConfirmDel(true)}
          disabled={isPending}
          className="admin-btn admin-btn-sm admin-btn-danger"
        >
          حذف
        </button>
      )}

      {canDelete && confirmDel && (
        <form onSubmit={handleDelete} style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={isPending}
            className="admin-btn admin-btn-sm admin-btn-danger"
            style={{ background: "#991b1b" }}
          >
            تأكيد الحذف
          </button>
          <button
            type="button"
            onClick={() => setConfirmDel(false)}
            disabled={isPending}
            className="admin-btn admin-btn-sm"
          >
            إلغاء
          </button>
        </form>
      )}
    </div>
  );
}
