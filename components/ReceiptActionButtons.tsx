'use client';

import React, { useState } from 'react';

interface ReceiptActionButtonsProps {
  orderNumber: string;
  status: string;
  whatsappUrl: string;
  isConfirmed: boolean;
}

export default function ReceiptActionButtons({
  orderNumber,
  status,
  whatsappUrl,
  isConfirmed,
}: ReceiptActionButtonsProps) {
  const [submittingConfirm, setSubmittingConfirm] = useState(false);
  const [confirmedSent, setConfirmedSent] = useState(status === 'CUSTOMER_CONFIRMED_SENT');

  const handleConfirmSent = async () => {
    setSubmittingConfirm(true);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/confirm-sent`, {
        method: 'POST',
      });
      if (res.ok) {
        setConfirmedSent(true);
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to confirm sent:', err);
    } finally {
      setSubmittingConfirm(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="receipt-actions-wrapper" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* If still PENDING_WHATSAPP, show WhatsApp dispatch and confirmation buttons */}
      {status === 'PENDING_WHATSAPP' && !confirmedSent && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#92400e', fontSize: '15px' }}>
            هل قمت بإرسال الرسالة إلى واتساب المطعم؟
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: '#25D366',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              💬 فتح واتساب لإرسال الطلب
            </a>
            <button
              type="button"
              disabled={submittingConfirm}
              onClick={handleConfirmSent}
              style={{
                padding: '10px 20px',
                background: '#1e293b',
                color: '#fff',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {submittingConfirm ? 'جاري التأكيد...' : '✅ لقد أرسلت الطلب بالفعل'}
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Re-send button always available */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: '#25D366',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          💬 التواصل مع الفرع عبر واتساب
        </a>

        {isConfirmed && (
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#b8860b',
              color: '#fff',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            🖨️ طباعة الإيصال / حفظ كـ PDF
          </button>
        )}

        <a
          href="/ar"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: '#f3f4f6',
            color: '#374151',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
            border: '1px solid #d1d5db',
          }}
        >
          🍽️ العودة للمنيو
        </a>
      </div>
    </div>
  );
}
