import { test, expect } from '@playwright/test';
import {
  calculateCartTotals,
  parsePriceNum,
  buildCartItemId,
  formatWhatsAppMessage,
  reconcileCart,
  type CartItem,
  type SelectedOption
} from '../lib/cart';
import type { VCategory } from '../lib/menu-view';

test.describe('Financial & Order Calculation Verification', () => {
  test('1. Base price parsing and numeric normalization', () => {
    expect(parsePriceNum(150)).toBe(150);
    expect(parsePriceNum('150')).toBe(150);
    expect(parsePriceNum('60 – 95')).toBe(60);
    expect(parsePriceNum('60 - 95')).toBe(60);
    expect(parsePriceNum('invalid')).toBe(0);
  });

  test('2. Single item price calculation without addons or discounts', () => {
    const item: CartItem = {
      id: 'prod-1__0',
      productId: 'prod-1',
      name: 'كباب مشوي',
      variantIndex: 0,
      baseUnitPrice: 180,
      unitPrice: 180,
      quantity: 2
    };

    const totals = calculateCartTotals([item]);
    expect(totals.totalQuantity).toBe(2);
    expect(totals.distinctCount).toBe(1);
    expect(totals.originalSubtotal).toBe(360);
    expect(totals.totalDiscount).toBe(0);
    expect(totals.subtotal).toBe(360);
    expect(totals.total).toBe(360);
  });

  test('3. Variant and multiple add-ons accumulation', () => {
    const options: SelectedOption[] = [
      { id: 'opt-1', groupId: 'g1', groupName: 'إضافات', name: 'أرز بسمتي', price: 25 },
      { id: 'opt-2', groupId: 'g2', groupName: 'صوصات', name: 'طحينة', price: 10 }
    ];

    const item: CartItem = {
      id: buildCartItemId('prod-2', 1, options),
      productId: 'prod-2',
      name: 'طاجن لحم',
      variantIndex: 1,
      variantLabel: 'كبير',
      baseUnitPrice: 235, // 200 base + 25 + 10
      selectedOptions: options,
      unitPrice: 235,
      quantity: 3
    };

    const totals = calculateCartTotals([item]);
    expect(totals.totalQuantity).toBe(3);
    expect(totals.originalSubtotal).toBe(705); // 235 * 3
    expect(totals.subtotal).toBe(705);
    expect(totals.total).toBe(705);
  });

  test('4. Discount and promotional offer reduction arithmetic', () => {
    const discountedItem: CartItem = {
      id: 'prod-3__0',
      productId: 'prod-3',
      name: 'وجبة عائلية',
      variantIndex: 0,
      baseUnitPrice: 400,
      appliedOffer: {
        id: 'off-1',
        title: 'خصم 50 ج.م',
        badge: 'وفر 50',
        discountPerUnit: 50,
        totalDiscount: 100 // 50 * 2
      },
      unitPrice: 350,
      quantity: 2
    };

    const totals = calculateCartTotals([discountedItem]);
    expect(totals.totalQuantity).toBe(2);
    expect(totals.originalSubtotal).toBe(800);
    expect(totals.totalDiscount).toBe(100);
    expect(totals.subtotal).toBe(700);
    expect(totals.total).toBe(700);
  });

  test('5. Prevent negative price and invalid quantities in cart reconciliation', () => {
    const mockCategories: VCategory[] = [
      {
        id: 'cat-1',
        name: 'طواجن',
        icon: '🍲',
        group: 'food',
        layout: 'list',
        kind: 'meal',
        sections: [
          {
            title: 'طواجن',
            items: [
              {
                id: 'prod-valid',
                name: 'طاجن بامية',
                q: 'طاجن بامية',
                prices: [{ value: 120, label: 'طلب' }],
                optionGroups: [
                  {
                    id: 'grp-1',
                    name: 'إضافات',
                    minSelect: 0,
                    maxSelect: 1,
                    isRequired: false,
                    isMulti: false,
                    options: [{ id: 'opt-salad', name: 'سلطة', price: 15 }]
                  }
                ]
              }
            ]
          }
        ]
      }
    ];

    // Tampered payload with negative quantity, huge quantity, invalid option
    const rawTampered = [
      {
        productId: 'prod-valid',
        variantIndex: 0,
        quantity: -5,
        selectedOptions: [{ id: 'invalid-opt-id', price: 999 }]
      },
      {
        productId: 'prod-valid',
        variantIndex: 999, // out of bounds
        quantity: 150
      }
    ];

    const reconciled = reconcileCart(rawTampered, mockCategories);
    expect(reconciled.length).toBe(2);

    // Negative quantity clamped to 1, unauthorized option stripped
    expect(reconciled[0].quantity).toBe(1);
    expect(reconciled[0].selectedOptions).toBeUndefined();
    expect(reconciled[0].unitPrice).toBe(120);

    // Out of bounds variant fallback to variant 0, quantity capped at 99
    expect(reconciled[1].variantIndex).toBe(0);
    expect(reconciled[1].quantity).toBe(99);
  });

  test('6. Consistency between calculated totals and formatted WhatsApp message', () => {
    const item1: CartItem = {
      id: 'p1__0',
      productId: 'p1',
      name: 'فراخ مشوية',
      variantIndex: 0,
      baseUnitPrice: 220,
      unitPrice: 220,
      quantity: 1
    };

    const item2: CartItem = {
      id: 'p2__0',
      productId: 'p2',
      name: 'كولا',
      variantIndex: 0,
      baseUnitPrice: 25,
      unitPrice: 25,
      quantity: 2
    };

    const totals = calculateCartTotals([item1, item2]);
    expect(totals.subtotal).toBe(270);
    expect(totals.total).toBe(270);

    const message = formatWhatsAppMessage({
      restaurantName: 'قرية النقر',
      branchName: 'فرع دمياط الجديدة',
      items: [item1, item2],
      currency: 'ج.م',
      subtotal: totals.subtotal,
      total: totals.total,
      locale: 'ar'
    });

    expect(message).toContain('قرية النقر');
    expect(message).toContain('فرع دمياط الجديدة');
    expect(message).toContain('فراخ مشوية');
    expect(message).toContain('كولا');
    expect(message).toContain('270 ج.م');
  });
});
