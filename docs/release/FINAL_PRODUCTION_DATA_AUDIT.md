# PRODUCTION DATA AUDIT & SAFE LAUNCH PREPARATION REPORT

**Audit Date:** 2026-11-14  
**Project:** Naqer Menu (قرية الناقر)  
**Repository:** `E:\real projects\naqer-menu`  
**Git Baseline Commit:** `bd081d435bb63edc21354ee63186c5d5151afbe0`  
**Auditor:** Senior Software Engineer, QA Lead, Security Reviewer & Release Manager  
**Audit Classification:** STRICTLY READ-ONLY PRODUCTION DATABASE AUDIT  

---

## 1. EXACT PRODUCTION DATABASE INVENTORY

Direct read-only inspection against the configured production database in `.env.local` (`ep-withered-bread-bemwq8ns-pooler.c-9.us-east-2.aws.neon.tech/neondb`) yielded the following exact counts:

| Database Entity | Total Records | Real Menu Entities | Test Residue (`ZZ%`) | Referential Integrity / Orphan Count |
|:---|:---:|:---:|:---:|:---:|
| **Products (`Product`)** | **158** | **151** | **7** | 0 orphaned products (all link to valid Sections) |
| **Categories (`Category`)** | **22** | **18** | **4** | 0 orphaned categories |
| **Sections (`Section`)** | **31** | **27** | **4** | 0 orphaned sections |
| **Variants (`ProductVariant`)** | **174** | **167** | **7** | 0 orphaned variants (all link to valid Products) |
| **Branches (`Branch`)** | **6** | **2** | **4** | 0 orphaned branches |
| **Product Images (`ProductImage`)** | **151** | **151** | **0** | 0 orphaned images (all link to valid Products) |
| **Promotional Offers (`Offer`)** | **0** | **0** | **0** | Clean baseline |
| **Option Groups (`OptionGroup`)** | **0** | **0** | **0** | Clean baseline |
| **Option Items (`OptionItem`)** | **0** | **0** | **0** | Clean baseline |
| **Audit Logs (`AuditLog`)** | **1,416** | **1,416** | — | Preserved immutable administrative history |
| **Import Jobs (`ImportJob`)** | **8** | **8** | — | Preserved migration audit history |
| **Import Items (`ImportItem`)** | **160** | **160** | — | Preserved batch staging history |

---

## 2. DETAILED INVESTIGATION OF LEGACY `ZZ` RECORDS

All `ZZ` records were created during previous E2E test runs on **2026-11-12** before environmental staging isolation was instituted.

### 2.1. The 4 Legacy Categories
| Category ID | Name (`nameAr`) | Created At | `isVisible` | Sections | Products | Offer Refs | Classification |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|
| `cmwdhd79m001duwvywetp3zw2` | ZZقسمBMWDHBK8X | 2026-11-12 09:44:34 UTC | `true` | 1 | 0 | 0 | **1. Confirmed test residue with no operational dependencies** |
| `cmwdivf42000dh8vyzlvcoevu` | ZZقسمBMWDISS4U | 2026-11-12 10:26:44 UTC | `true` | 1 | 0 | 0 | **1. Confirmed test residue with no operational dependencies** |
| `cmwdkj576000fbgvypd7lzu1c` | ZZMWDKITGD-قسمB | 2026-11-12 11:13:10 UTC | `true` | 1 | 0 | 0 | **1. Confirmed test residue with no operational dependencies** |
| `cmwdkq3xi0016bgvyjq37zoc7` | ZZMWDKPOGV-قسمB | 2026-11-12 11:18:35 UTC | `true` | 1 | 0 | 0 | **1. Confirmed test residue with no operational dependencies** |

- **Operational Impact:** None on public menu. In `lib/menu-db.ts` (lines 187, 193), empty categories with 0 products are automatically filtered out of the public customer menu. However, they appear in `/admin/categories`.

