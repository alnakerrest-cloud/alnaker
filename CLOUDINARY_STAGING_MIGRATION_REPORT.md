# Naqer Menu — Phase 1: Cloudinary Migration to Staging Report

**Date:** 2026-11-24  
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Target Environment:** Isolated Merged Staging (`naqer_merged_staging` on Neon cluster `ep-aged-feather-bej8rk3r`)  
**Cloudinary Destination Account:** `tifawhcs`  
**Execution Status:** **COMPLETE & VERIFIED (PASS)**  

---

## 1. Executive Summary

Phase 1 of the Naqer Menu cutover gate closure focused exclusively on eliminating external asset dependencies on the retired legacy Cloudinary account (`damc35hfo`), repairing the single broken product image asset (`pdf-waraq-enab.jpg`), and safely updating the staging database (`naqer_merged_staging`).

All 14 verified product image assets have been successfully migrated to the client Cloudinary account `tifawhcs` under `naqer-menu/products/`. Every uploaded asset was verified with direct HTTP GET requests (HTTP 200, valid `image/jpeg`, exact dimensions matching source files). The staging database was updated inside a single atomic transaction affecting exactly 14 rows, leaving **0** references to `damc35hfo` in `ProductImage` records. Furthermore, full visible headed browser verification (Playwright) was conducted across mobile, tablet, and desktop viewports in both Arabic (RTL) and English (LTR), confirming complete rendering without distortion or broken images.

---

## 2. Strict Safety Compliance Verification

Throughout Phase 1, strict safety constraints were rigorously observed:

| Safety Gate / Constraint | Status | Evidence / Verification |
| :--- | :---: | :--- |
| **Source Production Database (`ep-soft-dawn-bdu5de43`)** | **UNTOUCHED** | 0 connection attempts, 0 writes, 0 schema changes. |
| **Client Baseline Database (`neondb`)** | **UNTOUCHED** | Hardened regex and URL parsing guards prevented any access to `/neondb`. |
| **Merged Staging Database (`naqer_merged_staging`)** | **CONTROLLED WRITE** | Strictly authorized: exactly 14 `ProductImage.url` rows updated within `BEGIN ... COMMIT`. |
| **Vercel Settings, Env Vars & Deployments** | **UNTOUCHED** | No CLI or API calls made to Vercel; DNS and environment variables remained unchanged. |
| **Legacy Cloudinary Account (`damc35hfo`)** | **UNTOUCHED** | Read-only audit; 0 delete requests issued to legacy account. |
| **Staging Offer (`cmwty41en000907imtbye8z34`)** | **PRESERVED** | Preserved without modification (deferred to separate cleanup phase). |
| **AuditLog & Session Synchronization** | **DEFERRED** | 0 inserts or deletions performed against audit logs. |
| **Credentials & PII Protection** | **COMPLIANT** | Zero tokens, passwords, hashes, or connection strings printed to logs or reports. |

---

## 3. Cloudinary Migration Inventory (14/14 Assets)

All 14 product images were uploaded to client Cloudinary account `tifawhcs` under the `naqer-menu/products/` folder and verified against original local assets.

