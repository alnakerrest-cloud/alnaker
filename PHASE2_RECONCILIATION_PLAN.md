# Naqer Menu — Phase 2: Staging Data Reconciliation Plan (READ-ONLY)

**Date:** 2026-11-24  
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Auditor:** Antigravity (Independent Automated QA & Safety Guard)  
**Target Database:** `naqer_merged_staging` on Neon cluster `ep-aged-feather-bej8rk3r`  
**Scope:** Read-Only Planning & SQL Proposal (Zero writes executed)  

---

## Executive Summary

Phase 1 successfully migrated and independently verified all 14 `ProductImage` assets on Cloudinary account `tifawhcs`. 

This document establishes the **Phase 2 Data Reconciliation Plan**, resolving the remaining pre-cutover data differences between live source production (`ep-soft-dawn-bdu5de43`) and destination staging (`naqer_merged_staging`):
1. **Obsolete Staging Offer & Target:** Explanation of origin, full foreign key inspection, and a transactional cleanup plan for test offer `cmwty41en000907imtbye8z34` and target `cmwtyglqr000g07jhmw3yxtjh`.
2. **Missing Production AuditLogs:** Full column and schema comparison, foreign key validation, and an idempotent `INSERT` plan for the 5 live production AuditLog records without copying the ephemeral session.
3. **Category `mandi` Legacy Asset:** Complete asset identification, local file verification, and migration plan to eliminate the final reference to retired account `damc35hfo`.
4. **Safety & Zero-Write Evidence:** Proof that no databases or files were modified during this planning task.

---

## Task A — Staging Test Offer Cleanup Plan

### 1. Root Cause & Chronology Discovery
During our read-only investigation, the timeline of this record was fully reconstructed from the live production `AuditLog`:

```
1. 2026-11-23 22:17:39 UTC: Offer cmwty41en000907imtbye8z34 was created during staging QA.
2. 2026-11-23 22:27:25 UTC: OfferProductTarget cmwtyglqr000g07jhmw3yxtjh was linked to product e16b4983-caf0-45d1-9272-94e6cd7ccf76.
3. 2026-11-24 11:39:11 UTC: Owner (أحمد الناقر) logged into live production (AuditLog: cmwuqqtgd000008kxdnzmb2bq).
4. 2026-11-24 11:39:19 to 11:39:49 UTC: Owner toggled and updated the offer in production (AuditLogs: ...zpt, ...1gv, ...n3l).
5. 2026-11-24 11:44:10 UTC: Owner permanently DELETED the offer from live production (AuditLog: cmwuqx8c0000008jn8fbz0fs1).
```

Because the destination staging database was restored from a snapshot taken before 11:44:10 UTC, the deleted offer remained in staging as an obsolete orphan. In live production, `SELECT COUNT(*) FROM "Offer"` currently equals **0**.

### 2. Exact Record Identification

#### Offer Record (`Offer` Table in Staging):
- **ID:** `cmwty41en000907imtbye8z34`
- **Title (AR):** `وجبة التوفير اللي بجد وصلت!`
- **Type:** `SPECIAL_PRICE` (Promo Price: `220.00 EGP`, Sort Order: `-1`)
- **Active Status:** `isActive: true`
- **Image URL:** `https://res.cloudinary.com/tifawhcs/image/upload/v1795479505/naqer-menu/offers/noo7nrpz5vz9mtwrbfi3.jpg` (Missing / **HTTP 404**)
- **Image Public ID:** `naqer-menu/offers/noo7nrpz5vz9mtwrbfi3`
- **Created At:** `2026-11-23T22:17:39.359Z` | **Updated At:** `2026-11-23T22:27:25.636Z`

#### Target Record (`OfferProductTarget` Table in Staging):
- **ID:** `cmwtyglqr000g07jhmw3yxtjh`
- **Offer ID:** `cmwty41en000907imtbye8z34`
- **Product ID:** `e16b4983-caf0-45d1-9272-94e6cd7ccf76`
- **Created At:** `2026-11-23T22:27:25.587Z`

