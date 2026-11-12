import type { VCategory, VItem } from './menu-view';
import type { Locale } from './i18n';
import { ui } from './i18n';

export const CART_STORAGE_KEY = 'naqer-menu-cart-v2';

export type SelectedOption = {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  price: number;
};

export type CartOfferDiscount = {
  id: string;
  title: string;
  badge: string;
  discountPerUnit: number;
  totalDiscount: number;
};

export type CartItem = {
  /** Unique composite key: `${productId}__${variantIndex}[__${sortedOptionIds}]` */
  id: string;
  productId: string;
  name: string;
  variantIndex: number;
  variantLabel?: string;
  baseUnitPrice: number;
  selectedOptions?: SelectedOption[];
  appliedOffer?: CartOfferDiscount;
  unitPrice: number;
  quantity: number;
  notes?: string;
  img?: string;
  categoryIcon?: string;
};

/** Helper to generate stable unique composite key for a cart item */
export function buildCartItemId(
  productId: string,
  variantIndex: number,
  options?: SelectedOption[]
): string {
  if (!options || options.length === 0) {
    return `${productId}__${variantIndex}`;
  }
  const sortedOptionIds = [...options]
    .map((o) => o.id)
    .sort()
    .join('-');
  return `${productId}__${variantIndex}__${sortedOptionIds}`;
}

/** Extracts numeric unit price from number or range string (e.g. "60 – 95" -> 60) */
export function parsePriceNum(v: number | string): number {
  if (typeof v === 'number') return v;
  const nums = String(v)
    .split(/[\u2013\-]/)
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !Number.isNaN(n));
  return nums.length ? nums[0] : 0;
}

/** Totals calculation: sum of quantity, distinct items, and monetary sums */
export function calculateCartTotals(items: CartItem[]) {
  const totalQuantity = items.reduce((sum, it) => sum + Math.max(1, it.quantity), 0);
  const distinctCount = items.length;
  const originalSubtotal = items.reduce(
    (sum, it) => sum + Math.max(1, it.quantity) * (it.baseUnitPrice ?? it.unitPrice),
    0
  );
  const totalDiscount = items.reduce(
    (sum, it) =>
      sum +
      (it.appliedOffer?.totalDiscount ??
        Math.max(0, ((it.baseUnitPrice ?? it.unitPrice) - it.unitPrice) * it.quantity)),
    0
  );
  const subtotal = Math.max(0, originalSubtotal - totalDiscount);
  const total = subtotal; // VAT is included in menu prices
  return { totalQuantity, distinctCount, originalSubtotal, totalDiscount, subtotal, total };
}

/** International phone normalization for WhatsApp click-to-chat */
export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 0 ? digits : '201094965222';
}

export type WhatsAppOrderParams = {
  restaurantName: string;
  branchName?: string;
  branchAddress?: string;
  items: CartItem[];
  currency: string;
  subtotal: number;
  total: number;
  vatNote?: string;
  serviceNote?: string;
  customerNotes?: string;
  locale: Locale;
};

/**
 * Generates the clean, beautifully structured WhatsApp order message
 * conforming to strict client & restaurant communication specifications,
 * including branch attribution and add-on details.
 */
export function formatWhatsAppMessage(params: WhatsAppOrderParams): string {
  const {
    restaurantName,
    branchName,
    branchAddress,
    items,
    currency,
    subtotal,
    total,
    vatNote,
    serviceNote,
    customerNotes,
    locale,
  } = params;

  const t = ui[locale];
  const isAr = locale === 'ar';
  const divider = '────────────────────';

  const lines: string[] = [];

  // Header: Restaurant Name & Order Subject
  lines.push(`🍽️ *${restaurantName}*`);
  lines.push(`📋 *${isAr ? 'طلب جديد من المنيو الإلكتروني' : 'New Digital Menu Order'}*`);

  // Selected Branch
  if (branchName) {
    lines.push(`🏢 *${isAr ? 'الفرع المستلم' : 'Selected Branch'}:* ${branchName}`);
    if (branchAddress) {
      lines.push(`📍 *${isAr ? 'عنوان الفرع' : 'Branch Address'}:* ${branchAddress}`);
    }
  }

  lines.push(divider);

  // Selected Products
  items.forEach((item, index) => {
    const itemNum = index + 1;
    const variantSuffix = item.variantLabel ? ` (${item.variantLabel})` : '';
    lines.push(`${itemNum}. *${item.name}*${variantSuffix}`);
    lines.push(`   • ${isAr ? 'الكمية' : 'Quantity'}: ${item.quantity}`);

    if (item.appliedOffer) {
      lines.push(`   • ${isAr ? 'السعر الأصلي' : 'Original Price'}: ${item.baseUnitPrice} ${currency}`);
      lines.push(`   • ${isAr ? 'الخصم' : 'Discount'}: -${item.appliedOffer.discountPerUnit} ${currency} (${item.appliedOffer.title})`);
    }

    // Add-on options breakdown
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      const optsStr = item.selectedOptions
        .map((o) => `${o.name}${o.price > 0 ? ` (+${o.price} ${currency})` : ''}`)
        .join('، ');
      lines.push(`   • ${isAr ? 'الإضافات' : 'Add-ons'}: ${optsStr}`);
    }

    lines.push(`   • ${isAr ? 'السعر النهائي' : 'Final Price'}: ${item.unitPrice} ${currency} (${item.quantity} × ${item.unitPrice} = ${item.quantity * item.unitPrice} ${currency})`);

    // Line-specific notes
    if (item.notes && item.notes.trim()) {
      lines.push(`   📝 ${isAr ? 'ملاحظة' : 'Note'}: ${item.notes.trim()}`);
    }
    if (index < items.length - 1) {
      lines.push('');
    }
  });

  lines.push(divider);

  // Financial Summary
  const totals = calculateCartTotals(items);
  if (totals.totalDiscount > 0) {
    lines.push(`💰 *${isAr ? 'المجموع قبل الخصم' : 'Original Subtotal'}:* ${totals.originalSubtotal} ${currency}`);
    lines.push(`🏷️ *${isAr ? 'إجمالي خصم العروض' : 'Offer Discount'}:* -${totals.totalDiscount} ${currency}`);
  }
  lines.push(`💰 *${t.subtotal}:* ${subtotal} ${currency}`);
  if (vatNote) {
    lines.push(`ℹ️ ${vatNote}`);
  }
  if (serviceNote) {
    lines.push(`ℹ️ ${serviceNote}`);
  }
  lines.push(`🧾 *${t.total}:* ${total} ${currency}`);

  // Customer Notes / Delivery instructions
  if (customerNotes && customerNotes.trim()) {
    lines.push(divider);
    lines.push(`📍 *${isAr ? 'ملاحظات وتفاصيل الاستلام / التوصيل' : 'Customer Notes & Delivery Details'}:*`);
    lines.push(customerNotes.trim());
  }

  lines.push(divider);
  // Thank you closing
  lines.push(`✨ ${t.thankYouMessage}`);

  return lines.join('\n');
}

