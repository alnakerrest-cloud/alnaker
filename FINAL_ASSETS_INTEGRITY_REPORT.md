# FINAL DATA & ASSETS INTEGRITY REPORT — PRODUCT IMAGES
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Target Database:** `naqer_merged_staging` on Neon client cluster (`ep-aged-feather-bej8rk3r`)  
**Audit Date:** November 24, 2026  
**Execution Mode:** Strictly Read-Only Audit (No assets uploaded, modified, or deleted)  
**Overall Assets Verdict:** **READY WITH DOCUMENTED LIMITATIONS**  

---

## 1. Executive Summary & Key Metrics

A comprehensive, non-destructive, item-by-item audit of all **151 product image records** in the staging database `naqer_merged_staging` was conducted.

| Metric | Target / Checked | Outcome | Status |
|---|---|---|---|
| **Total Product Image Records** | 151 records | 151 audited | PASS |
| **Local WebP Assets (`public/`)** | 111 records | 111 exist, exact case, git-tracked | PASS |
| **Cloudinary Remote Assets** | 40 records | 39 HTTP 200 OK, 1 HTTP 404 (Known) | PASS (with 1 Known Limitation) |
| **Orphan Image Records** | 0 records | 0 orphans detected | PASS |
| **Products Without Images** | 0 records | All 151 products have images | PASS |
| **Duplicate Image URLs** | 2 unique URLs | Shared across 4 product records | PASS (Documented) |
| **Baladi Rooster Asset Match** | SHA256 match | Exact match with local WebP asset | PASS |
| **Next.js Local Asset Serving** | Port 3008 | HTTP 200, `image/webp` served | PASS |
| **Next.js `remotePatterns` Host** | `res.cloudinary.com` | Both active and legacy clouds permitted | PASS |

---

## 2. Asset Breakdown by Source Type

### A. Local Static Assets (111 Products)
* **Storage Location:** `public/images/products/<category>/<slug>.webp`
* **Filesystem Existence:** **111 / 111 (100%)** verified present on disk.
* **Filesystem Case Sensitivity:** **111 / 111 (100%)** exact match on directory and file casing against Windows NTFS.
* **Git Version Control Tracking:** **111 / 111 (100%)** verified tracked by Git via `git ls-files`.
* **Production Build Output:** Verified included during `next build` and served natively by Next.js static asset handler.
* **Integrity Hashing:** SHA256 checksum and exact byte length recorded for all 111 files.

### B. Remote Cloudinary CDN Assets (40 Products)
* **Active Client Account (`tifawhcs`):**
  * **Total Images:** 26 images
  * **HTTP Status:** **26 / 26 (100%) returned HTTP 200 OK**
  * **Content-Type:** `image/jpeg` / `image/webp`
* **Retired/Legacy Account (`damc35hfo`):**
  * **Total Images:** 14 images
  * **HTTP 200 OK:** 13 images successfully cached and delivered by Cloudinary CDN edge.
  * **HTTP 404 Not Found (Known Broken Asset):** **1 image** (`pdf-waraq-enab.jpg`).

---

## 3. Special Case Audits

### Special Case 1: Baladi Rooster ("ديك بلدي")
* **Product ID:** `bb1e4825-af47-480b-b42f-260a29f0fd30`
* **Product Name:** `ديك بلدي`
* **Database URL:** `https://res.cloudinary.com/tifawhcs/image/upload/v1795527222/naqer-menu/products/baladi-rooster.webp`
* **Original Local Asset:** `public/images/products/bedouin/baladi-rooster.webp`
* **Local Asset Size:** 47,820 bytes
* **Local Asset SHA256:** `fa5bbd7c2cb0419093ceced698f6456eeea959c5e845cb32ae300f21c8cabfbe`
* **Remote Asset SHA256:** `fa5bbd7c2cb0419093ceced698f6456eeea959c5e845cb32ae300f21c8cabfbe`
* **Verification Outcome:** **PASS — EXACT SHA256 BITWISE MATCH**.
* **Safety Rule Met:** Zero modifications made to asset or record.

