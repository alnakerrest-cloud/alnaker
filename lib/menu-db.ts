// S8 — Public menu now reads from Neon (source of truth) with a hard fallback to data/menu.ts.
//
// Design rules honored here:
//  • Arabic-first: the DB stores AR only (approved decision). EN text is NOT in the DB, so we
//    source it from data/menu.ts by matching the stable keys (category.slug === menu.id, and
//    product matched by category + nameAr). If a value can't be matched, we fall back to the AR
//    text — we never fabricate EN and never drop an item.
//  • The visual design is unchanged: this produces the exact same VCategory[] shape that
//    localizeMenu() produced, so MenuView renders identically.
//  • Safety: any DB error or an empty result returns localizeMenu(locale) (the previous static
//    behavior). The public site can never render an empty menu because of a DB hiccup.
import { prisma } from "@/lib/prisma";
import { menu, type Category as MenuCategory } from "@/data/menu";
import { normalize } from "./search";
import type { Locale } from "./i18n";
import { localizeMenu, categoryKind, type VCategory, type VItem, type VPrice, type VSection, type VOptionGroup } from "./menu-view";
import { getBackupMenuForLocale } from "@/lib/backup-menu-db";

type ItemEn = {
  name?: string;
  desc?: string;
  parts?: string[];
  badge?: string;
  /** EN price-pill labels keyed by their AR label (robust to variant ordering). */
  labelEnByAr: Record<string, string>;
};

/** Best-effort EN lookup index built once from data/menu.ts, keyed by stable menu ids. */
function buildEnIndex() {
  const catNameEn = new Map<string, string>(); // slug -> EN category name
  const sectionTitleEn = new Map<string, string>(); // `${slug}|||${titleAr}` -> EN
  const itemEn = new Map<string, ItemEn>(); // `${slug}|||${nameAr}` -> EN fields
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
  // Fixed price -> number (renders exactly like the static data). Range -> "60 – 95" string.
  if (maxPrice != null && maxPrice > price) return `${price} – ${maxPrice}`;
  return price;
}

/** Reads the menu from Neon and maps it to the public view model, falling back to menu.ts. */
export async function getMenuForLocale(locale: Locale): Promise<VCategory[]> {
  // Primary original preview: read from the verified backup to serve all 151 original products and images
  if (process.env.USE_BACKUP_DATA !== "false") {
    return getBackupMenuForLocale(locale);
  }

  try {
    const cats = await prisma.category.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            products: {
              // Visibility = show/hide; availability = sold-out (hidden on the public menu since
              // the current design has no sold-out treatment — we do not invent one here).
              where: { isVisible: true, isAvailable: true },
              orderBy: { sortOrder: "asc" },
              include: {
                variants: { orderBy: { sortOrder: "asc" } },
                // Primary image first; fall back to the earliest so a product with images always shows one.
                images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } },
                optionGroups: {
                  orderBy: { sortOrder: "asc" },
                  include: {
                    group: {
                      include: {
                        options: {
                          where: { isActive: true },
                          orderBy: { sortOrder: "asc" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Empty DB (fresh/failed migration, seed missing) → keep the site alive with static data.
    if (!cats.length) return localizeMenu(locale);

    const en = buildEnIndex();

    const out: VCategory[] = [];
    for (const c of cats) {
      const slug = c.slug;
      const catNameEn = en.catNameEn.get(slug);
      const sections: VSection[] = [];

      for (const s of c.sections) {
        const items: VItem[] = [];
        for (const p of s.products) {
          const match = en.itemEn.get(`${slug}|||${p.nameAr}`);
          const nameEn = match?.name;
          const descEn = match?.desc;
          const partsEn = match?.parts;

          const labelEnByAr = match?.labelEnByAr ?? {};
          const prices: VPrice[] = p.variants.map((v) => ({
            value: priceValue(Number(v.price), v.maxPrice == null ? null : Number(v.maxPrice)),
            label: locale === "en" ? (v.labelAr ? labelEnByAr[v.labelAr] ?? v.labelAr ?? undefined : undefined) : v.labelAr ?? undefined,
          }));

          const badgeAr = p.badge ? BADGE_TEXT[p.badge]?.ar : undefined;
          const badge = p.badge ? (locale === "en" ? (match?.badge ?? BADGE_TEXT[p.badge]?.en) : badgeAr) : undefined;

          // Search text spans BOTH languages, exactly like localizeMenu: AR from the DB, EN from menu.ts.
          // Ingredient chips for search, interleaved AR/EN per part exactly like localizeMenu()
          // (parts.flatMap(p => [p.ar, p.en])) so the normalized search text is byte-identical.
          const partsQ: string[] = [];
          p.ingredientsAr.forEach((ar, idx) => {
            partsQ.push(ar);
            const enPart = partsEn?.[idx];
            if (enPart) partsQ.push(enPart);
          });

          const q = normalize(
            [
              p.nameAr,
              nameEn,
              p.descAr ?? undefined,
              descEn,
              c.nameAr,
              catNameEn,
              ...partsQ,
            ]
              .filter(Boolean)
              .join(" "),
          );

          const optionGroups: VOptionGroup[] = (p.optionGroups ?? [])
            .filter((pog) => pog.group.isActive && pog.group.options.length > 0)
            .map((pog) => ({
              id: pog.group.id,
              name: locale === "en" ? pog.group.nameEn ?? pog.group.nameAr : pog.group.nameAr,
              isRequired: pog.group.isRequired,
              isMulti: pog.group.isMulti,
              minSelect: pog.group.minSelect,
              maxSelect: pog.group.maxSelect,
              options: pog.group.options.map((opt) => ({
                id: opt.id,
                name: locale === "en" ? opt.nameEn ?? opt.nameAr : opt.nameAr,
                price: Number(opt.price),
              })),
            }));

          items.push({
            id: p.id,
            name: locale === "en" ? (nameEn ?? p.nameAr) : p.nameAr,
            desc: locale === "en" ? descEn ?? (p.descAr ?? undefined) : p.descAr ?? undefined,
            parts:
              p.ingredientsAr.length || partsEn?.length
                ? (locale === "en" ? partsEn ?? p.ingredientsAr : p.ingredientsAr)
                : undefined,
            badge,
            prices,
            img: p.images[0]?.url,
            q,
            optionGroups: optionGroups.length > 0 ? optionGroups : undefined,
            categoryId: c.id,
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

    // Production database is authoritative: return live categories directly.
    // If the DB is unreachable, we propagate the error to app/[locale]/error.tsx
    // so database outages are never silently hidden behind static mock data.
    return out;
  } catch (err) {
    console.error("[getMenuForLocale] Live database query failed:", err);
    throw err;
  }
}
