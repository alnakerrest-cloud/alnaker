# Naqer Menu — Final Mobile UI/UX, Branding & Visual Acceptance

## 1. Current mobile problems found

Baseline evidence was captured from the running application at `http://127.0.0.1:3001` in visible Chromium (`headless: false`) before changes.

- Arabic `/ar` at 375×812: Hero height **413px**, category bar **116px**, offers section **555px**, first product top **1288px**.
- Arabic `/ar` at 320×740: Hero height **493px**, hero actions **157px** because the call/branch actions wrapped, first product top **1248px**.
- Product grid was one column on phones. The first platter card was **440px–463px tall** and almost full-width, consuming roughly half of the first mobile viewport.
- The offers section acted as a second full-screen hero before the menu.
- The logo was a generic fallback monogram, not the supplied Naqer camel/palm/Arabic wordmark artwork.

## 2. Root causes

- Desktop Hero spacing and action layout were inherited unchanged on phones.
- Category navigation used a tall two-row layout with 54px pills and large search/tab controls.
- The product grid used `repeat(auto-fill, minmax(320px, 1fr))`, which naturally collapsed to one column on phone widths.
- Offers used a single-column card with a 220px media block at mobile widths.
- No mobile-specific brand lockup or compact logo sizing existed.
- Platter image `sizes` requested `92vw` even though a denser grid was intended.

## 3. Logo source and adaptation

The supplied `naqerlogo.pdf` was inspected as the authoritative source. It contains a 5000×5000 embedded JPEG with the camel, palm trees, and Arabic wordmark “الناقل”.

The artwork was extracted from the PDF, converted to a transparent working mask, and traced to a single vector path. The vector path was checked against the source mask at 1600×1600: **IoU 0.994**, with 12,998 differing pixels out of 2,560,000. The traced master is stored as `lib/naqer-logo-path.ts` and rendered by `components/Logo.tsx`.

The original artwork is preserved; no camel substitution, symbol replacement, stretching, cropping, or random recoloring was used.

## 4. Logo variants created/used

- `public/brand/naqer-logo-dark.svg` — dark brand version for light backgrounds.
- `public/brand/naqer-logo-light.svg` — cream/gold inverted version for dark backgrounds.
- `public/brand/naqer-mark.svg` — app-icon composition derived from the same artwork.
- `public/brand/naqer-icon-512.png` — 512px app icon raster.
- `app/icon.svg` — favicon/app icon using the authoritative brand mark.
- `app/apple-icon.png` — 180px Apple touch icon.
- `lib/naqer-logo-path.ts` — vector path + viewBox shared by the React logo.
- `naqerlogo.pdf` — retained as the authoritative brand source.

The React `Logo` component uses one inline vector with `fill="currentColor"`. The compact mobile treatment is the same vector at 64px (56px at ≤359px), avoiding duplicate artwork and keeping the mark crisp. Uploaded Cloudinary logos still take precedence when configured.

## 5. Brand treatment decisions

- Dark Hero: cream/gold logo (`#F6E6C3`) against the existing maroon Hero.
- Light/admin contexts: inherited dark ink color.
- Favicon/app icon: existing brand maroon `#5C2A26` background with gold `#E3B25A` artwork.
- No gradients, 3D effects, glows, heavy shadows, or arbitrary recoloring were added.
- The logo keeps its original proportions and aspect ratio.

## 6. Hero redesign

Mobile Hero is now a compact brand lockup:

- Logo and brand title share one row.
- Tagline sits below at a controlled width.
- Call action is a full-width primary action; the two branch links share a second row.
- Language switch is positioned in the top corner.
- Desktop Hero remains centered and unchanged.

Measured result:

| Locale | Width | Before Hero | After Hero |
|---|---:|---:|---:|
| ar | 320 | 493px | 250px |
| ar | 375 | 413px | 259px |
| en | 375 | 413px | 259px |

## 7. Category/tab redesign

