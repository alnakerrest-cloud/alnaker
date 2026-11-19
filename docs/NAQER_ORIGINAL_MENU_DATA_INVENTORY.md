# NAQER MENU — ORIGINAL PRODUCTION MENU DATA INVENTORY & EXTRACTION REPORT

**Extraction Date:** 2026-11-18  
**Source of Truth:** `backups/backup-naqer-verified.json` (Timestamp: `2026-11-08T20:17:56.711Z`)  
**Cross-Referenced Manifests:** `product-inventory-data.json`, `data/menu.ts`, `public/images/products/`  
**Integrity Mode:** STRICT READ-ONLY (Zero database writes, zero synthetic records)  

---

## 1. EXECUTIVE RECONCILIATION SUMMARY

| Metric Dimension | Verified Count | Status | Notes |
|:---|:---:|:---:|:---|
| **Total Categories** | **18** | ✅ VERIFIED | 17 active categories + 1 empty historical category (`سبانخ`) |
| **Total Sections** | **27** | ✅ VERIFIED | Sub-groupings like بالوزن / أطباق مشوية / أوزان |
| **Total Products** | **151** | ✅ VERIFIED | 100% relational consistency, 0 orphaned items |
| **Total Product Variants** | **167** | ✅ VERIFIED | 167 price & weight definitions (all mapped to products) |
| **Total Product Image Records** | **151** | ✅ VERIFIED | Exactly 151 primary image records (1:1 with products) |
| **Cloudinary High-Res Images** | **14** | ✅ VERIFIED | 14 assets verified alive in Cloudinary (`HTTP 200 OK`) |
| **Local WebP Images on Disk** | **137** | ✅ VERIFIED | 137 physical `.webp` files verified present in `public/` |
| **Missing Image Files** | **0** | ✅ ZERO DEFECTS | Every single product image exists and resolves |
| **Broken Relational Foreign Keys**| **0** | ✅ ZERO DEFECTS | All Category, Section, Variant, and Image links intact |
| **Active Branches** | **2** | ✅ VERIFIED | Gamasa Branch & New Damietta Branch |
| **Restaurant Settings** | **1** | ✅ VERIFIED | Brand, VAT, service charge, contact numbers |

---

## 2. RESTAURANT SETTINGS & BRANCHES

### 2.1 Restaurant Settings (`RestaurantSettings`)
- **Brand Name (AR):** قرية الناقر
- **Tagline (AR):** أصالة المندي والمشويات والمأكولات البدوية
- **Phone Display:** `01094965222`
- **Phone International:** `+201094965222`
- **VAT Policy (AR):** الأسعار الموضحة تشمل ضريبة القيمة المضافة
- **Service Note (AR):** يتم إضافة خدمة 12٪ داخل القرية
- **Service Charge Percentage:** `12.00%`
- **Currency:** `ج.م`

### 2.2 Branches (`Branch`)

| Branch Name (AR / EN) | Address (AR / EN) | City | WhatsApp | Operating Hours | Status |
|:---|:---|:---|:---:|:---|:---:|
| **فرع جمصة**<br/>*Gamasa Branch* | الطريق الدولي الساحلي، أمام جامعة الدلتا<br/>*International Coastal Road, opposite Delta University* | جمصة، مصر | `+201094965222` | يومياً: ١٠:٠٠ ص – ١:٠٠ ص | Active |
| **فرع دمياط الجديدة**<br/>*New Damietta Branch* | مول هادي الجديدة<br/>*Hady Mall, New Damietta* | دمياط الجديدة، مصر | `+201094965222` | يومياً: ١١:٠٠ ص – ٢:٠٠ ص | Active |

---

## 3. ALL 18 CATEGORIES INVENTORY

| # | Category ID | Slug | Arabic Name | English Name | Group | Layout | Icon | Products | Sections |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|
| 1 | `cmw1374a7001m0svy6pq8l0xh` | `cat-mw13741w` | **سبانخ** |  | FOOD | LIST | 🍽️ | **0** | 1 |
| 2 | `20f9b85f-9e8b-450a-9c58-a9cf010b6856` | `trays` | **الصواني** | Family Trays | FOOD | TRAYS | 🍽️ | **8** | 1 |
| 3 | `cdba4eea-17a5-4cb6-a605-e183b8622a6e` | `mandi` | **المندي** | Mandi | FOOD | LIST | 🍚 | **8** | 1 |
| 4 | `0da7f2c7-97f9-499f-b7b2-96550628bb1a` | `grills` | **المشويات** | Grills | FOOD | LIST | 🔥 | **12** | 2 |
| 5 | `7797a335-0b64-4991-963d-e225bf45e100` | `meals` | **الوجبات** | Meals | FOOD | LIST | 🍱 | **5** | 1 |
| 6 | `d3c2878e-9026-4fbc-b311-61e3bb118e70` | `soups` | **الشوربة** | Soups | FOOD | LIST | 🍜 | **5** | 1 |
| 7 | `0f65d7c6-8b04-4d18-8f25-e9e96cebf781` | `starters` | **المقبلات** | Starters | FOOD | LIST | 🥗 | **10** | 1 |
| 8 | `06001b21-1c4e-421a-975d-3a12fc481a72` | `oriental` | **الشرقي** | Oriental | FOOD | LIST | 🥘 | **12** | 1 |
| 9 | `25a5ddcb-f41c-4fa3-ba1b-13a65d1cf3e9` | `iced` | **المثلجات** | Iced & Frozen | DRINKS | LIST | 🧊 | **11** | 2 |
| 10 | `a5148bfc-4bc2-4597-88fa-6b2aa290bf98` | `desserts` | **الحلويات** | Desserts | DRINKS | LIST | 🧇 | **7** | 1 |
| 11 | `eda019a4-0940-4ffb-a197-2b2d81a40e06` | `homestyle` | **الأطباق الشعبية** | Home-Style Dishes | FOOD | LIST | 🍛 | **12** | 1 |
| 12 | `e7b16f56-b9c0-4f8d-ad37-c38a01db1e7a` | `shakes` | **الميلك شيك والسموزي** | Milkshakes & Smoothies | DRINKS | LIST | 🥛 | **5** | 1 |
| 13 | `804a1e24-3683-4a62-8d4f-3e1c96e3d286` | `hot` | **المشروبات الساخنة** | Hot Drinks | DRINKS | LIST | 🍵 | **11** | 4 |
| 14 | `bd3cfef0-b404-4fcc-9d2c-4e8d5fbb77dd` | `soft` | **سوفت درينكز** | Soft Drinks | DRINKS | LIST | 💧 | **2** | 1 |
| 15 | `676ce120-5f56-45d8-8228-45dda93370e6` | `bedouin` | **المأكولات البدوية** | Bedouin Dishes | FOOD | LIST | 🏜️ | **7** | 3 |
| 16 | `745ac269-8cb9-42b0-8e9d-b286d2a82f30` | `cocktails` | **الكوكتيلات** | Cocktails | DRINKS | LIST | 🥤 | **14** | 1 |
| 17 | `8350be8b-2d4e-401b-b586-6b93b98cbd0a` | `juices` | **العصائر** | Fresh Juices | DRINKS | LIST | 🍹 | **10** | 1 |
| 18 | `d206b480-58d8-4fe4-b72a-d277929eb647` | `coffee` | **القهوة** | Coffee | DRINKS | LIST | ☕ | **12** | 3 |

