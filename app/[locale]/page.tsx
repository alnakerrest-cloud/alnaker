import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import JsonLd from '@/components/JsonLd';
import MenuView from '@/components/MenuView';
import LiveSync from '@/components/LiveSync';
import ViewOnlyNoticeBanner from '@/components/ViewOnlyNoticeBanner';
import MenuSuspendedView from '@/components/MenuSuspendedView';
import { isLocale } from '@/lib/i18n';
import { getMenuForLocale } from '@/lib/menu-db';
import { getSiteData } from '@/lib/site-db';
import { getActiveOffers } from '@/lib/offers-db';
import { getMenuSettingsAsync, getMostOrderedProductStats } from '@/lib/orders-store';

// The menu and the site chrome (hero/footer/branches/phone/settings) now come from Neon. Admin
// writes call revalidatePath('/ar'|'/en') for instant updates; this timer is the safety net so the
// public site stays fresh even without an edit. If a DB read fails, both loaders fall back to the
// curated static data (data/menu.ts + lib/site.ts + lib/i18n) — never a broken/empty page.
export const revalidate = 60;

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [categories, site, offers, menuSettings, mostOrderedStats] = await Promise.all([
    getMenuForLocale(locale),
    getSiteData(locale),
    getActiveOffers(locale),
    getMenuSettingsAsync(),
    Promise.resolve(getMostOrderedProductStats()),
  ]);

  if (menuSettings.mode === 'TEMPORARILY_CLOSED') {
    return (
      <>
        <JsonLd locale={locale} site={site} />
        <Hero locale={locale} site={site} />
        <MenuSuspendedView locale={locale} site={site} settings={menuSettings} />
        <Footer locale={locale} site={site} />
        <LiveSync />
      </>
    );
  }

  return (
    <>
      <JsonLd locale={locale} site={site} />
      <Hero locale={locale} site={site} />
      <ViewOnlyNoticeBanner locale={locale} settings={menuSettings} />
      <main>
        <div className="container">
          <p className="notice">
            <span>{site.vat}</span>
          </p>
        </div>
        <MenuView
          locale={locale}
          categories={categories}
          currency={site.currency}
          site={site}
          offers={offers}
          menuSettings={menuSettings}
          mostOrderedStats={mostOrderedStats}
        />
      </main>
      <Footer locale={locale} site={site} />
      <LiveSync />
    </>
  );
}