### 3. Dependency & Foreign Key Inspection
An inspection of `information_schema` foreign key constraints for table `Offer` revealed:

| Referencing Table | Foreign Key Column | Constraint Name | Delete Rule | Staging Rows Referencing `cmwty41en000907imtbye8z34` |
| :--- | :--- | :--- | :---: | :---: |
| `OfferProductTarget` | `offerId` | `OfferProductTarget_offerId_fkey` | **CASCADE** | **1** (`cmwtyglqr000g07jhmw3yxtjh`) |
| `OfferCategoryTarget` | `offerId` | `OfferCategoryTarget_offerId_fkey` | **CASCADE** | **0** |
| `OfferLocationTarget` | `offerId` | `OfferLocationTarget_offerId_fkey` | **CASCADE** | **0** |
| `OrderItem` | *N/A* | *No relation* | *N/A* | **0** (No `offerId` column in schema) |
| `Order` | *N/A* | *No relation* | *N/A* | **0** |

**Conclusion:** The offer is referenced **only** by its single child target in `OfferProductTarget`. It is not referenced by any historical orders, order items, or business records.

### 4. Proposed Transactional Cleanup SQL (Not Executed)

To ensure strict determinism and safety, child records will be explicitly targeted before deleting the parent:

```sql
-- ====================================================================
-- PHASE 2 TASK A: STAGING OFFER & TARGET CLEANUP
-- TARGET DATABASE: naqer_merged_staging ONLY
-- ====================================================================

BEGIN;

-- Precondition 1: Verify exact offer exists
DO $$
DECLARE
  v_offer_count INT;
  v_target_count INT;
BEGIN
  SELECT COUNT(*) INTO v_offer_count 
  FROM "Offer" 
  WHERE id = 'cmwty41en000907imtbye8z34';
  
  IF v_offer_count <> 1 THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: Expected exactly 1 Offer, found %', v_offer_count;
  END IF;

  SELECT COUNT(*) INTO v_target_count 
  FROM "OfferProductTarget" 
  WHERE "offerId" = 'cmwty41en000907imtbye8z34';
  
  IF v_target_count <> 1 THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: Expected exactly 1 OfferProductTarget, found %', v_target_count;
  END IF;
END $$;

-- Step 1: Explicitly delete child target
DELETE FROM "OfferProductTarget"
WHERE id = 'cmwtyglqr000g07jhmw3yxtjh' 
  AND "offerId" = 'cmwty41en000907imtbye8z34';
-- Expected affected rows: exactly 1

-- Step 2: Delete parent offer
DELETE FROM "Offer"
WHERE id = 'cmwty41en000907imtbye8z34';
-- Expected affected rows: exactly 1

-- Postcondition Verification: Ensure zero orphaned or residual records
DO $$
DECLARE
  v_rem_offers INT;
  v_rem_targets INT;
BEGIN
  SELECT COUNT(*) INTO v_rem_offers 
  FROM "Offer" 
  WHERE id = 'cmwty41en000907imtbye8z34';

  SELECT COUNT(*) INTO v_rem_targets 
  FROM "OfferProductTarget" 
  WHERE "offerId" = 'cmwty41en000907imtbye8z34';

  IF v_rem_offers <> 0 OR v_rem_targets <> 0 THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: Offer or target records still exist after deletion';
  END IF;
END $$;

COMMIT;
```

- **Expected Affected Rows:**
  - `OfferProductTarget`: exactly 1 row deleted.
  - `Offer`: exactly 1 row deleted.
- **Post-Execution State:** Total offers in staging = **0** (matches source production).

---

## Task B — AuditLog Synchronization Plan

### 1. Schema & Column Comparison
A query against `information_schema.columns` for `AuditLog` in both source production and destination staging confirmed an exact 1:1 schema match:

