import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { isLocale, type Locale } from '@/lib/i18n';
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
  type CustomerSessionPayload,
} from '@/lib/customer-session';
import {
  getOrdersByCustomerPhoneAsync,
  type OrderRecord,
} from '@/lib/orders-store';
import MyOrdersClient from '@/components/MyOrdersClient';

export const dynamic = 'force-dynamic';

interface OrdersPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: OrdersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'طلباتي ومتابعة الطلب الحية | قرية الناقر' : 'My Orders & Live Tracking | Al Naqer Village',
    description: isAr
      ? 'متابعة حالة طلباتك من قرية الناقر لحظة بلحظة واستعراض سجل الطلبات السابقة والفواتير.'
      : 'Track your active orders in real-time and review previous order history from Al Naqer Village.',
  };
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;
  const session: CustomerSessionPayload | null = verifyCustomerSession(sessionToken);

  let initialOrders: OrderRecord[] = [];
  if (session) {
    try {
      initialOrders = await getOrdersByCustomerPhoneAsync(
        session.phoneNormalized,
        session.customerId,
        30
      );
    } catch (err) {
      console.warn('[orders-page] Initial fetch error:', err);
    }
  }

  return (
    <main className="orders-page-container">
      <MyOrdersClient
        locale={locale as Locale}
        initialOrders={initialOrders}
        initialAuthenticated={Boolean(session)}
        initialCustomerPhone={session?.phoneNormalized}
        initialCustomerName={session?.customerName}
      />
    </main>
  );
}
