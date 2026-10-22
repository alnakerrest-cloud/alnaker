import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import Logo from '@/components/Logo';
import PrintButton from '@/components/PrintButton';
import { isLocale, ui } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function QrPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = ui[locale];

  // "/" redirects every visitor to their own language (Arabic by default), so one QR serves everyone.
  const target = `${SITE_URL}/?src=qr`;
  const svg = await QRCode.toString(target, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: { dark: '#5C2A26', light: '#FFFFFF' },
  });
  const download = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <main className="qr-page">
      <section className="qr-card">
        <Logo size={72} />
        <h1>{t.brand}</h1>
        <p className="qr-title">{t.scanTitle}</p>
        <p className="qr-sub">{t.scanSub}</p>

        <div className="qr-box" role="img" aria-label={target} dangerouslySetInnerHTML={{ __html: svg }} />

        <p className="qr-url" dir="ltr">
          {SITE_URL.replace(/^https?:\/\//, '')}
        </p>

        <div className="qr-actions no-print">
          <PrintButton label={t.print} />
          <a className="btn outline" href={download} download="naqer-menu-qr.svg">
            {t.downloadSvg}
          </a>
          <a className="btn outline" href={`/${locale}`}>
            {t.openMenu}
          </a>
        </div>
      </section>
    </main>
  );
}
