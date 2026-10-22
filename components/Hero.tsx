import { branches, mapsUrl, PHONE_DISPLAY, PHONE_INTL } from '@/lib/site';
import { ui, type Locale } from '@/lib/i18n';
import LangSwitch from './LangSwitch';
import Logo from './Logo';
import { PhoneIcon, PinIcon } from './Icons';

export default function Hero({ locale }: { locale: Locale }) {
  const t = ui[locale];
  return (
    <header className="hero">
      <div className="container">
        <div className="hero-top">
          <LangSwitch locale={locale} />
        </div>

        <div className="hero-inner">
          <Logo className="brand-mark" />
          <h1>{t.brand}</h1>
          <p className="tag">{t.tagline}</p>

          <div className="hero-actions">
            <a className="btn primary" href={`tel:${PHONE_INTL}`}>
              <PhoneIcon />
              <span dir="ltr">{PHONE_DISPLAY}</span>
            </a>
            {branches.map((b) => (
              <a
                key={b.id}
                className="btn"
                href={mapsUrl(b.mapQuery)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <PinIcon />
                <span>{b.name[locale]}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
