# Naqer Menu — Final Migration Manifest
## Authoritative Records, Assets & Configuration Target

**Date:** 2026-11-22  
**Status:** RECONCILED & LOCKED  
**Classification:** VERIFIED & DOCUMENTED  

---

## 1. Table-by-Table Exact Migration Target

| Table | Target Records | Source of Data | Migration Action | Verification Status |
| :--- | :---: | :--- | :--- | :---: |
| `RestaurantSettings` | 1 | `data/local-db-overlay.json` | Insert singleton `default` (`قرية الناقر`, `01094965222`, delivery fee: 30) | **VERIFIED** |
| `Branch` | 2 | `data/local-db-overlay.json` + `backup-naqer-verified.json` | Insert Gamasa (`7fa2be20...`) & New Damietta (`6d6528bd...`) | **VERIFIED** |
| `Category` | 17 | `backup-naqer-verified.json` | Insert 17 authentic categories (excluding test `سبانخ`) | **VERIFIED** |
| `Section` | 26 | `backup-naqer-verified.json` | Insert 26 sections (excluding test section for `سبانخ`) | **VERIFIED** |
| `Product` | 151 | `backup-naqer-verified.json` | Insert all 151 products with stable IDs & attributes | **VERIFIED** |
| `ProductVariant` | 167 | `backup-naqer-verified.json` | Insert 167 price variants (single, sizes, weights, portions) | **VERIFIED** |
| `ProductImage` | 151 | `PRODUCT_IMAGE_MAPPING.csv` | Insert 151 image records (14 Cloudinary URLs + 137 local WebP) | **VERIFIED** |
| `OptionGroup` | 7 | Neon DB / `local-db-overlay.json` | Insert 7 modifier groups (حجم المندي، الحجم، نوع الصينية...) | **VERIFIED** |
| `OptionItem` | 20 | Neon DB / `local-db-overlay.json` | Insert 20 modifier items with prices & sort orders | **VERIFIED** |
| `ProductOptionGroup` | 104 | Neon DB | Insert 104 product-to-modifier relational bindings | **VERIFIED** |
| `AdminUser` | 1 | Fresh Client Input | Provision 1 fresh client `OWNER` account via `scripts/provision-owner.mjs` | **DOCUMENTED** |
| `Session` | 0 | Fresh Environment | Start with 0 sessions (no session leaks) | **DOCUMENTED** |
| `Customer` | 0 | Fresh Environment | Start clean (discard developer test customers) | **DOCUMENTED** |
| `CustomerAddress` | 0 | Fresh Environment | Start clean | **DOCUMENTED** |
| `CustomerNotification`| 0 | Fresh Environment | Start clean | **DOCUMENTED** |
| `OrderStore` | 0 | Fresh Environment | Start clean (discard developer test orders) | **DOCUMENTED** |
| `Offer` | 0 | Fresh Environment | Schema ready, zero active rows | **DOCUMENTED** |
| `AuditLog` | 1 | Migration Runner | Initial audit log entry recording migration event | **DOCUMENTED** |
| `_prisma_migrations` | 4 | Repository Migrations | Insert migration baselines for Prisma schema sync | **VERIFIED** |

---

## 2. Cloudinary Asset Manifest

### A. Signature Heritage Dishes (To copy to Client Cloudinary)
1. `naqer-menu/products/pdf-tray-alwohoush.jpg` (صينية الوحوش)
2. `naqer-menu/products/pdf-tray-almolok.jpg` (صينية الملوك)
3. `naqer-menu/products/pdf-tray-alsahab.jpg` (صينية الصحاب)
4. `naqer-menu/products/pdf-tray-alaila.jpg` (صينية العيلة)
5. `naqer-menu/products/pdf-tray-alhobaib.jpg` (صينية الحبايب)
6. `naqer-menu/products/pdf-tray-mashawi.jpg` (صينية مشاوي)
7. `naqer-menu/products/pdf-tray-alomda.jpg` (صينية العمدة)
8. `naqer-menu/products/pdf-tray-alharb.jpg` (صينية الحرب العالمية)
9. `naqer-menu/products/pdf-tajin-akkawi.jpg` (طاجن عكاوي)
10. `naqer-menu/products/pdf-macaroni-bechamel.jpg` (مكرونة بشاميل)
11. `naqer-menu/products/pdf-macaroni-sausage.jpg` (مكرونة سجق)
12. `naqer-menu/products/pdf-mbakbaka-meat.jpg` (مبكبكة باللحمة)
13. `naqer-menu/products/pdf-mahshi-moshakal.jpg` (محشي مشكل)
14. `naqer-menu/products/pdf-waraq-enab.jpg` (ورق عنب بالكوارع — *from local file `pdf-images/upload/pdf-waraq-enab.jpg`*)

### B. Promotional Offers Folder
- 22 promotional banner assets under `naqer-menu/offers/*`.

---

## 3. Authoritative Branches Configuration

### Branch 1: فرع جمصة (Gamasa Branch)
- **ID:** `7fa2be20-67bd-4060-a83a-81ded2550018`
- **Name (AR):** فرع جمصة
- **Name (EN):** Gamasa Branch
- **Address (AR):** الطريق الدولي الساحلي، أمام جامعة الدلتا
- **City:** جمصة، مصر
- **Phone / WhatsApp:** `+201010814966`
- **Working Hours:** يومياً: ١٠:٠٠ ص – ١:٠٠ ص
- **Status:** Active & Orderable (`isActive: true`, `isOrderable: true`)

### Branch 2: فرع دمياط الجديدة (New Damietta Branch)
- **ID:** `6d6528bd-dbd4-4672-aa5f-953063d3a36e`
- **Name (AR):** فرع دمياط الجديدة
- **Name (EN):** New Damietta Branch
- **Address (AR):** مول هادي الجديدة
- **City:** دمياط الجديدة، مصر
- **Phone / WhatsApp:** `+201094965222`
- **Working Hours:** يومياً: ١١:٠٠ ص – ٢:٠٠ ص
- **Status:** Active & Orderable (`isActive: true`, `isOrderable: true`)

---

## 4. Environment Variables Checklist for Client Vercel

```env
# Database Connection (Client PostgreSQL Instance)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require

# Administrative Session Encryption Key (Generate freshly with: openssl rand -hex 32)
SESSION_SECRET=GENERATE_NEW_RANDOM_SECRET_KEY_FOR_CLIENT

# Cloudinary Storage Credentials (Client Account)
CLOUDINARY_CLOUD_NAME=client_cloud_name
CLOUDINARY_API_KEY=client_api_key
CLOUDINARY_API_SECRET=client_api_secret
CLOUDINARY_SECURE_FOLDER=naqer-menu

# Client Public URL
NEXT_PUBLIC_SITE_URL=https://client-production-domain.vercel.app

# Database Authority Gate (MUST BE SET TO "false" IN PRODUCTION)
USE_BACKUP_DATA=false
```
