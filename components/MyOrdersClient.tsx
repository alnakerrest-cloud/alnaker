'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import type { OrderRecord, OrderStatus } from '@/lib/orders-store';
import OrderTrackingTimeline from '@/components/OrderTrackingTimeline';
import {
  UserIcon,
  ReceiptIcon,
  WhatsAppIcon,
  CloseIcon,
  TruckIcon,
  StoreIcon,
  ClockIcon,
  UtensilsIcon,
  SmartphoneIcon,
} from '@/components/Icons';

interface MyOrdersClientProps {
  locale: Locale;
  initialOrders: OrderRecord[];
  initialAuthenticated: boolean;
  initialCustomerPhone?: string;
  initialCustomerName?: string;
}

const TERMINAL_STATUSES: OrderStatus[] = ['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'];

const STATUS_LABELS_AR: Record<OrderStatus, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: '#64748b' },
  PENDING_WHATSAPP: { label: 'بانتظار الإرسال عبر واتساب', color: '#b45309' },
  CUSTOMER_CONFIRMED_SENT: { label: 'تم الإرسال - بانتظار المراجعة', color: '#1e40af' },
  RECEIVED: { label: 'تم استلام الطلب', color: '#1e40af' },
  CONFIRMED: { label: 'تم تأكيد الطلب', color: '#5c2a26' },
  PREPARING: { label: 'جاري التحضير بالمطعم', color: '#7d3b34' },
  READY: { label: 'جاهز للاستلام', color: '#854d0e' },
  OUT_FOR_DELIVERY: { label: 'خرج للتوصيل مع المندوب', color: '#0369a1' },
  COMPLETED: { label: 'تم التسليم بنجاح', color: '#166534' },
  REJECTED: { label: 'تم الاعتذار عن الطلب', color: '#991b1b' },
  CANCELLED: { label: 'تم إلغاء الطلب', color: '#991b1b' },
  EXPIRED: { label: 'انتهت صلاحية الطلب', color: '#64748b' },
};

const STATUS_LABELS_EN: Record<OrderStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: '#64748b' },
  PENDING_WHATSAPP: { label: 'Pending WhatsApp Dispatch', color: '#b45309' },
  CUSTOMER_CONFIRMED_SENT: { label: 'Sent - Awaiting Review', color: '#1e40af' },
  RECEIVED: { label: 'Order Received', color: '#1e40af' },
  CONFIRMED: { label: 'Order Confirmed', color: '#5c2a26' },
  PREPARING: { label: 'Preparing in Kitchen', color: '#7d3b34' },
  READY: { label: 'Ready for Pickup', color: '#854d0e' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#0369a1' },
  COMPLETED: { label: 'Delivered Successfully', color: '#166534' },
  REJECTED: { label: 'Order Rejected', color: '#991b1b' },
  CANCELLED: { label: 'Order Cancelled', color: '#991b1b' },
  EXPIRED: { label: 'Order Expired', color: '#64748b' },
};