- Sticky category bar reduced from **116–119px** to **93px** on phones.
- Tabs reduced to 34px compact controls.
- Search reduced to 38px.
- Category pills reduced to 32px with horizontal scrolling.
- Long category labels are wrapped in `.chip-label` with ellipsis while the full category remains accessible by scrolling.
- RTL and LTR both use logical inline properties and were tested visually.

## 8. Product grid redesign

- Phone grids now use an intentional **two-column** layout at `max-width: 700px`.
- The grid remains two columns at 768px, then returns to the existing 3-column desktop layout.
- Mobile card widths measured **139px–194px** across 320–430px.
- Mobile card heights measured **211px–253px** maximum in the real content audit.
- Multiple cards are visible in the first viewport: 2 cards at 320–430px in the audit.
- Desktop grid remains unchanged (3 columns at 1440px).

## 9. Card/image redesign

- Platter cards retain the image-first dark treatment but use a 4:3 media ratio, reduced padding, 3-line title clamp, 2-line description clamp, one-line ingredient preview, and a compact price row.
- Meal cards use the existing image-first layout with reduced mobile padding, 3-line title clamp, 2-line description clamp, and compact price/badge sizing.
- Side/drink cards use 44px thumbnails and reduced vertical spacing.
- Missing-image placeholders remain consistent and are visible at compact sizes.
- Card titles and descriptions are clamped only on cards; full content remains available in the detail modal.
- The longest synthetic content test kept both cards at **264px** height with no horizontal overflow.

## 10. Responsive breakpoint strategy

Existing breakpoints were inspected first. The final implementation adds only three focused ranges:

- `max-width: 700px` — phone composition, two-column grid, compact Hero/bar/offers.
- `max-width: 480px` — hide the supporting offers subtitle.
- `max-width: 359px` — tighter Hero/logo/card spacing for 320–359px screens.
- `min-width: 701px and max-width: 900px` — tablet offers card becomes horizontal and stops consuming another full screen.

Desktop rules above 900px are unchanged.

## 11. RTL/LTR verification

Both `/ar` and `/en` were tested in visible Chromium at every required viewport.

- Arabic: RTL document direction, right-aligned brand lockup, RTL category flow, correct icon/text order, no horizontal overflow.
- English: LTR document direction, left-aligned brand lockup, LTR category flow, no horizontal overflow.
- Language switch remains functional in both directions.
- No horizontal overflow was detected at 320, 360, 375, 390, 430, 768, or 1440px in either locale.

## 12. Browser testing results

Visible Chromium was used with `headless: false` for:

- Baseline audit.
- Final viewport matrix.
- Quality audit.
- Long-content stress test.
- Logo close-up capture.
- Full Playwright E2E suite (headed).

No source-only or headless-only visual claim is used for the final acceptance.

## 13. Viewport matrix

Final measured matrix from `acceptance-evidence/naqer-mobile-brand/final-metrics.json` and `quality-audit.json`:

| Locale | Width | Hero | Logo | Bar | Grid cols | First card | First product top | Overflow |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| ar | 320 | 250 | 56 | 93 | 2 | 139×211 | 710 | no |
| ar | 360 | 259 | 64 | 93 | 2 | 159×241 | 720 | no |
| ar | 375 | 259 | 64 | 93 | 2 | 167×253 | 729 | no |
| ar | 390 | 259 | 64 | 93 | 2 | 174×253 | 730 | no |
| ar | 430 | 259 | 64 | 93 | 2 | 194×253 | 733 | no |
| ar | 768 | 399 | 86 | 120 | 2 | 359×457 | 1096 | no |
| ar | 1440 | 413 | 86 | 120 | 3 | 361×357 | 1247 | no |
| en | 320 | 250 | 56 | 93 | 2 | 139×211 | 710 | no |
| en | 360 | 259 | 64 | 93 | 2 | 159×241 | 720 | no |
| en | 375 | 259 | 64 | 93 | 2 | 167×253 | 729 | no |
| en | 390 | 259 | 64 | 93 | 2 | 174×253 | 730 | no |
| en | 430 | 259 | 64 | 93 | 2 | 194×253 | 733 | no |
| en | 768 | 399 | 86 | 120 | 2 | 359×457 | 1096 | no |
| en | 1440 | 413 | 86 | 120 | 3 | 361×357 | 1247 | no |

