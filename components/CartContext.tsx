'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { VCategory, VItem, VKind } from '@/lib/menu-view';
import type { VBranch } from '@/lib/site-db';
import type { VOffer } from '@/lib/offers';
import { calculateOfferDiscount } from '@/lib/offers';
import type { Locale } from '@/lib/i18n';
import type { MenuModeSettings } from '@/lib/order-settings-types';
import {
  CART_STORAGE_KEY,
  type CartItem,
  type SelectedOption,
  buildCartItemId,
  calculateCartTotals,
  reconcileCart,
  parsePriceNum,
  formatWhatsAppMessage,
  buildWhatsAppUrl,
} from '@/lib/cart';

export type ProductModalState = {
  item: VItem;
  categoryIcon: string;
  kind: VKind;
  editingCartItem?: CartItem;
} | null;

interface CartContextValue {
  cart: CartItem[];
  customerNotes: string;
  setCustomerNotes: (notes: string) => void;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  selectedBranch?: VBranch;
  branches: VBranch[];
  offers: VOffer[];
  addItem: (
    item: VItem,
    variantIndex: number,
    quantity: number,
    selectedOptions?: SelectedOption[],
    removedIngredients?: string[],
    notes?: string,
    categoryIcon?: string
  ) => void;
  updateCartItem: (
    cartItemId: string,
    item: VItem,
    variantIndex: number,
    quantity: number,
    selectedOptions?: SelectedOption[],
    removedIngredients?: string[],
    notes?: string
  ) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  productModal: ProductModalState;
  openProductModal: (item: VItem, categoryIcon: string, kind: VKind, editingCartItem?: CartItem) => void;
  editCartItem: (cartItemId: string) => void;
  closeProductModal: () => void;
  totalQuantity: number;
  distinctCount: number;
  subtotal: number;
  total: number;
  hasHydrated: boolean;
  isViewOnly: boolean;
  menuSettings?: MenuModeSettings;
  getWhatsAppUrl: (
      fallbackPhone: string,
      restaurantName: string,
      vatNote?: string
    ) => string;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  categories,
  branches = [],
  locale,
  currency,
  offers = [],
  menuSettings,
}: {
  children: ReactNode;
  categories: VCategory[];
  branches?: VBranch[];
  locale: Locale;
  currency: string;
  offers?: VOffer[];
  menuSettings?: MenuModeSettings;
}) {
  const isViewOnly = menuSettings?.mode === 'VIEW_ONLY' || menuSettings?.mode === 'TEMPORARILY_CLOSED';
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerNotes, setCustomerNotes] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [productModal, setProductModal] = useState<ProductModalState>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Initialize selected branch to first orderable & active branch, or first branch
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    const defaultBranch = branches.find((b) => b.isOrderable) ?? branches[0];
    return defaultBranch?.id ?? '';
  });

  // Keep branch in sync if branches change
  useEffect(() => {
    if (branches.length > 0 && !branches.some((b) => b.id === selectedBranchId)) {
      const defaultBranch = branches.find((b) => b.isOrderable) ?? branches[0];
      if (defaultBranch) setSelectedBranchId(defaultBranch.id);
    }
  }, [branches, selectedBranchId]);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) ?? branches[0],
    [branches, selectedBranchId]
  );

  // Restore and reconcile from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedItems = Array.isArray(parsed) ? parsed : parsed.items;
        const reconciled = reconcileCart(storedItems, categories);
        setCart(reconciled);
        if (parsed && typeof parsed.customerNotes === 'string') {
          setCustomerNotes(parsed.customerNotes);
        }
        if (parsed && typeof parsed.selectedBranchId === 'string' && parsed.selectedBranchId) {
          setSelectedBranchId(parsed.selectedBranchId);
        }
      }
    } catch {
      // Ignore parse/storage errors
    }
    setHasHydrated(true);
  }, [categories]);

  // Sync to localStorage
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ items: cart, customerNotes, selectedBranchId })
      );
    } catch {
      // Storage quota or privacy mode errors
    }
  }, [cart, customerNotes, selectedBranchId, hasHydrated]);

  // Recalculate cart items offer discounts when branch or offers change
  useEffect(() => {
    if (!hasHydrated || cart.length === 0) return;
    setCart((prev) =>
      prev.map((it) => {
        const addonsTotal = (it.selectedOptions ?? []).reduce((acc, o) => acc + o.price, 0);
        const productBase = Math.max(0, it.baseUnitPrice - addonsTotal);
        const pricing = calculateOfferDiscount({
          productId: it.productId,
          unitPrice: productBase,
          quantity: it.quantity,
          branchId: selectedBranchId,
          activeOffers: offers,
          locale,
        });
        return {
          ...it,
          appliedOffer: pricing.appliedOffer,
          unitPrice: pricing.discountedUnitPrice + addonsTotal,
        };
      })
    );
  }, [selectedBranchId, offers, locale, hasHydrated]);

  const addItem = useCallback(
    (
      item: VItem,
      variantIndex: number,
      quantity: number,
      selectedOptions?: SelectedOption[],
      removedIngredients?: string[],
      notes?: string,
      categoryIcon?: string
    ) => {
      if (isViewOnly) return;
      const safeIndex =
        variantIndex >= 0 && variantIndex < item.prices.length ? variantIndex : 0;
      const priceObj = item.prices[safeIndex] ?? item.prices[0];
      const basePrice = parsePriceNum(priceObj.value);
      const addonsTotal = (selectedOptions ?? []).reduce((acc, o) => acc + o.price, 0);
      const rawUnitPrice = basePrice + addonsTotal;
      const id = buildCartItemId(item.id, safeIndex, selectedOptions, removedIngredients);
      const qtyToAdd = Math.max(1, Math.min(quantity, 99));

      const pricing = calculateOfferDiscount({
        productId: item.id,
        categoryId: item.categoryId,
        unitPrice: basePrice,
        quantity: qtyToAdd,
        branchId: selectedBranchId,
        activeOffers: offers,
        locale,
      });

      setCart((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === id);
        if (existingIndex > -1) {
          const updated = [...prev];
          const existing = updated[existingIndex];
          const newQty = Math.min(existing.quantity + qtyToAdd, 99);
          const updatedPricing = calculateOfferDiscount({
            productId: item.id,
            categoryId: item.categoryId,
            unitPrice: basePrice,
            quantity: newQty,
            branchId: selectedBranchId,
            activeOffers: offers,
            locale,
          });
          updated[existingIndex] = {
            ...existing,
            quantity: newQty,
            notes: notes ? notes.trim() : existing.notes,
            appliedOffer: updatedPricing.appliedOffer,
            unitPrice: updatedPricing.discountedUnitPrice + addonsTotal,
          };
          return updated;
        }

        const newItem: CartItem = {
          id,
          productId: item.id,
          name: item.name,
          variantIndex: safeIndex,
          variantLabel: priceObj.label,
          baseUnitPrice: rawUnitPrice,
          selectedOptions: selectedOptions && selectedOptions.length > 0 ? selectedOptions : undefined,
          removedIngredients: removedIngredients && removedIngredients.length > 0 ? removedIngredients : undefined,
          appliedOffer: pricing.appliedOffer,
          unitPrice: pricing.discountedUnitPrice + addonsTotal,
          quantity: qtyToAdd,
          notes: notes?.trim() || undefined,
          img: item.img,
          categoryIcon,
        };
        return [...prev, newItem];
      });
    },
    [selectedBranchId, offers, locale, isViewOnly]
  );

  const updateCartItem = useCallback(
    (
      cartItemId: string,
      item: VItem,
      variantIndex: number,
      quantity: number,
      selectedOptions?: SelectedOption[],
      removedIngredients?: string[],
      notes?: string
    ) => {
      if (isViewOnly) return;
      const safeIndex =
        variantIndex >= 0 && variantIndex < item.prices.length ? variantIndex : 0;
      const priceObj = item.prices[safeIndex] ?? item.prices[0];
      const basePrice = parsePriceNum(priceObj.value);
      const addonsTotal = (selectedOptions ?? []).reduce((acc, o) => acc + o.price, 0);
      const rawUnitPrice = basePrice + addonsTotal;
      const newId = buildCartItemId(item.id, safeIndex, selectedOptions, removedIngredients);
      const safeQty = Math.max(1, Math.min(quantity, 99));

      const pricing = calculateOfferDiscount({
        productId: item.id,
        categoryId: item.categoryId,
        unitPrice: basePrice,
        quantity: safeQty,
        branchId: selectedBranchId,
        activeOffers: offers,
        locale,
      });

      setCart((prev) => {
        const targetIndex = prev.findIndex((c) => c.id === cartItemId);
        if (targetIndex === -1) return prev;

        const updatedItem: CartItem = {
          ...prev[targetIndex],
          id: newId,
          variantIndex: safeIndex,
          variantLabel: priceObj.label,
          baseUnitPrice: rawUnitPrice,
          selectedOptions: selectedOptions && selectedOptions.length > 0 ? selectedOptions : undefined,
          removedIngredients: removedIngredients && removedIngredients.length > 0 ? removedIngredients : undefined,
          appliedOffer: pricing.appliedOffer,
          unitPrice: pricing.discountedUnitPrice + addonsTotal,
          quantity: safeQty,
          notes: notes?.trim() || undefined,
        };

        // If the ID changed (different variant or options) and matches an existing line, merge
        if (newId !== cartItemId) {
          const duplicateIndex = prev.findIndex((c, i) => i !== targetIndex && c.id === newId);
          if (duplicateIndex > -1) {
            return prev
              .filter((_, i) => i !== targetIndex)
              .map((c, i) => {
                if (i === duplicateIndex || c.id === newId) {
                  return {
                    ...c,
                    quantity: Math.min(c.quantity + safeQty, 99),
                    notes: updatedItem.notes ?? c.notes,
                  };
                }
                return c;
              });
          }
        }

        const next = [...prev];
        next[targetIndex] = updatedItem;
        return next;
      });
    },
    [selectedBranchId, offers, locale, isViewOnly]
  );

  const updateQuantity = useCallback(
    (cartItemId: string, delta: number) => {
      setCart((prev) => {
        return prev
          .map((it) => {
            if (it.id !== cartItemId) return it;
            const newQty = it.quantity + delta;
            if (newQty <= 0) return null;
            const safeQty = Math.min(newQty, 99);
            const addonsTotal = (it.selectedOptions ?? []).reduce((acc, o) => acc + o.price, 0);
            const productBase = Math.max(0, it.baseUnitPrice - addonsTotal);
            const pricing = calculateOfferDiscount({
              productId: it.productId,
              unitPrice: productBase,
              quantity: safeQty,
              branchId: selectedBranchId,
              activeOffers: offers,
              locale,
            });
            return {
              ...it,
              quantity: safeQty,
              appliedOffer: pricing.appliedOffer,
              unitPrice: pricing.discountedUnitPrice + addonsTotal,
            };
          })
          .filter((it): it is CartItem => it !== null);
      });
    },
    [selectedBranchId, offers, locale, isViewOnly]
  );

  const removeItem = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((it) => it.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerNotes('');
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const openProductModal = useCallback(
    (item: VItem, categoryIcon: string, kind: VKind, editingCartItem?: CartItem) => {
      setProductModal({ item, categoryIcon, kind, editingCartItem });
    },
    []
  );

  const closeProductModal = useCallback(() => {
    setProductModal(null);
  }, []);

  const editCartItem = useCallback(
    (cartItemId: string) => {
      const existing = cart.find((c) => c.id === cartItemId);
      if (!existing) return;

      // Find the VItem in categories
      for (const cat of categories) {
        for (const sec of cat.sections) {
          for (const it of sec.items) {
            if (it.id === existing.productId) {
              setProductModal({
                item: it,
                categoryIcon: cat.icon,
                kind: cat.kind,
                editingCartItem: existing,
              });
              return;
            }
          }
        }
      }
    },
    [cart, categories]
  );

  const totals = useMemo(() => calculateCartTotals(cart), [cart]);

  const getWhatsAppUrl = useCallback(
    (
      fallbackPhone: string,
      restaurantName: string,
      vatNote?: string
    ) => {
      // Prioritize selected branch's phone/whatsapp number, fallback to settings
      const branchTargetPhone =
        selectedBranch?.whatsappNumber?.trim() ||
        selectedBranch?.phoneIntl?.trim() ||
        fallbackPhone;

      const message = formatWhatsAppMessage({
        restaurantName,
        branchName: selectedBranch?.name,
        branchAddress: selectedBranch?.address,
        items: cart,
        currency,
        subtotal: totals.subtotal,
        total: totals.total,
        vatNote,
        customerNotes,
        locale,
      });

      return buildWhatsAppUrl(branchTargetPhone, message);
    },
    [selectedBranch, cart, currency, totals, customerNotes, locale]
  );

  const value = useMemo(
    () => ({
      cart,
      customerNotes,
      setCustomerNotes,
      selectedBranchId,
      setSelectedBranchId,
      selectedBranch,
      branches,
      offers,
      addItem,
      updateCartItem,
      updateQuantity,
      removeItem,
      clearCart,
      isCartOpen,
      openCart,
      closeCart,
      productModal,
      openProductModal,
      editCartItem,
      closeProductModal,
      totalQuantity: totals.totalQuantity,
      distinctCount: totals.distinctCount,
      subtotal: totals.subtotal,
      total: totals.total,
      hasHydrated,
      isViewOnly,
      menuSettings,
      getWhatsAppUrl,
    }),
    [
      cart,
      customerNotes,
      selectedBranchId,
      selectedBranch,
      branches,
      offers,
      addItem,
      updateCartItem,
      updateQuantity,
      removeItem,
      clearCart,
      isCartOpen,
      openCart,
      closeCart,
      productModal,
      openProductModal,
      editCartItem,
      closeProductModal,
      totals,
      hasHydrated,
      isViewOnly,
      menuSettings,
      getWhatsAppUrl,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
