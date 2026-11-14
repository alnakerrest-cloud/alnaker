# KNOWN LIMITATIONS & OPERATIONAL CONSTRAINTS

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-14  
**Project:** Naqer Menu  
**Repository:** `E:\real projects\naqer-menu`  

---

## 1. Cloudinary Staging Isolation Guardrail
- **Constraint:** By architectural design, automated tests and scripts in staging fail-closed (`STAGING_CLOUDINARY_ENABLED=0`) when executed without separate, dedicated staging Cloudinary credentials.
- **Impact:** Direct image upload/deletion tests (`tests/06-image-lifecycle.spec.ts` and `ls-4`) skip safely. This prevents automated test suites from issuing destructive `destroyImage()` calls against the client's live production image repository (`naqer-menu/products`).

---

## 2. Headless Browser LiveSync Window Focus Mechanics
- **Constraint:** In headless Chromium environments without a physical OS window manager, switching between tabs using `page.bringToFront()` does not automatically synthesize an OS window focus event or transition `document.visibilityState`.
- **Operational Reality:** On real customer devices (smartphones, tablets, desktop browsers), switching tabs naturally triggers standard browser `visibilitychange` and `focus` events, activating LiveSync deferred refreshes immediately.

---

## 3. Bilingual Data Architecture & Language Fallback
- **Constraint:** The PostgreSQL schema is designed Arabic-first (`nameAr`, `descAr`, `labelAr`). English translations are matched dynamically at runtime from `data/menu.ts` using stable slugs and category mappings.
- **Behavior:** If a new product is added via the Admin Dashboard with an Arabic name not present in `data/menu.ts`, the English menu displays the Arabic name cleanly rather than omitting the dish or failing to render.

---

## 4. Product Availability & Sold-Out Handling
- **Constraint:** Dishes marked `isAvailable: false` in the database are filtered out of public queries (`where: { isVisible: true, isAvailable: true }`).
- **Behavior:** Rather than showing a disabled or "Sold Out" badge, unavailable products are temporarily hidden from the customer view until re-enabled by restaurant staff.

---

## 5. Dependency Advisory (Resolved)
- **Status:** **FULLY RESOLVED**.
- **Details:** The previous `zod <4.6.6` advisory (`GHSA-mrhx-c7xc-m3w5`) has been eliminated by upgrading to `zod@4.6.7` using the official `zod/v3` compatibility shim. `npm audit --json` now reports 0 vulnerabilities.
