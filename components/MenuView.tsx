'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import type { VCategory, VItem, VKind } from '@/lib/menu-view';
import { normalize } from '@/lib/search';
import { ui, type Locale } from '@/lib/i18n';
import { ArrowUpIcon, CloseIcon, SearchIcon } from './Icons';
import { CartProvider, useCart } from './CartContext';
import ProductDetailModal from './ProductDetailModal';
import CartDrawer from './CartDrawer';
import FloatingCartBar from './FloatingCartBar';
import OffersSection from './OffersSection';
import OfferDetailModal from './OfferDetailModal';
import type { VOffer } from '@/lib/offers';
import type { SiteData } from '@/lib/site-db';
import { PHONE_INTL } from '@/lib/site';

type Group = 'food' | 'drinks';

/* object-fit + responsive sizes per card archetype (image performance + no distortion). */
const MEDIA: Record<VKind, { fit: 'cover' | 'contain'; sizes: string }> = {
  platter: { fit: 'contain', sizes: '(max-width:700px) 92vw, (max-width:1100px) 46vw, 30vw' },
  meal: { fit: 'cover', sizes: '(max-width:640px) 46vw, (max-width:900px) 31vw, 23vw' },
  side: { fit: 'cover', sizes: '80px' },
  drink: { fit: 'cover', sizes: '72px' },
};

/* ───────── reveal-on-scroll wrapper (content stays visible without JS) ───────── */
function Reveal({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'ssr' | 'hidden' | 'shown'>('ssr');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState('shown');
      return;
    }
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      setState('shown');
      return;
    }
    setState('hidden');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.04 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} id={id} className="cat" data-reveal={state} aria-labelledby={`${id}-title`}>
      {children}
    </section>
  );
}

/* ───────── price pills ───────── */
function Prices({ item, currency, big }: { item: VItem; currency: string; big?: boolean }) {
  return (
    <div className={`prices${big ? ' big' : ''}`}>
      {item.prices.map((p, i) => (
        <span className="price" key={i}>
          {p.label && <small>{p.label}</small>}
          <b>{p.value}</b>
          <i>{currency}</i>
        </span>
      ))}
    </div>
  );
}

