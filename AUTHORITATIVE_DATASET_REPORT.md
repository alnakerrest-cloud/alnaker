# Naqer Menu — Authoritative Dataset Report
## Runtime Data Source Architecture, Reconciliation & Truth Precedence

**Date:** 2026-11-22  
**Status:** READ-ONLY AUDIT & COMPREHENSIVE RECONCILIATION COMPLETE  
**Classification:** VERIFIED & DOCUMENTED  

---

## 1. Runtime Data Source Architecture & Flow

The audit traced the exact execution paths across all application layers to understand how the 5 data sources interact at runtime:
1. **Neon PostgreSQL Cloud Database** (`ep-soft-dawn-bdu5de43-pooler...`)
2. **Verified Logical Backup** (`backups/backup-naqer-verified.json`)
3. **Canonical Static Menu Data** (`data/menu.ts`)
4. **Local Database Overlay** (`data/local-db-overlay.json`)
5. **Environment Variable Gate** (`USE_BACKUP_DATA`)

```mermaid
flowchart TD
    Env[USE_BACKUP_DATA env var]
    
    subgraph PublicSite["Public Site Runtime"]
        Req[User Request: /ar or /en] --> Page[app/[locale]/page.tsx]
        Page --> MenuEntry[lib/menu-db.ts: getMenuForLocale]
        Page --> SiteEntry[lib/site-db.ts: getSiteData]
    end

    Env -->|USE_BACKUP_DATA != 'false' DEFAULT| LocalFlow[Local Adapter Flow]
    Env -->|USE_BACKUP_DATA == 'false' PRODUCTION| NeonFlow[PostgreSQL Direct Flow]

    subgraph LocalFlow[Local Adapter Flow]
        MenuEntry --> BackupMenu[lib/backup-menu-db.ts: getBackupMenuForLocale]
        SiteEntry --> BackupSite[lib/backup-menu-db.ts: getBackupSiteData]
        BackupMenu --> Engine[lib/local-db-engine.ts]
        BackupSite --> Engine
        Engine --> BaseJSON[(backups/backup-naqer-verified.json<br/>151 Products, 18 Cats, 2 Branches)]
        Engine --> OverlayJSON[(data/local-db-overlay.json<br/>Overlays, Addons, Settings)]
        BackupMenu --> MenuTS[(data/menu.ts<br/>EN Translations Index)]
    end

    subgraph NeonFlow[PostgreSQL Direct Flow]
        MenuEntry --> PrismaDirect[lib/prisma.ts: PrismaClient via @prisma/adapter-pg]
        SiteEntry --> PrismaDirect
        PrismaDirect --> NeonDB[(Neon PostgreSQL Serverless<br/>Current State: 42 Products, 17 Cats, 1 Branch)]
    end

    subgraph AdminRuntime["Admin Dashboard Runtime"]
        AdminAction[Admin Panel / Server Actions] --> PrismaProxy[lib/prisma.ts: Proxy]
        PrismaProxy -->|useLocal == true| Engine
        PrismaProxy -->|useLocal == false| NeonDB
    end

    subgraph OrderFlow["Checkout & Orders Runtime"]
        Checkout[Customer Checkout API] --> OrderStore[lib/orders-store.ts: persistOrderToDb]
        OrderStore --> NeonDB
    end
```

### Exact Code Paths & Line References

#### A. Public Menu Rendering
- **Entry Point:** `app/[locale]/page.tsx` invokes `getMenuForLocale(locale)` located in `lib/menu-db.ts`.
- **Branching Condition (`lib/menu-db.ts#L67-L69`):**
  ```typescript
  if (process.env.USE_BACKUP_DATA !== "false") {
    return getBackupMenuForLocale(locale);
  }
  ```
- **When `USE_BACKUP_DATA !== "false"` (Active State in `.env.local:11`):**
  - Calls `getBackupMenuForLocale(locale)` in `lib/backup-menu-db.ts#L75-L336`.
  - Invokes `loadBackupData()` (`lib/backup-menu-db.ts#L18-L30`), which queries `getLocalDbEngine().getTables()` (`lib/local-db-engine.ts#L174-L178`).
  - `LocalDbEngine.init()` (`lib/local-db-engine.ts#L112-L172`) loads `backups/backup-naqer-verified.json` as the base table state and applies `data/local-db-overlay.json` (`created`, `updated`, `deleted`).
  - Slices categories and products, sourcing English labels and metadata by indexing `data/menu.ts` (`lib/backup-menu-db.ts#L40-L51`).
  - **Result:** Serves **all 151 products** and **18 categories** seamlessly to public visitors.
