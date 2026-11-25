# Migration Validation Report
**Target Database:** `naqer_merged_staging` on `ep-aged-feather-bej8rk3r.c-9.us-east-2.aws.neon.tech`  
**Test Suite:** `scratch/run-master-validation.mjs`  
**Execution Timestamp:** November 24, 2026 15:37:09 UTC  
**Validation Outcome:** **49 PASSED / 0 FAILED (100% SUCCESS)**

---

## 1. Table Verification (All 27 Core Tables)

| # | Table Name | Status | Expected Count | Actual Count | Schema Compliance |
|---|---|---|---|---|---|
| 1 | `AdminUser` | PASS | 7 | 7 | Exact Match |
| 2 | `AuditLog` | PASS | 129 | 129 | Exact Match |
| 3 | `Branch` | PASS | 2 | 2 | Exact Match |
| 4 | `Category` | PASS | 17 | 17 | Exact Match |
| 5 | `Customer` | PASS | 9 | 9 | Exact Match |
| 6 | `CustomerAddress` | PASS | 22 | 22 | Exact Match |
| 7 | `CustomerFavorite` | PASS | 0 | 0 | Exact Match |
| 8 | `CustomerNotification` | PASS | 86 | 86 | Exact Match |
| 9 | `ImportItem` | PASS | 0 | 0 | Exact Match |
| 10 | `ImportJob` | PASS | 0 | 0 | Exact Match |
| 11 | `Offer` | PASS | 1 | 1 | Exact Match |
| 12 | `OfferCategoryTarget` | PASS | 0 | 0 | Exact Match |
| 13 | `OfferLocationTarget` | PASS | 0 | 0 | Exact Match |
| 14 | `OfferProductTarget` | PASS | 1 | 1 | Exact Match |
| 15 | `OptionGroup` | PASS | 9 | 9 | Exact Match |
| 16 | `OptionItem` | PASS | 20 | 20 | Exact Match |
| 17 | `Order` | PASS | 2 | 2 | Exact Match |
| 18 | `OrderItem` | PASS | 2 | 2 | Exact Match |
| 19 | `OrderStore` | PASS | 84 | 84 | Exact Match |
| 20 | `Product` | PASS | 151 | 151 | Exact Match |
| 21 | `ProductImage` | PASS | 151 | 151 | Exact Match |
| 22 | `ProductOptionGroup` | PASS | 28 | 28 | Exact Match |
| 23 | `ProductVariant` | PASS | 167 | 167 | Exact Match |
| 24 | `RestaurantSettings` | PASS | 1 | 1 | Exact Match |
| 25 | `Section` | PASS | 26 | 26 | Exact Match |
| 26 | `Session` | PASS | 9 | 9 | Exact Match |
| 27 | `_prisma_migrations` | PASS | 5 | 5 | Exact Match |

---

## 2. Integrity & Relational Verification (Zero Orphan Records)

| Relation Checked | Parent Table | Child Table | Foreign Key Column | Orphan Count | Result |
|---|---|---|---|---|---|
| Products to Sections | `Section` | `Product` | `sectionId` | **0** | **PASS** |
| Sections to Categories | `Category` | `Section` | `categoryId` | **0** | **PASS** |
| Variants to Products | `Product` | `ProductVariant` | `productId` | **0** | **PASS** |
| Images to Products | `Product` | `ProductImage` | `productId` | **0** | **PASS** |
| Option Group Links | `OptionGroup` / `Product` | `ProductOptionGroup` | `groupId` / `productId` | **0** | **PASS** |
| Order Items to Orders | `Order` / `Product` | `OrderItem` | `orderId` / `productId` | **0** | **PASS** |
| Customer Addresses | `Customer` | `CustomerAddress` | `customerId` | **0** | **PASS** |
| Customer Notifications | `Customer` | `CustomerNotification` | `customerId` | **0** | **PASS** |
| Sessions to Admins | `AdminUser` | `Session` | `adminId` | **0** | **PASS** |