export default function MyOrdersClient({
  locale,
  initialOrders,
  initialAuthenticated,
  initialCustomerPhone,
  initialCustomerName,
}: MyOrdersClientProps) {
  const isAr = locale === 'ar';
  const statusMeta = isAr ? STATUS_LABELS_AR : STATUS_LABELS_EN;

  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [authenticated, setAuthenticated] = useState<boolean>(initialAuthenticated);
  const [customerPhone, setCustomerPhone] = useState<string | undefined>(initialCustomerPhone);
  const [customerName, setCustomerName] = useState<string | undefined>(initialCustomerName);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Phone lookup / OTP state for guest login from another device
  const [showPhoneAuth, setShowPhoneAuth] = useState<boolean>(!initialAuthenticated && initialOrders.length === 0);
  const [authStep, setAuthStep] = useState<'phone' | 'code'>('phone');
  const [inputPhone, setInputPhone] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [debugCodeHint, setDebugCodeHint] = useState<string | null>(null);

  const prevStatusesRef = useRef<Record<string, OrderStatus>>({});

  // Categorize orders
  const activeOrders = orders.filter((o) => !TERMINAL_STATUSES.includes(o.status));
  const previousOrders = orders.filter((o) => TERMINAL_STATUSES.includes(o.status));

  // Initialize previous statuses map
  useEffect(() => {
    const map: Record<string, OrderStatus> = {};
    for (const o of orders) {
      map[o.orderNumber] = o.status;
    }
    prevStatusesRef.current = map;
  }, []);

  // Poll for live status updates if there are active orders
  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/orders', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.authenticated) return;

      const newOrders: OrderRecord[] = [...(data.activeOrders || []), ...(data.previousOrders || [])];

      // Check for transitions to show notification
      for (const newOrd of newOrders) {
        const prevSt = prevStatusesRef.current[newOrd.orderNumber];
        if (prevSt && prevSt !== newOrd.status) {
          const stLabel = statusMeta[newOrd.status]?.label || newOrd.status;
          const msg = isAr
            ? `تحديث للطلب #${newOrd.orderNumber}: أصبح الآن (${stLabel})`
            : `Order #${newOrd.orderNumber} updated to: ${stLabel}`;
          setNotificationMsg(msg);
          setTimeout(() => setNotificationMsg(null), 7000);
        }
      }

      // Update refs & state
      const map: Record<string, OrderStatus> = {};
      for (const o of newOrders) {
        map[o.orderNumber] = o.status;
      }
      prevStatusesRef.current = map;

      setOrders(newOrders);
      setAuthenticated(true);
      if (data.customer?.phone) setCustomerPhone(data.customer.phone);
      if (data.customer?.name) setCustomerName(data.customer.name);

      try {
        localStorage.setItem('naqer_active_orders_count', String(data.activeCount || 0));
      } catch {}
    } catch {}
  }, [isAr, statusMeta]);

  // Polling loop
  useEffect(() => {
    if (activeOrders.length === 0) return;
    const interval = setInterval(refreshOrders, 5000);
    return () => clearInterval(interval);
  }, [activeOrders.length, refreshOrders]);

  // OTP Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    setDebugCodeHint(null);

    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_code', phone: inputPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال رمز التحقق');

      setAuthStep('code');
      if (data.debugCode) {
        setDebugCodeHint(data.debugCode);
      }
    } catch (err: any) {
      setAuthError(err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setAuthLoading(false);
    }
  };

  // OTP Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_code', phone: inputPhone, code: inputCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'رمز التحقق غير صحيح');

      setAuthenticated(true);
      setShowPhoneAuth(false);
      await refreshOrders();
    } catch (err: any) {
      setAuthError(err.message || 'فشل التحقق');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout / clear session
  const handleLogout = async () => {
    try {
      await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {}
    setAuthenticated(false);
    setOrders([]);
    setShowPhoneAuth(true);
    setAuthStep('phone');
    try {
      localStorage.removeItem('naqer_active_orders_count');
      localStorage.removeItem('naqer_customer_phone');
    } catch {}
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="orders-page-wrapper">
      {/* Realtime Notification Toast */}
      {notificationMsg && (
        <aside aria-label="Notification" className="orders-notification-banner">
          <span>{notificationMsg}</span>
          <button type="button" aria-label={isAr ? "إغلاق التنبيه" : "Dismiss alert"} onClick={() => setNotificationMsg(null)}>
            <CloseIcon width={14} height={14} />
          </button>
        </aside>
      )}

      {/* Top Header & Breadcrumb */}
      <div className="orders-page-header">
        <Link href={`/${locale}`} className="orders-back-link">
          <span>{isAr ? '←' : '→'}</span>
          <span>{isAr ? 'العودة لتصفح المنيو' : 'Back to Menu'}</span>
        </Link>
        <h1 className="orders-page-title">{isAr ? 'طلباتي' : 'My Orders'}</h1>
        {authenticated && (
          <div className="orders-customer-chip">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <UserIcon width={14} height={14} />
              <span>{customerName || (isAr ? 'عميل قرية الناقر' : 'Customer')}</span>
            </span>
            {customerPhone && <span dir="ltr">({customerPhone})</span>}
            <button type="button" onClick={handleLogout} className="orders-logout-link" title={isAr ? 'تسجيل الخروج' : 'Log out'}>
              {isAr ? 'خروج' : 'Exit'}
            </button>
          </div>
        )}
      </div>

      {/* Guest Phone Verification Card (When not authenticated) */}
      {showPhoneAuth && !authenticated && (
        <section aria-labelledby="orders-login-card-heading" className="orders-auth-card">
          <div className="orders-auth-icon-circle" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--brand)', border: '1px solid var(--line)' }}>
            <SmartphoneIcon width={28} height={28} />
          </div>
          <h2 id="orders-login-card-heading" className="orders-auth-title">
            {isAr ? 'استعراض ومتابعة طلباتك' : 'Access Your Orders'}
          </h2>
          <p className="orders-auth-desc">
            {isAr
              ? 'إذا قمت بالطلب مسبقاً من هذا الجهاز أو جهاز آخر، أدخل رقم هاتفك المسجل للوصول الفوري إلى طلباتك وتتبعها دون الحاجة لكلمة مرور.'
              : 'Enter your registered phone number to track active orders and view your previous orders securely.'}
          </p>

          {authStep === 'phone' ? (
            <form onSubmit={handleRequestCode} className="orders-auth-form">
              <label htmlFor="customerPhoneInput" className="orders-auth-label">
                {isAr ? 'رقم الهاتف المصري' : 'Egyptian Phone Number'}
              </label>
              <div className="orders-auth-input-group">
                <input
                  id="customerPhoneInput"
                  type="tel"
                  placeholder="01024994092"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  required
                  dir="ltr"
                  className="orders-auth-input"
                />
                <button type="submit" disabled={authLoading} className="orders-auth-submit">
                  {authLoading ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'متابعة' : 'Continue')}
                </button>
              </div>
              {authError && <p className="orders-auth-error">{authError}</p>}
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="orders-auth-form">
              <label htmlFor="customerOtpCodeInput" className="orders-auth-label">
                {isAr ? `أدخل رمز التحقق المرسل لرقم ${inputPhone}` : `Enter verification code sent to ${inputPhone}`}
              </label>
              {debugCodeHint && (
                <div className="orders-auth-hint">
                  {isAr ? 'رمز التحقق التجريبي:' : 'Verification Code:'} <strong>{debugCodeHint}</strong>
                </div>
              )}
              <div className="orders-auth-input-group">
                <input
                  id="customerOtpCodeInput"
                  type="text"
                  placeholder="1234"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  required
                  dir="ltr"
                  className="orders-auth-input code-input"
                  autoFocus
                />
                <button type="submit" disabled={authLoading} className="orders-auth-submit">
                  {authLoading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'تأكيد ودخول' : 'Confirm')}
                </button>
              </div>
              {authError && <p className="orders-auth-error">{authError}</p>}
              <button
                type="button"
                onClick={() => { setAuthStep('phone'); setAuthError(null); }}
                className="orders-auth-back-btn"
              >
                {isAr ? 'تغيير رقم الهاتف' : 'Change phone number'}
              </button>
            </form>
          )}
        </section>
      )}

      {/* Main Content Area */}
      {authenticated && (
        <div className="orders-content-layout">
          {/* Section 1: Active Orders (الطلب الحالي المباشر) */}
          <section className="orders-section active-section">
            <div className="orders-section-header">
              <h2>
                <span className="section-badge-dot"></span>
                <span>{isAr ? 'الطلب الحالي' : 'Active Order'}</span>
                {activeOrders.length > 0 && (
                  <span className="section-count-pill">{activeOrders.length}</span>
                )}
              </h2>
              {activeOrders.length > 0 && (
                <span className="orders-live-indicator">
                  <span className="live-pulse"></span>
                  {isAr ? 'متابعة حية ومباشرة' : 'Live Tracking'}
                </span>
              )}
            </div>

            {activeOrders.length === 0 ? (
              <div className="orders-empty-card">
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', border: '1px solid var(--line)' }}>
                  <UtensilsIcon width={28} height={28} />
                </div>
                <h3>{isAr ? 'لا يوجد طلب حالي قيد التنفيذ' : 'No Active Orders'}</h3>
                <p>
                  {isAr
                    ? 'جميع طلباتك السابقة تم تسليمها بنجاح أو يمكنك تصفح قائمة الطعام وطلب وجبتك المفضلة الآن!'
                    : 'All previous orders have been completed. Browse the menu to place a new order!'}
                </p>
                <Link href={`/${locale}`} className="orders-cta-btn">
                  {isAr ? 'تصفح قائمة الطعام والطلب' : 'Browse Menu & Order'}
                </Link>
              </div>
            ) : (
              <div className="active-orders-grid">
                {activeOrders.map((order) => {
                  const meta = statusMeta[order.status] || { label: order.status, color: '#c98f2b' };
                  const isDelivery = order.type === 'DELIVERY';

                  return (
                    <article key={order.orderNumber} className="active-order-card">
                      <div className="active-card-top">
                        <div className="active-order-identifiers">
                          <span className="active-order-number">#{order.orderNumber}</span>
                          <span className="active-order-type" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {isDelivery ? (
                              <>
                                <TruckIcon width={14} height={14} />
                                <span>{isAr ? 'توصيل للمنزل' : 'Delivery'}</span>
                              </>
                            ) : (
                              <>
                                <StoreIcon width={14} height={14} />
                                <span>{isAr ? 'استلام من الفرع' : 'Takeaway'}</span>
                              </>
                            )}
                          </span>
                        </div>
                        <div className="active-order-status-badge" style={{ backgroundColor: `${meta.color}14`, color: meta.color, borderColor: `${meta.color}40` }}>
                          <span className="status-badge-text">{meta.label}</span>
                        </div>
                      </div>

                      {/* Embedded Live Status Timeline */}
                      <div className="active-card-timeline">
                        <OrderTrackingTimeline
                          orderNumber={order.orderNumber}
                          token={order.verificationToken}
                          initialStatus={order.status}
                          locale={locale}
                        />
                      </div>

                      {/* Summary & Details */}
                      <div className="active-card-meta">
                        <div className="meta-row">
                          <span className="meta-label">{isAr ? 'تاريخ الطلب:' : 'Order Date:'}</span>
                          <span className="meta-val">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">{isAr ? 'الفرع:' : 'Branch:'}</span>
                          <span className="meta-val">{order.branchNameAr || order.branchNameEn}</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">{isAr ? 'الأصناف المطلوبة:' : 'Items:'}</span>
                          <span className="meta-val">
                            {order.items.map((i) => `${i.productName} (${i.quantity})`).join('، ')}
                          </span>
                        </div>
                        <div className="meta-row total-row">
                          <span className="meta-label">{isAr ? 'الإجمالي:' : 'Total:'}</span>
                          <span className="meta-val total-amount">{order.total} {order.currency || (isAr ? 'ج.م' : 'EGP')}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="active-card-actions">
                        <Link
                          href={`/${locale}/receipt/${order.orderNumber}?token=${encodeURIComponent(order.verificationToken)}`}
                          className="action-btn receipt-btn"
                        >
                          <ReceiptIcon width={16} height={16} />
                          <span>{isAr ? 'عرض الفاتورة والإيصال' : 'View Receipt'}</span>
                        </Link>
                        {order.whatsappUrl && (
                          <a
                            href={order.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn whatsapp-btn"
                          >
                            <WhatsAppIcon width={16} height={16} />
                            <span>{isAr ? 'مراسلة الفرع عبر واتساب' : 'Chat on WhatsApp'}</span>
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Previous Orders (الطلبات السابقة) */}
          <section className="orders-section previous-section">
            <div className="orders-section-header">
              <h2>
                <ClockIcon width={20} height={20} />
                <span>{isAr ? 'الطلبات السابقة' : 'Previous Orders'}</span>
                {previousOrders.length > 0 && (
                  <span className="section-count-pill subtle">{previousOrders.length}</span>
                )}
              </h2>
            </div>

            {previousOrders.length === 0 ? (
              <div className="orders-empty-card mini">
                <p>{isAr ? 'لا توجد طلبات سابقة مكتملة حتى الآن.' : 'No previous orders completed yet.'}</p>
              </div>
            ) : (
              <div className="previous-orders-list">
                {previousOrders.map((order) => {
                  const meta = statusMeta[order.status] || { label: order.status, color: '#64748b' };
                  const itemCount = order.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <article key={order.orderNumber} className="previous-order-card">
                      <div className="prev-card-main">
                        <div className="prev-card-header">
                          <span className="prev-order-number">#{order.orderNumber}</span>
                          <span className="prev-order-date">{formatDate(order.createdAt)}</span>
                        </div>

                        <div className="prev-card-items-summary">
                          <span>{itemCount} {isAr ? (itemCount === 1 ? 'منتج' : 'منتجات') : (itemCount === 1 ? 'item' : 'items')}</span>
                          <span className="summary-dot">•</span>
                          <span className="prev-items-names">
                            {order.items.slice(0, 3).map((it) => it.productName).join('، ')}
                            {order.items.length > 3 && (isAr ? ' ...وغيرها' : ' ...and more')}
                          </span>
                        </div>

                        <div className="prev-card-footer">
                          <div className="prev-price-wrap">
                            <span className="prev-price-val">{order.total}</span>
                            <span className="prev-price-curr">{order.currency || (isAr ? 'ج.م' : 'EGP')}</span>
                          </div>
                          <div className="prev-status-pill" style={{ color: meta.color, backgroundColor: `${meta.color}15`, borderColor: `${meta.color}35` }}>
                            <span>{meta.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="prev-card-actions">
                        <Link
                          href={`/${locale}/receipt/${order.orderNumber}?token=${encodeURIComponent(order.verificationToken)}`}
                          className="prev-details-btn"
                        >
                          {isAr ? 'عرض التفاصيل' : 'View Details'}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