- **When `USE_BACKUP_DATA === "false"` (Direct Production Mode):**
  - Bypasses local files; queries Neon via `prisma.category.findMany(...)` (`lib/menu-db.ts#L72-L106`).
  - **Crucial Safety Gate (`lib/menu-db.ts#L214-L221`):** In this mode, if the database fails, it explicitly logs and **throws** the error to `app/[locale]/error.tsx`. It does **not** silently fall back to `data/menu.ts`.

#### B. Admin Dashboard & Mutations
- **Prisma Client Proxy (`lib/prisma.ts#L71-L101`):**
  - The exported `prisma` singleton is wrapped in an ES Proxy.
  - When `USE_BACKUP_DATA !== "false"`, all model calls (`prisma.product`, `prisma.category`, etc.) are intercepted (`lib/prisma.ts#L91-L94`) and delegated to `LocalDbEngine.getDelegate(model)`.
  - Mutations (`create`, `update`, `delete`) execute in memory, mutate `this.overlay`, and persist atomically via `this.saveOverlay()` to `data/local-db-overlay.json` (`lib/local-db-engine.ts#L102-L110`).
  - When `USE_BACKUP_DATA === "false"`, the proxy executes directly against Neon via `@prisma/adapter-pg` and `pg.Pool` (`lib/prisma.ts#L97-L99`).

#### C. Site Data & Branch Selection
- **Entry Point:** `getSiteData(locale)` in `lib/site-db.ts#L77-L134`.
- **Branching Condition (`lib/site-db.ts#L78-L81`):**
  - When `USE_BACKUP_DATA !== "false"`: Calls `getBackupSiteData(locale)` (`lib/backup-menu-db.ts#L310-L335`), reading the 2 authentic branches (`فرع جمصة`, `فرع دمياط الجديدة`) and restaurant settings from the backup and overlay.
  - When `USE_BACKUP_DATA === "false"`: Queries `prisma.branch.findMany({ where: { isActive: true } })` from Neon, which currently returns only the single test branch `shoeib`.

---

## 2. Dataset Reconciliation & Discrepancy Resolution

### A. Record Count Matrix Across Sources

| Entity / Table | Neon Database (Live) | Backup JSON (`backup-naqer-verified.json`) | Canonical TS (`data/menu.ts`) | Local Overlay (`local-db-overlay.json`) | Reconciled Authoritative Production Truth | Verification Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Categories** | 17 | 18 | 17 | 0 new | **17 Authoritative Categories** (excludes test category `سبانخ`) | **VERIFIED** |
| **Sections** | 26 | 27 | 26 | 0 new | **26 Authoritative Sections** (excludes test section for `سبانخ`) | **VERIFIED** |
| **Products** | 42 | 151 | 151 | 0 new | **151 Authoritative Products** | **VERIFIED** |
| **Variants** | 51 | 167 | 167 | 0 new | **167 Authoritative Variants** | **VERIFIED** |
| **ProductImage** | 0 | 151 | N/A | 0 | **151 Image Mappings** (14 Cloudinary + 137 local WebP) | **VERIFIED** |
| **OptionGroup** | 7 | 0 | N/A | 7 (overlaid) | **7 Option Groups** (Modifiers / Addons) | **VERIFIED** |
| **OptionItem** | 20 | 0 | N/A | 20 (overlaid) | **20 Option Items** | **VERIFIED** |
| **ProductOptionGroup** | 104 | 0 | N/A | 104 (overlaid) | **104 Product-to-Modifier Assignments** | **VERIFIED** |
| **Branches** | 1 (`shoeib`) | 2 (Gamasa, Damietta) | 2 (Gamasa, Damietta) | 1 updated (Gamasa) | **2 Authoritative Branches** (Gamasa & Damietta) | **VERIFIED** |
| **RestaurantSettings** | 1 (`default`) | 1 (`default`) | 1 (`ui.ar`) | 1 updated (`default`) | **1 Authoritative Settings Record** | **VERIFIED** |
| **AdminUser** | 2 | 2 | N/A | 0 | **Fresh Provisioning for Client** (Exclude old hashes) | **DOCUMENTED** |

---

### B. Detailed Discrepancy Resolutions

#### 1. Why Neon has 17 Categories while Backup has 18?
- **Finding:** A complete diff between `backup-naqer-verified.json` and Neon revealed exactly one extra category in the backup:
  - **Slug:** `cat-mw13741w`
  - **nameAr:** `سبانخ`
  - **id:** `cmw1374a7001m0svy6pq8l0xh`
  - **noteAr:** `سباااانخ`
  - **Associated Sections:** 1 section (`cmw1374e5001n0svyt8rnku96`)
  - **Associated Products:** **0 products** (completely empty).
