'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from './CartContext';
import { ui, type Locale } from '@/lib/i18n';
import { 
  CloseIcon, 
  CheckIcon, 
  TruckIcon, 
  StoreIcon, 
  PhoneIcon, 
  MapPinIcon, 
  CashIcon, 
  CardIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AlertCircleIcon
} from './Icons';

export type OrderType = 'DELIVERY' | 'TAKEAWAY';
export type PaymentMethod = 'CASH' | 'CARD';

interface CheckoutModalProps {
  locale: Locale;
  currency: string;
  restaurantName: string;
  phoneIntl: string;
  vatNote?: string;
  deliveryFee?: number;
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderNumber: string, whatsappUrl: string | null) => void;
}

export default function CheckoutModal({
  locale,
  currency,
  restaurantName,
  phoneIntl,
  vatNote,
  deliveryFee,
  isOpen,
  onClose,
  onOrderSuccess,
}: CheckoutModalProps) {
  const { 
    cart, 
    customerNotes, 
    selectedBranchId, 
    selectedBranch,
    branches,
    subtotal,
    total,
    clearCart,
    getWhatsAppUrl,
  } = useCart();
  
  const t = ui[locale];
  const isAr = locale === 'ar';
  
  // Step 1: Branch Selection (required first)
  type CheckoutStep = 'branch' | 'type' | 'details' | 'payment' | 'confirm';
  const [step, setStep] = useState<CheckoutStep>('branch');
  const [orderType, setOrderType] = useState<'DELIVERY' | 'TAKEAWAY'>('DELIVERY');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [branchId, setBranchId] = useState(selectedBranchId);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [notes, setNotes] = useState(customerNotes);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [hasClickedWhatsApp, setHasClickedWhatsApp] = useState(false);
  const [confirmingSent, setConfirmingSent] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Available orderable branches
  const orderableBranches = branches.filter(b => b.isOrderable && b.isActive);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('branch');
      setOrderType('DELIVERY');
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setBranchId(selectedBranchId);
      setPaymentMethod('CASH');
      setNotes(customerNotes);
      setErrors({});
      setIsSubmitting(false);
      setSubmittedOrderNumber(null);
      setWhatsappUrl(null);
      
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, selectedBranchId, customerNotes]);

  // Background scroll lock & Escape key
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step === 'branch' || step === 'type') {
          onClose();
        } else {
          goBack();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, step, onClose]);

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 'branch') {
      if (!branchId) {
        newErrors.branchId = isAr ? 'يجب اختيار فرع' : 'Branch is required';
      }
    }
    
    if (step === 'details') {
      if (!customerName.trim()) {
        newErrors.customerName = isAr ? 'الاسم مطلوب' : 'Name is required';
      }
      if (!customerPhone.trim()) {
        newErrors.customerPhone = isAr ? 'رقم الهاتف مطلوب' : 'Phone number is required';
      } else {
        // Egyptian phone validation
        const digits = customerPhone.replace(/\D/g, '');
        let valid = false;
        if (digits.startsWith('20')) {
          const national = digits.slice(2);
          const regex1 = new RegExp('^1[0-25]\\d{8}$');
          valid = national.length === 10 && regex1.test(national);
        } else if (digits.length === 11 && digits.startsWith('01')) {
          const regex2 = new RegExp('^01[0-25]\\d{8}$');
          valid = regex2.test(digits);
        } else if (digits.length === 10) {
          const regex3 = new RegExp('^1[0-25]\\d{8}$');
          valid = regex3.test(digits);
        }
        if (!valid) {
          newErrors.customerPhone = isAr 
            ? 'رقم مصري غير صحيح (مثال: 01024994092)' 
            : 'Invalid Egyptian phone (e.g. 01024994092)';
        }
      }
      
      if (orderType === 'DELIVERY' && !deliveryAddress.trim()) {
        newErrors.deliveryAddress = isAr ? 'عنوان التوصيل مطلوب' : 'Delivery address is required';
      }
      
      if (orderType === 'TAKEAWAY' && !branchId) {
        newErrors.branchId = isAr ? 'يجب اختيار فرع' : 'Branch is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [step, orderType, customerName, customerPhone, deliveryAddress, branchId, isAr]);

  const goBack = () => {
    if (step === 'details') setStep('type');
    else if (step === 'payment') setStep('details');
    else if (step === 'confirm') setStep('payment');
    else if (step === 'type') setStep('branch');
  };

  const goNext = () => {
    if (!validateStep()) return;
    
    if (step === 'branch') setStep('type');
    else if (step === 'type') setStep('details');
    else if (step === 'details') setStep('payment');
    else if (step === 'payment') setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    
    try {
      const idempotencyKey = 'checkout-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          items: cart,
          orderType,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim(),
          customerNotes: notes.trim() || undefined,
          deliveryAddress: orderType === 'DELIVERY' ? deliveryAddress.trim() : undefined,
          branchId: branchId,
          paymentMethod,
          idempotencyKey,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'فشل في إنشاء الطلب');
      }
      
      setSubmittedOrderNumber(data.orderNumber);
      setWhatsappUrl(data.whatsappUrl);
      setVerificationToken(data.verificationToken);
      
      // Clear cart after successful order creation
      clearCart();
      
    } catch (error: any) {
      setErrors({ submit: error.message || (isAr ? 'حدث خطأ، حاول مرة أخرى' : 'Error occurred, please try again') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveryFeeValue = orderType === 'DELIVERY' ? (deliveryFee ?? 0) : 0;
  const orderTotal = total + deliveryFeeValue;

  const renderStepIndicator = () => (
    <div className="checkout-steps">
      {['branch', 'type', 'details', 'payment', 'confirm'].map((s, i) => (
        <div key={s} className={`step-indicator ${['branch', 'type', 'details', 'payment', 'confirm'].indexOf(step) >= i ? 'completed' : ''} ${['branch', 'type', 'details', 'payment', 'confirm'].indexOf(step) === i ? 'active' : ''}`}>
          <div className="step-circle">{i + 1}</div>
          <span className="step-label">
            {s === 'branch' && (isAr ? 'اختيار الفرع' : 'Select Branch')}
            {s === 'type' && (isAr ? 'نوع الطلب' : 'Order Type')}
            {s === 'details' && (isAr ? 'التفاصيل' : 'Details')}
            {s === 'payment' && (isAr ? 'الدفع' : 'Payment')}
            {s === 'confirm' && (isAr ? 'تأكيد' : 'Confirm')}
          </span>
        </div>
      ))}
    </div>
  );

  const renderBranchStep = () => (
    <div className="checkout-step">
      <h3>{isAr ? 'اختر الفرع' : 'Select Branch'}</h3>
      <p className="step-desc">{isAr ? 'اختر الفرع الذي تريد الطلب منه' : 'Select the branch you want to order from'}</p>
      
      <div className="branch-options" role="radiogroup" aria-label={isAr ? 'اختيار الفرع' : 'Select Branch'}>
        {orderableBranches.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={branchId === b.id}
            className={'branch-option' + (branchId === b.id ? ' selected' : '')}
            onClick={() => setBranchId(b.id)}
          >
            <span className="branch-option-indicator">{branchId === b.id ? '●' : '○'}</span>
            <div className="branch-option-info">
              <strong>{b.name}</strong>
              <small>{b.address}</small>
            </div>
          </button>
        ))}
      </div>
      {errors.branchId && <span className="error-msg">{errors.branchId}</span>}
    </div>
  );

  const renderOrderTypeStep = () => (
    <div className="checkout-step">
      <h3>{isAr ? 'اختر نوع الطلب' : 'Select Order Type'}</h3>
      <p className="step-desc">{isAr ? 'كيف تريد استلام طلبك؟' : 'How would you like to receive your order?'}</p>
      
      <div className="order-type-options">
        <button
          type="button"
          className={'order-type-card' + (orderType === 'TAKEAWAY' ? ' selected' : '')}
          onClick={() => setOrderType('TAKEAWAY')}
        >
          <div className="order-type-icon">
            <StoreIcon width={32} height={32} />
          </div>
          <div className="order-type-info">
            <strong>{isAr ? 'استلام من الفرع' : 'Pickup from Branch'}</strong>
            <span>{isAr ? 'تجهيز الطلب وتستلمه من الفرع المختار' : 'Order prepared for pickup at selected branch'}</span>
          </div>
          <div className="order-type-check">
            {orderType === 'TAKEAWAY' && <CheckIcon width={24} height={24} />}
          </div>
        </button>
        
        <button
          type="button"
          className={'order-type-card' + (orderType === 'DELIVERY' ? ' selected' : '')}
          onClick={() => setOrderType('DELIVERY')}
        >
          <div className="order-type-icon">
            <TruckIcon width={32} height={32} />
          </div>
          <div className="order-type-info">
            <strong>{isAr ? 'توصيل للمنزل' : 'Home Delivery'}</strong>
            <span>
              {isAr ? 'توصيل لباب المنزل' + (deliveryFee && deliveryFee > 0 ? ' + ' + deliveryFee + ' ' + currency + ' رسوم' : '') : 'Delivered to your door' + (deliveryFee && deliveryFee > 0 ? ' + ' + deliveryFee + ' ' + currency + ' fee' : '')}
            </span>
          </div>
          <div className="order-type-check">
            {orderType === 'DELIVERY' && <CheckIcon width={24} height={24} />}
          </div>
        </button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="checkout-step">
      <h3>{isAr ? 'بيانات العميل' : 'Customer Details'}</h3>
      
      <div className="form-group">
        <label htmlFor="customerName">{isAr ? 'الاسم (اختياري)' : 'Name (Optional)'}</label>
        <input
          ref={firstInputRef}
          id="customerName"
          type="text"
          value={customerName}
          onChange={(e) => { setCustomerName(e.target.value); setErrors(prev => ({ ...prev, customerName: '' })); }}
          placeholder={isAr ? 'أحمد محمد' : 'Ahmed Mohamed'}
          className={errors.customerName ? 'error' : ''}
        />
        {errors.customerName && <span className="error-msg">{errors.customerName}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="customerPhone">
          <PhoneIcon width={16} height={16} />
          {isAr ? 'رقم الهاتف المصري *' : 'Egyptian Phone Number *'}
        </label>
        <input
          id="customerPhone"
          type="tel"
          value={customerPhone}
          onChange={(e) => { setCustomerPhone(e.target.value); setErrors(prev => ({ ...prev, customerPhone: '' })); }}
          placeholder="01024994092"
          className={errors.customerPhone ? 'error' : ''}
          maxLength={15}
          dir="ltr"
        />
        {errors.customerPhone && <span className="error-msg">{errors.customerPhone}</span>}
        <span className="field-hint">{isAr ? 'مثال: 01024994092 أو +201024994092' : 'e.g. 01024994092 or +201024994092'}</span>
      </div>
      
      {orderType === 'DELIVERY' && (
        <div className="form-group">
          <label htmlFor="deliveryAddress">
            <MapPinIcon width={16} height={16} />
            {isAr ? 'عنوان التوصيل *' : 'Delivery Address *'}
          </label>
          <textarea
            id="deliveryAddress"
            value={deliveryAddress}
            onChange={(e) => { setDeliveryAddress(e.target.value); setErrors(prev => ({ ...prev, deliveryAddress: '' })); }}
            placeholder={isAr ? 'اكتب العنوان بالتفصيل: الشارع، المنطقة، رقم المنزل، الطابق...' : 'Enter full address: street, area, building number, floor...'}
            rows={3}
            className={errors.deliveryAddress ? 'error' : ''}
          />
          {errors.deliveryAddress && <span className="error-msg">{errors.deliveryAddress}</span>}
        </div>
      )}
      
      {orderType === 'TAKEAWAY' && (
        <div className="form-group">
          <label>{isAr ? 'فرع الاستلام *' : 'Pickup Branch *'}</label>
          <div className="branch-options" role="radiogroup" aria-label={isAr ? 'فرع الاستلام' : 'Pickup Branch'}>
            {orderableBranches.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={branchId === b.id}
                className={'branch-option' + (branchId === b.id ? ' selected' : '')}
                onClick={() => setBranchId(b.id)}
              >
                <span className="branch-option-indicator">{branchId === b.id ? '●' : '○'}</span>
                <div className="branch-option-info">
                  <strong>{b.name}</strong>
                  <small>{b.address}</small>
                </div>
              </button>
            ))}
          </div>
          {errors.branchId && <span className="error-msg">{errors.branchId}</span>}
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="notes">{isAr ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isAr ? 'تعليمات خاصة، كود المبنى، رقم الشقة...' : 'Special instructions, building code, apartment number...'}
          rows={2}
          maxLength={500}
        />
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="checkout-step">
      <h3>{isAr ? 'طريقة الدفع' : 'Payment Method'}</h3>
      <p className="step-desc">{isAr ? 'اختر طريقة الدفع المفضلة' : 'Choose your preferred payment method'}</p>
      
      <div className="payment-options">
        <button
          type="button"
          className={'payment-option' + (paymentMethod === 'CASH' ? ' selected' : '')}
          onClick={() => setPaymentMethod('CASH')}
        >
          <div className="payment-icon">
            <CashIcon width={28} height={28} />
          </div>
          <div className="payment-info">
            <strong>{isAr ? 'نقداً عند الاستلام' : 'Cash on Delivery/Pickup'}</strong>
            <span>{isAr ? 'ادفع عند استلام الطلب' : 'Pay when you receive your order'}</span>
          </div>
          <div className="payment-check">
            {paymentMethod === 'CASH' && <CheckIcon width={24} height={24} />}
          </div>
        </button>
        
        <button
          type="button"
          className={'payment-option' + (paymentMethod === 'CARD' ? ' selected' : '')}
          onClick={() => setPaymentMethod('CARD')}
        >
          <div className="payment-icon">
            <CardIcon width={28} height={28} />
          </div>
          <div className="payment-info">
            <strong>{isAr ? 'بطاقة (فيزا/ماستركارد)' : 'Card (Visa/Mastercard)'}</strong>
            <span>{isAr ? 'سيتم توجيهك للدفع الإلكتروني' : 'You will be redirected for online payment'}</span>
          </div>
          <div className="payment-check">
            {paymentMethod === 'CARD' && <CheckIcon width={24} height={24} />}
          </div>
        </button>
      </div>
    </div>
  );

  const renderConfirmStep = () => {
    const deliveryFeeValue = orderType === 'DELIVERY' ? (deliveryFee ?? 0) : 0;
    const orderTotal = total + (orderType === 'DELIVERY' ? (deliveryFee ?? 0) : 0);
    
    return (
      <div className="checkout-step confirm-step">
        <h3>{isAr ? 'مراجعة وتأكيد الطلب' : 'Review & Confirm Order'}</h3>
        
        <div className="confirm-summary">
          <div className="confirm-section">
            <h4>{isAr ? 'نوع الطلب' : 'Order Type'}</h4>
            <p className="confirm-value">
              {orderType === 'DELIVERY' ? (
                <>
                  <TruckIcon width={16} height={16} /> {isAr ? 'توصيل' : 'Delivery'}
                </>
              ) : (
                <>
                  <StoreIcon width={16} height={16} /> {isAr ? 'استلام' : 'Takeaway'}
                </>
              )}
            </p>
          </div>
          
          {orderType === 'DELIVERY' && deliveryAddress && (
            <div className="confirm-section">
              <h4>{isAr ? 'عنوان التوصيل' : 'Delivery Address'}</h4>
              <p className="confirm-value"><MapPinIcon width={16} height={16} /> {deliveryAddress}</p>
            </div>
          )}
          
          {orderType === 'TAKEAWAY' && selectedBranch && (
            <div className="confirm-section">
              <h4>{isAr ? 'فرع الاستلام' : 'Pickup Branch'}</h4>
              <p className="confirm-value"><StoreIcon width={16} height={16} /> {selectedBranch.name}</p>
            </div>
          )}
          
          <div className="confirm-section">
            <h4>{isAr ? 'الهاتف' : 'Phone'}</h4>
            <p className="confirm-value"><PhoneIcon width={16} height={16} /> {customerPhone}</p>
          </div>
          
          <div className="confirm-section">
            <h4>{isAr ? 'طريقة الدفع' : 'Payment Method'}</h4>
            <p className="confirm-value">
              {paymentMethod === 'CASH' ? (
                <> <CashIcon width={16} height={16} /> {isAr ? 'نقداً' : 'Cash'} </>
              ) : (
                <> <CardIcon width={16} height={16} /> {isAr ? 'بطاقة' : 'Card'} </>
              )}
            </p>
          </div>
        </div>
        
        <div className="confirm-totals">
          <div className="total-row">
            <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span>{subtotal} {currency}</span>
          </div>
          {orderType === 'DELIVERY' && (deliveryFee ?? 0) > 0 && (
            <div className="total-row">
              <span>{isAr ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
              <span>{deliveryFee} {currency}</span>
            </div>
          )}
          <div className="total-row final">
            <span>{isAr ? 'الإجمالي' : 'Total'}</span>
            <span>{total + (orderType === 'DELIVERY' ? (deliveryFee ?? 0) : 0)} {currency}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleConfirmSentFromModal = async () => {
    if (!submittedOrderNumber) return;
    setConfirmingSent(true);
    try {
      await fetch(`/api/orders/${submittedOrderNumber}/confirm-sent`, {
        method: 'POST',
      });
    } catch (e) {
      // continue redirect anyway
    } finally {
      setConfirmingSent(false);
      window.location.href = `/${locale}/receipt/${submittedOrderNumber}${verificationToken ? `?token=${verificationToken}` : ''}`;
    }
  };

  const renderSuccessStep = () => (
    <div className="checkout-step success-step" style={{ textAlign: 'center', padding: '10px 0' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: '#fef3c7',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
        }}
      >
        📱
      </div>
      <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
        {isAr ? 'خطوة أخيرة: إرسال الطلب عبر واتساب' : 'Final Step: Dispatch to WhatsApp'}
      </h3>
      <p style={{ margin: '0 0 14px', fontSize: '14px', color: '#64748b' }}>
        {isAr ? 'تم تجميد وحفظ طلبك برقم' : 'Order prepared with #'}:{' '}
        <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{submittedOrderNumber}</strong>
      </p>

      <div
        style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          padding: '14px',
          fontSize: '13px',
          color: '#92400e',
          lineHeight: '1.5',
          marginBottom: '20px',
          textAlign: 'right',
        }}
      >
        ⚠️ <strong>{isAr ? 'تنبيه مهم:' : 'Important Notice:'}</strong>{' '}
        {isAr
          ? 'لن يعتبر الطلب قيد التنفيذ أو مقبولاً رسمياً حتى تضغط على الزر أدناه لإرسال تفاصيل الطلب إلى واتساب المطعم، ويقوم فريق العمل بمراجعته وتأكيده.'
          : 'Your order will not be prepared until you click below to send the details via WhatsApp and our staff confirms it.'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setHasClickedWhatsApp(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 20px',
              background: '#25D366',
              color: '#fff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
            }}
          >
            <span>💬</span>
            <span>{isAr ? 'اضغط هنا لإرسال الطلب عبر واتساب' : 'Send Order via WhatsApp'}</span>
          </a>
        )}

        <button
          type="button"
          disabled={confirmingSent}
          onClick={handleConfirmSentFromModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '13px 20px',
            background: hasClickedWhatsApp ? '#16a34a' : '#1e293b',
            color: '#fff',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
        >
          {confirmingSent
            ? isAr
              ? 'جاري التحويل...'
              : 'Redirecting...'
            : isAr
            ? '✅ لقد أرسلت الطلب عبر واتساب الآن'
            : '✅ I Have Sent the Order on WhatsApp'}
        </button>

        <a
          href={`/${locale}/receipt/${submittedOrderNumber}${verificationToken ? `?token=${verificationToken}` : ''}`}
          style={{
            display: 'block',
            padding: '10px',
            color: '#6b7280',
            fontSize: '13px',
            textDecoration: 'underline',
          }}
        >
          {isAr ? 'معاينة ملخص الطلب المبدئي' : 'View Pre-Acceptance Summary'}
        </a>
      </div>
    </div>
  );

  let stepContent = null;
  if (submittedOrderNumber) {
    stepContent = renderSuccessStep();
  } else if (step === 'branch') {
    stepContent = renderBranchStep();
  } else if (step === 'type') {
    stepContent = renderOrderTypeStep();
  } else if (step === 'details') {
    stepContent = renderDetailsStep();
  } else if (step === 'payment') {
    stepContent = renderPaymentStep();
  } else if (step === 'confirm') {
    stepContent = renderConfirmStep();
  }

  if (!isOpen) return null;

  return (
    <div className="checkout-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="sheet-handle" aria-hidden="true" />
        
        <button
          type="button"
          className="checkout-close"
          onClick={onClose}
          aria-label={t.close}
        >
          <CloseIcon width={20} height={20} />
        </button>
        
        <div className="checkout-header">
          <h2 id="checkout-title">{isAr ? 'إتمام الطلب' : 'Checkout'}</h2>
          {submittedOrderNumber ? null : renderStepIndicator()}
        </div>
        
        <div className="checkout-body">
          {errors.submit && (
            <div className="checkout-error">
              <AlertCircleIcon width={18} height={18} />
              <span>{errors.submit}</span>
            </div>
          )}
          
          {stepContent}
        </div>
        
        <div className="checkout-footer">
          {submittedOrderNumber ? null : (
            <>
              {step !== 'branch' && (
                <button type="button" className="btn-back" onClick={goBack}>
                  <ArrowLeftIcon width={16} height={16} />
                  {isAr ? 'رجوع' : 'Back'}
                </button>
              )}
              {step === 'confirm' ? (
                <button 
                  type="button" 
                  className="btn-submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <> <span className="spinner" /> {isAr ? 'جاري الإرسال...' : 'Submitting...'} </>
                  ) : (
                    <> {isAr ? 'تأكيد الطلب' : 'Confirm Order'} <ArrowRightIcon width={16} height={16} /> </>
                  )}
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn-next"
                  onClick={goNext}
                >
                  {isAr ? 'متابعة' : 'Continue'} <ArrowRightIcon width={16} height={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}