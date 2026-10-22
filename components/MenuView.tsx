'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { VCategory, VItem } from '@/lib/menu-view';
import { normalize } from '@/lib/search';
import { ui, type Locale } from '@/lib/i18n';
import { ArrowUpIcon, CloseIcon, SearchIcon } from './Icons';

type Group = 'food' | 'drinks';

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

function ListItem({ item, i, currency }: { item: VItem; i: number; currency: string }) {
  return (
    <article className="item" style={{ '--i': i } as CSSProperties}>
      <div className="item-main">
        <h3>
          {item.name}
          {item.badge && <span className="badge">{item.badge}</span>}
        </h3>
        {item.desc && <p className="desc">{item.desc}</p>}
      </div>
      <Prices item={item} currency={currency} />
    </article>
  );
}

function Tray({ item, i, n, currency }: { item: VItem; i: number; n: number; currency: string }) {
  return (
    <article className="tray" style={{ '--i': i } as CSSProperties}>
      <div className="tray-head">
        <div>
          <span className="tray-num">{String(n).padStart(2, '0')}</span>
          <h3>{item.name}</h3>
          {item.badge && <span className="badge on-dark">{item.badge}</span>}
        </div>
        <Prices item={item} currency={currency} big />
      </div>
      {item.parts && (
        <ul className="parts">
          {item.parts.map((p, k) => (
            <li key={k}>{p}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

/* ───────── main component ───────── */
export default function MenuView({ locale, categories }: { locale: Locale; categories: VCategory[] }) {
  const t = ui[locale];
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
              <div className="cat-head">
                <span className="cat-icon" aria-hidden>
                  {c.icon}
                </span>
                <h2 className="cat-title" id={`${c.id}-title`}>
                  {c.name}
                </h2>
                <span className="cat-rule" aria-hidden />
              </div>

              {c.sections.map((s, si) => (
                <div className="sub" key={si}>
                  {s.title && <h3 className="sub-title">{s.title}</h3>}
                  <div className={`grid${c.layout === 'trays' ? ' trays' : ''}`}>
                    {s.items.map((it, ii) => {
                      counter += 1;
                      return c.layout === 'trays' ? (
                        <Tray key={ii} item={it} i={ii} n={counter} currency={t.currency} />
                      ) : (
                        <ListItem key={ii} item={it} i={ii} currency={t.currency} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </Reveal>
          );
        })}
      </div>

      <button
        className={`to-top${showTop ? ' show' : ''}`}
        aria-label={t.backToTop}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUpIcon />
      </button>
    </div>
  );
}
