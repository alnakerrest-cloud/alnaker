'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

interface MyOrdersButtonProps {
  locale: Locale;
}

export default function MyOrdersButton({ locale }: MyOrdersButtonProps) {
  const isAr = locale === 'ar';
  const [activeCount, setActiveCount] = useState<number>(0);
  const [hasOrders, setHasOrders] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);

    // Initial check from localStorage for instant, zero-delay rendering
    try {
      const localActive = localStorage.getItem('naqer_active_orders_count');
      if (localActive) {
        const count = parseInt(localActive, 10);
        if (!isNaN(count) && count > 0) {
          setActiveCount(count);
          setHasOrders(true);
        }
      }
    } catch {}

    // Verify with authoritative customer session API
    let isCancelled = false;
    async function checkCustomerOrders() {
      try {
        const res = await fetch('/api/customer/orders', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled) return;

        if (data.authenticated && (data.totalOrders > 0 || data.activeCount > 0)) {
          setHasOrders(true);
          setActiveCount(data.activeCount || 0);
          try {
            localStorage.setItem('naqer_active_orders_count', String(data.activeCount || 0));
          } catch {}
        }
      } catch {}
    }

    checkCustomerOrders();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (!isMounted) {
    return (
      <Link
        href={`/${locale}/account`}
        className="my-orders-btn"
        aria-label={isAr ? 'حسابي وطلباتي' : 'Customer Hub'}
      >
        <span className="my-orders-icon" aria-hidden="true">👤</span>
        <span>{isAr ? 'حسابي وطلباتي' : 'Customer Hub'}</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/account`}
      className={`my-orders-btn ${activeCount > 0 ? 'has-active' : ''}`}
      aria-label={isAr ? `حسابي وطلباتي${activeCount > 0 ? ` (${activeCount} طلب نشط)` : ''}` : `Customer Hub & Orders${activeCount > 0 ? ` (${activeCount} active)` : ''}`}
    >
      <span className="my-orders-icon" aria-hidden="true">👤</span>
      <span>{isAr ? 'حسابي وطلباتي' : 'Customer Hub'}</span>
      {activeCount > 0 && (
        <span className="my-orders-badge" aria-label={`${activeCount} active orders`}>
          {activeCount}
        </span>
      )}
    </Link>
  );
}
