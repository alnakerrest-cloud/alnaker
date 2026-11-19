"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import type { VCategory, VItem, VKind } from "@/lib/menu-view";
import { normalize } from "@/lib/search";
import { ui, type Locale } from "@/lib/i18n";
import { ArrowUpIcon, CloseIcon, SearchIcon } from "./Icons";
import { CartProvider, useCart } from "./CartContext";
import ProductDetailModal from "./ProductDetailModal";
import CartDrawer from "./CartDrawer";
import FloatingCartBar from "./FloatingCartBar";
import OffersSection from "./OffersSection";
import OfferDetailModal from "./OfferDetailModal";
import type { VOffer } from "@/lib/offers";
import type { SiteData } from "@/lib/site-db";
import type { MenuModeSettings } from "@/lib/order-settings-types";
import { PHONE_INTL } from "@/lib/site";
type Group = "food" | "drinks";
/* object-fit + responsive sizes per card archetype (image performance + no distortion). */ const MEDIA: Record<
  VKind,
  { fit: "cover" | "contain"; sizes: string }
> = {
  platter: {
    fit: "contain",
    sizes: "(max-width:700px) 46vw, (max-width:1100px) 46vw, 30vw",
  },
  meal: {
    fit: "cover",
    sizes: "(max-width:640px) 46vw, (max-width:900px) 31vw, 23vw",
  },
  side: { fit: "cover", sizes: "80px" },
  drink: { fit: "cover", sizes: "72px" },
};
/* ───────── reveal-on-scroll wrapper (content stays visible without JS) ───────── */ function Reveal({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"ssr" | "hidden" | "shown">("ssr");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState("shown");
      return;
    }
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      setState("shown");
      return;
    }
    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.04 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      id={id}
      className="cat"
      data-reveal={state}
      aria-labelledby={`${id}-title`}
    >
      {" "}
      {children}{" "}
    </section>
  );
}
/* ───────── price pills ───────── */ function Prices({
  item,
  currency,
  big,
  locale = "ar",
}: {
  item: VItem;
  currency: string;
  big?: boolean;
  locale?: Locale;
}) {
  const hasMultiplePrices = item.prices.length > 1;
  const hasPaidOptions = Boolean(item.optionGroups?.some((g) => g.options.some((o) => o.price > 0)));
  const showStartsFrom = hasMultiplePrices || hasPaidOptions;
  const startsFromText = locale === "en" ? "Starts from" : "يبدأ من";

  return (
    <div className={`prices${big ? " big" : ""}`}>
      {showStartsFrom && <span className="price-starts-from">{startsFromText}</span>}
      {item.prices.map((p, i) => (
        <span className="price" key={i}>
          {p.label && <small>{p.label}</small>} <b>{p.value}</b> <i>{currency}</i>
        </span>
      ))}
    </div>
  );
}