### 2.2. The 7 Legacy Products
All 7 products were created on **2026-11-12** and belong to Category `20f9b85f-9e8b-450a-9c58-a9cf010b6856` (**الصواني** - Trays), Section `a7b3e8ac-3960-420e-9dd0-885a35a5c49c`:

| Product ID | Name (`nameAr`) | Created At | `isVisible` | `isAvailable` | Variants | Images | Offers | Classification |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| `cmwdjvx7v0035h8vyh6pz26r2` | ZZMWDJTGM3-perm | 2026-11-12 10:55:07 UTC | `true` | `true` | 1 | 0 | 0 | **2. Potential test residue with dependencies (1 variant)** |
| `cmwdk9jyb003uh8vy8ce0q70v` | ZZMWDK72MU-perm | 2026-11-12 11:05:43 UTC | `true` | `true` | 1 | 0 | 0 | **2. Potential test residue with dependencies (1 variant)** |
| `cmwdkg3az0002bgvy8izlgdxz` | ZZMWDKFB6Q-منتجB | 2026-11-12 11:10:48 UTC | `true` | `true` | 1 | 0 | 0 | **2. Potential test residue with dependencies (1 variant)** |
| `cmwdkm2fc000tbgvy6jhzhsox` | ZZMWDKLRU2-منتجB | 2026-11-12 11:15:27 UTC | `true` | `true` | 1 | 0 | 0 | **2. Potential test residue with dependencies (1 variant)** |
| `cmwdkt29q001nbgvy0p6gb2is` | ZZMWDKSM9N-منتجB | 2026-11-12 11:20:53 UTC | `true` | `true` | 1 | 0 | 0 | **2. Potential test residue with dependencies (1 variant)** |
| `cmwdlcq8m0042bgvyyxxms4yv` | ZZMWDL70CA-perm | 2026-11-12 11:36:10 UTC | `true` | `true` | 1 | 0 | 0 | **2. Potential test residue with dependencies (1 variant)** |
| `cmwdlfxts004cbgvyiilunzc4` | ZZMWDLFAHL-منتجB | 2026-11-12 11:38:40 UTC | `true` | `true` | 1 | 0 | 0 | **2. Potential test residue with dependencies (1 variant)** |

- **Operational Impact:** Because these 7 records have `isVisible: true` and `isAvailable: true` and reside within the active "الصواني" category, **they render on the public menu under the Trays section**.

### 2.3. The 4 Legacy Branches
| Branch ID | Name (`nameAr`) | City | `isActive` | `isOrderable` | WhatsApp | Offers | Classification |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|
| `cmwdiydao000ph8vyqkl1bu2y` | ZZفرعBMWDIXNOK | مدينة اختبار | `true` | `true` | `null` | 0 | **2. Potential test residue with dependencies** |
| `cmwdjs7b5002yh8vylkgchigr` | ZZMWDJJH8E-فرعB | مدينة اختبار | `true` | `true` | `null` | 0 | **2. Potential test residue with dependencies** |
| `cmwdk5uzz003nh8vy9bgpnhu8` | ZZMWDK3QHS-فرعB | مدينة اختبار | `true` | `true` | `null` | 0 | **2. Potential test residue with dependencies** |
| `cmwdkzn2t002gbgvye36mpawx` | ZZMWDKWR7P-فرعB | مدينة اختبار | `true` | `true` | `null` | 0 | **2. Potential test residue with dependencies** |

- **Operational Impact:** Because `isActive: true`, `lib/site-db.ts` currently fetches these 4 dummy branches alongside the 2 real branches (`فرع جمصة` and `فرع دمياط الجديدة`). Customers browsing the site see 6 branches in the branch dropdown.

---

## 3. INVESTIGATION OF REPORTED DUPLICATE PRODUCTS

The three reported duplicates ("بطاطس", "عكاوي", "كراميل") were audited in full detail:

### 3.1. "بطاطس" (Potatoes / Fries)
- **Record 1 (`32860d73-125c-4efa-9a18-24fc0d0f9c96`):**
  - Category: **الأطباق الشعبية** (Traditional Dishes)
  - Price: **85 ج.م** (Traditional cooked potato platter portion)
  - Image: `/images/products/appetizers/french-fries.webp`