| # | Product Name | Product ID | Old URL Account | New Public ID (`tifawhcs`) | Dimensions | File Size | HTTP Status | Content-Type |
| :-: | :--- | :--- | :-: | :--- | :-: | :-: | :-: | :-: |
| 1 | **البصلية باللحم الضاني** | `86e5f810-3af5-4744-8d9d-c0758c638893` | `damc35hfo` | `naqer-menu/products/pdf-basila` | 382 × 232 | 22,840 B | **200 OK** | `image/jpeg` |
| 2 | **بامية باللحمة** | `f8e7993b-dcc9-4679-9cdc-17380097b0dd` | `damc35hfo` | `naqer-menu/products/pdf-bamia-lahm` | 381 × 241 | 23,325 B | **200 OK** | `image/jpeg` |
| 3 | **بطاطس باللحم** | `6a58694d-4b4f-434e-b6f0-823a721097b9` | `damc35hfo` | `naqer-menu/products/pdf-batatas-lahm` | 383 × 261 | 25,522 B | **200 OK** | `image/jpeg` |
| 4 | **صينية الحبايب** | `99b88b58-a108-4820-b004-2e31a4f4e03d` | `damc35hfo` | `naqer-menu/products/pdf-tray-alhobaib` | 559 × 544 | 112,394 B | **200 OK** | `image/jpeg` |
| 5 | **صينية الحرب العالمية** | `9eca542a-156c-4211-a971-a34ce69335ae` | `damc35hfo` | `naqer-menu/products/pdf-tray-alharb` | 565 × 561 | 127,836 B | **200 OK** | `image/jpeg` |
| 6 | **صينية الصحاب** | `c14570a8-5fb2-4b70-8e4c-e9e4d36c89a0` | `damc35hfo` | `naqer-menu/products/pdf-tray-alsahab` | 576 × 544 | 123,228 B | **200 OK** | `image/jpeg` |
| 7 | **صينية العمدة** | `db1d25c3-c497-4386-94b2-06c4126ecf5f` | `damc35hfo` | `naqer-menu/products/pdf-tray-alomda` | 619 × 561 | 120,799 B | **200 OK** | `image/jpeg` |
| 8 | **صينية العيلة** | `70e810f5-41d5-464e-83b3-f34e76523f81` | `damc35hfo` | `naqer-menu/products/pdf-tray-alaila` | 565 × 544 | 121,782 B | **200 OK** | `image/jpeg` |
| 9 | **صينية الملوك** | `5580e943-c91a-41b4-9a62-b8591af1fc3e` | `damc35hfo` | `naqer-menu/products/pdf-tray-almolok` | 566 × 544 | 118,920 B | **200 OK** | `image/jpeg` |
| 10 | **صينية الوحوش** | `0a67d363-e9fa-4854-981b-89d3b214260f` | `damc35hfo` | `naqer-menu/products/pdf-tray-alwohoush` | 557 × 544 | 117,015 B | **200 OK** | `image/jpeg` |
| 11 | **صينية مشاوي** | `8cd30623-2fcf-4ef5-bc59-fff32b7315e0` | `damc35hfo` | `naqer-menu/products/pdf-tray-mashawi` | 550 × 544 | 122,959 B | **200 OK** | `image/jpeg` |
| 12 | **عكاوي** | `fa678752-63b1-4922-b9eb-cb40ec42940d` | `damc35hfo` | `naqer-menu/products/pdf-akawi` | 378 × 255 | 24,097 B | **200 OK** | `image/jpeg` |
| 13 | **مخاصي** | `30d72b30-3bdf-4b01-b086-5007f31c56a4` | `damc35hfo` | `naqer-menu/products/pdf-makhashi` | 383 × 255 | 23,218 B | **200 OK** | `image/jpeg` |
| 14 | **ورق عنب بالكوارع** *(Restored 404)* | `e5259930-d19c-4418-b106-2c2d137414f3` | `damc35hfo` (404) | `naqer-menu/products/pdf-waraq-enab` | 375 × 261 | 30,246 B | **200 OK** | `image/jpeg` |

---

## 4. Remediation & Restoration of Broken Asset (`pdf-waraq-enab.jpg`)

- **Prior Defect:** Product `ورق عنب بالكوارع` (`e5259930-d19c-4418-b106-2c2d137414f3`) pointed to `https://res.cloudinary.com/damc35hfo/image/upload/v1793815476/naqer-menu/products/pdf-waraq-enab.jpg`, which returned **HTTP 404 Not Found** on legacy Cloudinary.
- **Root Cause Analysis:** The asset was deleted or never finalized on the legacy Cloudinary account during the initial extraction.
- **Remediation Action:** The exact original photography asset was recovered from `pdf-images/upload/pdf-waraq-enab.jpg` (30,246 bytes, SHA256: `7248e3ca2a51b72489c3dd26a311f09f679cd98ecfe807fb570cb10618d25c81`).
- **Restored Asset:** Uploaded to `naqer-menu/products/pdf-waraq-enab` under `tifawhcs`.
- **Destination URL:** `https://res.cloudinary.com/tifawhcs/image/upload/v1795533461/naqer-menu/products/pdf-waraq-enab.jpg`.
- **Verification:** Direct HTTP GET returned **HTTP 200**, `Content-Type: image/jpeg`, 375x261 px. Next.js image proxy endpoint returned **HTTP 200**, and headed browser rendered the image with `naturalWidth: 287px` on grid and `naturalWidth: 328px` inside the product details modal.

---

## 5. Staging Database Integrity & State Verification

The update was executed inside PostgreSQL transaction `BEGIN ... COMMIT` targeting `naqer_merged_staging`:

```sql
BEGIN;
-- Exactly 14 UPDATE statements executed for ProductImage rows
COMMIT;
```

### Staging Database Post-Update Audit:
- **Total `ProductImage` records in staging:** 151
- **Remaining `damc35hfo` product image records:** **0** (Down from 14)
- **Total `tifawhcs` product image records:** **40** (26 pre-existing + 14 migrated)
- **Local relative image records (`/images/products/...`):** **111**
- **Orphaned `ProductImage` records:** **0**
- **Unrelated records modified:** **0**

