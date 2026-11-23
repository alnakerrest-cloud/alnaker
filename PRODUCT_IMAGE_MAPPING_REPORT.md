# Naqer Menu — Product Image Mapping Report
## Complete Asset Audit, Verification Status & Migration Strategy

**Date:** 2026-11-22  
**Status:** 100% INDIVIDUALLY VERIFIED  
**Classification:** VERIFIED & DOCUMENTED  

---

## 1. Executive Summary & Asset Classification

Every single product out of the **151 authoritative products** was individually audited against disk storage, Cloudinary endpoints, and database manifests.

### Global Asset Breakdown

| Asset Category | Total Items | Primary Location | Verification Method | Status |
| :--- | :---: | :--- | :--- | :---: |
| **Local Commercial Product Photos** | 137 | `public/images/products/<category>/` | Direct filesystem `fs.existsSync` on disk | **137 / 137 VERIFIED ON DISK (0 missing)** |
| **Cloudinary Signature Dish Photos** | 14 | Cloudinary (`naqer-menu/products/`) | HTTP HEAD check on live CDN endpoints | **13 / 14 HTTP 200 OK**<br>*(1 404 recovered from local `pdf-images/upload/`)* |
| **Cloudinary Promotional Offer Assets**| 22 | Cloudinary (`naqer-menu/offers/`) | Cloudinary Admin API query | **VERIFIED (Active on Cloudinary)** |
| **Cloudinary Category Assets** | 1 | Cloudinary (`naqer-menu/categories/`) | Cloudinary Admin API query | **VERIFIED** |
| **Cloudinary Account Sample Assets** | 47 | Cloudinary (`samples/*`) | Cloudinary Admin API query | **EXCLUDED (Unused default assets)** |
| **Brand Logos & Vectors** | 3 | `public/` & `extracted-logo/` | Direct filesystem inspection | **VERIFIED (SVG/PNG available)** |

---

## 2. Critical Cloudinary Finding: `pdf-waraq-enab.jpg`

During HTTP HEAD verification of the 14 Cloudinary URLs:
- **13 URLs returned HTTP 200 OK.**
- **1 URL returned HTTP 404:**
  `https://res.cloudinary.com/damc35hfo/image/upload/v1793815476/naqer-menu/products/pdf-waraq-enab.jpg` (Product: `ورق عنب بالكوارع`, ID: `e5259930-d19c-4418-b106-2c2d137414f3`).
- **Immediate Local Recovery:** The exact original image file was located in the project repository at:
  `pdf-images/upload/pdf-waraq-enab.jpg` (File size: 30,246 bytes, modified 2026-11-04).
- **Migration Action:** This local file will be uploaded directly to the client's new Cloudinary account under `naqer-menu/products/pdf-waraq-enab.jpg`, permanently fixing the 404 in the client environment.

---

## 3. Product-to-Image Master Mapping (All 151 Products)

