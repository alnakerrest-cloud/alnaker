# Naqer Menu — Phase 3.5: Final Cutover & Rollback Runbook

**Document Version:** 1.0  
**Date:** 2026-11-24  
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Production Site:** `https://alnaker.vercel.app`  
**Target Candidate Database:** `naqer_merged_staging` on Neon cluster `ep-aged-feather-bej8rk3r`  
**Rollback Target Database:** `neondb` on Neon cluster `ep-soft-dawn-bdu5de43`  
**Document Status:** **PLANNING ONLY (DO NOT EXECUTE WITHOUT AUTHORIZATION)**  

---

## 1. Pre-Cutover Freeze & Write Prevention

Before executing cutover, write operations on production must be temporarily frozen:
- **Staff Coordination:** Inform restaurant management (أحمد الناقر / إبراهيم شعيب) to hold off on admin dashboard changes (`/admin`) for a 15-minute cutover window.
- **Customer Ordering:** No customer orders should be placed during the brief environment switch window.
- **Active Sessions:** Admin users should avoid triggering password rotations or profile edits during cutover.

---

## 2. Pre-Cutover Invariant Verification (Verification of Zero Incoming Writes)

Immediately prior to changing Vercel configuration, run the following verification query on source production:

```sql
-- Run against Source Production: ep-soft-dawn-bdu5de43 / neondb
SELECT 
  (SELECT COUNT(*) FROM "Order") as order_count,
  (SELECT MAX("createdAt") FROM "Order") as last_order_time,
  (SELECT COUNT(*) FROM "AuditLog") as audit_count,
  (SELECT MAX("createdAt") FROM "AuditLog") as last_audit_time;
```

**Passing Condition:**
- `order_count` must equal **2**.
- `last_order_time` must be `2026-11-23T22:23:41.078Z`.
- `audit_count` must equal **143**.
- `last_audit_time` must be `2026-11-24T13:10:48.688Z`.
- *If counts exceed these values, STOP: incoming writes occurred and drift reconciliation is required.*

---

## 3. Production Backup Checkpoints

Two levels of fresh backups are secured on disk:
1. **Source Production Backup:**
   - File: `backups/naqer_prod_source_backup_20261124174904.dump`
   - Size: `164,065 bytes`
   - SHA256: `9978ab525aee10cab933688b4bd2a1fc0b0305cfda19ed12118c389aa6e8cf69`
2. **Prior Source Production Backup:**
   - File: `backups/naqer_prod_source_backup_20261124.dump`
   - Size: `163,516 bytes`
   - SHA256: `b6633ceba8aacf2fc5cc79d30cfc8dad02133797f3db300435ca1bd170348266`

---

## 4. Staging Candidate Backup Checkpoints

The target candidate database `naqer_merged_staging` is backed up and verified:
1. **Merged Staging Backup:**
   - File: `backups/naqer_merged_staging_backup_20261124174904.dump`
   - Size: `163,460 bytes`
   - SHA256: `99aaff6810c4a42fb77a4d20264a3d6862d04c1e80982d515afee20509f2c83e`
2. **Client Baseline Preservation Backup:**
   - File: `backups/naqer_destination_preservation_backup_20261124.dump`
   - Size: `100,999 bytes`
   - SHA256: `0ca884051f69b9d2e2480598a387e181dda08eed3eb897da2caf27ea054937cb`

---

## 5. Drift Reconciliation Checkpoint

Phase 3.5 audit confirmed **zero unexpected business drift**:
- Customer count: 9 (100% matched)
- Address count: 22 (100% matched)
- Order count: 2 (100% matched)
- OrderStore count: 84 (100% matched)
- Product count: 151 (Staging preserves baseline product `bb1e4825`)
- Category count: 17 (100% matched, `mandi` banner upgraded to `tifawhcs`)

---

## 6. Exact Vercel Environment Configuration Change

> [!WARNING]
> **DO NOT APPLY NOW.** This is the exact parameter update to be applied only when cutover is explicitly authorized.

### Environment Variable Update:
In the Vercel Dashboard (`alnaker` project -> Settings -> Environment Variables) or via Vercel CLI:

- **Target Variable:** `DATABASE_URL`
- **Target Environments:** `Production` (and `Preview` if applicable)
- **New Value Format:**
  ```text
  postgresql://neondb_owner:npg_9ruYQlds5vTx@ep-aged-feather-bej8rk3r-pooler.c-9.us-east-2.aws.neon.tech/naqer_merged_staging?sslmode=require&channel_binding=require
  ```
  *(Note: Use the `-pooler` connection string for serverless production deployments to leverage PgBouncer).*
