# Naqer Menu — Phase 2C: Migrate Legacy Mandi Category Banner Report

**Date:** 2026-11-24  
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Target Database:** `naqer_merged_staging` on Neon cluster `ep-aged-feather-bej8rk3r`  
**Cloudinary Destination Account:** `tifawhcs` (Folder: `naqer-menu/categories/`)  
**Scope:** Task C from `PHASE2_RECONCILIATION_PLAN.md` exclusively  
**Execution Status:** **COMPLETE & VERIFIED (PASS)**  

---

## 1. Executive Summary

In accordance with strict authorization, **Phase 2C (Task C: Migrate Legacy Mandi Category Banner)** was executed. The final remaining asset pointing to the retired Cloudinary account `damc35hfo` across the entire database has been successfully migrated to client account `tifawhcs`.

Preflight checks confirmed that local source file `pdf-images/upload/pdf-mandi.jpg` exists on disk and its SHA256 matches the manifest bit-for-bit. The asset was uploaded to `tifawhcs/naqer-menu/categories/pdf-mandi` and verified with direct HTTPS download (HTTP 200, `image/jpeg`, 38,937 bytes, exact SHA256 match).

An atomic PostgreSQL transaction was executed on `naqer_merged_staging`, updating exactly one row in the `Category` table (`slug: 'mandi'`). Post-execution audit verified that the total count of references to `damc35hfo` across the entire database is now **0**. Source production, client baseline, Vercel infrastructure, and unrelated tables remained strictly untouched.

---

## 2. Preflight Verification Results

Before initiating the upload or database update, preflight assertions were executed:

| Preflight Check | Assertion / Condition | Result | Evidence |
| :--- | :--- | :---: | :--- |
| **Local Source File** | Must exist on disk | **PASS** | File verified at `pdf-images/upload/pdf-mandi.jpg`. |
| **Local File Size** | Must match source photography size | **PASS** | Exactly `38,937 bytes`. |
| **Local SHA256 Checksum** | Must match `5be69156...cc03e` | **PASS** | Computed SHA256: `5be69156fccc9b10ad55063e2b2f7755b56323e2a4a5b34b26996015782cc03e`. |
| **Cloudinary Account** | Destination account must be `tifawhcs` | **PASS** | `CLOUDINARY_CLOUD_NAME === 'tifawhcs'`. |
| **Category Record Identity** | Must find exact Category row | **PASS** | Found 1 row (`id: "cdba4eea-17a5-4cb6-a605-e183b8622a6e"`, `slug: "mandi"`, `nameAr: "المندي"`). |
| **Initial Image State** | Must point to `damc35hfo` | **PASS** | Current URL: `https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/categories/pdf-mandi.jpg`. |
| **Category Table Schema** | Verify exact column names | **PASS** | Identified columns: `imageUrl`, `imagePublicId`, `updatedAt`. |

---

## 3. Cloudinary Upload & Checksum Verification

The asset was uploaded to client account `tifawhcs` under the dedicated `naqer-menu/categories/` folder:

- **Destination Cloudinary Account:** `tifawhcs`
- **Destination Folder:** `naqer-menu/categories`
- **Destination Public ID:** `naqer-menu/categories/pdf-mandi`
- **Destination Secure URL:** `https://res.cloudinary.com/tifawhcs/image/upload/v1795535257/naqer-menu/categories/pdf-mandi.jpg`

### Download & Bit-for-Bit Checksum Verification:
- **Download Method:** Direct HTTPS GET from `https://res.cloudinary.com/tifawhcs/image/upload/v1795535257/naqer-menu/categories/pdf-mandi.jpg`
- **HTTP Response Status:** **200 OK**
- **Content-Type:** `image/jpeg`
- **Downloaded Byte Count:** **38,937 bytes** (Matches local size bit-for-bit)
- **Downloaded SHA256:** `5be69156fccc9b10ad55063e2b2f7755b56323e2a4a5b34b26996015782cc03e`
- **Exact Byte Match:** **100% (PASS)** — Zero recompression or transcoding losses.

---

## 4. Database Transaction & Category Record Update

The update was executed inside an atomic transaction on `naqer_merged_staging`:

```sql
BEGIN;

UPDATE "Category"
SET "imageUrl" = 'https://res.cloudinary.com/tifawhcs/image/upload/v1795535257/naqer-menu/categories/pdf-mandi.jpg',
    "imagePublicId" = 'naqer-menu/categories/pdf-mandi',
    "updatedAt" = NOW()
WHERE id = 'cdba4eea-17a5-4cb6-a605-e183b8622a6e' 
  AND slug = 'mandi'
RETURNING *;
-- Affected rows assertion: exactly 1 row

COMMIT;
```

### Execution Metrics:
- **Transaction State:** `COMMITTED`
- **Affected Rows:** Exactly **1 row**
- **Rollback Required:** `false` (Zero errors).

### Category Row Before vs After Comparison:

