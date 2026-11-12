import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import JsonLd from '@/components/JsonLd';
import MenuView from '@/components/MenuView';
import { isLocale, ui } from '@/lib/i18n';
import { localizeMenu } from '@/lib/menu-view';

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = ui[locale];

  return (
    <>
      <JsonLd locale={locale} />
      <Hero locale={locale} />
      <main>
        <div className="container">
          <p className="notice">
            <span>{t.vat}</span>
            <span className="dot" aria-hidden>
              ◆
            </span>
            <span>{t.service}</span>
          </p>
        </div>
        <MenuView locale={locale} categories={localizeMenu(locale)} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