| Column Name | Data Type | Nullable | Source Production | Staging | Compatibility |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `id` | `text` | NO | Present | Present | **100% Match** |
| `adminId` | `text` | YES | Present | Present | **100% Match** |
| `action` | `text` | NO | Present | Present | **100% Match** |
| `entityType` | `text` | NO | Present | Present | **100% Match** |
| `entityId` | `text` | YES | Present | Present | **100% Match** |
| `summary` | `text` | YES | Present | Present | **100% Match** |
| `changes` | `jsonb` | YES | Present | Present | **100% Match** |
| `createdAt` | `timestamp without time zone` | NO | Present | Present | **100% Match** |

### 2. Foreign Key & Entity Reference Integrity
- `adminId` references `AdminUser(id) ON DELETE SET NULL`.
- In all 5 records, `adminId = 'usr-admin-owner-001'`.
- Query against staging confirmed `usr-admin-owner-001` exists:
  - `id`: `usr-admin-owner-001`
  - `email`: `admin@naqer-restaurant.local`
  - `displayName`: `أحمد الناقر`
  - `role`: `OWNER`
- `entityId` has **no foreign key constraint** (it is a generic text reference for historical auditing). Storing references to deleted records like `cmwty41en000907imtbye8z34` is valid and standard CMS behavior.
- Query against staging confirmed that **0 of the 5 IDs currently exist** in staging `AuditLog`.

### 3. PII & Session Protection Audit
- **Customer PII Check:** None. Records describe internal administrator actions. Zero customer names, phone numbers, delivery addresses, or payment data exist in the payloads.
- **Sensitive Security Data Check:** None. No password hashes, plain passwords, or auth tokens exist in `changes` or `summary`.
- **Ephemeral Session Exclusion:** The live production `Session` record (`cmwuqqtgd000108kx245m2e13`) is an ephemeral runtime login session. In accordance with safety rules, it will **NOT** be copied to staging.

### 4. Proposed Idempotent Synchronization SQL (Not Executed)

```sql
-- ====================================================================
-- PHASE 2 TASK B: AUDITLOG SYNCHRONIZATION
-- TARGET DATABASE: naqer_merged_staging ONLY
-- ====================================================================

BEGIN;

-- Precondition: Verify target AdminUser exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "AdminUser" WHERE id = 'usr-admin-owner-001') THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: Referenced AdminUser usr-admin-owner-001 missing in staging';
  END IF;
END $$;

INSERT INTO "AuditLog" ("id", "adminId", "action", "entityType", "entityId", "summary", "changes", "createdAt")
VALUES
  (
    'cmwuqqtgd000008kxdnzmb2bq',
    'usr-admin-owner-001',
    'login',
    'AdminUser',
    'usr-admin-owner-001',
    'تسجيل دخول: أحمد الناقر (OWNER)',
    NULL,
    '2026-11-24 11:39:11.389'::timestamp
  ),
  (
    'cmwuqqzpt000008l6tyev4aqw',
    'usr-admin-owner-001',
    'update',
    'Offer',
    'cmwty41en000907imtbye8z34',
    'إيقاف العرض: وجبة التوفير اللي بجد وصلت!',
    '{"after": {"isActive": false}, "before": {"isActive": true}}'::jsonb,
    '2026-11-24 11:39:19.505'::timestamp
  ),
  (
    'cmwuqr1gv000008jp5q6goz2j',
    'usr-admin-owner-001',
    'update',
    'Offer',
    'cmwty41en000907imtbye8z34',
    'تفعيل العرض: وجبة التوفير اللي بجد وصلت!',
    '{"after": {"isActive": true}, "before": {"isActive": false}}'::jsonb,
    '2026-11-24 11:39:21.775'::timestamp
  ),
  (
    'cmwuqrn3l000108kx4zisj5ox',
    'usr-admin-owner-001',
    'update',
    'Offer',
    'cmwty41en000907imtbye8z34',
    'تعديل العرض: وجبة التوفير اللي بجد وصلت!',
    '{"after": {"titleAr": "وجبة التوفير اللي بجد وصلت!", "isActive": true, "offerType": "SPECIAL_PRICE"}, "before": {"titleAr": "وجبة التوفير اللي بجد وصلت!", "isActive": true, "offerType": "SPECIAL_PRICE"}}'::jsonb,
    '2026-11-24 11:39:49.809'::timestamp
  ),
  (
    'cmwuqx8c0000008jn8fbz0fs1',
    'usr-admin-owner-001',
    'delete',
    'Offer',
    'cmwty41en000907imtbye8z34',
    'حذف العرض: وجبة التوفير اللي بجد وصلت!',
    '{"before": {"titleAr": "وجبة التوفير اللي بجد وصلت!"}}'::jsonb,
    '2026-11-24 11:44:10.608'::timestamp
  )
ON CONFLICT ("id") DO NOTHING;

-- Postcondition Verification: Ensure exactly 5 records exist
DO $$
DECLARE
  v_inserted INT;
BEGIN
  SELECT COUNT(*) INTO v_inserted 
  FROM "AuditLog" 
  WHERE id IN (
    'cmwuqqtgd000008kxdnzmb2bq',
    'cmwuqqzpt000008l6tyev4aqw',
    'cmwuqr1gv000008jp5q6goz2j',
    'cmwuqrn3l000108kx4zisj5ox',
    'cmwuqx8c0000008jn8fbz0fs1'
  );
  
  IF v_inserted <> 5 THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: Expected 5 AuditLog records, found %', v_inserted;
  END IF;
END $$;

COMMIT;
```

