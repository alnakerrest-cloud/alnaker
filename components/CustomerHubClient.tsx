'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import type { OrderRecord, OrderStatus } from '@/lib/orders-store';
import OrderTrackingTimeline from '@/components/OrderTrackingTimeline';
import { useCart } from '@/components/CartContext';
import type { CustomerAddressRecord, CustomerFavoriteItem, CustomerNotificationRecord } from '@/lib/customer-hub-store';

export type CustomerHubTab =
  | 'overview'
  | 'orders'
  | 'profile'
  | 'addresses'
  | 'favorites'
  | 'notifications'
  | 'wallet'
  | 'install';

interface CustomerHubClientProps {
  locale: Locale;
  initialTab?: CustomerHubTab;
  initialAuthenticated: boolean;
  initialCustomer?: {
    id: string;
    phone: string;
    name?: string;
    createdAt?: string;
  };
  initialOrders?: OrderRecord[];
  initialAddresses?: CustomerAddressRecord[];
  initialFavorites?: CustomerFavoriteItem[];
  initialNotifications?: CustomerNotificationRecord[];
  initialUnreadCount?: number;
}

const TERMINAL_STATUSES: OrderStatus[] = ['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'];

const STATUS_LABELS_AR: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  DRAFT: { label: 'مسودة', color: '#64748b', icon: '📝' },
  PENDING_WHATSAPP: { label: 'بانتظار إرسال واتساب', color: '#f59e0b', icon: '⏳' },
  CUSTOMER_CONFIRMED_SENT: { label: 'تم الإرسال - بانتظار المراجعة', color: '#3b82f6', icon: '📩' },
  RECEIVED: { label: 'تم استلام الطلب', color: '#3b82f6', icon: '📥' },
  CONFIRMED: { label: 'تم تأكيد الطلب', color: '#10b981', icon: '✅' },
  PREPARING: { label: 'جاري التحضير بالمطبخ', color: '#8b5cf6', icon: '🍳' },
  READY: { label: 'جاهز للاستلام', color: '#16a34a', icon: '✨' },
  OUT_FOR_DELIVERY: { label: 'خرج للتوصيل مع المندوب', color: '#0ea5e9', icon: '🚚' },
  COMPLETED: { label: 'تم التسليم بنجاح', color: '#22c55e', icon: '🎉' },
  REJECTED: { label: 'تم الاعتذار عن الطلب', color: '#ef4444', icon: '❌' },
  CANCELLED: { label: 'تم إلغاء الطلب', color: '#ef4444', icon: '🚫' },
  EXPIRED: { label: 'انتهت صلاحية الطلب', color: '#94a3b8', icon: '⏰' },
};

const STATUS_LABELS_EN: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  DRAFT: { label: 'Draft', color: '#64748b', icon: '📝' },
  PENDING_WHATSAPP: { label: 'Pending WhatsApp Dispatch', color: '#f59e0b', icon: '⏳' },
  CUSTOMER_CONFIRMED_SENT: { label: 'Sent - Awaiting Review', color: '#3b82f6', icon: '📩' },
  RECEIVED: { label: 'Order Received', color: '#3b82f6', icon: '📥' },
  CONFIRMED: { label: 'Order Confirmed', color: '#10b981', icon: '✅' },
  PREPARING: { label: 'Preparing in Kitchen', color: '#8b5cf6', icon: '🍳' },
  READY: { label: 'Ready for Pickup', color: '#16a34a', icon: '✨' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#0ea5e9', icon: '🚚' },
  COMPLETED: { label: 'Delivered Successfully', color: '#22c55e', icon: '🎉' },
  REJECTED: { label: 'Order Rejected', color: '#ef4444', icon: '❌' },
  CANCELLED: { label: 'Order Cancelled', color: '#ef4444', icon: '🚫' },
  EXPIRED: { label: 'Order Expired', color: '#94a3b8', icon: '⏰' },
};

