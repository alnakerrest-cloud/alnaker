# Naqer Menu — Final CRUD Acceptance + Temporary Menu Image Assignment

Date: 2026-11-04 · Branch: `main` · DB: Neon PostgreSQL (live) · Cloudinary: live · No production deploy.

Legend: **PASS** = verified against authoritative DB + UI · **N/A** = not applicable by schema/design · **FLAKE** = passed on retry in isolation.

---

## 1. CRUD Acceptance Report (per feature)

Executed by `tests/05-crud-acceptance.spec.ts` (headed Playwright, DB-authoritative via `pg`), 6/6 tests PASS.
Evidence: `qa-final/crud5-*.png`, `qa-final/latency-products.json`.

### Products
| Operation | Result | Proof |
|---|---|---|
| Create product | PASS | row in `Product`, price 50, `isVisible=true` |
| Edit Arabic name | PASS | `nameAr` updated in DB |
| Edit English name | N/A | Schema is Arabic-only — no `nameEn` column (asserted via `information_schema`) |
| Edit description | PASS | `descAr` updated in DB |
| Change price | PASS | variant price 50→99 in DB |
| Add variant | PASS | 1→2 prices `[99,120]` in DB |
| Delete variant | PASS | 2→1 price in DB |
| Upload product image | PASS | `ProductImage` row + primary + Cloudinary URL HEAD 200 |
| Delete product image | PASS | DB row gone + Cloudinary asset destroyed |
| Hide product | PASS | `isVisible=false` + removed from already-open public page (no reload) |
| Show product | PASS | `isVisible=true` in DB |
| Delete product | PASS | row gone from DB |

### Categories
| Operation | Result | Proof |
|---|---|---|
| Create category | PASS | row + `sortOrder=9999` |
| Edit name + description | PASS | `nameAr`/`noteAr` updated in DB |
| Change order (move up) | PASS | `sortOrder` decreased |
| Hide / show | PASS | `isVisible` toggled in DB |
| Assign / remove image | PASS | `imageUrl` set + HEAD 200, then cleared |
| Delete category | PASS | row gone from DB (safe — empty test category) |

### Settings
| Operation | Result | Proof |
|---|---|---|
| Edit tagline | PASS | `RestaurantSettings.taglineAr` updated |
| Public reflects change | PASS | `/ar` HTML contained the test value (no manual reload) |
| Restore original | PASS | DB value back to original after test |

### Branches
| Operation | Result | Proof |
|---|---|---|
| Shared-menu model | PASS | No `branch` FK on any menu table → single shared menu |
| Real branch data untouched | PASS | Real branch IDs identical before/after |
| Test branch create/edit/delete | PASS | ZZ-prefixed branch CRUD verified, then removed |

### Image management
| Operation | Result | Proof |
|---|---|---|
| Product image lifecycle | PASS | covered in Products above |
| Category image lifecycle | PASS | covered in Categories above |
| Media library listing + usage links | PASS | `/admin/images` shows assets, "متصل", product usage links, PDF-derived items |
| Logo upload/replace | NOT EXECUTED (by design) | Real branding asset preserved; same server-action path as product/category uploads. Not exercised to avoid disturbing the live logo. |

### Authentication & permissions
| Operation | Result | Proof |
|---|---|---|
| Protected route redirect | PASS | `/admin/products` without session → `/admin/login` |
| Login / logout | PASS | session created/removed, URL transitions |
| Session persistence | PASS | survives reload |
| OWNER-only deletion | PASS | EDITOR sees zero `حذف` buttons; product still in DB |
| Server Action auth | PASS | `deleteProduct` requires `requireAdmin(["OWNER"])`; enforced in `04-security` suite |

**Latency (PRODUCTS, ms):** create 4355 · edit 6335 · imageUpload 5622 · delete 9583 · hideToPublic 26855 (full tail incl. public tab load + LiveSync reflection; the LiveSync reflection itself is ~383 ms — see `ls-3`).

---

## 2. Product Image Mapping Report (confidence)
Full detail: `pdf-images/IMAGE_MAPPING_REPORT.md`, `pdf-images/mapping.json`.
- **14 HIGH-confidence product assignments** (applied) — exact products named/price-badged on the PDF itself.
- **1 HIGH-confidence category assignment** (applied) — المندي.
- **1 MEDIUM held for review (NOT published)** — وجبة دجاج مندي (crop-19): food type matches but not the exact SKU.
- **LOW**: none assigned.
- No existing valid image was overwritten (all 14 products had no prior image; guard `productHasRealImage` enforced).

| Category | Product (nameAr) | PDF asset | Confidence |
|---|---|---|---|
| الصواني | صينية مشاوي / الحبايب / العيلة / الصحاب / الملوك / الوحوش / الحرب العالمية / العمدة (8) | `pdf-tray-*` | HIGH |
| الأطباق الشعبية | مخاصي / بطاطس باللحم / البصلية باللحم الضاني / ورق عنب بالكوارع / بامية باللحمة / عكاوي (6) | `pdf-*` | HIGH |
| المندي (category) | — | `pdf-mandi` | HIGH |

---

