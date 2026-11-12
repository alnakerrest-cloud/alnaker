import { SITE_URL } from '@/lib/site';
import type { SiteData } from '@/lib/site-db';
import type { Locale } from '@/lib/i18n';

export default function JsonLd({ locale, site }: { locale: Locale; site: SiteData }) {
  const graph = site.branches.map((b) => ({
    '@type': 'Restaurant',
    name: `${site.brand} — ${b.name}`,
    url: `${SITE_URL}/${locale}`,
    hasMenu: `${SITE_URL}/${locale}`,
    telephone: site.phoneIntl,
    servesCuisine: ['Egyptian', 'Bedouin', 'Middle Eastern', 'Mandi'],
    priceRange: 'EGP',
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.address,
      addressLocality: b.city,
      addressCountry: 'EG',
    },
  }));

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
