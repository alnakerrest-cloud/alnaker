import { branches, PHONE_INTL, SITE_URL } from '@/lib/site';
import { ui, type Locale } from '@/lib/i18n';

export default function JsonLd({ locale }: { locale: Locale }) {
  const t = ui[locale];
  const graph = branches.map((b) => ({
    '@type': 'Restaurant',
    name: `${t.brand} — ${b.name[locale]}`,
    url: `${SITE_URL}/${locale}`,
    hasMenu: `${SITE_URL}/${locale}`,
    telephone: PHONE_INTL,
    servesCuisine: ['Egyptian', 'Bedouin', 'Middle Eastern', 'Mandi'],
    priceRange: 'EGP',
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.address[locale],
      addressLocality: b.city[locale],
      addressCountry: 'EG',
    },
  }));

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
