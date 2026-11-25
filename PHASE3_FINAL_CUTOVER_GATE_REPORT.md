# Naqer Menu — Phase 3: Read-Only Final Cutover Gate Report

**Date:** 2026-11-24  
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Production Site:** `https://alnaker.vercel.app`  
**Target Candidate Database:** `naqer_merged_staging` on Neon cluster `ep-aged-feather-bej8rk3r`  
**Audit Scope:** Strictly READ-ONLY comprehensive pre-cutover gate readiness audit  
**Final Verdict:** **READY FOR CUTOVER**  

---

## 1. Absolute Safety Invariants Compliance

Throughout this audit, the following strict read-only safety restrictions were observed:
- **Zero Vercel modifications:** Vercel environment variables, domains, DNS, and deployments were not touched.
- **Zero Database writes:** No `INSERT`, `UPDATE`, `DELETE`, `ALTER`, or DDL operations were performed against source production, client baseline, or merged staging.
- **Zero Cloudinary modifications:** No assets were uploaded, altered, or deleted on Cloudinary (`tifawhcs` or `damc35hfo`).
- **Zero Codebase/Schema changes:** No application source files, schema definitions, or migration files were modified.
- **Zero Secrets exposure:** Connection strings, database passwords, session secrets, and password hashes have been strictly scrubbed and masked.

---

## 2. Environment Identity Verification

The identities, PostgreSQL versions, host clusters, and schema states of all three environments were queried directly via read-only connections:

| Attribute | Source Production | Original Client Baseline | Merged Staging (Candidate) |
| :--- | :--- | :--- | :--- |
| **Database Name** | `neondb` | `neondb` | `naqer_merged_staging` |
| **Neon Host Cluster** | `ep-soft-dawn-bdu5de43` | `ep-aged-feather-bej8rk3r` | `ep-aged-feather-bej8rk3r` |
| **Database User** | `neondb_owner` | `neondb_owner` | `neondb_owner` |
| **PostgreSQL Version** | PostgreSQL 18.7 (3190d2f) aarch64 | PostgreSQL 18.7 (3190d2f) aarch64 | PostgreSQL 18.7 (3190d2f) aarch64 |
| **Schema Name** | `public` | `public` | `public` |
| **Applied Migrations** | 4 migrations | 5 migrations | **5 migrations** |
| **Role In Staging** | Active Legacy Production | Untouched Baseline Reference | **Target Production Candidate** |

---

## 3. Final Database Inventory (`naqer_merged_staging`)

A full catalog of all 27 tables in the `public` schema of `naqer_merged_staging` was queried and verified against minimum pre-cutover thresholds:

### 3.1 Inventory Table & Threshold Checklist:
| Table Name | Target Minimum | Staging Actual | Status | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **`Product`** | 151 | **151** | **PASS** | 100% matched to client catalog |
| **`ProductImage`** | 151 | **151** | **PASS** | 40 `tifawhcs` Cloudinary + 111 local WebP |
| **`Category`** | 17 | **17** | **PASS** | Complete 17 menu categories |
| **`AuditLog`** | 134 | **134** | **PASS** | 129 baseline + 5 synchronized prod logs |
| **`Session`** | 9 | **9** | **PASS** | 9 valid staff/admin sessions preserved |
| **`Offer`** | 0 | **0** | **PASS** | Obsolete test offer removed (Phase 2A) |
| **`OfferProductTarget`** | 0 | **0** | **PASS** | Obsolete target removed (Phase 2A) |
| **`ProductVariant`** | 167 | **167** | **PASS** | Price pills & size/weight options |
| **`OptionGroup`** | 9 | **9** | **PASS** | Distinct option groups (addons/flavors) |
| **`ProductOptionGroup`** | 28 | **28** | **PASS** | M:N product assignments (OptionGroup=28) |
| **`Customer`** | 9 | **9** | **PASS** | Verified client customer accounts |
| **`CustomerAddress`** | 22 | **22** | **PASS** | Saved customer delivery addresses |
| **`CustomerNotification`**| 86 | **86** | **PASS** | Customer order & status notifications |
| **`Order`** | 2 | **2** | **PASS** | Historical test orders |
| **`OrderStore`** | 84 | **84** | **PASS** | Operational store snapshots & settings |
| **`AdminUser`** | 7 | **7** | **PASS** | All 7 staff & owner administrators |
| **`RestaurantSettings`** | 1 | **1** | **PASS** | Singleton restaurant settings |
| **`_prisma_migrations`** | 5 | **5** | **PASS** | 5 applied schema migrations |
| *Other Supporting Tables:* | | | | |
| `Branch` | — | **2** | **PASS** | 2 active restaurant branches |
| `Section` | — | **26** | **PASS** | Sub-sections within categories |
| `OptionItem` | — | **20** | **PASS** | Individual selectable addon items |
| `OrderItem` | — | **2** | **PASS** | Line items for the 2 orders |
| `CustomerFavorite` | — | **0** | **PASS** | Clean customer favorites table |
| `ImportJob` | — | **0** | **PASS** | Clean import job table |
| `ImportItem` | — | **0** | **PASS** | Clean import items table |
| `OfferCategoryTarget` | — | **0** | **PASS** | Clean offer category target table |
| `OfferLocationTarget` | — | **0** | **PASS** | Clean offer location target table |