export default function CustomerHubClient({
  locale,
  initialTab = 'overview',
  initialAuthenticated,
  initialCustomer,
  initialOrders = [],
  initialAddresses = [],
  initialFavorites = [],
  initialNotifications = [],
  initialUnreadCount = 0,
}: CustomerHubClientProps) {
  const isAr = locale === 'ar';
  const statusMeta = isAr ? STATUS_LABELS_AR : STATUS_LABELS_EN;

  // Global Cart
  let cartContext: ReturnType<typeof useCart> | null = null;
  try {
    cartContext = useCart();
  } catch {}

  // Active Tab
  const [activeTab, setActiveTab] = useState<CustomerHubTab>(initialTab);

  // Authentication & Customer
  const [authenticated, setAuthenticated] = useState<boolean>(initialAuthenticated);
  const [customer, setCustomer] = useState(initialCustomer);

  // Data Stores
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [addresses, setAddresses] = useState<CustomerAddressRecord[]>(initialAddresses);
  const [favorites, setFavorites] = useState<CustomerFavoriteItem[]>(initialFavorites);
  const [notifications, setNotifications] = useState<CustomerNotificationRecord[]>(initialNotifications);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(initialUnreadCount);

  // Notifications Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 6000);
  };

  // Orders categorisation
  const activeOrders = orders.filter((o) => !TERMINAL_STATUSES.includes(o.status));
  const previousOrders = orders.filter((o) => TERMINAL_STATUSES.includes(o.status));
  const latestActiveOrder = activeOrders.length > 0 ? activeOrders[0] : null;

  // Multi-device OTP login state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginStep, setLoginStep] = useState<'phone' | 'code'>('phone');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [debugOtpCode, setDebugOtpCode] = useState<string | null>(null);

  // Phone Change Modal State
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [phoneChangeCode, setPhoneChangeCode] = useState('');
  const [phoneChangeStep, setPhoneChangeStep] = useState<'phone' | 'code'>('phone');
  const [phoneChangeLoading, setPhoneChangeLoading] = useState(false);
  const [phoneChangeError, setPhoneChangeError] = useState<string | null>(null);
  const [phoneDebugCode, setPhoneDebugCode] = useState<string | null>(null);

  // Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState('المنزل');
  const [addressCity, setAddressCity] = useState('');
  const [addressArea, setAddressArea] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressBuilding, setAddressBuilding] = useState('');
  const [addressFloor, setAddressFloor] = useState('');
  const [addressApartment, setAddressApartment] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Smart Reorder Modal State
  const [reorderModalOrder, setReorderModalOrder] = useState<OrderRecord | null>(null);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderResult, setReorderResult] = useState<{
    availableItems: any[];
    unavailableItems: { productName: string; reason: string }[];
    priceChanges: { productName: string; oldPrice: number; currentPrice: number }[];
  } | null>(null);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      showToast(
        isAr
          ? 'لتثبيت التطبيق على آيفون: اضغط زر المشاركة (Share) ثم اختر "إضافة إلى الشاشة الرئيسية".'
          : 'To install on iOS: Tap Share, then tap "Add to Home Screen".',
        'info'
      );
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      showToast(isAr ? 'تم تثبيت التطبيق بنجاح!' : 'App installed successfully!', 'success');
    }
    setDeferredPrompt(null);
  };

  // Poll for live status updates if there are active orders
  const refreshHubData = useCallback(async () => {
    try {
      const [hubRes, ordersRes] = await Promise.all([
        fetch('/api/customer/hub', { cache: 'no-store' }),
        fetch('/api/customer/orders', { cache: 'no-store' }),
      ]);

      if (hubRes.ok) {
        const hubData = await hubRes.json();
        if (hubData.authenticated && hubData.customer) {
          setAuthenticated(true);
          setCustomer(hubData.customer);
          setUnreadNotifCount(hubData.overview?.unreadNotificationsCount || 0);
        }
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.authenticated) {
          const newOrders = [...(ordersData.activeOrders || []), ...(ordersData.previousOrders || [])];
          setOrders(newOrders);
          try {
            localStorage.setItem('naqer_active_orders_count', String(ordersData.activeCount || 0));
          } catch {}
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (activeOrders.length === 0) return;
    const interval = setInterval(refreshHubData, 5000);
    return () => clearInterval(interval);
  }, [activeOrders.length, refreshHubData]);

  // Guest Login OTP
  const handleRequestLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    setDebugOtpCode(null);

    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_code', phone: loginPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال رمز التحقق');

      setLoginStep('code');
      if (data.debugCode) setDebugOtpCode(data.debugCode);
    } catch (err: any) {
      setLoginError(err.message || 'حدث خطأ أثناء إرسال الرمز.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_code', phone: loginPhone, code: loginCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'رمز التحقق غير صحيح');

      setAuthenticated(true);
      showToast(isAr ? 'تم التحقق وتسجيل الدخول بنجاح!' : 'Authenticated successfully!', 'success');
      await refreshHubData();
    } catch (err: any) {
      setLoginError(err.message || 'فشل التحقق.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {}
    setAuthenticated(false);
    setCustomer(undefined);
    setOrders([]);
    setAddresses([]);
    setFavorites([]);
    setNotifications([]);
    try {
      localStorage.removeItem('naqer_active_orders_count');
      localStorage.removeItem('naqer_customer_phone');
      localStorage.removeItem('naqer_customer_id');
    } catch {}
    showToast(isAr ? 'تم تسجيل الخروج بنجاح.' : 'Logged out.', 'info');
  };

  // Phone Change Handlers
  const handleRequestPhoneChangeOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneChangeError(null);
    setPhoneChangeLoading(true);
    setPhoneDebugCode(null);

    try {
      const res = await fetch('/api/customer/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', newPhone: newPhoneInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل طلب تغيير الهاتف');

      setPhoneChangeStep('code');
      if (data.debugCode) setPhoneDebugCode(data.debugCode);
    } catch (err: any) {
      setPhoneChangeError(err.message || 'حدث خطأ.');
    } finally {
      setPhoneChangeLoading(false);
    }
  };

  const handleVerifyPhoneChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneChangeError(null);
    setPhoneChangeLoading(true);

    try {
      const res = await fetch('/api/customer/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_update',
          newPhone: newPhoneInput,
          code: phoneChangeCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحقق من الرمز');

      if (data.customer) {
        setCustomer(data.customer);
      }
      setShowPhoneModal(false);
      setNewPhoneInput('');
      setPhoneChangeCode('');
      setPhoneChangeStep('phone');
      showToast(isAr ? 'تم تغيير رقم الهاتف بنجاح!' : 'Phone number updated successfully!', 'success');
      await refreshHubData();
    } catch (err: any) {
      setPhoneChangeError(err.message || 'فشل التحقق.');
    } finally {
      setPhoneChangeLoading(false);
    }
  };

  // Address Handlers
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressLabel('المنزل');
    setAddressCity('');
    setAddressArea('');
    setAddressStreet('');
    setAddressBuilding('');
    setAddressFloor('');
    setAddressApartment('');
    setAddressNotes('');
    setAddressIsDefault(addresses.length === 0);
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr: CustomerAddressRecord) => {
    setEditingAddressId(addr.id);
    setAddressLabel(addr.label);
    setAddressCity(addr.city || '');
    setAddressArea(addr.area || '');
    setAddressStreet(addr.street);
    setAddressBuilding(addr.building || '');
    setAddressFloor(addr.floor || '');
    setAddressApartment(addr.apartment || '');
    setAddressNotes(addr.notes || '');
    setAddressIsDefault(addr.isDefault);
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);

    try {
      if (editingAddressId) {
        const res = await fetch('/api/customer/addresses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addressId: editingAddressId,
            label: addressLabel,
            city: addressCity,
            area: addressArea,
            street: addressStreet,
            building: addressBuilding,
            floor: addressFloor,
            apartment: addressApartment,
            notes: addressNotes,
            isDefault: addressIsDefault,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل تحديث العنوان');
        setAddresses((prev) => prev.map((a) => (a.id === editingAddressId ? data.address : addressIsDefault ? { ...a, isDefault: false } : a)));
        showToast(isAr ? 'تم تحديث العنوان بنجاح' : 'Address updated', 'success');
      } else {
        const res = await fetch('/api/customer/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: addressLabel,
            city: addressCity,
            area: addressArea,
            street: addressStreet,
            building: addressBuilding,
            floor: addressFloor,
            apartment: addressApartment,
            notes: addressNotes,
            isDefault: addressIsDefault,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل إضافة العنوان');
        setAddresses((prev) => [data.address, ...(data.address?.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev)]);
        showToast(isAr ? 'تمت إضافة العنوان بنجاح' : 'Address added', 'success');
      }
      setShowAddressModal(false);
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ', 'error');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSetDefaultAddress = async (addrId: string) => {
    try {
      const res = await fetch('/api/customer/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId: addrId, action: 'set_default' }),
      });
      if (!res.ok) throw new Error('فشل تعيين العنوان كافتراضي');
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === addrId,
        }))
      );
      showToast(isAr ? 'تم تعيين العنوان كافتراضي' : 'Default address set', 'success');
    } catch (err: any) {
      showToast(err.message || 'تعذّر تعيين العنوان كافتراضي', 'error');
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا العنوان؟' : 'Are you sure you want to delete this address?')) return;
    try {
      const res = await fetch(`/api/customer/addresses?id=${addrId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل الحذف');
      setAddresses((prev) => {
        const filtered = prev.filter((a) => a.id !== addrId);
        const wasDef = prev.find((a) => a.id === addrId)?.isDefault;
        if (wasDef && filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
          filtered[0].isDefault = true;
        }
        return filtered;
      });
      showToast(isAr ? 'تم حذف العنوان' : 'Address deleted', 'info');
    } catch {
      showToast(isAr ? 'تعذّر حذف العنوان' : 'Failed to delete address', 'error');
    }
  };

  // Smart Reorder Handlers
  const handleInitiateReorder = async (order: OrderRecord) => {
    setReorderModalOrder(order);
    setReorderLoading(true);
    setReorderResult(null);

    try {
      const res = await fetch('/api/customer/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: order.orderNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذّر فحص الأصناف');
      setReorderResult(data);
    } catch (err: any) {
      showToast(err.message || 'فشل تحضير إعادة الطلب', 'error');
      setReorderModalOrder(null);
    } finally {
      setReorderLoading(false);
    }
  };

  const handleApplyReorderToCart = () => {
    if (!reorderResult || !cartContext) return;
    const { availableItems } = reorderResult;

    if (availableItems.length === 0) {
      showToast(isAr ? 'للأسف، لا توجد أصناف متوفرة من هذا الطلب حالياً.' : 'No items available from this order.', 'error');
      return;
    }

    let addedCount = 0;
    for (const item of availableItems) {
      try {
        cartContext.addItem(
          {
            id: item.productId,
            name: item.name,
            desc: '',
            prices: [{ label: item.variantLabel || '', price: String(item.baseUnitPrice) }],
          } as any,
          item.variantIndex || 0,
          item.quantity || 1,
          item.selectedOptions || [],
          [],
          item.notes
        );
        addedCount++;
      } catch {}
    }

    setReorderModalOrder(null);
    setReorderResult(null);
    cartContext.openCart();
    showToast(
      isAr
        ? `تمت إضافة ${addedCount} صنف إلى سلة الطلبات بنجاح!`
        : `Added ${addedCount} items to your cart!`,
      'success'
    );
  };

  // Favorites Handlers
  const handleRemoveFavorite = async (productId: string) => {
    try {
      await fetch(`/api/customer/favorites?productId=${productId}`, { method: 'DELETE' });
      setFavorites((prev) => prev.filter((f) => f.productId !== productId));
      showToast(isAr ? 'تمت إزالة المنتج من المفضلة' : 'Removed from favorites', 'info');
    } catch {}
  };

  const handleAddFavoriteToCart = (fav: CustomerFavoriteItem) => {
    if (!cartContext) return;
    cartContext.addItem(
      {
        id: fav.productId,
        name: fav.product?.nameAr || 'منتج',
        desc: '',
        prices: [{ label: '', price: '0' }],
      } as any,
      0,
      1
    );
    cartContext.openCart();
    showToast(isAr ? `تمت إضافة ${fav.product?.nameAr} إلى السلة` : 'Added to cart', 'success');
  };

  // Notifications Handlers
  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch('/api/customer/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
      showToast(isAr ? 'تم تحديد جميع الإشعارات كمقروءة' : 'All marked as read', 'success');
    } catch {}
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  // --------------------------------------------------------------------------
  // Render: Guest Phone Login State (When not authenticated)
  // --------------------------------------------------------------------------
  if (!authenticated) {
    return (
      <div className="hub-container">
        <header className="hub-top-header">
          <Link href={`/${locale}`} className="hub-back-nav">
            <span>{isAr ? '←' : '→'}</span>
            <span>{isAr ? 'العودة لتصفح المنيو' : 'Back to Menu'}</span>
          </Link>
          <h1 className="hub-brand-title">{isAr ? 'مركز العميل | قرية الناقر' : 'Customer Hub | Al Naqer'}</h1>
        </header>

        <section className="hub-auth-box">
          <div className="hub-auth-icon">📱</div>
          <h2>{isAr ? 'تسجيل الدخول والوصول لحسابك' : 'Access Your Customer Account'}</h2>
          <p>
            {isAr
              ? 'أدخل رقم هاتفك المسجل للوصول الفوري لطلباتك وعناوينك والمفضلة بدون الحاجة لكلمة مرور.'
              : 'Enter your registered phone number to manage your orders, addresses, and favorites securely.'}
          </p>

          {loginStep === 'phone' ? (
            <form onSubmit={handleRequestLoginOtp} className="hub-auth-form">
              <label htmlFor="loginPhoneInput">{isAr ? 'رقم الهاتف المصري' : 'Egyptian Phone Number'}</label>
              <div className="hub-auth-row">
                <input
                  id="loginPhoneInput"
                  type="tel"
                  placeholder="01024994092"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  required
                  dir="ltr"
                  className="hub-input"
                />
                <button type="submit" disabled={loginLoading} className="hub-btn hub-btn-primary">
                  {loginLoading ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'متابعة ←' : 'Continue →')}
                </button>
              </div>
              {loginError && <p className="hub-error-msg">{loginError}</p>}
            </form>
          ) : (
            <form onSubmit={handleVerifyLoginOtp} className="hub-auth-form">
              <label htmlFor="loginCodeInput">
                {isAr ? `أدخل رمز التحقق المرسل لرقم ${loginPhone}` : `Enter verification code for ${loginPhone}`}
              </label>
              {debugOtpCode && (
                <div className="hub-otp-hint">
                  {isAr ? 'رمز التحقق التجريبي:' : 'Verification Code:'} <strong>{debugOtpCode}</strong>
                </div>
              )}
              <div className="hub-auth-row">
                <input
                  id="loginCodeInput"
                  type="text"
                  placeholder="1234"
                  maxLength={6}
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  required
                  dir="ltr"
                  className="hub-input code-input"
                  autoFocus
                />
                <button type="submit" disabled={loginLoading} className="hub-btn hub-btn-primary">
                  {loginLoading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'تأكيد ودخول' : 'Confirm')}
                </button>
              </div>
              {loginError && <p className="hub-error-msg">{loginError}</p>}
              <button
                type="button"
                onClick={() => { setLoginStep('phone'); setLoginError(null); }}
                className="hub-btn-link"
              >
                {isAr ? 'تغيير رقم الهاتف' : 'Change Phone'}
              </button>
            </form>
          )}
        </section>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Render: Authenticated Customer Hub
  // --------------------------------------------------------------------------
  return (
    <div className="hub-container">
      {/* Toast Alert */}
      {toastMsg && (
        <aside aria-label="Alert" className={`hub-toast-banner ${toastMsg.type}`}>
          <span>{toastMsg.text}</span>
          <button type="button" aria-label={isAr ? "إغلاق التنبيه" : "Dismiss alert"} onClick={() => setToastMsg(null)}>✕</button>
        </aside>
      )}

      {/* Top Header */}
      <header className="hub-top-header">
        <div className="hub-header-left">
          <Link href={`/${locale}`} className="hub-back-nav">
            <span>{isAr ? '←' : '→'}</span>
            <span>{isAr ? 'العودة لتصفح المنيو' : 'Back to Menu'}</span>
          </Link>
          <h1 className="hub-brand-title">{isAr ? 'مركز العميل' : 'Customer Hub'}</h1>
        </div>

        <div className="hub-header-user">
          <div className="hub-user-chip">
            <span className="user-avatar">👤</span>
            <div className="user-meta">
              <strong>{customer?.name || (isAr ? 'عميل قرية الناقر' : 'Valued Customer')}</strong>
              <small dir="ltr">{customer?.phone}</small>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="hub-logout-btn" title={isAr ? 'تسجيل الخروج' : 'Log out'}>
            {isAr ? 'خروج' : 'Exit'}
          </button>
        </div>
      </header>

      {/* Customer Hub Navigation Tabs */}
      <nav aria-label="Customer Hub Navigation" className="hub-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`hub-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <span>📊</span>
          <span>{isAr ? 'نظرة عامة' : 'Overview'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`hub-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
        >
          <span>📦</span>
          <span>{isAr ? 'طلباتي' : 'My Orders'}</span>
          {activeOrders.length > 0 && <span className="tab-badge pulse">{activeOrders.length}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`hub-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <span>👤</span>
          <span>{isAr ? 'بياناتي' : 'Profile'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('addresses')}
          className={`hub-tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
        >
          <span>📍</span>
          <span>{isAr ? 'عناويني' : 'Addresses'}</span>
          {addresses.length > 0 && <span className="tab-badge">{addresses.length}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('favorites')}
          className={`hub-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
        >
          <span>❤️</span>
          <span>{isAr ? 'المفضلة' : 'Favorites'}</span>
          {favorites.length > 0 && <span className="tab-badge">{favorites.length}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`hub-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
        >
          <span>🔔</span>
          <span>{isAr ? 'الإشعارات' : 'Notifications'}</span>
          {unreadNotifCount > 0 && <span className="tab-badge red">{unreadNotifCount}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          className={`hub-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
        >
          <span>💳</span>
          <span>{isAr ? 'المحفظة' : 'Wallet'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('install')}
          className={`hub-tab-btn ${activeTab === 'install' ? 'active' : ''}`}
        >
          <span>📲</span>
          <span>{isAr ? 'تثبيت التطبيق' : 'App'}</span>
        </button>
      </nav>

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW (نظرة عامة) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <section aria-labelledby="hub-welcome-heading" className="hub-tab-content">
          {/* Welcome Card */}
          <div className="hub-welcome-banner">
            <div className="welcome-text">
              <h2 id="hub-welcome-heading">
                {isAr ? `أهلاً بيك 👋 ${customer?.name ? customer.name : ''}` : `Welcome 👋 ${customer?.name || ''}`}
              </h2>
              <p>
                {isAr
                  ? 'كل طلباتك، ومتابعتها الحية، وتفاصيل حسابك مع قرية الناقر في مكان واحد موحد.'
                  : 'All your orders, real-time tracking, and account details in one unified hub.'}
              </p>
            </div>
            <Link href={`/${locale}`} className="hub-cta-btn">
              <span>🍽️</span>
              <span>{isAr ? 'تصفح قائمة الطعام' : 'Browse Menu'}</span>
            </Link>
          </div>

          {/* Current Order Spotlight */}
          <div className="hub-spotlight-card">
            <div className="spotlight-header">
              <h3>
                <span className="live-dot"></span>
                <span>{isAr ? 'الطلب النشط حالياً' : 'Current Active Order'}</span>
              </h3>
              {latestActiveOrder && (
                <span className="spotlight-order-num">#{latestActiveOrder.orderNumber}</span>
              )}
            </div>

            {latestActiveOrder ? (
              <div className="spotlight-body">
                <div className="spotlight-details">
                  <div className="spotlight-meta-row">
                    <span className="label">{isAr ? 'حالة الطلب:' : 'Status:'}</span>
                    <span className="val badge-val" style={{ color: statusMeta[latestActiveOrder.status]?.color }}>
                      {statusMeta[latestActiveOrder.status]?.icon} {statusMeta[latestActiveOrder.status]?.label}
                    </span>
                  </div>
                  <div className="spotlight-meta-row">
                    <span className="label">{isAr ? 'الفرع:' : 'Branch:'}</span>
                    <span className="val">{latestActiveOrder.branchNameAr || latestActiveOrder.branchNameEn}</span>
                  </div>
                  <div className="spotlight-meta-row">
                    <span className="label">{isAr ? 'الإجمالي:' : 'Total:'}</span>
                    <span className="val total">{latestActiveOrder.total} {latestActiveOrder.currency || 'ج.م'}</span>
                  </div>
                </div>

                <div className="spotlight-timeline-wrap">
                  <OrderTrackingTimeline
                    orderNumber={latestActiveOrder.orderNumber}
                    token={latestActiveOrder.verificationToken}
                    initialStatus={latestActiveOrder.status}
                    locale={locale}
                  />
                </div>

                <div className="spotlight-actions">
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="hub-btn hub-btn-primary"
                  >
                    <span>📦</span>
                    <span>{isAr ? 'متابعة الطلب في قائمة طلباتي' : 'View in My Orders'}</span>
                  </button>
                  <Link
                    href={`/${locale}/receipt/${latestActiveOrder.orderNumber}?token=${encodeURIComponent(latestActiveOrder.verificationToken)}`}
                    className="hub-btn hub-btn-secondary"
                  >
                    <span>🧾</span>
                    <span>{isAr ? 'عرض الفاتورة' : 'View Receipt'}</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="spotlight-empty">
                <span className="empty-emoji">🍽️</span>
                <h4>{isAr ? 'مفيش طلبات نشطة حالياً' : 'No Active Orders Currently'}</h4>
                <p>
                  {isAr
                    ? 'جميع طلباتك السابقة مكتملة بنجاح، أو يمكنك تصفح قائمة الطعام وطلب وجبتك المفضلة الآن!'
                    : 'All previous orders have been completed. Browse our menu to enjoy your favorite meal!'}
                </p>
                <Link href={`/${locale}`} className="hub-btn hub-btn-primary">
                  {isAr ? 'اطلب الآن من المنيو ←' : 'Order Now From Menu →'}
                </Link>
              </div>
            )}
          </div>

          {/* Customer Real Insights (Zero Mock Data) */}
          <div className="hub-insights-grid">
            <div className="insight-card" onClick={() => setActiveTab('orders')} role="button" tabIndex={0}>
              <span className="insight-icon">📦</span>
              <div className="insight-info">
                <strong>{orders.length}</strong>
                <span>{isAr ? 'إجمالي الطلبات' : 'Total Orders'}</span>
              </div>
            </div>

            <div className="insight-card" onClick={() => setActiveTab('orders')} role="button" tabIndex={0}>
              <span className="insight-icon">🎉</span>
              <div className="insight-info">
                <strong>{previousOrders.length}</strong>
                <span>{isAr ? 'طلبات سابقة مكتملة' : 'Completed Orders'}</span>
              </div>
            </div>

            <div className="insight-card" onClick={() => setActiveTab('addresses')} role="button" tabIndex={0}>
              <span className="insight-icon">📍</span>
              <div className="insight-info">
                <strong>{addresses.length}</strong>
                <span>{isAr ? 'عناوين مسجلة' : 'Saved Addresses'}</span>
              </div>
            </div>

            <div className="insight-card" onClick={() => setActiveTab('favorites')} role="button" tabIndex={0}>
              <span className="insight-icon">❤️</span>
              <div className="insight-info">
                <strong>{favorites.length}</strong>
                <span>{isAr ? 'وجبات مفضلة' : 'Favorite Meals'}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 2: MY ORDERS & LIVE TRACKING (طلباتي) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'orders' && (
        <section aria-labelledby="hub-orders-heading" className="hub-tab-content">
          <div className="hub-section-top">
            <h2 id="hub-orders-heading">
              <span>📦</span>
              <span>{isAr ? 'إدارة ومتابعة الطلبات' : 'Orders & Live Tracking'}</span>
            </h2>
            <Link href={`/${locale}`} className="hub-btn hub-btn-sm">
              <span>➕</span>
              <span>{isAr ? 'طلب جديد' : 'New Order'}</span>
            </Link>
          </div>

          {/* Active Orders */}
          <div className="orders-group-block">
            <h3 className="group-heading">
              <span className="live-dot"></span>
              <span>{isAr ? 'الطلبات النشطة الحالية' : 'Active Orders'}</span>
              <span className="count-pill">{activeOrders.length}</span>
            </h3>

            {activeOrders.length === 0 ? (
              <div className="hub-empty-card mini">
                <p>{isAr ? 'لا توجد طلبات نشطة قيد التنفيذ الآن.' : 'No active orders in progress.'}</p>
              </div>
            ) : (
              <div className="active-orders-stack">
                {activeOrders.map((ord) => {
                  const meta = statusMeta[ord.status];
                  return (
                    <article key={ord.orderNumber} className="hub-active-card">
                      <div className="card-top">
                        <div className="card-id-block">
                          <span className="card-order-num">#{ord.orderNumber}</span>
                          <span className="card-type-tag">
                            {ord.type === 'DELIVERY' ? (isAr ? '🚚 توصيل' : '🚚 Delivery') : (isAr ? '🏢 استلام' : '🏢 Pickup')}
                          </span>
                        </div>
                        <div className="status-badge" style={{ backgroundColor: `${meta?.color}22`, color: meta?.color, borderColor: `${meta?.color}44` }}>
                          <span>{meta?.icon}</span>
                          <span>{meta?.label}</span>
                        </div>
                      </div>

                      <div className="card-timeline-box">
                        <OrderTrackingTimeline
                          orderNumber={ord.orderNumber}
                          token={ord.verificationToken}
                          initialStatus={ord.status}
                          locale={locale}
                        />
                      </div>

                      <div className="card-details-box">
                        <div className="row">
                          <span className="lbl">{isAr ? 'تاريخ الطلب:' : 'Date:'}</span>
                          <span className="val">{formatDate(ord.createdAt)}</span>
                        </div>
                        <div className="row">
                          <span className="lbl">{isAr ? 'الفرع:' : 'Branch:'}</span>
                          <span className="val">{ord.branchNameAr || ord.branchNameEn}</span>
                        </div>
                        <div className="row">
                          <span className="lbl">{isAr ? 'الأصناف:' : 'Items:'}</span>
                          <span className="val items">{ord.items.map((i) => `${i.productName} (${i.quantity})`).join('، ')}</span>
                        </div>
                        <div className="row total-row">
                          <span className="lbl">{isAr ? 'المجموع الإجمالي:' : 'Total:'}</span>
                          <span className="val total">{ord.total} {ord.currency || 'ج.م'}</span>
                        </div>
                      </div>

                      <div className="card-actions-row">
                        <Link
                          href={`/${locale}/receipt/${ord.orderNumber}?token=${encodeURIComponent(ord.verificationToken)}`}
                          className="hub-btn hub-btn-secondary"
                        >
                          <span>🧾</span>
                          <span>{isAr ? 'عرض الفاتورة والإيصال' : 'View Receipt'}</span>
                        </Link>
                        {ord.whatsappUrl && (
                          <a
                            href={ord.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hub-btn hub-btn-whatsapp"
                          >
                            <span>💬</span>
                            <span>{isAr ? 'مراسلة الفرع' : 'WhatsApp'}</span>
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Previous Orders & Smart Reorder */}
          <div className="orders-group-block">
            <h3 className="group-heading">
              <span>📜</span>
              <span>{isAr ? 'سجل الطلبات السابقة' : 'Previous Orders History'}</span>
              <span className="count-pill subtle">{previousOrders.length}</span>
            </h3>

            {previousOrders.length === 0 ? (
              <div className="hub-empty-card mini">
                <p>{isAr ? 'لا توجد طلبات سابقة مكتملة حتى الآن.' : 'No previous orders completed yet.'}</p>
              </div>
            ) : (
              <div className="previous-orders-stack">
                {previousOrders.map((ord) => {
                  const meta = statusMeta[ord.status];
                  const itemCount = ord.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <article key={ord.orderNumber} className="hub-prev-card">
                      <div className="prev-main-col">
                        <div className="prev-head-line">
                          <span className="prev-num">#{ord.orderNumber}</span>
                          <span className="prev-date">{formatDate(ord.createdAt)}</span>
                        </div>

                        <div className="prev-summary-line">
                          <span className="badge-tag">{itemCount} {isAr ? 'أصناف' : 'items'}</span>
                          <span className="items-list">
                            {ord.items.slice(0, 3).map((it) => it.productName).join('، ')}
                            {ord.items.length > 3 && (isAr ? ' ...وغيرها' : ' ...')}
                          </span>
                        </div>

                        <div className="prev-price-line">
                          <strong className="price-val">{ord.total} {ord.currency || 'ج.م'}</strong>
                          <span className="status-pill" style={{ color: meta?.color, backgroundColor: `${meta?.color}15` }}>
                            {meta?.icon} {meta?.label}
                          </span>
                        </div>
                      </div>

                      <div className="prev-actions-col">
                        <button
                          type="button"
                          onClick={() => handleInitiateReorder(ord)}
                          className="hub-btn hub-btn-reorder"
                        >
                          <span>🔄</span>
                          <span>{isAr ? 'إعادة الطلب' : 'Reorder'}</span>
                        </button>
                        <Link
                          href={`/${locale}/receipt/${ord.orderNumber}?token=${encodeURIComponent(ord.verificationToken)}`}
                          className="hub-btn hub-btn-secondary"
                        >
                          <span>🧾</span>
                          <span>{isAr ? 'الفاتورة' : 'Receipt'}</span>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 3: PROFILE & PHONE MANAGEMENT (بياناتي) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'profile' && (
        <section aria-labelledby="hub-profile-heading" className="hub-tab-content">
          <div className="hub-section-top">
            <h2 id="hub-profile-heading">
              <span>👤</span>
              <span>{isAr ? 'الملف الشخصي وإدارة الهاتف' : 'Profile & Identity'}</span>
            </h2>
          </div>

          <div className="hub-profile-card">
            <div className="profile-row">
              <div className="profile-label">
                <strong>{isAr ? 'معرّف العميل الدائم (Customer ID)' : 'Customer ID'}</strong>
                <small>{isAr ? 'المعرّف الثابت لحسابك في قرية الناقر (غير قابل للتغيير ويرتبط به كل تاريخك)' : 'Persistent immutable ID'}</small>
              </div>
              <div className="profile-value id-badge">
                <code>{customer?.id}</code>
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-label">
                <strong>{isAr ? 'الاسم المسجل' : 'Customer Name'}</strong>
              </div>
              <div className="profile-value">
                <span>{customer?.name || (isAr ? 'عميل قرية الناقر' : 'Valued Customer')}</span>
              </div>
            </div>

            <div className="profile-row highlight">
              <div className="profile-label">
                <strong>{isAr ? 'رقم الهاتف المسجل' : 'Phone Number'}</strong>
                <small>{isAr ? 'الرقم المستخدم لتأكيد الطلبات واسترجاع الحساب' : 'Used for verification & login'}</small>
              </div>
              <div className="profile-value phone-wrap">
                <span dir="ltr" className="phone-num">{customer?.phone}</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewPhoneInput('');
                    setPhoneChangeCode('');
                    setPhoneChangeStep('phone');
                    setPhoneChangeError(null);
                    setShowPhoneModal(true);
                  }}
                  className="hub-btn hub-btn-secondary"
                >
                  <span>✏️</span>
                  <span>{isAr ? 'تغيير رقم الهاتف' : 'Change Phone'}</span>
                </button>
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-label">
                <strong>{isAr ? 'تاريخ أول تعامل / التسجيل' : 'Registered Since'}</strong>
              </div>
              <div className="profile-value">
                <span>{formatDate(customer?.createdAt)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 4: SAVED ADDRESSES (عناويني) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'addresses' && (
        <section aria-labelledby="hub-addresses-heading" className="hub-tab-content">
          <div className="hub-section-top">
            <h2 id="hub-addresses-heading">
              <span>📍</span>
              <span>{isAr ? 'عناوين التوصيل المحفوظة' : 'Saved Delivery Addresses'}</span>
            </h2>
            <button
              type="button"
              onClick={handleOpenAddAddress}
              className="hub-btn hub-btn-primary"
            >
              <span>➕</span>
              <span>{isAr ? 'إضافة عنوان جديد' : 'Add New Address'}</span>
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="hub-empty-card">
              <span className="empty-emoji">📍</span>
              <h4>{isAr ? 'لا توجد عناوين محفوظة بعد' : 'No Saved Addresses Yet'}</h4>
              <p>
                {isAr
                  ? 'احفظ عنوانك المفضل (المنزل، العمل) لتحديده بنقرة واحدة عند إتمام أي طلب توصيل قادم.'
                  : 'Save your preferred address to autofill during checkout.'}
              </p>
              <button type="button" onClick={handleOpenAddAddress} className="hub-btn hub-btn-primary">
                {isAr ? 'إضافة عنوان الآن' : 'Add Address Now'}
              </button>
            </div>
          ) : (
            <div className="hub-addresses-grid">
              {addresses.map((addr) => (
                <article key={addr.id} className={`address-card ${addr.isDefault ? 'is-default' : ''}`}>
                  <div className="addr-card-top">
                    <div className="addr-label-wrap">
                      <span className="addr-icon">📍</span>
                      <strong>{addr.label}</strong>
                      {addr.isDefault && <span className="default-pill">{isAr ? 'الافتراضي' : 'Default'}</span>}
                    </div>
                    <div className="addr-card-actions">
                      <button
                        type="button"
                        onClick={() => handleOpenEditAddress(addr)}
                        className="icon-action-btn"
                        title={isAr ? 'تعديل' : 'Edit'}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="icon-action-btn danger"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <p className="addr-street">
                    {[addr.city, addr.area, addr.street].filter(Boolean).join(' • ')}
                  </p>

                  {(addr.building || addr.floor || addr.apartment) && (
                    <p className="addr-details">
                      {[
                        addr.building && `${isAr ? 'مبنى' : 'Bldg'} ${addr.building}`,
                        addr.floor && `${isAr ? 'طابق' : 'Floor'} ${addr.floor}`,
                        addr.apartment && `${isAr ? 'شقة' : 'Apt'} ${addr.apartment}`,
                      ].filter(Boolean).join(' • ')}
                    </p>
                  )}

                  {addr.notes && <p className="addr-notes">💬 {addr.notes}</p>}

                  {!addr.isDefault && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-subtle, #333)' }}>
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="hub-btn hub-btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                      >
                        {isAr ? '☆ تعيين كعنوان افتراضي' : '☆ Set as Default'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 5: FAVORITES (المفضلة) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'favorites' && (
        <section aria-labelledby="hub-favorites-heading" className="hub-tab-content">
          <div className="hub-section-top">
            <h2 id="hub-favorites-heading">
              <span>❤️</span>
              <span>{isAr ? 'الوجبات المفضلة' : 'Favorite Meals'}</span>
            </h2>
          </div>

          {favorites.length === 0 ? (
            <div className="hub-empty-card">
              <span className="empty-emoji">❤️</span>
              <h4>{isAr ? 'قائمة المفضلة فارغة حالياً' : 'No Favorites Yet'}</h4>
              <p>
                {isAr
                  ? 'تصفح قائمة الطعام واضغط على أيقونة القلب لحفظ وجباتك المفضلة وسهولة طلبها دائماً!'
                  : 'Browse the menu and click the heart icon on your favorite dishes.'}
              </p>
              <Link href={`/${locale}`} className="hub-btn hub-btn-primary">
                {isAr ? 'تصفح قائمة الطعام والوجبات ←' : 'Browse Menu Meals →'}
              </Link>
            </div>
          ) : (
            <div className="hub-favorites-grid">
              {favorites.map((fav) => (
                <article key={fav.id} className="fav-item-card">
                  <div className="fav-info">
                    <strong>{fav.product?.nameAr || 'منتج'}</strong>
                    {fav.product?.badge && <span className="fav-badge">{fav.product.badge}</span>}
                    {!fav.product?.isAvailable && (
                      <span className="fav-unavailable">{isAr ? 'غير متاح مؤقتاً' : 'Temporarily Unavailable'}</span>
                    )}
                  </div>
                  <div className="fav-actions">
                    <button
                      type="button"
                      disabled={!fav.product?.isAvailable}
                      onClick={() => handleAddFavoriteToCart(fav)}
                      className="hub-btn hub-btn-primary"
                    >
                      <span>🛒</span>
                      <span>{isAr ? 'أضف للسلة' : 'Add to Cart'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(fav.productId)}
                      className="hub-btn hub-btn-secondary"
                      title={isAr ? 'إزالة' : 'Remove'}
                    >
                      <span>✕</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 6: NOTIFICATIONS (الإشعارات الحقيقية) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'notifications' && (
        <section aria-labelledby="hub-notifications-heading" className="hub-tab-content">
          <div className="hub-section-top">
            <h2 id="hub-notifications-heading">
              <span>🔔</span>
              <span>{isAr ? 'مركز الإشعارات المباشرة' : 'Notifications Center'}</span>
            </h2>
            {unreadNotifCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllNotificationsRead}
                className="hub-btn hub-btn-secondary"
              >
                <span>✓</span>
                <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}</span>
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="hub-empty-card mini">
              <span className="empty-emoji">🔔</span>
              <h4>{isAr ? 'لا توجد إشعارات حالياً' : 'No Notifications'}</h4>
              <p>{isAr ? 'ستصلك هنا إشعارات فورية بكل تحديث يطرأ على طلباتك من المطعم.' : 'You will receive real-time updates regarding your orders here.'}</p>
            </div>
          ) : (
            <div className="hub-notifications-list">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${notif.isRead ? 'read' : 'unread'}`}
                  onClick={() => {
                    if (notif.orderNumber) {
                      setActiveTab('orders');
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="notif-icon">
                    {notif.type === 'ORDER_STATUS' ? '📦' : '🔔'}
                  </div>
                  <div className="notif-content">
                    <div className="notif-title-row">
                      <strong>{notif.title}</strong>
                      <span className="notif-time">{formatDate(notif.createdAt)}</span>
                    </div>
                    <p>{notif.message}</p>
                    {notif.orderNumber && (
                      <span className="notif-order-link">
                        {isAr ? `انقر لمتابعة الطلب #${notif.orderNumber} ←` : `Track Order #${notif.orderNumber} →`}
                      </span>
                    )}
                  </div>
                  {!notif.isRead && <span className="unread-dot"></span>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 7: WALLET (المحفظة - بيان الحقيقة الصارم) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'wallet' && (
        <section aria-labelledby="hub-wallet-heading" className="hub-tab-content">
          <div className="hub-section-top">
            <h2 id="hub-wallet-heading">
              <span>💳</span>
              <span>{isAr ? 'المحفظة الرقمية ورصيد الحساب' : 'Digital Wallet'}</span>
            </h2>
          </div>

          <div className="hub-wallet-card">
            <span className="wallet-badge">🔒 {isAr ? 'قيد التجهيز المالي' : 'Coming Soon'}</span>
            <h3>{isAr ? 'المحفظة الرقمية ورصيد المكافآت' : 'Digital Wallet & Cashback'}</h3>
            <p>
              {isAr
                ? 'خدمة المحفظة الإلكترونية والرصيد مسبق الدفع قيد التجهيز مع مزودي خدمات الدفع الإلكتروني المعتمدين في مصر. لن يتم عرض أي رصيد وهمي حفاظاً على الموثوقية التامة والأمان المالي.'
                : 'Digital wallet ledger is currently in integration with certified payment gateways in Egypt. No mock or fake balances are displayed.'}
            </p>
            <div className="wallet-methods-info">
              <strong>{isAr ? 'طرق الدفع المدعومة حالياً بكل أمان:' : 'Supported Payment Methods:'}</strong>
              <ul>
                <li>💵 {isAr ? 'الدفع نقداً عند استلام الطلب من المندوب أو بالفرع (Cash on Delivery).' : 'Cash on Delivery.'}</li>
                <li>💳 {isAr ? 'الدفع عبر بطاقات الخصم المباشر والائتمان بنقاط البيع المحمولة مع المندوب.' : 'POS Card on Delivery.'}</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 8: INSTALL APP (تثبيت التطبيق) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'install' && (
        <section aria-labelledby="hub-install-heading" className="hub-tab-content">
          <div className="hub-section-top">
            <h2 id="hub-install-heading">
              <span>📲</span>
              <span>{isAr ? 'تثبيت تطبيق قرية الناقر' : 'Install Naqer App'}</span>
            </h2>
          </div>

          <div className="hub-install-card">
            <div className="install-icon">⚡</div>
            <h3>{isAr ? 'تجربة أسرع بدون تحميل من المتاجر' : 'Fast PWA App Experience'}</h3>
            <p>
              {isAr
                ? 'قم بتثبيت التطبيق على شاشة هاتفك الرئيسية للوصول الفوري للمنيو والطلب بنقرة واحدة مع توفير استهلاك الإنترنت.'
                : 'Install Naqer Menu app to your home screen for quick access and offline caching.'}
            </p>

            {isAppInstalled ? (
              <div className="install-done-badge">
                <span>✅</span>
                <span>{isAr ? 'التطبيق مثبت بالفعل على جهازك!' : 'App is already installed!'}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallApp}
                className="hub-btn hub-btn-primary hub-btn-lg"
              >
                <span>📲</span>
                <span>{isAr ? 'تثبيت التطبيق على الشاشة الرئيسية' : 'Install to Home Screen'}</span>
              </button>
            )}

            <div className="ios-install-instructions">
              <h4>{isAr ? 'لمستخدمي أجهزة آبل (iPhone / iPad):' : 'For iPhone & iPad Users:'}</h4>
              <ol>
                <li>{isAr ? 'اضغط على زر المشاركة (Share) في أسفل متصفح Safari.' : 'Tap Share in Safari.'}</li>
                <li>{isAr ? 'اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).' : 'Select "Add to Home Screen".'}</li>
                <li>{isAr ? 'اضغط "إضافة" (Add) في الزاوية العلوية.' : 'Tap "Add".'}</li>
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 1: CHANGE PHONE (تغيير رقم الهاتف) */}
      {/* -------------------------------------------------------------------- */}
      {showPhoneModal && (
        <div className="hub-modal-backdrop" onClick={() => setShowPhoneModal(false)}>
          <div className="hub-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isAr ? 'تغيير رقم الهاتف المسجل' : 'Change Phone Number'}</h3>
              <button type="button" onClick={() => setShowPhoneModal(false)} className="close-btn">✕</button>
            </div>

            <div className="modal-body">
              <div className="current-phone-chip">
                <span>{isAr ? 'رقم الهاتف الحالي:' : 'Current Phone:'}</span>
                <strong dir="ltr">{customer?.phone}</strong>
              </div>

              {phoneChangeStep === 'phone' ? (
                <form onSubmit={handleRequestPhoneChangeOtp} className="modal-form">
                  <label htmlFor="newPhoneInput">{isAr ? 'أدخل رقم الهاتف المصري الجديد' : 'New Egyptian Phone'}</label>
                  <input
                    id="newPhoneInput"
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    required
                    dir="ltr"
                    className="hub-input"
                  />
                  <p className="form-hint">{isAr ? 'سيتم إرسال رمز تحقق سريع للرقم الجديد للتأكد من ملكيتك له.' : 'Verification code will be sent to the new phone.'}</p>
                  {phoneChangeError && <p className="hub-error-msg">{phoneChangeError}</p>}
                  <div className="modal-actions">
                    <button type="button" onClick={() => setShowPhoneModal(false)} className="hub-btn hub-btn-secondary">
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button type="submit" disabled={phoneChangeLoading} className="hub-btn hub-btn-primary">
                      {phoneChangeLoading ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال الرمز ←' : 'Send Code →')}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneChange} className="modal-form">
                  <label htmlFor="otpChangeInput">
                    {isAr ? `أدخل رمز التحقق المرسل للرقم ${newPhoneInput}` : `Enter code sent to ${newPhoneInput}`}
                  </label>
                  {phoneDebugCode && (
                    <div className="hub-otp-hint">
                      {isAr ? 'رمز التحقق التجريبي:' : 'Verification Code:'} <strong>{phoneDebugCode}</strong>
                    </div>
                  )}
                  <input
                    id="otpChangeInput"
                    type="text"
                    placeholder="1234"
                    maxLength={6}
                    value={phoneChangeCode}
                    onChange={(e) => setPhoneChangeCode(e.target.value)}
                    required
                    dir="ltr"
                    className="hub-input code-input"
                    autoFocus
                  />
                  {phoneChangeError && <p className="hub-error-msg">{phoneChangeError}</p>}
                  <div className="modal-actions">
                    <button
                      type="button"
                      onClick={() => { setPhoneChangeStep('phone'); setPhoneChangeError(null); }}
                      className="hub-btn hub-btn-secondary"
                    >
                      {isAr ? 'تعديل الرقم' : 'Edit Phone'}
                    </button>
                    <button type="submit" disabled={phoneChangeLoading} className="hub-btn hub-btn-primary">
                      {phoneChangeLoading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'تأكيد وتحديث' : 'Confirm')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 2: ADD / EDIT ADDRESS (إضافة أو تعديل عنوان) */}
      {/* -------------------------------------------------------------------- */}
      {showAddressModal && (
        <div className="hub-modal-backdrop" onClick={() => setShowAddressModal(false)}>
          <div className="hub-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAddressId ? (isAr ? 'تعديل العنوان' : 'Edit Address') : (isAr ? 'إضافة عنوان توصيل جديد' : 'Add Delivery Address')}</h3>
              <button type="button" onClick={() => setShowAddressModal(false)} className="close-btn">✕</button>
            </div>

            <form onSubmit={handleSaveAddress} className="modal-form">
              <label htmlFor="addrLabelSelect">{isAr ? 'اسم العنوان (مثال: المنزل، العمل)' : 'Address Label'}</label>
              <input
                id="addrLabelSelect"
                type="text"
                placeholder={isAr ? 'المنزل' : 'Home'}
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                required
                className="hub-input"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label htmlFor="addrCityInput">{isAr ? 'المدينة / المحافظة' : 'City'}</label>
                  <input
                    id="addrCityInput"
                    type="text"
                    placeholder={isAr ? 'مثال: المنصورة، جمصة' : 'e.g. Mansoura, Gamasa'}
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    className="hub-input"
                  />
                </div>
                <div>
                  <label htmlFor="addrAreaInput">{isAr ? 'المنطقة / الحي' : 'Area / District'}</label>
                  <input
                    id="addrAreaInput"
                    type="text"
                    placeholder={isAr ? 'مثال: المركزية، جامعة الدلتا' : 'e.g. Central Dist'}
                    value={addressArea}
                    onChange={(e) => setAddressArea(e.target.value)}
                    className="hub-input"
                  />
                </div>
              </div>

              <label htmlFor="addrStreetInput">{isAr ? 'الشارع بالتفصيل والعلامات المميزة *' : 'Street & Landmarks *'}</label>
              <textarea
                id="addrStreetInput"
                placeholder={isAr ? 'اسم الشارع، الحي، العلامات المميزة...' : 'Street name, neighborhood, landmarks...'}
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                required
                rows={2}
                className="hub-input"
              />

              <div className="form-grid-3">
                <div>
                  <label htmlFor="addrBuildingInput">{isAr ? 'رقم المبنى' : 'Building'}</label>
                  <input
                    id="addrBuildingInput"
                    type="text"
                    value={addressBuilding}
                    onChange={(e) => setAddressBuilding(e.target.value)}
                    className="hub-input"
                  />
                </div>
                <div>
                  <label htmlFor="addrFloorInput">{isAr ? 'الطابق' : 'Floor'}</label>
                  <input
                    id="addrFloorInput"
                    type="text"
                    value={addressFloor}
                    onChange={(e) => setAddressFloor(e.target.value)}
                    className="hub-input"
                  />
                </div>
                <div>
                  <label htmlFor="addrAptInput">{isAr ? 'رقم الشقة' : 'Apartment'}</label>
                  <input
                    id="addrAptInput"
                    type="text"
                    value={addressApartment}
                    onChange={(e) => setAddressApartment(e.target.value)}
                    className="hub-input"
                  />
                </div>
              </div>

              <label htmlFor="addrNotesInput">{isAr ? 'ملاحظات إضافية للمندوب' : 'Courier Notes'}</label>
              <input
                id="addrNotesInput"
                type="text"
                placeholder={isAr ? 'مثال: رن الجرس مرتين، كود الباب 1234...' : 'e.g. Ring bell twice...'}
                value={addressNotes}
                onChange={(e) => setAddressNotes(e.target.value)}
                className="hub-input"
              />

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={addressIsDefault}
                  onChange={(e) => setAddressIsDefault(e.target.checked)}
                />
                <span>{isAr ? 'تعيين كعنوان افتراضي لطلبات التوصيل' : 'Set as default delivery address'}</span>
              </label>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddressModal(false)} className="hub-btn hub-btn-secondary">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={addressLoading} className="hub-btn hub-btn-primary">
                  {addressLoading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ العنوان' : 'Save Address')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 3: SMART REORDER (إعادة الطلب الذكية) */}
      {/* -------------------------------------------------------------------- */}
      {reorderModalOrder && (
        <div className="hub-modal-backdrop" onClick={() => setReorderModalOrder(null)}>
          <div className="hub-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isAr ? `إعادة طلب وجبات طلب #${reorderModalOrder.orderNumber}` : `Reorder #${reorderModalOrder.orderNumber}`}</h3>
              <button type="button" onClick={() => setReorderModalOrder(null)} className="close-btn">✕</button>
            </div>

            <div className="modal-body">
              {reorderLoading ? (
                <div className="hub-loading-box">
                  <span>⏳</span>
                  <p>{isAr ? 'جاري فحص توافر المنتجات والأسعار الحالية بالمنيو...' : 'Checking product availability & prices...'}</p>
                </div>
              ) : reorderResult ? (
                <div className="reorder-result-box">
                  {/* Available Items */}
                  <h4>{isAr ? 'الأصناف المتوفرة للإضافة:' : 'Available Items:'}</h4>
                  <ul className="reorder-items-list">
                    {reorderResult.availableItems.map((it: any, i: number) => (
                      <li key={i}>
                        <span>{it.name} ({it.quantity})</span>
                        <strong>{it.unitPrice * it.quantity} ج.م</strong>
                      </li>
                    ))}
                  </ul>

                  {/* Unavailable Warnings */}
                  {reorderResult.unavailableItems.length > 0 && (
                    <div className="reorder-warning-box">
                      <strong>⚠️ {isAr ? 'أصناف غير متوفرة حالياً بالفرع:' : 'Currently Unavailable:'}</strong>
                      <ul>
                        {reorderResult.unavailableItems.map((un, i) => (
                          <li key={i}>{un.productName}: {un.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Price Changes */}
                  {reorderResult.priceChanges.length > 0 && (
                    <div className="reorder-info-box">
                      <strong>ℹ️ {isAr ? 'تحديثات في الأسعار الحالية:' : 'Price Updates:'}</strong>
                      <ul>
                        {reorderResult.priceChanges.map((pc, i) => (
                          <li key={i}>{pc.productName}: السعر الحالي {pc.currentPrice} ج.م (كان {pc.oldPrice} ج.م)</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="modal-actions">
                    <button type="button" onClick={() => setReorderModalOrder(null)} className="hub-btn hub-btn-secondary">
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={reorderResult.availableItems.length === 0}
                      onClick={handleApplyReorderToCart}
                      className="hub-btn hub-btn-primary"
                    >
                      <span>🛒</span>
                      <span>{isAr ? 'إضافة إلى السلة ومتابعة الطلب' : 'Add to Cart & Checkout'}</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
