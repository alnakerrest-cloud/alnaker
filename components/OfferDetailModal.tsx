'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import type { VOffer } from '@/lib/offers';
import type { VCategory, VItem } from '@/lib/menu-view';
import type { VBranch } from '@/lib/site-db';
import type { Locale } from '@/lib/i18n';
import { ui } from '@/lib/i18n';
import { CloseIcon, PlusIcon, MinusIcon } from './Icons';
import { parsePriceNum, type SelectedOption } from '@/lib/cart';
import { useCart } from './CartContext';

interface OfferDetailModalProps {
  offer: VOffer | null;
  categories: VCategory[];
  branches?: VBranch[];
  locale: Locale;
  currency: string;
  onClose: () => void;
}

export default function OfferDetailModal({
  offer,
  categories,
  branches = [],
  locale,
  currency,
  onClose,
}: OfferDetailModalProps) {
  const t = ui[locale];
  const { addItem, selectedBranchId } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Locate the target menu product
  const targetData = useMemo(() => {
    if (!offer) return null;
    const targetId = offer.primaryProductId || offer.productIds[0];
    if (!targetId) return null;

    for (const cat of categories) {
      for (const sec of cat.sections) {
        for (const item of sec.items) {
          if (item.id === targetId) {
            return { item, categoryIcon: cat.icon, kind: cat.kind };
          }
        }
      }
    }
    return null;
  }, [offer, categories]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!offer) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [offer, onClose]);

  // Reset state on offer change
  useEffect(() => {
    setQuantity(1);
    setNotes('');
    setSelectedOptions([]);
    setSelectedVariant(0);
    setImgFailed(false);
  }, [offer]);

  if (!offer) return null;

  const targetItem = targetData?.item;
  const categoryIcon = targetData?.categoryIcon || '🏷️';
  const displayImage = offer.imageUrl || targetItem?.img;

  // Compute pricing
  const currentPriceObj = targetItem?.prices[selectedVariant] || targetItem?.prices[0] || { value: offer.originalPrice || 0, label: '' };
  const basePrice = offer.originalPrice ?? parsePriceNum(currentPriceObj.value);
  const addonsTotal = selectedOptions.reduce((acc, opt) => acc + opt.price, 0);

  // Discount calculation
  let discountedBasePrice = offer.discountedPrice ?? basePrice;
  if (offer.discountedPrice == null) {
    if (offer.offerType === 'PERCENTAGE' && offer.discountValue) {
      discountedBasePrice = Math.max(0, Math.round(basePrice * (1 - offer.discountValue / 100) * 100) / 100);
    } else if (offer.offerType === 'FIXED_AMOUNT' && offer.discountValue) {
      discountedBasePrice = Math.max(0, basePrice - offer.discountValue);
    } else if (offer.offerType === 'SPECIAL_PRICE' && offer.promoPrice) {
      discountedBasePrice = offer.promoPrice;
    }
  }

  const unitPrice = discountedBasePrice + addonsTotal;
  const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
  const originalLineTotal = Math.round((basePrice + addonsTotal) * quantity * 100) / 100;
  const totalSaved = Math.max(0, Math.round((originalLineTotal - lineTotal) * 100) / 100);

  // Resolve target branches
  const branchLabels = (offer.locationIds && offer.locationIds.length > 0)
    ? offer.locationIds
        .map((locId) => branches.find((b) => b.id === locId))
        .filter(Boolean)
        .map((b) => b!.name)
    : [t.allBranches];

  const handleAddToCart = () => {
    if (!targetItem) {
      onClose();
      return;
    }

    addItem(
      targetItem,
      selectedVariant,
      quantity,
      selectedOptions.length > 0 ? selectedOptions : undefined,
      undefined,
      notes.trim() || undefined,
      categoryIcon
    );

    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-panel offer-detail-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label={t.close}
          ref={closeBtnRef}
        >
          <CloseIcon width={22} height={22} />
        </button>

        <div className="modal-scroll-body">
          {/* Header Media */}
          <div className="modal-media offer-modal-media">
            {displayImage && !imgFailed ? (
              <Image
                src={displayImage}
                alt={offer.title}
                fill
                sizes="(max-width: 768px) 100vw, 640px"
                style={{ objectFit: 'cover' }}
                onError={() => setImgFailed(true)}
                priority
              />
            ) : (
              <div className="ph offer-modal-ph" role="img" aria-label={offer.title}>
                <span className="ph-icon" aria-hidden="true">
                  🏷️
                </span>
              </div>
            )}
            <div className="offer-modal-badges">
              <span className="badge on-media">{offer.badge}</span>
              {offer.savingsText && (
                <span className="offer-savings-badge offer-savings-badge--lg">
                  {offer.savingsText}
                </span>
              )}
            </div>
          </div>

          <div className="modal-content">
            {/* Offer Title & Target Product */}
            <div className="offer-modal-header-info">
              <span className="offer-modal-eyebrow">
                ✨ {t.offersSectionTitle}
              </span>
              <h2 id="offer-modal-title" className="modal-title">
                {offer.title} {targetItem ? `— ${targetItem.name}` : ''}
              </h2>
              {offer.desc && <p className="modal-desc">{offer.desc}</p>}
            </div>

            {/* Target Product Pill & Ingredients */}
            {targetItem && (
              <div className="offer-modal-product-card">
                <div className="offer-target-meta">
                  <span className="offer-target-icon">{categoryIcon}</span>
                  <div>
                    <h4 className="offer-target-name">{t.includedProduct}: {targetItem.name}</h4>
                    {targetItem.desc && (
                      <p className="offer-target-desc">{targetItem.desc}</p>
                    )}
                  </div>
                </div>

                {targetItem.parts && targetItem.parts.length > 0 && (
                  <ul className="modal-tags" style={{ marginTop: '10px' }}>
                    {targetItem.parts.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Price Presentation */}
            <div className="offer-modal-price-card">
              <div className="offer-modal-price-breakdown">
                <div className="modal-single-price">
                  <span className="single-price-label">{t.finalPrice}:</span>
                  <span className="single-price-val">
                    <s className="modal-price-strike">
                      {basePrice + addonsTotal} {currency}
                    </s>
                    <b className="offer-price-highlight">
                      {discountedBasePrice + addonsTotal}
                    </b>{' '}
                    <i>{currency}</i>
                    {offer.savingsText && (
                      <span className="modal-offer-badge">
                        🏷️ {offer.savingsText}
                      </span>
                    )}
                  </span>
                </div>
                {totalSaved > 0 && (
                  <div className="offer-saved-callout">
                    🎉 {t.discountAmount}: <strong>{totalSaved} {currency}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Available Branches */}
            <div className="offer-modal-branches">
              <span className="offer-branches-label">
                📍 {t.availableAtBranches}:
              </span>
              <div className="offer-branches-pills">
                {branchLabels.map((lbl, idx) => (
                  <span key={idx} className="offer-branch-pill">
                    {lbl}
                  </span>
                ))}
              </div>
            </div>

            {/* Limited Time Notice */}
            <p className="offer-terms-notice">
              ⏱️ {t.limitedTimeNotice}
            </p>

            {/* Quantity Selector */}
            <div className="modal-qty-row">
              <label htmlFor="modal-offer-qty" className="qty-label">
                {t.quantity}:
              </label>
              <div className="qty-picker">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label={t.decreaseQty}
                  disabled={quantity <= 1}
                >
                  <MinusIcon width={16} height={16} />
                </button>
                <span id="modal-offer-qty" className="qty-value" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  aria-label={t.increaseQty}
                >
                  <PlusIcon width={16} height={16} />
                </button>
              </div>
            </div>

            {/* Customer Notes */}
            <div className="modal-notes">
              <label htmlFor="offer-customer-notes" className="modal-notes-label">
                📝 {t.itemNotesLabel}
              </label>
              <textarea
                id="offer-customer-notes"
                className="modal-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.itemNotesPlaceholder}
                rows={2}
                maxLength={250}
              />
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer CTA */}
        <div className="modal-footer">
          <div className="modal-footer-price">
            <span className="footer-total-label">{t.total}:</span>
            <div className="footer-price-group">
              {totalSaved > 0 && (
                <s className="footer-orig-strike">
                  {originalLineTotal} {currency}
                </s>
              )}
              <b className="footer-price-num">{lineTotal}</b>
              <span className="footer-currency">{currency}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-add-cart"
            onClick={handleAddToCart}
          >
            <span>{t.addOfferToCart}</span>
            <span className="btn-add-cart-sep">•</span>
            <span>{lineTotal} {currency}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

