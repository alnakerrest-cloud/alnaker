# Naqer Menu — Phase 2A: Remove Obsolete Staging Offer Report

**Date:** 2026-11-24  
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Target Database:** `naqer_merged_staging` on Neon cluster `ep-aged-feather-bej8rk3r`  
**Scope:** Task A from `PHASE2_RECONCILIATION_PLAN.md` exclusively  
**Execution Status:** **COMPLETE & VERIFIED (PASS)**  

---

## 1. Executive Summary

In accordance with strict authorization, **Phase 2A (Task A: Staging Offer Cleanup)** was executed against `naqer_merged_staging`. The obsolete test offer `cmwty41en000907imtbye8z34` and its associated product target `cmwtyglqr000g07jhmw3yxtjh` have been permanently removed within a single, atomic, verified PostgreSQL transaction.

Preflight checks confirmed that no historical orders or business records referenced the offer. The transaction deleted exactly 1 child target row and 1 parent offer row (total 2 rows deleted). Post-execution verification confirmed both records are completely absent, total offers in staging dropped from 1 to 0 (matching live production), and all unrelated tables remained 100% unchanged.

Source production (`ep-soft-dawn-bdu5de43`) and client baseline (`neondb`) databases remained untouched with zero connection writes. **Tasks B (AuditLog sync) and C (Category migration) were strictly NOT executed.**

---

## 2. Preflight Verification Results

Before initiating the deletion transaction, automated preflight assertions were executed against `naqer_merged_staging`:

| Preflight Check | Assertion / Condition | Result | Evidence |
| :--- | :--- | :---: | :--- |
| **Database Identity** | Target must be `naqer_merged_staging` | **PASS** | Hardened connection URL validated host and pathname `/naqer_merged_staging`. |
| **Offer Record Existence** | Exact ID `cmwty41en000907imtbye8z34` exists | **PASS** | Found 1 row (`titleAr: "وجبة التوفير اللي بجد وصلت!"`, promoPrice: 220.00). |
| **Total Staging Offers Before** | Exact count must be 1 | **PASS** | `SELECT COUNT(*) FROM "Offer"` returned exactly `1`. |
| **Child Target Existence** | Exact ID `cmwtyglqr000g07jhmw3yxtjh` linked to offer | **PASS** | Found 1 row (`productId: "e16b4983-caf0-45d1-9272-94e6cd7ccf76"`). |
| **Total Child Targets Before** | Exact count must be 1 | **PASS** | `SELECT COUNT(*) FROM "OfferProductTarget"` returned exactly `1`. |
| **Other Offer Targets** | Category / Location targets count must be 0 | **PASS** | Found 0 category targets, 0 location targets. |
| **Order Dependencies** | No historical order references | **PASS** | `OrderItem` schema contains zero foreign keys or columns referencing `Offer`. |

All preflight assertions passed. Proceeded to atomic execution.

---

## 3. Atomic Transaction Execution Evidence

The deletion was performed using explicit, verified SQL statements within a single atomic transaction:

```sql
BEGIN;

-- 1. Explicitly delete child product target
DELETE FROM "OfferProductTarget" 
WHERE id = 'cmwtyglqr000g07jhmw3yxtjh' 
  AND "offerId" = 'cmwty41en000907imtbye8z34'
RETURNING id;
-- Affected rows assertion: 1 row deleted

-- 2. Explicitly delete parent offer
DELETE FROM "Offer" 
WHERE id = 'cmwty41en000907imtbye8z34'
RETURNING id, "titleAr";
-- Affected rows assertion: 1 row deleted

-- 3. In-Transaction Integrity Verification
SELECT COUNT(*) FROM "Offer";             -- Must be 0
SELECT COUNT(*) FROM "OfferProductTarget"; -- Must be 0

COMMIT;
```

### Execution Log Evidence:
- **Transaction State:** `COMMITTED`
- **Child Target Deleted (`OfferProductTarget`):** Exactly **1 row** (`id: cmwtyglqr000g07jhmw3yxtjh`)
- **Parent Offer Deleted (`Offer`):** Exactly **1 row** (`id: cmwty41en000907imtbye8z34`, `titleAr: "وجبة التوفير اللي بجد وصلت!"`)
- **In-Transaction Offer Count:** `0`
- **In-Transaction Target Count:** `0`
- **Rollback Required:** `false` (No errors encountered, zero rollbacks triggered).

---

## 4. Post-Execution Database Verification

A post-execution audit query connected to `naqer_merged_staging` to verify table counts and confirm absence:

### 4.1 Target Records Verification
- `SELECT * FROM "Offer" WHERE id = 'cmwty41en000907imtbye8z34'`: **0 rows (ABSENT)**
- `SELECT * FROM "OfferProductTarget" WHERE id = 'cmwtyglqr000g07jhmw3yxtjh'`: **0 rows (ABSENT)**
- `SELECT COUNT(*) FROM "Offer"`: **0** (Decreased by exactly 1)
- `SELECT COUNT(*) FROM "OfferProductTarget"`: **0** (Decreased by exactly 1)