| Field | Pre-Update State | Post-Update State | Status |
| :--- | :--- | :--- | :---: |
| `id` | `cdba4eea-17a5-4cb6-a605-e183b8622a6e` | `cdba4eea-17a5-4cb6-a605-e183b8622a6e` | Unchanged |
| `slug` | `mandi` | `mandi` | Unchanged |
| `nameAr` | `المندي` | `المندي` | Unchanged |
| `icon` | `🍚` | `🍚` | Unchanged |
| `group` | `FOOD` | `FOOD` | Unchanged |
| `layout` | `LIST` | `LIST` | Unchanged |
| `isVisible` | `true` | `true` | Unchanged |
| `sortOrder` | `4` | `4` | Unchanged |
| `imageUrl` | `https://res.cloudinary.com/damc35hfo/...` | `https://res.cloudinary.com/tifawhcs/image/upload/v1795535257/naqer-menu/categories/pdf-mandi.jpg` | **UPDATED** |
| `imagePublicId` | `naqer-menu/categories/pdf-mandi` | `naqer-menu/categories/pdf-mandi` | Maintained |
| `updatedAt` | `2026-11-23T19:49:45.584Z` | `2026-11-24T13:47:39.105Z` | **UPDATED** |

---

## 5. Post-Execution Database Verification

### 5.1 Legacy Asset Eradication Audit
A comprehensive audit across all tables in `naqer_merged_staging` confirmed that zero references to `damc35hfo` remain:

| Table Audited | Query Checked | Remaining `damc35hfo` Count | Status |
| :--- | :--- | :---: | :---: |
| **`Category`** | `WHERE "imageUrl" LIKE '%damc35hfo%' OR "imagePublicId" LIKE '%damc35hfo%'` | **0** | **CLEAN** |
| **`ProductImage`** | `WHERE url LIKE '%damc35hfo%'` | **0** | **CLEAN** |
| **`Offer`** | `WHERE "imageUrl" LIKE '%damc35hfo%'` | **0** | **CLEAN** |
| **Entire Database** | Across all image columns | **0** | **100% ELIMINATED** |

### 5.2 Protected Tables Count Audit
Record counts were queried across all protected tables before and after the transaction:

| Table Name | Count Before Execution | Count After Execution | Delta | Status |
| :--- | :---: | :---: | :---: | :---: |
| **`Category`** | 17 | **17** | **0** | **UNCHANGED** |
| **`ProductImage`** | 151 | **151** | **0** | **UNCHANGED** |
| **`Product`** | 151 | **151** | **0** | **UNCHANGED** |
| **`AuditLog`** | 134 | **134** | **0** | **UNCHANGED** |
| **`Session`** | 9 | **9** | **0** | **UNCHANGED** |
| **`Offer`** | 0 | **0** | **0** | **UNCHANGED** |
| **`OfferProductTarget`** | 0 | **0** | **0** | **UNCHANGED** |
| **`_prisma_migrations`** | 5 | **5** | **0** | **UNCHANGED** |

---

## 6. External Databases & Scope Boundaries Verification

- **Source Production Database (`ep-soft-dawn-bdu5de43`):**
  - Read-only queries confirmed `Category` retains its legacy URL (`damcCount: 1`).
  - Production writes: **0**.
- **Client Baseline Database (`neondb` on `ep-aged-feather-bej8rk3r`):**
  - Read-only queries confirmed `Category` retains its legacy URL (`damcCount: 1`).
  - Baseline writes: **0**.
- **Vercel Infrastructure & Deployments:** 0 deployments triggered, 0 DNS/environment modifications.

---

## 7. Git Working Tree & Secrets Protection

- **Tracked Modifications:**
  - `FINAL_DATABASE_INTEGRITY_REPORT.md` (audit report)
  - `app/globals.css` (verified CSS clipping fix)
  - Zero application code, schema, or migration files modified.
- **Untracked Deliverables:**
  - `PHASE2C_MANDI_BANNER_MIGRATION_REPORT.md` (this report)
  - `PHASE2B_AUDITLOG_SYNC_REPORT.md`
  - `PHASE2A_OFFER_CLEANUP_REPORT.md`
  - `PHASE2_RECONCILIATION_PLAN.md`
  - `PHASE1_INDEPENDENT_VERIFICATION.md`
  - `CLOUDINARY_STAGING_MIGRATION_REPORT.md`
  - `cloudinary_staging_migration_manifest.json`
- **Secrets Protection:** 0 connection strings, API keys, password hashes, or customer PII are exposed in git or report outputs.

---

## 8. Rollback Readiness

If the `mandi` category image URL ever needs to be reverted to the legacy account, the rollback SQL is prepared and verified:

```sql
BEGIN;
UPDATE "Category"
SET "imageUrl" = 'https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/categories/pdf-mandi.jpg',
    "imagePublicId" = 'naqer-menu/categories/pdf-mandi',
    "updatedAt" = '2026-11-23 19:49:45.584'::timestamp
WHERE id = 'cdba4eea-17a5-4cb6-a605-e183b8622a6e';
COMMIT;
```

---

## Conclusion & Gate Status

Task C is **100% COMPLETE**. The legacy Cloudinary account `damc35hfo` has been completely eliminated from the staging database (`naqer_merged_staging`). Every single image in `ProductImage`, `Category`, and `Offer` now points to either local assets or the client Cloudinary account `tifawhcs`.

In strict compliance with your instructions, execution has stopped. No cutover or subsequent phases have been initiated.
