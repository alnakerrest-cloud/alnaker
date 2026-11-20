import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { isLocale, type Locale } from '@/lib/i18n';
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerSession,
  type CustomerSessionPayload,
} from '@/lib/customer-session';
import { getCustomerByIdAsync } from '@/lib/customer-store';
import {
  getCustomerAddressesAsync,
  getCustomerFavoritesAsync,
  getCustomerNotificationsAsync,
  getUnreadNotificationCountAsync,
} from '@/lib/customer-hub-store';
import { getOrdersByCustomerPhoneAsync, type OrderRecord } from '@/lib/orders-store';
import { getMenuForLocale } from '@/lib/menu-db';
import { getSiteData } from '@/lib/site-db';
import { getActiveOffers } from '@/lib/offers-db';
import { getMenuSettings } from '@/lib/orders-store';
import { CartProvider } from '@/components/CartContext';
import CustomerHubClient from '@/components/CustomerHubClient';

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

  const [categories, site, offers, menuSettings] = await Promise.all([
    getMenuForLocale(locale as Locale),
    getSiteData(locale as Locale),
    getActiveOffers(locale as Locale),
    Promise.resolve(getMenuSettings()),
  ]);

  let customerData = undefined;
  let orders: OrderRecord[] = [];
  let addresses: any[] = [];
  let favorites: any[] = [];
  let notifications: any[] = [];
  let unreadCount = 0;

  if (session) {
    try {
      const [custRec, ordList, addrList, favList, notifList, unread] = await Promise.all([
        getCustomerByIdAsync(session.customerId),
        getOrdersByCustomerPhoneAsync(session.phoneNormalized, session.customerId, 50),
        getCustomerAddressesAsync(session.customerId),
        getCustomerFavoritesAsync(session.customerId),
        getCustomerNotificationsAsync(session.customerId, 20),
        getUnreadNotificationCountAsync(session.customerId),
      ]);

      customerData = {
        id: session.customerId,
        phone: custRec?.phone || session.phoneNormalized,
        name: custRec?.name || session.customerName,
        createdAt: custRec?.createdAt,
      };
      orders = ordList;
      addresses = addrList;
      favorites = favList;
      notifications = notifList;
      unreadCount = unread;
    } catch (err: any) {
      console.warn('[orders-page] Error loading customer data:', err.message);
    }
  }

  return (
    <CartProvider
      categories={categories}
      branches={site.branches}
      locale={locale as Locale}
      currency={site.currency}
      offers={offers}
      menuSettings={menuSettings}
    >
      <main className="hub-page-root">
        <CustomerHubClient
          locale={locale as Locale}
          initialTab="orders"
          initialAuthenticated={Boolean(session)}
          initialCustomer={customerData}
          initialOrders={orders}
          initialAddresses={addresses}
          initialFavorites={favorites}
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />
      </main>
    </CartProvider>
  );
}
