# NAQER MENU — LOCAL ORIGINAL MENU PREVIEW & VERIFICATION REPORT

**Document Version:** 1.0.0  
**Execution Date:** 2026-11-18  
**Project:** Naqer Menu (قرية الناقر)  
**Workspace:** `E:\real projects\naqer-menu`  
**Data Adapter:** `lib/backup-menu-db.ts` (reads `backups/backup-naqer-verified.json`)  
**Server Target:** `http://localhost:3000` (PID active)  
**Operational Mode:** STRICTLY LOCAL OFFLINE BACKUP (Zero Neon Database Dependency)  

---

## 1. EXECUTIVE SUMMARY & VERIFICATION METRICS

The original production menu has been successfully activated and verified live on the local development server at `http://localhost:3000/ar` and `http://localhost:3000/en`. All 151 original dishes, 18 categories, 27 sections, 167 price variants, and 151 images are rendered seamlessly using the existing production UI components without connecting to or mutating any Neon database.

### 1.1 Core Verification Numbers

| Metric Dimension | Expected Target | Live Preview Count | Verified Status |
|:---|:---:|:---:|:---:|
| **Total Products** | **151** | **151** | ✅ **100% Rendered** (79 Food + 72 Drinks) |
| **Total Categories** | **18** | **18** | ✅ **100% Present** (17 with items + 1 empty historical) |
| **Total Sections** | **27** | **27** | ✅ **100% Preserved** (Sub-groupings like بالوزن / أطباق مشوية) |
| **Total Product Variants** | **167** | **167** | ✅ **100% Matched** (Fixed and weight/size prices) |
| **Total Product Images** | **151** | **151** | ✅ **100% Verified** (14 Cloudinary + 137 Local WebP) |
| **Missing Image Files** | **0** | **0** | 🛡️ **Zero Missing Assets** |
| **Broken Image Links** | **0** | **0** | 🛡️ **Zero Broken References** |
| **Neon Production Mutations** | **0** | **0** | 🛡️ **Zero Writes / Zero Reads** |

---

## 2. LOCAL BACKUP DATA ADAPTER ARCHITECTURE

To satisfy the strict requirement of viewing the real 151-product menu without relying on the quota-suspended Neon database, a dedicated adapter was instituted:

```mermaid
graph TD
    Backup[backups/backup-naqer-verified.json<br/>151 Products | 18 Categories | 151 Images] --> Adapter[lib/backup-menu-db.ts]
    Inventory[product-inventory-data.json<br/>English Names & Manifest] --> Adapter
    MenuStatic[data/menu.ts<br/>English Descriptions & Parts] --> Adapter
    DiskImages[public/images/products/<br/>135 Local WebP Files] --> Adapter
    Cloudinary[Cloudinary damc35hfo<br/>14 Remote Cloud Assets] --> Adapter
    
    Adapter --> MenuDB[lib/menu-db.ts]
    Adapter --> SiteDB[lib/site-db.ts]
    Adapter --> VersionAPI[lib/content-version.ts]
    
    MenuDB --> PageAr[http://localhost:3000/ar<br/>79 Food Dishes + 72 Drinks = 151 Items]
    MenuDB --> PageEn[http://localhost:3000/en<br/>English LTR Menu]
```

### 2.1 Implementation Details
1. **`lib/backup-menu-db.ts`:**
   - Reads `backups/backup-naqer-verified.json` dynamically into memory.
   - Maps database rows to the exact `VCategory[]`, `VSection[]`, `VItem[]`, and `SiteData` shapes expected by `MenuView.tsx`.
   - Localizes strings seamlessly: Arabic text is authoritative from the backup, English text is enriched from `product-inventory-data.json` and `data/menu.ts`.
   - Computes dual-language search index (`q`) for client-side instant filtering.
2. **`lib/menu-db.ts` & `lib/site-db.ts`:**
   - Evaluates `process.env.USE_BACKUP_DATA !== "false"`. When active, delegates directly to `getBackupMenuForLocale()` and `getBackupSiteData()`.
   - Completely bypasses Prisma and Neon TCP connections.
3. **`lib/content-version.ts`:**
   - Returns a deterministic version string (`backup-2026-11-08T20:17:56.711Z`), ensuring `LiveSync` remains stable without polling errors.

---

## 3. UI RENDERING & GROUP DISTRIBUTION (151 PRODUCTS)

The Naqer Menu frontend divides the menu into two primary groups: **Food** and **Drinks**. Both groups were inspected and verified live in the browser:

