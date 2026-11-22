"use client";

import React, { useState } from "react";
import type {
  MenuModeSettings,
  BranchOverrideSettings,
  OrderSuspensionReason,
  OrderingMode,
} from "@/lib/order-settings-types";
import {
  REASON_PRESETS,
  ORDERING_MODES_META,
  ORDERING_MODE_FEATURES,
  normalizeOrderingMode,
} from "@/lib/order-settings-types";

interface BranchInfo {
  id: string;
  nameAr: string;
  nameEn?: string;
  addressAr: string;
  isOrderable: boolean;
  isActive: boolean;
  openingHoursAr?: string;
  openingHoursEn?: string;
}

interface OrderSettingsClientProps {
  initialSettings: MenuModeSettings;
  branches: BranchInfo[];
}

export default function OrderSettingsClient({
  initialSettings,
  branches,
}: OrderSettingsClientProps) {
  const [settings, setSettings] = useState<MenuModeSettings>(() => ({
    enableNotice: true,
    reasonCode: "HIGH_ORDER_VOLUME",
    noticeTitleAr: "الطلبات متوقفة مؤقتًا",
    noticeTitleEn: "Ordering is temporarily unavailable",
    noticeMessageAr: "يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا.",
    noticeMessageEn: "You can browse our menu and prices, but orders are not being accepted right now.",
    expectedResumeAt: "",
    displayPosition: "TOP_BANNER",
    ...initialSettings,
    mode: normalizeOrderingMode(initialSettings?.mode),
  }));

  const [previewLocale, setPreviewLocale] = useState<"ar" | "en">("ar");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Safe mode transition confirmation modal state
  const [pendingModeSwitch, setPendingModeSwitch] = useState<OrderingMode | null>(null);

  const activeMode = normalizeOrderingMode(settings.mode);
  const activeMeta = ORDERING_MODES_META[activeMode];

  const handleModeCardClick = (targetMode: OrderingMode) => {
    if (targetMode === activeMode) return;
    setPendingModeSwitch(targetMode);
  };

  const confirmModeSwitch = () => {
    if (!pendingModeSwitch) return;
    setSettings((prev) => ({ ...prev, mode: pendingModeSwitch }));
    setPendingModeSwitch(null);
  };

  const cancelModeSwitch = () => {
    setPendingModeSwitch(null);
  };

  const handleGlobalTypeToggle = (type: "allowDelivery" | "allowTakeaway") => {
    setSettings((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleReasonPresetChange = (code: OrderSuspensionReason) => {
    const preset = REASON_PRESETS[code];
    setSettings((prev) => ({
      ...prev,
      reasonCode: code,
      noticeTitleAr: preset ? preset.titleAr : prev.noticeTitleAr,
      noticeTitleEn: preset ? preset.titleEn : prev.noticeTitleEn,
      noticeMessageAr: preset ? preset.descAr : prev.noticeMessageAr,
      noticeMessageEn: preset ? preset.descEn : prev.noticeMessageEn,
    }));
  };

  const handleBranchOverrideChange = (
    branchId: string,
    field: keyof BranchOverrideSettings,
    value: any
  ) => {
    setSettings((prev) => {
      const currentBranch = prev.branchOverrides[branchId] || {
        isOrderable: true,
        isOpen: true,
      };
      return {
        ...prev,
        branchOverrides: {
          ...prev.branchOverrides,
          [branchId]: {
            ...currentBranch,
            [field]: value,
          },
        },
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/order-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل في حفظ إعدادات الطلبات");
      }
      setFeedback({ type: "success", message: data.message || "تم حفظ الإعدادات بنجاح." });
      setSettings((prev) => ({
        ...prev,
        ...data.settings,
        mode: normalizeOrderingMode(data.settings?.mode),
      }));
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "حدث خطأ أثناء الحفظ." });
    } finally {
      setIsSaving(false);
    }
  };

  const isOrderingAllowed = activeMode === "FULL_ORDERING" || activeMode === "WHATSAPP_DATABASE";
  const orderableBranchCount = branches.filter((b) => {
    const o = settings.branchOverrides[b.id];
    return o ? o.isOrderable && o.isOpen : b.isOrderable && b.isActive;
  }).length;

  const activePreset = settings.reasonCode && REASON_PRESETS[settings.reasonCode];
  const MODES_LIST: OrderingMode[] = [
    "FULL_ORDERING",
    "WHATSAPP_DATABASE",
    "DISPLAY_ONLY",
    "TEMPORARILY_CLOSED",
  ];

  return (
    <div style={{ maxWidth: "1180px", margin: "0 auto", paddingBottom: "70px" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>
              إعدادات أوضاع الطلب وتجربة العميل | Ordering Modes & Customer Ops
            </h1>
          </div>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
            التحكم الديناميكي اللحظي في أوضاع الطلب، قنوات الاستقبال، الإغلاق المؤقت، وساعات عمل الفروع دون إعادة نشر التطبيق.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="admin-btn admin-btn-primary"
          style={{
            minWidth: "170px",
            padding: "12px 24px",
            fontSize: "15px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            borderRadius: "10px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          {isSaving ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
        </button>
      </div>

      {feedback && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "14px",
            fontWeight: 600,
            background: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
            border: feedback.type === "success" ? "1px solid #86efac" : "1px solid #fca5a5",
            color: feedback.type === "success" ? "#166534" : "#991b1b",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>{feedback.type === "success" ? "✅" : "⚠️"}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Status Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: `1.5px solid ${activeMeta.borderColor}`,
            borderRadius: "12px",
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "6px" }}>
            وضع التشغيل النشط حالياً
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>{activeMeta.icon}</span>
            <div>
              <strong style={{ fontSize: "16px", color: activeMeta.color, display: "block" }}>
                الوضع {activeMeta.letter} — {activeMeta.titleAr}
              </strong>
              <small style={{ color: "#64748b", fontSize: "11px" }}>{activeMeta.titleEn}</small>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "6px" }}>
            جاهزية الفروع للطلبات
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🏢</span>
            <strong style={{ fontSize: "16px", color: "#0f172a" }}>
              {orderableBranchCount} من {branches.length} فروع جاهزة
            </strong>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "6px" }}>
            شريط تنبيه التوقف في المنيو
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <strong style={{ fontSize: "15px", color: settings.enableNotice !== false ? "#16a34a" : "#64748b" }}>
              {settings.enableNotice !== false ? "مفعّل في واجهة العميل" : "معطّل"}
            </strong>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "6px" }}>
            آخر تعديل مسجل
          </div>
          <div style={{ fontSize: "13px", color: "#334155", fontWeight: 600 }}>
            {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString("ar-EG") : "—"}
          </div>
          {settings.updatedBy && (
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              بواسطة: {settings.updatedBy}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: Ordering & Customer Experience Settings (4 Operational Modes) */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "26px",
          marginBottom: "28px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "22px" }}>🎛️</span>
              <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>
                1. إعدادات أوضاع الطلب وتجربة العميل | Ordering & Customer Experience Settings
              </h2>
            </div>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
              اختر الوضع المناسب لتشغيل المطعم. التبديل يتم فوريًا على الخادم مع ضمان كامل لسلامة كافة الطلبات وحسابات العملاء التاريخية.
            </p>
          </div>
        </div>

        {/* 4 Interactive Mode Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {MODES_LIST.map((modeKey) => {
            const meta = ORDERING_MODES_META[modeKey];
            const isSelected = activeMode === modeKey;

            return (
              <div
                key={modeKey}
                onClick={() => handleModeCardClick(modeKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleModeCardClick(modeKey);
                  }
                }}
                style={{
                  border: isSelected ? `2.5px solid ${meta.color}` : "1.5px solid #e2e8f0",
                  background: isSelected ? meta.bgColor : "#ffffff",
                  borderRadius: "14px",
                  padding: "20px",
                  cursor: isSelected ? "default" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: isSelected ? `0 4px 14px ${meta.borderColor}` : "0 1px 3px rgba(0,0,0,0.03)",
                  position: "relative",
                  outline: "none",
                }}
              >
                <div>
                  {/* Top card header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: isSelected ? meta.color : "#f1f5f9",
                          color: isSelected ? "#fff" : "#475569",
                          fontSize: "16px",
                          fontWeight: 800,
                        }}
                      >
                        {meta.letter}
                      </span>
                      <span style={{ fontSize: "20px" }}>{meta.icon}</span>
                    </div>

                    <span
                      style={{
                        padding: "3px 9px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: isSelected ? meta.color : "#f1f5f9",
                        color: isSelected ? "#fff" : "#64748b",
                      }}
                    >
                      {isSelected ? "الوضع النشط ✓" : "انقر للتفعيل"}
                    </span>
                  </div>

                  {/* Titles */}
                  <strong style={{ display: "block", fontSize: "16px", fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>
                    {meta.titleAr}
                  </strong>
                  <span style={{ display: "block", fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "8px" }}>
                    {meta.titleEn}
                  </span>

                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: meta.color,
                      background: isSelected ? "#ffffff" : meta.bgColor,
                      border: `1px solid ${meta.borderColor}`,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      marginBottom: "10px",
                    }}
                  >
                    {meta.badgeAr}
                  </span>

                  <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#475569", lineHeight: "1.45" }}>
                    {meta.descriptionAr}
                  </p>

                  {/* Bullet points */}
                  <ul style={{ margin: 0, paddingRight: "18px", paddingLeft: 0, fontSize: "12px", color: "#334155", lineHeight: "1.55" }}>
                    {meta.bulletPointsAr.map((bullet, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    {isSelected ? "مطبّق حالياً على جميع الواجهات" : "يتطلب تأكيد التبديل"}
                  </small>
                  {isSelected && (
                    <span style={{ fontSize: "13px", fontWeight: 800, color: meta.color }}>
                      ● نشط
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Matrix Comparison Table */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", marginBottom: "20px", overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📊</span>
            <span>مصفوفة مقارنة قدرات الأوضاع الأربعة | Runtime Modes Feature Matrix</span>
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "right" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #cbd5e1", color: "#475569" }}>
                <th style={{ padding: "8px 10px", fontWeight: 700 }}>الخاصية / Feature</th>
                <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>أ: نظام متكامل</th>
                <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>ب: واتساب + قاعدة البيانات</th>
                <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>ج: عرض فقط</th>
                <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>د: إغلاق مؤقت</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>إنشاء وحفظ الطلبات في قاعدة البيانات</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>توثيق جلسة العميل وحفظ العناوين</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>التتبع المباشر لطلب العميل (Live Tracking)</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗ (عبر واتساب)</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>استعلام العميل الدوري (Polling 5s)</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗ (متوقف تماماً)</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>التوجيه المباشر لواتساب الفرع</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>اختياري</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#0284c7", fontWeight: 800 }}>✓ أساسي</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>التزامن التلقائي لإدارة الطلبات (LiveSync)</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓ تلقائي</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#0284c7", fontWeight: 800 }}>يدوي (زر تحديث)</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8" }}>✗</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>حماية سجل وسوابق طلبات العملاء القديمة</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓ 100% محفوظ</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓ 100% محفوظ</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓ 100% محفوظ</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>✓ 100% محفوظ</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Global Order Type Toggles */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "18px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
            أنواع الطلبات المدعومة عند استقبال الطلبات
          </h3>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={settings.allowDelivery}
                onChange={() => handleGlobalTypeToggle("allowDelivery")}
                style={{ width: "18px", height: "18px" }}
              />
              <span>تفعيل خدمة التوصيل للمنزل (Delivery)</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={settings.allowTakeaway}
                onChange={() => handleGlobalTypeToggle("allowTakeaway")}
                style={{ width: "18px", height: "18px" }}
              />
              <span>تفعيل خدمة الاستلام من الفرع (Takeaway)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Safe Mode Transitions */}
      {pendingModeSwitch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelModeSwitch();
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "560px",
              width: "100%",
              padding: "26px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              direction: "rtl",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "28px" }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>
                  تأكيد تبديل وضع تشغيل المطعم
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Confirm Restaurant Operational Mode Switch</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "16px 0", padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <small style={{ color: "#64748b", display: "block", fontSize: "11px" }}>الوضع الحالي</small>
                <strong style={{ color: activeMeta.color, fontSize: "14px" }}>{activeMeta.titleAr}</strong>
              </div>
              <span style={{ fontSize: "20px", color: "#94a3b8" }}>⬅️</span>
              <div style={{ flex: 1, textAlign: "center" }}>
                <small style={{ color: "#64748b", display: "block", fontSize: "11px" }}>الوضع الجديد المطلوب</small>
                <strong style={{ color: ORDERING_MODES_META[pendingModeSwitch].color, fontSize: "14px" }}>
                  {ORDERING_MODES_META[pendingModeSwitch].titleAr}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: "13.5px", color: "#334155", lineHeight: "1.6", marginBottom: "18px" }}>
              <p style={{ margin: "0 0 10px" }}>
                أنت على وشك التبديل إلى <strong>{ORDERING_MODES_META[pendingModeSwitch].titleAr}</strong> ({ORDERING_MODES_META[pendingModeSwitch].titleEn}):
              </p>
              <div style={{ background: ORDERING_MODES_META[pendingModeSwitch].bgColor, border: `1px solid ${ORDERING_MODES_META[pendingModeSwitch].borderColor}`, borderRadius: "8px", padding: "10px 14px", color: ORDERING_MODES_META[pendingModeSwitch].color, fontSize: "13px" }}>
                {ORDERING_MODES_META[pendingModeSwitch].descriptionAr}
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px 14px", marginBottom: "22px", fontSize: "12.5px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🛡️</span>
              <span>
                <strong>أمان البيانات مضمون:</strong> هذا الإجراء فوري ويعتمد على الخادم، ولن يؤدي مطلقًا إلى حذف أو تعديل أو فقدان أي من طلبات العملاء السابقة أو سجلات التدقيق التاريخية.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={cancelModeSwitch}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={confirmModeSwitch}
                style={{
                  padding: "10px 22px",
                  borderRadius: "8px",
                  border: "none",
                  background: ORDERING_MODES_META[pendingModeSwitch].color,
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                تأكيد التبديل الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Order Suspension Notice & Customer Alerts */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "26px",
          marginBottom: "28px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
              2. إعدادات شريط تنبيه توقف الطلبات (Suspension Notice & Reason)
            </h2>
          </div>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              background: settings.enableNotice !== false ? "#f0fdf4" : "#f1f5f9",
              border: settings.enableNotice !== false ? "1px solid #86efac" : "1px solid #cbd5e1",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 700,
              color: settings.enableNotice !== false ? "#166534" : "#64748b",
            }}
          >
            <input
              type="checkbox"
              checked={settings.enableNotice !== false}
              onChange={(e) => setSettings((prev) => ({ ...prev, enableNotice: e.target.checked }))}
              style={{ width: "16px", height: "16px" }}
            />
            <span>{settings.enableNotice !== false ? "الشريط مفعّل" : "الشريط معطّل"}</span>
          </label>
        </div>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "14px" }}>
          يظهر هذا التنبيه أعلى المنيو عند توقف الطلبات أو وضع العرض فقط ليشرح للعميل سبب التوقف بلباقة ووضوح.
        </p>

        {/* Reason Presets Buttons */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
            قوالب أسباب التوقف الجاهزة (Reason Presets):
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(Object.keys(REASON_PRESETS) as OrderSuspensionReason[]).map((key) => {
              const p = REASON_PRESETS[key];
              const isSelected = settings.reasonCode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleReasonPresetChange(key)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: isSelected ? "1.5px solid #0f172a" : "1px solid #cbd5e1",
                    background: isSelected ? "#0f172a" : "#fff",
                    color: isSelected ? "#fff" : "#334155",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {p.labelAr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notice Content Fields (Arabic & English) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              عنوان التنبيه (عربي)
            </label>
            <input
              type="text"
              value={settings.noticeTitleAr ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, noticeTitleAr: e.target.value }))}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              عنوان التنبيه (إنجليزي)
            </label>
            <input
              type="text"
              value={settings.noticeTitleEn ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, noticeTitleEn: e.target.value }))}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                direction: "ltr",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              رسالة التنبيه والتفاصيل (عربي)
            </label>
            <textarea
              rows={3}
              value={settings.noticeMessageAr ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, noticeMessageAr: e.target.value }))}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              رسالة التنبيه والتفاصيل (إنجليزي)
            </label>
            <textarea
              rows={3}
              value={settings.noticeMessageEn ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, noticeMessageEn: e.target.value }))}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
                direction: "ltr",
              }}
            />
          </div>
        </div>

        {/* Expected Resume Time & Display Position */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              الموعد المتوقع لاستئناف الطلبات (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: الساعة 5:00 مساءً أو غداً ظهراً"
              value={settings.expectedResumeAt ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, expectedResumeAt: e.target.value }))}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              موضع التنبيه في المنيو
            </label>
            <select
              value={settings.displayPosition ?? "TOP_BANNER"}
              onChange={(e) => setSettings((prev) => ({ ...prev, displayPosition: e.target.value as any }))}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                background: "#fff",
              }}
            >
              <option value="TOP_BANNER">شريط علوي بارز أعلى الصفحة (Top Banner)</option>
              <option value="STICKY_HEADER">شريط مثبت أسفل الهيدر (Sticky Bar)</option>
            </select>
          </div>
        </div>

        {/* Live Preview Card */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
              👁️ معاينة فورية لشكل التنبيه كما يظهر للعميل:
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setPreviewLocale("ar")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  background: previewLocale === "ar" ? "#0f172a" : "#e2e8f0",
                  color: previewLocale === "ar" ? "#fff" : "#475569",
                  cursor: "pointer",
                }}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setPreviewLocale("en")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  background: previewLocale === "en" ? "#0f172a" : "#e2e8f0",
                  color: previewLocale === "en" ? "#fff" : "#475569",
                  cursor: "pointer",
                }}
              >
                EN
              </button>
            </div>
          </div>

          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "8px",
              padding: "14px 16px",
              direction: previewLocale === "ar" ? "rtl" : "ltr",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "18px" }}>🔔</span>
              <strong style={{ fontSize: "14px", color: "#92400e" }}>
                {previewLocale === "ar" ? settings.noticeTitleAr : settings.noticeTitleEn}
              </strong>
              {activePreset && (
                <span style={{ fontSize: "11px", background: "#fef3c7", padding: "2px 6px", borderRadius: "4px", color: "#b45309" }}>
                  {previewLocale === "ar" ? activePreset.labelAr : activePreset.labelEn}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#b45309", lineHeight: "1.4" }}>
              {previewLocale === "ar" ? settings.noticeMessageAr : settings.noticeMessageEn}
            </p>
            {settings.expectedResumeAt && (
              <div style={{ marginTop: "6px", fontSize: "11px", color: "#d97706", fontWeight: 700 }}>
                ⏳ {previewLocale === "ar" ? "الاستئناف المتوقع:" : "Expected Resume:"} {settings.expectedResumeAt}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Branch-Level Controls */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "26px",
          marginBottom: "28px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{ fontSize: "20px" }}>🏢</span>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
            3. التحكم في الفروع وساعات العمل المستقلة | Branch Operations
          </h2>
        </div>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "14px" }}>
          إذا كان وضع التشغيل العام يستقبل طلبات، يمكنك تعطيل فرع معين مؤقتاً للصيانة مع استمرار باقي الفروع. أما في وضعي العرض فقط أو الإغلاق المؤقت فتتوقف جميع الفروع إجبارياً.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {branches.map((b) => {
            const ov = settings.branchOverrides[b.id] || {
              isOrderable: b.isOrderable,
              isOpen: b.isActive,
            };
            const isBranchActive = ov.isOrderable && ov.isOpen;

            return (
              <div
                key={b.id}
                style={{
                  border: isBranchActive ? "1px solid #cbd5e1" : "1px solid #fca5a5",
                  background: isBranchActive ? "#f8fafc" : "#fff5f5",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "14px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                      {b.nameAr}
                    </h3>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>{b.addressAr}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                        background: !isOrderingAllowed ? "#fee2e2" : isBranchActive ? "#dcfce7" : "#fee2e2",
                        color: !isOrderingAllowed ? "#991b1b" : isBranchActive ? "#166534" : "#991b1b",
                      }}
                    >
                      {!isOrderingAllowed
                        ? "معطّل بالوضع العام للمطعم"
                        : isBranchActive
                        ? "متاح للطلبات الآن"
                        : "متوقف عن الطلبات"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginBottom: "16px",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={ov.isOpen}
                      onChange={(e) => handleBranchOverrideChange(b.id, "isOpen", e.target.checked)}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span>الفرع مفتوح ويعمل (Open)</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={ov.isOrderable}
                      onChange={(e) => handleBranchOverrideChange(b.id, "isOrderable", e.target.checked)}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span>استقبال الطلبات مفعّل (Orderable)</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={ov.allowDelivery ?? true}
                      onChange={(e) => handleBranchOverrideChange(b.id, "allowDelivery", e.target.checked)}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span>متاح للتوصيل من هذا الفرع</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={ov.allowTakeaway ?? true}
                      onChange={(e) => handleBranchOverrideChange(b.id, "allowTakeaway", e.target.checked)}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span>متاح للاستلام من هذا الفرع</span>
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      مواعيد العمل (عربي)
                    </label>
                    <input
                      type="text"
                      value={ov.workingHoursAr ?? b.openingHoursAr ?? "يومياً: ١٠:٠٠ ص – ١:٠٠ ص"}
                      onChange={(e) => handleBranchOverrideChange(b.id, "workingHoursAr", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      رسالة خاصة عند إغلاق هذا الفرع
                    </label>
                    <input
                      type="text"
                      placeholder="عذراً، هذا الفرع مغلق حالياً للتجديد..."
                      value={ov.customMessageAr ?? ""}
                      onChange={(e) => handleBranchOverrideChange(b.id, "customMessageAr", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