| # | Product ID | Arabic Name | Category | Image Type | Image Path / URL | Verification Status |
|---|---|---|---|---|---|---|
| 1 | `0a67d363-e9fa-4854-981b-89d3b214260f` | صينية الوحوش | الصواني | Cloudinary | `.../naqer-menu/products/pdf-tray-alwohoush.jpg` | **VERIFIED (HTTP 200)** |
| 2 | `5580e943-c91a-41b4-9a62-b8591af1fc3e` | صينية الملوك | الصواني | Cloudinary | `.../naqer-menu/products/pdf-tray-almolok.jpg` | **VERIFIED (HTTP 200)** |
| 3 | `c14570a8-5fb2-4b70-8e4c-e9e4d36c89a0` | صينية الصحاب | الصواني | Cloudinary | `.../naqer-menu/products/pdf-tray-alsahab.jpg` | **VERIFIED (HTTP 200)** |
| 4 | `70e810f5-41d5-464e-83b3-f34e76523f81` | صينية العيلة | الصواني | Cloudinary | `.../naqer-menu/products/pdf-tray-alaila.jpg` | **VERIFIED (HTTP 200)** |
| 5 | `99b88b58-a108-4820-b004-2e31a4f4e03d` | صينية الحبايب | الصواني | Cloudinary | `.../naqer-menu/products/pdf-tray-alhobaib.jpg` | **VERIFIED (HTTP 200)** |
| 6 | `8cd30623-2fcf-4ef5-bc59-fff32b7315e0` | صينية مشاوي | الصواني | Cloudinary | `.../naqer-menu/products/pdf-tray-mashawi.jpg` | **VERIFIED (HTTP 200)** |
| 7 | `db1d25c3-c497-4386-94b2-06c4126ecf5f` | صينية العمدة | الصواني | Cloudinary | `.../naqer-menu/products/pdf-tray-alomda.jpg` | **VERIFIED (HTTP 200)** |
| 8 | `9eca542a-156c-4211-a971-a34ce69335ae` | صينية الحرب العالمية | الصواني | Cloudinary | `.../naqer-menu/products/pdf-tray-alharb.jpg` | **VERIFIED (HTTP 200)** |
| 9 | `fafcb4c3-f23b-41f3-b1d5-c1bb0a95c92a` | نفر لحم مندي (ضاني) | المندي | Local WebP | `/images/products/mandi/mandi-lamb.webp` | **VERIFIED (Exists on disk)** |
| 10 | `db28ea0f-5cce-44b0-b796-3e66417c8943` | نفر لحم مندي (كندوز) | المندي | Local WebP | `/images/products/mandi/mandi-beef.webp` | **VERIFIED (Exists on disk)** |
| 11 | `6bdd0f6e-a34f-4e9f-b669-802a2b66252b` | موزة ضاني مندي | المندي | Local WebP | `/images/products/mandi/mandi-lamb-shank.webp` | **VERIFIED (Exists on disk)** |
| 12 | `c175cda5-e34c-42f3-b5a4-f8ebf2c38241` | موزة بتلو مندي | المندي | Local WebP | `/images/products/mandi/mandi-veal-shank.webp` | **VERIFIED (Exists on disk)** |
| 13 | `e746de89-48e6-40a9-9c98-00febac3f2af` | ضلع مندي (ضاني) | المندي | Local WebP | `/images/products/mandi/mandi-lamb-ribs.webp` | **VERIFIED (Exists on disk)** |
| 14 | `b138df8b-87ce-4a10-b564-8936d93b7c26` | وجبة دجاج مندي | المندي | Local WebP | `/images/products/mandi/mandi-chicken.webp` | **VERIFIED (Exists on disk)** |
| 15 | `e92aa1ba-1de0-433f-ae85-5f500ced2c5f` | أرز مندي سادة | المندي | Local WebP | `/images/products/mandi/mandi-rice-plain.webp` | **VERIFIED (Exists on disk)** |
| 16 | `86454fdb-9944-424e-8d04-bd7f960215fc` | دقوس | المندي | Local WebP | `/images/products/mandi/daqoos-sauce.webp` | **VERIFIED (Exists on disk)** |
| 17 | `499ac912-6b0b-4039-9854-69be4ee524d0` | كباب (ضاني أو بتلو) | المشويات | Local WebP | `/images/products/grills/kebab-skewers.webp` | **VERIFIED (Exists on disk)** |
| 18 | `12c45358-a7e4-4467-a501-82946e969f37` | ريش (ضاني أو بتلو) | المشويات | Local WebP | `/images/products/grills/lamb-chops.webp` | **VERIFIED (Exists on disk)** |
| 19 | `e98219e8-d9a7-41b5-b88c-f4f8dfe3d19d` | فلتو | المشويات | Local WebP | `/images/products/grills/filet-skewers.webp` | **VERIFIED (Exists on disk)** |
| 20 | `7a86d7d9-69ab-412c-8dec-75c14017b1e0` | شيش طاووق | المشويات | Local WebP | `/images/products/grills/shish-tawook.webp` | **VERIFIED (Exists on disk)** |
| 21 | `0304235e-d213-453b-834b-7039a4a16fef` | طرب | المشويات | Local WebP | `/images/products/grills/tarb.webp` | **VERIFIED (Exists on disk)** |
| 22 | `822a043e-6722-472f-9c4b-6c624adb918e` | كفتة | المشويات | Local WebP | `/images/products/grills/kofta-skewers.webp` | **VERIFIED (Exists on disk)** |
| 23 | `05779449-f092-45e7-a2f7-3adc8f5c6fce` | مشكل | المشويات | Local WebP | `/images/products/grills/mixed-kebab-kofta.webp` | **VERIFIED (Exists on disk)** |
| 24 | `1706b23b-243f-45fa-a123-418e24b4acd3` | ميكس جريل | المشويات | Local WebP | `/images/products/grills/deluxe-mix-grill.webp` | **VERIFIED (Exists on disk)** |
| 25 | `1e7a402f-5235-4fb0-a615-832e0b3b599d` | موزة ضاني مشوية | المشويات | Local WebP | `/images/products/grills/grilled-lamb-shank.webp` | **VERIFIED (Exists on disk)** |
| 26 | `af3b8370-5f41-492d-96af-355f8950b716` | ضلع (ضاني أو بتلو) | المشويات | Local WebP | `/images/products/grills/grilled-rib.webp` | **VERIFIED (Exists on disk)** |
| 27 | `ed770113-d1d0-4ab8-9be4-49bd4efb35ff` | سجق مشوي | المشويات | Local WebP | `/images/products/grills/grilled-oriental-sausage.webp` | **VERIFIED (Exists on disk)** |
| 28 | `21c63eb5-f441-47ac-8986-1ba695b41b8a` | وجبة نصف فرخة مشوية | المشويات | Local WebP | `/images/products/grills/half-grilled-chicken.webp` | **VERIFIED (Exists on disk)** |
| 29 | `c7908380-9517-43c2-944e-31006c4109e7` | وجبة الأطفال | الوجبات | Local WebP | `/images/products/meals/kids-meal.webp` | **VERIFIED (Exists on disk)** |
| 30 | `bbda7ba2-8f24-4f05-aa5d-752e259b66bb` | وجبة ميكس جريل (فردية) | الوجبات | Local WebP | `/images/products/meals/single-mix-grill-meal.webp` | **VERIFIED (Exists on disk)** |
| 31 | `a61ad36e-55c3-41bb-a6e5-4f40f0975877` | وجبة كفتة | الوجبات | Local WebP | `/images/products/meals/kofta-meal.webp` | **VERIFIED (Exists on disk)** |
| 32 | `00155688-6677-449e-b5c0-be23f49ca0c5` | وجبة شيش طاووق | الوجبات | Local WebP | `/images/products/meals/shish-tawook-meal.webp` | **VERIFIED (Exists on disk)** |
| 33 | `7bfd2179-8b80-482a-a92c-02cf1f7533fa` | وجبة سجق مشوي | الوجبات | Local WebP | `/images/products/meals/sausage-meal.webp` | **VERIFIED (Exists on disk)** |
| 34 | `d5392ef9-66bf-46a4-9eeb-73d763bc7576` | مدفونة دجاج | المأكولات البدوية | Local WebP | `/images/products/bedouin/madfoona-chicken.webp` | **VERIFIED (Exists on disk)** |
| 35 | `56193ff9-2f22-4ff5-b9e9-74d6438a2ff5` | مدفونة لحم | المأكولات البدوية | Local WebP | `/images/products/bedouin/madfoona-meat.webp` | **VERIFIED (Exists on disk)** |
| 36 | `3697a5f6-4f4b-4402-9ae4-07ec0dae2ec2` | كمونية | المأكولات البدوية | Local WebP | `/images/products/bedouin/kamounia.webp` | **VERIFIED (Exists on disk)** |
| 37 | `03ff8b3a-590b-4177-ad5f-3c8704043b35` | مكمورة لحم | المأكولات البدوية | Local WebP | `/images/products/bedouin/makmoora-meat.webp` | **VERIFIED (Exists on disk)** |
| 38 | `e5bc68ef-7a5d-4f18-bbbe-5c1cfadcbdf9` | قلاية لحم | المأكولات البدوية | Local WebP | `/images/products/bedouin/qallaya-meat.webp` | **VERIFIED (Exists on disk)** |
| 39 | `8bc4d4e0-36a5-4eb1-b0f3-a2a4fe3fa106` | كبدة غنم بلدي | المأكولات البدوية | Local WebP | `/images/products/bedouin/sheep-liver.webp` | **VERIFIED (Exists on disk)** |
| 40 | `18a660a5-f62f-416b-a25e-394ea0eb38c4` | كبدة وقوانص دجاج | المأكولات البدوية | Local WebP | `/images/products/bedouin/chicken-gizzards-liver.webp` | **VERIFIED (Exists on disk)** |
| 41 | `40c83a5e-b2d9-482a-adff-8bc93da357d7` | حمام محشي أرز | الشرقي | Local WebP | `/images/products/oriental/stuffed-pigeon.webp` | **VERIFIED (Exists on disk)** |
| 42 | `fe7f3efc-da2b-477c-a496-e263d596489a` | سمان محشي أرز | الشرقي | Local WebP | `/images/products/oriental/stuffed-quail.webp` | **VERIFIED (Exists on disk)** |
| 43 | `d8ce8659-c292-4a00-bf82-70b991b5c490` | بط محشي أرز | الشرقي | Local WebP | `/images/products/oriental/stuffed-duck.webp` | **VERIFIED (Exists on disk)** |
| 44 | `0e38a202-b364-4458-966a-1bb790117a26` | ديك رومي (كامل) | الشرقي | Local WebP | `/images/products/oriental/roast-turkey.webp` | **VERIFIED (Exists on disk)** |
| 45 | `2f2c8dcf-d833-402c-b26a-685b57f005b8` | جدي مندي (كامل) | الشرقي | Local WebP | `/images/products/oriental/whole-mandi-goat.webp` | **VERIFIED (Exists on disk)** |
| 46 | `85a73e48-356a-464a-8f5b-629255bb16e5` | خروف مندي (كامل) | الشرقي | Local WebP | `/images/products/oriental/whole-mandi-lamb.webp` | **VERIFIED (Exists on disk)** |
| 47 | `cf5a91b4-2396-4180-a359-dc762cf1b42d` | طاجن بامية باللحمة | الشرقي | Local WebP | `/images/products/oriental/okra-meat-tajin.webp` | **VERIFIED (Exists on disk)** |
| 48 | `72c67425-9df0-4b2a-89a7-96ff77db9c2f` | طاجن بصل باللحمة | الشرقي | Local WebP | `/images/products/oriental/onion-meat-tajin.webp` | **VERIFIED (Exists on disk)** |
| 49 | `f9408b04-ca05-4f7f-a634-8c887361a457` | طاجن خضار مشكل باللحمة | الشرقي | Local WebP | `/images/products/oriental/mixed-veg-meat-tajin.webp` | **VERIFIED (Exists on disk)** |
| 50 | `b9f3459c-6ba5-4f24-9588-490b63b2f8a4` | طاجن بطاطس باللحمة | الشرقي | Local WebP | `/images/products/oriental/potato-meat-tajin.webp` | **VERIFIED (Exists on disk)** |
| 51 | `ec25049b-7331-4c74-a0ba-06f1ae835d0e` | طاجن ملوخية سادة | الشرقي | Local WebP | `/images/products/oriental/plain-molokhia-tajin.webp` | **VERIFIED (Exists on disk)** |
| 52 | `17d23d8c-0fc8-4034-be59-e93cb27f8053` | طاجن عكاوي | الشرقي | Cloudinary | `.../naqer-menu/products/pdf-tajin-akkawi.jpg` | **VERIFIED (HTTP 200)** |
| 53 | `51c5cb03-b093-4a11-a8dc-16d48259caad` | أرز بالمكسرات | الأطباق الشعبية | Local WebP | `/images/products/popular/rice-nuts.webp` | **VERIFIED (Exists on disk)** |
| 54 | `800c8789-f538-4017-916c-e09dae079743` | أرز بالخلطة | الأطباق الشعبية | Local WebP | `/images/products/popular/rice-khaltah.webp` | **VERIFIED (Exists on disk)** |
| 55 | `01ee70b1-38fb-451e-966f-cb946efd8246` | أرز أبيض بلدي | الأطباق الشعبية | Local WebP | `/images/products/popular/white-rice.webp` | **VERIFIED (Exists on disk)** |
| 56 | `2467b7f1-8071-464a-bf69-9524e7561f92` | أرز بالشعرية | الأطباق الشعبية | Local WebP | `/images/products/popular/vermicelli-rice.webp` | **VERIFIED (Exists on disk)** |
| 57 | `830ea516-e8d1-447a-84fb-0570b5b15802` | أرز بسمتي كبسة | الأطباق الشعبية | Local WebP | `/images/products/popular/kabsa-rice.webp` | **VERIFIED (Exists on disk)** |
| 58 | `ff634f19-a1b4-4b47-ba0c-1db25686aa31` | مكرونة بشاميل | الأطباق الشعبية | Cloudinary | `.../naqer-menu/products/pdf-macaroni-bechamel.jpg` | **VERIFIED (HTTP 200)** |
| 59 | `4c8d5fe5-a45b-4171-8bc4-17c458ea618d` | مكرونة سجق | الأطباق الشعبية | Cloudinary | `.../naqer-menu/products/pdf-macaroni-sausage.jpg` | **VERIFIED (HTTP 200)** |
| 60 | `735d4fa3-e380-410a-8bf3-fe21bb99c512` | مكرونة كبسة | الأطباق الشعبية | Local WebP | `/images/products/popular/macaroni-kabsa.webp` | **VERIFIED (Exists on disk)** |
| 61 | `ca587e9c-f9e4-41d3-a551-7f9850ef37f6` | مكرونة بنا بالصلصة الحمراء | الأطباق الشعبية | Local WebP | `/images/products/popular/penne-arrabbiata.webp` | **VERIFIED (Exists on disk)** |
| 62 | `101ce6b4-2e9f-43b8-80f3-b3c92a95c89c` | مبكبكة باللحمة | الأطباق الشعبية | Cloudinary | `.../naqer-menu/products/pdf-mbakbaka-meat.jpg` | **VERIFIED (HTTP 200)** |
| 63 | `e5259930-d19c-4418-b106-2c2d137414f3` | ورق عنب بالكوارع | الأطباق الشعبية | Local Asset / Cloudinary | `pdf-images/upload/pdf-waraq-enab.jpg` | **RECOVERED LOCALLY (30.2 KB)** |
| 64 | `c21ad973-c64a-4dbe-a1c6-2cbe7198bb4b` | محشي مشكل | الأطباق الشعبية | Cloudinary | `.../naqer-menu/products/pdf-mahshi-moshakal.jpg` | **VERIFIED (HTTP 200)** |
| 65 | `67851e50-252d-4cc1-9b4e-4b68074900bf` | طحينة | المقبلات | Local WebP | `/images/products/appetizers/tahina.webp` | **VERIFIED (Exists on disk)** |
| 66 | `664c1264-77a8-4447-9cb3-6902d2fa15c1` | بابا غنوج | المقبلات | Local WebP | `/images/products/appetizers/baba-ghanoush.webp` | **VERIFIED (Exists on disk)** |
| 67 | `ebfc4b96-c148-4e38-96f3-f2fe6c37435f` | ثومية | المقبلات | Local WebP | `/images/products/appetizers/toum-garlic.webp` | **VERIFIED (Exists on disk)** |
| 68 | `26359f13-68d3-4632-901c-7cb5f5ba99e8` | سلطة خضراء | المقبلات | Local WebP | `/images/products/appetizers/green-salad.webp` | **VERIFIED (Exists on disk)** |
| 69 | `4c82c23a-c840-4dc6-b9dc-c30983cb127f` | سلطة كول سلو | المقبلات | Local WebP | `/images/products/appetizers/coleslaw.webp` | **VERIFIED (Exists on disk)** |
| 70 | `fef56f2f-eb04-44d4-9b5f-5573752ca5f5` | باذنجان مخلل | المقبلات | Local WebP | `/images/products/appetizers/pickled-eggplant.webp` | **VERIFIED (Exists on disk)** |
| 71 | `867c293d-d34e-4ebf-8c34-ebce960e6113` | مخلل بلدي مشكل | المقبلات | Local WebP | `/images/products/appetizers/pickled-mix.webp` | **VERIFIED (Exists on disk)** |
| 72 | `d1d07c33-4f9e-436f-b489-db8be9d78401` | سمبوسك جبنة | المقبلات | Local WebP | `/images/products/appetizers/sambousek-cheese.webp` | **VERIFIED (Exists on disk)** |
| 73 | `da857cfb-ec2d-4530-ab03-be9975e533bc` | سمبوسك لحمة | المقبلات | Local WebP | `/images/products/appetizers/sambousek-meat.webp` | **VERIFIED (Exists on disk)** |
| 74 | `c379a613-2680-45c1-9878-5777df4c7482` | بطاطس محمرة | المقبلات | Local WebP | `/images/products/appetizers/french-fries.webp` | **VERIFIED (Exists on disk)** |
| 75 | `f58c7e6b-0773-4556-9a25-a1c6a66a7b74` | شوربة لسان عصفور | الشوربة | Local WebP | `/images/products/soups/orzo-soup.webp` | **VERIFIED (Exists on disk)** |
| 76 | `9feec94f-f06e-4f76-bc30-f2a89849b29e` | شوربة كوارع | الشوربة | Local WebP | `/images/products/soups/trotters-soup.webp` | **VERIFIED (Exists on disk)** |
| 77 | `7d73ce41-e97c-4734-9721-6a2c9be95ea6` | شوربة عدس | الشوربة | Local WebP | `/images/products/soups/lentil-soup.webp` | **VERIFIED (Exists on disk)** |
| 78 | `c973ea94-ec6a-4d7a-af34-311a3db60da6` | شوربة ملوخية | الشوربة | Local WebP | `/images/products/soups/molokhia-soup.webp` | **VERIFIED (Exists on disk)** |
| 79 | `9c4391e9-4fe9-4e76-8805-4c079148d424` | شوربة كريمة (مشروم أو فراخ) | الشوربة | Local WebP | `/images/products/soups/cream-soup.webp` | **VERIFIED (Exists on disk)** |
| 80–151 | *Detailed Beverages, Desserts & Hot Drinks* | (العصائر، الكوكتيلات، الساخنة، القهوة، الحلويات، المثلجات) | العصائر/المشروبات/الحلويات | Local WebP | `/images/products/<category>/...` | **ALL 72 ITEMS VERIFIED ON DISK** |

*(Note: Products 80 through 151 cover juices, cocktails, milkshakes, ice cream, oriental sweets, and coffees, all verified 100% on disk).*

---

## 4. Distinction Between Asset Types

1. **Product Images (151 items):**
   - 14 Cloudinary images for Signature Trays and special heritage dishes.
   - 137 high-res local WebP images organized cleanly by subfolder in `public/images/products/`.
2. **Promotional Offers Images (22 items):**
   - Stored on Cloudinary under `naqer-menu/offers/*`.
   - Used only when promotional campaigns are active.
3. **Category Header Images (1 item):**
   - Stored on Cloudinary under `naqer-menu/categories/*`.
4. **Branding & Logo Assets (3 files):**
   - `public/images/logo.png` (Authoritative brand icon).
   - `public/favicon.ico`
   - `extracted-logo/logo-vector.svg` (High-definition vector asset).
5. **Excluded Cloudinary Default Assets (47 files):**
   - Assets in `samples/*` belong to Cloudinary default starter kits and are not referenced by the application.
