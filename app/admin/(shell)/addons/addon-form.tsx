"use client";
import { useState, useMemo, useEffect, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AddonActionState } from "./actions";

export type OptionItemRow = {
  id?: string;
  nameAr: string;
  nameEn: string;
  price: string | number;
  isActive: boolean;
};

export type OptionGroupFormValues = {
  id?: string;
  nameAr: string;
  nameEn: string;
  isRequired: boolean;
  isMulti: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  isActive: boolean;
  options: OptionItemRow[];
  productIds: string[];
};

export type ProductOptionChoice = {
  id: string;
  nameAr: string;
  categoryName: string;
};

type Props = {
  action: (prev: AddonActionState, fd: FormData) => Promise<AddonActionState>;
  initial?: OptionGroupFormValues;
  products: ProductOptionChoice[];
  submitLabel: string;
};

const defaultOption = (): OptionItemRow => ({
  nameAr: "",
  nameEn: "",
  price: 0,
  isActive: true,
});

export default function AddonForm({ action, initial, products, submitLabel }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<AddonActionState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) {
      router.push("/admin/addons");
      router.refresh();
    }
  }, [state.ok, router]);

  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [isRequired, setIsRequired] = useState(initial?.isRequired ?? false);
  const [isMulti, setIsMulti] = useState(initial?.isMulti ?? false);
  const [minSelect, setMinSelect] = useState(initial?.minSelect ?? 0);
  const [maxSelect, setMaxSelect] = useState(initial?.maxSelect ?? 1);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const [options, setOptions] = useState<OptionItemRow[]>(
    initial?.options?.length ? initial.options : [defaultOption()]
  );

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(initial?.productIds ?? [])
  );

  const [productFilter, setProductFilter] = useState("");

  // Options JSON
  const optionsJson = useMemo(() => {
    return JSON.stringify(
      options.map((opt, i) => ({
        id: opt.id,
        nameAr: opt.nameAr.trim(),
        nameEn: opt.nameEn.trim() || undefined,
        price: Number(opt.price) || 0,
        isActive: opt.isActive,
        sortOrder: i,
      }))
    );
  }, [options]);

  // Products JSON
  const productIdsJson = useMemo(() => {
    return JSON.stringify(Array.from(selectedProductIds));
  }, [selectedProductIds]);

  const addOption = () => {
    setOptions((prev) => [...prev, defaultOption()]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 1) {
      alert("يجب أن تحتوي المجموعة على خيار واحد على الأقل.");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, patch: Partial<OptionItemRow>) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, ...patch } : opt))
    );
  };

  const toggleProduct = (pId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(pId)) next.delete(pId);
      else next.add(pId);
      return next;
    });
  };

  const filteredProducts = useMemo(() => {
    if (!productFilter.trim()) return products;
    const term = productFilter.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.nameAr.toLowerCase().includes(term) ||
        p.categoryName.toLowerCase().includes(term)
    );
  }, [products, productFilter]);

  return (
    <form action={formAction} className="admin-panel">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="options" value={optionsJson} />
      <input type="hidden" name="productIds" value={productIdsJson} />

      <div className="admin-form">
        {state.error ? <p className="admin-flash err">{state.error}</p> : null}

        {/* Section 1: Group Basics */}
        <fieldset className="admin-fieldset">
          <legend>بيانات المجموعة الأساسية</legend>

          <label className="admin-field">
            <span>اسم المجموعة بالعربية *</span>
            <input
              type="text"
              name="nameAr"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: الإضافات الخاصة / الصوصات / درجة التسوية"
            />
          </label>

          <label className="admin-field">
            <span>الاسم بالإنجليزية (اختياري)</span>
            <input
              type="text"
              name="nameEn"
              dir="ltr"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Special Add-ons / Sauces"
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <label className="admin-field-check">
              <input
                type="checkbox"
                name="isRequired"
                checked={isRequired}
                onChange={(e) => {
                  setIsRequired(e.target.checked);
                  if (e.target.checked && minSelect === 0) setMinSelect(1);
                }}
              />
              <span>إلزامية (يجب على العميل الاختيار)</span>
            </label>

            <label className="admin-field-check">
              <input
                type="checkbox"
                name="isMulti"
                checked={isMulti}
                onChange={(e) => setIsMulti(e.target.checked)}
              />
              <span>اختيار متعدد (تحديد أكثر من خيار)</span>
            </label>

            <label className="admin-field-check">
              <input
                type="checkbox"
                name="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>مفعّلة وظاهرة للعملاء</span>
            </label>
          </div>

          {isMulti ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
              <label className="admin-field">
                <span>الحد الأدنى للاختيار (Min)</span>
                <input
                  type="number"
                  name="minSelect"
                  min={0}
                  max={maxSelect}
                  value={minSelect}
                  onChange={(e) => setMinSelect(Number(e.target.value))}
                />
              </label>

              <label className="admin-field">
                <span>الحد الأقصى للاختيار (Max)</span>
                <input
                  type="number"
                  name="maxSelect"
                  min={1}
                  max={50}
                  value={maxSelect}
                  onChange={(e) => setMaxSelect(Number(e.target.value))}
                />
              </label>
            </div>
          ) : null}

          <label className="admin-field" style={{ maxWidth: 200, marginTop: 8 }}>
            <span>ترتيب العرض</span>
            <input
              type="number"
              name="sortOrder"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </label>
        </fieldset>

        {/* Section 2: Options List */}
        <fieldset className="admin-fieldset">
          <legend style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>الخيارات المتاحة داخل المجموعة ({options.length})</span>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={addOption}
            >
              + إضافة خيار
            </button>
          </legend>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {options.map((opt, idx) => (
              <div
                key={idx}
                className="admin-addon-option"
                style={{
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--surface-sunken, rgba(255,255,255,0.03))",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              >
                <input
                  type="text"
                  placeholder="اسم الخيار بالعربية *"
                  value={opt.nameAr}
                  required
                  onChange={(e) => updateOption(idx, { nameAr: e.target.value })}
                  style={{ padding: "6px 10px", fontSize: 13 }}
                />

                <input
                  type="text"
                  dir="ltr"
                  placeholder="الاسم بالإنجليزية (اختياري)"
                  value={opt.nameEn}
                  onChange={(e) => updateOption(idx, { nameEn: e.target.value })}
                  style={{ padding: "6px 10px", fontSize: 13 }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={opt.price}
                    onChange={(e) => updateOption(idx, { price: e.target.value })}
                    style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
                    placeholder="السعر"
                  />
                  <small style={{ color: "var(--muted)", fontSize: 11 }}>ج.م</small>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={opt.isActive}
                    onChange={(e) => updateOption(idx, { isActive: e.target.checked })}
                  />
                  <span>متاح</span>
                </label>

                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-danger"
                  onClick={() => removeOption(idx)}
                  title="حذف الخيار"
                  style={{ padding: "4px 8px" }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </fieldset>

        {/* Section 3: Product Assignments */}
        <fieldset className="admin-fieldset">
          <legend>ربط المجموعة بالمنتجات ({selectedProductIds.size} منتج محدد)</legend>

          <div style={{ marginBottom: 12 }}>
            <input
              type="search"
              placeholder="ابحث لتصفية المنتجات المتاحة…"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              style={{ width: "100%", maxWidth: 360, padding: "7px 12px", fontSize: 13 }}
            />
          </div>

          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 8,
              padding: 12,
              background: "var(--surface-sunken, rgba(0,0,0,0.1))",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            {filteredProducts.map((p) => {
              const isChecked = selectedProductIds.has(p.id);
              return (
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: isChecked ? "rgba(224, 90, 43, 0.12)" : "transparent",
                    border: isChecked ? "1px solid var(--brand, #e05a2b)" : "1px solid transparent",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong>{p.nameAr}</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: 11 }}>
                      {p.categoryName}
                    </small>
                  </span>
                </label>
              );
            })}
            {filteredProducts.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, gridColumn: "1 / -1" }}>
                لا توجد منتجات مطابقة للبحث.
              </p>
            ) : null}
          </div>
        </fieldset>

        {/* Actions bar */}
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
            {isPending ? "جاري الحفظ…" : submitLabel}
          </button>
          <Link href="/admin/addons" className="admin-btn">
            إلغاء
          </Link>
        </div>
      </div>
    </form>
  );
}
