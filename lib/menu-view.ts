import { menu } from '@/data/menu';
import type { Locale } from './i18n';
import { normalize } from './search';

export type VPrice = { value: number | string; label?: string };
export type VItem = {
  name: string;
  desc?: string;
  parts?: string[];
  badge?: string;
  prices: VPrice[];
  /** normalized text in BOTH languages, used by the search box */
  q: string;
};
export type VSection = { title?: string; items: VItem[] };
export type VCategory = {
  id: string;
  icon: string;
  group: 'food' | 'drinks';
  layout: 'trays' | 'list';
  name: string;
  sections: VSection[];
};

/** Picks one language on the server so the client only receives the strings it will show. */
export function localizeMenu(locale: Locale): VCategory[] {
  return menu.map((c) => ({
    id: c.id,
    icon: c.icon,
    group: c.group,
    layout: c.layout,
    name: c.name[locale],
    sections: c.sections.map((s) => ({
      title: s.title?.[locale],
      items: s.items.map((i) => ({
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
    })),
  }));
}