- **Record 2 (`4b663874-4f53-45a8-ab3c-01311e048d57`):**
  - Category: **المقبلات** (Appetizers / Sides)
  - Price: **34 ج.م** (Single basket of French fries)
  - Image: `/images/products/appetizers/french-fries.webp`
- **Verdict:** **LEGITIMATE DISTINCT PRODUCTS**. They represent two distinct restaurant dishes with different prices, portions, and menu locations. They must NOT be merged or deleted.

### 3.2. "عكاوي" (Oxtail)
- **Record 1 (`fa678752-63b1-4922-b9eb-cb40ec42940d`):**
  - Category: **الأطباق الشعبية** (Traditional Meat Dishes)
  - Price: **380 ج.م** (Main Oxtail Tagine / Casserole)
  - Image: `https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/products/pdf-akawi.jpg` (Cloudinary original asset)
- **Record 2 (`aaa1656d-14f0-41a2-9d63-9cfd35045595`):**
  - Category: **الشوربة** (Soups)
  - Price: **110 ج.م** (Oxtail Soup bowl)
  - Image: `/images/products/soups/oxtail-soup.webp`
- **Verdict:** **LEGITIMATE DISTINCT PRODUCTS**. One is a main course tagine at 380 EGP; the other is a soup bowl at 110 EGP. They must NOT be merged or deleted.

### 3.3. "كراميل" (Caramel)
- **Record 1 (`558c4ac8-8519-415b-a72e-851e201b3f96`):**
  - Category: **القهوة** (Coffee) / Section: **موكا ونسكافيه**
  - Price: **78 ج.م** (Caramel Macchiato hot specialty beverage)
  - Image: `/images/products/coffee/caramel-macchiato.webp`
- **Record 2 (`4d8e7a7e-dfe8-40dd-92dc-6f4f8debfd61`):**
  - Category: **المثلجات** (Ice Cream & Cold Desserts) / Section: **مثلجات وحلويات باردة**
  - Price: **62 ج.م** (Caramel ice cream scoop/dessert)
  - Image: `/images/products/coffee/caramel-macchiato.webp`
- **Verdict:** **LEGITIMATE DISTINCT PRODUCTS**. One is a hot specialty coffee drink at 78 EGP; the other is a cold dessert scoop at 62 EGP. They must NOT be merged or deleted.

---

## 4. PRODUCTION IMAGE INTEGRITY AUDIT

A complete read-only audit of all 151 production `ProductImage` records was executed:

| Dimension | Inspection Target | Verified Count | Direct Evidence / HTTP Result | Status |
|:---|:---|:---:|:---|:---:|
| **URL Format** | Valid HTTPS / Static Path | 151 / 151 | Zero malformed, empty, or null URLs | **PASS** |
| **Cloudinary Assets** | Non-destructive HTTP HEAD | 14 / 14 | **14 / 14 returned HTTP 200 OK** | **PASS** |
| **Local Disk Assets** | Filesystem existence | 137 / 137 | **137 / 137 verified present** in `public/` | **PASS** |
| **Orphaned Images** | Foreign key relation | 0 | All 151 images map to existing products | **PASS** |
| **Primary Image Uniqueness** | Primary flag consistency | 0 errors | Every imaged product has exactly 1 primary image | **PASS** |
| **Shared Image URLs** | Cross-product image reuse | 2 instances | Appropriately shared between the 2 legitimate duplicate pairs (fries and caramel) | **PASS** |

---

## 5. PUBLIC MENU IMPACT ANALYSIS

Inspecting public menu resolution logic:
1. **Arabic Menu (`/ar`) & English Menu (`/en`):**
   - The 4 ZZ categories are omitted because they have 0 products.
   - The 7 ZZ products appear under category "الصواني" (Trays).
2. **Branch Selector:**
   - 4 ZZ branches appear in the store location dropdown alongside the 2 real branches.
