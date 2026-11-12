import type { SiteData } from '@/lib/site-db';
import type { Locale } from '@/lib/i18n';
import LangSwitch from './LangSwitch';
import Logo from './Logo';
import { PhoneIcon, PinIcon } from './Icons';

export default function Hero({ locale, site }: { locale: Locale; site: SiteData }) {
  return (
    <header className="hero">
      <div className="container">
        <div className="hero-top">
          <LangSwitch locale={locale} />
        </div>

        <div className="hero-inner">
          <Logo className="brand-mark" src={site.logoUrl} />
          <h1>{site.brand}</h1>
          <p className="tag">{site.tagline}</p>

          <div className="hero-actions">
            <a className="btn primary" href={`tel:${site.phoneIntl}`}>
              <PhoneIcon />
              <span dir="ltr">{site.phoneDisplay}</span>
            </a>
            {site.branches.map((b) => (
              <a
                key={b.id}
                className="btn"
                href={b.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <PinIcon />
                <span>{b.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