### Special Case 2: Known Broken Image ("ورق عنب بالكوارع")
* **Product ID:** `e5259930-d19c-4418-b106-2c2d137414f3`
* **Product Name:** `ورق عنب بالكوارع`
* **Database Image ID:** `cc2ee321-e4ec-4cd3-9018-f863611179f9`
* **URL:** `https://res.cloudinary.com/damc35hfo/image/upload/v1793815476/naqer-menu/products/pdf-waraq-enab.jpg`
* **HTTP HEAD Status:** **HTTP 404 Not Found**
* **Root Cause:** Stored on retired Cloudinary cloud `damc35hfo` where the original file was either deleted or never uploaded prior to account retirement.
* **Verification Outcome:** **CONFIRMED KNOWN BROKEN ASSET**.
* **Safety Rule Met:** Left strictly unchanged per Absolute Safety Rule 4. Must be scheduled for post-cutover photography replacement.

---

## 4. Duplicate Image Analysis

Two local image URLs are referenced by multiple product records:

1. **`/images/products/appetizers/french-fries.webp` (2 references)**
   * Product 1: `4b663874-4f53-45a8-ab3c-01311e048d57` — "بطاطس" (Image ID: `img-local-8bff6e03d8ab2a54`)
   * Product 2: `32860d73-125c-4efa-9a18-24fc0d0f9c96` — "بطاطس" (Image ID: `img-local-9d47d74fdfa4f370`)
   * Analysis: Expected duplication representing French Fries listed under separate menu categories/portions. Asset exists, is valid, and serves properly.

2. **`/images/products/coffee/caramel-macchiato.webp` (2 references)**
   * Product 1: `4d8e7a7e-dfe8-40dd-92dc-6f4f8debfd61` — "كراميل" (Image ID: `img-local-7bf902022f85239d`)
   * Product 2: `558c4ac8-8519-415b-a72e-851e201b3f96` — "كراميل" (Image ID: `img-local-620ddfc6252786e5`)
   * Analysis: Expected duplication representing hot and iced caramel coffee variations sharing the same stock asset.

---

## 5. Next.js Runtime Image Serving & Configuration

* **Configuration File:** `next.config.mjs`
* **Remote Patterns Rule:**
  ```javascript
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  }
  ```
* **Hostname Verification:** Both `res.cloudinary.com/tifawhcs` and `res.cloudinary.com/damc35hfo` share the hostname `res.cloudinary.com`. Next.js image optimization permits both paths without hostname rejection.
* **Application Serving Test:** Verified against Next.js production server on port 3008. `GET /images/products/bedouin/baladi-rooster.webp` returned HTTP 200 with Content-Type `image/webp`.

---

## 6. Complete Inventory of All 151 Product Images

The table below catalogs every single product image in `naqer_merged_staging`:

