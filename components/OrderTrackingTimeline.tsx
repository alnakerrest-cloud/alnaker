'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { OrderStatus, OrderAuditEntry } from '@/lib/orders-store';

interface OrderStatusResponse {
  orderNumber: string;
  status: OrderStatus;
  confirmedAt?: string;
  confirmedBy?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  timeline?: OrderAuditEntry[];
  updatedAt?: string;
  total?: number;
  currency?: string;
  itemCount?: number;
}

interface OrderTrackingTimelineProps {
  orderNumber: string;
  token: string;
  initialStatus: OrderStatus;
  locale?: string;
}

const TERMINAL_STATUSES: OrderStatus[] = ['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'];

export default function OrderTrackingTimeline({
  orderNumber,
  token,
  initialStatus,
  locale = 'ar',
}: OrderTrackingTimelineProps) {
  const isAr = locale === 'ar';
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [isPolling, setIsPolling] = useState(!TERMINAL_STATUSES.includes(initialStatus));
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}/status?token=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError(isAr ? 'رمز التحقق غير صالح.' : 'Invalid verification token.');
          setIsPolling(false);
          return;
        }
        return;
      }
      const json: OrderStatusResponse = await res.json();
      setStatus(json.status);
      setData(json);
      setLastUpdated(new Date());
      setFetchCount((c) => c + 1);

      if (TERMINAL_STATUSES.includes(json.status)) {
        setIsPolling(false);
      }
    } catch {
      // transient network error, keep polling
    }
  }, [orderNumber, token, isAr]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [isPolling, fetchStatus]);

  // Map status to 6-stage lifecycle step index (0-based)
  const getStepIndex = (st: OrderStatus): number => {
    switch (st) {
      case 'DRAFT':
      case 'PENDING_WHATSAPP':
      case 'CUSTOMER_CONFIRMED_SENT':
        return 0;
      case 'RECEIVED':
        return 1;
      case 'CONFIRMED':
        return 2;
      case 'PREPARING':
        return 3;
      case 'READY':
      case 'OUT_FOR_DELIVERY':
        return 4;
      case 'COMPLETED':
        return 5;
      default:
        return -1;
    }
  };

  const currentStep = getStepIndex(status);
  const isTerminal = TERMINAL_STATUSES.includes(status);
  const isFailed = status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED';

  const steps = [
    {
      key: 'review',
      labelAr: 'قيد المراجعة',
      labelEn: 'Under Review',
      descAr: 'تم إنشاء الطلب وفي انتظار اعتماد المطعم',
      descEn: 'Order created, awaiting restaurant check',
      icon: '⏳',
    },
    {
      key: 'received',
      labelAr: 'تم الاستلام',
      labelEn: 'Received',
      descAr: 'استلم المطعم تفاصيل طلبك بنجاح',
      descEn: 'Restaurant received your details',
      icon: '📥',
    },
    {
      key: 'confirmed',
      labelAr: 'تم التأكيد',
      labelEn: 'Confirmed',
      descAr: 'تمت الموافقة الرسمية واعتماد الإيصال',
      descEn: 'Approved by management',
      icon: '✅',
    },
    {
      key: 'preparing',
      labelAr: 'جاري التجهيز',
      labelEn: 'Preparing',
      descAr: 'الشيف يقوم بإعداد وتغليف الوجبة',
      descEn: 'Kitchen is preparing your meal',
      icon: '👨‍🍳',
    },
    {
      key: 'dispatch',
      labelAr: 'جاهز / للتوصيل',
      labelEn: 'Ready / On The Way',
      descAr: 'طلبك جاهز للاستلام أو في الطريق إليك',
      descEn: 'Ready for pickup or out for delivery',
      icon: '🛵',
    },
    {
      key: 'completed',
      labelAr: 'تم التسليم',
      labelEn: 'Delivered',
      descAr: 'تم استلام الطلب بالهناء والشفاء',
      descEn: 'Enjoy your meal!',
      icon: '🎉',
    },
  ];

  return (
    <div
      className="order-tracking-card"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        direction: isAr ? 'rtl' : 'ltr',
      }}
    >
      {/* Header bar with Live pulse badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📡</span>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              {isAr ? 'متابعة حالة الطلب المباشرة' : 'Live Order Tracking'}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
              {isAr ? 'تحديث تلقائي لحالة التجهيز والتوصيل' : 'Real-time kitchen and dispatch status'}
            </p>
          </div>
        </div>

        {/* Polling Pulse Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: isPolling ? '#ecfdf5' : '#f8fafc',
            border: `1px solid ${isPolling ? '#a7f3d0' : '#e2e8f0'}`,
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: isPolling ? '#059669' : '#64748b',
          }}
        >
          {isPolling ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)',
                }}
              />
              <span>{isAr ? 'مباشر (تحديث كل 5ث)' : 'Live (every 5s)'}</span>
            </>
          ) : (
            <>
              <span>⏹️</span>
              <span>{isAr ? 'حالة نهائية' : 'Completed'}</span>
            </>
          )}
          <span style={{ opacity: 0.7, fontSize: '11px' }} suppressHydrationWarning>
            {isMounted
              ? lastUpdated.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : null}
          </span>
        </div>
      </div>

      {/* Terminal / Failed Alert Banner if applicable */}
      {isFailed && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '24px' }}>
            {status === 'REJECTED' ? '❌' : status === 'CANCELLED' ? '🚫' : '⏰'}
          </span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#991b1b' }}>
              {status === 'REJECTED'
                ? isAr
                  ? 'تم الاعتذار عن قبول الطلب'
                  : 'Order Rejected'
                : status === 'CANCELLED'
                ? isAr
                  ? 'تم إلغاء الطلب'
                  : 'Order Cancelled'
                : isAr
                ? 'انتهت صلاحية الطلب'
                : 'Order Expired'}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c', lineHeight: 1.5 }}>
              {status === 'REJECTED'
                ? data?.rejectionReason || (isAr ? 'نعتذر عن عدم إمكانية تلبية الطلب حالياً.' : 'Unable to fulfill this order.')
                : status === 'CANCELLED'
                ? data?.cancellationReason || (isAr ? 'تم إلغاء الطلب بناءً على طلب العميل أو الإدارة.' : 'Order was cancelled.')
                : isAr
                ? 'انتهت مهلة إرسال الطلب عبر واتساب (30 دقيقة).'
                : 'Order confirmation expired.'}
            </p>
          </div>
        </div>
      )}

      {/* Multi-stage Lifecycle Timeline */}
      <div
        className="tracking-stepper"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          position: 'relative',
          padding: '10px 0',
        }}
      >
        {steps.map((st, i) => {
          const isDone = !isFailed && currentStep > i;
          const isCurrent = !isFailed && currentStep === i;
          const isUpcoming = isFailed || currentStep < i;

          return (
            <div
              key={st.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '12px 8px',
                borderRadius: '12px',
                background: isCurrent
                  ? '#eff6ff'
                  : isDone
                  ? '#f0fdf4'
                  : '#f8fafc',
                border: `1.5px solid ${
                  isCurrent
                    ? '#3b82f6'
                    : isDone
                    ? '#86efac'
                    : '#e2e8f0'
                }`,
                transition: 'all 0.3s ease',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isCurrent
                    ? '#2563eb'
                    : isDone
                    ? '#16a34a'
                    : '#e2e8f0',
                  color: isCurrent || isDone ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isDone ? '18px' : '15px',
                  fontWeight: 800,
                  marginBottom: '8px',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none',
                }}
              >
                {isDone ? '✓' : st.icon}
              </div>

              <div
                style={{
                  fontSize: '13px',
                  fontWeight: isCurrent ? 800 : 700,
                  color: isCurrent ? '#1e40af' : isDone ? '#166534' : '#64748b',
                  marginBottom: '2px',
                }}
              >
                {isAr ? st.labelAr : st.labelEn}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: isCurrent ? '#3b82f6' : '#94a3b8',
                  lineHeight: 1.3,
                }}
              >
                {isAr ? st.descAr : st.descEn}
              </div>
            </div>
          );
        })}
      </div>

      {/* Audit Timeline entries history */}
      {data?.timeline && data.timeline.length > 0 && (
        <div
          style={{
            marginTop: '20px',
            borderTop: '1px dashed #e2e8f0',
            paddingTop: '16px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📜</span>
            <span>{isAr ? 'سجل أحداث الطلب الموثق:' : 'Verified Audit History:'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.timeline.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  padding: '6px 10px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  borderRight: isAr ? '3px solid #3b82f6' : 'none',
                  borderLeft: !isAr ? '3px solid #3b82f6' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ color: '#0f172a' }}>{entry.action}</strong>
                  {entry.note && <span style={{ color: '#64748b' }}>({entry.note})</span>}
                </div>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px' }}>
                  {new Date(entry.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