---

## 4. COMPLETE PRODUCT CATALOG BY CATEGORY (151 PRODUCTS)

### 4.1 سبانخ (cat-mw13741w) — 0 أصناف
*Category ID: `cmw1374a7001m0svy6pq8l0xh` | Layout: `LIST` | Group: `FOOD`*

> *لا توجد منتجات مسجلة في هذا التصنيف.*

### 4.2 الصواني (Family Trays) — 8 أصناف
*Category ID: `20f9b85f-9e8b-450a-9c58-a9cf010b6856` | Layout: `TRAYS` | Group: `FOOD`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **صينية الوحوش**<br/>*The Beasts Tray*<br/><small>🥗 ٦ أرباع فراخ مندي، ½ ك ضاني مندي، ½ ك كفتة، ممبار، ورق عنب أو بطاطس، سمبوسة</small> | *Direct* | **1820.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-tray-alwohoush`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815469/naqer-menu/products/pdf-tray-alwohoush.jpg) | ✅ Cloud Asset (200 OK) |
| 2 | **صينية الملوك**<br/>*The Kings Tray*<br/><small>🥗 ٨ قطع ضاني مكرونة، ٢ موزة ضاني</small> | *Direct* | **2100.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-tray-almolok`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815468/naqer-menu/products/pdf-tray-almolok.jpg) | ✅ Cloud Asset (200 OK) |
| 3 | **صينية الصحاب**<br/>*The Friends Tray*<br/><small>🥗 ½ ك كفتة، ½ ك ريش، ½ ك شيش طاووق، بطاطس، ٢ فرد حمام محشي، سمبوسك</small> | *Direct* | **1950.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-tray-alsahab`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815466/naqer-menu/products/pdf-tray-alsahab.jpg) | ✅ Cloud Asset (200 OK) |
| 4 | **صينية العيلة**<br/>*The Family Tray*<br/><small>🥗 ½ ك ضاني مندي، ١ ك أرز بسمتي، ½ ك كفتة، ½ فرخة شيش، ممبار، ملوخية</small> | *Direct* | **1465.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-tray-alaila`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815465/naqer-menu/products/pdf-tray-alaila.jpg) | ✅ Cloud Asset (200 OK) |
| 5 | **صينية الحبايب**<br/>*The Loved Ones Tray*<br/><small>🥗 ٦ أرباع فراخ مندي، ½ ك كفتة، ممبار، محاشي، طرب</small> | *Direct* | **1570.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-tray-alhobaib`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815464/naqer-menu/products/pdf-tray-alhobaib.jpg) | ✅ Cloud Asset (200 OK) |
| 6 | **صينية مشاوي**<br/>*Mixed Grill Tray*<br/><small>🥗 ١ ك كفتة، ½ ك كباب، ½ ك كبدة، ½ ك شيش طاووق، ٤ حواوشي، ورق عنب</small> | *Direct* | **2440.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-tray-mashawi`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815462/naqer-menu/products/pdf-tray-mashawi.jpg) | ✅ Cloud Asset (200 OK) |
| 7 | **صينية العمدة**<br/>*The Mayor's Tray*<br/><small>🏷️ SIGNATURE</small><br/><small>🥗 ١ ك ضاني مندي، ½ ك أرز بسمتي، ½ ك كفتة، ½ ك شيش طاووق، كبدة مشوي، ممبار</small> | *Direct* | **2465.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-tray-alomda`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815471/naqer-menu/products/pdf-tray-alomda.jpg) | ✅ Cloud Asset (200 OK) |
| 8 | **صينية الحرب العالمية**<br/>*The World War Tray*<br/><small>🏷️ SIGNATURE</small><br/><small>🥗 ١ ك ضاني مندي، ٥ فرد حمام، ½ ك كفتة، ½ ك كبدة، ممبار، محاشي، ٢ ملوخية</small> | *Direct* | **3250.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-tray-alharb`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815470/naqer-menu/products/pdf-tray-alharb.jpg) | ✅ Cloud Asset (200 OK) |

### 4.3 المندي (Mandi) — 8 أصناف
*Category ID: `cdba4eea-17a5-4cb6-a605-e183b8622a6e` | Layout: `LIST` | Group: `FOOD`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **نفر لحم مندي (ضاني)**<br/>*Mandi Meat Portion (Lamb)* | *Direct* | **395.00** ج.م | **Local WebP**<br/>`/images/products/mandi/mandi-lamb.webp` | ✅ Disk File Exists |
| 2 | **نفر لحم مندي (كندوز)**<br/>*Mandi Meat Portion (Kandouz beef)* | *Direct* | **365.00** ج.م | **Local WebP**<br/>`/images/products/mandi/mandi-beef.webp` | ✅ Disk File Exists |
| 3 | **موزة ضاني مندي**<br/>*Lamb Shank Mandi* | *Direct* | **520.00** ج.م | **Local WebP**<br/>`/images/products/mandi/mandi-lamb-shank.webp` | ✅ Disk File Exists |
| 4 | **موزة بتلو مندي**<br/>*Veal Shank Mandi* | *Direct* | **470.00** ج.م | **Local WebP**<br/>`/images/products/mandi/mandi-veal-shank.webp` | ✅ Disk File Exists |
| 5 | **ضلع مندي (ضاني)**<br/>*Lamb Ribs Mandi* | *Direct* | **450.00** ج.م | **Local WebP**<br/>`/images/products/mandi/mandi-lamb-ribs.webp` | ✅ Disk File Exists |
| 6 | **وجبة دجاج مندي**<br/>*Chicken Mandi Meal* | *Direct* | **210.00** ج.م | **Local WebP**<br/>`/images/products/mandi/mandi-chicken.webp` | ✅ Disk File Exists |
| 7 | **أرز مندي سادة**<br/>*Plain Mandi Rice* | *Direct* | **75.00** ج.م | **Local WebP**<br/>`/images/products/mandi/mandi-rice-plain.webp` | ✅ Disk File Exists |
| 8 | **دقوس**<br/>*Daqoos (tomato-chili sauce)* | *Direct* | **16.00** ج.م | **Local WebP**<br/>`/images/products/mandi/daqoos-sauce.webp` | ✅ Disk File Exists |

### 4.4 المشويات (Grills) — 12 أصناف
*Category ID: `0da7f2c7-97f9-499f-b7b2-96550628bb1a` | Layout: `LIST` | Group: `FOOD`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **كباب (ضاني أو بتلو)**<br/>*Kebab (Lamb or Veal)* | `بالوزن` | ثلث كيلو: **395.00** ج.م<br/>نصف كيلو: **570.00** ج.م | **Local WebP**<br/>`/images/products/grills/kebab-skewers.webp` | ✅ Disk File Exists |
| 2 | **ميكس جريل**<br/>*Mix Grill*<br/><small>🏷️ SIGNATURE</small> | `أطباق مشوية` | **1150.00** ج.م | **Local WebP**<br/>`/images/products/grills/deluxe-mix-grill.webp` | ✅ Disk File Exists |
| 3 | **ريش (ضاني أو بتلو)**<br/>*Chops (Lamb or Veal)* | `بالوزن` | ثلث كيلو: **440.00** ج.م<br/>نصف كيلو: **640.00** ج.م | **Local WebP**<br/>`/images/products/grills/lamb-chops.webp` | ✅ Disk File Exists |
| 4 | **موزة ضاني مشوية**<br/>*Grilled Lamb Shank* | `أطباق مشوية` | **480.00** ج.م | **Local WebP**<br/>`/images/products/grills/grilled-lamb-shank.webp` | ✅ Disk File Exists |
| 5 | **فلتو**<br/>*Fillet* | `بالوزن` | ثلث كيلو: **375.00** ج.م<br/>نصف كيلو: **540.00** ج.م | **Local WebP**<br/>`/images/products/grills/filet-skewers.webp` | ✅ Disk File Exists |
| 6 | **ضلع (ضاني أو بتلو)**<br/>*Ribs (Lamb or Veal)* | `أطباق مشوية` | **440.00** ج.م | **Local WebP**<br/>`/images/products/grills/grilled-rib.webp` | ✅ Disk File Exists |
| 7 | **شيش طاووق**<br/>*Shish Tawook* | `بالوزن` | ثلث كيلو: **215.00** ج.م<br/>نصف كيلو: **320.00** ج.م | **Local WebP**<br/>`/images/products/grills/shish-tawook.webp` | ✅ Disk File Exists |
| 8 | **سجق مشوي**<br/>*Grilled Sausage* | `أطباق مشوية` | **255.00** ج.م | **Local WebP**<br/>`/images/products/grills/grilled-oriental-sausage.webp` | ✅ Disk File Exists |
| 9 | **طرب**<br/>*Tarb* | `بالوزن` | ثلث كيلو: **315.00** ج.م<br/>نصف كيلو: **450.00** ج.م | **Local WebP**<br/>`/images/products/grills/tarb.webp` | ✅ Disk File Exists |
| 10 | **وجبة نصف فرخة مشوية**<br/>*Half Grilled Chicken Meal* | `أطباق مشوية` | **210.00** ج.م | **Local WebP**<br/>`/images/products/grills/half-grilled-chicken.webp` | ✅ Disk File Exists |
| 11 | **كفتة**<br/>*Kofta* | `بالوزن` | ثلث كيلو: **305.00** ج.م<br/>نصف كيلو: **430.00** ج.م | **Local WebP**<br/>`/images/products/grills/kofta-skewers.webp` | ✅ Disk File Exists |
| 12 | **مشكل**<br/>*Mixed* | `بالوزن` | ثلث كيلو: **325.00** ج.م<br/>نصف كيلو: **470.00** ج.م | **Local WebP**<br/>`/images/products/grills/mixed-kebab-kofta.webp` | ✅ Disk File Exists |

### 4.5 الوجبات (Meals) — 5 أصناف
*Category ID: `7797a335-0b64-4991-963d-e225bf45e100` | Layout: `LIST` | Group: `FOOD`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **وجبة الأطفال**<br/>*Kids Meal* | *Direct* | ورك: **120.00** ج.م<br/>صدر: **140.00** ج.م | **Local WebP**<br/>`/images/products/meals/kids-meal.webp` | ✅ Disk File Exists |
| 2 | **وجبة توفير**<br/>*Saver Meal* | *Direct* | ورك: **190.00** ج.م<br/>صدر: **220.00** ج.م | **Local WebP**<br/>`/images/products/meals/saver-meal.webp` | ✅ Disk File Exists |
| 3 | **وجبة كفتة مشوية**<br/>*Grilled Kofta Meal* | *Direct* | **275.00** ج.م | **Local WebP**<br/>`/images/products/meals/kofta-meal.webp` | ✅ Disk File Exists |
| 4 | **وجبة شيش طاووق**<br/>*Shish Tawook Meal* | *Direct* | **265.00** ج.م | **Local WebP**<br/>`/images/products/meals/shish-tawook-meal.webp` | ✅ Disk File Exists |
| 5 | **وجبة الأكيل**<br/>*Al Akeel Meal* | *Direct* | **490.00** ج.م | **Local WebP**<br/>`/images/products/meals/el-akeel-feast.webp` | ✅ Disk File Exists |

### 4.6 الشوربة (Soups) — 5 أصناف
*Category ID: `d3c2878e-9026-4fbc-b311-61e3bb118e70` | Layout: `LIST` | Group: `FOOD`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **مغربي**<br/>*Moroccan Soup* | *Direct* | **45.00** ج.م | **Local WebP**<br/>`/images/products/soups/moroccan-harira.webp` | ✅ Disk File Exists |
| 2 | **كريمة**<br/>*Cream Soup* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/soups/cream-soup.webp` | ✅ Disk File Exists |
| 3 | **حمام**<br/>*Pigeon Soup* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/soups/pigeon-soup.webp` | ✅ Disk File Exists |
| 4 | **كوارع**<br/>*Trotters Soup* | *Direct* | **145.00** ج.م | **Local WebP**<br/>`/images/products/soups/trotters-soup.webp` | ✅ Disk File Exists |
| 5 | **عكاوي**<br/>*Okawi Soup* | *Direct* | **110.00** ج.م | **Local WebP**<br/>`/images/products/soups/oxtail-soup.webp` | ✅ Disk File Exists |

### 4.7 المقبلات (Starters) — 10 أصناف
*Category ID: `0f65d7c6-8b04-4d18-8f25-e9e96cebf781` | Layout: `LIST` | Group: `FOOD`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **سلطة خضراء**<br/>*Green Salad* | *Direct* | **18.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/green-salad.webp` | ✅ Disk File Exists |
| 2 | **تومية**<br/>*Toum (garlic sauce)* | *Direct* | **28.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/toum-garlic-dip.webp` | ✅ Disk File Exists |
| 3 | **طحينة**<br/>*Tahini* | *Direct* | **20.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/tahini-dip.webp` | ✅ Disk File Exists |
| 4 | **بابا غنوج**<br/>*Baba Ghanoush* | *Direct* | **20.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/baba-ghanoush.webp` | ✅ Disk File Exists |
| 5 | **جبنة قديمة**<br/>*Aged Cheese* | *Direct* | **16.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/mish-cheese.webp` | ✅ Disk File Exists |
| 6 | **كولسلو**<br/>*Coleslaw* | *Direct* | **28.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/coleslaw.webp` | ✅ Disk File Exists |
| 7 | **مسقعة**<br/>*Moussaka* | *Direct* | **20.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/moussaka-dip.webp` | ✅ Disk File Exists |
| 8 | **سلطة بلدي كبير**<br/>*Baladi Salad (large)* | *Direct* | **35.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/baladi-salad-large.webp` | ✅ Disk File Exists |
| 9 | **بطاطس**<br/>*French Fries* | *Direct* | **34.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/french-fries.webp` | ✅ Disk File Exists |
| 10 | **سلطة زبادي**<br/>*Yogurt Salad* | *Direct* | **28.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/cucumber-yogurt-salad.webp` | ✅ Disk File Exists |

### 4.8 الشرقي (Oriental) — 12 أصناف
*Category ID: `06001b21-1c4e-421a-975d-3a12fc481a72` | Layout: `LIST` | Group: `FOOD`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **موزة فتة (ضاني أو بتلو)**<br/>*Shank Fatta (Lamb or Veal)* | *Direct* | **530.00** ج.م | **Local WebP**<br/>`/images/products/oriental/shank-fatta.webp` | ✅ Disk File Exists |
| 2 | **ورقة لحمة**<br/>*Meat Warqa* | *Direct* | **390.00** ج.م | **Local WebP**<br/>`/images/products/oriental/waraet-lahma.webp` | ✅ Disk File Exists |
| 3 | **فتة كوارع**<br/>*Trotters Fatta* | *Direct* | **385.00** ج.م | **Local WebP**<br/>`/images/products/oriental/trotters-fatta.webp` | ✅ Disk File Exists |
| 4 | **طاجن سجق**<br/>*Sausage Tagine* | *Direct* | **265.00** ج.م | **Local WebP**<br/>`/images/products/oriental/sojok-tajine.webp` | ✅ Disk File Exists |
| 5 | **ورقة سجق**<br/>*Sausage Warqa* | *Direct* | **275.00** ج.م | **Local WebP**<br/>`/images/products/oriental/waraet-sojok.webp` | ✅ Disk File Exists |
| 6 | **فرد حمام محشي**<br/>*Stuffed Pigeon* | *Direct* | **190.00** ج.م | **Local WebP**<br/>`/images/products/oriental/stuffed-pigeon.webp` | ✅ Disk File Exists |
| 7 | **طبق محاشي ورق عنب**<br/>*Stuffed Vine Leaves Plate* | *Direct* | M: **95.00** ج.م<br/>L: **135.00** ج.م | **Local WebP**<br/>`/images/products/oriental/stuffed-vine-leaves.webp` | ✅ Disk File Exists |
| 8 | **ممبار**<br/>*Mombar (stuffed sausage)* | *Direct* | M: **95.00** ج.م<br/>L: **135.00** ج.م | **Local WebP**<br/>`/images/products/oriental/mombar.webp` | ✅ Disk File Exists |
| 9 | **طبق محاشي مشكل**<br/>*Mixed Mahshi Plate* | *Direct* | M: **95.00** ج.م<br/>L: **135.00** ج.م | **Local WebP**<br/>`/images/products/oriental/mixed-mahshi.webp` | ✅ Disk File Exists |
| 10 | **أرز أبيض**<br/>*White Rice* | *Direct* | **55.00** ج.م | **Local WebP**<br/>`/images/products/oriental/egyptian-white-rice.webp` | ✅ Disk File Exists |
| 11 | **كبد وكلاوي**<br/>*Liver & Kidneys* | *Direct* | **110.00** ج.م | **Local WebP**<br/>`/images/products/oriental/liver-kidneys.webp` | ✅ Disk File Exists |
| 12 | **سمبوسك (٨ قطع)**<br/>*Sambousek (8 pcs)* | *Direct* | **75.00** ج.م | **Local WebP**<br/>`/images/products/oriental/sambousak.webp` | ✅ Disk File Exists |

### 4.9 المثلجات (Iced & Frozen) — 11 أصناف
*Category ID: `25a5ddcb-f41c-4fa3-ba1b-13a65d1cf3e9` | Layout: `LIST` | Group: `DRINKS`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **آيس كوفي**<br/>*Iced Coffee* | `آيس` | **75.00** ج.م | **Local WebP**<br/>`/images/products/iced/iced-coffee.webp` | ✅ Disk File Exists |
| 2 | **طبق جيلي**<br/>*Jelly Cup* | `مثلجات وحلويات باردة` | **25.00** ج.م | **Local WebP**<br/>`/images/products/iced/jelly-bowl.webp` | ✅ Disk File Exists |
| 3 | **آيس اسبانش لاتيه**<br/>*Iced Spanish Latte* | `آيس` | **85.00** ج.م | **Local WebP**<br/>`/images/products/iced/iced-spanish-latte.webp` | ✅ Disk File Exists |
| 4 | **بولة ايس كريم**<br/>*Ice Cream Scoop* | `مثلجات وحلويات باردة` | **25.00** ج.م | **Local WebP**<br/>`/images/products/iced/ice-cream-scoops.webp` | ✅ Disk File Exists |
| 5 | **آيس موكا أو لاتيه أو كرمل**<br/>*Iced Mocha, Latte or Caramel* | `آيس` | **80.00** ج.م | **Local WebP**<br/>`/images/products/iced/iced-mocha-caramel.webp` | ✅ Disk File Exists |
| 6 | **كراميل**<br/>*Caramel* | `مثلجات وحلويات باردة` | **62.00** ج.م | **Local WebP**<br/>`/images/products/coffee/caramel-macchiato.webp` | ✅ Disk File Exists |
| 7 | **آيس شوكلت**<br/>*Iced Chocolate* | `آيس` | **75.00** ج.م | **Local WebP**<br/>`/images/products/iced/iced-chocolate.webp` | ✅ Disk File Exists |
| 8 | **فانيليا**<br/>*Vanilla* | `مثلجات وحلويات باردة` | **62.00** ج.م | **Local WebP**<br/>`/images/products/iced/vanilla-ice-drink.webp` | ✅ Disk File Exists |
| 9 | **شوكلت**<br/>*Chocolate* | `مثلجات وحلويات باردة` | **62.00** ج.م | **Local WebP**<br/>`/images/products/iced/chocolate-ice-drink.webp` | ✅ Disk File Exists |
| 10 | **نسكافيتشينو**<br/>*Nescafé-ccino* | `مثلجات وحلويات باردة` | **68.00** ج.م | **Local WebP**<br/>`/images/products/iced/nescafecino.webp` | ✅ Disk File Exists |
| 11 | **فرابتشينو**<br/>*Frappuccino* | `مثلجات وحلويات باردة` | **85.00** ج.م | **Local WebP**<br/>`/images/products/iced/frappuccino.webp` | ✅ Disk File Exists |

### 4.10 الحلويات (Desserts) — 7 أصناف
*Category ID: `a5148bfc-4bc2-4597-88fa-6b2aa290bf98` | Layout: `LIST` | Group: `DRINKS`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **ليمون + شاي زردة + كنافة**<br/>*Lemon + Zarda Tea + Kunafa*<br/><small>🏷️ OFFER</small> | *Direct* | **140.00** ج.م | **Local WebP**<br/>`/images/products/desserts/bedouin-tea-kunafa.webp` | ✅ Disk File Exists |
| 2 | **كنافة نابلسية**<br/>*Nabulsi Kunafa* | *Direct* | **60.00 – 95.00** ج.م | **Local WebP**<br/>`/images/products/desserts/nabulsi-kunafa.webp` | ✅ Disk File Exists |
| 3 | **وافل نوتيلا**<br/>*Nutella Waffle* | *Direct* | **120.00** ج.م | **Local WebP**<br/>`/images/products/desserts/nutella-waffle.webp` | ✅ Disk File Exists |
| 4 | **وافل شوكلت**<br/>*Chocolate Waffle* | *Direct* | **120.00** ج.م | **Local WebP**<br/>`/images/products/desserts/chocolate-waffle.webp` | ✅ Disk File Exists |
| 5 | **مولتن كيك**<br/>*Molten Cake* | *Direct* | **110.00** ج.م | **Local WebP**<br/>`/images/products/desserts/molten-cake.webp` | ✅ Disk File Exists |
| 6 | **ميني تارت**<br/>*Mini Tart* | *Direct* | **110.00** ج.م | **Local WebP**<br/>`/images/products/desserts/mini-tart.webp` | ✅ Disk File Exists |
| 7 | **بان كيك**<br/>*Pancakes* | *Direct* | **110.00** ج.م | **Local WebP**<br/>`/images/products/desserts/pancakes.webp` | ✅ Disk File Exists |

### 4.11 الأطباق الشعبية (Home-Style Dishes) — 12 أصناف
*Category ID: `eda019a4-0940-4ffb-a197-2b2d81a40e06` | Layout: `LIST` | Group: `FOOD`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **ملوخية**<br/>*Molokhia* | *Direct* | سادة: **60.00** ج.م<br/>لحمة: **140.00** ج.م | **Local WebP**<br/>`/images/products/homestyle/molokhia-tajine.webp` | ✅ Disk File Exists |
| 2 | **بامية**<br/>*Okra* | *Direct* | **65.00** ج.م | **Local WebP**<br/>`/images/products/homestyle/bamia-stew.webp` | ✅ Disk File Exists |
| 3 | **بامية باللحمة**<br/>*Okra with Meat* | *Direct* | **220.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-bamia-lahm`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815477/naqer-menu/products/pdf-bamia-lahm.jpg) | ✅ Cloud Asset (200 OK) |
| 4 | **خضار مشكل**<br/>*Mixed Vegetables* | *Direct* | **65.00** ج.م | **Local WebP**<br/>`/images/products/homestyle/torly-mixed-veg.webp` | ✅ Disk File Exists |
| 5 | **خضار مشكل باللحمة**<br/>*Mixed Vegetables with Meat* | *Direct* | **220.00** ج.م | **Local WebP**<br/>`/images/products/homestyle/torly-meat.webp` | ✅ Disk File Exists |
| 6 | **بطاطس**<br/>*Potatoes* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/appetizers/french-fries.webp` | ✅ Disk File Exists |
| 7 | **بطاطس بالفراخ**<br/>*Potatoes with Chicken* | *Direct* | **165.00** ج.م | **Local WebP**<br/>`/images/products/homestyle/potato-chicken-tajine.webp` | ✅ Disk File Exists |
| 8 | **بطاطس باللحم**<br/>*Potatoes with Meat* | *Direct* | **280.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-batatas-lahm`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815474/naqer-menu/products/pdf-batatas-lahm.jpg) | ✅ Cloud Asset (200 OK) |
| 9 | **عكاوي**<br/>*Okawi* | *Direct* | **380.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-akawi`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/products/pdf-akawi.jpg) | ✅ Cloud Asset (200 OK) |
| 10 | **ورق عنب بالكوارع**<br/>*Vine Leaves with Trotters* | *Direct* | **365.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-waraq-enab`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815476/naqer-menu/products/pdf-waraq-enab.jpg) | ✅ Cloud Asset (200 OK) |
| 11 | **البصلية باللحم الضاني**<br/>*Lamb Onion Stew (Basaliya)* | *Direct* | **360.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-basila`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815475/naqer-menu/products/pdf-basila.jpg) | ✅ Cloud Asset (200 OK) |
| 12 | **مخاصي**<br/>*Makhasi* | *Direct* | **330.00** ج.م | **Cloudinary**<br/>[`naqer-menu/products/pdf-makhashi`](https://res.cloudinary.com/damc35hfo/image/upload/v1793815472/naqer-menu/products/pdf-makhashi.jpg) | ✅ Cloud Asset (200 OK) |

### 4.12 الميلك شيك والسموزي (Milkshakes & Smoothies) — 5 أصناف
*Category ID: `e7b16f56-b9c0-4f8d-ad37-c38a01db1e7a` | Layout: `LIST` | Group: `DRINKS`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **ميلك شيك**<br/>*Milkshake* | *Direct* | **80.00** ج.م | **Local WebP**<br/>`/images/products/shakes/classic-milkshake.webp` | ✅ Disk File Exists |
| 2 | **ليمون / ليمون نعناع**<br/>*Lemon / Lemon Mint* | *Direct* | **70.00** ج.م | **Local WebP**<br/>`/images/products/shakes/lemon-mint-smoothie.webp` | ✅ Disk File Exists |
| 3 | **اوريو**<br/>*Oreo* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/shakes/oreo-shake.webp` | ✅ Disk File Exists |
| 4 | **فروت سلاط**<br/>*Fruit Salad* | *Direct* | **95.00** ج.م | **Local WebP**<br/>`/images/products/shakes/fruit-salad-bowl.webp` | ✅ Disk File Exists |
| 5 | **سموزي**<br/>*Smoothie* | *Direct* | **75.00** ج.م | **Local WebP**<br/>`/images/products/shakes/berry-smoothie.webp` | ✅ Disk File Exists |