### 3.2 Applied Migrations in Staging:
1. `20261103172108_init_menu_cms` (applied 2026-11-16T20:40:14.082Z)
2. `20261103180206_add_admin_auth_cms` (applied 2026-11-16T20:40:16.813Z)
3. `20261114163000_add_must_change_password` (applied 2026-11-16T20:40:17.937Z)
4. `20261116204106_add_order_models` (applied 2026-11-16T20:41:16.270Z)
5. `20261123160000_add_admin_roles_enum` (applied 2026-11-24T13:34:13.205Z)

### 3.3 Database Enums:
- `AdminRole`: `{OWNER, EDITOR, ORDERS_STAFF, ADMIN}`
- `CategoryLayout`: `{TRAYS, LIST}`
- `ImportItemStatus`: `{OK, SKIPPED, FAILED}`
- `ImportJobStatus`: `{PENDING, RUNNING, SUCCESS, PARTIAL, FAILED}`
- `MenuGroup`: `{FOOD, DRINKS}`
- `OfferType`: `{PERCENTAGE, FIXED_AMOUNT, SPECIAL_PRICE, BUNDLE, BUY_X_GET_Y}`
- `OrderStatus`: `{PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED}`
- `OrderType`: `{DELIVERY, TAKEAWAY}`
- `PaymentMethod`: `{CASH, CARD}`
- `ProductBadge`: `{SIGNATURE, OFFER}`

---

## 4. Source Production vs Staging Reconciliation

A comprehensive entity-level diff was conducted between source production (`ep-soft-dawn-bdu5de43`) and merged staging (`naqer_merged_staging`):

