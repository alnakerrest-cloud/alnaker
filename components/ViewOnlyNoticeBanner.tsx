"use client";

import React, { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { MenuModeSettings } from "@/lib/order-settings-types";
import { REASON_PRESETS, normalizeOrderingMode } from "@/lib/order-settings-types";

interface ViewOnlyNoticeBannerProps {
  locale: Locale;
  settings?: MenuModeSettings | null;
}

export default function ViewOnlyNoticeBanner({
  locale,
  settings,
}: ViewOnlyNoticeBannerProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const activeMode = normalizeOrderingMode(settings?.mode);
  if (!settings || activeMode !== "DISPLAY_ONLY" || settings.enableNotice === false) {
    return null;
  }

  const isAr = locale === "ar";
  const title = isAr
    ? settings.noticeTitleAr || "الطلبات متوقفة مؤقتًا"
    : settings.noticeTitleEn || "Ordering is temporarily unavailable";

  const message = isAr
    ? settings.noticeMessageAr || "يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا."
    : settings.noticeMessageEn || "You can browse our menu and prices, but orders are not being accepted right now.";

  const preset = settings.reasonCode && REASON_PRESETS[settings.reasonCode];
  const reasonLabel = preset
    ? isAr
      ? preset.labelAr
      : preset.labelEn
    : "";

  return (
    <aside
      className="view-only-banner-wrapper"
      role="alert"
      aria-live="polite"
      style={{
        margin: "12px auto 20px",
        maxWidth: "1200px",
        padding: "0 16px",
      }}
    >
      <div
        className="view-only-banner-card"
        style={{
          background: "linear-gradient(135deg, #fffdf5 0%, #fffbeb 100%)",
          border: "1px solid #fde68a",
          borderRadius: "14px",
          padding: isMinimized ? "10px 16px" : "16px 20px",
          boxShadow: "0 4px 14px rgba(217, 119, 6, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          transition: "all 0.25s ease",
          direction: isAr ? "rtl" : "ltr",
          fontFamily: "inherit",
        }}
      >
        {/* Banner Top Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#fef3c7",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#b45309",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#92400e",
                  }}
                >
                  {title}
                </h3>
                <span
                  style={{
                    background: "#fef3c7",
                    color: "#b45309",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    border: "1px solid #fde68a",
                  }}
                >
                  {isAr ? "وضع العرض فقط" : "View Only Mode"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized((v) => !v)}
            aria-label={isMinimized ? (isAr ? "توسيع التنبيه" : "Expand notice") : (isAr ? "تصغير التنبيه" : "Minimize notice")}
            style={{
              background: "transparent",
              border: "none",
              color: "#b45309",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          >
            {isMinimized ? (isAr ? "عرض التفاصيل ▾" : "Details ▾") : (isAr ? "تصغير ▴" : "Collapse ▴")}
          </button>
        </div>

        {/* Banner Expanded Details */}
        {!isMinimized && (
          <>
            <p
              style={{
                margin: 0,
                color: "#78350f",
                fontSize: "14px",
                lineHeight: "1.6",
                fontWeight: 500,
              }}
            >
              {message}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                paddingTop: "6px",
                borderTop: "1px dashed #fde68a",
                fontSize: "12px",
              }}
            >
              {reasonLabel && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#92400e",
                    background: "#fff",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid #fde68a",
                    fontWeight: 600,
                  }}
                >
                  <span>⚠️ {isAr ? "السبب:" : "Reason:"}</span>
                  <strong>{reasonLabel}</strong>
                </div>
              )}

              {settings.expectedResumeAt && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#166534",
                    background: "#f0fdf4",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid #bbf7d0",
                    fontWeight: 600,
                  }}
                >
                  <span>⏰ {isAr ? "موعد العودة المتوقع:" : "Expected to resume:"}</span>
                  <strong>{settings.expectedResumeAt}</strong>
                </div>
              )}

              <span style={{ color: "#92400e", fontSize: "12px", marginRight: isAr ? "auto" : undefined, marginLeft: isAr ? undefined : "auto" }}>
                {isAr
                  ? "تصفح الأصناف والأسعار متاح بالكامل."
                  : "Menu and prices remain fully browsable."}
              </span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
