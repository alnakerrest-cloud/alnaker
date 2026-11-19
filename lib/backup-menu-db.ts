// Local Backup Data Adapter for Naqer Menu
// Reads the authoritative verified backup (backups/backup-naqer-verified.json)
// and maps all 151 original products and 18 categories to the exact VCategory[]
// and SiteData shapes required by the public site UI without database dependency.

import fs from "node:fs";
import path from "node:path";
import { menu, type Category as MenuCategory } from "@/data/menu";
import { normalize } from "@/lib/search";
import type { Locale } from "@/lib/i18n";
import { categoryKind, type VCategory, type VItem, type VPrice, type VSection } from "@/lib/menu-view";
import type { SiteData, VBranch } from "@/lib/site-db";
import { mapsUrl } from "@/lib/site";
import { getLocalDbEngine } from "./local-db-engine";

let cachedInventory: any = null;

function loadBackupData() {
  const engine = getLocalDbEngine();
  const tables = engine.getTables();
  if (!cachedInventory) {
    const invPath = path.join(process.cwd(), "product-inventory-data.json");
    if (fs.existsSync(invPath)) {
      cachedInventory = JSON.parse(fs.readFileSync(invPath, "utf8"));
    } else {
      cachedInventory = [];
    }
  }
  return { backup: { tables, timestamp: "naqer-unified" }, inventory: cachedInventory };
}

type ItemEn = {
  name?: string;
  desc?: string;
  parts?: string[];
  badge?: string;
  labelEnByAr: Record<string, string>;
};

function buildEnIndex() {
  const catNameEn = new Map<string, string>();
  const sectionTitleEn = new Map<string, string>();
  const itemEn = new Map<string, ItemEn>();

  for (const c of menu as MenuCategory[]) {
    catNameEn.set(c.id, c.name.en);
    for (const s of c.sections) {
      if (s.title) sectionTitleEn.set(`${c.id}|||${s.title.ar}`, s.title.en);
      for (const it of s.items) {
        const labelEnByAr: Record<string, string> = {};
        for (const p of it.prices) if (p.label) labelEnByAr[p.label.ar] = p.label.en;
        itemEn.set(`${c.id}|||${it.name.ar}`, {
          name: it.name.en,
          desc: it.desc?.en,
          parts: it.parts?.map((p) => p.en),
          badge: it.badge?.en,
          labelEnByAr,
        });
      }
    }
  }
  return { catNameEn, sectionTitleEn, itemEn };
}

const BADGE_TEXT: Record<string, { ar: string; en: string }> = {
  SIGNATURE: { ar: "مميز", en: "Signature" },
  OFFER: { ar: "عرض", en: "Offer" },
};

function priceValue(price: number, maxPrice: number | null): number | string {
  if (maxPrice != null && maxPrice > price) return `${price} – ${maxPrice}`;
  return price;
}

