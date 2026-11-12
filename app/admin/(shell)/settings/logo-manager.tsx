"use client";
import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadLogo, removeLogo, type LogoActionState } from "./actions";
import { validateClientImage } from "@/lib/admin/upload-client";

/** رفع/استبدال/إزالة شعار المطعم (Cloudinary — branding). للمالك فقط. */
export default function LogoManager({ logoUrl, readOnly = false }: { logoUrl: string | null; readOnly?: boolean }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<LogoActionState, FormData>(uploadLogo, {});
  const [pending, startTransition] = useTransition();
  const busy = pending || isPending;
  const [fileName, setFileName] = useState("");
  const [localErr, setLocalErr] = useState("");

  return (
    <section className="admin-panel" style={{ marginTop: 18 }}>
      <div className="admin-panel-header"><h2>شعار المطعم (Logo)</h2></div>
      <div style={{ padding: 18 }}>
        {localErr ? <p className="admin-flash err">{localErr}</p> : null}
        {state.error ? <p className="admin-flash err">{state.error}</p> : null}
        {state.ok ? <p className="admin-flash ok">تم حفظ الشعار.</p> : null}

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 120, height: 120, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)", background: "var(--bg-2)" }}>
            {logoUrl ? (
              <Image src={logoUrl} alt="شعار المطعم" fill sizes="120px" style={{ objectFit: "contain" }} />
            ) : (
              <span style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: 12 }}>الشعار الافتراضي</span>
            )}
          </div>

          {readOnly ? (
            <p className="hint" style={{ margin: 0 }}>رفع الشعار متاح للمالك فقط.</p>
          ) : (
            <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 240px" }}>
              <input
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  const err = validateClientImage(f);
                  if (err) {
                    setLocalErr(err);
                    e.target.value = "";
                    setFileName("");
                  } else {
                    setLocalErr("");
                    setFileName(f?.name ?? "");
                  }
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || !fileName}>
                  {busy ? "جارٍ الرفع…" : logoUrl ? "استبدال الشعار" : "رفع الشعار"}
                </button>
                {logoUrl ? (
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={busy}
                  onClick={() => {
                    if (!confirm("إزالة الشعار والعودة للشعار الافتراضي؟")) return;
                    startTransition(async () => { await removeLogo(); router.refresh(); });
                  }}
                  >إزالة</button>
                ) : null}
              </div>
            </form>
          )}
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          يُستخدم الشعار في الموقع العام وصفحة تسجيل الدخول. الصيغ: JPG / PNG / WEBP / GIF / AVIF — حتى 5MB.
        </p>
      </div>
    </section>
  );
}
