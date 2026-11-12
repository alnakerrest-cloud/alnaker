"use client";
import { useMemo, useState, useTransition } from "react";
import { importApproved, type ImportActionState } from "./actions";
import type { ImportCandidate } from "@/lib/admin/import-source";

type EditPrice = { labelAr: string; price: string; maxPrice: string };
type Row = {
  key: string;
  categoryAr: string;
  sectionAr: string;
  nameAr: string;
  descAr: string;
  badge: "" | "SIGNATURE" | "OFFER";
  ingredientsAr: string;
  sourcePage: string;
  prices: EditPrice[];
  approve: boolean;
  editing: boolean;
  wasExisting: boolean;
  existingPrices?: string;
};

const PAGE_SIZE = 25;
const dupKey = (categoryAr: string, nameAr: string) => `${categoryAr}|||${nameAr}`;
const splitStr = (s: string) => s.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean);
const priceText = (p: EditPrice[]) =>
  p.length ? p.map((x) => `${x.labelAr ? x.labelAr + " " : ""}${x.maxPrice && x.maxPrice !== x.price ? `${x.price}–${x.maxPrice}` : x.price}`).join("، ") : "—";

function rowFromCandidate(c: ImportCandidate): Row {
  return {
    key: c.key,
    categoryAr: c.categoryAr,
    sectionAr: c.sectionAr,
    nameAr: c.nameAr,
    descAr: c.descAr,
    badge: c.badge,
    ingredientsAr: c.ingredientsAr.join("، "),
    sourcePage: c.sourcePage == null ? "" : String(c.sourcePage),
    prices: c.prices.map((p) => ({
      labelAr: p.labelAr ?? "",
      price: p.price == null ? "" : String(p.price),
      maxPrice: p.maxPrice == null ? "" : String(p.maxPrice),
    })),
    approve: false,
    editing: false,
    wasExisting: c.matchState === "existing",
    existingPrices: c.existingPrices,
  };
}

