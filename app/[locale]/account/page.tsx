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

interface AccountPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: AccountPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'مركز العميل الموحد | قرية الناقر' : 'Customer Hub | Al Naqer Village',
    description: isAr
      ? 'لوحة تحكم وتجربة العميل الموحدة في قرية الناقر: متابعة الطلبات الحية، العناوين المحفوظة، المفضلة، وإدارة الحساب.'
      : 'Unified Customer Hub for Al Naqer Village: Live order tracking, saved delivery addresses, favorites, and profile.',
  };
}

export default async function AccountPage({ params, searchParams }: AccountPageProps) {
  const { locale } = await params;
  const { tab } = await searchParams;
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
      console.warn('[account-page] Error loading customer initial data:', err.message);
    }
  }

  const validTabs = ['overview', 'orders', 'profile', 'addresses', 'favorites', 'notifications', 'wallet', 'install'];
  const initialTab = tab && validTabs.includes(tab) ? (tab as any) : 'overview';

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
          initialTab={initialTab}
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
