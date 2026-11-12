import type { SiteData } from '@/lib/site-db';
import { ui, type Locale } from '@/lib/i18n';
import Logo from './Logo';
import { PhoneIcon, PinIcon } from './Icons';

export default function Footer({ locale, site }: { locale: Locale; site: SiteData }) {
  const t = ui[locale];
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-brand">
          <Logo size={56} />
          <div>
            <strong>{site.brand}</strong>
            <span>{site.tagline}</span>
          </div>
        </div>

        <h2 className="footer-title">{t.branches}</h2>
        <div className="branches">
          {site.branches.map((b) => (
            <article key={b.id} className="branch">
              <h3>{b.name}</h3>
              <p>
                {b.address}
                <br />
                {b.city}
              </p>
              <div className="branch-actions">
                <a href={`tel:${site.phoneIntl}`}>
                  <PhoneIcon width={16} height={16} />
                  <span dir="ltr">{site.phoneDisplay}</span>
                </a>
                <a href={b.mapUrl} target="_blank" rel="noopener noreferrer">
                  <PinIcon width={16} height={16} />
                  <span>{t.directions}</span>
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="footer-note">
          {site.vat} · {site.service}
        </p>
        <p className="footer-copy">
          © {year} {site.brand} — {t.rights}
        </p>
      </div>
    </footer>
  );
}
