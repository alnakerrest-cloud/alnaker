"use client";

import React, { useState } from "react";
import type { MenuModeSettings, BranchOverrideSettings, OrderSuspensionReason } from "@/lib/order-settings-types";
import { REASON_PRESETS } from "@/lib/order-settings-types";

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
  }));

  const [previewLocale, setPreviewLocale] = useState<"ar" | "en">("ar");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleModeChange = (mode: MenuModeSettings["mode"]) => {
    setSettings((prev) => ({ ...prev, mode }));
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
      setSettings(data.settings);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "حدث خطأ أثناء الحفظ." });
    } finally {
      setIsSaving(false);
    }
  };

  const isGlobalActive = settings.mode === "VIEW_AND_ORDER";
  const orderableBranchCount = branches.filter((b) => {
    const o = settings.branchOverrides[b.id];
    return o ? o.isOrderable && o.isOpen : b.isOrderable && b.isActive;
  }).length;

  const activePreset = settings.reasonCode && REASON_PRESETS[settings.reasonCode];

  return (
    <div style={{ maxWidth: "1140px", margin: "0 auto", paddingBottom: "60px" }}>
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
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>
            إعدادات وتفعيل الطلبات | Order Settings
          </h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
            التحكم المركزي في إتاحة استقبال طلبات الطعام، تنبيهات توقف الطلبات، الفروع، وطرق التوصيل.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="admin-btn admin-btn-primary"
          style={{
            minWidth: "160px",
            padding: "12px 24px",
            fontSize: "15px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            borderRadius: "10px",
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
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "6px" }}>
            حالة النظام العامة
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: isGlobalActive ? "#16a34a" : settings.mode === "VIEW_ONLY" ? "#d97706" : "#dc2626",
              }}
            />
            <strong style={{ fontSize: "16px", color: "#0f172a" }}>
              {settings.mode === "VIEW_AND_ORDER"
                ? "مفعّل ويستقبل طلبات"
                : settings.mode === "VIEW_ONLY"
                ? "وضع العرض فقط (View Only)"
                : "إغلاق مؤقت"}
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
            جاهزية الفروع
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🏢</span>
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
            شريط تنبيه التوقف
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🔔</span>
            <strong style={{ fontSize: "15px", color: settings.enableNotice !== false ? "#16a34a" : "#64748b" }}>
              {settings.enableNotice !== false ? "مفعّل في المنيو" : "معطّل"}
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
            آخر تحديث للإعدادات
          </div>
          <div style={{ fontSize: "13px", color: "#334155" }}>
            {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString("ar-EG") : "—"}
          </div>
          {settings.updatedBy && (
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              بواسطة: {settings.updatedBy}
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Global Operations */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
          1. وضع التشغيل العام للمطعم والمنيو
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            onClick={() => handleModeChange("VIEW_AND_ORDER")}
            style={{
              padding: "16px",
              borderRadius: "10px",
              border: settings.mode === "VIEW_AND_ORDER" ? "2px solid #16a34a" : "1px solid #e2e8f0",
              background: settings.mode === "VIEW_AND_ORDER" ? "#f0fdf4" : "#fff",
              textAlign: "right",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>✅</div>
            <strong style={{ display: "block", fontSize: "15px", color: "#0f172a" }}>استقبال الطلبات مفعّل</strong>
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
              المنيو متاح للتصفح، والسلة وإتمام الطلبات تعمل بشكل طبيعي في جميع الفروع المفعّلة.
            </small>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("VIEW_ONLY")}
            style={{
              padding: "16px",
              borderRadius: "10px",
              border: settings.mode === "VIEW_ONLY" ? "2px solid #d97706" : "1px solid #e2e8f0",
              background: settings.mode === "VIEW_ONLY" ? "#fffbeb" : "#fff",
              textAlign: "right",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>👁️</div>
            <strong style={{ display: "block", fontSize: "15px", color: "#0f172a" }}>وضع العرض فقط (View Only)</strong>
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
              المنيو وجميع الأصناف والصور والأسعار متاحة 100% للتصفح، مع إيقاف استقبال الطلبات نهائياً في جميع الفروع.
            </small>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("TEMPORARILY_CLOSED")}
            style={{
              padding: "16px",
              borderRadius: "10px",
              border: settings.mode === "TEMPORARILY_CLOSED" ? "2px solid #dc2626" : "1px solid #e2e8f0",
              background: settings.mode === "TEMPORARILY_CLOSED" ? "#fef2f2" : "#fff",
              textAlign: "right",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>🛑</div>
            <strong style={{ display: "block", fontSize: "15px", color: "#0f172a" }}>إغلاق مؤقت للمطعم</strong>
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
              توقف كامل عن استقبال أي طلبات جديدة مع إعلام الزبائن بالإغلاق المؤقت.
            </small>
          </button>
        </div>

        {/* Global Order Type Toggles */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
            أنواع الطلبات المدعومة على مستوى المطعم
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

      {/* Section 2: Order Suspension Notice & Customer Alerts */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
            2. إعدادات شريط تنبيه توقف الطلبات (Suspension Notice & Reason)
          </h2>
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
              onChange={(e) => setSettings((p) => ({ ...p, enableNotice: e.target.checked }))}
              style={{ width: "16px", height: "16px" }}
            />
            <span>{settings.enableNotice !== false ? "شريط التنبيه مفعّل" : "شريط التنبيه معطّل"}</span>
          </label>
        </div>

        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "14px" }}>
          يظهر هذا التنبيه أعلى المنيو في وضع &quot;العرض فقط&quot; أو &quot;الإغلاق المؤقت&quot; لتوضيح سبب عدم إمكانية إتمام الطلبات ووقت الاستئناف دون حجب تصفح المنتجات والأسعار.
        </p>

        {/* Reason preset dropdown & Expected Resume */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              سبب توقف الطلبات المسبق (Reason Preset)
            </label>
            <select
              value={settings.reasonCode || "HIGH_ORDER_VOLUME"}
              onChange={(e) => handleReasonPresetChange(e.target.value as OrderSuspensionReason)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                background: "#fff",
                fontWeight: 600,
              }}
            >
              <option value="HIGH_ORDER_VOLUME">ضغط كبير على الطلبات (High order volume)</option>
              <option value="TEMPORARILY_CLOSED">إغلاق مؤقت للمطعم (Temporarily closed)</option>
              <option value="OUTSIDE_WORKING_HOURS">خارج ساعات العمل الرسمية (Outside operating hours)</option>
              <option value="MAINTENANCE">أعمال صيانة وتحديث (Maintenance and updates)</option>
              <option value="CUSTOM">سبب مخصص (Custom reason)</option>
            </select>
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
              اختيار سبب يقوم بالتعبئة التلقائية للنصوص مع إمكانية تعديلها بحرية أدناه.
            </small>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              وقت الاستئناف المتوقع (Expected Resume Time - اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: الساعة 7:00 مساءً أو 07:00 PM"
              value={settings.expectedResumeAt || ""}
              onChange={(e) => setSettings((p) => ({ ...p, expectedResumeAt: e.target.value }))}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                background: "#fff",
              }}
            />
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
              اتركه فارغاً إذا لم يكن هناك وقت استئناف محدد.
            </small>
          </div>
        </div>

        {/* Bilingual Inputs: Title */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              عنوان التنبيه (عربي)
            </label>
            <input
              type="text"
              value={settings.noticeTitleAr || ""}
              onChange={(e) => setSettings((p) => ({ ...p, noticeTitleAr: e.target.value }))}
              placeholder="الطلبات متوقفة مؤقتًا"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Notice Title (English)
            </label>
            <input
              type="text"
              dir="ltr"
              value={settings.noticeTitleEn || ""}
              onChange={(e) => setSettings((p) => ({ ...p, noticeTitleEn: e.target.value }))}
              placeholder="Ordering is temporarily unavailable"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Bilingual Inputs: Message Description */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              نص الرسالة التوضيحية (عربي)
            </label>
            <textarea
              rows={3}
              value={settings.noticeMessageAr || ""}
              onChange={(e) => setSettings((p) => ({ ...p, noticeMessageAr: e.target.value }))}
              placeholder="يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Notice Message (English)
            </label>
            <textarea
              rows={3}
              dir="ltr"
              value={settings.noticeMessageEn || ""}
              onChange={(e) => setSettings((p) => ({ ...p, noticeMessageEn: e.target.value }))}
              placeholder="You can browse our menu and prices, but orders are not being accepted right now..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Interactive Live Customer Preview Box */}
        <div
          style={{
            border: "1px solid #fde68a",
            background: "#fffdf5",
            borderRadius: "12px",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              borderBottom: "1px solid #fef3c7",
              paddingBottom: "12px",
              marginBottom: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>👁️</span>
              <strong style={{ fontSize: "14px", color: "#92400e" }}>
                معاينة حية لشريط التنبيه كما سيظهر للعميل (Live Customer Preview)
              </strong>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setPreviewLocale("ar")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: previewLocale === "ar" ? "1px solid #d97706" : "1px solid #e2e8f0",
                  background: previewLocale === "ar" ? "#d97706" : "#fff",
                  color: previewLocale === "ar" ? "#fff" : "#475569",
                }}
              >
                عربي (RTL)
              </button>
              <button
                type="button"
                onClick={() => setPreviewLocale("en")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: previewLocale === "en" ? "1px solid #d97706" : "1px solid #e2e8f0",
                  background: previewLocale === "en" ? "#d97706" : "#fff",
                  color: previewLocale === "en" ? "#fff" : "#475569",
                }}
              >
                English (LTR)
              </button>
            </div>
          </div>

          {settings.enableNotice === false ? (
            <div
              style={{
                padding: "14px",
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "10px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              ⚠️ التنبيه معطّل حالياً — لن يظهر هذا الشريط في المنيو حتى تقوم بتفعيله.
            </div>
          ) : (
            <div
              dir={previewLocale === "ar" ? "rtl" : "ltr"}
              style={{
                background: "linear-gradient(135deg, #fffdf5 0%, #fffbeb 100%)",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "16px 18px",
                boxShadow: "0 2px 10px rgba(217, 119, 6, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
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
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      background: "#fef3c7",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "17px",
                      flexShrink: 0,
                    }}
                  >
                    🔒
                  </span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15px", fontWeight: 800, color: "#92400e" }}>
                        {previewLocale === "ar"
                          ? settings.noticeTitleAr || "الطلبات متوقفة مؤقتًا"
                          : settings.noticeTitleEn || "Ordering is temporarily unavailable"}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: "#fef3c7",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                        }}
                      >
                        {previewLocale === "ar" ? "وضع العرض فقط" : "View-Only Mode"}
                      </span>
                    </div>

                    {activePreset && (
                      <div style={{ fontSize: "12px", color: "#b45309", marginTop: "2px", fontWeight: 600 }}>
                        {previewLocale === "ar"
                          ? `سبب التوقف: ${activePreset.labelAr}`
                          : `Reason: ${activePreset.labelEn}`}
                      </div>
                    )}
                  </div>
                </div>

                {settings.expectedResumeAt && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: "#fff",
                      border: "1px solid #fde68a",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#92400e",
                    }}
                  >
                    <span>⏱️</span>
                    <span>
                      {previewLocale === "ar"
                        ? `الاستئناف المتوقع: ${settings.expectedResumeAt}`
                        : `Expected: ${settings.expectedResumeAt}`}
                    </span>
                  </div>
                )}
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: "1.5",
                  color: "#78350f",
                  paddingTop: "4px",
                  borderTop: "1px dashed #fde68a",
                }}
              >
                {previewLocale === "ar"
                  ? settings.noticeMessageAr || "يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا."
                  : settings.noticeMessageEn || "You can browse our menu and prices, but orders are not being accepted right now."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Branch-Level Controls */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
          3. التحكم في الفروع وساعات العمل المستقلة
        </h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "14px" }}>
          إذا كان الوضع العام مفعلاً، يمكنك تعطيل فرع معين مؤقتاً للصيانة مع استمرار باقي الفروع. أما إذا كان الوضع العام للعرض فقط، فتتوقف جميع الفروع إجبارياً.
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
                        background: !isGlobalActive ? "#fee2e2" : isBranchActive ? "#dcfce7" : "#fee2e2",
                        color: !isGlobalActive ? "#991b1b" : isBranchActive ? "#166534" : "#991b1b",
                      }}
                    >
                      {!isGlobalActive
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
