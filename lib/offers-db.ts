import { prisma } from './prisma';
import type { Locale } from './i18n';
import type { VOffer, OfferType } from './offers';

/**
 * Fetch all active and currently valid offers from Neon DB.
 * Excludes offers that are inactive, not yet started, or expired.
 * Server-only function.
 */
export async function getActiveOffers(locale: Locale): Promise<VOffer[]> {
  try {
    const now = new Date();
    const rows = await prisma.offer.findMany({
      where: {
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        productTargets: {
          include: {
            product: {
              select: {
                id: true,
                nameAr: true,
                variants: { orderBy: { sortOrder: 'asc' }, take: 1, select: { price: true } },
              },
            },
          },
        },
        categoryTargets: { select: { categoryId: true } },
        locationTargets: { select: { targetLocationId: true } },
      },
    });

    return rows.map((r) => {
      const title = locale === 'en' && r.titleEn ? r.titleEn : r.titleAr;
      const desc = locale === 'en' && r.descEn ? r.descEn : r.descAr;
      const badge = locale === 'en' && r.badgeEn ? r.badgeEn : r.badgeAr ?? (locale === 'en' ? 'Offer' : 'عرض');

      const productIds = r.productTargets.map((pt) => pt.productId);
      const categoryIds = r.categoryTargets.map((ct) => ct.categoryId);
      const locationIds = r.locationTargets.map((lt) => lt.targetLocationId);

      const firstTarget = r.productTargets[0]?.product;
      const origPrice = firstTarget?.variants[0]?.price ? Number(firstTarget.variants[0].price) : undefined;
      let discPrice: number | undefined;
      let savingsText: string | undefined;

      if (origPrice != null) {
        if (r.offerType === 'PERCENTAGE' && r.discountValue != null) {
          const val = Number(r.discountValue);
          discPrice = Math.max(0, Math.round((origPrice * (1 - val / 100)) * 100) / 100);
          savingsText = `-${val}%`;
        } else if (r.offerType === 'FIXED_AMOUNT' && r.discountValue != null) {
          const val = Number(r.discountValue);
          discPrice = Math.max(0, origPrice - val);
          savingsText = `-${val} ${locale === 'en' ? 'EGP' : 'ج.م'}`;
        } else if (r.offerType === 'SPECIAL_PRICE' && r.promoPrice != null) {
          discPrice = Number(r.promoPrice);
          const diff = origPrice - discPrice;
          savingsText = diff > 0 ? `-${diff} ${locale === 'en' ? 'EGP' : 'ج.م'}` : undefined;
        } else if (r.offerType === 'BUY_X_GET_Y') {
          savingsText = locale === 'en' ? `Buy ${r.buyQty} Get ${r.getQty}` : `اشترِ ${r.buyQty} واحصل على ${r.getQty}`;
        }
      }

      return {
        id: r.id,
        title,
        titleAr: r.titleAr,
        titleEn: r.titleEn,
        desc,
        descAr: r.descAr,
        descEn: r.descEn,
        offerType: r.offerType as OfferType,
        discountValue: r.discountValue ? Number(r.discountValue) : null,
        promoPrice: r.promoPrice ? Number(r.promoPrice) : null,
        buyQty: r.buyQty,
        getQty: r.getQty,
        minOrderAmount: r.minOrderAmount ? Number(r.minOrderAmount) : null,
        minQuantity: r.minQuantity,
        startDate: r.startDate?.toISOString(),
        endDate: r.endDate?.toISOString(),
        isActive: r.isActive,
        sortOrder: r.sortOrder,
        imageUrl: r.imageUrl,
        badge,
        badgeAr: r.badgeAr ?? 'عرض خاص',
        badgeEn: r.badgeEn ?? 'Special Offer',
        productIds,
        categoryIds,
        locationIds,
        primaryProductId: firstTarget?.id,
        primaryProductName: firstTarget?.nameAr,
        originalPrice: origPrice,
        discountedPrice: discPrice,
        savingsText,
      };
    });
  } catch (err) {
    console.error('Error fetching active offers:', err);
    return [];
  }
}

