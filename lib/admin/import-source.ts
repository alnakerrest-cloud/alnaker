// مصدر الاستيراد النصي: يبني مُرشّحات منتجات من data/menu.ts (المصدر المُسوّى مع نص الـPDF حسب تقرير التسوية).
// ملاحظة أمانة: النص المستخرج من الـPDF لا يحمل أرقام صفحات قابلة للقراءة آلّيًا هنا، لذا sourcePage = null
// ويُترك للمُراجع إدخاله عند توفر نص الـPDF بترقيم صفحات. لا نختلق أرقام صفحات.
import { menu } from "@/data/menu";
import { prisma } from "@/lib/prisma";

export type ImportPrice = { labelAr: string; price: number | null; maxPrice: number | null; raw: string };

export type ImportCandidate = {
  key: string;
  categoryAr: string;
  categorySlug: string;
  sectionAr: string; // "" => قسم افتراضي
  nameAr: string;
  descAr: string;
  badge: "" | "SIGNATURE" | "OFFER";
  ingredientsAr: string[];
  prices: ImportPrice[];
  sourcePage: number | null;
  sourceRef: string;
  matchState: "new" | "existing";
  existingId?: string;
  existingPrices?: string;
};

/** يحوّل قيمة السعر (رقم أو "60 – 95" أو رقم نصي) إلى price/maxPrice. */
function parsePrice(value: number | string, labelAr?: string): ImportPrice {
  const label = labelAr ?? "";
  if (typeof value === "number") return { labelAr: label, price: value, maxPrice: null, raw: String(value) };
  const raw = String(value).trim();
  const nums = raw.split(/[–—\-]/).map((x) => Number(x.replace(/[^\d.]/g, ""))).filter((n) => Number.isFinite(n));
  if (nums.length >= 2) return { labelAr: label, price: nums[0], maxPrice: nums[nums.length - 1], raw };
  if (nums.length === 1) return { labelAr: label, price: nums[0], maxPrice: null, raw };
  return { labelAr: label, price: null, maxPrice: null, raw };
}

function badgeOf(ar?: string): "" | "SIGNATURE" | "OFFER" {
  if (ar === "مميز") return "SIGNATURE";
  if (ar === "عرض") return "OFFER";
  return "";
}

const dupKey = (categoryAr: string, nameAr: string) => `${categoryAr}|||${nameAr}`;

/** يبني قائمة المُرشّحات من مصدر data/menu.ts دون لمس القاعدة. */
export function collectCandidates(): ImportCandidate[] {
  const out: ImportCandidate[] = [];
  for (const c of menu) {
    for (const s of c.sections) {
      const sectionAr = s.title?.ar ?? "";
      for (let idx = 0; idx < s.items.length; idx++) {
        const it = s.items[idx];
        const nameAr = it.name.ar;
        out.push({
          key: `${c.id}|${sectionAr}|${nameAr}|${idx}`,
          categoryAr: c.name.ar,
          categorySlug: c.id,
          sectionAr,
          nameAr,
          descAr: it.desc?.ar ?? "",
          badge: badgeOf(it.badge?.ar),
          ingredientsAr: (it.parts ?? []).map((p) => p.ar),
          prices: it.prices.map((p) => parsePrice(p.value, p.label?.ar)),
          sourcePage: null,
          sourceRef: `${c.name.ar}${sectionAr ? " › " + sectionAr : ""} › ${nameAr}`,
          matchState: "new",
        });
      }
    }
  }
  return out;
}

/** يقارن المُرشّحات بالبيانات الحالية في Neon ويوسم كلًّا بـ«جديد/موجود» + الأسعار الحالية للعرض. */
export async function annotateWithDb(cands: ImportCandidate[]): Promise<ImportCandidate[]> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      nameAr: true,
      section: { select: { titleAr: true, category: { select: { nameAr: true } } } },
      variants: { orderBy: { sortOrder: "asc" }, select: { price: true, maxPrice: true } },
    },
  });
  const map = new Map<string, { id: string; prices: string }>();
  for (const p of products) {
    const key = dupKey(p.section.category.nameAr, p.nameAr);
    const nums = p.variants.map((v) => Number(v.price));
    const maxes = p.variants.map((v) => (v.maxPrice == null ? null : Number(v.maxPrice))).filter((x): x is number => x != null);
    const min = nums.length ? Math.min(...nums) : 0;
    const max = Math.max(...[...nums, ...maxes], 0);
    const prices = nums.length ? (min === max ? String(min) : `${min}–${max}`) : "—";
    if (!map.has(key)) map.set(key, { id: p.id, prices });
  }
  return cands.map((c) => {
    const hit = map.get(dupKey(c.categoryAr, c.nameAr));
    return hit ? { ...c, matchState: "existing" as const, existingId: hit.id, existingPrices: hit.prices } : c;
  });
}

/** مجموعة مفاتيح التكرار الحالية، ليُعيد الواجهة حساب «موجود/جديد» فوريًا أثناء تعديل المُراجع. */
export async function existingKeys(): Promise<string[]> {
  const products = await prisma.product.findMany({
    select: { nameAr: true, section: { select: { category: { select: { nameAr: true } } } } },
  });
  return [...new Set(products.map((p) => dupKey(p.section.category.nameAr, p.nameAr)))];
}