### 4.13 المشروبات الساخنة (Hot Drinks) — 11 أصناف
*Category ID: `804a1e24-3683-4a62-8d4f-3e1c96e3d286` | Layout: `LIST` | Group: `DRINKS`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **شاي عادي**<br/>*Classic Tea* | `الشاي` | **30.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/black-tea.webp` | ✅ Disk File Exists |
| 2 | **نعناع - ينسون - كركديه - قرفة**<br/>*Mint / Anise / Hibiscus / Cinnamon* | `أعشاب وأخرى` | **25.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/herbal-infusion.webp` | ✅ Disk File Exists |
| 3 | **سحلب مكسرات**<br/>*Sahlab with Nuts* | `سحلب` | **72.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/sahlab-nuts.webp` | ✅ Disk File Exists |
| 4 | **هوت شوكلت**<br/>*Hot Chocolate* | `هوت` | **75.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/hot-chocolate.webp` | ✅ Disk File Exists |
| 5 | **شاي أخضر**<br/>*Green Tea* | `الشاي` | **30.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/green-tea.webp` | ✅ Disk File Exists |
| 6 | **كوكتيل أعشاب**<br/>*Herbal Cocktail* | `أعشاب وأخرى` | **46.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/herbal-cocktail.webp` | ✅ Disk File Exists |
| 7 | **سحلب فواكه**<br/>*Sahlab with Fruits* | `سحلب` | **75.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/sahlab-fruits.webp` | ✅ Disk File Exists |
| 8 | **هوت سيدر**<br/>*Hot Cider* | `هوت` | **75.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/hot-cider.webp` | ✅ Disk File Exists |
| 9 | **شاي أخضر نعناع**<br/>*Green Tea with Mint* | `الشاي` | **30.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/green-tea-mint.webp` | ✅ Disk File Exists |
| 10 | **أميركان كوفي**<br/>*American Coffee* | `أعشاب وأخرى` | **48.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/americano.webp` | ✅ Disk File Exists |
| 11 | **هوت الناقر**<br/>*Hot Al Naqer*<br/><small>🏷️ SIGNATURE</small> | `أعشاب وأخرى` | **54.00** ج.م | **Local WebP**<br/>`/images/products/hot-drinks/naqer-hot-special.webp` | ✅ Disk File Exists |

