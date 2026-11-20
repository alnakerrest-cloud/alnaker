"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { SiteData } from "@/lib/site-db";
import type { MenuModeSettings } from "@/lib/order-settings-types";
import { REASON_PRESETS } from "@/lib/order-settings-types";

interface MenuSuspendedViewProps {
  locale: Locale;
  site: SiteData;
  settings?: MenuModeSettings | null;
}

export default function MenuSuspendedView({
  locale,
  site,
  settings,
}: MenuSuspendedViewProps) {
  const isAr = locale === "ar";

  const defaultTitle = isAr ? "المنيو متوقف مؤقتًا" : "Menu Temporarily Closed";
  const defaultDesc = isAr
    ? "نعتذر عن استقبال الطلبات في الوقت الحالي. نعمل على العودة إليكم في أقرب وقت ممكن. سيتم استقبال الطلبات مرة أخرى عند إعادة فتح المنيو."
    : "We apologize for not accepting orders at this time. We are working to serve you again as soon as possible. Ordering will resume as soon as the menu reopens.";

  const title = (isAr ? settings?.closureMessageAr : settings?.closureMessageEn) || (isAr ? settings?.noticeTitleAr : settings?.noticeTitleEn) || defaultTitle;
  const description = (isAr ? settings?.noticeMessageAr : settings?.noticeMessageEn) || (isAr ? settings?.closureMessageAr : settings?.closureMessageEn) || defaultDesc;

  const preset = settings?.reasonCode ? REASON_PRESETS[settings.reasonCode] : null;
  const reasonText = preset ? (isAr ? preset.labelAr : preset.labelEn) : null;

  // Format Reopening Time if configured
  const resumeAt = settings?.expectedResumeAt;
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!resumeAt) return;
    const target = new Date(resumeAt).getTime();
    if (isNaN(target)) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [resumeAt]);

  const whatsappPhone = site.phoneIntl ? site.phoneIntl.replace(/\D/g, "") : "";

  return (
    <section
      className="menu-suspended-section"
      style={{
        minHeight: "75vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px 80px",
        background: "radial-gradient(ellipse at 50% 20%, #fff9ee 0%, var(--bg) 60%, var(--bg-2) 100%)",
        direction: isAr ? "rtl" : "ltr",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
      }}
    >
      <div
        className="menu-suspended-card"
        style={{
          maxWidth: "680px",
          width: "100%",
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--line, #e9d9be)",
          borderRadius: "24px",
          padding: "40px 32px",
          boxShadow: "0 12px 40px rgba(92, 42, 38, 0.08)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative Top Accent Bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, var(--gold, #c98f2b) 0%, var(--brand, #5c2a26) 50%, var(--gold, #c98f2b) 100%)",
          }}
        />

        {/* Elegant SVG Illustration */}
        <div
          style={{
            width: "88px",
            height: "88px",
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #fdf4e4 0%, #fbe8cb 100%)",
            border: "2px solid var(--line, #e9d9be)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--brand, #5c2a26)",
            boxShadow: "0 4px 16px rgba(201, 143, 43, 0.15)",
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        {/* Reason Badge */}
        {reasonText && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 16px",
              borderRadius: "999px",
              background: "#fef3c7",
              color: "#92400e",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "16px",
              border: "1px solid #fde68a",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#d97706" }} />
            {reasonText}
          </div>
        )}

        {/* Suspension Title */}
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: "28px",
            fontWeight: 800,
            color: "var(--brand-deep, #43201d)",
            fontFamily: "var(--font-display, inherit)",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h1>

        {/* Description / Customer Message */}
        <p
          style={{
            margin: "0 auto 28px",
            fontSize: "16px",
            color: "#6b584c",
            lineHeight: 1.7,
            maxWidth: "520px",
          }}
        >
          {description}
        </p>

        {/* Expected Reopening Time / Countdown Box */}
        {resumeAt && (
          <div
            style={{
              background: "#faf6f0",
              border: "1px solid var(--line, #e9d9be)",
              borderRadius: "16px",
              padding: "16px 20px",
              marginBottom: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--brand, #5c2a26)", fontWeight: 700 }}>
              {isAr ? "موعد إعادة الفتح المتوقع:" : "Expected Reopening Time:"}
            </span>
            <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--brand-deep, #43201d)" }}>
              {new Date(resumeAt).toLocaleString(isAr ? "ar-EG" : "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {timeLeft && (
              <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--gold, #c98f2b)" }}>
                    {timeLeft.hours}
                  </div>
                  <div style={{ fontSize: "11px", color: "#8a7566" }}>{isAr ? "ساعة" : "Hours"}</div>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#c98f2b", alignSelf: "center" }}>:</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--gold, #c98f2b)" }}>
                    {timeLeft.minutes}
                  </div>
                  <div style={{ fontSize: "11px", color: "#8a7566" }}>{isAr ? "دقيقة" : "Mins"}</div>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#c98f2b", alignSelf: "center" }}>:</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--gold, #c98f2b)" }}>
                    {timeLeft.seconds}
                  </div>
                  <div style={{ fontSize: "11px", color: "#8a7566" }}>{isAr ? "ثانية" : "Secs"}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Order Tracking CTA & Navigation */}
        <div
          style={{
            borderTop: "1px dashed var(--line, #e9d9be)",
            paddingTop: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#786558" }}>
            {isAr
              ? "لديك طلب سابق وتريد متابعة حالته؟"
              : "Have an existing order you'd like to track?"}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {/* My Orders / Account Button */}
            <Link
              href={`/${locale}/orders`}
              className="hub-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                borderRadius: "12px",
                background: "var(--brand, #5c2a26)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {isAr ? "متابعة طلباتي" : "My Orders & Tracking"}
            </Link>

            {/* Contact via WhatsApp */}
            {whatsappPhone && (
              <a
                href={`https://wa.me/${whatsappPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 22px",
                  borderRadius: "12px",
                  background: "#ffffff",
                  color: "#2e7d32",
                  border: "1px solid #a5d6a7",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                {isAr ? "تواصل واتساب" : "WhatsApp Support"}
              </a>
            )}

            {/* Call Restaurant */}
            {site.phoneDisplay && (
              <a
                href={`tel:${site.phoneIntl || site.phoneDisplay}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 22px",
                  borderRadius: "12px",
                  background: "#ffffff",
                  color: "var(--brand, #5c2a26)",
                  border: "1px solid var(--line, #e9d9be)",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {site.phoneDisplay}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