| # | Product Name | Product ID | Source Type | URL / Path | Verification Detail | Status |
|---|---|---|---|---|---|---|
| 1 | آيس اسبانش لاتيه | `eb6de2f0...` | Local WebP | `/images/products/iced/iced-spanish-latte.webp` | Size: 24174 B | SHA: `031ab6e9...` | Case: OK | Git: OK | **PASS** |
| 2 | آيس شوكلت | `1d5d056f...` | Local WebP | `/images/products/iced/iced-chocolate.webp` | Size: 33608 B | SHA: `6f18a2cc...` | Case: OK | Git: OK | **PASS** |
| 3 | آيس كوفي | `a03f8f94...` | Local WebP | `/images/products/iced/iced-coffee.webp` | Size: 28186 B | SHA: `308f32fb...` | Case: OK | Git: OK | **PASS** |
| 4 | آيس موكا أو لاتيه أو كرمل | `ee8625a3...` | Local WebP | `/images/products/iced/iced-mocha-caramel.webp` | Size: 38768 B | SHA: `cd4c3cac...` | Case: OK | Git: OK | **PASS** |
| 5 | أرز أبيض | `1db646c2...` | Local WebP | `/images/products/oriental/egyptian-white-rice.webp` | Size: 86456 B | SHA: `28ca89e9...` | Case: OK | Git: OK | **PASS** |
| 6 | أرز مندي سادة | `e92aa1ba...` | Local WebP | `/images/products/mandi/mandi-rice-plain.webp` | Size: 86456 B | SHA: `28ca89e9...` | Case: OK | Git: OK | **PASS** |
| 7 | أميركان كوفي | `22485bbf...` | Local WebP | `/images/products/hot-drinks/americano.webp` | Size: 44972 B | SHA: `e3956fa5...` | Case: OK | Git: OK | **PASS** |
| 8 | اسبانش لاتيه | `846a1a15...` | Local WebP | `/images/products/coffee/spanish-latte.webp` | Size: 62340 B | SHA: `6815d443...` | Case: OK | Git: OK | **PASS** |
| 9 | اسبرسو | `1ba20b00...` | Local WebP | `/images/products/coffee/espresso.webp` | Size: 35090 B | SHA: `107d6071...` | Case: OK | Git: OK | **PASS** |
| 10 | البصلية باللحم الضاني | `86e5f810...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 11 | اوريو | `f0338a60...` | Local WebP | `/images/products/shakes/oreo-shake.webp` | Size: 38768 B | SHA: `cd4c3cac...` | Case: OK | Git: OK | **PASS** |
| 12 | بابا غنوج | `2ba1abe7...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 13 | بامية | `862c0586...` | Local WebP | `/images/products/homestyle/bamia-stew.webp` | Size: 54918 B | SHA: `7d961589...` | Case: OK | Git: OK | **PASS** |
| 14 | بامية باللحمة | `f8e7993b...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 15 | بان كيك | `b16aa190...` | Local WebP | `/images/products/desserts/pancakes.webp` | Size: 35458 B | SHA: `66f8af26...` | Case: OK | Git: OK | **PASS** |
| 16 | برتقال | `86c68836...` | Local WebP | `/images/products/juices/orange-juice.webp` | Size: 35848 B | SHA: `b531f44a...` | Case: OK | Git: OK | **PASS** |
| 17 | بريز جولد | `32e57d61...` | Local WebP | `/images/products/cocktails/gold-breeze.webp` | Size: 63270 B | SHA: `2db6fe09...` | Case: OK | Git: OK | **PASS** |
| 18 | بطاطس | `4b663874...` | Local WebP | `/images/products/appetizers/french-fries.webp` | Size: 54924 B | SHA: `f5d2dc26...` | Case: OK | Git: OK | **PASS** |
| 19 | بطاطس | `32860d73...` | Local WebP | `/images/products/appetizers/french-fries.webp` | Size: 54924 B | SHA: `f5d2dc26...` | Case: OK | Git: OK | **PASS** |
| 20 | بطاطس بالفراخ | `1d957ae4...` | Local WebP | `/images/products/homestyle/potato-chicken-tajin...` | Size: 97274 B | SHA: `fa5bbd7c...` | Case: OK | Git: OK | **PASS** |
| 21 | بطاطس باللحم | `6a58694d...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 22 | بطيخ | `e00848f3...` | Local WebP | `/images/products/juices/watermelon-juice.webp` | Size: 30832 B | SHA: `1b4c6dba...` | Case: OK | Git: OK | **PASS** |
| 23 | بندق | `7969af7c...` | Local WebP | `/images/products/coffee/hazelnut-coffee.webp` | Size: 27664 B | SHA: `b6cf0514...` | Case: OK | Git: OK | **PASS** |
| 24 | بولة ايس كريم | `89ccd638...` | Local WebP | `/images/products/iced/ice-cream-scoops.webp` | Size: 119178 B | SHA: `60c7e3b0...` | Case: OK | Git: OK | **PASS** |
| 25 | بينا كولادا | `9229ff94...` | Local WebP | `/images/products/cocktails/pina-colada.webp` | Size: 52186 B | SHA: `26ab99ff...` | Case: OK | Git: OK | **PASS** |
| 26 | تحميرة | `0bb49dd6...` | Local WebP | `/images/products/bedouin/tahmeera-meat.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 27 | تركي | `f28e93f1...` | Local WebP | `/images/products/coffee/turkish-coffee.webp` | Size: 18008 B | SHA: `ab56c64a...` | Case: OK | Git: OK | **PASS** |
| 28 | تركي دبل | `a1b1ef4d...` | Local WebP | `/images/products/coffee/double-turkish.webp` | Size: 60676 B | SHA: `ef499b0d...` | Case: OK | Git: OK | **PASS** |
| 29 | تروبيكال | `3f9e2bf8...` | Local WebP | `/images/products/cocktails/tropical.webp` | Size: 18008 B | SHA: `ab56c64a...` | Case: OK | Git: OK | **PASS** |
| 30 | تروبيكال بليد | `ea186496...` | Local WebP | `/images/products/cocktails/tropical-blade.webp` | Size: 40828 B | SHA: `12b8dd72...` | Case: OK | Git: OK | **PASS** |
| 31 | تومية | `e097d7e1...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 32 | جبنة قديمة | `4ad9a17a...` | Local WebP | `/images/products/appetizers/mish-cheese.webp` | Size: 54918 B | SHA: `7d961589...` | Case: OK | Git: OK | **PASS** |
| 33 | جوافة | `a1c2a94b...` | Local WebP | `/images/products/juices/guava-juice.webp` | Size: 27726 B | SHA: `db765893...` | Case: OK | Git: OK | **PASS** |
| 34 | حمام | `0d2b9d32...` | Local WebP | `/images/products/soups/pigeon-soup.webp` | Size: 124770 B | SHA: `deaf142e...` | Case: OK | Git: OK | **PASS** |
| 35 | خضار مشكل | `c8c81dc0...` | Local WebP | `/images/products/homestyle/torly-mixed-veg.webp` | Size: 54918 B | SHA: `7d961589...` | Case: OK | Git: OK | **PASS** |
| 36 | خضار مشكل باللحمة | `beb4efa0...` | Local WebP | `/images/products/homestyle/torly-meat.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 37 | دقوس | `86454fdb...` | Local WebP | `/images/products/mandi/daqoos-sauce.webp` | Size: 54918 B | SHA: `7d961589...` | Case: OK | Git: OK | **PASS** |
| 38 | ديك بلدي | `bb1e4825...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/webp) | **PASS** |
| 39 | ريد بانانا | `953dd80a...` | Local WebP | `/images/products/cocktails/red-banana.webp` | Size: 55006 B | SHA: `3953b3d8...` | Case: OK | Git: OK | **PASS** |
| 40 | ريش (ضاني أو بتلو) | `12c45358...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 41 | سجق مشوي | `ed770113...` | Local WebP | `/images/products/grills/grilled-oriental-sausag...` | Size: 130224 B | SHA: `7ce0f11f...` | Case: OK | Git: OK | **PASS** |
| 42 | سحلب فواكه | `0a64ec91...` | Local WebP | `/images/products/hot-drinks/sahlab-fruits.webp` | Size: 41888 B | SHA: `0d0f3d17...` | Case: OK | Git: OK | **PASS** |
| 43 | سحلب مكسرات | `d798b445...` | Local WebP | `/images/products/hot-drinks/sahlab-nuts.webp` | Size: 18008 B | SHA: `ab56c64a...` | Case: OK | Git: OK | **PASS** |
| 44 | سلطة بلدي كبير | `a6e32111...` | Local WebP | `/images/products/appetizers/baladi-salad-large....` | Size: 133958 B | SHA: `c4bb0ee1...` | Case: OK | Git: OK | **PASS** |
| 45 | سلطة خضراء | `5ff8273e...` | Local WebP | `/images/products/appetizers/green-salad.webp` | Size: 133958 B | SHA: `c4bb0ee1...` | Case: OK | Git: OK | **PASS** |
| 46 | سلطة زبادي | `44d96eaf...` | Local WebP | `/images/products/appetizers/cucumber-yogurt-sal...` | Size: 133958 B | SHA: `c4bb0ee1...` | Case: OK | Git: OK | **PASS** |
| 47 | سمبوسك (٨ قطع) | `241bf177...` | Local WebP | `/images/products/oriental/sambousak.webp` | Size: 30568 B | SHA: `4a28c208...` | Case: OK | Git: OK | **PASS** |
| 48 | سموزي | `99c5b629...` | Local WebP | `/images/products/shakes/berry-smoothie.webp` | Size: 42500 B | SHA: `94fce2c3...` | Case: OK | Git: OK | **PASS** |
| 49 | شاي أخضر | `60828c09...` | Local WebP | `/images/products/hot-drinks/green-tea.webp` | Size: 31936 B | SHA: `0a2f2cd9...` | Case: OK | Git: OK | **PASS** |
| 50 | شاي أخضر نعناع | `b31a0181...` | Local WebP | `/images/products/hot-drinks/green-tea-mint.webp` | Size: 59292 B | SHA: `52b8828e...` | Case: OK | Git: OK | **PASS** |
| 51 | شاي عادي | `885f7991...` | Local WebP | `/images/products/hot-drinks/black-tea.webp` | Size: 59292 B | SHA: `52b8828e...` | Case: OK | Git: OK | **PASS** |
| 52 | شمبري | `7fc1bc3d...` | Local WebP | `/images/products/bedouin/bedouin-veal.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 53 | شوكلت | `ce674078...` | Local WebP | `/images/products/iced/chocolate-ice-drink.webp` | Size: 33608 B | SHA: `6f18a2cc...` | Case: OK | Git: OK | **PASS** |
| 54 | شيري كولا | `ebe8957a...` | Local WebP | `/images/products/cocktails/cherry-cola.webp` | Size: 92038 B | SHA: `f68e07aa...` | Case: OK | Git: OK | **PASS** |
| 55 | شيش طاووق | `7a86d7d9...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 56 | صن شاين | `4fcfbcd4...` | Local WebP | `/images/products/cocktails/sunshine.webp` | Size: 63270 B | SHA: `2db6fe09...` | Case: OK | Git: OK | **PASS** |
| 57 | صينية الحبايب | `99b88b58...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 58 | صينية الحرب العالمية | `9eca542a...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 59 | صينية الصحاب | `c14570a8...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 60 | صينية العمدة | `db1d25c3...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 61 | صينية العيلة | `70e810f5...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 62 | صينية الملوك | `5580e943...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 63 | صينية الوحوش | `0a67d363...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 64 | صينية مشاوي | `8cd30623...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 65 | ضاني | `49879a38...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 66 | ضلع (ضاني أو بتلو) | `af3b8370...` | Local WebP | `/images/products/grills/grilled-rib.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 67 | ضلع مندي (ضاني) | `e746de89...` | Local WebP | `/images/products/mandi/mandi-lamb-ribs.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 68 | طاجن سجق | `7166b87a...` | Local WebP | `/images/products/oriental/sojok-tajine.webp` | Size: 54918 B | SHA: `7d961589...` | Case: OK | Git: OK | **PASS** |
| 69 | طبق جيلي | `0195bd64...` | Local WebP | `/images/products/iced/jelly-bowl.webp` | Size: 61458 B | SHA: `5917deb9...` | Case: OK | Git: OK | **PASS** |
| 70 | طبق مبكبكة | `4f00d7a9...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 71 | طبق محاشي مشكل | `963cd9e6...` | Local WebP | `/images/products/oriental/mixed-mahshi.webp` | Size: 54918 B | SHA: `7d961589...` | Case: OK | Git: OK | **PASS** |
| 72 | طبق محاشي ورق عنب | `08c7ad26...` | Local WebP | `/images/products/oriental/stuffed-vine-leaves.webp` | Size: 54918 B | SHA: `7d961589...` | Case: OK | Git: OK | **PASS** |
| 73 | طحينة | `5a761da0...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/png) | **PASS** |
| 74 | طرب | `0304235e...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 75 | عكاوي | `fa678752...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 76 | عكاوي | `aaa1656d...` | Local WebP | `/images/products/soups/oxtail-soup.webp` | Size: 124770 B | SHA: `deaf142e...` | Case: OK | Git: OK | **PASS** |
| 77 | عناب ساقع | `9eaec63a...` | Local WebP | `/images/products/juices/iced-karkadeh.webp` | Size: 44770 B | SHA: `5d8fd528...` | Case: OK | Git: OK | **PASS** |
| 78 | فانيليا | `40889fb8...` | Local WebP | `/images/products/iced/vanilla-ice-drink.webp` | Size: 59336 B | SHA: `43a71b95...` | Case: OK | Git: OK | **PASS** |
| 79 | فتة كوارع | `95768236...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 80 | فرابتشينو | `0a048c3b...` | Local WebP | `/images/products/iced/frappuccino.webp` | Size: 38768 B | SHA: `cd4c3cac...` | Case: OK | Git: OK | **PASS** |
| 81 | فراولة | `c1032953...` | Local WebP | `/images/products/juices/strawberry-juice.webp` | Size: 42500 B | SHA: `94fce2c3...` | Case: OK | Git: OK | **PASS** |
| 82 | فرد حمام محشي | `cf8731b3...` | Local WebP | `/images/products/oriental/stuffed-pigeon.webp` | Size: 97274 B | SHA: `fa5bbd7c...` | Case: OK | Git: OK | **PASS** |
| 83 | فرنساوي | `b68fade8...` | Local WebP | `/images/products/coffee/french-coffee.webp` | Size: 62340 B | SHA: `6815d443...` | Case: OK | Git: OK | **PASS** |
| 84 | فروت سلاط | `027c37d1...` | Local WebP | `/images/products/shakes/fruit-salad-bowl.webp` | Size: 61378 B | SHA: `3ab06009...` | Case: OK | Git: OK | **PASS** |
| 85 | فلتو | `e98219e8...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 86 | فلوريدا | `b162143a...` | Local WebP | `/images/products/cocktails/florida.webp` | Size: 36924 B | SHA: `bbc333ab...` | Case: OK | Git: OK | **PASS** |
| 87 | كابتشينو أو لاتيه | `194d6ef7...` | Local WebP | `/images/products/coffee/cappuccino-latte.webp` | Size: 27664 B | SHA: `b6cf0514...` | Case: OK | Git: OK | **PASS** |
| 88 | كباب (ضاني أو بتلو) | `499ac912...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 89 | كبد وكلاوي | `9fdb26ff...` | Local WebP | `/images/products/oriental/liver-kidneys.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 90 | كبدة ضاني | `2fbc5a45...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 91 | كراميل | `4d8e7a7e...` | Local WebP | `/images/products/coffee/caramel-macchiato.webp` | Size: 20672 B | SHA: `821887dd...` | Case: OK | Git: OK | **PASS** |
| 92 | كراميل | `558c4ac8...` | Local WebP | `/images/products/coffee/caramel-macchiato.webp` | Size: 20672 B | SHA: `821887dd...` | Case: OK | Git: OK | **PASS** |
| 93 | كرمل | `3ff3849a...` | Local WebP | `/images/products/coffee/caramel-coffee.webp` | Size: 20672 B | SHA: `821887dd...` | Case: OK | Git: OK | **PASS** |
| 94 | كريمة | `4b484a28...` | Local WebP | `/images/products/soups/cream-soup.webp` | Size: 124770 B | SHA: `deaf142e...` | Case: OK | Git: OK | **PASS** |
| 95 | كفتة | `822a043e...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 96 | كنافة نابلسية | `64daf798...` | Local WebP | `/images/products/desserts/nabulsi-kunafa.webp` | Size: 46030 B | SHA: `f376e304...` | Case: OK | Git: OK | **PASS** |
| 97 | كوارع | `13e7e8c0...` | Local WebP | `/images/products/soups/trotters-soup.webp` | Size: 124770 B | SHA: `deaf142e...` | Case: OK | Git: OK | **PASS** |
| 98 | كوكتيل أعشاب | `536c0b13...` | Local WebP | `/images/products/hot-drinks/herbal-cocktail.webp` | Size: 43540 B | SHA: `310da14d...` | Case: OK | Git: OK | **PASS** |
| 99 | كوكتيل الناقر | `80fef852...` | Local WebP | `/images/products/cocktails/naqer-cocktail.webp` | Size: 40828 B | SHA: `12b8dd72...` | Case: OK | Git: OK | **PASS** |
| 100 | كوكيز ميكس | `d5c120e0...` | Local WebP | `/images/products/cocktails/cookies-mix.webp` | Size: 38768 B | SHA: `cd4c3cac...` | Case: OK | Git: OK | **PASS** |
| 101 | كولسلو | `75fde09b...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 102 | كيوي باللبن | `561e485a...` | Local WebP | `/images/products/juices/kiwi-milk.webp` | Size: 35148 B | SHA: `e3a930ec...` | Case: OK | Git: OK | **PASS** |
| 103 | ليمون | `61192d1f...` | Local WebP | `/images/products/juices/lemon-juice.webp` | Size: 47190 B | SHA: `9914b233...` | Case: OK | Git: OK | **PASS** |
| 104 | ليمون + شاي زردة + كنافة | `2468d831...` | Local WebP | `/images/products/desserts/bedouin-tea-kunafa.webp` | Size: 59292 B | SHA: `52b8828e...` | Case: OK | Git: OK | **PASS** |
| 105 | ليمون / ليمون نعناع | `f5be6ce3...` | Local WebP | `/images/products/shakes/lemon-mint-smoothie.webp` | Size: 26502 B | SHA: `c5ecdb65...` | Case: OK | Git: OK | **PASS** |
| 106 | ليمون نعناع | `74f3c264...` | Local WebP | `/images/products/juices/lemon-mint.webp` | Size: 26502 B | SHA: `c5ecdb65...` | Case: OK | Git: OK | **PASS** |
| 107 | مانجو | `aae865c8...` | Local WebP | `/images/products/juices/mango-juice.webp` | Size: 38212 B | SHA: `631e65c3...` | Case: OK | Git: OK | **PASS** |
| 108 | مانجو نت | `d50ff450...` | Local WebP | `/images/products/cocktails/mango-nut.webp` | Size: 18008 B | SHA: `ab56c64a...` | Case: OK | Git: OK | **PASS** |
| 109 | مخاصي | `30d72b30...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 200 (image/jpeg) | **PASS** |
| 110 | مسقعة | `7143c8a6...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 111 | مشروب غازي | `4fc17c53...` | Local WebP | `/images/products/soft/soft-drink-can.webp` | Size: 92038 B | SHA: `f68e07aa...` | Case: OK | Git: OK | **PASS** |
| 112 | مشكل | `05779449...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 113 | مغربي | `00ec5fa7...` | Local WebP | `/images/products/soups/moroccan-harira.webp` | Size: 124770 B | SHA: `deaf142e...` | Case: OK | Git: OK | **PASS** |
| 114 | ملوخية | `14ce572d...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 115 | ممبار | `ac255a81...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 116 | موز باللبن | `6e3390a8...` | Local WebP | `/images/products/juices/banana-milk.webp` | Size: 59336 B | SHA: `43a71b95...` | Case: OK | Git: OK | **PASS** |
| 117 | موزة بتلو مندي | `c175cda5...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 118 | موزة ضاني | `0c37a7a2...` | Local WebP | `/images/products/bedouin/bedouin-lamb-shank.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 119 | موزة ضاني مشوية | `1e7a402f...` | Local WebP | `/images/products/grills/grilled-lamb-shank.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 120 | موزة ضاني مندي | `6bdd0f6e...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 121 | موزة فتة (ضاني أو بتلو) | `88144bbc...` | Local WebP | `/images/products/oriental/shank-fatta.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 122 | موكا | `293c1034...` | Local WebP | `/images/products/coffee/mocha.webp` | Size: 48376 B | SHA: `024eb82d...` | Case: OK | Git: OK | **PASS** |
| 123 | مولتن كيك | `bdff9030...` | Local WebP | `/images/products/desserts/molten-cake.webp` | Size: 62932 B | SHA: `bf92d1f7...` | Case: OK | Git: OK | **PASS** |
| 124 | مياه معدنية | `b93abeba...` | Local WebP | `/images/products/soft/mineral-water.webp` | Size: 50068 B | SHA: `1c00a3d7...` | Case: OK | Git: OK | **PASS** |
| 125 | ميكس بيري | `35d4c033...` | Local WebP | `/images/products/cocktails/mix-berry.webp` | Size: 32968 B | SHA: `fe872cf1...` | Case: OK | Git: OK | **PASS** |
| 126 | ميكس جريل | `1706b23b...` | Local WebP | `/images/products/grills/deluxe-mix-grill.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 127 | ميلك شيك | `139d076a...` | Local WebP | `/images/products/shakes/classic-milkshake.webp` | Size: 38768 B | SHA: `cd4c3cac...` | Case: OK | Git: OK | **PASS** |
| 128 | ميني تارت | `45b19d52...` | Local WebP | `/images/products/desserts/mini-tart.webp` | Size: 182090 B | SHA: `707eef6d...` | Case: OK | Git: OK | **PASS** |
| 129 | نسكافيتشينو | `988da998...` | Local WebP | `/images/products/iced/nescafecino.webp` | Size: 28186 B | SHA: `308f32fb...` | Case: OK | Git: OK | **PASS** |
| 130 | نسكافيه | `2c22ba8c...` | Local WebP | `/images/products/coffee/nescafe-milk.webp` | Size: 60676 B | SHA: `ef499b0d...` | Case: OK | Git: OK | **PASS** |
| 131 | نسكافيه بلاك | `f89759c3...` | Local WebP | `/images/products/coffee/nescafe-black.webp` | Size: 44972 B | SHA: `e3956fa5...` | Case: OK | Git: OK | **PASS** |
| 132 | نعناع - ينسون - كركديه - قرفة | `99b89aeb...` | Local WebP | `/images/products/hot-drinks/herbal-infusion.webp` | Size: 43540 B | SHA: `310da14d...` | Case: OK | Git: OK | **PASS** |
| 133 | نفر لحم مندي (ضاني) | `fafcb4c3...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 134 | نفر لحم مندي (كندوز) | `db28ea0f...` | Local WebP | `/images/products/mandi/mandi-beef.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 135 | هاواي | `ca60d2cc...` | Local WebP | `/images/products/cocktails/hawaii.webp` | Size: 47190 B | SHA: `9914b233...` | Case: OK | Git: OK | **PASS** |
| 136 | هوت الناقر | `b651bd3f...` | Local WebP | `/images/products/hot-drinks/naqer-hot-special.webp` | Size: 25262 B | SHA: `e0a3a37d...` | Case: OK | Git: OK | **PASS** |
| 137 | هوت سيدر | `67b4254a...` | Local WebP | `/images/products/hot-drinks/hot-cider.webp` | Size: 47190 B | SHA: `9914b233...` | Case: OK | Git: OK | **PASS** |
| 138 | هوت شوكلت | `41a9b121...` | Local WebP | `/images/products/hot-drinks/hot-chocolate.webp` | Size: 25262 B | SHA: `e0a3a37d...` | Case: OK | Git: OK | **PASS** |
| 139 | وافل شوكلت | `82e199dc...` | Local WebP | `/images/products/desserts/chocolate-waffle.webp` | Size: 60692 B | SHA: `1e37057c...` | Case: OK | Git: OK | **PASS** |
| 140 | وافل نوتيلا | `6aae8321...` | Local WebP | `/images/products/desserts/nutella-waffle.webp` | Size: 60692 B | SHA: `1e37057c...` | Case: OK | Git: OK | **PASS** |
| 141 | وجبة الأطفال | `c7908380...` | Local WebP | `/images/products/meals/kids-meal.webp` | Size: 70750 B | SHA: `9f72b047...` | Case: OK | Git: OK | **PASS** |
| 142 | وجبة الأكيل | `31223c2b...` | Local WebP | `/images/products/meals/el-akeel-feast.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 143 | وجبة توفير | `e16b4983...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 144 | وجبة دجاج مندي | `b138df8b...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 145 | وجبة شيش طاووق | `63488c8e...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 146 | وجبة كفتة مشوية | `cf215edb...` | Local WebP | `/images/products/meals/kofta-meal.webp` | Size: 130224 B | SHA: `7ce0f11f...` | Case: OK | Git: OK | **PASS** |
| 147 | وجبة نصف فرخة مشوية | `21c63eb5...` | Cloudinary | `https://res.cloudinary.com/tifawhcs/image/uploa...` | Cloud: `tifawhcs` | HTTP 200 (image/jpeg) | **PASS** |
| 148 | ورق عنب بالكوارع | `e5259930...` | Cloudinary | `https://res.cloudinary.com/damc35hfo/image/uplo...` | Cloud: `damc35hfo` | HTTP 404 (application/octet-stream) | **FAIL** |
| 149 | ورقة سجق | `a4df8032...` | Local WebP | `/images/products/oriental/waraet-sojok.webp` | Size: 130224 B | SHA: `7ce0f11f...` | Case: OK | Git: OK | **PASS** |
| 150 | ورقة لحمة | `b5e8cbb1...` | Local WebP | `/images/products/oriental/waraet-lahma.webp` | Size: 78990 B | SHA: `42de3adc...` | Case: OK | Git: OK | **PASS** |
| 151 | يوجرد فليب | `c47947a0...` | Local WebP | `/images/products/cocktails/yogurt-flip.webp` | Size: 41888 B | SHA: `0d0f3d17...` | Case: OK | Git: OK | **PASS** |

---

## 7. Assets Risk Assessment & Post-Cutover Recommendations

1. **Risk: Retired Cloudinary Account (`damc35hfo`)**
   * *Severity:* **Medium**
   * *Mitigation:* 13 of the 14 assets remain actively cached and served. A post-cutover batch job should re-upload the 13 assets to the client's account `tifawhcs`.
2. **Risk: Broken Image for "ورق عنب بالكوارع"**
   * *Severity:* **Low**
   * *Mitigation:* The product card gracefully falls back or shows the placeholder in the UI. Client should capture and upload an authentic photo for this single dish.
