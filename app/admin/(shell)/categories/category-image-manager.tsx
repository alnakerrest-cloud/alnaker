"use client";
import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadCategoryImage, removeCategoryImage, type ImageActionState } from "./actions";
import { validateClientImage } from "@/lib/admin/upload-client";

/** رفع/استبدال/إزالة صورة قسم واحد (Cloudinary). */
export default function CategoryImageManager({ categoryId, imageUrl }: { categoryId: string; imageUrl: string | null }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ImageActionState, FormData>(uploadCategoryImage, {});
  const [pending, startTransition] = useTransition();
  const busy = pending || isPending;
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localErr, setLocalErr] = useState("");
  const canUploadSelectedFile = !!selectedFile && validateClientImage(selectedFile) === null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0] ?? null;
    const err = nextFile ? validateClientImage(nextFile) : null;
    if (err) {
      setLocalErr(err);
      e.target.value = "";
      setSelectedFile(null);
      setFileName("");
      return;
    }
    setLocalErr("");
    setSelectedFile(nextFile);
    setFileName(nextFile?.name ?? "");
  };

  return (
    <section className="admin-panel" style={{ marginTop: 18 }}>
      <div className="admin-panel-header"><h2>صورة القسم</h2></div>
      <div style={{ padding: 18 }}>
        {localErr ? <p className="admin-flash err">{localErr}</p> : null}
        {state.error ? <p className="admin-flash err">{state.error}</p> : null}
        {state.ok ? <p className="admin-flash ok">تم حفظ الصورة.</p> : null}

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 160, height: 160, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)", background: "var(--bg-2)" }}>
            {imageUrl ? (
              <Image src={imageUrl} alt="صورة القسم" fill sizes="160px" style={{ objectFit: "cover" }} />
            ) : (
              <span style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: 13 }}>بدون صورة</span>
            )}
          </div>

          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 240px" }}>
            <input type="hidden" name="id" value={categoryId} />
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={handleFileChange}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || !canUploadSelectedFile}>
                {busy ? "جارٍ الرفع…" : imageUrl ? "استبدال الصورة" : "رفع صورة"}
              </button>
              {imageUrl ? (
                <button
                  type="button"
                  className="admin-btn"
                  disabled={busy}
                  onClick={() => {
                    if (!confirm("إزالة صورة القسم نهائيًا؟")) return;
                    startTransition(async () => {
                      const fd = new FormData();
                      fd.set("id", categoryId);
                      await removeCategoryImage(fd);
                      router.refresh();
                    });
                  }}
                >إزالة</button>
              ) : null}
            </div>
          </form>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          الصيغ المسموحة: JPG / PNG / WEBP / GIF / AVIF — حتى 5MB. الأيقونة (emoji) تبقى كما هي في الأعلى.
        </p>
      </div>
    </section>
  );
}
