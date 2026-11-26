'use client';

import React, { useState } from 'react';
import type { OrderStatus, OrderType, OrderRecord } from '@/lib/orders-store';

interface OrderStatusControlProps {
  order: OrderRecord;
}

export default function OrderStatusControl({ order }: OrderStatusControlProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [pendingActionStatus, setPendingActionStatus] = useState<OrderStatus | null>(null);
  const [reasonText, setReasonText] = useState('');

  const updateStatus = async (newStatus: OrderStatus, reason?: string) => {
    if (loading || newStatus === currentStatus) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل في تحديث حالة الطلب');
      }

      setCurrentStatus(newStatus);
      setSuccessMsg(`تم تحديث حالة الطلب بنجاح إلى: ${newStatus}`);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء التحديث');
    } finally {
      setLoading(false);
      setReasonModalOpen(false);
      setReasonText('');
      setPendingActionStatus(null);
    }
  };

  const handleActionClick = (targetStatus: OrderStatus) => {
    if (targetStatus === 'REJECTED' || targetStatus === 'CANCELLED') {
      setPendingActionStatus(targetStatus);
      setReasonModalOpen(true);
      return;
    }
    updateStatus(targetStatus);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>إجراءات إدارة الطلب</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
            الحالة الحالية: <strong style={{ color: '#0f172a' }}>{currentStatus}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href={`https://wa.me/${order.customerPhoneNormalized}?text=${encodeURIComponent(`مرحباً يا فندم، بخصوص طلبكم من قرية الناقر رقم ${order.orderNumber}: `)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#25D366',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <span>💬</span> مراسلة العميل واتساب
          </a>

          <a
            href={`/ar/receipt/${order.orderNumber}?token=${order.verificationToken}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#f3f4f6',
              color: '#374151',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '13px',
              border: '1px solid #d1d5db',
            }}
          >
            <span>🧾</span> معاينة الإيصال العام
          </a>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '10px 14px', background: '#dcfce7', color: '#166534', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Dynamic Lifecycle Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {(currentStatus === 'PENDING_WHATSAPP' || currentStatus === 'CUSTOMER_CONFIRMED_SENT') && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('RECEIVED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              📥 تأكيد استلام الرسالة (RECEIVED)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('CONFIRMED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              ✅ قبول الطلب رسمياً وإصدار الإيصال (CONFIRMED)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('REJECTED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              ❌ رفض الطلب (REJECTED)
            </button>
          </>
        )}

        {currentStatus === 'RECEIVED' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('CONFIRMED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              ✅ قبول الطلب رسمياً وإصدار الإيصال (CONFIRMED)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('REJECTED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              ❌ رفض الطلب
            </button>
          </>
        )}

        {currentStatus === 'CONFIRMED' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('PREPARING')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#ea580c',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🍳 بدء التحضير في المطبخ (PREPARING)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('RECEIVED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              📥 إرجاع إلى مستلم (RECEIVED)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('CANCELLED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#6b7280',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🚫 إلغاء الطلب
            </button>
          </>
        )}

        {currentStatus === 'PREPARING' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('READY')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#059669',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🔔 جاهز للتسليم (READY)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('CANCELLED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#6b7280',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🚫 إلغاء الطلب
            </button>
          </>
        )}

        {currentStatus === 'READY' && (
          <>
            {order.type === 'DELIVERY' && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleActionClick('OUT_FOR_DELIVERY')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                🚚 خرج مع الطيار للتوصيل (OUT_FOR_DELIVERY)
              </button>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('COMPLETED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#15803d',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🎉 تم التسليم بنجاح (COMPLETED)
            </button>
          </>
        )}

        {currentStatus === 'OUT_FOR_DELIVERY' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('COMPLETED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#15803d',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🎉 تم التوصيل واستلام المبلغ (COMPLETED)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActionClick('CANCELLED')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#6b7280',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🚫 فشل التوصيل / إلغاء
            </button>
          </>
        )}

        {(currentStatus === 'COMPLETED' || currentStatus === 'REJECTED' || currentStatus === 'CANCELLED' || currentStatus === 'EXPIRED') && (
          <span style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
            وصل هذا الطلب إلى حالته النهائية ({currentStatus}). لا توجد إجراءات إضافية متاحة.
          </span>
        )}
      </div>

      {/* Reason Modal */}
      {reasonModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h4 style={{ margin: '0 0 12px', fontSize: '18px', color: '#111827' }}>
              {pendingActionStatus === 'REJECTED' ? 'سبب رفض الطلب' : 'سبب إلغاء الطلب'}
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
              يرجى إدخال سبب الرفض أو الإلغاء للتوثيق في سجل العمليات وسجل الطلب.
            </p>
            <textarea
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="مثال: الصنف غير متوفر حالياً بالمطبخ، أو خارج نطاق التوصيل..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setReasonModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => pendingActionStatus && updateStatus(pendingActionStatus, reasonText)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  background: pendingActionStatus === 'REJECTED' ? '#dc2626' : '#4b5563',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                تأكيد الإجراء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