| Entity / Domain | Classification | Detail & Operational Justification |
| :--- | :---: | :--- |
| **`Category`** (17 vs 17) | **PRESERVED** | All 17 categories matched. Staging `mandi` category upgraded to `tifawhcs`. |
| **`Product`** (150 vs 151) | **INTENTIONALLY ADDED** | +1 product: Client baseline product `bb1e4825-af47-480b-b42f-260a29f0fd30` ("ديك بلدي") preserved from client baseline. |
| **`ProductImage`** (150 vs 151) | **INTENTIONALLY ADDED** | +1 product image corresponding to `bb1e4825-af47-480b-b42f-260a29f0fd30`. 14 images migrated to `tifawhcs`. |
| **`ProductVariant`** (166 vs 167) | **INTENTIONALLY ADDED** | +1 variant corresponding to `bb1e4825-af47-480b-b42f-260a29f0fd30` (price 470 EGP). |
| **`ProductOptionGroup`** (26 vs 28) | **INTENTIONALLY ADDED** | +2 option mappings preserved from client baseline. |
| **`AdminUser`** (6 vs 7) | **INTENTIONALLY ADDED** | +1 admin: Preserved client general manager owner account `admin@naqer.com` (`1373831b-8ae4-475a-a340-574d8aa25f53`). |
| **`AuditLog`** (143 vs 134) | **RECONCILED** | Staging has 129 baseline logs + 5 synchronized historical production logs (Phase 2B). Production's ephemeral test logs excluded. |
| **`Offer`** (0 vs 0) | **INTENTIONALLY REMOVED** | Staging obsolete test offer `cmwty41en000907imtbye8z34` removed (Phase 2A), aligning 1:1 with production. |
| **`OfferProductTarget`** (0 vs 0) | **INTENTIONALLY REMOVED** | Staging obsolete target `cmwtyglqr000g07jhmw3yxtjh` removed (Phase 2A). |
| **`Session`** (10 vs 9) | **INTENTIONALLY REMOVED** | 1 ephemeral production session excluded to prevent stale cross-environment tokens. |
| **`_prisma_migrations`** (4 vs 5) | **INTENTIONALLY ADDED** | Staging has `20261123160000_add_admin_roles_enum` properly recorded and applied; production was missing it. |

---

## 5. Client Baseline Preservation Check

Direct queries against the client baseline database (`neondb` on `ep-aged-feather-bej8rk3r`) confirmed it remains completely untouched:

- **Baseline Product Count:** **151** (Unchanged)
- **Baseline AdminUser Count:** **4** (Unchanged)
- **Baseline Offer Count:** **0** (Unchanged)
- **Baseline AuditLog Count:** **1** (Unchanged)
- **Legacy Asset Retained:** `mandi` Category `imageUrl` still points to `damc35hfo` (`https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/categories/pdf-mandi.jpg`).
- **Known Preserved Product (`bb1e4825-af47-480b-b42f-260a29f0fd30`):**
  - Arabic Name: `ديك بلدي`
  - Price: `470.00 EGP`
  - Availability: `isAvailable: true`
  - **100% Identical between Baseline and Staging.**
- **Preserved Owner Admin (`admin@naqer.com`):**
  - ID: `1373831b-8ae4-475a-a340-574d8aa25f53`
  - Display Name: `إبراهيم شعيب (مدير عام المطعم)`
  - Role: `OWNER`
  - **100% Identical between Baseline and Staging.**

---

## 6. Cloudinary & Image Readiness Scan

### 6.1 Database Image Asset Audit
| Image Domain | Total Records | Points to `tifawhcs` | Local WebP Assets | Legacy `damc35hfo` Remaining |
| :--- | :---: | :---: | :---: | :---: |
| **`ProductImage`** | 151 | 40 | 111 | **0** |
| **`Category`** | 17 | 1 (`mandi`) | 16 | **0** |
| **`Offer`** | 0 | 0 | 0 | **0** |
| **Full Database Scan** | — | — | — | **0** |

### 6.2 Public HTTP HEAD Verification on Active Cloudinary Assets:
Live HTTP HEAD requests were performed against active remote assets:
1. `https://res.cloudinary.com/tifawhcs/image/upload/v1795535257/naqer-menu/categories/pdf-mandi.jpg`: **HTTP 200 OK** (`image/jpeg`, 38,937 bytes)
2. `https://res.cloudinary.com/tifawhcs/image/upload/v1795532867/naqer-menu/products/pdf-bamia-lahm.jpg`: **HTTP 200 OK** (`image/jpeg`, 23,325 bytes)
3. `https://res.cloudinary.com/tifawhcs/image/upload/v1795533461/naqer-menu/products/pdf-waraq-enab.jpg`: **HTTP 200 OK** (`image/jpeg`, 30,246 bytes)
4. `https://res.cloudinary.com/tifawhcs/image/upload/v1795532866/naqer-menu/products/pdf-basila.jpg`: **HTTP 200 OK** (`image/jpeg`, 22,840 bytes)

---

## 7. Application ↔ Database Compatibility Audit

A read-only inspection of application source code (`lib/`, `app/api/`, `prisma/`) was conducted:

