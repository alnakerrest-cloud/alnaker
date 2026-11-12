"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadProductImage, setPrimaryProductImage, deleteProductImage, type ImageActionState } from "./actions";
import { validateClientImage } from "@/lib/admin/upload-client";

type Img = { id: string; url: string; altAr: string | null; isPrimary: boolean };

/** إدارة صور منتج واحد: رفع (متعدد)، تعيين أساسية، حذف. تُستدعى من صفحة تعديل المنتج. */
export default function ProductImageManager({ productId, images }: { productId: string; images: Img[] }) {
  const [state, formAction, isPending] = useActionState<ImageActionState, FormData>(uploadProductImage, {});
  const [pending, startTransition] = useTransition();
  const busy = pending || isPending;
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localErr, setLocalErr] = useState("");
  const canUploadSelectedFile = !!selectedFile && validateClientImage(selectedFile) === null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0] ?? null;
    const err = nextFile ? validateClientImage(nextFile) : null;
    if (err) {
      setLocalErr(err);
      if (fileRef.current) fileRef.current.value = "";
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
      <div className="admin-panel-header"><h2>صور المنتج ({images.length})</h2></div>

      <div style={{ padding: 18 }}>
        {localErr ? <p className="admin-flash err">{localErr}</p> : null}
        {state.error ? <p className="admin-flash err">{state.error}</p> : null}
        {state.ok ? <p className="admin-flash ok">تم رفع الصورة بنجاح.</p> : null}

        {images.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {images.map((img) => (
              <div key={img.id} style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--bg-2)" }}>
                <div style={{ position: "relative", aspectRatio: "1 / 1", background: "#00000010" }}>
                  <Image src={img.url} alt={img.altAr ?? "صورة منتج"} fill sizes="160px" style={{ objectFit: "cover" }} />
                  {img.isPrimary ? (
                    <span style={{ position: "absolute", top: 6, insetInlineStart: 6, background: "var(--brand,#5C2A26)", color: "#fff", fontSize: 11, padding: "2px 6px", borderRadius: 6 }}>أساسية</span>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 6, padding: 8 }}>
                  {!img.isPrimary ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      disabled={busy}
                      onClick={() => startTransition(async () => {
                        const fd = new FormData();
                        fd.set("productId", productId);
                        fd.set("imageId", img.id);
                        await setPrimaryProductImage(fd);
                      })}
                    >تعيين كأساسية</button>
                  ) : null}
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm("حذف هذه الصورة نهائيًا من Cloudinary؟")) return;
                      startTransition(async () => {
                        const fd = new FormData();
                        fd.set("productId", productId);
                        fd.set("imageId", img.id);
                        await deleteProductImage(fd);
                      });
                    }}
                  >حذف</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="hint">لا توجد صور بعد لهذا المنتج.</p>
        )}

        <form action={formAction} style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <input type="hidden" name="productId" value={productId} />
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={handleFileChange}
            style={{ flex: "1 1 240px" }}
          />
          <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || !canUploadSelectedFile}>
            {busy ? "جارٍ الرفع…" : "رفع صورة"}
          </button>
        </form>
        <p className="hint" style={{ marginTop: 8 }}>
          الصيغ المسموحة: JPG / PNG / WEBP / GIF / AVIF — حتى 5MB. لا تُرفع الصور إلا بعد تفعيل صلاحيات Cloudinary.
        </p>
      </div>
    </section>
  );
}