1024×768 is covered by E2E responsive evidence: `qa-final/resp-1024x768-public-ar.png`, `qa-final/resp-1024x768-admin.png`, and `qa-final/resp-1024x768-login.png`.

## 14. Screenshot paths

All paths are relative to the repository root.

### Mobile top-of-page / Hero / navigation / grid

- `acceptance-evidence/naqer-mobile-brand/final-ar-320-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-320-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-ar-360-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-360-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-ar-375-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-375-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-ar-390-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-390-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-ar-430-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-430-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-ar-768-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-768-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-ar-1440-top.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-1440-top.png`

Element-level evidence:

- `acceptance-evidence/naqer-mobile-brand/final-ar-375-hero.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-375-hero.png`
- `acceptance-evidence/naqer-mobile-brand/final-ar-375-nav.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-375-nav.png`
- `acceptance-evidence/naqer-mobile-brand/final-ar-375-grid.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-375-grid.png`

Logo:

- `acceptance-evidence/naqer-mobile-brand/logo-ar-375.png`
- `acceptance-evidence/naqer-mobile-brand/logo-en-375.png`

Long content:

- `acceptance-evidence/naqer-mobile-brand/long-content-ar-360-card.png`
- `acceptance-evidence/naqer-mobile-brand/long-content-en-360-card.png`
- `acceptance-evidence/naqer-mobile-brand/long-content-ar-360-top.png`
- `acceptance-evidence/naqer-mobile-brand/long-content-en-360-top.png`

Missing-image placeholder:

- `acceptance-evidence/naqer-mobile-brand/quality-ar-missing-image-card.png`
- `acceptance-evidence/naqer-mobile-brand/quality-en-missing-image-card.png`

Full-page:

- `acceptance-evidence/naqer-mobile-brand/final-ar-375-full.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-375-full.png`
- `acceptance-evidence/naqer-mobile-brand/final-ar-1440-full.png`
- `acceptance-evidence/naqer-mobile-brand/final-en-1440-full.png`

Raw evidence:

- `acceptance-evidence/naqer-mobile-brand/baseline-metrics.json`
- `acceptance-evidence/naqer-mobile-brand/final-metrics.json`
- `acceptance-evidence/naqer-mobile-brand/quality-audit.json`
- `acceptance-evidence/naqer-mobile-brand/long-content-audit.json`

## 15. TypeScript result

`npm run typecheck` → **PASS** (`tsc --noEmit`, no output, exit 0).

## 16. Lint result

**Not available in this project.** There is no `lint` script, no ESLint dependency/config, and Next.js 16.4.2 no longer provides the old `next lint` command. TypeScript and the production build were used as the available static checks. No lint failure was hidden or disabled.

## 17. Production build result

`npm run build` → **PASS**.

- Compiled successfully in 8.7s.
- TypeScript check passed.
- 10 static pages generated.
- Routes generated successfully.
- Pre-existing warnings only: root `bun.lock` outside repo, deprecated `middleware` convention, and a PostgreSQL SSL mode warning. No new build errors.

## 18. E2E result

Visible Chromium E2E was run against the staging environment with temporary staging-only E2E accounts. Production data was not touched.

Relevant results:

- `tests/07-interactive-cart.spec.ts` — **8/8 passed**.
- `tests/12-final-release-smoke.spec.ts` — **4/4 passed**.
- `tests/13-post-cleanup-public-verification.spec.ts` — **2/2 passed**.
- `tests/03-responsive.spec.ts` — public menu and admin responsive tests **passed** in the full run.
- `tests/09-card-layouts-and-offers.spec.ts` card-layout audit — **passed** after removing a leftover staging test product and allowing the slow-environment timeout (`--timeout=300000`).