- **Expected Affected Rows:** Exactly 5 inserted rows (or 0 if previously applied due to `ON CONFLICT DO NOTHING`).
- **Post-Execution State:** Total AuditLogs in staging increases from 129 to **134** (source production has 143; the remaining delta represents earlier pre-cutover testing operations).

---

## Task C — Category Legacy Image Migration Plan (`mandi`)

### 1. Investigation Findings
- **Record:** `Category` table
- **Category ID:** `cdba4eea-17a5-4cb6-a605-e183b8622a6e`
- **Slug:** `mandi` | **Name (AR):** `المندي` | **Icon:** `🍚`
- **Current URL:** `https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/categories/pdf-mandi.jpg`
- **Current Public ID:** `naqer-menu/categories/pdf-mandi`
- **HTTP Status on Legacy Account:** **HTTP 200 OK** (38,937 bytes, `image/jpeg`)

### 2. Local Source Asset Verification
- **Local File Path:** `pdf-images/upload/pdf-mandi.jpg`
- **Local File Size:** 38,937 bytes
- **Local File SHA256:** `5be69156fccc9b10ad55063e2b2f7755b56323e2a4a5b34b26996015782cc03e`
- **Remote vs Local Match:** **100% bit-for-bit exact match** (`exact match: true`).

### 3. Frontend Usage Analysis
In `components/MenuView.tsx` (lines 1084-1099), category images are rendered in the category section header:

```tsx
{c.img ? (
  <Image
    className="cat-img"
    src={c.img}
    alt={c.name}
    width={96}
    height={96}
    sizes="(max-width: 700px) 40px, 64px"
    style={{ objectFit: "cover" }}
  />
) : (
  <span className="cat-icon" aria-hidden>{c.icon}</span>
)}
```

Currently, `damc35hfo` is the only external account referenced for this category banner. Migrating it to `tifawhcs` will eliminate the last remaining dependency on `damc35hfo` across the entire staging database.