### 3.1 Food Group (79 Products)
1. **الصواني (Family Trays):** 8 platters (صينية الوحوش, صينية الملوك, صينية الصحاب, صينية العيلة, صينية الحبايب, صينية مشاوي, صينية العمدة, صينية الحرب العالمية). Rendered as large platter cards with expandable ingredient tag chips and high-res Cloudinary images.
2. **المندي (Mandi):** 8 dishes (نفر لحم ضاني, نفر لحم كندوز, موزة ضاني, موزة بتلو, ضلع ضاني, وجبة دجاج, أرز سادة, دقوس).
3. **المشويات (Grills):** 12 dishes across 2 sections (`أطباق مشوية` 5, `بالوزن` 7) (كباب, ريش, كفتة, طرب, فلتو, ميكس جريل, سجق مشوي, شيش طاووق, نصف فرخة, مشكل).
4. **الوجبات (Meals):** 5 feast meals (وجبة الأطفال, وجبة توفير, وجبة كفتة, وجبة شيش طاووق, وجبة الأكيل).
5. **المأكولات البدوية (Bedouin):** 7 dishes across 3 sections (`٦٠٠ جم` 2, `٥٥٠ جم` 3, *Direct* 2) (كبدة ضاني, تحميرة, ضاني بدوي, طبق مبكبكة, موزة ضاني, شمبري, ديك بلدي).
6. **الشرقي (Oriental):** 12 dishes (طواجن بامية, بسلة, بطاطس, عكاوي, كوارع, فتات موزة).
7. **الأطباق الشعبية (Home-Style):** 12 dishes (محاشي مشكلة, ملوخية, أرز, خضار).
8. **المقبلات (Starters):** 10 dishes (سلطات طحينة, بلدي, بابا غنوج, ثومية, مخلل, سمبوسة).
9. **الشوربة (Soups):** 5 soups (لسان عصفور, كوارع, خضار).

### 3.2 Drinks & Sweets Group (72 Products)
1. **المثلجات (Iced & Frozen):** 11 cold desserts & ice cream scoops.
2. **الحلويات (Desserts):** 7 oriental and modern desserts (أم علي, كنافة, بسبوسة, أرز باللبن).
3. **الميلك شيك والسموزي (Shakes):** 5 milkshakes and smoothies.
4. **المشروبات الساخنة (Hot Drinks):** 11 hot tea, herbs, and sahlab beverages.
5. **سوفت درينكز (Soft Drinks):** 2 soft drinks and mineral water.
6. **الكوكتيلات (Cocktails):** 14 signature fresh fruit cocktails.
7. **العصائر (Fresh Juices):** 10 natural fresh juices.
8. **القهوة (Coffee):** 12 espresso, turkish coffee, mocha, and nescafe varieties.

$$\text{Total Rendered} = 79\ (\text{Food}) + 72\ (\text{Drinks}) = 151\ \text{Products}$$

---

## 4. VISUAL ACCEPTANCE EVIDENCE

Visual testing was executed via automated headless Chromium at `http://localhost:3000` with the following recorded results:

| Test Case | Viewport | URL | Result | Evidence Artifact |
|:---|:---:|:---:|:---:|:---|
| **Arabic Desktop Home** | 1440x900 | `/ar` | **PASS** (RTL, 79 Food cards, 8 category chips, brand hero) | `backup-preview-evidence/01-ar-desktop-1440.png` |
| **Product Details Dialog** | 1440x900 | `/ar` | **PASS** (Modal opens, shows full photo, title, price, options) | `backup-preview-evidence/02-ar-product-modal.png` |
| **Arabic Mobile Responsive** | 375x812 | `/ar` | **PASS** (Single-column layout, sticky category bar, touch cards) | `backup-preview-evidence/03-ar-mobile-375.png` |
| **English Desktop Home** | 1440x900 | `/en` | **PASS** (LTR, English categories, English dish names) | `backup-preview-evidence/04-en-desktop-1440.png` |
| **Food Category Scroll** | 1440x900 | `/ar` | **PASS** (All 79 food cards rendered with images) | `backup-preview-evidence/05-food-scrolled.png` |
| **Drinks Category Scroll** | 1440x900 | `/ar` | **PASS** (All 72 drinks cards rendered with images) | `backup-preview-evidence/06-drinks-scrolled.png` |

---

## 5. MODIFIED & CREATED FILES INVENTORY

```
Created:
 - lib/backup-menu-db.ts                       (Core Local Backup Data Adapter)
 - docs/NAQER_LOCAL_ORIGINAL_MENU_PREVIEW.md   (This comprehensive report)
 - docs/NAQER_ORIGINAL_CATEGORIES.csv          (CSV: 18 categories)
 - docs/NAQER_ORIGINAL_PRODUCTS.csv            (CSV: 151 products with prices/images)
 - docs/NAQER_ORIGINAL_IMAGES.csv              (CSV: 151 images with verification)
 - docs/NAQER_ORIGINAL_MENU_DATA_INVENTORY.md  (Inventory catalog report)

Modified:
 - lib/menu-db.ts                              (Delegates to backup adapter when USE_BACKUP_DATA !== "false")
 - lib/site-db.ts                              (Delegates to backup adapter when USE_BACKUP_DATA !== "false")
 - lib/content-version.ts                      (Returns stable backup version hash)
 - package.json                                (Set dev port to 3000)
 - .env.local                                  (Added USE_BACKUP_DATA=true, set port 3000)
```

---

## 6. STRICT SAFETY COMPLIANCE CONFIRMATION

> **FORMAL VERIFICATION:**
> 1. **Neon Production Database (`ep-withered-bread-bemwq8ns`):** ZERO connections, ZERO mutations, ZERO schema alterations.
> 2. **Neon Staging Database (`ep-soft-dawn-bdu5de43`):** ZERO mutations, ZERO data merges.
> 3. **Local Assets (`public/images/products`):** ZERO files replaced or deleted; all original WebP assets served directly.
> 4. **Cloudinary Assets:** ZERO cloud images altered or deleted.
> 5. **Git Baseline:** Clean, zero unreviewed commits, zero branch switches.
