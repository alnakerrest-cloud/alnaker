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
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`admin-btn btn-toggle-active ${isActive ? "admin-btn-secondary" : "admin-btn-primary"}`}
        style={{ padding: "4px 10px", fontSize: "0.82rem" }}
      >
        {isActive ? "إيقاف" : "تفعيل"}
      </button>

      <Link
        href={`/admin/offers/${id}`}
        className="admin-btn"
        style={{ padding: "4px 10px", fontSize: "0.82rem" }}
      >
        تعديل
      </Link>

      {canDelete && !confirmDel && (
        <button
          type="button"
          onClick={() => setConfirmDel(true)}
          disabled={isPending}
          className="admin-btn admin-btn-danger"
          style={{ padding: "4px 10px", fontSize: "0.82rem" }}
        >
          حذف
        </button>
      )}

      {canDelete && confirmDel && (
        <form onSubmit={handleDelete} style={{ display: "inline-flex", gap: "4px" }}>
          <button
            type="submit"
            disabled={isPending}
            className="admin-btn admin-btn-danger"
            style={{ padding: "4px 10px", fontSize: "0.82rem", background: "#991b1b" }}
          >
            تأكيد الحذف
          </button>
          <button
            type="button"
            onClick={() => setConfirmDel(false)}
            disabled={isPending}
            className="admin-btn"
            style={{ padding: "4px 8px", fontSize: "0.82rem" }}
          >
            إلغاء
          </button>
        </form>
      )}
    </div>
  );
}