---

## 3. Preserved Asset & Cloudinary Verification

1. **Target Product:** `bb1e4825-af47-480b-b42f-260a29f0fd30` ("ديك بلدي")
   * **Database Price:** 470.00 EGP (Validated via `ProductVariant`).
   * **Database Option Groups:** Linked to `grp-bedouin-side` and `grp-naqer-sauces`.
2. **Cloudinary Asset Delivery:**
   * **URL:** `https://res.cloudinary.com/tifawhcs/image/upload/v1795527222/naqer-menu/products/baladi-rooster.webp`
   * **HTTP Method:** `HEAD`
   * **Response Code:** `200 OK`
   * **Cache-Control:** `public, max-age=31536000`
   * **Content-Type:** `image/webp`
   * **Result:** **PASS**

---

## 4. Administrative Accounts & Authentication Verification

All 7 administrative accounts verified present in `AdminUser`:
1. `admin@naqer.com` | Role: **OWNER** | Hash: `$2b$12$...` (Valid bcrypt) | MustChange: `false`
2. `ibrahimshoeib255@gmail.com` | Role: **OWNER** | Hash: `$2b$12$...` (Valid bcrypt) | MustChange: `false`
3. `admin@naqer-restaurant.local` | Role: **OWNER** | Hash: `$2b$12$...` (Valid bcrypt) | MustChange: `false`
4. `manager@naqer.com` | Role: **ADMIN** | Hash: `$2b$12$...` (Valid bcrypt) | MustChange: `false`
5. `cashier@naqer.com` | Role: **ORDERS_STAFF** | Hash: `$2b$12$...` (Valid bcrypt) | MustChange: `false`
6. `orders@naqer.com` | Role: **ORDERS_STAFF** | Hash: `$2b$12$...` (Valid bcrypt) | MustChange: `false`
7. `orders-staff@naqer-restaurant.local` | Role: **ORDERS_STAFF** | Hash: `$2b$12$...` (Valid bcrypt) | MustChange: `false`

* **RBAC Role Compatibility:** Verified compatible with `enum AdminRole` in `prisma/schema.prisma`.
* **Result:** **PASS**

---

## 5. Isolated CRUD Transaction Testing

To guarantee write capability and constraint validation without contaminating production data, isolated temporary records were created, verified, and cleaned up:

1. **Category & Section Creation:**
   * Inserted `test-val-cat-9999` ("تصنيف اختباري") and section `test-val-sec-9999`.
2. **Product Creation:**
   * Inserted `test-val-prod-9999` ("منتج اختباري معزول").
   * Readback: Verified `nameAr = 'منتج اختباري معزول'`.
3. **Product Mutation:**
   * Updated `nameAr` to `"منتج اختباري معدل"` and updated timestamp.
   * Readback: Verified update succeeded.
4. **Cascade Deletion:**
   * Deleted category, section, and product.
   * Readback: Verified `Product` count returned to exactly **151** and `Category` to **17**.
5. **Result:** **PASS**

---

## 6. Isolated Order Cycle Testing

1. **Order Creation:**
   * Inserted order `test-ord-val-9999` (`orderNumber: 'TEST-VAL-9999'`, type: `TAKEAWAY`, status: `PENDING`, payment: `CASH`, total: `100.00`).
   * Readback: Verified order retrieved with branch relation and customer phone.
2. **Order Deletion:**
   * Deleted test order.
   * Readback: Verified total `Order` count returned to exactly **2**.
3. **Result:** **PASS**

---

## 7. Persistence Mode & Local Storage Isolation

* **Production Engine:** Verified PostgreSQL database engine is active.
* **Local JSON Fallback:** Verified that `data/local-db-overlay.json` is **NOT** being used or written to by the database operations.
* **Prisma Migrations:** Verified all 5 migrations in `_prisma_migrations` match the repository migrations.
* **Result:** **PASS**