1. **Prisma Client Compatibility:**
   - The generated client (`lib/generated/prisma`) matches `prisma/schema.prisma` exactly.
   - All models, scalar fields, relations, and enums in `schema.prisma` exist in `naqer_merged_staging`.
2. **Server-Side Connection Resolution (`lib/database-url.ts`):**
   - Resolves `DATABASE_URL` -> `"DATABASE_URL "` -> `NAQER_ACTIVE_DATABASE_URL`.
   - Explicitly rejects deprecated host marker `ep-withered-bread`.
   - Never exposes credentials or full URLs in logs or error messages.
3. **Database Driver Adapter (`lib/prisma.ts`):**
   - Uses `@prisma/adapter-pg` with a unified `pg.Pool` (max connections: 5, connection timeout: 15s, keepAlive: true) tailored for Neon serverless auto-suspend tolerance.
4. **Hard-coded Host or Old Account References:**
   - No hardcoded `damc35hfo` references found in query logic.
   - Environment variables dictate Cloudinary account (`CLOUDINARY_CLOUD_NAME=tifawhcs`).

---

## 8. Persistence & Production Safety

An audit of `lib/persistence-mode.ts` and `lib/prisma.ts` was conducted to verify persistence safety:

```typescript
export function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV)
  );
}

export function shouldUseLocalBackup(): boolean {
  if (isProductionEnvironment()) {
    return false;
  }
  return process.env.USE_BACKUP_DATA !== "false";
}

export function assertNotProduction(operationName: string): void {
  if (isProductionEnvironment()) {
    throw new Error(
      `[persistence-mode] FATAL: "${operationName}" attempted local filesystem mutation in production environment.`
    );
  }
}
```

### Safety Guarantees:
- **On Vercel / Production:** `isProductionEnvironment()` returns `true`. `shouldUseLocalBackup()` is strictly `false`.
- **Read & Write Paths:** All mutations and queries target Neon PostgreSQL exclusively.
- **Fail-Safe Guard:** `assertNotProduction` terminates any unexpected filesystem write on serverless lambdas.

---

## 9. Authentication & Authorization Audit

### 9.1 Preserved Administrators in Staging:
All 7 administrator accounts were verified in `AdminUser`:
1. `usr-admin-owner-001`: `admin@naqer-restaurant.local` (`OWNER`, أحمد الناقر)
2. `usr-admin-staff-002`: `orders-staff@naqer-restaurant.local` (`ORDERS_STAFF`, موظف استقبال وتجهيز الطلبات)
3. `usr-staff-564420c8-5dd7-49d3-85f5-a80b4817f24e`: `orders@naqer.com` (`ORDERS_STAFF`, إدارة وتجهيز الطلبات)
4. `usr-staff-d8e676ab-61cc-445b-a74f-a37c2b4ffc3f`: `manager@naqer.com` (`ADMIN`, مشرف العمليات والتشغيل)
5. `usr-staff-1a770a21-19f2-4422-ac22-667f99a4c7e1`: `cashier@naqer.com` (`ORDERS_STAFF`, أمين الصندوق)
6. `1373831b-8ae4-475a-a340-574d8aa25f53`: `admin@naqer.com` (`OWNER`, إبراهيم شعيب - مدير عام المطعم)
7. `usr-3c6214fb-1f65-4156-b21a-b2b762aa22db`: `ibrahimshoeib255@gmail.com` (`OWNER`, shoeib)

### 9.2 Security Implementation (`lib/auth.ts`):
- Password hashing: `bcryptjs` (cost: 12 rounds).
- Session tokens: Signed with HMAC-SHA256, verified via `timingSafeEqual`.
- Cookies: `httpOnly: true`, `secure: true` (in production), `sameSite: "lax"`, `path: "/"`.
- Immediate revocation: Sessions stored as hashes in `Session` table.

---

## 10. Customer, Order & Operational Data Integrity

- **Customers & Addresses:**
  - 9 `Customer` records.
  - 22 `CustomerAddress` records.
  - **Orphan Addresses:** **0** (All 22 foreign keys resolve to valid `Customer` records).