### 4.14 سوفت درينكز (Soft Drinks) — 2 أصناف
*Category ID: `bd3cfef0-b404-4fcc-9d2c-4e8d5fbb77dd` | Layout: `LIST` | Group: `DRINKS`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **مشروب غازي**<br/>*Soft Drink (local alternative brand)* | *Direct* | **36.00** ج.م | **Local WebP**<br/>`/images/products/soft/soft-drink-can.webp` | ✅ Disk File Exists |
| 2 | **مياه معدنية**<br/>*Mineral Water* | *Direct* | صغيرة: **12.00** ج.م<br/>كبيرة: **16.00** ج.م | **Local WebP**<br/>`/images/products/soft/mineral-water.webp` | ✅ Disk File Exists |

### 4.15 المأكولات البدوية (Bedouin Dishes) — 7 أصناف
*Category ID: `676ce120-5f56-45d8-8228-45dda93370e6` | Layout: `LIST` | Group: `FOOD`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **ضاني**<br/>*Lamb* | `٥٥٠ جم` | **530.00** ج.م | **Local WebP**<br/>`/images/products/bedouin/bedouin-lamb.webp` | ✅ Disk File Exists |
| 2 | **كبدة ضاني**<br/>*Lamb Liver* | `٦٠٠ جم` | **410.00** ج.م | **Local WebP**<br/>`/images/products/bedouin/lamb-liver.webp` | ✅ Disk File Exists |
| 3 | **تحميرة**<br/>*Tahmira* | *Direct* | **450.00** ج.م | **Local WebP**<br/>`/images/products/bedouin/tahmeera-meat.webp` | ✅ Disk File Exists |
| 4 | **شمبري**<br/>*Shambary* | `٥٥٠ جم` | **490.00** ج.م | **Local WebP**<br/>`/images/products/bedouin/bedouin-veal.webp` | ✅ Disk File Exists |
| 5 | **موزة ضاني**<br/>*Lamb Shank* | `٦٠٠ جم` | **530.00** ج.م | **Local WebP**<br/>`/images/products/bedouin/bedouin-lamb-shank.webp` | ✅ Disk File Exists |
| 6 | **طبق مبكبكة**<br/>*Mabkabka Side* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/bedouin/mbakbaka-pasta.webp` | ✅ Disk File Exists |
| 7 | **ديك بلدي**<br/>*Local Rooster (Deek Baladi)* | `٥٥٠ جم` | **470.00** ج.م | **Local WebP**<br/>`/images/products/bedouin/baladi-rooster.webp` | ✅ Disk File Exists |

### 4.16 الكوكتيلات (Cocktails) — 14 أصناف
*Category ID: `745ac269-8cb9-42b0-8e9d-b286d2a82f30` | Layout: `LIST` | Group: `DRINKS`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **كوكتيل الناقر**<br/>*Al Naqer Cocktail*<br/><small>🏷️ SIGNATURE</small> | *Direct* | **90.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/naqer-cocktail.webp` | ✅ Disk File Exists |
| 2 | **كوكيز ميكس**<br/>*Cookies Mix* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/cookies-mix.webp` | ✅ Disk File Exists |
| 3 | **بريز جولد**<br/>*Breeze Gold* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/gold-breeze.webp` | ✅ Disk File Exists |
| 4 | **مانجو نت**<br/>*Mango Nut* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/mango-nut.webp` | ✅ Disk File Exists |
| 5 | **ميكس بيري**<br/>*Mix Berry* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/mix-berry.webp` | ✅ Disk File Exists |
| 6 | **يوجرد فليب**<br/>*Yogurt Flip* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/yogurt-flip.webp` | ✅ Disk File Exists |
| 7 | **بينا كولادا**<br/>*Piña Colada* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/pina-colada.webp` | ✅ Disk File Exists |
| 8 | **ريد بانانا**<br/>*Red Banana* | *Direct* | **80.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/red-banana.webp` | ✅ Disk File Exists |
| 9 | **تروبيكال بليد**<br/>*Tropical Blend* | *Direct* | **75.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/tropical-blade.webp` | ✅ Disk File Exists |
| 10 | **فلوريدا**<br/>*Florida* | *Direct* | **75.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/florida.webp` | ✅ Disk File Exists |
| 11 | **تروبيكال**<br/>*Tropical* | *Direct* | **75.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/tropical.webp` | ✅ Disk File Exists |
| 12 | **هاواي**<br/>*Hawaii* | *Direct* | **70.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/hawaii.webp` | ✅ Disk File Exists |
| 13 | **صن شاين**<br/>*Sunshine* | *Direct* | **70.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/sunshine.webp` | ✅ Disk File Exists |
| 14 | **شيري كولا**<br/>*Cherry Cola* | *Direct* | **70.00** ج.م | **Local WebP**<br/>`/images/products/cocktails/cherry-cola.webp` | ✅ Disk File Exists |

