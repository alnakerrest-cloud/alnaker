"use client";

// حدود أخطاء لقسم /admin: لو تعطّل الاتصال بقاعدة البيانات (مثل إقلاع Neon البارد بعد نفاد
// المحاولات) تظهر رسالة عربية واضحة مع زر إعادة المحاولة، بدل مكدّس أخطاء Next الخام.
import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin error boundary]", error);
  }, [error]);

  const msg = String(error?.message ?? "");
  const dbDown = /can'?t reach database|database server|p1001|connection|econnrefused|timeout/i.test(msg);

  return (
    <div dir="rtl" style={{ maxWidth: 520, margin: "12vh auto", padding: 24, textAlign: "center", fontFamily: "inherit" }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>{dbDown ? "تعذّر الاتصال بقاعدة البيانات" : "حدث خطأ غير متوقع"}</h1>
      <p style={{ color: "#666", marginBottom: 18, lineHeight: 1.7 }}>
        {dbDown
          ? "الخادم قد يكون مستيقظًا للتو (Neon يعلّق تلقائيًا عند الخمول). انتظر ثانية ثم أعد المحاولة."
          : "لم يتمكّن النظام من إكمال الطلب. أعد المحاولة، وإن تكرّر الأمر راجع السجل (digest)."}
      </p>
      <button
        type="button"
        onClick={reset}
        style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #5C2A26", background: "#5C2A26", color: "#fff", cursor: "pointer", fontSize: 15 }}
      >
        إعادة المحاولة
      </button>
      {error?.digest ? <p style={{ marginTop: 14, fontSize: 12, color: "#999" }}>مرجع الخطأ: {error.digest}</p> : null}
    </div>
  );
}
