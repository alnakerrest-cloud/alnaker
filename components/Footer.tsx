import { branches, mapsUrl, PHONE_DISPLAY, PHONE_INTL } from '@/lib/site';
import { ui, type Locale } from '@/lib/i18n';
import Logo from './Logo';
import { PhoneIcon, PinIcon } from './Icons';

export default function Footer({ locale }: { locale: Locale }) {
  const t = ui[locale];
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-brand">
          <Logo size={56} />
          <div>
            <strong>{t.brand}</strong>
            <span>{t.tagline}</span>
          </div>
        </div>

        <h2 className="footer-title">{t.branches}</h2>
        <div className="branches">
          {branches.map((b) => (
            <article key={b.id} className="branch">
              <h3>{b.name[locale]}</h3>
              <p>
                {b.address[locale]}
                <br />
                {b.city[locale]}
              </p>
              <div className="branch-actions">
                <a href={`tel:${PHONE_INTL}`}>
                  <PhoneIcon width={16} height={16} />
                  <span dir="ltr">{PHONE_DISPLAY}</span>
                </a>
                <a href={mapsUrl(b.mapQuery)} target="_blank" rel="noopener noreferrer">
                  <PinIcon width={16} height={16} />
                  <span>{t.directions}</span>
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="footer-note">
          {t.vat} · {t.service}
        </p>
        <p className="footer-copy">
          © {year} {t.brand} — {t.rights}
        </p>
      </div>
    </footer>
  );
}
