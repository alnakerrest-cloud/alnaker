import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['ar', 'en'];
const DEFAULT_LOCALE = 'ar';

function pickLocale(req: NextRequest): string {
  // 1) explicit choice saved by the language switcher
  const saved = req.cookies.get('NEXT_LOCALE')?.value;
  if (saved && LOCALES.includes(saved)) return saved;

  // 2) First-time visitor default is Arabic (ar)
  return DEFAULT_LOCALE;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/${pickLocale(req)}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // everything except Next internals, API routes, the /admin CMS area, and files with an extension (icons, images, sitemap.xml…)
  matcher: ['/((?!_next|api|admin|.*\\..*).*)'],
};