### 4.17 العصائر (Fresh Juices) — 10 أصناف
*Category ID: `8350be8b-2d4e-401b-b586-6b93b98cbd0a` | Layout: `LIST` | Group: `DRINKS`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **مانجو**<br/>*Mango* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/juices/mango-juice.webp` | ✅ Disk File Exists |
| 2 | **فراولة**<br/>*Strawberry* | *Direct* | **80.00** ج.م | **Local WebP**<br/>`/images/products/juices/strawberry-juice.webp` | ✅ Disk File Exists |
| 3 | **برتقال**<br/>*Orange* | *Direct* | **75.00** ج.م | **Local WebP**<br/>`/images/products/juices/orange-juice.webp` | ✅ Disk File Exists |
| 4 | **بطيخ**<br/>*Watermelon* | *Direct* | **75.00** ج.م | **Local WebP**<br/>`/images/products/juices/watermelon-juice.webp` | ✅ Disk File Exists |
| 5 | **جوافة**<br/>*Guava* | *Direct* | **75.00** ج.م | **Local WebP**<br/>`/images/products/juices/guava-juice.webp` | ✅ Disk File Exists |
| 6 | **ليمون**<br/>*Lemon* | *Direct* | **50.00** ج.م | **Local WebP**<br/>`/images/products/juices/lemon-juice.webp` | ✅ Disk File Exists |
| 7 | **ليمون نعناع**<br/>*Lemon Mint* | *Direct* | **60.00** ج.م | **Local WebP**<br/>`/images/products/juices/lemon-mint.webp` | ✅ Disk File Exists |
| 8 | **موز باللبن**<br/>*Banana with Milk* | *Direct* | **85.00** ج.م | **Local WebP**<br/>`/images/products/juices/banana-milk.webp` | ✅ Disk File Exists |
| 9 | **كيوي باللبن**<br/>*Kiwi with Milk* | *Direct* | **95.00** ج.م | **Local WebP**<br/>`/images/products/juices/kiwi-milk.webp` | ✅ Disk File Exists |
| 10 | **عناب ساقع**<br/>*Iced Jujube (Unnab)* | *Direct* | **40.00** ج.م | **Local WebP**<br/>`/images/products/juices/iced-karkadeh.webp` | ✅ Disk File Exists |

### 4.18 القهوة (Coffee) — 12 أصناف
*Category ID: `d206b480-58d8-4fe4-b72a-d277929eb647` | Layout: `LIST` | Group: `DRINKS`*

| # | Product Name (AR / EN) | Section | Price / Variants | Image Source & Path | Verified Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **اسبرسو**<br/>*Espresso* | `اسبرسو` | سنجل: **40.00** ج.م<br/>دبل: **48.00** ج.م<br/>ميكاتو: **55.00** ج.م | **Local WebP**<br/>`/images/products/coffee/espresso.webp` | ✅ Disk File Exists |
| 2 | **موكا**<br/>*Mocha* | `موكا ونسكافيه` | **74.00** ج.م | **Local WebP**<br/>`/images/products/coffee/mocha.webp` | ✅ Disk File Exists |
| 3 | **تركي**<br/>*Turkish Coffee* | `قهوة` | **35.00** ج.م | **Local WebP**<br/>`/images/products/coffee/turkish-coffee.webp` | ✅ Disk File Exists |
| 4 | **اسبانش لاتيه**<br/>*Spanish Latte* | `اسبرسو` | **80.00** ج.م | **Local WebP**<br/>`/images/products/coffee/spanish-latte.webp` | ✅ Disk File Exists |
| 5 | **كراميل**<br/>*Caramel* | `موكا ونسكافيه` | **78.00** ج.م | **Local WebP**<br/>`/images/products/coffee/caramel-macchiato.webp` | ✅ Disk File Exists |
| 6 | **تركي دبل**<br/>*Double Turkish Coffee* | `قهوة` | **45.00** ج.م | **Local WebP**<br/>`/images/products/coffee/double-turkish.webp` | ✅ Disk File Exists |
| 7 | **كابتشينو أو لاتيه**<br/>*Cappuccino or Latte* | `اسبرسو` | **76.00** ج.م | **Local WebP**<br/>`/images/products/coffee/cappuccino-latte.webp` | ✅ Disk File Exists |
| 8 | **نسكافيه**<br/>*Nescafé* | `موكا ونسكافيه` | **74.00** ج.م | **Local WebP**<br/>`/images/products/coffee/nescafe-milk.webp` | ✅ Disk File Exists |
| 9 | **فرنساوي**<br/>*French Coffee* | `قهوة` | **50.00** ج.م | **Local WebP**<br/>`/images/products/coffee/french-coffee.webp` | ✅ Disk File Exists |
| 10 | **نسكافيه بلاك**<br/>*Nescafé Black* | `موكا ونسكافيه` | **64.00** ج.م | **Local WebP**<br/>`/images/products/coffee/nescafe-black.webp` | ✅ Disk File Exists |
| 11 | **بندق**<br/>*Hazelnut Coffee* | `قهوة` | **54.00** ج.م | **Local WebP**<br/>`/images/products/coffee/hazelnut-coffee.webp` | ✅ Disk File Exists |
| 12 | **كرمل**<br/>*Caramel Coffee* | `قهوة` | **50.00** ج.م | **Local WebP**<br/>`/images/products/coffee/caramel-coffee.webp` | ✅ Disk File Exists |

---

## 5. GENERATED REPORTS & EXPORT MANIFEST

The following complete, read-only UTF-8 CSV exports and Markdown reports have been successfully generated in the project workspace:

1. [NAQER_ORIGINAL_CATEGORIES.csv](file:///e:/real%20projects/naqer-menu/docs/NAQER_ORIGINAL_CATEGORIES.csv)
   - **Rows:** 18 categories
   - **Fields:** Category ID, Slug, Name AR, Name EN, Group, Layout, Icon, Sort Order, Products Count, Sections Count.
2. [NAQER_ORIGINAL_PRODUCTS.csv](file:///e:/real%20projects/naqer-menu/docs/NAQER_ORIGINAL_PRODUCTS.csv)
   - **Rows:** 151 products
   - **Fields:** Product ID, Name AR, Name EN, Category ID/Slug/Name, Section ID/Title, Descriptions, Ingredients, Badge, Variants Count, Min/Max Price, Formatted Variants, Primary Image URL, Image Source, Public ID, Physical Verification Status, Availability, Visibility.
3. [NAQER_ORIGINAL_IMAGES.csv](file:///e:/real%20projects/naqer-menu/docs/NAQER_ORIGINAL_IMAGES.csv)
   - **Rows:** 151 images
   - **Fields:** Image ID, Product ID, Product Name AR/EN, Category, Image URL, IsPrimary, Alt AR, Public ID, Image Source, Local Disk Path, Physical File Verification Status.
4. [NAQER_ORIGINAL_MENU_DATA_INVENTORY.md](file:///e:/real%20projects/naqer-menu/docs/NAQER_ORIGINAL_MENU_DATA_INVENTORY.md)
   - Comprehensive readable inventory with complete Markdown tables for all 151 products and full relational audit.

---

## 6. FINAL VALIDATION & VERDICT

> **FINAL RECONCILIATION RESULT: 100% VERIFIED & SOUND**
> 
> - **Products:** Exactly 151 products present.
> - **Categories:** Exactly 18 categories present (17 with products + 1 empty historical category).
> - **Variants:** Exactly 167 variants present.
> - **Images:** Exactly 151 primary images present.
> - **Physical Local Files:** 137 / 137 local `.webp` files physically verified on disk in `public/images/products/`.
> - **Cloudinary Assets:** 14 / 14 Cloudinary URLs verified alive with HTTP 200 OK.
> - **Missing Images:** 0.
> - **Broken Foreign Keys:** 0.
> - **Database Mutations:** 0 (Strict read-only adherence).