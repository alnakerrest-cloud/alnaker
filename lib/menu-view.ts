import { menu } from '@/data/menu';
import type { Locale } from './i18n';
import { normalize } from './search';

export type VPrice = { value: number | string; label?: string };
/** Presentation archetype chosen from real DB fields only (no schema change). */
export type VKind = 'platter' | 'meal' | 'side' | 'drink';

export type VOptionItem = {
  id: string;
  name: string;
  price: number;
};

export type VOptionGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  isMulti: boolean;
  minSelect: number;
  maxSelect: number;
  options: VOptionItem[];
};

export type VItem = {
  id: string;
  name: string;
  desc?: string;
  parts?: string[];
  badge?: string;
  prices: VPrice[];
  /** primary product image (Cloudinary secure URL) — present only when an image exists */
  img?: string;
  /** normalized text in BOTH languages, used by the search box */
  q: string;
  /** Optional customization groups (add-ons, choices) attached to this item */
  optionGroups?: VOptionGroup[];
  /** Parent category ID */
  categoryId?: string;
  /** Availability state */
  isAvailable?: boolean;
  /** Featured / Signature dish flag */
  isFeatured?: boolean;
  /** Cached minimum unit price */
  minPrice?: number;
  /** Cached maximum unit price */
  maxPrice?: number;
  /** Total times ordered in confirmed orders */
  orderCount?: number;
};
export type VSection = { title?: string; items: VItem[] };
export type VCategory = {
  id: string;
  icon: string;
  group: 'food' | 'drinks';
  layout: 'trays' | 'list';
  kind: VKind;
  name: string;
  /** Category name in the *other* language — a subtle caption under the header. */
  nameAlt?: string;
  /** category image (Cloudinary secure URL) — present only when an image exists */
  img?: string;
  sections: VSection[];
};

/** Numeric value of a price pill; ranges like "60 – 95" resolve to their upper bound. */
function priceNum(v: number | string): number {
  if (typeof v === 'number') return v;
  const nums = String(v)
    .split(/[\u2013\-]/)
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !Number.isNaN(n));
  return nums.length ? Math.max(...nums) : 0;
}

/**
 * Maps a category to a card archetype using only authoritative data:
 *  • trays layout  -> large platter card
 *  • drinks group  -> compact drinks card
 *  • food list whose priciest dish is a cheap small plate (<= 60) -> compact side card
 *  • otherwise     -> individual meal card
 */
export function categoryKind(layout: 'trays' | 'list', group: 'food' | 'drinks', items: VItem[]): VKind {
  if (layout === 'trays') return 'platter';
  if (group === 'drinks') return 'drink';
  const max = Math.max(0, ...items.flatMap((it) => it.prices.map((p) => priceNum(p.value))));
  return max <= 60 ? 'side' : 'meal';
}

/** Picks one language on the server so the client only receives the strings it will show. */
export function localizeMenu(locale: Locale): VCategory[] {
  const alt: Locale = locale === 'ar' ? 'en' : 'ar';
  return menu.map((c) => {
    const sections = c.sections.map((s, si) => ({
      title: s.title?.[locale],
      items: s.items.map((i, ii) => ({
        id: `${c.id}-${si}-${ii}`,
        name: i.name[locale],
        desc: i.desc?.[locale],
        parts: i.parts?.map((p) => p[locale]),
        badge: i.badge?.[locale],
        prices: i.prices.map((p) => ({ value: p.value, label: p.label?.[locale] })),
        q: normalize(
          [
            i.name.ar,
            i.name.en,
            i.desc?.ar,
            i.desc?.en,
            c.name.ar,
            c.name.en,
            ...(i.parts?.flatMap((p) => [p.ar, p.en]) ?? []),
          ]
            .filter(Boolean)
            .join(' '),
        ),
      })),
    }));
    return {
      id: c.id,
      icon: c.icon,
      group: c.group,
      layout: c.layout,
      kind: categoryKind(c.layout, c.group, sections.flatMap((s) => s.items)),
      name: c.name[locale],
      nameAlt: c.name[alt],
      sections,
    };
  });
}
