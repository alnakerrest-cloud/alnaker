'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { VOffer } from '@/lib/offers';
import type { VBranch } from '@/lib/site-db';
import type { Locale } from '@/lib/i18n';
import { ui } from '@/lib/i18n';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface OffersSectionProps {
  offers: VOffer[];
  locale: Locale;
  currency: string;
  branches?: VBranch[];
  onSelectOffer?: (offer: VOffer) => void;
}

export default function OffersSection({
  offers,
  locale,
  currency,
  branches = [],
  onSelectOffer,
}: OffersSectionProps) {
  const t = ui[locale];
  const isRtl = locale === 'ar';

  // State 1: 0 active offers -> hide completely
  if (!offers || offers.length === 0) {
    return null;
  }

  const isSingle = offers.length === 1;

  // Slider state for 2+ offers
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const prevSlide = useCallback(() => {
    setCurrentSlide((curr) => (curr === 0 ? offers.length - 1 : curr - 1));
  }, [offers.length]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((curr) => (curr === offers.length - 1 ? 0 : curr + 1));
  }, [offers.length]);

  // Autoplay every 5.5s
  useEffect(() => {
    if (isSingle || isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5500);
    return () => clearInterval(timer);
  }, [isSingle, isPaused, nextSlide]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(diff) > 40) {
      if (isRtl) {
        if (diff > 0) nextSlide();
        else prevSlide();
      } else {
        if (diff < 0) nextSlide();
        else prevSlide();
      }
    }
  };

  // Helper to format branch labels
  const getBranchLabel = (offer: VOffer) => {
    if (!offer.locationIds || offer.locationIds.length === 0) return t.allBranches;
    const names = offer.locationIds
      .map((id) => branches.find((b) => b.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(' • ') : t.allBranches;
  };

  return (
    <section
      className={`offers-section ${isSingle ? 'offers-section--single' : 'offers-section--slider'}`}
      aria-labelledby="offers-heading"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container">
        {/* Section Header */}
        <div className="offers-header">
          <div className="offers-title-wrap">
            <span className="offers-badge" aria-hidden="true">
              ✨ {t.offersSectionTitle}
            </span>
            <h2 id="offers-heading" className="offers-title">
              {t.offersSectionTitle}
            </h2>
            <p className="offers-subtitle">{t.offersSectionSubtitle}</p>
          </div>

          {/* Slider Controls in Header when 2+ offers */}
          {!isSingle && (
            <div className="offers-slider-controls" aria-label={t.offersSectionTitle}>
              <button
                type="button"
                className="slider-nav-btn slider-nav-btn--prev"
                onClick={prevSlide}
                aria-label={t.prevOffer}
              >
                {isRtl ? <ChevronRightIcon width={18} height={18} /> : <ChevronLeftIcon width={18} height={18} />}
              </button>
              <span className="slider-counter">
                {currentSlide + 1} / {offers.length}
              </span>
              <button
                type="button"
                className="slider-nav-btn slider-nav-btn--next"
                onClick={nextSlide}
                aria-label={t.nextOffer}
              >
                {isRtl ? <ChevronLeftIcon width={18} height={18} /> : <ChevronRightIcon width={18} height={18} />}
              </button>
            </div>
          )}
        </div>

        {/* ───────── STATE 2: SINGLE FEATURED OFFER ───────── */}
        {isSingle && (
          <div className="offers-featured-wrapper">
            {offers.map((offer) => {
              const branchLabel = getBranchLabel(offer);
              return (
                <article
                  key={offer.id}
                  className="offer-card offer-card--featured"
                  tabIndex={0}
                  onClick={() => onSelectOffer?.(offer)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectOffer?.(offer);
                    }
                  }}
                >
                  {/* Left/Top: Media */}
                  <div className="offer-media offer-media--featured">
                    {offer.imageUrl ? (
                      <Image
                        src={offer.imageUrl}
                        alt={offer.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 580px"
                        style={{ objectFit: 'cover' }}
                        priority
                      />
                    ) : (
                      <div className="offer-media-ph">
                        <span className="offer-ph-icon">🏷️</span>
                      </div>
                    )}
                    <span className="offer-tag">{offer.badge}</span>
                  </div>

                  {/* Right/Bottom: Content */}
                  <div className="offer-content offer-content--featured">
                    <div className="offer-meta-top">
                      <span className="offer-branch-pill">
                        📍 {t.availableAtBranches}: {branchLabel}
                      </span>
                    </div>

                    <h3 className="offer-name offer-name--featured">{offer.title}</h3>

                    {offer.primaryProductName && (
                      <div className="offer-product-pill">
                        🍽️ {t.includedProduct}: <strong>{offer.primaryProductName}</strong>
                      </div>
                    )}

                    {offer.desc && <p className="offer-desc offer-desc--featured">{offer.desc}</p>}

                    <div className="offer-footer offer-footer--featured">
                      <div className="offer-pricing">
                        {offer.originalPrice != null && offer.discountedPrice != null && (
                          <div className="offer-price-row">
                            <s className="offer-orig-price">
                              {offer.originalPrice} {currency}
                            </s>
                            <b className="offer-promo-price offer-promo-price--lg">
                              {offer.discountedPrice} {currency}
                            </b>
                          </div>
                        )}
                        {offer.savingsText && (
                          <span className="offer-savings-badge">{offer.savingsText}</span>
                        )}
                      </div>

                      {onSelectOffer && (
                        <button
                          type="button"
                          className="btn-claim-offer btn-claim-offer--featured"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOffer(offer);
                          }}
                        >
                          <span>{t.viewOfferProduct}</span>
                          <span className="btn-claim-arrow" aria-hidden="true">
                            {isRtl ? '←' : '→'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ───────── STATE 3: 2+ OFFERS SLIDER / CAROUSEL ───────── */}
        {!isSingle && (
          <div
            className="offers-slider-viewport"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="offers-slider-track"
              style={{
                transform: `translateX(${isRtl ? currentSlide * 100 : -currentSlide * 100}%)`,
              }}
            >
              {offers.map((offer, idx) => {
                const branchLabel = getBranchLabel(offer);
                const isActive = idx === currentSlide;

                return (
                  <div
                    key={offer.id}
                    className={`offers-slide ${isActive ? 'offers-slide--active' : ''}`}
                    aria-hidden={!isActive}
                  >
                    <article
                      className="offer-card offer-card--featured"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => onSelectOffer?.(offer)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectOffer?.(offer);
                        }
                      }}
                    >
                      <div className="offer-media offer-media--featured">
                        {offer.imageUrl ? (
                          <Image
                            src={offer.imageUrl}
                            alt={offer.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 580px"
                            style={{ objectFit: 'cover' }}
                            priority={idx === 0}
                          />
                        ) : (
                          <div className="offer-media-ph">
                            <span className="offer-ph-icon">🏷️</span>
                          </div>
                        )}
                        <span className="offer-tag">{offer.badge}</span>
                      </div>

                      <div className="offer-content offer-content--featured">
                        <div className="offer-meta-top">
                          <span className="offer-branch-pill">
                            📍 {t.availableAtBranches}: {branchLabel}
                          </span>
                        </div>

                        <h3 className="offer-name offer-name--featured">{offer.title}</h3>

                        {offer.primaryProductName && (
                          <div className="offer-product-pill">
                            🍽️ {t.includedProduct}: <strong>{offer.primaryProductName}</strong>
                          </div>
                        )}

                        {offer.desc && (
                          <p className="offer-desc offer-desc--featured">{offer.desc}</p>
                        )}

                        <div className="offer-footer offer-footer--featured">
                          <div className="offer-pricing">
                            {offer.originalPrice != null && offer.discountedPrice != null && (
                              <div className="offer-price-row">
                                <s className="offer-orig-price">
                                  {offer.originalPrice} {currency}
                                </s>
                                <b className="offer-promo-price offer-promo-price--lg">
                                  {offer.discountedPrice} {currency}
                                </b>
                              </div>
                            )}
                            {offer.savingsText && (
                              <span className="offer-savings-badge">{offer.savingsText}</span>
                            )}
                          </div>

                          {onSelectOffer && (
                            <button
                              type="button"
                              className="btn-claim-offer btn-claim-offer--featured"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectOffer(offer);
                              }}
                            >
                              <span>{t.viewOfferProduct}</span>
                              <span className="btn-claim-arrow" aria-hidden="true">
                                {isRtl ? '←' : '→'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>

            {/* Pagination Dots */}
            <div className="offers-slider-dots" role="tablist" aria-label={t.offersSectionTitle}>
              {offers.map((o, idx) => (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentSlide}
                  className={`slider-dot ${idx === currentSlide ? 'slider-dot--active' : ''}`}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`${t.offersSectionTitle} ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