- **Resolution:** `سبانخ` was a temporary QA test category created on `2026-11-03T17:34:42.031Z`. It is **not** present in `data/menu.ts` and is **not** present in Neon. 
- **Authoritative Decision:** The authoritative category count is **17**. `سبانخ` must be **excluded** from migration.

#### 2. Why Neon has 1 Branch while Backup has 2?
- **Finding:**
  - Neon contains a single record: `id: "cmwmi3amp000h4cvy2h30gxzz"`, `nameAr: "shoeib"`, `nameEn: "ibrahim shoeib"`, `addressAr: "جمصه"`, created during QA testing on `2026-11-18T17:14:47.569Z`.
  - The backup, `lib/site.ts`, and `data/local-db-overlay.json` contain the 2 authentic branches:
    1. `7fa2be20-67bd-4060-a83a-81ded2550018`: **فرع جمصة** (الطريق الدولي الساحلي، أمام جامعة الدلتا — هاتف وواتساب: `+201010814966`)
    2. `6d6528bd-dbd4-4672-aa5f-953063d3a36e`: **فرع دمياط الجديدة** (مول هادي الجديدة — هاتف وواتساب: `+201094965222`)
- **Resolution:** The single record in Neon is an uncleaned test artifact. 
- **Authoritative Decision:** The authoritative branch dataset consists of **2 branches** (Gamasa & Damietta).

#### 3. Why Neon has 42 Products while Backup has 151?
- **Finding:**
  - An exact category-by-category breakdown of products in Neon showed:
    - الصواني: 8 / 8
    - المندي: 8 / 8
    - المشويات: 12 / 12
    - الوجبات: 5 / 5
    - المأكولات البدوية: 7 / 7
    - الشرقي: 2 / 12
    - *All other 11 categories in Neon contain 0 products.*
  - Total in Neon = 8 + 8 + 12 + 5 + 7 + 2 = **42 products**.
  - All 42 products in Neon match the exact Arabic names of products in the backup.
  - The remaining 109 products in the backup cover the rest of `الشرقي` and all drinks, desserts, appetizers, and side dishes.
  - During early development, only the initial food categories were seeded to Neon; the team then enabled `USE_BACKUP_DATA=true` to serve the full 151 products from `backup-naqer-verified.json`.
- **Resolution:** The 42 products in Neon are an incomplete subset of the menu. 
- **Authoritative Decision:** The authoritative production dataset is the **complete 151 products**. Migrating only the 42 items in Neon would drop 72% of the restaurant's menu.

#### 4. Are all 151 products intended to be published?
- **Finding:** Every single product in `backup-naqer-verified.json` has `isVisible: true` and `isAvailable: true`. None are marked draft or hidden. `PRODUCT_IMAGE_MAPPING.csv` maps every single one of the 151 products.
- **Authoritative Decision:** **Yes**, all 151 products are active commercial offerings of Al-Naqer Restaurant.

---

## 3. Precedence Hierarchy of Datasets

When establishing the final migration truth, conflicts are resolved using the following strict hierarchy:

1. **Restaurant Content (Categories, Sections, Products, Variants):**
   - **Primary Source:** `backups/backup-naqer-verified.json` (filtered to remove test category `سبانخ`).
   - **Validation Source:** `data/menu.ts` (cross-checked for item counts and Arabic names).
   - **Precedence:** Backup JSON is authoritative for stable IDs, relations, and price pills; `data/menu.ts` is authoritative for bilingual text reconciliation.
2. **Product Modifiers & Add-ons (OptionGroup, OptionItem, ProductOptionGroup):**
   - **Primary Source:** `data/local-db-overlay.json` & Neon PostgreSQL (7 OptionGroups, 20 OptionItems, 104 ProductOptionGroups).
   - **Precedence:** Both sources match 100%. Authoritative and fully reconciled.
3. **Branches & Location Settings:**
   - **Primary Source:** `data/local-db-overlay.json` applied over `backups/backup-naqer-verified.json`.
   - **Precedence:** Gamasa (`7fa2be20-67bd-4060-a83a-81ded2550018`) and Damietta (`6d6528bd-dbd4-4672-aa5f-953063d3a36e`) are authoritative; Neon test record `shoeib` is discarded.
4. **Restaurant Settings:**
   - **Primary Source:** `data/local-db-overlay.json` (`brandNameAr: "قرية الناقر"`, `phoneDisplay: "01094965222"`, `deliveryFee: 30`, `currencyAr: "ج.م"`).
   - **Precedence:** Overlay values reflect the latest operational state and are authoritative.
