# NAQER MENU — RELEASE CHANGELOG

**Release Version:** 1.0.0 Release Candidate  
**Target Branch:** `main`  
**Release Date:** November 15, 2026  
**Status:** 🟢 **VERIFIED PRODUCTION RELEASE CANDIDATE**  

---

## 1. SUMMARY OF RELEASE HIGHLIGHTS

This release establishes final production readiness for **Naqer Menu**, delivering a polished, high-performance digital menu for restaurant patrons and a completely modernized, mobile-first management dashboard for restaurant administrators.

```
┌─────────────────────────────────────────────────────────────┐
│                    NAQER MENU v1.0.0-RC                     │
├──────────────────────────────┬──────────────────────────────┤
│       PUBLIC WEBSITE         │       ADMIN DASHBOARD        │
│ • Bilingual AR/EN Navigation │ • Responsive Table Cards     │
│ • 0px Overflow (320-1440px)  │ • Sticky Filter Bar & Chips  │
│ • WhatsApp Direct Ordering   │ • Mobile Filter Sheet Drawer │
│ • Tabletop QR Landing Page   │ • RBAC Role-Based Access     │
│ • Real Photography (0 broken)│ • Session Invalidation Flow  │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 2. DETAILED CHANGES BY SUBSYSTEM

### A. Admin Dashboard Table Modernization
- **Global Responsive Cards:** Replaced legacy horizontal-scrolling table views on mobile viewports (< 768px) with structured, high-readability vertical cards (`.admin-mobile-cards`).
  - Desktop viewports (≥ 768px) retain the classic dense data grid.
  - Implemented across all 8 administrative tabular routes:
    - `app/admin/(shell)/products/page.tsx`: Thumbnail, category chip, price, status badge, action bar.
    - `app/admin/(shell)/categories/page.tsx`: Display rank, Arabic/English names, item counts, edit buttons.
    - `app/admin/(shell)/branches/page.tsx`: Branch address, active toggle, phone number, edit link.
    - `app/admin/(shell)/addons/page.tsx`: Addon title, differential price, product linkages.
    - `app/admin/(shell)/offers/page.tsx`: Offer banner, discount type, validity range, active status.
    - `app/admin/(shell)/audit/page.tsx`: Action badge, actor email, formatted date/time, change metadata.
    - `app/admin/(shell)/images/page.tsx`: Responsive image gallery grid with copy/delete actions.
    - `app/admin/(shell)/import/page.tsx` & `import-review.tsx`: CSV column mapping and staging review.
- **Styling Architecture:** Added 570+ lines of robust, tokenized CSS in `app/admin/admin.css` providing smooth transitions, touch-friendly tap targets (minimum 44x44px), and zero horizontal layout shift.

### B. Admin Search & Filters UX Modernization
- **Reusable `AdminFilterBar` (`app/admin/(shell)/admin-filter-bar.tsx`):**
  - Instant text search input with native clear button (`✕`) and enter-key submission.
  - Quick status chips for one-touch filtering (e.g., `ظاهر فقط`, `نشط فقط`).
  - Slide-out mobile filter drawer (sheet) allowing multi-attribute filtering (Category, Branch, Status).
  - Dynamic filter counter badge indicating the number of active filters.
  - Quick Reset Chip (`✕ مسح الكل`) restoring default views with a single tap.
  - Clean empty state illustration when search queries return 0 records.

### C. Public Website Responsive Design & UX
- **Zero Horizontal Overflow:** Enforced strict boundaries and flexible wrapping across all viewports (`320px`, `360px`, `375px`, `390px`, `430px`, `768px`, `1024px`, `1440px`) on both Arabic (`/ar`) and English (`/en`) routes.
- **Hero & Category Navigation:** Optimized horizontal rail indicators, sticky bottom floating cart bar, and checkout action pills.
- **Product Customization Modal:** Accessible modal dialog with item options, size toggles, and addon selectors.
- **Interactive WhatsApp Order Flow:** Verified itemized WhatsApp order link generation with branch details and pricing breakdown.
- **Tabletop QR Landing:** Clean, high-contrast QR display on `/ar/qr` and `/en/qr`.

### D. Stabilization & Hydration Fixes
- **Client Hydration Warning Elimination:** Added `suppressHydrationWarning` on `<input type="search">` in `components/MenuView.tsx` and `app/admin/(shell)/admin-filter-bar.tsx`, eliminating synthetic browser autofill mismatches (e.g. `caret-color: transparent`).
- **Pruning Dead Test Routes:** Safely removed obsolete empty directories (`app/api/retrycheck`, `app/api/s8check`, `app/api/s9check`).

### E. Security, Session & RBAC Polish
- **Strict Role-Based Access Control:**
  - `OWNER` retains unrestricted access, account security controls, and password change authorization.
  - `EDITOR` allowed daily operational catalog access but restricted from modifying restaurant settings or changing owner credentials (`عرض فقط: تعديل إعدادات المطعم متاح للمالك فقط`).
- **Session Versioning (`sessionVersion`):**
  - Voluntary or forced password updates increment user session version, automatically terminating older active sessions.
- **Atomic Compare-And-Swap (CAS):**
  - Verified race-free credential claims under high concurrent load.
- **Cloudinary Media Whitelist:**
  - Strict server-side verification: bitmap images only (`jpg`, `png`, `webp`, `gif`, `avif`); `.svg` and executable formats rejected; 5MB payload limit.

---

## 3. FILE ARTIFACTS & CODE CHANGES

| File Path | Nature of Change | Description |
| :--- | :---: | :--- |
| `app/admin/(shell)/admin-filter-bar.tsx` | **Created** | Modern reusable search bar, quick chips, and mobile filter drawer. |
| `app/admin/admin.css` | **Updated** | Added mobile card styling, filter bar layout, drawer animations, badges. |
| `app/admin/(shell)/products/page.tsx` | **Updated** | Dual-mode desktop table / mobile cards with modern filter bar. |
| `app/admin/(shell)/categories/page.tsx` | **Updated** | Dual-mode desktop table / mobile cards with modern filter bar. |
| `app/admin/(shell)/branches/page.tsx` | **Updated** | Dual-mode desktop table / mobile cards with modern filter bar. |
| `app/admin/(shell)/addons/page.tsx` | **Updated** | Dual-mode desktop table / mobile cards with modern filter bar. |
| `app/admin/(shell)/offers/page.tsx` | **Updated** | Dual-mode desktop table / mobile cards with modern filter bar. |
| `app/admin/(shell)/audit/page.tsx` | **Updated** | Dual-mode desktop table / mobile cards with modern filter bar. |
| `app/admin/(shell)/import/page.tsx` | **Updated** | Responsive layout styling for CSV data import. |
| `app/admin/(shell)/import/import-review.tsx` | **Updated** | Mobile record card layout for staging review of imported catalog items. |
| `app/admin/(shell)/dashboard/page.tsx` | **Updated** | Responsive card metrics and quick link actions. |
| `components/MenuView.tsx` | **Updated** | Added `suppressHydrationWarning` on public search input. |
| `.gitignore` | **Updated** | Added ignore rules for temporary test scratch and evidence directories. |

---

## 4. VERIFICATION EVIDENCE SUMMARY

- **Type Safety:** `npx tsc --noEmit` — 0 errors.
- **Production Build:** `npm run build` — 27 routes compiled cleanly.
- **Automated Tests:**
  - Master QA Suite: 96/96 viewports PASS (0px overflow).
  - Playwright E2E: 12/12 PASS.
  - Activation Concurrency: 100% PASS.
  - Password Rotation Flow: 10/10 PASS.
- **Evidence Screenshots:** 30 high-resolution screenshots saved in `release-evidence/` and archived in `<appDataDir>\brain\<conversation-id>\master-qa-evidence\`.