- **Secondary Variable (if configured):** `NAQER_ACTIVE_DATABASE_URL` (remove or update to match).

---

## 7. Deployment Sequence

1. **Commit Working Tree:** Ensure any approved CSS adjustments (e.g. `app/globals.css`) are committed to `main`.
2. **Apply Vercel Environment Variable:** Update `DATABASE_URL` in Vercel project settings.
3. **Trigger Production Deployment:**
   - Option A: Git push to `main` (`git push origin main`).
   - Option B: Deploy via Vercel CLI (`vercel --prod`).
4. **Inspect Build Logs:** Confirm successful Next.js static build, Prisma client generation, and 0 errors during page pre-rendering.
5. **Verify Assigned URL:** Confirm deployment is assigned to `https://alnaker.vercel.app`.

---

## 8. Immediate Read-Only Smoke Tests (Post-Deployment)

Execute immediately following deployment:
1. **Public Site Accessibility:**
   - `GET https://alnaker.vercel.app/ar`: Expected HTTP 200, Arabic RTL layout.
   - `GET https://alnaker.vercel.app/en`: Expected HTTP 200, English LTR layout.
2. **Category & Product Counts:**
   - Confirm all 17 categories are visible in the navigation pill bar.
   - Switch to "المندي" (Mandi) category: Confirm category banner loads from `tifawhcs/naqer-menu/categories/pdf-mandi.jpg` (HTTP 200).
   - Confirm total products displayed equals 151.
3. **Product Modal & Addons:**
   - Open product modal for "صينية الملوك": Verify variants, pricing, and ingredients chips render without clipping.
   - Open product modal for "ديك بلدي" (`bb1e4825`): Verify price renders as 470 EGP.
4. **Admin Route Check:**
   - `GET https://alnaker.vercel.app/admin/login`: Verify login page renders with HTTP 200.

---

## 9. Controlled Write Verification (Post-Smoke Tests)

Once read-only smoke tests pass and explicit user confirmation is received:
1. **Admin Authentication Test:**
   - Log in using verified owner credentials (`admin@naqer.com` or `admin@naqer-restaurant.local`).
   - Verify server-side session creation in `Session` table on `naqer_merged_staging`.
2. **Cart & Order Flow:**
   - Add 1 product to cart.
   - Proceed to checkout, enter verified test phone number, and verify customer lookup / WhatsApp payload generation.

---

## 10. Objective Rollback Triggers

Immediate rollback is triggered if ANY of the following conditions occur:
1. **Database Connection Refusal (Prisma P1001):** Application fails to connect to `naqer_merged_staging`.
2. **Missing Catalog Content:** Menu loads with fewer than 151 products or missing categories.
3. **Broken Image Assets:** Category banners or product images return HTTP 404/403.
4. **Authentication Failure:** Owner admin accounts fail authentication.
5. **Runtime Server Errors (HTTP 500):** Unhandled runtime exceptions in server components or API routes.

---

## 11. Rollback Execution Procedure

If a rollback trigger is met:
1. **Immediate Vercel Revert:**
   - In Vercel Project Settings, change `DATABASE_URL` back to Source Production:
     ```text
     postgresql://neondb_owner:npg_rFT4piIsBIK-zr1bHpu47gyig7-ph9-n@ep-soft-dawn-bdu5de43-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
     ```
2. **Trigger Instant Redeployment:**
   - Redeploy the prior known-good deployment in Vercel dashboard with 1 click ("Instant Rollback" or "Promote to Production").
3. **Validate Live Recovery:**
   - Verify `https://alnaker.vercel.app/ar` reconnects to `ep-soft-dawn-bdu5de43`.
   - Confirm site stability.

---

## 12. Post-Cutover Write Reconciliation Protocol (In Event of Rollback)

If writes occurred in `naqer_merged_staging` before rollback was triggered:
1. **Query New Orders:**
   ```sql
   SELECT * FROM "Order" WHERE "createdAt" > '2026-11-24T17:49:04Z';
   SELECT * FROM "OrderStore" WHERE "createdAt" > '2026-11-24T17:49:04Z';
   ```
2. **Query New Audit Logs:**
   ```sql
   SELECT * FROM "AuditLog" WHERE "createdAt" > '2026-11-24T17:49:04Z';
   ```
3. **Manual Insertion:** Copy any customer orders placed during the window into `ep-soft-dawn-bdu5de43` using the backup/dump payload to prevent data loss.
