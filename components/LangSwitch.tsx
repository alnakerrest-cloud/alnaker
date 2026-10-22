'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { ui } from '@/lib/i18n';
import { GlobeIcon } from './Icons';

export default function LangSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const other: Locale = locale === 'ar' ? 'en' : 'ar';
  const href = pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${other}`);

  return (
    <Link
      href={href}
      hrefLang={other}
      lang={other}
      className="lang-switch"
      onClick={() => {
        document.cookie = `NEXT_LOCALE=${other};path=/;max-age=31536000;samesite=lax`;
      }}
    >
      <GlobeIcon width={16} height={16} />
      <span>{ui[locale].switchTo}</span>
    </Link>
  );
}