function ItemOptionsIndicator({
  item,
  locale = "ar",
}: {
  item: VItem;
  locale?: Locale;
}) {
  const hasRequired = Boolean(item.optionGroups?.some((g) => g.isRequired));
  const hasMultipleSizes = item.prices.length > 1;
  const hasOptional = Boolean(item.optionGroups?.some((g) => !g.isRequired));

  if (!hasRequired && !hasMultipleSizes && !hasOptional) return null;

  return (
    <div className="item-options-indicator">
      {hasRequired && (
        <span className="choice-chip choice-chip--required">
          {locale === "en" ? "📌 Choices required" : "📌 يتطلب الاختيار"}
        </span>
      )}
      {hasMultipleSizes && (
        <span className="choice-chip choice-chip--sizes">
          {locale === "en" ? "📏 Multiple sizes" : "📏 أحجام متعددة"}
        </span>
      )}
      {!hasRequired && hasOptional && (
        <span className="choice-chip choice-chip--optional">
          {locale === "en" ? "✨ Customization" : "✨ خيارات إضافية"}
        </span>
      )}
    </div>
  );
}
/* ───────── image / branded placeholder (looks intentional, swaps when a real photo is uploaded) ───────── */ function Media({
  src,
  alt,
  icon,
  kind,
}: {
  src?: string;
  alt: string;
  icon: string;
  kind: VKind;
}) {
  const [failed, setFailed] = useState(false);
  const { fit, sizes } = MEDIA[kind];
  if (!src || failed) {
    return (
      <div className={`ph ph--${kind}`} role="img" aria-label={alt}>
        {" "}
        <span className="ph-icon" aria-hidden>
          {" "}
          {icon}{" "}
        </span>{" "}
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
/* ───────── ingredient tags: max two lines, expand when there are more ───────── */ function Tags({
  parts,
}: {
  parts?: string[];
}) {
  const [open, setOpen] = useState(false);
  if (!parts || parts.length === 0) return null;
  return (
    <div className="tags-wrap">
      {" "}
      <ul className={`tags${open ? " open" : ""}`}>
        {" "}
        {parts.map((p, k) => (
          <li key={k}>{p}</li>
        ))}{" "}
      </ul>{" "}
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
          {" "}
          {open ? "أقل" : "عرض المكونات"}{" "}
        </button>
      )}{" "}
    </div>
  );
}
/* ───────── large platter card (trays & signature platters) — image-first ───────── */ function PlatterCard({
  item,
  i,
  n,
  currency,
  icon,
  onSelect,
  locale = "ar",
}: {
  item: VItem;
  i: number;
  n: number;
  currency: string;
  icon: string;
  onSelect: (item: VItem, icon: string, kind: VKind) => void;
  locale?: Locale;
}) {
  return (
    <article
      className="card card--platter"
      style={{ "--i": i } as CSSProperties}
      onClick={() => onSelect(item, icon, "platter")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item, icon, "platter");
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
    >
      {" "}
      <div className="platter-media">
        {" "}
        <Media src={item.img} alt={item.name} icon={icon} kind="platter" />{" "}
        {item.badge && <span className="badge on-dark">{item.badge}</span>}{" "}
      </div>{" "}
      <div className="platter-body">
        {" "}
        <div className="platter-head">
          {" "}
          <h3 className="card-title">{item.name}</h3>{" "}
        </div>{" "}
        {item.desc && <p className="desc">{item.desc}</p>}{" "}
        <Tags parts={item.parts} />{" "}
        <ItemOptionsIndicator item={item} locale={locale} />{" "}
      </div>{" "}
      <div className="platter-foot">
        {" "}
        <Prices item={item} currency={currency} big locale={locale} />{" "}
      </div>{" "}
    </article>
  );
}
/* ───────── individual meal card — top image, fixed-position price, equal heights ───────── */ function MealCard({
  item,
  i,
  currency,
  icon,
  onSelect,
  locale = "ar",
}: {
  item: VItem;
  i: number;
  currency: string;
  icon: string;
  onSelect: (item: VItem, icon: string, kind: VKind) => void;
  locale?: Locale;
}) {
  return (
    <article
      className="card card--meal"
      style={{ "--i": i } as CSSProperties}
      onClick={() => onSelect(item, icon, "meal")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item, icon, "meal");
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
    >
      {" "}
      <div className="card-media">
        {" "}
        <Media src={item.img} alt={item.name} icon={icon} kind="meal" />{" "}
        {item.badge && (
          <span className="badge on-media">{item.badge}</span>
        )}{" "}
      </div>{" "}
      <div className="card-body">
        {" "}
        <h3 className="card-title">{item.name}</h3>{" "}
        {item.desc && <p className="desc">{item.desc}</p>}{" "}
        <ItemOptionsIndicator item={item} locale={locale} />{" "}
      </div>{" "}
      <div className="card-foot">
        {" "}
        <Prices item={item} currency={currency} locale={locale} />{" "}
      </div>{" "}
    </article>
  );
}
/* ───────── compact side card (add-ons / rice / small plates) ───────── */ function SideCard({
  item,
  i,
  currency,
  icon,
  onSelect,
  locale = "ar",
}: {
  item: VItem;
  i: number;
  currency: string;
  icon: string;
  onSelect: (item: VItem, icon: string, kind: VKind) => void;
  locale?: Locale;
}) {
  return (
    <article
      className="card card--side"
      style={{ "--i": i } as CSSProperties}
      onClick={() => onSelect(item, icon, "side")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item, icon, "side");
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
    >
      {" "}
      <div className="card-top-row">
        {" "}
        <div className="side-thumb">
          {" "}
          <Media src={item.img} alt={item.name} icon={icon} kind="side" />{" "}
        </div>{" "}
        {item.badge && <span className="badge">{item.badge}</span>}{" "}
      </div>{" "}
      <div className="card-body side-main">
        {" "}
        <h3 className="card-title">{item.name}</h3>{" "}
        {item.desc && <p className="desc">{item.desc}</p>}{" "}
        <ItemOptionsIndicator item={item} locale={locale} />{" "}
      </div>{" "}
      <div className="card-foot side-foot">
        {" "}
        <Prices item={item} currency={currency} locale={locale} />{" "}
      </div>{" "}
    </article>
  );
}
/* ───────── drinks card (compact, icon-led) ───────── */ function DrinkCard({
  item,
  i,
  currency,
  icon,
  onSelect,
  locale = "ar",
}: {
  item: VItem;
  i: number;
  currency: string;
  icon: string;
  onSelect: (item: VItem, icon: string, kind: VKind) => void;
  locale?: Locale;
}) {
  return (
    <article
      className="card card--drink"
      style={{ "--i": i } as CSSProperties}
      onClick={() => onSelect(item, icon, "drink")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item, icon, "drink");
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
    >
      {" "}
      <div className="card-top-row">
        {" "}
        <div className="drink-thumb">
          {" "}
          <Media src={item.img} alt={item.name} icon={icon} kind="drink" />{" "}
        </div>{" "}
        {item.badge && <span className="badge">{item.badge}</span>}{" "}
      </div>{" "}
      <div className="card-body drink-main">
        {" "}
        <h3 className="card-title">{item.name}</h3>{" "}
        {item.desc && <p className="desc">{item.desc}</p>}{" "}
        <ItemOptionsIndicator item={item} locale={locale} />{" "}
      </div>{" "}
      <div className="card-foot drink-foot">
        {" "}
        <Prices item={item} currency={currency} locale={locale} />{" "}
      </div>{" "}
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
  onSelect: (item: VItem, icon: string, kind: VKind) => void,
  locale: Locale = "ar",
) {
  switch (kind) {
    case "platter":
      return (
        <PlatterCard
          key={item.id || i}
          item={item}
          i={i}
          n={n}
          currency={currency}
          icon={icon}
          onSelect={onSelect}
          locale={locale}
        />
      );
    case "meal":
      return (
        <MealCard
          key={item.id || i}
          item={item}
          i={i}
          currency={currency}
          icon={icon}
          onSelect={onSelect}
          locale={locale}
        />
      );
    case "side":
      return (
        <SideCard
          key={item.id || i}
          item={item}
          i={i}
          currency={currency}
          icon={icon}
          onSelect={onSelect}
          locale={locale}
        />
      );
    case "drink":
      return (
        <DrinkCard
          key={item.id || i}
          item={item}
          i={i}
          currency={currency}
          icon={icon}
          onSelect={onSelect}
          locale={locale}
        />
      );
  }
}
/* ───────── main component ───────── */ function MenuViewInner({
  locale,
  categories,
  currency: currencyProp,
  site,
  offers = [],
  mostOrderedStats,
}: {
  locale: Locale;
  categories: VCategory[];
  currency?: string;
  site?: SiteData;
  offers?: VOffer[];
  mostOrderedStats?: Record<string, { count: number; totalQty: number; name: string }>;
}) {
  const t = ui[locale];
  const isAr = locale === "ar";
  const currency = currencyProp ?? site?.currency ?? t.currency;
  const { openProductModal, totalQuantity } = useCart();
  const [selectedOffer, setSelectedOffer] = useState<VOffer | null>(null);
  const [group, setGroup] = useState<Group>("food");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "popular" | "signature" | "available">("all");
  const [sortOption, setSortOption] = useState<"default" | "price_asc" | "price_desc" | "popular">("default");
  const [priceRange, setPriceRange] = useState<"all" | "under100" | "100to300" | "over300">("all");
  const [active, setActive] = useState<string>(categories[0]?.id ?? "");
  const [showTop, setShowTop] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const q = normalize(query);
  const searching = q.length > 0;

  // Sync state from URL search params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const qParam = sp.get("q");
    const tabParam = sp.get("tab");
    const sortParam = sp.get("sort");
    const priceParam = sp.get("price");
    const groupParam = sp.get("group");

    if (qParam) setQuery(qParam);
    if (tabParam && ["all", "popular", "signature", "available"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    if (sortParam && ["default", "price_asc", "price_desc", "popular"].includes(sortParam)) {
      setSortOption(sortParam as any);
    }
    if (priceParam && ["all", "under100", "100to300", "over300"].includes(priceParam)) {
      setPriceRange(priceParam as any);
    }
    if (groupParam && ["food", "drinks"].includes(groupParam)) {
      setGroup(groupParam as any);
    }
  }, []);

  // Update URL search params as filters change (without page reload)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams();
    if (query.trim()) sp.set("q", query.trim());
    if (group !== "food") sp.set("group", group);
    if (activeTab !== "all") sp.set("tab", activeTab);
    if (sortOption !== "default") sp.set("sort", sortOption);
    if (priceRange !== "all") sp.set("price", priceRange);

    const qs = sp.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [query, group, activeTab, sortOption, priceRange]);

  const handleSelectOffer = useCallback((offer: VOffer) => {
    setSelectedOffer(offer);
  }, []);

  const isFiltering = searching || activeTab !== "all" || sortOption !== "default" || priceRange !== "all";

  const resetAllFilters = useCallback(() => {
    setQuery("");
    setActiveTab("all");
    setSortOption("default");
    setPriceRange("all");
  }, []);

  /* what is on screen: the active tab, or every match while searching / filtering */
  const visible = useMemo(() => {
    const base = (searching || activeTab === "popular" || activeTab === "signature")
      ? categories
      : categories.filter((c) => c.group === group);

    return base
      .map((c) => {
        const sections = c.sections
          .map((s) => {
            let items = s.items.map((it) => {
              const orderCount = mostOrderedStats?.[it.id]?.count || 0;
              return { ...it, orderCount };
            });

            // 1. Text search filter
            if (searching) {
              items = items.filter((it) => it.q.includes(q));
            }

            // 2. Dynamic quick tab filter
            if (activeTab === "popular") {
              items = items.filter(
                (it) => (it.orderCount || 0) > 0 || (it.badge && it.badge.includes("طلباً")) || it.isFeatured
              );
            } else if (activeTab === "signature") {
              items = items.filter((it) => it.isFeatured || Boolean(it.badge));
            } else if (activeTab === "available") {
              items = items.filter((it) => it.isAvailable !== false);
            }

            // 3. Price range filter
            if (priceRange === "under100") {
              items = items.filter((it) => (it.minPrice ?? 0) < 100);
            } else if (priceRange === "100to300") {
              items = items.filter((it) => (it.minPrice ?? 0) >= 100 && (it.minPrice ?? 0) <= 300);
            } else if (priceRange === "over300") {
              items = items.filter((it) => ((it.maxPrice ?? it.minPrice ?? 0) > 300));
            }

            // 4. Sorting
            if (sortOption === "price_asc") {
              items.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
            } else if (sortOption === "price_desc") {
              items.sort((a, b) => (b.maxPrice ?? b.minPrice ?? 0) - (a.maxPrice ?? a.minPrice ?? 0));
            } else if (sortOption === "popular") {
              items.sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0));
            }

            return { ...s, items };
          })
          .filter((s) => s.items.length > 0);

        return { ...c, sections };
      })
      .filter((c) => c.sections.length > 0);
  }, [categories, group, q, searching, activeTab, sortOption, priceRange, mostOrderedStats]);
  /* keep the sticky-bar height in a CSS variable (used for scroll offsets) */ useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const set = () =>
      document.documentElement.style.setProperty(
        "--bar-h",
        `${bar.offsetHeight}px`,
      );
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);
  /* scroll-spy: highlight the chip of the section currently under the bar */ useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const barH = barRef.current?.offsetHeight ?? 130;
      let current = visible[0]?.id ?? "";
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
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visible]);
  /* keep the active chip centered inside the horizontal scroller */ useEffect(() => {
    const chip = chipRefs.current[active];
    const box = chipsRef.current;
    if (!chip || !box) return;
    const c = chip.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const delta = c.left + c.width / 2 - (b.left + b.width / 2);
    if (Math.abs(delta) > 4) box.scrollBy({ left: delta, behavior: "smooth" });
  }, [active]);
  const goTo = useCallback((id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const switchGroup = (g: Group) => {
    if (g === group && !searching) return;
    setQuery("");
    setGroup(g);
    setActive(categories.find((c) => c.group === g)?.id ?? "");
    requestAnimationFrame(() => {
      const top =
        (menuRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
      window.scrollTo({ top: Math.max(top - 8, 0), behavior: "smooth" });
    });
  };
  const total = visible.reduce(
    (n, c) => n + c.sections.reduce((m, s) => m + s.items.length, 0),
    0,
  );
  return (
    <div ref={menuRef} id="menu">
      {" "}
      {offers.length > 0 && !searching && (
        <OffersSection
          offers={offers}
          locale={locale}
          currency={currency}
          branches={site?.branches ?? []}
          onSelectOffer={handleSelectOffer}
        />
      )}{" "}
      <div className="bar" ref={barRef}>
        {" "}
        <div className="container">
          {" "}
          <div className="bar-row">
            {" "}
            <div className="tabs" role="group" aria-label={t.menu}>
              {" "}
              <button
                className="tab"
                aria-pressed={!searching && group === "food"}
                onClick={() => switchGroup("food")}
              >
                {" "}
                {t.food}{" "}
              </button>{" "}
              <button
                className="tab"
                aria-pressed={!searching && group === "drinks"}
                onClick={() => switchGroup("drinks")}
              >
                {" "}
                {t.drinks}{" "}
              </button>{" "}
            </div>{" "}
            <label className="search">
              {" "}
              <SearchIcon className="search-icon" />{" "}
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search}
                aria-label={t.search}
                enterKeyHint="search"
                autoComplete="off"
                suppressHydrationWarning
              />{" "}
              {query && (
                <button
                  type="button"
                  className="clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear"
                >
                  {" "}
                  <CloseIcon width={16} height={16} />{" "}
                </button>
              )}{" "}
            </label>{" "}
          </div>{" "}
          {/* Quick Dynamic Tabs */}
          <div
            className="quick-tabs-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              overflowX: "auto",
              padding: "6px 0",
              scrollbarWidth: "none",
            }}
          >
            <button
              type="button"
              className={`quick-tab-pill${activeTab === "all" ? " active" : ""}`}
              onClick={() => setActiveTab("all")}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 700,
                border: activeTab === "all" ? "1.5px solid #b8860b" : "1px solid #e2e8f0",
                background: activeTab === "all" ? "#fef3c7" : "#ffffff",
                color: activeTab === "all" ? "#92400e" : "#475569",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🍽️</span>
              <span>{isAr ? "الكل" : "All Menu"}</span>
            </button>

            <button
              type="button"
              className={`quick-tab-pill${activeTab === "popular" ? " active" : ""}`}
              onClick={() => setActiveTab("popular")}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 700,
                border: activeTab === "popular" ? "1.5px solid #ea580c" : "1px solid #e2e8f0",
                background: activeTab === "popular" ? "#ffedd5" : "#ffffff",
                color: activeTab === "popular" ? "#9a3412" : "#475569",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🔥</span>
              <span>{isAr ? "الأكثر طلباً" : "Most Ordered"}</span>
            </button>

            <button
              type="button"
              className={`quick-tab-pill${activeTab === "signature" ? " active" : ""}`}
              onClick={() => setActiveTab("signature")}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 700,
                border: activeTab === "signature" ? "1.5px solid #7c3aed" : "1px solid #e2e8f0",
                background: activeTab === "signature" ? "#f5f3ff" : "#ffffff",
                color: activeTab === "signature" ? "#5b21b6" : "#475569",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>✨</span>
              <span>{isAr ? "المميز والجديد" : "Signature & New"}</span>
            </button>

            <button
              type="button"
              className={`quick-tab-pill${activeTab === "available" ? " active" : ""}`}
              onClick={() => setActiveTab("available")}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 700,
                border: activeTab === "available" ? "1.5px solid #16a34a" : "1px solid #e2e8f0",
                background: activeTab === "available" ? "#f0fdf4" : "#ffffff",
                color: activeTab === "available" ? "#166534" : "#475569",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>✅</span>
              <span>{isAr ? "المتاح فقط" : "Available Only"}</span>
            </button>
          </div>

          {/* Controls row: Sorting and Price Range */}
          <div
            className="filter-controls-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
              padding: "6px 0",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
                {isAr ? "السعر:" : "Price:"}
              </span>
              <button
                type="button"
                onClick={() => setPriceRange("all")}
                style={{
                  padding: "3px 10px",
                  borderRadius: "14px",
                  fontSize: "11px",
                  fontWeight: priceRange === "all" ? 700 : 500,
                  background: priceRange === "all" ? "#0f172a" : "#f1f5f9",
                  color: priceRange === "all" ? "#ffffff" : "#475569",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isAr ? "الكل" : "All"}
              </button>
              <button
                type="button"
                onClick={() => setPriceRange("under100")}
                style={{
                  padding: "3px 10px",
                  borderRadius: "14px",
                  fontSize: "11px",
                  fontWeight: priceRange === "under100" ? 700 : 500,
                  background: priceRange === "under100" ? "#0f172a" : "#f1f5f9",
                  color: priceRange === "under100" ? "#ffffff" : "#475569",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isAr ? "< 100 ج.م" : "< 100"}
              </button>
              <button
                type="button"
                onClick={() => setPriceRange("100to300")}
                style={{
                  padding: "3px 10px",
                  borderRadius: "14px",
                  fontSize: "11px",
                  fontWeight: priceRange === "100to300" ? 700 : 500,
                  background: priceRange === "100to300" ? "#0f172a" : "#f1f5f9",
                  color: priceRange === "100to300" ? "#ffffff" : "#475569",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isAr ? "100 - 300 ج.م" : "100-300"}
              </button>
              <button
                type="button"
                onClick={() => setPriceRange("over300")}
                style={{
                  padding: "3px 10px",
                  borderRadius: "14px",
                  fontSize: "11px",
                  fontWeight: priceRange === "over300" ? 700 : 500,
                  background: priceRange === "over300" ? "#0f172a" : "#f1f5f9",
                  color: priceRange === "over300" ? "#ffffff" : "#475569",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isAr ? "> 300 ج.م" : "> 300"}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
                  {isAr ? "الترتيب:" : "Sort:"}
                </span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  <option value="default">{isAr ? "الافتراضي" : "Default"}</option>
                  <option value="price_asc">{isAr ? "السعر: من الأقل للأعلى" : "Price: Low to High"}</option>
                  <option value="price_desc">{isAr ? "السعر: من الأعلى للأقل" : "Price: High to Low"}</option>
                  <option value="popular">{isAr ? "الأكثر طلباً" : "Most Popular"}</option>
                </select>
              </div>

              {isFiltering && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "#fee2e2",
                    color: "#b91c1c",
                    border: "1px solid #fca5a5",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>✕</span>
                  <span>{isAr ? "مسح الفلاتر" : "Reset"}</span>
                </button>
              )}
            </div>
          </div>{" "}
          {visible.length > 0 && (
            <nav className="chips" ref={chipsRef} aria-label={t.categories}>
              {" "}
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
                  {" "}
                  <span aria-hidden>{c.icon}</span>{" "}
                  <span className="chip-label">{c.name}</span>{" "}
                </button>
              ))}{" "}
            </nav>
          )}{" "}
        </div>{" "}
      </div>{" "}
      <div className="container">
        {" "}
        <p className="sr-only" role="status" aria-live="polite">
          {" "}
          {searching ? `${total}` : ""}{" "}
        </p>{" "}
        {visible.length === 0 && (
          <div
            className="empty-state-card"
            style={{
              margin: "40px auto",
              maxWidth: "460px",
              padding: "36px 24px",
              textAlign: "center",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              direction: isAr ? "rtl" : "ltr",
            }}
          >
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>🔍</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
              {isAr ? "لم يتم العثور على أطباق مطابقة" : "No Matching Dishes Found"}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
              {isAr
                ? "جرب البحث بكلمات أخرى أو أعد ضبط نطاق الأسعار والفلاتر لعرض المنيو كاملاً."
                : "Try searching with different keywords or reset filters to view all menu dishes."}
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              style={{
                padding: "10px 22px",
                borderRadius: "10px",
                background: "#b8860b",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(184, 134, 11, 0.2)",
              }}
            >
              {isAr ? "إعادة ضبط الفلاتر وعرض المنيو" : "Reset Filters & Show Menu"}
            </button>
          </div>
        )}{" "}
        {visible.map((c) => {
          let counter = 0;
          return (
            <Reveal key={`${c.id}-${searching ? "s" : "n"}`} id={c.id}>
              {" "}
              <div className={`cat-head cat-head--${c.kind}`}>
                {" "}
                {c.img ? (
                  <Image
                    className="cat-img"
                    src={c.img}
                    alt={c.name}
                    width={96}
                    height={96}
                    sizes="(max-width: 700px) 40px, 64px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <span className="cat-icon" aria-hidden>
                    {" "}
                    {c.icon}{" "}
                  </span>
                )}{" "}
                <div className="cat-titles">
                  {" "}
                  <h2 className="cat-title" id={`${c.id}-title`}>
                    {" "}
                    {c.name}{" "}
                  </h2>{" "}
                  {c.nameAlt && (
                    <span className="cat-alt">{c.nameAlt}</span>
                  )}{" "}
                </div>{" "}
                <span className="cat-rule" aria-hidden />{" "}
              </div>{" "}
              {c.sections.map((s, si) => (
                <div className="sub" key={si}>
                  {" "}
                  {s.title && <h3 className="sub-title">{s.title}</h3>}{" "}
                  <div className="grid" data-kind={c.kind}>
                    {" "}
                    {s.items.map((it, ii) => {
                      counter += 1;
                      return renderItem(
                        c.kind,
                        it,
                        ii,
                        counter,
                        currency,
                        c.icon,
                        openProductModal,
                        locale,
                      );
                    })}{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </Reveal>
          );
        })}{" "}
      </div>{" "}
      <button
        className={`to-top${showTop ? " show" : ""}${totalQuantity > 0 ? " has-cart" : ""}`}
        aria-label={t.backToTop}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        {" "}
        <ArrowUpIcon />{" "}
      </button>{" "}
      <ProductDetailModal locale={locale} currency={currency} />{" "}
      <OfferDetailModal
        offer={selectedOffer}
        categories={categories}
        branches={site?.branches ?? []}
        locale={locale}
        currency={currency}
        onClose={() => setSelectedOffer(null)}
      />{" "}
      <CartDrawer
        locale={locale}
        currency={currency}
        restaurantName={site?.brand ?? t.brand}
        phoneIntl={site?.phoneIntl ?? PHONE_INTL}
        vatNote={site?.vat ?? t.vat}
        deliveryFee={site?.deliveryFee}
      />{" "}
      <FloatingCartBar locale={locale} currency={currency} />{" "}
    </div>
  );
}
export default function MenuView(props: {
  locale: Locale;
  categories: VCategory[];
  currency?: string;
  site?: SiteData;
  offers?: VOffer[];
  menuSettings?: MenuModeSettings;
  mostOrderedStats?: Record<string, { count: number; totalQty: number; name: string }>;
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
      menuSettings={props.menuSettings}
    >
      {" "}
      <MenuViewInner {...props} />{" "}
    </CartProvider>
  );
}
