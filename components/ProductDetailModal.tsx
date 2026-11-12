'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useCart } from './CartContext';
import { ui, type Locale } from '@/lib/i18n';
import { CloseIcon, PlusIcon, MinusIcon, CheckIcon, SearchIcon } from './Icons';
import { parsePriceNum, type SelectedOption } from '@/lib/cart';
import { calculateOfferDiscount } from '@/lib/offers';
import type { VOptionGroup, VOptionItem } from '@/lib/menu-view';

function OptionGroupCombobox({
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

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
      setIsOpen(false);
      setSearchTerm('');
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(filteredOptions.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[focusedIndex]) {
        toggleOption(filteredOptions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`addon-group-box${error ? ' has-error' : ''}${isOpen ? ' is-open' : ''}`}
      onKeyDown={handleKeyDown}
    >
      <div className="addon-group-header">
        <div className="addon-group-meta">
          <span className="addon-group-name">{group.name}</span>
          <div className="addon-group-badges">
            <span className={`addon-rule-badge ${group.isRequired ? 'required' : 'optional'}`}>
              {group.isRequired ? t.required : t.optional}
            </span>
            {group.isMulti && (
              <span className="addon-rule-badge multi">
                {group.minSelect > 0
                  ? `${t.minRequiredAlert} ${group.minSelect} (${group.maxSelect} max)`
                  : `(max ${group.maxSelect})`}
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

      {/* Selected chips display */}
      {groupSelections.length > 0 && (
        <div className="addon-selected-chips">
          {groupSelections.map((sel) => (
            <span key={sel.id} className="addon-chip">
              <span className="addon-chip-name">{sel.name}</span>
              {sel.price > 0 ? (
                <span className="addon-chip-price">+{sel.price} {currency}</span>
              ) : (
                <span className="addon-chip-free">{t.free}</span>
              )}
              <button
                type="button"
                className="addon-chip-remove"
                onClick={() => onChange(selectedOptions.filter((o) => o.id !== sel.id))}
                aria-label={t.removeItem}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Combobox Trigger */}
      <button
        type="button"
        className="combobox-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="combobox-placeholder">
          {groupSelections.length === 0
            ? t.selectOptionPlaceholder
            : group.isMulti
            ? `${groupSelections.length} / ${group.maxSelect} مختار`
            : groupSelections[0].name}
        </span>
        <span className="combobox-chevron" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="combobox-dropdown" role="listbox">
          <div className="combobox-search-bar">
            <SearchIcon width={16} height={16} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setFocusedIndex(0);
              }}
              placeholder={t.searchOptions}
              className="combobox-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="combobox-search-clear"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="combobox-options-list">
            {filteredOptions.length === 0 ? (
              <div className="combobox-no-options">{t.noOptionsFound}</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = groupSelections.some((o) => o.id === opt.id);
                const isFocused = idx === focusedIndex;
                const isMaxReached =
                  group.isMulti && !isSelected && groupSelections.length >= group.maxSelect;

                return (
                  <div
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`combobox-option-item${isSelected ? ' selected' : ''}${
                      isFocused ? ' focused' : ''
                    }${isMaxReached ? ' disabled' : ''}`}
                    onClick={() => {
                      if (!isMaxReached) toggleOption(opt);
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                  >
                    <div className="option-item-main">
                      <span className="option-item-indicator" aria-hidden="true">
                        {group.isMulti ? (isSelected ? '☑' : '☐') : isSelected ? '●' : '○'}
                      </span>
                      <span className="option-item-name">{opt.name}</span>
                    </div>

                    <span className="option-item-price">
                      {opt.price > 0 ? (
                        <>+{opt.price} <small>{currency}</small></>
                      ) : (
                        <span className="price-free">{t.free}</span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="addon-error-msg">{error}</p>}
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
  const { productModal, closeProductModal, addItem, updateCartItem, selectedBranchId, offers } = useCart();
  const t = ui[locale];

  const editingItem = productModal?.editingCartItem;
  const isEditing = Boolean(editingItem);

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
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
        setQuantity(item.quantity);
        setNotes(item.notes || '');
      } else {
        setSelectedVariant(0);
        setSelectedOptions([]);
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
        if (group.isRequired && groupCount === 0) {
          errors[group.id] = `${t.required} — ${group.name}`;
        } else if (group.isMulti && group.minSelect > 0 && groupCount < group.minSelect) {
          errors[group.id] = `${t.minRequiredAlert} ${group.minSelect}`;
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAction = () => {
    if (!validate()) return;

    if (isEditing && editingItem) {
      updateCartItem(editingItem.id, item, selectedVariant, quantity, selectedOptions, notes);
    } else {
      addItem(item, selectedVariant, quantity, selectedOptions, notes, categoryIcon);
    }

    setActionDone(true);
    setTimeout(() => {
      closeProductModal();
    }, 450);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeProductModal();
      }}
      role="presentation"
    >
      <div
        className="modal-panel"
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

            {/* Ingredients / parts */}
            {item.parts && item.parts.length > 0 && (
              <div className="modal-section">
                <h3 className="modal-section-title">{t.ingredientsTitle}</h3>
                <ul className="modal-tags">
                  {item.parts.map((part, idx) => (
                    <li key={idx}>{part}</li>
                  ))}
                </ul>
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
                    <OptionGroupCombobox
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
          <button
            type="button"
            className={`btn-add-cart${actionDone ? ' added' : ''}`}
            onClick={handleAction}
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
        </div>
      </div>
    </div>
  );
}
