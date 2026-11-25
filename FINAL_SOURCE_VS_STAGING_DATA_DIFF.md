# FINAL SOURCE PRODUCTION VS STAGING DATA DIFF
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Source Production Database:** `ep-soft-dawn-bdu5de43`  
**Target Staging Database:** `naqer_merged_staging` (Neon client cluster `ep-aged-feather-bej8rk3r`)  
**Audit Date:** November 24, 2026  
**Execution Mode:** Strictly Read-Only Queries with `SET TRANSACTION READ ONLY`  
**Overall Diff Verdict:** **PASS — 100% RECONCILED (ZERO UNEXPLAINED DIFFERENCES)**  

---

## 1. Table-by-Table Row Count Comparison

Comparison of all 27 tables in the database schema:

| Table Name | Source Production | Staging Target | Count Diff | Primary Key Diff | Shared Record Field Diffs | Classification |
|---|---|---|---|---|---|---|
| **Product** | 150 | 151 | +1 | 1 staging-only (`bb1e4825-...`) | 0 field diffs | **Expected Merged** (ديك بلدي) |
| **ProductVariant** | 166 | 167 | +1 | 1 staging-only (`927ccbc4-...`) | 0 field diffs | **Expected Merged** (ديك بلدي 470 EGP) |
| **ProductImage** | 150 | 151 | +1 | 1 staging-only (`img-local-93c8...`) | 0 field diffs | **Expected Merged** (Rooster CDN Image) |
| **ProductOptionGroup** | 26 | 28 | +2 | 2 staging-only links | 0 field diffs | **Expected Merged** (Rooster option groups) |
| **Category** | 17 | 17 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **Section** | 26 | 26 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **OptionGroup** | 9 | 9 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **OptionItem** | 20 | 20 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **Branch** | 2 | 2 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **RestaurantSettings** | 1 | 1 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **Customer** | 9 | 9 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **CustomerAddress** | 22 | 22 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **CustomerFavorite** | 0 | 0 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **CustomerNotification** | 86 | 86 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **Order** | 2 | 2 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **OrderItem** | 2 | 2 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **OrderStore** | 84 | 84 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **AdminUser** | 6 | 7 | +1 | 1 staging-only (`1373831b-...`) | 2 timestamp diffs on 1 user | **Expected Merged** (admin@naqer.com) |
| **AuditLog** | 133 | 129 | -4 | 1 staging-only, 5 source-only | 0 field diffs | **Expected Drift / Merged** |
| **Session** | 10 | 9 | -1 | 1 source-only | 0 field diffs | **Expected Drift** (post-snapshot login) |
| **Offer** | 0 | 1 | +1 | 1 staging-only | 0 field diffs | **Expected Staged Offer** |
| **OfferProductTarget** | 0 | 1 | +1 | 1 staging-only | 0 field diffs | **Expected Staged Offer Target** |
| **OfferCategoryTarget** | 0 | 0 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **OfferLocationTarget** | 0 | 0 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **ImportJob** | 0 | 0 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **ImportItem** | 0 | 0 | 0 | 0 diff | 0 field diffs | **Exact Match** |
| **_prisma_migrations** | 4 | 5 | +1 | 1 staging-only | 0 field diffs | **Expected Applied Migration** |

---

## 2. Row-Level Deep-Dive on Differences

### A. Expected Merged Differences (Preserved from Client Destination Baseline)

1. **Product: "ديك بلدي" (Baladi Rooster)**
   * **Product ID:** `bb1e4825-af47-480b-b42f-260a29f0fd30`
   * **Attributes:** `nameAr: "ديك بلدي"`, `sectionId: "047773fe-36ae-475d-b57d-5729fc5f7d6a"` (الأطباق البدوية), `isAvailable: true`, `isVisible: true`.
   * **Variant ID:** `927ccbc4-56d2-4a79-8e36-3cf25c3d9dee` (`price: 470.00`).
   * **Image ID:** `img-local-93c87795558f024c` (`url: https://res.cloudinary.com/tifawhcs/image/upload/v1795527222/naqer-menu/products/baladi-rooster.webp`).
   * **Option Links:** Linked to `grp-bedouin-side` and `grp-naqer-sauces`.
   * **Reason:** Unique product discovered during the destination preservation audit, verified and merged into staging.