/* ───────── image / branded placeholder (looks intentional, swaps when a real photo is uploaded) ───────── */
function Media({ src, alt, icon, kind }: { src?: string; alt: string; icon: string; kind: VKind }) {
  const [failed, setFailed] = useState(false);
  const { fit, sizes } = MEDIA[kind];
  if (!src || failed) {
    return (
      <div className={`ph ph--${kind}`} role="img" aria-label={alt}>
        <span className="ph-icon" aria-hidden>
          {icon}
        </span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      style={{ objectFit: fit }}
      onError={() => setFailed(true)}
    />
  );
}

/* ───────── ingredient tags: max two lines, expand when there are more ───────── */
function Tags({ parts }: { parts?: string[] }) {
  const [open, setOpen] = useState(false);
  if (!parts || parts.length === 0) return null;
  return (
    <div className="tags-wrap">
      <ul className={`tags${open ? ' open' : ''}`}>
        {parts.map((p, k) => (
          <li key={k}>{p}</li>
        ))}
      </ul>
      {parts.length > 6 && (
        <button
          type="button"
          className="tags-more"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          {open ? 'أقل' : 'عرض المكونات'}
        </button>
      )}
    </div>
  );
}

/* ───────── large platter card (trays & signature platters) — image-first ───────── */
function PlatterCard({
  item,
  i,
  n,
  currency,
  icon,
  onSelect,
}: {
  item: VItem;
  i: number;
  n: number;
  currency: string;
  icon: string;
  onSelect: (item: VItem, icon: string, kind: VKind) => void;
}) {
  return (
    <article
      className="card card--platter"
      style={{ '--i': i } as CSSProperties}
      onClick={() => onSelect(item, icon, 'platter')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item, icon, 'platter');
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
    >
      <div className="platter-media">
        <Media src={item.img} alt={item.name} icon={icon} kind="platter" />
        <span className="platter-num">{String(n).padStart(2, '0')}</span>
        {item.badge && <span className="badge on-dark">{item.badge}</span>}
      </div>
      <div className="platter-body">
        <div className="platter-head">
          <h3 className="card-title">{item.name}</h3>
        </div>
        {item.desc && <p className="desc">{item.desc}</p>}
        <Tags parts={item.parts} />
      </div>
      <div className="platter-foot">
        <Prices item={item} currency={currency} big />
      </div>
    </article>
  );
}

/* ───────── individual meal card — top image, fixed-position price, equal heights ───────── */
function MealCard({
  item,
  i,
  currency,
  icon,
  onSelect,
}: {
  item: VItem;
  i: number;
  currency: string;
  icon: string;
  onSelect: (item: VItem, icon: string, kind: VKind) => void;
}) {
  return (
    <article
      className="card card--meal"
      style={{ '--i': i } as CSSProperties}
      onClick={() => onSelect(item, icon, 'meal')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item, icon, 'meal');
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
    >
      <div className="card-media">
        <Media src={item.img} alt={item.name} icon={icon} kind="meal" />
        {item.badge && <span className="badge on-media">{item.badge}</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{item.name}</h3>
        {item.desc && <p className="desc">{item.desc}</p>}
      </div>
      <div className="card-foot">
        <Prices item={item} currency={currency} />
      </div>
    </article>
  );
}

/* ───────── compact side card (add-ons / rice / small plates) ───────── */
function SideCard({
  item,
  i,
  currency,
  icon,
  onSelect,
}: {
  item: VItem;
  i: number;
  currency: string;
  icon: string;
  onSelect: (item: VItem, icon: string, kind: VKind) => void;
}) {
  return (
    <article
      className="card card--side"
      style={{ '--i': i } as CSSProperties}
      onClick={() => onSelect(item, icon, 'side')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item, icon, 'side');
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
    >
      <div className="card-top-row">
        <div className="side-thumb">
          <Media src={item.img} alt={item.name} icon={icon} kind="side" />
        </div>
        {item.badge && <span className="badge">{item.badge}</span>}
      </div>
      <div className="card-body side-main">
        <h3 className="card-title">{item.name}</h3>
        {item.desc && <p className="desc">{item.desc}</p>}
      </div>
      <div className="card-foot side-foot">
        <Prices item={item} currency={currency} />
      </div>
    </article>
  );
}

/* ───────── drinks card (compact, icon-led) ───────── */
function DrinkCard({
  item,
  i,
  currency,
  icon,
  onSelect,
}: {
  item: VItem;
  i: number;
  currency: string;
  icon: string;
  onSelect: (item: VItem, icon: string, kind: VKind) => void;
}) {
  return (
    <article
      className="card card--drink"
      style={{ '--i': i } as CSSProperties}
      onClick={() => onSelect(item, icon, 'drink')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item, icon, 'drink');
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
    >
      <div className="card-top-row">
        <div className="drink-thumb">
          <Media src={item.img} alt={item.name} icon={icon} kind="drink" />
        </div>
        {item.badge && <span className="badge">{item.badge}</span>}
      </div>
      <div className="card-body drink-main">
        <h3 className="card-title">{item.name}</h3>
        {item.desc && <p className="desc">{item.desc}</p>}
      </div>
      <div className="card-foot drink-foot">
        <Prices item={item} currency={currency} />
      </div>
    </article>
  );
}

function renderItem(
  kind: VKind,
  item: VItem,
  i: number,
  n: number,
  currency: string,
  icon: string,
  onSelect: (item: VItem, icon: string, kind: VKind) => void
) {
  switch (kind) {
    case 'platter':
      return <PlatterCard key={item.id || i} item={item} i={i} n={n} currency={currency} icon={icon} onSelect={onSelect} />;
    case 'meal':
      return <MealCard key={item.id || i} item={item} i={i} currency={currency} icon={icon} onSelect={onSelect} />;
    case 'side':
      return <SideCard key={item.id || i} item={item} i={i} currency={currency} icon={icon} onSelect={onSelect} />;
    case 'drink':
      return <DrinkCard key={item.id || i} item={item} i={i} currency={currency} icon={icon} onSelect={onSelect} />;
  }
}

/* ───────── main component ───────── */
function MenuViewInner({
  locale,
  categories,
  currency: currencyProp,
  site,
  offers = [],
}: {
  locale: Locale;
  categories: VCategory[];
  currency?: string;
  site?: SiteData;
  offers?: VOffer[];
}) {
  const t = ui[locale];
  const currency = currencyProp ?? site?.currency ?? t.currency;
  const { openProductModal, totalQuantity } = useCart();
  const [selectedOffer, setSelectedOffer] = useState<VOffer | null>(null);
  const [group, setGroup] = useState<Group>('food');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>(categories[0]?.id ?? '');
  const [showTop, setShowTop] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const q = normalize(query);
  const searching = q.length > 0;

  const handleSelectOffer = useCallback(
    (offer: VOffer) => {
      setSelectedOffer(offer);
    },
    []
  );

  /* what is on screen: the active tab, or every match while searching */
  const visible = useMemo(() => {
    const base = searching ? categories : categories.filter((c) => c.group === group);
    if (!searching) return base;
    return base
      .map((c) => ({
        ...c,
        sections: c.sections
          .map((s) => ({ ...s, items: s.items.filter((it) => it.q.includes(q)) }))
          .filter((s) => s.items.length > 0),
      }))
      .filter((c) => c.sections.length > 0);
  }, [categories, group, q, searching]);

  /* keep the sticky-bar height in a CSS variable (used for scroll offsets) */
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const set = () => document.documentElement.style.setProperty('--bar-h', `${bar.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  /* scroll-spy: highlight the chip of the section currently under the bar */
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const barH = barRef.current?.offsetHeight ?? 130;
      let current = visible[0]?.id ?? '';
      for (const c of visible) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= barH + 48) current = c.id;
      }
      setActive(current);
      setShowTop(window.scrollY > 700);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visible]);

  /* keep the active chip centered inside the horizontal scroller */
  useEffect(() => {
    const chip = chipRefs.current[active];
    const box = chipsRef.current;
    if (!chip || !box) return;
    const c = chip.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const delta = c.left + c.width / 2 - (b.left + b.width / 2);
    if (Math.abs(delta) > 4) box.scrollBy({ left: delta, behavior: 'smooth' });
  }, [active]);

  const goTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const switchGroup = (g: Group) => {
    if (g === group && !searching) return;
    setQuery('');
    setGroup(g);
    setActive(categories.find((c) => c.group === g)?.id ?? '');
    requestAnimationFrame(() => {
      const top = (menuRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
      window.scrollTo({ top: Math.max(top - 8, 0), behavior: 'smooth' });
    });
  };

  const total = visible.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.items.length, 0), 0);

  return (
    <div ref={menuRef} id="menu">
      {offers.length > 0 && !searching && (
        <OffersSection
          offers={offers}
          locale={locale}
          currency={currency}
          branches={site?.branches ?? []}
          onSelectOffer={handleSelectOffer}
        />
      )}
      <div className="bar" ref={barRef}>
        <div className="container">
          <div className="bar-row">
            <div className="tabs" role="group" aria-label={t.menu}>
              <button className="tab" aria-pressed={!searching && group === 'food'} onClick={() => switchGroup('food')}>
                {t.food}
              </button>
              <button className="tab" aria-pressed={!searching && group === 'drinks'} onClick={() => switchGroup('drinks')}>
                {t.drinks}
              </button>
            </div>

            <label className="search">
              <SearchIcon className="search-icon" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search}
                aria-label={t.search}
                enterKeyHint="search"
                autoComplete="off"
                suppressHydrationWarning
              />
              {query && (
                <button type="button" className="clear" onClick={() => setQuery('')} aria-label="Clear">
                  <CloseIcon width={16} height={16} />
                </button>
              )}
            </label>
          </div>

          {visible.length > 0 && (
            <nav className="chips" ref={chipsRef} aria-label={t.categories}>
              {visible.map((c) => (
                <button
                  key={c.id}
                  ref={(el) => {
                    chipRefs.current[c.id] = el;
                  }}
                  className="chip"
                  aria-current={active === c.id}
                  onClick={() => goTo(c.id)}
                >
                  <span aria-hidden>{c.icon}</span>
                  {c.name}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="container">
        <p className="sr-only" role="status" aria-live="polite">
          {searching ? `${total}` : ''}
        </p>

        {visible.length === 0 && <p className="empty">{t.noResults}</p>}

        {visible.map((c) => {
          let counter = 0;
          return (
            <Reveal key={`${c.id}-${searching ? 's' : 'n'}`} id={c.id}>
              <div className={`cat-head cat-head--${c.kind}`}>
                {c.img ? (
                  <Image className="cat-img" src={c.img} alt={c.name} width={96} height={96} sizes="96px" style={{ objectFit: 'cover', borderRadius: 16, width: 64, height: 64 }} />
                ) : (
                  <span className="cat-icon" aria-hidden>
                    {c.icon}
                  </span>
                )}
                <div className="cat-titles">
                  <h2 className="cat-title" id={`${c.id}-title`}>
                    {c.name}
                  </h2>
                  {c.nameAlt && <span className="cat-alt">{c.nameAlt}</span>}
                </div>
                <span className="cat-rule" aria-hidden />
              </div>

              {c.sections.map((s, si) => (
                <div className="sub" key={si}>
                  {s.title && <h3 className="sub-title">{s.title}</h3>}
                  <div className="grid" data-kind={c.kind}>
                    {s.items.map((it, ii) => {
                      counter += 1;
                      return renderItem(c.kind, it, ii, counter, currency, c.icon, openProductModal);
                    })}
                  </div>
                </div>
              ))}
            </Reveal>
          );
        })}
      </div>

      <button
        className={`to-top${showTop ? ' show' : ''}${totalQuantity > 0 ? ' has-cart' : ''}`}
        aria-label={t.backToTop}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUpIcon />
      </button>

      <ProductDetailModal locale={locale} currency={currency} />
      <OfferDetailModal
        offer={selectedOffer}
        categories={categories}
        branches={site?.branches ?? []}
        locale={locale}
        currency={currency}
        onClose={() => setSelectedOffer(null)}
      />
      <CartDrawer
        locale={locale}
        currency={currency}
        restaurantName={site?.brand ?? t.brand}
        phoneIntl={site?.phoneIntl ?? PHONE_INTL}
        vatNote={site?.vat ?? t.vat}
        serviceNote={site?.service ?? t.service}
      />
      <FloatingCartBar locale={locale} currency={currency} />
    </div>
  );
}

export default function MenuView(props: {
  locale: Locale;
  categories: VCategory[];
  currency?: string;
  site?: SiteData;
  offers?: VOffer[];
}) {
  const t = ui[props.locale];
  const currency = props.currency ?? props.site?.currency ?? t.currency;
  return (
    <CartProvider
      categories={props.categories}
      branches={props.site?.branches ?? []}
      locale={props.locale}
      currency={currency}
      offers={props.offers ?? []}
    >
      <MenuViewInner {...props} />
    </CartProvider>
  );
}
