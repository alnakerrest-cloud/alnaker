"use client";

import { useState, useTransition } from "react";
import { attachProductOptionGroup, detachProductOptionGroup } from "../actions";

interface OptionItemData {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  price: any;
}

interface OptionGroupData {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  isRequired: boolean;
  isMulti: boolean;
  minSelect: number;
  maxSelect: number;
  options: OptionItemData[];
}

interface AssignedGroupData {
  id: string;
  groupId: string;
  group: OptionGroupData | null;
}

export default function ProductOptionGroupsManager({
  productId,
  assignedGroups,
  availableGroups,
}: {
  productId: string;
  assignedGroups: AssignedGroupData[];
  availableGroups: OptionGroupData[];
}) {
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const assignedGroupIds = new Set(assignedGroups.map((a) => a.groupId));
  const unassignedGroups = availableGroups.filter((g) => !assignedGroupIds.has(g.id));

  const handleAttach = () => {
    if (!selectedGroupId) return;
    setError(null);
    startTransition(async () => {
      const res = await attachProductOptionGroup(productId, selectedGroupId);
      if (!res.ok) {
        setError(res.error || "حدث خطأ أثناء ربط المجموعة");
      } else {
        setSelectedGroupId("");
      }
    });
  };

  const handleDetach = (groupId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await detachProductOptionGroup(productId, groupId);
      if (!res.ok) {
        setError(res.error || "حدث خطأ أثناء فصل المجموعة");
      }
    });
  };

  return (
    <div className="admin-card" style={{ marginTop: "24px" }}>
      <div className="admin-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>مجموعات الخيارات والإضافات المرتبطة</h2>
          <p className="admin-card-desc">
            حدد مجموعات الخيارات (مثل نوع اللحم، طريقة التحضير، أو الصوصات) التي تظهر للمستهلك عند طلب هذا المنتج.
          </p>
        </div>
        <span className="admin-user-chip">{assignedGroups.length} مجموعة مرتبطة</span>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", margin: "12px 0", fontSize: "14px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Linked Groups List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "16px 0" }}>
        {assignedGroups.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "14px", fontStyle: "italic", margin: "8px 0" }}>
            لا توجد مجموعات خيارات مرتبطة بهذا المنتج حالياً.
          </p>
        ) : (
          assignedGroups.map((a) => {
            const grp = a.group;
            if (!grp) return null;
            return (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "15px", color: "#f8fafc" }}>{grp.nameAr}</strong>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: grp.isRequired ? "rgba(239, 68, 68, 0.15)" : "rgba(100, 116, 139, 0.2)",
                        color: grp.isRequired ? "#ef4444" : "#94a3b8",
                        border: `1px solid ${grp.isRequired ? "rgba(239, 68, 68, 0.3)" : "rgba(100, 116, 139, 0.3)"}`,
                      }}
                    >
                      {grp.isRequired ? "إجباري" : "اختياري"}
                    </span>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {grp.isMulti ? `متعدد (حد أقصى ${grp.maxSelect})` : "اختيار فردي (1)"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {grp.options.map((opt) => (
                      <span
                        key={opt.id}
                        style={{
                          fontSize: "12px",
                          background: "rgba(255, 255, 255, 0.06)",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          color: "#cbd5e1",
                        }}
                      >
                        {opt.nameAr}{" "}
                        <span style={{ color: Number(opt.price) > 0 ? "#f59e0b" : "#10b981", fontWeight: 700 }}>
                          ({Number(opt.price) > 0 ? `+${opt.price} ج.م` : "مجاني"})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDetach(grp.id)}
                  disabled={isPending}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    color: "#f87171",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                >
                  فصل عن المنتج
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Attach New Group Form */}
      {unassignedGroups.length > 0 && (
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            disabled={isPending}
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f8fafc",
              fontSize: "14px",
            }}
          >
            <option value="">-- اختر مجموعة لإضافتها إلى هذا المنتج --</option>
            {unassignedGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nameAr} ({g.isRequired ? "إجباري" : "اختياري"} — {g.options.length} خيارات)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAttach}
            disabled={!selectedGroupId || isPending}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              background: selectedGroupId && !isPending ? "#e05a2b" : "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: selectedGroupId && !isPending ? "pointer" : "not-allowed",
            }}
          >
            {isPending ? "جاري الإضافة..." : "+ إضافة للمنتج"}
          </button>
        </div>
      )}
    </div>
  );
}