### 4. Proposed Migration Plan (Separate Task — Not Executed)
1. **Upload Asset:** Upload `pdf-images/upload/pdf-mandi.jpg` to Cloudinary account `tifawhcs` under folder `naqer-menu/categories/` with public ID `pdf-mandi`.
2. **Verify Asset:** Confirm HTTP 200, `image/jpeg`, 38,937 bytes, SHA256 `5be69156fccc9b10ad55063e2b2f7755b56323e2a4a5b34b26996015782cc03e`.
3. **Database Update SQL (Staging only):**
```sql
BEGIN;
UPDATE "Category"
SET 
  "imageUrl" = 'https://res.cloudinary.com/tifawhcs/image/upload/v<VERSION>/naqer-menu/categories/pdf-mandi.jpg',
  "imagePublicId" = 'naqer-menu/categories/pdf-mandi',
  "updatedAt" = NOW()
WHERE id = 'cdba4eea-17a5-4cb6-a605-e183b8622a6e';
COMMIT;
```
4. **Postcondition:** Total remaining references to `damc35hfo` across all tables in staging = **0**.

---

## Task D — Safety & Git Verification

**Status:** **PASS**

1. **Zero-Write Verification:**
   - Source production database (`ep-soft-dawn-bdu5de43`): **0 writes, untouched**.
   - Client baseline database (`neondb`): **0 writes, untouched**.
   - Staging database (`naqer_merged_staging`): **0 writes, untouched**.
   - All investigations executed under explicit `SET TRANSACTION READ ONLY;`.
2. **Vercel / Deployments:** 0 deployments triggered, 0 DNS/environment modifications.
3. **Git Status:**
   - Tracked modifications: Strictly limited to `app/globals.css` (CSS clipping fix) and `FINAL_DATABASE_INTEGRITY_REPORT.md`.
   - Untracked files: Limited to verification reports and manifests.
   - Secrets inspection: **0 credentials, API keys, or password hashes exposed.**

---

## Subtask Readiness Scorecard

| Task | Scope | Plan Status | Preconditions Verified | Rollback Ready | Recommendation |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Task A** | Offer & Target Cleanup | **PASS** | Yes (1 offer, 1 target, 0 orders) | Yes (re-insert script) | **READY FOR EXECUTION** |
| **Task B** | AuditLog Synchronization | **PASS** | Yes (AdminUser exists, 0 PII, 0 collisions) | Yes (delete by 5 IDs) | **READY FOR EXECUTION** |
| **Task C** | Category `mandi` Migration | **PASS** | Yes (Local source file verified bit-for-bit) | Yes (revert URL) | **READY FOR EXECUTION** |
| **Task D** | Safety & Git Audit | **PASS** | Yes (0 writes, clean read-only state) | N/A | **MAINTAINED** |

---

## Rollback & Safety Strategies

### Rollback Strategy for Task A (Offer Cleanup):
If the offer deletion ever needs to be reversed:
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
);

INSERT INTO "OfferProductTarget" ("id", "offerId", "productId", "createdAt")
VALUES ('cmwtyglqr000g07jhmw3yxtjh', 'cmwty41en000907imtbye8z34', 'e16b4983-caf0-45d1-9272-94e6cd7ccf76', '2026-11-23 22:27:25.587'::timestamp);
COMMIT;
```

### Rollback Strategy for Task B (AuditLog Synchronization):
```sql
BEGIN;
DELETE FROM "AuditLog" 
WHERE id IN (
  'cmwuqqtgd000008kxdnzmb2bq',
  'cmwuqqzpt000008l6tyev4aqw',
  'cmwuqr1gv000008jp5q6goz2j',
  'cmwuqrn3l000108kx4zisj5ox',
  'cmwuqx8c0000008jn8fbz0fs1'
);
COMMIT;
```

---

## Conclusion & Next Step Gate

All preconditions, foreign keys, dependencies, row counts, and SQL transactions have been formulated and verified in strict read-only mode.

**No writes or modifications have occurred.** I await your explicit review and instruction before executing any part of Phase 2.