export default function ImportReview({ candidates, existing }: { candidates: ImportCandidate[]; existing: string[] }) {
  const [rows, setRows] = useState<Row[]>(() => candidates.map(rowFromCandidate));
  const [show, setShow] = useState<"all" | "new" | "dup">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pending, start] = useTransition();
  const [state, setState] = useState<ImportActionState>({});
  const existingSet = useMemo(() => new Set(existing), [existing]);

  const setRow = (key: string, patch: Partial<Row>) => setRows((a) => a.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const setPrice = (key: string, i: number, patch: Partial<EditPrice>) =>
    setRows((a) => a.map((r) => (r.key === key ? { ...r, prices: r.prices.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) } : r)));
  const addPrice = (key: string) => setRows((a) => a.map((r) => (r.key === key ? { ...r, prices: [...r.prices, { labelAr: "", price: "", maxPrice: "" }] } : r)));
  const delPrice = (key: string, i: number) => setRows((a) => a.map((r) => (r.key === key && r.prices.length > 1 ? { ...r, prices: r.prices.filter((_, idx) => idx !== i) } : r)));

  const isDup = (r: Row) => existingSet.has(dupKey(r.categoryAr, r.nameAr));
  const approvedCount = rows.filter((r) => r.approve).length;
  const willCreate = rows.filter((r) => r.approve && !isDup(r)).length;

  const bulkApprove = (onlyNew = false) => setRows((a) => a.map((r) => ({ ...r, approve: onlyNew ? !isDup(r) : true })));
  const bulkReject = () => setRows((a) => a.map((r) => ({ ...r, approve: false })));

  const addRow = () => {
    setRows((a) => [
      { key: `manual-${Date.now()}`, categoryAr: "", sectionAr: "", nameAr: "", descAr: "", badge: "", ingredientsAr: "", sourcePage: "", prices: [{ labelAr: "", price: "", maxPrice: "" }], approve: true, editing: true, wasExisting: false },
      ...a,
    ]);
    setPage(1);
    setShow("all");
    setQ("");
  };

  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((r) => r.approve)
          .map((r) => ({
            categoryAr: r.categoryAr.trim(),
            sectionAr: r.sectionAr.trim() || undefined,
            nameAr: r.nameAr.trim(),
            descAr: r.descAr.trim() || undefined,
            badge: r.badge || undefined,
            ingredientsAr: splitStr(r.ingredientsAr),
            sourcePage: r.sourcePage.trim() || null,
            prices: r.prices.map((p) => ({ labelAr: p.labelAr.trim() || undefined, price: p.price.trim(), maxPrice: p.maxPrice.trim() || null })),
          })),
      ),
    [rows],
  );

  const submit = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("items", itemsJson);
      const res = await importApproved({}, fd);
      setState(res);
    });

  const filtered = rows.filter((r) => {
    if (show === "new" && isDup(r)) return false;
    if (show === "dup" && !isDup(r)) return false;
    if (q) {
      const hay = `${r.categoryAr} ${r.sectionAr} ${r.nameAr}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const changeFilter = (v: typeof show) => { setShow(v); setPage(1); };
  const changeQ = (v: string) => { setQ(v); setPage(1); };

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div className="admin-toolbar">
          <input type="search" value={q} onChange={(e) => changeQ(e.target.value)} placeholder="ابحث في المرشّحات…" />
          <select value={show} onChange={(e) => changeFilter(e.target.value as typeof show)}>
            <option value="all">الكل ({rows.length})</option>
            <option value="new">الجديد فقط ({rows.filter((r) => !isDup(r)).length})</option>
            <option value="dup">الموجود/المكرر ({rows.filter(isDup).length})</option>
          </select>
        </div>
        <div className="admin-toolbar">
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => bulkApprove(false)}>اعتماد الكل</button>
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => bulkApprove(true)}>اعتماد الجديد</button>
          <button type="button" className="admin-btn admin-btn-sm" onClick={bulkReject}>رفض الكل</button>
          <button type="button" className="admin-btn admin-btn-sm" onClick={addRow}>+ عنصر جديد</button>
        </div>
      </div>

      <div className="admin-toolbar" style={{ padding: "12px 18px", gap: 16, flexWrap: "wrap" }}>
        <span>المعتمد: <b>{approvedCount}</b></span>
        <span>سيُنشأ (جديد): <b style={{ color: "#256d1f" }}>{willCreate}</b></span>
        <span>سيتخطّى (موجود): <b style={{ color: "#a3282a" }}>{approvedCount - willCreate}</b></span>
        <button type="button" className="admin-btn admin-btn-primary" disabled={pending || approvedCount === 0} onClick={submit}>
          {pending ? "جارٍ الاستيراد…" : "استيراد المعتمد (معاملة واحدة)"}
        </button>
      </div>

      {state.error ? <p className="admin-flash err" style={{ margin: "0 18px" }}>{state.error}</p> : null}
      {state.result ? (
        <p className="admin-flash ok" style={{ margin: "0 18px" }}>
          تم الاستيراد: أنشئ {state.result.created}، تخطّى {state.result.skipped}، فشل {state.result.failed}.
        </p>
      ) : null}

      <p style={{ padding: "0 18px", color: "var(--muted)", fontSize: 13 }}>
        لا يُدمج أي عنصر مع الموجود؛ المطابق يُتخطّى. اضغط «تعديل» لتغيير الاسم/القسم/السعر قبل الاعتماد (تعديل الاسم إلى قيمة غير موجودة يحوّله إلى «جديد»).
        رقم صفحة المصدر غير متاح من نص الـPDF الحالي — أدخله يدويًا عند توفره (يُحفظ في سجل الاستيراد). الصور ليست جزءًا من هذا الاستيراد النصي.
      </p>

      <div className="admin-table-wrap">
      <table className="admin-table" style={{ marginTop: 8 }}>
        <thead>
          <tr><th>اعتماد</th><th>القسم / العنبر</th><th>اسم المنتج</th><th>الأسعار</th><th>صفحة المصدر</th><th>الحالة</th><th>الأسعار الحالية</th><th></th></tr>
        </thead>
        <tbody>
          {slice.map((r) => {
            const dup = isDup(r);
            return (
              <tr key={r.key}>
                <td><input type="checkbox" checked={r.approve} onChange={(e) => setRow(r.key, { approve: e.target.checked })} /></td>
                {r.editing ? (
                  <td style={{ minWidth: 160 }}>
                    <input style={{ width: "100%", marginBottom: 4 }} value={r.categoryAr} onChange={(e) => setRow(r.key, { categoryAr: e.target.value })} placeholder="القسم" />
                    <input style={{ width: "100%" }} value={r.sectionAr} onChange={(e) => setRow(r.key, { sectionAr: e.target.value })} placeholder="العنبر (اختياري)" />
                  </td>
                ) : (
                  <td>{r.categoryAr}{r.sectionAr ? " › " + r.sectionAr : ""}</td>
                )}
                {r.editing ? (
                  <td style={{ minWidth: 200 }}>
                    <input style={{ width: "100%" }} value={r.nameAr} onChange={(e) => setRow(r.key, { nameAr: e.target.value })} />
                    <div className="grid-2" style={{ marginTop: 6, gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <textarea style={{ width: "100%" }} rows={2} value={r.descAr} onChange={(e) => setRow(r.key, { descAr: e.target.value })} placeholder="الوصف (لا تختلق)" />
                      <div>
                        <select style={{ width: "100%", marginBottom: 6 }} value={r.badge} onChange={(e) => setRow(r.key, { badge: e.target.value as Row["badge"] })}>
                          <option value="">بدون شارة</option>
                          <option value="SIGNATURE">مميز</option>
                          <option value="OFFER">عرض</option>
                        </select>
                        <input style={{ width: "100%" }} value={r.ingredientsAr} onChange={(e) => setRow(r.key, { ingredientsAr: e.target.value })} placeholder="مكوّنات (فواصل)" />
                      </div>
                    </div>
                  </td>
                ) : (
                  <td>{r.nameAr}{r.badge ? <span className="admin-badge gold" style={{ marginInlineStart: 6 }}>{r.badge === "SIGNATURE" ? "مميز" : "عرض"}</span> : null}</td>
                )}
                {r.editing ? (
                  <td>
                    <div className="admin-variants">
                      {r.prices.map((p, i) => (
                        <div key={i} className="admin-variant-row" style={{ gridTemplateColumns: "1fr 70px 70px auto", minWidth: 240 }}>
                          <input value={p.labelAr} onChange={(e) => setPrice(r.key, i, { labelAr: e.target.value })} placeholder="ملصق" />
                          <input type="number" step="0.5" value={p.price} onChange={(e) => setPrice(r.key, i, { price: e.target.value })} placeholder="سعر" />
                          <input type="number" step="0.5" value={p.maxPrice} onChange={(e) => setPrice(r.key, i, { maxPrice: e.target.value })} placeholder="أقصى" />
                          <button type="button" className="admin-btn admin-btn-sm" onClick={() => delPrice(r.key, i)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="admin-btn admin-btn-sm" style={{ marginTop: 6 }} onClick={() => addPrice(r.key)}>+ سعر</button>
                  </td>
                ) : (
                  <td>{priceText(r.prices)}</td>
                )}
                <td>{r.editing ? <input type="number" min="1" style={{ width: 70 }} value={r.sourcePage} onChange={(e) => setRow(r.key, { sourcePage: e.target.value })} placeholder="—" /> : (r.sourcePage || "—")}</td>
                <td><span className={`admin-badge ${dup ? "off" : "on"}`}>{dup ? "موجود — سيُتخطّى" : "جديد — سيُنشأ"}</span></td>
                <td style={{ color: "var(--muted)", fontSize: 13 }}>{dup ? (r.existingPrices ?? "—") : "—"}</td>
                <td><button type="button" className="admin-btn admin-btn-sm" onClick={() => setRow(r.key, { editing: !r.editing })}>{r.editing ? "إغلاق" : "تعديل"}</button></td>
              </tr>
            );
          })}
          {filtered.length === 0 ? <tr><td colSpan={8} className="admin-empty">لا عناصر مطابقة للمرشّح.</td></tr> : null}
        </tbody>
      </table>
      </div>

      {pageCount > 1 ? (
        <div className="admin-toolbar" style={{ padding: "12px 18px", justifyContent: "center" }}>
          <button type="button" className="admin-btn admin-btn-sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>السابق</button>
          <span style={{ padding: "0 8px" }}>صفحة {safePage} من {pageCount} ({filtered.length} عنصر)</span>
          <button type="button" className="admin-btn admin-btn-sm" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>التالي</button>
        </div>
      ) : null}
    </section>
  );
}