export function getBackupMenuForLocale(locale: Locale): VCategory[] {
  const { backup, inventory } = loadBackupData();
  const en = buildEnIndex();

  const invById = new Map<string, any>(inventory.map((i: any) => [i.id, i]));
  const invByName = new Map<string, any>(inventory.map((i: any) => [i.nameAr, i]));

  // Index sections by categoryId
  const sectionsByCat = new Map<string, any[]>();
  for (const s of backup.tables.Section) {
    if (!sectionsByCat.has(s.categoryId)) sectionsByCat.set(s.categoryId, []);
    sectionsByCat.get(s.categoryId)!.push(s);
  }
  for (const [_, secs] of sectionsByCat) {
    secs.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Index products by sectionId
  const productsBySec = new Map<string, any[]>();
  for (const p of backup.tables.Product) {
    if (!productsBySec.has(p.sectionId)) productsBySec.set(p.sectionId, []);
    productsBySec.get(p.sectionId)!.push(p);
  }
  for (const [_, prods] of productsBySec) {
    prods.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Index variants by productId
  const variantsByProd = new Map<string, any[]>();
  for (const v of backup.tables.ProductVariant) {
    if (!variantsByProd.has(v.productId)) variantsByProd.set(v.productId, []);
    variantsByProd.get(v.productId)!.push(v);
  }
  for (const [_, vars] of variantsByProd) {
    vars.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Index images by productId
  const imagesByProd = new Map<string, any[]>();
  for (const img of backup.tables.ProductImage) {
    if (!imagesByProd.has(img.productId)) imagesByProd.set(img.productId, []);
    imagesByProd.get(img.productId)!.push(img);
  }
  for (const [_, imgs] of imagesByProd) {
    imgs.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || a.sortOrder - b.sortOrder);
  }

  // Index option groups and assignments
  const optGroups = backup.tables.OptionGroup || [];
  const optItems = backup.tables.OptionItem || [];
  const prodOptGroups = backup.tables.ProductOptionGroup || [];

  const optGroupsById = new Map<string, any>(optGroups.map((g: any) => [g.id, g]));
  const optItemsByGroup = new Map<string, any[]>();
  for (const item of optItems) {
    if (!optItemsByGroup.has(item.groupId)) optItemsByGroup.set(item.groupId, []);
    optItemsByGroup.get(item.groupId)!.push(item);
  }
  for (const [_, items] of optItemsByGroup) {
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  const pogsByProd = new Map<string, any[]>();
  for (const pog of prodOptGroups) {
    if (!pogsByProd.has(pog.productId)) pogsByProd.set(pog.productId, []);
    pogsByProd.get(pog.productId)!.push(pog);
  }
  for (const [_, pogs] of pogsByProd) {
    pogs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  const sortedCats = [...backup.tables.Category].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const out: VCategory[] = [];

  for (const c of sortedCats) {
    if (!c.isVisible) continue;
    const slug = c.slug;
    const catNameEn = en.catNameEn.get(slug);

    const catSections = sectionsByCat.get(c.id) || [];
    const sections: VSection[] = [];

    for (const s of catSections) {
      const prods = productsBySec.get(s.id) || [];
      const items: VItem[] = [];

      for (const p of prods) {
        if (!p.isVisible) continue;

        const inv = invById.get(p.id) || invByName.get(p.nameAr);
        const itemEn = en.itemEn.get(`${slug}|||${p.nameAr}`);

        const nameEn = inv?.nameEn || itemEn?.name;
        const descEn = itemEn?.desc;
        const partsEn = itemEn?.parts;

        const variants = variantsByProd.get(p.id) || [];
        const prices: VPrice[] = variants.map((v: any) => {
          const numPrice = Number(v.price);
          const maxNum = v.maxPrice != null ? Number(v.maxPrice) : null;
          const val = priceValue(numPrice, maxNum);
          const labelAr = v.labelAr ?? undefined;
          const labelEn = labelAr ? itemEn?.labelEnByAr[labelAr] : undefined;
          const label = locale === "en" ? labelEn ?? labelAr : labelAr;
          return { value: val, label };
        });

        // Compute search text in both languages
        const q = normalize(
          [
            p.nameAr,
            nameEn,
            p.descAr,
            descEn,
            c.nameAr,
            catNameEn,
            s.titleAr,
            ...(p.ingredientsAr || []),
            ...(partsEn || []),
          ]
            .filter(Boolean)
            .join(" ")
        );

        const badge = p.badge
          ? locale === "en"
            ? BADGE_TEXT[p.badge]?.en ?? p.badge
            : BADGE_TEXT[p.badge]?.ar ?? p.badge
          : undefined;

        const pImages = imagesByProd.get(p.id) || [];
        const primaryImgUrl = pImages[0]?.url;

        const pogs = pogsByProd.get(p.id) || [];
        const optionGroups = pogs
          .map((pog) => {
            const g = optGroupsById.get(pog.groupId);
            if (!g || !g.isActive) return null;
            const rawOptions = (optItemsByGroup.get(g.id) || []).filter((o: any) => o.isActive);
            if (rawOptions.length === 0) return null;
            return {
              id: g.id,
              name: locale === "en" ? g.nameEn || g.nameAr : g.nameAr,
              isRequired: Boolean(g.isRequired),
              isMulti: Boolean(g.isMulti),
              minSelect: g.minSelect ?? (g.isRequired ? 1 : 0),
              maxSelect: g.maxSelect ?? 1,
              options: rawOptions.map((o: any) => ({
                id: o.id,
                name: locale === "en" ? o.nameEn || o.nameAr : o.nameAr,
                price: Number(o.price || 0),
              })),
            };
          })
          .filter((g): g is any => g !== null);

        const numPrices = prices
          .map((pr) => {
            if (typeof pr.value === "number") return pr.value;
            const n = parseFloat(String(pr.value).split(/[\u2013\-]/)[0]);
            return Number.isNaN(n) ? 0 : n;
          })
          .filter((n) => n > 0);

        items.push({
          id: p.id,
          name: locale === "en" ? nameEn ?? p.nameAr : p.nameAr,
          desc: locale === "en" ? descEn ?? (p.descAr ?? undefined) : p.descAr ?? undefined,
          parts:
            p.ingredientsAr?.length || partsEn?.length
              ? (locale === "en" ? partsEn ?? p.ingredientsAr : p.ingredientsAr)
              : undefined,
          badge,
          prices,
          img: primaryImgUrl,
          q,
          categoryId: c.id,
          isAvailable: p.isAvailable !== false,
          isFeatured: Boolean(p.isFeatured),
          minPrice: numPrices.length > 0 ? Math.min(...numPrices) : 0,
          maxPrice: numPrices.length > 0 ? Math.max(...numPrices) : 0,
          optionGroups: optionGroups.length > 0 ? optionGroups : undefined,
        });
      }

      if (!items.length) continue;
      const titleAr = s.titleAr ?? undefined;
      const titleEn = titleAr ? en.sectionTitleEn.get(`${slug}|||${titleAr}`) : undefined;
      sections.push({ title: locale === "en" ? titleEn ?? titleAr : titleAr, items });
    }

    if (!sections.length) continue;
    const flatItems = sections.flatMap((s) => s.items);

    out.push({
      id: slug,
      icon: c.icon ?? "",
      group: c.group === "DRINKS" ? "drinks" : "food",
      layout: c.layout === "TRAYS" ? "trays" : "list",
      kind: categoryKind(c.layout === "TRAYS" ? "trays" : "list", c.group === "DRINKS" ? "drinks" : "food", flatItems),
      name: locale === "en" ? catNameEn ?? c.nameAr : c.nameAr,
      nameAlt: locale === "en" ? c.nameAr : catNameEn,
      img: c.imageUrl ?? undefined,
      sections,
    });
  }

  return out;
}

export function getBackupSiteData(locale: Locale): SiteData {
  const { backup } = loadBackupData();
  const s = backup.tables.RestaurantSettings?.[0];

  const branches: VBranch[] = (backup.tables.Branch || []).map((b: any) => ({
    id: b.id,
    name: locale === "en" && b.nameEn ? b.nameEn : b.nameAr,
    nameAr: b.nameAr,
    nameEn: b.nameEn || undefined,
    address: locale === "en" && b.addressEn ? b.addressEn : b.addressAr,
    addressAr: b.addressAr,
    addressEn: b.addressEn || undefined,
    city: b.cityAr || "مصر",
    mapUrl: mapsUrl(b.mapQuery || `${b.nameAr} ${b.addressAr}`),
    phoneIntl: b.phoneIntl || s?.phoneIntl || "+201094965222",
    whatsappNumber: b.whatsappNumber || s?.phoneIntl || "+201094965222",
    isOrderable: b.isOrderable ?? true,
    isActive: b.isActive ?? true,
    openingHours: locale === "en" && b.openingHoursEn ? b.openingHoursEn : b.openingHoursAr || undefined,
    openingHoursAr: b.openingHoursAr || undefined,
    openingHoursEn: b.openingHoursEn || undefined,
  }));

  const brand = locale === "en" ? "Naqer Village" : s?.brandNameAr || "قرية الناقر";
  const tagline = locale === "en" ? "Authentic Mandi, Grills & Bedouin Cuisine" : s?.taglineAr || "أصالة المندي والمشويات والمأكولات البدوية";
  const vat = locale === "en" ? "All prices include VAT" : s?.vatNoteAr || "الأسعار الموضحة تشمل ضريبة القيمة المضافة";
  const currency = locale === "en" ? "EGP" : s?.currencyAr || "ج.م";

  return {
    brand,
    tagline,
    vat,
    currency,
    phoneDisplay: s?.phoneDisplay || "01094965222",
    phoneIntl: s?.phoneIntl || "+201094965222",
    logoUrl: s?.logoUrl || undefined,
    deliveryFee: s?.deliveryFee ? Number(s.deliveryFee) : undefined,
    branches,
  };
}

export function getBackupContentVersion(): string {
  const { backup } = loadBackupData();
  let settingsVer = "";
  try {
    const settingsPath = path.join(process.cwd(), "data", "orders", "settings.json");
    if (fs.existsSync(settingsPath)) {
      settingsVer = String(fs.statSync(settingsPath).mtimeMs);
    }
  } catch {}
  return `backup-${backup.timestamp || "naqer-verified"}-${settingsVer}`;
}