---

## 6. Visible Headed Browser QA Verification (Playwright)

A live, headed Playwright browser verification suite (`scratch/verify_migrated_images_browser.mjs`) was executed against the Next.js staging server (`http://127.0.0.1:3009`) connected directly to `naqer_merged_staging`.

### Test Matrix & Results:
- **Viewports Tested:**
  - Desktop: 1280 × 800
  - Tablet: 768 × 1024
  - Mobile: 390 × 844
- **Locales Tested:**
  - Arabic (`/ar`, RTL layout)
  - English (`/en`, LTR layout)
- **DOM Rendering Check (All 14 Products):**
  - All 14 migrated product images were detected in the live DOM.
  - Every image element satisfied `complete === true` and `naturalWidth > 0`.
  - Every image source pointed to `tifawhcs` via the Next.js image optimizer; zero references to `damc35hfo`.
  - Image aspect ratios and visual quality were verified with zero clipping or distortion.
- **Modal Interaction Checks:**
  - `ورق عنب بالكوارع` (restored 404 asset): Modal opened cleanly, rendering image at `naturalWidth: 328px`, `naturalHeight: 228px`, `complete: true`.
  - `صينية الحبايب`: Modal opened cleanly, rendering image at `naturalWidth: 489px`, `naturalHeight: 475px`, `complete: true`.
- **Network & Console Error Check:**
  - 0 network errors (4xx / 5xx) on product images.
  - Zero console errors related to product images.
  - *(Note: The only 404 observed was for the known staging test offer image `offers/noo7nrpz5vz9mtwrbfi3.jpg`, which was preserved as required by safety rules).*

### Visual Evidence Screenshots Captured:
All high-resolution visual evidence screenshots have been captured and preserved:
1. [migrated-trays-desktop-ar.png](file:///e:/real%20projects/naqer-menu/artifacts/final-naqer-qa/screenshots/migrated-trays-desktop-ar.png) — Trays section in Arabic Desktop
2. [migrated-tajines-desktop-ar.png](file:///e:/real%20projects/naqer-menu/artifacts/final-naqer-qa/screenshots/migrated-tajines-desktop-ar.png) — Homestyle & Tajines section in Arabic Desktop
3. [migrated-waraq-enab-modal-ar.png](file:///e:/real%20projects/naqer-menu/artifacts/final-naqer-qa/screenshots/migrated-waraq-enab-modal-ar.png) — Product Details Modal for restored `ورق عنب بالكوارع`
4. [migrated-tray-modal-ar.png](file:///e:/real%20projects/naqer-menu/artifacts/final-naqer-qa/screenshots/migrated-tray-modal-ar.png) — Product Details Modal for `صينية الحبايب`
5. [migrated-trays-desktop-en.png](file:///e:/real%20projects/naqer-menu/artifacts/final-naqer-qa/screenshots/migrated-trays-desktop-en.png) — Trays section in English Desktop (LTR)
6. [migrated-trays-tablet-ar.png](file:///e:/real%20projects/naqer-menu/artifacts/final-naqer-qa/screenshots/migrated-trays-tablet-ar.png) — Tablet responsive layout in Arabic (768×1024)
7. [migrated-trays-mobile-ar.png](file:///e:/real%20projects/naqer-menu/artifacts/final-naqer-qa/screenshots/migrated-trays-mobile-ar.png) — Mobile responsive layout in Arabic (390×844)

---

## 7. Deliverables Generated

1. **Manifest File:** [cloudinary_staging_migration_manifest.json](file:///e:/real%20projects/naqer-menu/cloudinary_staging_migration_manifest.json) — Complete machine-readable record of all 14 migrated images with IDs, dimensions, hashes, and URLs.
2. **Browser Verification Results:** [browser_image_verification_results.json](file:///e:/real%20projects/naqer-menu/scratch/browser_image_verification_results.json) — Full DOM inspection data, console logs, and modal check results.
3. **Audit Report:** [CLOUDINARY_STAGING_MIGRATION_REPORT.md](file:///e:/real%20projects/naqer-menu/CLOUDINARY_STAGING_MIGRATION_REPORT.md) — This document.

---

## 8. Conclusion & Gate Readiness

Phase 1 is **100% COMPLETE**. The legacy Cloudinary account `damc35hfo` has been completely eliminated from the product catalog in staging, the broken `pdf-waraq-enab.jpg` asset is fully restored, and end-to-end visual rendering is confirmed across all devices and languages.

Production database `ep-soft-dawn-bdu5de43` and client baseline `neondb` remain strictly untouched. The system is ready for the user to review these deliverables before deciding on subsequent phases (such as test offer cleanup or final cutover).
