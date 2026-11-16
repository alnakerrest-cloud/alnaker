// S9 — Public chrome (hero / footer / JSON-LD / VAT & service notice / branches / phone) now reads
// from Neon, with the exact same safety net proven in S8: EN text is not stored in the Arabic-first
// DB, so it stays sourced from the curated static data (lib/site.ts + lib/i18n ui), and any DB error
// or empty result falls back to the previous static behavior. No visual design is changed — only the
// data source.
import { prisma } from "@/lib/prisma";
import { branches as staticBranches, mapsUrl, PHONE_DISPLAY, PHONE_INTL } from "@/lib/site";
import { ui, type Locale } from "@/lib/i18n";

export type VBranch = {
  id: string;
  name: string;
  nameAr: string;
  nameEn?: string;
  address: string;
  addressAr: string;
  addressEn?: string;
  city: string;
  mapUrl: string;
  phoneIntl?: string;
  whatsappNumber?: string;
  isOrderable: boolean;
  openingHours?: string;
  openingHoursAr?: string;
  openingHoursEn?: string;
};
export type SiteData = {
  brand: string;
  tagline: string;
  vat: string;
  currency: string;
  phoneDisplay: string;
  phoneIntl: string;
  logoUrl?: string;
  deliveryFee?: number;
  branches: VBranch[];
};

/** Match a DB branch (Arabic name) to its curated English twin from lib/site.ts. */
const staticEnByAr = new Map(staticBranches.map((b) => [b.name.ar, b]));

function staticBranchesView(locale: Locale): VBranch[] {
  return staticBranches.map((b) => ({
    id: b.id,
    name: b.name[locale],
    nameAr: b.name.ar,
    nameEn: b.name.en,
    address: b.address[locale],
    addressAr: b.address.ar,
    addressEn: b.address.en,
    city: b.city[locale],
    mapUrl: mapsUrl(b.mapQuery),
    phoneIntl: PHONE_INTL,
    whatsappNumber: PHONE_INTL,
    isOrderable: true,
  }));
}

/** The previous static behavior — used both as the fallback and as the equivalence baseline. */
export function getStaticSiteData(locale: Locale): SiteData {
  const t = ui[locale];
  return {
    brand: t.brand,
    tagline: t.tagline,
    vat: t.vat,
    currency: t.currency,
    phoneDisplay: PHONE_DISPLAY,
    phoneIntl: PHONE_INTL,
    deliveryFee: undefined,
    branches: staticBranchesView(locale),
  };
}

export async function getSiteData(locale: Locale): Promise<SiteData> {
  try {
    const [s, bs] = await Promise.all([
      prisma.restaurantSettings.findUnique({ where: { id: "default" } }),
      prisma.branch.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    const t = ui[locale];

    const branches: VBranch[] = bs.map((b) => {
      const st = staticEnByAr.get(b.nameAr);
      const mq = b.mapQuery ?? st?.mapQuery;
      const nameEn = b.nameEn ?? st?.name.en;
      const addressEn = b.addressEn ?? st?.address.en;
      const name = locale === "en" ? nameEn ?? b.nameAr : b.nameAr;
      const address = locale === "en" ? addressEn ?? b.addressAr : b.addressAr;
      const openingHours = locale === "en" ? b.openingHoursEn ?? b.openingHoursAr ?? undefined : b.openingHoursAr ?? undefined;

      return {
        id: b.id,
        name,
        nameAr: b.nameAr,
        nameEn: nameEn ?? undefined,
        address,
        addressAr: b.addressAr,
        addressEn: addressEn ?? undefined,
        city: locale === "en" ? st?.city.en ?? b.cityAr : b.cityAr,
        mapUrl: mapsUrl(mq ?? `${b.nameAr} ${b.cityAr}`),
        phoneIntl: b.phoneIntl ?? s?.phoneIntl ?? PHONE_INTL,
        whatsappNumber: b.whatsappNumber ?? b.phoneIntl ?? undefined,
        isOrderable: b.isOrderable,
        openingHours,
        openingHoursAr: b.openingHoursAr ?? undefined,
        openingHoursEn: b.openingHoursEn ?? undefined,
      };
    });

    return {
      brand: locale === "en" ? t.brand : s?.brandNameAr ?? t.brand,
      tagline: locale === "en" ? t.tagline : s?.taglineAr ?? t.tagline,
      vat: locale === "en" ? t.vat : s?.vatNoteAr ?? t.vat,
      currency: locale === "en" ? t.currency : s?.currencyAr ?? t.currency,
      phoneDisplay: s?.phoneDisplay ?? PHONE_DISPLAY,
      phoneIntl: s?.phoneIntl ?? PHONE_INTL,
      logoUrl: s?.logoUrl ?? undefined,
      deliveryFee: s?.deliveryFee ? Number(s.deliveryFee) : undefined,
      branches: branches.length ? branches : staticBranchesView(locale),
    };
  } catch {
    return getStaticSiteData(locale);
  }
}
