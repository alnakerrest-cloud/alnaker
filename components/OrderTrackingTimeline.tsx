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
      descAr: 'تم تسجيل الطلب بانتظار الفرع',
      descEn: 'Order placed, awaiting branch',
      stepNum: 1,
    },
    {
      key: 'received',
      labelAr: 'تم الاستلام',
      labelEn: 'Received',
      descAr: 'استلم المطعم تفاصيل طلبك',
      descEn: 'Restaurant received your details',
      stepNum: 2,
    },
    {
      key: 'confirmed',
      labelAr: 'تم التأكيد',
      labelEn: 'Confirmed',
      descAr: 'تمت مراجعة واعتماد الطلب',
      descEn: 'Order confirmed by team',
      stepNum: 3,
    },
    {
      key: 'preparing',
      labelAr: 'جاري التجهيز',
      labelEn: 'Preparing',
      descAr: 'الشيف يجهز طلبك طازجاً',
      descEn: 'Kitchen is preparing your meal',
      stepNum: 4,
    },
    {
      key: 'dispatch',
      labelAr: 'جاهز / للتوصيل',
      labelEn: 'Ready / Out',
      descAr: 'جاهز للاستلام أو مع المندوب',
      descEn: 'Ready for pickup or out for delivery',
      stepNum: 5,
    },
    {
      key: 'completed',
      labelAr: 'تم التسليم',
      labelEn: 'Delivered',
      descAr: 'بالهناء والشفاء',
      descEn: 'Enjoy your meal!',
      stepNum: 6,
    },
  ];

  return (
    <div
      className="order-tracking-card"
      style={{
        background: 'var(--surface, #ffffff)',
        border: '1.5px solid var(--line, #e9d9be)',
        borderRadius: 'var(--radius, 18px)',
        padding: '22px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow, 0 1px 0 rgba(92, 42, 38, 0.05))',
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
          borderBottom: '1px solid var(--line, #e9d9be)',
          paddingBottom: '14px',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-2, #f3e6cf)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand, #5c2a26)',
              fontWeight: 800,
              fontSize: '14px',
            }}
          >
            ●
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--brand-deep, #43201d)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {isAr ? 'متابعة حالة الطلب المباشرة' : 'Live Order Tracking'}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted, #7c6a5f)' }}>
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
            background: isPolling ? 'var(--bg-2, #f3e6cf)' : 'var(--surface, #ffffff)',
            border: `1px solid ${isPolling ? 'var(--gold, #c98f2b)' : 'var(--line, #e9d9be)'}`,
            borderRadius: '20px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: isPolling ? 'var(--brand-deep, #43201d)' : 'var(--muted, #7c6a5f)',
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
                  background: '#16a34a',
                  boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.25)',
                }}
              />
              <span>{isAr ? 'مباشر (تحديث كل 5ث)' : 'Live (every 5s)'}</span>
            </>
          ) : (
            <span>{isAr ? 'حالة نهائية' : 'Completed'}</span>
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
            padding: '14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#991b1b' }}>
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
            <p style={{ margin: 0, fontSize: '12px', color: '#b91c1c', lineHeight: 1.5 }}>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '8px',
          position: 'relative',
          padding: '4px 0',
        }}
      >
        {steps.map((st, i) => {
          const isDone = !isFailed && currentStep > i;
          const isCurrent = !isFailed && currentStep === i;

          return (
            <div
              key={st.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '12px 6px',
                borderRadius: '12px',
                background: isCurrent
                  ? 'var(--bg-2, #f3e6cf)'
                  : isDone
                  ? '#fffdf8'
                  : 'var(--surface, #ffffff)',
                border: `1.5px solid ${
                  isCurrent
                    ? 'var(--gold, #c98f2b)'
                    : isDone
                    ? 'var(--line, #e9d9be)'
                    : 'var(--line, #e9d9be)'
                }`,
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isCurrent
                    ? 'var(--brand, #5c2a26)'
                    : isDone
                    ? 'var(--gold, #c98f2b)'
                    : 'var(--bg-2, #f3e6cf)',
                  color: isCurrent || isDone ? '#ffffff' : 'var(--muted, #7c6a5f)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isDone ? '16px' : '13px',
                  fontWeight: 800,
                  marginBottom: '6px',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(92, 42, 38, 0.2)' : 'none',
                }}
              >
                {isDone ? '✓' : st.stepNum}
              </div>

              <div
                style={{
                  fontSize: '12px',
                  fontWeight: isCurrent ? 800 : 700,
                  color: isCurrent ? 'var(--brand-deep, #43201d)' : isDone ? 'var(--ink, #2b1b18)' : 'var(--muted, #7c6a5f)',
                  marginBottom: '2px',
                }}
              >
                {isAr ? st.labelAr : st.labelEn}
              </div>

              <div
                style={{
                  fontSize: '10px',
                  color: isCurrent ? 'var(--brand, #5c2a26)' : 'var(--muted, #7c6a5f)',
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
            borderTop: '1px dashed var(--line, #e9d9be)',
            paddingTop: '16px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--brand-deep, #43201d)',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
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
                  background: 'var(--bg-2, #f3e6cf)',
                  borderRadius: '6px',
                  borderRight: isAr ? '3px solid var(--brand, #5c2a26)' : 'none',
                  borderLeft: !isAr ? '3px solid var(--brand, #5c2a26)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ color: 'var(--brand-deep, #43201d)' }}>{entry.action}</strong>
                  {entry.note && <span style={{ color: 'var(--muted, #7c6a5f)' }}>({entry.note})</span>}
                </div>
                <span style={{ color: 'var(--muted, #7c6a5f)', fontFamily: 'monospace', fontSize: '11px' }}>
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