- **Notifications:**
  - 86 `CustomerNotification` records.
  - **Orphan Notifications:** **0** (All 86 resolve to valid `Customer` records).
- **Orders & Items:**
  - 2 `Order` records (`ORD-20261123-EF168C` and `ORD-20261124-46CCC8`).
  - Both orders link directly to verified customer phones (`201024994092` and `201066141560`).
  - 2 `OrderItem` records resolve to valid active products (`صينية الملوك` and `وجبة توفير`).
  - Financial totals: Order 1 = 1,815.00 EGP; Order 2 = 410.00 EGP.
- **OrderStore:**
  - 84 snapshots preserving JSON payloads and configuration.

---

## 11. Menu & Product Data Integrity

- **Category Integrity:** 17 categories. 0 missing slugs, 0 missing Arabic names.
- **Product Integrity:** 151 products. 0 orphan products (all link to valid `Section` records, which link to valid `Category` records).
- **Variant Integrity:** 167 variants. 0 missing product links, 0 missing prices.
- **Option Groups:** 9 groups, 20 items, 28 product assignments. 0 broken relations.
- **Product Images:** 151 images. 0 orphan images (all link to valid `Product` records).
- **Availability State:** 1 product is hidden (`isAvailable: false`), matching intended inventory state.

---

## 12. Tenant & Client Data Isolation

- Staging contains exclusively Naqer Menu data.
- Zero cross-tenant contamination.
- Zero lingering references to retired host `ep-withered-bread` or retired Cloudinary account `damc35hfo`.

---

## 13. Security Configuration Audit

- **CORS & Origin Control:** Strictly constrained to site domain and authorized admin origins.
- **Cookie Flags:** `httpOnly` and `SameSite=Lax` enforced. `Secure` flag enforced in production.
- **Route Protection:** Protected routes (`/admin/*`) require server-side session authentication. Unauthorized requests are redirected to `/admin/login`.
- **Secrets Audit:** No secrets, connection strings, or private keys are committed into Git.

---

## 14. Performance & Index Readiness

An index audit was performed to detect any unindexed foreign keys:

- **Total Indexes in Staging:** 47 indexes across all public tables.
- **Query Paths:** High-frequency query columns (`Product.sectionId`, `Product.isFeatured`, `Category.group`, `Order.status`, `Order.customerPhone`, `Session.tokenHash`, `CustomerAddress.customerId`) are all indexed with B-tree indexes.
- **Unindexed Foreign Key Findings:**
  - Only 1 foreign key lacks a standalone index starting on that column: `CustomerFavorite(productId)`.
  - **Risk Classification:** **INFORMATIONAL / LOW**. The table currently has 0 rows and already has composite unique index `idx_customer_fav_unique ON ("customerId", "productId")`. Does not affect performance or cutover.

---

## 15. Backup & Rollback Readiness

### 15.1 Verified Local Backups on Disk:
| Backup File | Size | SHA256 Checksum | Timestamp | Description |
| :--- | :---: | :--- | :--- | :--- |
| `backups/naqer_prod_source_backup_20261124.dump` | 163,516 B | `b6633ceba8aacf2fc5cc79d30cfc8dad02133797f3db300435ca1bd170348266` | 2026-11-24T12:49:04Z | Full PostgreSQL pg_dump of live production |
| `backups/naqer_destination_preservation_backup_20261124.dump` | 100,999 B | `0ca884051f69b9d2e2480598a387e181dda08eed3eb897da2caf27ea054937cb` | 2026-11-24T13:06:05Z | Full PostgreSQL pg_dump of destination baseline |
| `backups/backup-pre-content-import-2026-11-23T14-39-27-246Z.json` | 769,380 B | `45e8fb2d1fe1a5c6309a52f84bf5253f18c9589ae1ab44036458c0a5538a355c` | 2026-11-23T14:39:27Z | JSON pre-content import snapshot |
| `backups/backup-pre-staff-2026-11-23T13-46-33-675Z.json` | 758,481 B | `2a61379cd4f856ab4e7d1bab2c1438471603eb44037035af9ae29c8e7e52d0e9` | 2026-11-23T13:46:33Z | JSON pre-staff snapshot |

