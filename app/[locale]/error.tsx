"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const isAr = params?.locale !== "en";

  useEffect(() => {
    console.error("[LocaleError Boundary]", error);
  }, [error]);

  const msg = String(error?.message ?? "");
  const isDbError =
    /can'?t reach database|database server|p1001|53000|quota|connection|econnrefused|timeout|prisma/i.test(
      msg
    );

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "#FAF7F2",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
          padding: "36px 28px",
          textAlign: "center",
          border: "1px solid #EFEAE2",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "#FBEAE7",
            color: "#C2410C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 26,
          }}
        >
          {isDbError ? "⚡" : "⚠️"}
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1F2937",
            marginBottom: 10,
          }}
        >
          {isAr
            ? isDbError
              ? "تعذّر الاتصال بقاعدة البيانات"
              : "حدث خطأ أثناء تحميل القائمة"
            : isDbError
            ? "Database Unavailable"
            : "Failed to Load Menu"}
        </h1>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "#6B7280",
            marginBottom: 24,
          }}
        >
          {isAr
            ? isDbError
              ? "تعذر جلب بيانات القائمة المباشرة من قاعدة البيانات. يرجى الانتظار بضع ثوانٍ وإعادة المحاولة."
              : "نواجه مشكلة مؤقتة في عرض المنتجات. يرجى إعادة المحاولة."
            : isDbError
            ? "Unable to fetch live menu data from the primary database. Please wait a moment and try again."
            : "We encountered a temporary issue while loading the products. Please try again."}
        </p>

        <button
          type="button"
          onClick={reset}
          style={{
            display: "inline-block",
            width: "100%",
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: "#5C2A26",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          {isAr ? "إعادة المحاولة" : "Try Again"}
        </button>

        {error?.digest && (
          <p
            style={{
              marginTop: 18,
              fontSize: 11,
              color: "#9CA3AF",
              fontFamily: "monospace",
            }}
          >
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
