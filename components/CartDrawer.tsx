'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useCart } from './CartContext';
import { ui, type Locale } from '@/lib/i18n';
import {
  CloseIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  WhatsAppIcon,
  CartIcon,
} from './Icons';
import { calculateCartTotals } from '@/lib/cart';
import CheckoutModal from './CheckoutModal';

export default function CartDrawer({
  locale,
  currency,
  restaurantName,
  phoneIntl,
  vatNote,
  deliveryFee,
}: {
  locale: Locale;
  currency: string;
  restaurantName: string;
  phoneIntl: string;
  vatNote?: string;
  deliveryFee?: number;
}) {
  const {
    cart,
    customerNotes,
    setCustomerNotes,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    selectedBranch,
    updateQuantity,
    removeItem,
    clearCart,
    isCartOpen,
    closeCart,
    editCartItem,
    subtotal,
    total,
    totalQuantity,
    getItemValidation,
    incompleteItems,
    hasIncompleteItems,
    getWhatsAppUrl,
  } = useCart();

  const [showCheckout, setShowCheckout] = useState(false);
  const [menuModeData, setMenuModeData] = useState<{
    mode: string;
    closureMessageAr: string;
    closureMessageEn: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/menu-mode')
      .then((res) => res.json())
      .then((data) => setMenuModeData(data))
      .catch(() => {});
  }, []);

  const t = ui[locale];
  const [confirmClear, setConfirmClear] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Background scroll lock & Escape key
  useEffect(() => {
    if (!isCartOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [isCartOpen, closeCart]);

  if (!isCartOpen && !showCheckout) return null;

  const isBranchOrderable = selectedBranch ? selectedBranch.isOrderable : true;
  const hasBranchWhatsApp = Boolean(
    selectedBranch?.whatsappNumber?.trim() || selectedBranch?.phoneIntl?.trim() || phoneIntl
  );

  const whatsAppUrl = getWhatsAppUrl(phoneIntl, restaurantName, vatNote);
  const itemsLabel = totalQuantity === 1 ? t.itemsSingular : t.itemsPlural;

  const handleEditItem = (itemId: string) => {
    closeCart();
    editCartItem(itemId);
  };

  return (
    <div
      className="cart-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCart();
      }}
      role="presentation"
    >
      <div
        className="cart-panel"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <div className="sheet-handle" aria-hidden="true" />

        {/* Drawer Header */}
        <div className="cart-header">
          <div className="cart-header-title">
            <CartIcon width={22} height={22} />
            <h2 id="cart-drawer-title">{t.cartTitle}</h2>
            {totalQuantity > 0 && (
              <span className="cart-header-badge">
                {totalQuantity} {itemsLabel}
              </span>
            )}
          </div>
          <button
            type="button"
            className="cart-close"
            onClick={closeCart}
            aria-label={t.close}
            ref={closeBtnRef}
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon" aria-hidden="true">
                🛒
              </div>
              <h3>{t.cartEmptyTitle}</h3>
              <p>{t.cartEmptyDesc}</p>
              <button
                type="button"
                className="btn-browse-menu"
                onClick={closeCart}
              >
                {t.browseMenu}
              </button>
            </div>
          ) : (
            <>
              {/* Branch Selection Section */}
              {branches.length > 0 && (
                <div className="cart-branch-selector">
                  <div className="branch-selector-header">
                    <span className="branch-selector-title">{t.selectBranch}:</span>
                  </div>
                  <div className="branch-options-grid" role="radiogroup" aria-label={t.selectBranch}>
                    {branches.map((b) => {
                      const isSelected = b.id === selectedBranchId;
                      const hours = locale === 'en' ? b.openingHoursEn || b.openingHours : b.openingHoursAr || b.openingHours;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`branch-option-card${isSelected ? ' selected' : ''}${!b.isOrderable ? ' unavailable' : ''}`}
                          onClick={() => setSelectedBranchId(b.id)}
                        >
                          <div className="branch-card-top">
                            <span className="branch-card-indicator" aria-hidden="true">
                              {isSelected ? '●' : '○'}
                            </span>
                            <strong className="branch-card-name">{b.name}</strong>
                            {!b.isOrderable && (
                              <span className="branch-card-closed-badge">مغلق للطلبات</span>
                            )}
                          </div>
                          <span className="branch-card-address">{b.address}</span>
                          {hours && (
                            <span className="branch-card-hours">⏰ {hours}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!isBranchOrderable && (
                    <div className="branch-alert-banner warning">
                      ⚠️ {t.branchUnavailable}
                    </div>
                  )}

                  {!hasBranchWhatsApp && (
                    <div className="branch-alert-banner warning">
                      ⚠️ {t.branchNoWhatsApp}
                    </div>
                  )}
                </div>
              )}

              {/* Item List */}
              <ul className="cart-items" aria-label={t.cartTitle}>
                {cart.map((item) => {
                  const lineTotal = item.unitPrice * item.quantity;
                  const validation = getItemValidation(item);
                  const isIncomplete = validation.status === 'INCOMPLETE';
                  return (
                    <li key={item.id} className={`cart-item${isIncomplete ? ' cart-item--incomplete' : ''}`}>
                      <div className="cart-item-media">
                        {item.img ? (
                          <Image
                            src={item.img}
                            alt={item.name}
                            width={54}
                            height={54}
                            sizes="54px"
                            style={{ objectFit: 'cover', borderRadius: 10 }}
                          />
                        ) : (
                          <div className="cart-item-ph">
                            <span>{item.categoryIcon || '🍲'}</span>
                          </div>
                        )}
                      </div>

                      <div className="cart-item-info">
                        <div className="cart-item-top">
                          <h4 className="cart-item-name">{item.name}</h4>
                          <div className="cart-item-top-actions">
                            <button
                              type="button"
                              className="cart-item-edit-btn"
                              onClick={() => handleEditItem(item.id)}
                              aria-label={`${t.editItem}: ${item.name}`}
                              title={t.editItem}
                            >
                              ✏️ <small>{t.editItem}</small>
                            </button>
                            <button
                              type="button"
                              className="cart-item-remove"
                              onClick={() => removeItem(item.id)}
                              aria-label={`${t.removeItem}: ${item.name}`}
                            >
                              <TrashIcon width={16} height={16} />
                            </button>
                          </div>
                        </div>

                        {item.variantLabel && (
                          <span className="cart-item-variant">
                            {item.variantLabel}
                          </span>
                        )}

                        {/* Incomplete Choices Warning Banner */}
                        {isIncomplete && (
                          <div className="cart-item-incomplete-box">
                            <div className="cart-item-incomplete-head">
                              <span className="incomplete-alert-badge">
                                ⚠️ {locale === 'ar' ? 'يحتاج إلى استكمال الاختيارات' : 'Incomplete Choices'}
                              </span>
                              <button
                                type="button"
                                className="btn-fix-item-choices"
                                onClick={() => handleEditItem(item.id)}
                              >
                                {locale === 'ar' ? 'إكمال الاختيارات' : 'Complete Choices'} ➔
                              </button>
                            </div>
                            <ul className="incomplete-missing-groups-list">
                              {validation.missingGroups.map((g) => (
                                <li key={g.groupId}>
                                  • {locale === 'ar' ? `اختر: ${g.groupName}` : `Select: ${g.groupName}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {item.appliedOffer && (
                          <div className="cart-item-offer-box">
                            <div className="cart-item-offer-header">
                              <span className="cart-item-offer-badge">
                                🏷️ {item.appliedOffer.title}
                              </span>
                              <span className="cart-item-offer-tag">
                                {item.appliedOffer.badge}
                              </span>
                            </div>
                            <div className="cart-item-offer-breakdown">
                              <div className="offer-breakdown-row">
                                <span>{t.originalPrice}:</span>
                                <s>{item.baseUnitPrice} {currency}</s>
                              </div>
                              <div className="offer-breakdown-row offer-breakdown-row--saved">
                                <span>{t.discountAmount}:</span>
                                <strong>-{item.appliedOffer.discountPerUnit * item.quantity} {currency}</strong>
                              </div>
                              <div className="offer-breakdown-row offer-breakdown-row--final">
                                <span>{t.finalPrice}:</span>
                                <b>{item.unitPrice} {currency}</b>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Selected Add-ons breakdown */}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="cart-item-addons">
                            {item.selectedOptions.map((opt) => (
                              <span key={opt.id} className="cart-addon-pill">
                                ➕ {opt.name}
                                {opt.price > 0 && <small> (+{opt.price} {currency})</small>}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Excluded ingredients */}
                        {item.removedIngredients && item.removedIngredients.length > 0 && (
                          <div className="cart-item-removed-ingredients" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {item.removedIngredients.map((ing, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: '11px',
                                  color: '#dc2626',
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                }}
                              >
                                🚫 {locale === 'ar' ? `بدون ${ing}` : `Without ${ing}`}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.notes && (
                          <p className="cart-item-note">
                            <span>📝</span> {item.notes}
                          </p>
                        )}

                        <div className="cart-item-bottom">
                          <div className="qty-picker qty-picker--small">
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() => updateQuantity(item.id, -1)}
                              aria-label={t.decreaseQty}
                            >
                              <MinusIcon width={14} height={14} />
                            </button>
                            <span className="qty-value" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() => updateQuantity(item.id, 1)}
                              aria-label={t.increaseQty}
                            >
                              <PlusIcon width={14} height={14} />
                            </button>
                          </div>

                          <div className="cart-item-price">
                            <small>
                              {item.quantity} × {item.unitPrice}
                            </small>
                            <b>{lineTotal}</b> <i>{currency}</i>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Clear Cart Action with Confirmation */}
              <div className="cart-clear-wrap">
                {confirmClear ? (
                  <div className="cart-clear-confirm">
                    <span>{t.clearCartConfirm}</span>
                    <div className="cart-clear-actions">
                      <button
                        type="button"
                        className="btn-clear-yes"
                        onClick={() => {
                          clearCart();
                          setConfirmClear(false);
                        }}
                      >
                        {t.confirm}
                      </button>
                      <button
                        type="button"
                        className="btn-clear-no"
                        onClick={() => setConfirmClear(false)}
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-clear-cart"
                    onClick={() => setConfirmClear(true)}
                  >
                    <TrashIcon width={14} height={14} />
                    <span>{t.clearCart}</span>
                  </button>
                )}
              </div>

              {/* Customer Notes for General Order */}
              <div className="cart-notes-wrap">
                <label htmlFor="order-general-notes" className="cart-notes-label">
                  {t.orderNotesLabel}
                </label>
                <textarea
                  id="order-general-notes"
                  className="cart-notes-input"
                  rows={2}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder={t.orderNotesPlaceholder}
                  maxLength={500}
                />
              </div>

              {/* Order Summary */}
              {(() => {
                const totals = calculateCartTotals(cart);
                return (
                  <div className="cart-summary">
                    {totals.totalDiscount > 0 && (
                      <>
                        <div className="cart-summary-row original">
                          <span>{locale === 'en' ? 'Original Subtotal' : 'المجموع قبل الخصم'}</span>
                          <span className="cart-price-strike">
                            {totals.originalSubtotal} {currency}
                          </span>
                        </div>
                        <div className="cart-summary-row discount cart-summary-discount">
                          <span>🏷️ {locale === 'en' ? 'Offer Discount' : 'خصم العروض'}</span>
                          <span className="cart-price-discount">
                            -{totals.totalDiscount} {currency}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="cart-summary-row">
                      <span>{t.subtotal}</span>
                      <span>
                        <b>{totals.subtotal}</b> {currency}
                      </span>
                    </div>

                    {vatNote && (
                      <p className="cart-summary-note">
                        <span>◆</span> {vatNote}
                      </p>
                    )}

                    <div className="cart-summary-total">
                      <span>{t.total}</span>
                      <span className="total-amount">
                        <b>{totals.total}</b> {currency}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Drawer Footer with WhatsApp Action */}
        {cart.length > 0 && (
          <div className="cart-footer">
            {menuModeData?.mode === 'VIEW_ONLY' || menuModeData?.mode === 'TEMPORARILY_CLOSED' ? (
              <div
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#92400e',
                  fontSize: '13px',
                  textAlign: 'center',
                  fontWeight: 600,
                  lineHeight: '1.4',
                }}
              >
                ⚠️ {locale === 'en' ? (menuModeData?.closureMessageEn || 'Menu is currently in view-only mode.') : (menuModeData?.closureMessageAr || 'المنيو حالياً للعرض فقط ولا يستقبل طلبات جديدة.')}
              </div>
            ) : hasIncompleteItems ? (
              <>
                <div className="cart-incomplete-summary-banner">
                  <div className="cart-incomplete-banner-title">
                    ⚠️ {locale === 'ar' ? 'يوجد منتجات تحتاج إلى اختيار بعض الخيارات قبل إتمام الطلب:' : 'Some items require choices before checkout:'}
                  </div>
                  <ul className="cart-incomplete-banner-list">
                    {incompleteItems.map(({ item, validation }) => (
                      <li
                        key={item.id}
                        onClick={() => handleEditItem(item.id)}
                        className="cart-incomplete-banner-item"
                        title={locale === 'ar' ? 'انقر لإكمال الاختيارات' : 'Click to complete choices'}
                      >
                        <div className="incomplete-item-row">
                          <span className="incomplete-item-name">{item.name}</span>
                          <span className="fix-choices-pill">{locale === 'ar' ? 'إكمال الاختيارات' : 'Edit Choices'} ➔</span>
                        </div>
                        <span className="incomplete-item-needed">
                          {locale === 'ar' ? validation.errorSummaryAr : validation.errorSummaryEn}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn-checkout btn-checkout--blocked"
                  onClick={() => {
                    if (incompleteItems.length > 0) {
                      handleEditItem(incompleteItems[0].item.id);
                    }
                  }}
                  title={locale === 'ar' ? 'انقر لإكمال اختيارات المنتجات الناقصة' : 'Click to complete missing item choices'}
                >
                  <span>⚠️ {locale === 'ar' ? 'أكمل اختيارات المنتجات أولاً' : 'Complete Choices First'}</span>
                  <span className="btn-checkout-total">
                    <b>{total}</b> {currency}
                  </span>
                </button>
                <p className="whatsapp-notice whatsapp-notice--warning">
                  {locale === 'ar' ? 'يرجى استكمال الخيارات الإلزامية للمنتجات أعلاه لتفعيل زر إتمام الطلب' : 'Please complete all required item options above to proceed to checkout'}
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-checkout"
                  onClick={() => { closeCart(); setShowCheckout(true); }}
                >
                  <span>{t.checkout || (locale === 'ar' ? 'إتمام الطلب' : 'Checkout')}</span>
                  <span className="btn-checkout-total">
                    <b>{total}</b> {currency}
                  </span>
                </button>
                <p className="whatsapp-notice">{t.whatsappNotice}</p>
              </>
            )}
          </div>
        )}
      </div>
      
      <CheckoutModal
        locale={locale}
        currency={currency}
        restaurantName={restaurantName}
        phoneIntl={phoneIntl}
        vatNote={vatNote}
        deliveryFee={deliveryFee}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onOrderSuccess={() => setShowCheckout(false)}
      />
    </div>
  );
}