## 3. Images extracted from the PDF
- 50500.pdf = 2-page spread (992×708pt). Page 1 = all food imagery; page 2 = text (drinks/desserts) + logo + QR.
- Embedded JPEGs carved: **22** (Adobe CMYK; 4 were SMask masks, 2 empty plates → **16 real food photographs**).
- CMYK JPEGs decode incorrectly via libjpeg/sharp, so images were obtained by **MuPDF page render @300 DPI** (correct color) + connected-component region detection → **20 crops** (16 food + 4 text banners).
- **15 crops used** (14 product + 1 category); 1 held (MEDIUM); 4 text banners discarded.

## 4. Approved product image assignments: **14** (all HIGH).
## 5. Category image assignments: **1** (المندي, HIGH).
## 6. Products intentionally left without images: **137** (no honest PDF match — drinks, coffee, desserts, soups, salads, mandi plates, etc.).

## 7. Cloudinary upload + cleanup verification
- 15 PDF-derived assets uploaded to existing folders with stable public IDs: `naqer-menu/products/pdf-*` (14) and `naqer-menu/categories/pdf-mandi` (1). All stored URLs verified **HTTP 200** (`scripts/tmp-verify-urls.mjs`).
- Used the existing server-side Cloudinary config; no secrets exposed to the browser; no duplicate uploads (idempotent guard by publicId).
- Test-run uploads (product/category images created by `05` suite) were deleted through the app, which destroys the Cloudinary asset — **0 stray non-`pdf-` image references remain** (`scripts/tmp-integrity.mjs`).
- One orphan from an earlier failed apply attempt was destroyed. The PDF-derived images assigned to real products were **never** deleted during cleanup.

## 8. Database integrity — before vs after (identical)
| Metric | Before | After |
|---|---|---|
| Products | 151 | 151 |
| Categories | 18 | 18 |
| Variants | 167 | 167 |
| Product images | 14 | 14 |
| Categories with image | 1 | 1 |
| Branches | 2 | 2 |
| ZZ test residue (P/C/B) | 0/0/0 | 0/0/0 |
Original products, prices, descriptions and categories preserved. No reset, no destructive migration.

## 9. Screenshots (in `qa-final/`)
- Public: `public-ar-desktop.png`, `public-ar-mobile.png`, `public-en-desktop.png`, `public-en-mobile.png`, `public-ar-fullpage.png`.
- CRUD: `crud5-products.png`, `crud5-categories.png`, `crud5-settings.png`, `crud5-branches.png`, `crud5-media-library.png`, `crud5-auth-editor-nodel.png`.
- Responsive: `resp-{360x800,390x844,430x932,768x1024,1024x768,1366x768,1920x1080}-{public-ar,admin,login}.png`.
- Security: `sec-01-admin-redirect-login.png`, `sec-02-login-invalid.png`, `sec-03-no-secret-in-html.png`.

## 10. Typecheck / build
- `npm run typecheck` (tsc --noEmit): **PASS** (no errors).
- `npm run build` (next build): **PASS** — all routes compiled, 9 static pages generated.

## Playwright suites
- `05-crud-acceptance`: **6/6 PASS**.
- `03-responsive`: **PASS** (7 breakpoints + print).
- `04-security`: **4/4 PASS** (route guard, rate-limit, content-version no-secret, HTML no-secret).
- `01-live-sync`: 5/6 in the batch run; `ls-3` (price live-sync) FLAKED under back-to-back suite load, then **PASSED in isolation (2.0m, reflection 383 ms)**. Not a regression — no app/LiveSync code changed.

---

## 11. Remaining issues & blockers
1. **No English product-name field** — schema is Arabic-only by design; EN menu uses localized labels. "Edit English name" is therefore N/A, not a defect.
2. **Logo upload/replace not exercised** — deliberately skipped to protect the live branding asset; mechanism is identical to the verified product/category upload path.
3. **`ls-3` LiveSync flake under heavy parallel load** — passes in isolation; recommend spaced/serial runs for that suite.
4. **1 MEDIUM image held (وجبة دجاج مندي)** — awaiting review before assignment.
5. **Session rows accumulate** (~65) from repeated logins — harmless (expire); no cleanup required by spec.
6. **PDF-derived images are temporary** — schema has no `isTemporary` flag; identified by stable `pdf-` public-ID prefix so they can be replaced later (documented here + in `IMAGE_MAPPING_REPORT.md`).

## 12. Products still needing dedicated restaurant photography
**137 of 151 products** currently have no image. Full grouped list: `pdf-images/PRODUCTS_NEEDING_PHOTOS.md`.
Coverage by category (with_image / total): الصواني 8/8 · الأطباق الشعبية 6/12 · المندي 0/8 · المشويات 0/12 · الوجبات 0/5 · المأكولات البدوية 0/7 · الشرقي 0/12 · المقبلات 0/10 · الشوربة 0/5 · القهوة 0/12 · المشروبات الساخنة 0/11 · العصائر 0/10 · الكوكتيلات 0/14 · المثلجات 0/11 · الميلك شيك والسموزي 0/5 · الحلويات 0/7 · سوفت درينكز 0/2.
Additionally, the **14 PDF-derived product images + 1 category image are temporary placeholders** and should be replaced with dedicated photography when available.

---

**Status: PARTS A–F complete. No production deployment performed. Stopping here pending approval.**
