'use client';

import React from 'react';
import { useCart } from './CartContext';
import { ui, type Locale } from '@/lib/i18n';
import { CartIcon } from './Icons';

export default function FloatingCartBar({
  locale,
  currency,
}: {
  locale: Locale;
  currency: string;
}) {
  const { totalQuantity, total, openCart, isCartOpen, hasHydrated } = useCart();
  const t = ui[locale];

  if (!hasHydrated || totalQuantity === 0 || isCartOpen) {
    return null;
  }

  const itemsLabel = totalQuantity === 1 ? t.itemsSingular : t.itemsPlural;

  return (
    <aside className="floating-cart-wrapper" aria-label={t.cartTitle}>
      <div className="floating-cart-bar">
        <button
          type="button"
          className="floating-cart-btn"
          onClick={openCart}
          aria-label={`${t.viewOrder}: ${totalQuantity} ${itemsLabel}, ${total} ${currency}`}
        >
          <div className="floating-cart-start">
            <div className="floating-cart-icon-wrap">
              <CartIcon width={22} height={22} />
              <span className="floating-cart-badge" aria-hidden="true">
                {totalQuantity}
              </span>
            </div>
            <div className="floating-cart-info">
              <span className="floating-cart-count">
                {totalQuantity} {itemsLabel}
              </span>
              <span className="floating-cart-title">{t.viewOrder}</span>
            </div>
          </div>

          <div className="floating-cart-end">
            <span className="floating-cart-total">
              <b>{total}</b> <i>{currency}</i>
            </span>
            <span className="floating-cart-cta" aria-hidden="true">
              {locale === 'ar' ? '←' : '→'}
            </span>
          </div>
        </button>
      </div>
    </aside>
  );
}