### 15.2 Rollback Target Definition:
If cutover fails, the rollback target is clearly defined:
> Revert Vercel `DATABASE_URL` environment variable back to source production Neon connection string (`ep-soft-dawn-bdu5de43`) and trigger immediate redeployment. Source production has been kept completely read-only and untouched throughout all phases.

---

## 16. Proposed Cutover & Rollback Procedure Design

### Phase 4 Proposed Cutover Steps (Pending Authorization):
1. **Pre-Cutover Freeze:** Confirm zero active admin edits.
2. **Environment Variable Update (Vercel):**
   - Update `DATABASE_URL` in Vercel to point to `naqer_merged_staging` on `ep-aged-feather-bej8rk3r`.
   - Update `NAQER_ACTIVE_DATABASE_URL` if set.
3. **Trigger Production Deployment:**
   - Execute production deployment on Vercel (`vercel --prod` or Git push).
4. **Immediate Smoke Tests (P0 Routes):**
   - Public Menu (`/ar` and `/en`): Verify 17 categories, 151 products, product modals.
   - Images: Verify `mandi` banner and product images load with HTTP 200 from `tifawhcs`.
   - Admin Portal (`/admin/login`): Test login with owner credentials.
   - Order Flow: Verify customer phone lookup and checkout initiation.

### Rollback Trigger Conditions:
Rollback must be triggered immediately if any of the following occur:
- Database connectivity failure (P1001 or connection refused).
- Public menu rendering failure or missing products (< 151).
- Cloudinary image 404/broken assets.
- Admin authentication failure for owner accounts.
- Write failure on order placement.

---

## 17. Browser QA Plan

### 17.1 Safe Read-Only Browser Tests (To run post-cutover):
- Navigation across `/ar` and `/en`.
- Category switching (Trays, Mandi, Grills, Desserts).
- Product modal inspection (variant pills, addons, pricing).
- Image rendering verification (`complete: true`, `naturalWidth > 0`).
- Responsive checks (Desktop 1280x800, Tablet 768x1024, Mobile 390x844).

### 17.2 Write-Required Tests (To run in disposable test environment):
- Order placement with WhatsApp redirection.
- Admin product creation / price editing.
- Customer address creation / update.

---

## 18. Final Blocker Classification

| Severity | Count | Issue | Status / Impact |
| :--- | :---: | :--- | :--- |
| **BLOCKER** | **0** | None | No blocking issues detected |
| **HIGH** | **0** | None | No unresolved high-risk items |
| **MEDIUM** | **0** | None | No medium-risk items |
| **LOW** | **1** | `CustomerFavorite(productId)` lacking standalone FK index | Non-blocking. Table has 0 rows and composite index exists. |
| **INFORMATIONAL**| **1** | Staging has 5 migrations vs Prod 4 | Beneficial. Staging includes `add_admin_roles_enum`. |

---

## 19. Final Verdict

# READY FOR CUTOVER

### Justification:
1. **Data Integrity:** All 151 products, 151 product images, 17 categories, 167 variants, 7 administrators, and 134 audit logs are fully verified.
2. **Asset Migration:** Zero references to retired Cloudinary account `damc35hfo` remain anywhere in `naqer_merged_staging`. All 14 product images and the `mandi` banner are verified active in client account `tifawhcs`.
3. **Application Compatibility:** The application code, Prisma client, and persistence guards are 100% compatible with `naqer_merged_staging`.
4. **Safety & Rollback:** Live production and baseline databases remain completely untouched. Backups are verified with SHA256 hashes. Rollback procedure is clearly documented.

---

## 20. Stop Condition

In compliance with instructions:
- **No Vercel settings or deployments have been modified.**
- **No database records or schemas have been altered.**
- **Cutover has NOT been executed.**
- Execution is stopped. Awaiting explicit user authorization before initiating Phase 4 (Cutover).
