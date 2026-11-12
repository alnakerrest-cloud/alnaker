import type { Locale } from './i18n';

export type OfferType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'SPECIAL_PRICE' | 'BUNDLE' | 'BUY_X_GET_Y';

export type VOffer = {
  id: string;
  title: string;
  titleAr: string;
  titleEn?: string | null;
  desc?: string | null;
  descAr?: string | null;
  descEn?: string | null;
  offerType: OfferType;
  discountValue?: number | null;
  promoPrice?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
  minOrderAmount?: number | null;
  minQuantity?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  sortOrder: number;
  imageUrl?: string | null;
  badge: string;
  badgeAr: string;
  badgeEn: string;
  productIds: string[];
  categoryIds: string[];
  locationIds: string[]; // targetLocationIds (references Branch.id)
  primaryProductId?: string;
  primaryProductName?: string;
  originalPrice?: number;
  discountedPrice?: number;
  savingsText?: string;
};

export type PricingResult = {
  appliedOffer?: {
    id: string;
    title: string;
    badge: string;
    offerType: OfferType;
    discountPerUnit: number;
    totalDiscount: number;
  };
  originalUnitPrice: number;
  discountedUnitPrice: number;
  discountPerUnit: number;
  totalOriginal: number;
  totalDiscount: number;
  finalLineTotal: number;
};

/**
 * Authoritative client & server pricing engine calculation for a product line item.
 * Evaluates candidate offers, validates branch eligibility and min quantities,
 * and picks the best discount without unapproved double-stacking.
 */
export function calculateOfferDiscount(params: {
  productId: string;
  categoryId?: string;
  unitPrice: number;
  quantity: number;
  branchId?: string | null;
  activeOffers: VOffer[];
  locale?: Locale;
}): PricingResult {
  const { productId, categoryId, unitPrice, quantity, branchId, activeOffers, locale = 'ar' } = params;
  const totalOriginal = Math.round(unitPrice * quantity * 100) / 100;

  if (!activeOffers || activeOffers.length === 0 || unitPrice <= 0 || quantity <= 0) {
    return {
      originalUnitPrice: unitPrice,
      discountedUnitPrice: unitPrice,
      discountPerUnit: 0,
      totalOriginal,
      totalDiscount: 0,
      finalLineTotal: totalOriginal,
    };
  }

  // 1. Filter candidate offers applicable to this item and selected branch
  const candidates = activeOffers.filter((o) => {
    if (!o.isActive) return false;

    // Check branch / location target
    if (o.locationIds && o.locationIds.length > 0) {
      if (!branchId || !o.locationIds.includes(branchId)) {
        return false;
      }
    }

    // Check minimum quantity requirement
    if (o.minQuantity && quantity < o.minQuantity) {
      return false;
    }

    // Check product / category target
    const hasProductTargets = o.productIds && o.productIds.length > 0;
    const hasCategoryTargets = o.categoryIds && o.categoryIds.length > 0;

    if (!hasProductTargets && !hasCategoryTargets) {
      // Universal storewide offer
      return true;
    }

    if (hasProductTargets && o.productIds.includes(productId)) {
      return true;
    }

    if (hasCategoryTargets && categoryId && o.categoryIds.includes(categoryId)) {
      return true;
    }

    return false;
  });

  if (candidates.length === 0) {
    return {
      originalUnitPrice: unitPrice,
      discountedUnitPrice: unitPrice,
      discountPerUnit: 0,
      totalOriginal,
      totalDiscount: 0,
      finalLineTotal: totalOriginal,
    };
  }

  // 2. Calculate savings for each candidate and choose best (or highest priority sortOrder)
  let bestOffer: VOffer | null = null;
  let bestDiscountPerUnit = 0;
  let bestTotalDiscount = 0;

  for (const offer of candidates) {
    let discPerUnit = 0;
    let totDisc = 0;

    if (offer.offerType === 'PERCENTAGE' && offer.discountValue != null) {
      const pct = Math.min(100, Math.max(0, offer.discountValue));
      discPerUnit = Math.round((unitPrice * (pct / 100)) * 100) / 100;
      totDisc = Math.round(discPerUnit * quantity * 100) / 100;
    } else if (offer.offerType === 'FIXED_AMOUNT' && offer.discountValue != null) {
      discPerUnit = Math.min(unitPrice, offer.discountValue);
      totDisc = Math.round(discPerUnit * quantity * 100) / 100;
    } else if (offer.offerType === 'SPECIAL_PRICE' && offer.promoPrice != null) {
      if (offer.promoPrice < unitPrice) {
        discPerUnit = Math.round((unitPrice - offer.promoPrice) * 100) / 100;
        totDisc = Math.round(discPerUnit * quantity * 100) / 100;
      }
    } else if (offer.offerType === 'BUY_X_GET_Y') {
      const buyX = offer.buyQty ?? 1;
      const getY = offer.getQty ?? 1;
      const groupSize = buyX + getY;
      if (groupSize > 0 && quantity >= groupSize) {
        const freeItems = Math.floor(quantity / groupSize) * getY;
        totDisc = Math.round(freeItems * unitPrice * 100) / 100;
        discPerUnit = Math.round((totDisc / quantity) * 100) / 100;
      }
    }

    if (totDisc > bestTotalDiscount) {
      bestTotalDiscount = totDisc;
      bestDiscountPerUnit = discPerUnit;
      bestOffer = offer;
    }
  }

  if (!bestOffer || bestTotalDiscount <= 0) {
    return {
      originalUnitPrice: unitPrice,
      discountedUnitPrice: unitPrice,
      discountPerUnit: 0,
      totalOriginal,
      totalDiscount: 0,
      finalLineTotal: totalOriginal,
    };
  }

  const discountedUnitPrice = Math.max(0, Math.round((unitPrice - bestDiscountPerUnit) * 100) / 100);
  const finalLineTotal = Math.max(0, Math.round((totalOriginal - bestTotalDiscount) * 100) / 100);

  return {
    appliedOffer: {
      id: bestOffer.id,
      title: locale === 'en' && bestOffer.titleEn ? bestOffer.titleEn : bestOffer.titleAr,
      badge: locale === 'en' && bestOffer.badgeEn ? bestOffer.badgeEn : bestOffer.badgeAr,
      offerType: bestOffer.offerType,
      discountPerUnit: bestDiscountPerUnit,
      totalDiscount: bestTotalDiscount,
    },
    originalUnitPrice: unitPrice,
    discountedUnitPrice,
    discountPerUnit: bestDiscountPerUnit,
    totalOriginal,
    totalDiscount: bestTotalDiscount,
    finalLineTotal,
  };
}