### 4.2 Unrelated Tables Integrity Audit
To ensure zero unintended collateral changes, record counts across unrelated tables were verified before and after execution:

| Table Name | Count Before Execution | Count After Execution | Delta | Status |
| :--- | :---: | :---: | :---: | :---: |
| **`Offer`** | 1 | **0** | **-1** | **INTENDED DELETION** |
| **`OfferProductTarget`** | 1 | **0** | **-1** | **INTENDED DELETION** |
| **`AuditLog`** | 129 | **129** | **0** | **UNCHANGED** |
| **`ProductImage`** | 151 | **151** | **0** | **UNCHANGED** |
| **`Category`** | 17 | **17** | **0** | **UNCHANGED** |
| **`Product`** | 151 | **151** | **0** | **UNCHANGED** |
| **`_prisma_migrations`** | 5 | **5** | **0** | **UNCHANGED** |
| **`Session`** | 9 | **9** | **0** | **UNCHANGED** |

**Conclusion:** Exactly and only the 2 intended records were removed. Zero unrelated tables were modified.

---

## 5. External Database Protection Verification

Independent read-only checks confirmed that non-target databases remained untouched:
- **Source Production Database (`ep-soft-dawn-bdu5de43`):**
  - Total Offers: **0** (Matches staging post-execution).
  - Total AuditLogs: **143** (Untouched).
  - Production writes: **0**.
- **Client Baseline Database (`neondb` on `ep-aged-feather-bej8rk3r`):**
  - Total ProductImage: **151** (Untouched).
  - Baseline writes: **0**.

---

## 6. Git Working Tree & Secrets Protection

- **Tracked Modifications:**
  - `FINAL_DATABASE_INTEGRITY_REPORT.md` (audit report)
  - `app/globals.css` (verified CSS clipping fix)
  - Zero application code, schema, or migration files modified.
- **Untracked Deliverables:**
  - `PHASE2A_OFFER_CLEANUP_REPORT.md` (this report)
  - `PHASE2_RECONCILIATION_PLAN.md`
  - `PHASE1_INDEPENDENT_VERIFICATION.md`
  - `CLOUDINARY_STAGING_MIGRATION_REPORT.md`
  - `cloudinary_staging_migration_manifest.json`
- **Secrets Protection:** 0 connection strings, API keys, password hashes, or customer PII are exposed in git or report outputs.

---

## 7. Confirmation of Scope Boundaries

- **Task A (Staging Offer Cleanup):** **EXECUTED & VERIFIED**
- **Task B (AuditLog Synchronization):** **NOT EXECUTED** (0 rows inserted; `AuditLog` count remains 129).
- **Task C (Category Legacy Image Migration):** **NOT EXECUTED** (Category table remains untouched).
- **Cloudinary Assets:** **NOT TOUCHED** (0 assets uploaded or deleted).

---

## 8. Rollback Readiness

If the offer ever needs to be restored to staging for any reason, the following idempotent script is prepared and verified:

```sql
BEGIN;
INSERT INTO "Offer" (
  "id", "titleAr", "titleEn", "descAr", "descEn", "offerType", "discountValue",
  "promoPrice", "buyQty", "getQty", "minOrderAmount", "minQuantity", "startDate",
  "endDate", "isActive", "sortOrder", "imageUrl", "imagePublicId", "badgeAr",
  "badgeEn", "createdAt", "updatedAt"
) VALUES (
  'cmwty41en000907imtbye8z34', 'وجبة التوفير اللي بجد وصلت!', NULL, NULL, NULL,
  'SPECIAL_PRICE', NULL, 220.00, 1, 1, NULL, 1, NULL, NULL, true, -1,
  'https://res.cloudinary.com/tifawhcs/image/upload/v1795479505/naqer-menu/offers/noo7nrpz5vz9mtwrbfi3.jpg',
  'naqer-menu/offers/noo7nrpz5vz9mtwrbfi3', '⭐ عرض مميز', '⭐ Featured Offer',
  '2026-11-23 22:17:39.359'::timestamp, '2026-11-23 22:27:25.636'::timestamp
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "OfferProductTarget" ("id", "offerId", "productId", "createdAt")
VALUES (
  'cmwtyglqr000g07jhmw3yxtjh', 'cmwty41en000907imtbye8z34', 'e16b4983-caf0-45d1-9272-94e6cd7ccf76', '2026-11-23 22:27:25.587'::timestamp
) ON CONFLICT ("id") DO NOTHING;
COMMIT;
```

---

## Conclusion & Gate Status

Task A is **100% COMPLETE**. The obsolete offer and target are cleanly removed from staging, bringing the staging `Offer` table into exact alignment with live production (`COUNT = 0`). The 404 browser error for `offers/noo7nrpz5vz9mtwrbfi3.jpg` is permanently resolved.

In strict compliance with instructions, execution has stopped. I await your review and authorization before proceeding with any subsequent task (such as Task B: AuditLog synchronization).
