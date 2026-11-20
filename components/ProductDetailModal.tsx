'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useCart } from './CartContext';
import { ui, type Locale } from '@/lib/i18n';
import { CloseIcon, PlusIcon, MinusIcon, CheckIcon, SearchIcon } from './Icons';
import { parsePriceNum, type SelectedOption } from '@/lib/cart';
import { calculateOfferDiscount } from '@/lib/offers';
import type { VOptionGroup, VOptionItem } from '@/lib/menu-view';

function OptionGroupSelector({
  group,
  selectedOptions,
  onChange,
  currency,
  locale,
  error,
}: {
  group: VOptionGroup;
  selectedOptions: SelectedOption[];
  onChange: (options: SelectedOption[]) => void;
  currency: string;
  locale: Locale;
  error?: string;
}) {
  const t = ui[locale];
  const isAr = locale === 'ar';
  const [searchTerm, setSearchTerm] = useState('');

  // Group-specific selection
  const groupSelections = useMemo(
    () => selectedOptions.filter((o) => o.groupId === group.id),
    [selectedOptions, group.id]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return group.options;
    const term = searchTerm.toLowerCase();
    return group.options.filter((o) => o.name.toLowerCase().includes(term));
  }, [group.options, searchTerm]);

  const toggleOption = (opt: VOptionItem) => {
    if (!group.isMulti) {
      // Single select: replace any existing selection in this group
      const otherGroups = selectedOptions.filter((o) => o.groupId !== group.id);
      onChange([
        ...otherGroups,
        {
          id: opt.id,
          groupId: group.id,
          groupName: group.name,
          name: opt.name,
          price: opt.price,
        },
      ]);
    } else {
      // Multi select
      const isSelected = groupSelections.some((o) => o.id === opt.id);
      if (isSelected) {
        onChange(selectedOptions.filter((o) => o.id !== opt.id));
      } else {
        if (groupSelections.length >= group.maxSelect) {
          return;
        }
        onChange([
          ...selectedOptions,
          {
            id: opt.id,
            groupId: group.id,
            groupName: group.name,
            name: opt.name,
            price: opt.price,
          },
        ]);
      }
    }
  };

  const clearGroupSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedOptions.filter((o) => o.groupId !== group.id));
  };

  const hasMetRequirement = !group.isRequired || groupSelections.length >= (group.minSelect || 1);

  return (
    <div
      id={`opt-group-${group.id}`}
      className={`addon-group-box${error ? ' has-error' : ''}${hasMetRequirement && groupSelections.length > 0 ? ' is-fulfilled' : ''}`}
    >
      <div className="addon-group-header">
        <div className="addon-group-meta">
          <span className="addon-group-name">{group.name}</span>
          <div className="addon-group-badges">
            <span className={`addon-rule-badge ${group.isRequired ? 'required' : 'optional'}`}>
              {group.isRequired ? (isAr ? 'إجباري' : 'Required') : (isAr ? 'اختياري' : 'Optional')}
            </span>
            {group.isMulti && (
              <span className="addon-rule-badge multi">
                {isAr ? `(حد أقصى ${group.maxSelect})` : `(max ${group.maxSelect})`}
              </span>
            )}
            {hasMetRequirement && groupSelections.length > 0 && (
              <span className="addon-rule-badge fulfilled">
                {isAr ? '✓ تم الاختيار' : '✓ Selected'}
              </span>
            )}
          </div>
        </div>

        {groupSelections.length > 0 && !group.isRequired && (
          <button
            type="button"
            className="addon-clear-btn"
            onClick={clearGroupSelection}
            aria-label={t.clearSelection}
          >
            {t.clearSelection}
          </button>
        )}
      </div>

      {group.options.length > 6 && (
        <div className="addon-search-box" style={{ marginBottom: '10px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'ابحث في الخيارات...' : 'Search choices...'}
            className="addon-search-input"
          />
        </div>
      )}

      {/* Direct Interactive Tiles Grid */}
      <div className="option-tiles-grid" role={group.isMulti ? 'group' : 'radiogroup'} aria-label={group.name}>
        {filteredOptions.map((opt) => {
          const isSelected = groupSelections.some((o) => o.id === opt.id);
          const isMaxReached = group.isMulti && !isSelected && groupSelections.length >= group.maxSelect;

          return (
            <div
              key={opt.id}
              role={group.isMulti ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              aria-disabled={isMaxReached}
              tabIndex={isMaxReached ? -1 : 0}
              className={`option-tile${isSelected ? ' selected' : ''}${isMaxReached ? ' disabled' : ''}`}
              onClick={() => {
                if (!isMaxReached) toggleOption(opt);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!isMaxReached) toggleOption(opt);
                }
              }}
            >
              <div className="option-tile-content">
                <span className="option-tile-indicator" aria-hidden="true">
                  {group.isMulti ? (
                    <span className={`tile-check-box${isSelected ? ' checked' : ''}`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  ) : (
                    <span className={`tile-radio-circle${isSelected ? ' checked' : ''}`} />
                  )}
                </span>
                <span className="option-tile-name">{opt.name}</span>
              </div>

              <div className="option-tile-price-wrap">
                {opt.price > 0 ? (
                  <span className="option-tile-price">
                    +{opt.price} <small>{currency}</small>
                  </span>
                ) : (
                  <span className="option-tile-free">
                    {isAr ? 'مجاني' : 'Free'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="addon-error-msg" role="alert" style={{ marginTop: '10px' }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailModal({
  locale,
  currency,
}: {
  locale: Locale;
  currency: string;
}) {
  const { productModal, closeProductModal, addItem, updateCartItem, selectedBranchId, offers, isViewOnly, menuSettings } = useCart();
  const t = ui[locale];

  const editingItem = productModal?.editingCartItem;
  const isEditing = Boolean(editingItem);

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [actionDone, setActionDone] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Initialize modal state (from editingCartItem if editing, or default)
  useEffect(() => {
    if (productModal) {
      if (productModal.editingCartItem) {
        const item = productModal.editingCartItem;
        setSelectedVariant(item.variantIndex);
        setSelectedOptions(item.selectedOptions ? [...item.selectedOptions] : []);
        setRemovedIngredients(item.removedIngredients ? [...item.removedIngredients] : []);
        setQuantity(item.quantity);
        setNotes(item.notes || '');
      } else {
        setSelectedVariant(0);
        setSelectedOptions([]);
        setRemovedIngredients([]);
        setQuantity(1);
        setNotes('');
      }
      setValidationErrors({});
      setActionDone(false);
      setImgFailed(false);
    }
  }, [productModal]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!productModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus management
    const timer = setTimeout(() => {
      firstButtonRef.current?.focus();
    }, 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeProductModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [productModal, closeProductModal]);

  if (!productModal) return null;

  const { item, categoryIcon, kind } = productModal;
  const currentPriceObj = item.prices[selectedVariant] ?? item.prices[0];
  const basePrice = parsePriceNum(currentPriceObj.value);
  const addonsTotal = selectedOptions.reduce((acc, o) => acc + o.price, 0);

  const pricing = calculateOfferDiscount({
    productId: item.id,
    categoryId: item.categoryId,
    unitPrice: basePrice,
    quantity,
    branchId: selectedBranchId,
    activeOffers: offers,
    locale,
  });

  const unitPrice = pricing.discountedUnitPrice + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (item.optionGroups && item.optionGroups.length > 0) {
      for (const group of item.optionGroups) {
        const groupCount = selectedOptions.filter((o) => o.groupId === group.id).length;
        const isRequired = Boolean(group.isRequired || (group.minSelect && group.minSelect > 0));
        const minRequired = group.minSelect && group.minSelect > 0 ? group.minSelect : (group.isRequired ? 1 : 0);

        if (isRequired && groupCount < minRequired) {
          errors[group.id] = minRequired > 1
            ? (locale === 'ar' ? `الحد الأدنى لخيارات ${group.name} هو ${minRequired}` : `Minimum selection for ${group.name} is ${minRequired}`)
            : (locale === 'ar' ? `يرجى تحديد اختيار في: ${group.name}` : `Please select an option for: ${group.name}`);
        } else if (group.maxSelect && group.maxSelect > 0 && groupCount > group.maxSelect) {
          errors[group.id] = locale === 'ar'
            ? `الحد الأقصى لخيارات ${group.name} هو ${group.maxSelect}`
            : `Maximum selection for ${group.name} is ${group.maxSelect}`;
        }
      }
    }
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstErrorId = Object.keys(errors)[0];
      const el = document.getElementById(`opt-group-${firstErrorId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    return true;
  };

  const handleAction = () => {
    if (!validate()) return;

    if (isEditing && editingItem) {
      updateCartItem(editingItem.id, item, selectedVariant, quantity, selectedOptions, removedIngredients, notes);
    } else {
      addItem(item, selectedVariant, quantity, selectedOptions, removedIngredients, notes, categoryIcon);
    }

    setActionDone(true);
    setTimeout(() => {
      closeProductModal();
    }, 450);
  };

  return (
    <div
      className="modal-backdrop product-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeProductModal();
      }}
      role="presentation"
    >
      <div
        className="modal-panel product-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <div className="sheet-handle" aria-hidden="true" />

        <button
          type="button"
          className="modal-close"
          onClick={closeProductModal}
          aria-label={t.close}
          ref={firstButtonRef}
        >
          <CloseIcon width={20} height={20} />
        </button>

        <div className="modal-scroll-body">
          {/* Media Header */}
          <div className={`modal-media modal-media--${kind}`}>
            {item.img && !imgFailed ? (
              <Image
                src={item.img}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 100vw, 560px"
                style={{ objectFit: kind === 'platter' ? 'contain' : 'cover' }}
                onError={() => setImgFailed(true)}
                priority
              />
            ) : (
              <div className={`ph ph--${kind}`} role="img" aria-label={item.name}>
                <span className="ph-icon" aria-hidden="true">
                  {categoryIcon}
                </span>
              </div>
            )}
            {item.badge && <span className="badge on-media">{item.badge}</span>}
          </div>

          <div className="modal-content">
            <h2 id="product-modal-title" className="modal-title">
              {item.name}
            </h2>

            {item.desc && <p className="modal-desc">{item.desc}</p>}

            {/* Ingredients / parts with interactive exclusion */}
            {item.parts && item.parts.length > 0 && (
              <div className="modal-section modal-ingredients-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 className="modal-section-title" style={{ margin: 0 }}>{t.ingredientsTitle}</h3>
                  <small style={{ fontSize: '11px', color: '#64748b' }}>
                    {locale === 'ar' ? 'انقر على أي مكوّن لاستبعاده' : 'Click any ingredient to exclude'}
                  </small>
                </div>
                <div className="modal-tags-interactive" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {item.parts.map((part, idx) => {
                    const isExcluded = removedIngredients.includes(part);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRemovedIngredients((prev) =>
                            prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
                          );
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: isExcluded ? '#fef2f2' : '#f1f5f9',
                          color: isExcluded ? '#b91c1c' : '#334155',
                          border: `1.5px solid ${isExcluded ? '#f87171' : '#e2e8f0'}`,
                          textDecoration: isExcluded ? 'line-through' : 'none',
                        }}
                      >
                        <span>{isExcluded ? '✕ بدون' : '✓'}</span>
                        <span>{part}</span>
                      </button>
                    );
                  })}
                </div>
                {removedIngredients.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ {locale === 'ar' ? 'سيتم تحضير الطلب بدون:' : 'Will be prepared without:'}{' '}
                    {removedIngredients.join('، ')}
                  </div>
                )}
              </div>
            )}

            {/* Variants / Portions if multiple prices */}
            {item.prices.length > 1 && (
              <div className="modal-section">
                <h3 className="modal-section-title">{t.portionsAndSizes}</h3>
                <div className="modal-variants" role="radiogroup" aria-label={t.portionsAndSizes}>
                  {item.prices.map((priceObj, idx) => {
                    const isSelected = selectedVariant === idx;
                    const priceVal = parsePriceNum(priceObj.value);
                    return (
                      <button
                        key={idx}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`modal-variant-btn${isSelected ? ' active' : ''}`}
                        onClick={() => setSelectedVariant(idx)}
                      >
                        <span className="variant-label">
                          {priceObj.label || `${t.quantity} ${idx + 1}`}
                        </span>
                        <span className="variant-price">
                          <b>{priceVal}</b> {currency}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Single price display if only 1 option */}
            {item.prices.length === 1 && (
              <div className="modal-single-price">
                <span className="single-price-label">{currentPriceObj.label || t.total}:</span>
                <span className="single-price-val">
                  {pricing.appliedOffer ? (
                    <>
                      <s className="modal-price-strike">{pricing.originalUnitPrice + addonsTotal} {currency}</s>
                      <b>{pricing.discountedUnitPrice + addonsTotal}</b> {currency}
                      <span className="modal-offer-badge">🏷️ {pricing.appliedOffer.badge} (-{pricing.appliedOffer.discountPerUnit} {currency})</span>
                    </>
                  ) : (
                    <>
                      <b>{basePrice + addonsTotal}</b> {currency}
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Option Groups (Customization & Add-ons) */}
            {item.optionGroups && item.optionGroups.length > 0 && (
              <div className="modal-section modal-addons-section">
                <h3 className="modal-section-title">{t.customizationTitle}</h3>
                <div className="modal-addons-list">
                  {item.optionGroups.map((group) => (
                    <OptionGroupSelector
                      key={group.id}
                      group={group}
                      selectedOptions={selectedOptions}
                      onChange={setSelectedOptions}
                      currency={currency}
                      locale={locale}
                      error={validationErrors[group.id]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="modal-section modal-qty-section">
              <span className="modal-section-title">{t.quantity}:</span>
              <div className="qty-picker">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label={t.decreaseQty}
                >
                  <MinusIcon width={16} height={16} />
                </button>
                <span className="qty-value" aria-live="polite">
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

            {/* Item Notes */}
            <div className="modal-section">
              <label htmlFor="product-notes" className="modal-section-title">
                {t.itemNotesLabel}
              </label>
              <textarea
                id="product-notes"
                className="modal-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.itemNotesPlaceholder}
                maxLength={300}
              />
            </div>
          </div>
        </div>

        {/* Modal Action Foot */}
        <div className="modal-foot">
          {item.isAvailable === false ? (
            <div
              className="modal-unavailable-lock"
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  color: '#991b1b',
                  fontSize: '15px',
                }}
              >
                <span>🚫</span>
                <span>
                  {locale === 'ar'
                    ? 'هذا الصنف غير متوفر حالياً'
                    : 'This item is currently unavailable'}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#b91c1c', lineHeight: 1.4 }}>
                {locale === 'ar'
                  ? 'يمكنك تصفح باقي أطباق المنيو المتوفرة وسيسعدنا خدمتكم.'
                  : 'Please check other available delicious dishes on our menu.'}
              </p>
            </div>
          ) : isViewOnly ? (
            <div
              className="modal-view-only-lock"
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fffdf5 0%, #fffbeb 100%)',
                border: '1px solid #fde68a',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  color: '#92400e',
                  fontSize: '15px',
                }}
              >
                <span>🔒</span>
                <span>
                  {locale === 'ar'
                    ? 'وضع العرض فقط — استقبال الطلبات غير متاح حالياً'
                    : 'View-Only Mode — Ordering is currently unavailable'}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#b45309', lineHeight: 1.4 }}>
                {locale === 'ar'
                  ? (menuSettings?.noticeTitleAr || 'المنيو والأسعار متاحة للتصفح، وسيتم استئناف الطلب قريباً.')
                  : (menuSettings?.noticeTitleEn || 'You can browse items & prices. Ordering will resume shortly.')}
              </p>
            </div>
          ) : (
            <button
              type="button"
              className={`btn-add-cart${actionDone ? ' added' : ''}`}
              onClick={handleAction}
              disabled={!actionDone && Object.keys(validationErrors).length > 0}
            >
              {actionDone ? (
                <>
                  <CheckIcon width={18} height={18} />
                  <span>{isEditing ? t.itemUpdated : t.itemAdded}</span>
                </>
              ) : (
                <>
                  <span>{isEditing ? t.updateOrder : t.addToCart}</span>
                  <span className="btn-add-price">
                    <b>{totalPrice}</b> {currency}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