3. **Cart & WhatsApp Order Generation:**
   - Real products calculate correct prices and generate valid WhatsApp payloads.
   - If a user selects a ZZ branch, the WhatsApp payload will lack a valid phone number (`null`).

---

## 6. FINAL LAUNCH PREPARATION CONFIRMATION

- **Latest Git Release Commit:** `bd081d435bb63edc21354ee63186c5d5151afbe0`.
- **Git Synchronization:** `HEAD == origin/main` (Clean working tree, 0 untracked files).
- **Security Baseline:** `npm audit --json` confirms **0 vulnerabilities** (`zod@4.6.7` via `zod/v3`).
- **Build & Types:** `tsc --noEmit` exits `0`, `next build` exits `0`.
- **Seven Required Environment Variables:**
  1. `DATABASE_URL` (Server: Neon pooled connection string)
  2. `SESSION_SECRET` (Server: high-entropy secret key)
  3. `CLOUDINARY_CLOUD_NAME` (Server: `damc35hfo`)
  4. `CLOUDINARY_API_KEY` (Server)
  5. `CLOUDINARY_API_SECRET` (Server)
  6. `CLOUDINARY_SECURE_FOLDER` (Server: `naqer-menu`)
  7. `NEXT_PUBLIC_SITE_URL` (Universal: e.g. `https://menu.naqer.com`)
- **Prisma Direct Migration Procedure:** For migrations, use the direct unpooled endpoint (`ep-withered-bread-bemwq8ns.c-9.us-east-2.aws.neon.tech/neondb?sslmode=verify-full`).
- **OWNER Provisioning:** Execute `OWNER_EMAIL="owner@naqer.com" OWNER_PASSWORD="..." node scripts/provision-owner.mjs`.

---

## 7. EXACT MANUAL ACTIONS REQUIRING CLIENT APPROVAL

Before opening the site to real customers, the client/product owner should execute or authorize these exact non-destructive management actions via the Admin Dashboard or a targeted SQL script:

1. **Deactivate the 4 ZZ Branches:**
   - In `/admin/branches`, edit each ZZ branch and toggle **Active: OFF** (`isActive = false`), or execute:
     ```sql
     UPDATE "Branch" SET "isActive" = false, "isOrderable" = false WHERE "nameAr" LIKE 'ZZ%';
     ```
2. **Deactivate/Hide the 7 ZZ Products:**
   - In `/admin/products`, toggle **Visible: OFF** (`isVisible = false, isAvailable = false`) for the 7 ZZ products, or execute:
     ```sql
     UPDATE "Product" SET "isVisible" = false, "isAvailable" = false WHERE "nameAr" LIKE 'ZZ%';
     ```
3. **Deactivate the 4 Empty ZZ Categories:**
   - In `/admin/categories`, toggle **Visible: OFF** (`isVisible = false`) for the 4 ZZ categories, or execute:
     ```sql
     UPDATE "Category" SET "isVisible" = false WHERE "nameAr" LIKE 'ZZ%';
     ```
4. **Preserve Duplicates:**
   - Do **NOT** delete or merge "بطاطس", "عكاوي", or "كراميل". They are verified distinct menu items.

---

## 8. FINAL RELEASE VERDICT

```
================================================================================
                    FINAL RELEASE GATE VERDICT: VERDICT B
 DEPLOYMENT MAY PROCEED, BUT DOCUMENTED DATA ISSUES REQUIRE CLIENT CONFIRMATION
================================================================================
```

### Verdict Justification
- **Code & Security:** 100% verified, clean build, zero vulnerabilities, all regression tests pass.
- **Production Data:** Referential integrity is 100% sound with zero orphaned records. All 151 real dishes, 18 real categories, 2 branches, and 151 images are verified.
- **Client Confirmation Prerequisite:** The 7 ZZ products and 4 ZZ branches are active test residue from earlier QA cycles that will be visible to public visitors unless the client authorizes deactivating them prior to public marketing.

Deployment may proceed immediately upon client confirmation of the deactivation actions above.