/** Generates the official WhatsApp click-to-chat URL */
export function buildWhatsAppUrl(phoneIntl: string, message: string): string {
  const normalized = normalizeWhatsAppPhone(phoneIntl);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Reconciles stored cart data against the authoritative current menu.
 * Prevents tampered prices, drops deleted products, validates options, updates images/names.
 */
export function reconcileCart(rawStored: unknown, categories: VCategory[]): CartItem[] {
  if (!Array.isArray(rawStored)) return [];

  // Map of all active items by ID
  const itemMap = new Map<string, { item: VItem; categoryIcon: string }>();
  for (const cat of categories) {
    for (const sec of cat.sections) {
      for (const it of sec.items) {
        itemMap.set(it.id, { item: it, categoryIcon: cat.icon });
      }
    }
  }

  const validItems: CartItem[] = [];

  for (const raw of rawStored) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as Partial<CartItem>;
    const productId = typeof candidate.productId === 'string' ? candidate.productId : '';
    if (!productId) continue;

    const matched = itemMap.get(productId);
    if (!matched) continue;

    const { item, categoryIcon } = matched;

    const variantIndex =
      typeof candidate.variantIndex === 'number' &&
      candidate.variantIndex >= 0 &&
      candidate.variantIndex < item.prices.length
        ? candidate.variantIndex
        : 0;

    const authoritativePriceObj = item.prices[variantIndex] ?? item.prices[0];
    if (!authoritativePriceObj) continue;

    const baseUnitPrice = parsePriceNum(authoritativePriceObj.value);

    // Reconcile selected options against current item.optionGroups
    const validOptions: SelectedOption[] = [];
    if (Array.isArray(candidate.selectedOptions) && item.optionGroups) {
      for (const optCandidate of candidate.selectedOptions) {
        if (!optCandidate || typeof optCandidate !== 'object') continue;
        const optId = String(optCandidate.id ?? '');
        for (const group of item.optionGroups) {
          const matchedOpt = group.options.find((o) => o.id === optId);
          if (matchedOpt) {
            validOptions.push({
              id: matchedOpt.id,
              groupId: group.id,
              groupName: group.name,
              name: matchedOpt.name,
              price: matchedOpt.price,
            });
            break;
          }
        }
      }
    }

    const addonsTotal = validOptions.reduce((acc, o) => acc + o.price, 0);
    const rawUnitPrice = baseUnitPrice + addonsTotal;
    const appliedOffer =
      candidate.appliedOffer && typeof candidate.appliedOffer === 'object'
        ? candidate.appliedOffer
        : undefined;
    const discountPerUnit = appliedOffer?.discountPerUnit ?? 0;
    const unitPrice = Math.max(0, rawUnitPrice - discountPerUnit);

    const quantity =
      typeof candidate.quantity === 'number' && candidate.quantity > 0
        ? Math.min(Math.floor(candidate.quantity), 99)
        : 1;

    const id = buildCartItemId(item.id, variantIndex, validOptions);

    validItems.push({
      id,
      productId: item.id,
      name: item.name,
      variantIndex,
      variantLabel: authoritativePriceObj.label,
      baseUnitPrice: rawUnitPrice,
      selectedOptions: validOptions.length > 0 ? validOptions : undefined,
      appliedOffer,
      unitPrice,
      quantity,
      notes: typeof candidate.notes === 'string' ? candidate.notes.slice(0, 300) : undefined,
      img: item.img,
      categoryIcon,
    });
  }

  return validItems;
}