Full-suite caveat:

- The complete 65-test suite did not finish within one 40-minute execution window.
- One product CRUD test hit its own 300s timeout during the Cloudinary upload path and left a `ZZ...` staging test product. The product was deleted, and the card-layout test then passed.
- The offers CRUD tests were not rerun after staging cleanup.
- The initial suite attempt without credentials correctly failed because `.env.staging.local` did not contain `E2E_ADMIN_*`/`E2E_EDITOR_*` credentials. Temporary staging-only accounts were created, used, and deleted afterward.
- No E2E test was disabled, skipped, or weakened.

## 19. Performance observations

- Default logo is inline SVG (15.9KB path module) with no additional raster request.
- No new runtime dependencies were added.
- Platter mobile image sizing changed from `92vw` to `46vw`.
- Offer mobile image sizing changed from `100vw` to `42vw`.
- Category image `sizes` now requests 40px on mobile instead of 96px.
- Hero logo dimensions are fixed by CSS, reducing avoidable layout shift.
- Product cards use existing Next.js image optimization and existing lazy-loading behavior.
- No duplicate logo raster assets are requested by the React component.
- No horizontal overflow was observed at any tested viewport.

## 20. Files changed

- `app/globals.css`
- `app/icon.svg`
- `app/apple-icon.png` (new)
- `components/Hero.tsx`
- `components/Logo.tsx`
- `components/MenuView.tsx`
- `components/OffersSection.tsx`
- `lib/naqer-logo-path.ts` (new)
- `public/brand/naqer-logo-dark.svg` (new)
- `public/brand/naqer-logo-light.svg` (new)
- `public/brand/naqer-mark.svg` (new)
- `public/brand/naqer-icon-512.png` (new)
- `naqerlogo.pdf` (authoritative source retained)
- `NAQER_MOBILE_BRAND_UI_FINAL_ACCEPTANCE.md` (this report)

No backend, API, schema, production data, or deployment configuration was changed.

## 21. Regression analysis

- Category navigation, product rendering, language switching, cart, offers UI, modals, and admin shell were exercised by the relevant E2E specs.
- Desktop layout remains unchanged: 1440px still uses the 3-column grid, 413px Hero, and the existing 120px category bar.
- Tablet now uses a horizontal offers card and a 2-column product grid instead of a stretched phone or compressed desktop layout.
- No horizontal overflow was found in any tested locale or viewport.
- The only code changes are presentational components, CSS, logo assets, and responsive image `sizes`.
- No test was modified to obtain a pass.

## 22. Remaining limitations

- The full 65-test E2E suite is not green in one run because of staging credential setup, a Cloudinary-dependent product CRUD timeout, and the 40-minute execution cap. All directly relevant public-menu, responsive, cart, card-layout, and smoke tests passed.
- Offers CRUD E2E tests were not rerun after the staging cleanup.
- Lint is unavailable because the project has no ESLint setup.
- Synthetic long-content testing modified the DOM in the visible browser only; no production or staging content was changed.
- Tablet first product starts at 1096px because the richer tablet offers card is retained; the grid itself is correctly 2-column and overflow-free.

## 23. Final acceptance verdict

**PASS — mobile visual and branding acceptance.**

The Naqer Menu now has a compact premium Hero, a controlled brand lockup using the supplied camel/palm/Arabic logo, compact category navigation, an intentional two-column phone product grid, consistent image/card proportions, readable cards, efficient viewport usage, and correct RTL/LTR behavior. Desktop is preserved, tablet transitions through a horizontal offers treatment and 2-column grid, and no horizontal overflow was observed.

The visual result is a website intentionally designed for mobile, not a desktop layout squeezed into a phone.