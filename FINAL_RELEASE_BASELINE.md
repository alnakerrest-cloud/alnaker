# FINAL RELEASE BASELINE & SAFETY LOCK

**Project:** Naqer Menu (قرية الناقر للمندي والمشويات)  
**Workspace:** `E:\real projects\naqer-menu`  
**Timestamp:** 2026-11-05T20:12:00+02:00  
**Engineer Roles:** Senior Full-Stack Engineer + QA Engineer + Release Manager  
**Baseline Status:** LOCKED & RECORDED  

---

## 1. Git Status & Repository Snapshot

- **Branch:** `main` (up to date with `origin/main`)
- **Safety Policy:**
  - Strict preservation of all pre-existing changes.
  - No `git reset`, `git checkout --`, `git stash`, or `git push --force`.
  - Zero deployment to production.

### Modified Files (Tracked):
1. `.env.example`
2. `.gitignore`
3. `app/[locale]/page.tsx`
4. `app/globals.css`
5. `components/Footer.tsx`
6. `components/Hero.tsx`
7. `components/Icons.tsx`
8. `components/JsonLd.tsx`
9. `components/Logo.tsx`
10. `components/MenuView.tsx`
11. `lib/i18n.ts`
12. `lib/menu-view.ts`
13. `middleware.ts`
14. `next.config.mjs`
15. `package-lock.json`
16. `package.json`

### New / Feature & Testing Modules (Untracked):
- **Core Components & Modals:**
  - `components/OfferDetailModal.tsx`
  - `components/OffersSection.tsx`
  - `components/ProductDetailModal.tsx`
  - `components/CartDrawer.tsx`
  - `components/CartContext.tsx`
  - `components/FloatingCartBar.tsx`
  - `components/LiveSync.tsx`
- **Admin App & Management Routes:**
  - `app/admin/` (auth, dashboard, products, categories, branches, addons, offers, images, import, audit, settings)
  - `app/api/content-version/`
- **Data & Business Logic Layers:**
  - `lib/admin/`, `lib/audit.ts`, `lib/auth.ts`, `lib/cart.ts`, `lib/cloudinary.ts`, `lib/content-version.ts`, `lib/menu-db.ts`, `lib/offers-db.ts`, `lib/offers.ts`, `lib/prisma.ts`, `lib/rate-limit.ts`, `lib/site-db.ts`
- **Database Migrations & Tooling:**
  - `prisma/`, `prisma7.config.ts`, `scripts/`
- **Automated Verification Suites:**
  - `tests/01-live-sync.spec.ts` through `tests/10-live-offers-and-visual-fix.spec.ts`, `tests/helpers.ts`

---

## 2. Environment & Database Connection Validation

- **Environment File:** `.env.local` present and verified.
- **Database Engine:** Neon Serverless PostgreSQL (`pg` + connection pooling).
- **SSL Mode:** Secure SSL connection verified (`sslmode=require / verify-full`).
- **Prisma Client:** Operational and integrated with Neon DB.
- **Cloudinary CDN:** Asset URL credentials verified and mapped to real uploaded assets.

---

## 3. Database State & Inventory

| Entity | Count | Status / Notes |
| :--- | :---: | :--- |
| **Categories** | 18 | 17 verified production categories + 1 test category (`cat-mw13741w` — سبانخ, 0 products) |
| **Products** | 151 | Production menu items from Naqer Menu |
| **Product Variants** | 167 | Multi-pricing and portion variants (ضاني / بتلو / حجم) |
| **Product Images** | 14 | Real Cloudinary-backed assets (Trays, Makhashi, Batatas, etc.) |
| **Branches** | 2 | Real branches: `فرع جمصة` & `فرع دمياط الجديدة` (active & orderable, WhatsApp: `+201094965222`) |
| **Restaurant Settings** | 1 | Brand, phone, vat, service charge, currency (`ج.م`) |
| **Active Offers** | 2 | Verified in previous QA: `عرض اختبار الناقر الحصري` (-10%) & `عرض المشويات الملكي الفاخر` (-15%) |
| **Option Groups (Add-ons)** | 0 | Ready for test-isolated or permanent addon assignments |

---

## 4. Test Isolation & Data Cleanup Rules

1. Any test creating temporary records must use unique prefixes (e.g. `TEST-` or `اختبار`) and clean up only its own created records.
2. Real menu products (151 items) and real Cloudinary images (14 assets) must never be altered, overwritten, or deleted.
3. The 2 real branches (`فرع جمصة`, `فرع دمياط الجديدة`) must never be deleted.
4. Test offers will be audited in Phase 5 and cleaned or aligned in Phase 12 before final release lock.