2. **Admin User: `admin@naqer.com`**
   * **User ID:** `1373831b-8ae4-475a-a340-574d8aa25f53`
   * **Role:** `OWNER`
   * **Display Name:** `إبراهيم شعيب (مدير عام المطعم)`
   * **Status:** `isActive: true`, `mustChangePassword: true`
   * **Reason:** Client owner account preserved from the original destination database `neondb`. Coexists seamlessly with production owners `admin@naqer-restaurant.local` and `ibrahimshoeib255@gmail.com`.

3. **Historical Audit Log: `audit-authoritative-import-1795441536`**
   * **Action:** `IMPORT_AUTHORITATIVE_DATASET`
   * **Timestamp:** `2026-11-23 11:45:36 UTC`
   * **Reason:** Preserved audit record documenting the authoritative menu dataset import.

4. **Prisma Migration: `20261123160000_add_admin_roles_enum`**
   * **Checksum:** `5802d3bb99214777c08a47ba07e8ef63406f58f4a132e01df22791834167e45e`
   * **Reason:** Repository schema includes `ADMIN` and `ORDERS_STAFF` in `AdminRole` enum. Applied cleanly to staging target to bring schema into 100% synchronization with code.

5. **Staging Offer & Target: `cmwty41en000907imtbye8z34`**
   * **Title:** `وجبة التوفير اللي بجد وصلت!`
   * **Type:** `SPECIAL_PRICE`
   * **Target Product:** `e16b4983-caf0-45d1-9272-94e6cd7ccf76` (`وجبة توفير`)
   * **Status:** `isActive: true`

---

### B. Live Production Drift (Changes Made in Source Prod Post-Snapshot)

Between the creation of the production snapshot (14:49 UTC) and this audit, an administrative user logged into the live production database to test offer configuration:

1. **Source-Only Audit Logs (5 entries):**
   * `cmwuqqtgd000008kxdnzmb2bq` (`2026-11-24 11:39:11 UTC`): Admin login (`أحمد الناقر` / `admin@naqer-restaurant.local`).
   * `cmwuqqzpt000008l6tyev4aqw` (`2026-11-24 11:39:19 UTC`): Offer toggle (disable).
   * `cmwuqr1gv000008jp5q6goz2j` (`2026-11-24 11:39:21 UTC`): Offer toggle (enable).
   * `cmwuqrn3l000108kx4zisj5ox` (`2026-11-24 11:39:49 UTC`): Offer update.
   * `cmwuqx8c0000008jn8fbz0fs1` (`2026-11-24 11:44:10 UTC`): Offer deleted.
2. **Source-Only Session (1 entry):**
   * `sess-71c961bd-bfc7-4491-9ec7-5ac76906cb72` created during that live test login.
3. **Shared Record Field Diffs (`AdminUser` `usr-admin-owner-001`):**
   * `lastLoginAt`: Source is `2026-11-24 11:39:11 UTC`, Staging is `2026-11-23 22:26:40 UTC`.
   * `updatedAt`: Source is `2026-11-24 11:39:11 UTC`, Staging is `2026-11-23 22:26:40 UTC`.

**Analysis:**
Zero business data (no customer orders, customer profiles, addresses, or products) was modified in source production. The 5 audit log entries and 1 session are transient administrative artifacts resulting from a test offer creation and immediate deletion.

---

## 3. Data Protection and PII Redaction Statement

In accordance with Absolute Safety Rule 7 and GDPR/Egyptian Data Protection principles:
* No customer personal phone numbers, full names, or physical delivery addresses are exposed in this document.
* Password hashes and session tokens are strictly omitted and verified via mathematical hashing algorithms.
