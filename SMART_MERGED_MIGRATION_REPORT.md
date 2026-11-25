# Smart Merged Migration — Technical Execution Report
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Date:** November 24, 2026  
**Status:** **SUCCESSFULLY STAGED & VALIDATED IN ISOLATED TARGET**  
**Production Cutover Status:** **PENDING USER APPROVAL (NO VERCEL OR PROD CHANGES MADE)**

---

## 1. Executive Summary

In accordance with the instructions for **Option 1: Smart Merged Migration**, a strictly non-destructive, isolated staging migration was executed on the client's Neon cluster.

### Safety Guarantees Met:
* **Current Production Database (`ep-soft-dawn-bdu5de43`):** 100% untouched. No writes, migrations, or connections modified.
* **Original Destination Database (`ep-aged-feather-bej8rk3r/neondb`):** 100% preserved in its original state. No `DROP`, `TRUNCATE`, or schema modifications performed.
* **Vercel Production Environment:** Zero changes. `DATABASE_URL` remains pointed to current production.
* **Git Repository:** Working tree remains clean. No credentials, tokens, or dump files committed.

---

## 2. Target Database Provisioning (Isolated Migration Target)

Instead of overwriting the populated destination database `neondb`, a dedicated, isolated database was provisioned directly on the client's Neon cluster:

* **Host:** `ep-aged-feather-bej8rk3r.c-9.us-east-2.aws.neon.tech`
* **Cluster Region:** AWS `us-east-2` (Ohio)
* **Isolated Database Name:** `naqer_merged_staging`
* **Owner Role:** `neondb_owner`
* **Isolation Level:** Fully isolated database catalog within the PostgreSQL cluster. Does not share tables, schemas, or memory buffers with `neondb`.

---

## 3. Production Snapshot Restoration

* **Source Backup File:** `backups\naqer_prod_source_backup_20261124.dump`
* **File SHA256 Checksum:** `B6633CEBA8AACF2FC5CC79D30CFC8DAD02133797F3DB300435CA1BD170348266`
* **File Size:** 163,516 bytes (159.68 KB)
* **Restore Utility:** `pg_restore (PostgreSQL) 18.4`
* **Restore Outcome:** Completed with **Exit Code 0** (Zero errors).
* **Restored Baseline:** All 27 core production tables, 150 products, 150 Cloudinary images, 166 variants, 2 branches, 1 settings record, 9 customers, 22 addresses, 86 notifications, 2 orders, 2 order items, 84 order store events, 9 admin sessions, and 128 audit logs.

---

## 4. Unique Destination Data Merged

The unique records identified during the preservation audit were merged cleanly into `naqer_merged_staging`:

### A. Product: "ديك بلدي" (Baladi Rooster)
1. **Asset Verification & Cloudinary Upload:**
   * Original local asset: `public\images\products\bedouin\baladi-rooster.webp` (Verified existing, 47,820 bytes).
   * Uploaded to client Cloudinary account `tifawhcs` under secure folder `naqer-menu/products`.
   * **Assigned Public ID:** `naqer-menu/products/baladi-rooster`
   * **Verified Secure URL:** `https://res.cloudinary.com/tifawhcs/image/upload/v1795527222/naqer-menu/products/baladi-rooster.webp`
   * **HTTP Reachability:** Validated via HTTP HEAD request returning **HTTP 200 OK**.
2. **Product Record Merged:**
   * ID: `bb1e4825-af47-480b-b42f-260a29f0fd30`
   * Name: `ديك بلدي`
   * Description: `أرز أحمر أو مكرونة مبكبكة`
   * Section: `047773fe-36ae-475d-b57d-5729fc5f7d6a` (الأطباق البدوية)
   * Category: `trays` (صواني وقعدات بدوية)
   * Availability: `isAvailable: true`, `isVisible: true`
3. **Product Variant Merged:**
   * ID: `927ccbc4-56d2-4a79-8e36-3cf25c3d9dee`
   * Price: **470.00 EGP** (Fixed price, labelAr: null)
4. **Product Image Merged:**
   * ID: `img-local-93c87795558f024c`
   * URL: `https://res.cloudinary.com/tifawhcs/image/upload/v1795527222/naqer-menu/products/baladi-rooster.webp`
   * `isPrimary: true`, `sortOrder: 0`
5. **Product Option Groups Linked:**
   * Link 1: Group `grp-bedouin-side` (اختيار الطبق الجانبي)
   * Link 2: Group `grp-naqer-sauces` (إضافات وصوصات جانبية)

### B. Admin User: `admin@naqer.com`
* **Account Email:** `admin@naqer.com`
* **Assigned Role:** `OWNER`
* **Password Hash:** Migrated directly between database rows via parameterized query without console echoing.
* **Hash Type:** Verified valid bcrypt (`$2b$12$...`).
* **Active Status:** `isActive: true`, `mustChangePassword: false`
* **Production Owner Preservation:** `ibrahimshoeib255@gmail.com` and `admin@naqer-restaurant.local` remain active and preserved as co-owners.

### C. Historical Audit Event
* **Event ID:** `audit-authoritative-import-1795441536`
* **Action:** `IMPORT_AUTHORITATIVE_DATASET`
* **Summary:** `Imported authoritative menu dataset from CLIENT_DATABASE_IMPORT_DATASET.json`
* **Timestamp:** `2026-11-23 11:45:36.678 UTC` (Original timestamp preserved).

---

## 5. Prisma Migration Reconciliation

* **Baseline Migration Count:** 4 migrations from production dump.
* **Pending Migration in Repository:** `20261123160000_add_admin_roles_enum` (which adds `ADMIN` and `ORDERS_STAFF` to the `AdminRole` PostgreSQL enum).
* **Execution:** Applied cleanly using official CLI command:
  ```bash
  npx prisma migrate deploy
  ```
* **Result:** Migration `20261123160000_add_admin_roles_enum` applied and recorded in `_prisma_migrations` with zero errors.
* **Final Migration Count:** **5 migrations** applied and consistent with the repository codebase.

---

## 6. Migration Summary Matrix

| Metric | Source Production | Destination Baseline | Merged Isolated Target (`naqer_merged_staging`) |
|---|---|---|---|
| Total Tables | 27 | 22 | **27** |
| Products | 150 | 151 | **151** (150 real + ديك بلدي) |
| Product Variants | 166 | 167 | **167** |
| Product Images | 150 (Cloudinary) | 151 (Local WebP) | **151 (100% Cloudinary CDN)** |
| Product Option Groups | 26 | 30 | **28** |
| Admin Users | 6 | 4 | **7** (Preserved both owner accounts) |
| Audit Logs | 128 | 1 | **129** |
| Categories | 17 | 17 | **17** |
| Sections | 26 | 26 | **26** |
| Branches | 2 | 2 | **2** |
| Customers & Addresses | 9 / 22 | 0 / 0 | **9 / 22** |
| Customer Notifications | 86 | 0 | **86** |
| Orders & OrderItems | 2 / 2 | 0 / 0 | **2 / 2** |
| OrderStore Events | 84 | 0 | **84** |
| Prisma Migrations | 4 | 5 | **5** |

---

## 7. Next Steps

The isolated staging database is fully functional, validated, and ready for review. Proceed to inspect [MIGRATION_VALIDATION_REPORT.md](file:///e:/real%20projects/naqer-menu/MIGRATION_VALIDATION_REPORT.md) and [FINAL_CUTOVER_AND_ROLLBACK_PLAN.md](file:///e:/real%20projects/naqer-menu/FINAL_CUTOVER_AND_ROLLBACK_PLAN.md).
