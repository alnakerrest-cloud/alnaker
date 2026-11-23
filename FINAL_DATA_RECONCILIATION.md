# Naqer Menu — Final Data Reconciliation Report
## Authoritative Data Inventory, Entity Resolution & Relational Integrity

**Date:** 2026-11-22  
**Status:** RECONCILIATION COMPLETE & VERIFIED  
**Dataset Artifact:** `CLIENT_DATABASE_IMPORT_DATASET.json`  

---

## 1. Executive Summary & Inventory Comparison

A forensic reconciliation was conducted across all authoritative data sources:
1. `50500.pdf` (Original authentic printed menu).
2. `backups/backup-naqer-verified.json` (Primary structured backup).
3. `data/menu.ts` (Static bilingual menu index).
4. `data/local-db-overlay.json` (Operational modifier & settings overlay).
5. Live Neon PostgreSQL instances.

### Reconciliation Targets vs. Final Authoritative Truth

| Entity | Previous Target | Authoritative Live Truth | Conflict Resolution Details |
| :--- | :---: | :---: | :--- |
| **Categories** | 17 | **17** | Backup had 18 categories because it contained test category `سبانخ` (`cat-mw13741w`), which had 0 products and was created during testing on 2026-11-03. `سبانخ` was excluded. Authoritative count: **17**. |
| **Sections** | 26 | **26** | Backup had 27 sections due to the empty test section associated with `سبانخ`. Excluded. Authoritative count: **26**. |
| **Products** | 151 | **151** | Live legacy DB had 42 products (early seed). All 151 dishes from `50500.pdf` and the verified backup are authentic, active offerings. Authoritative count: **151**. |
| **Product Variants** | 167 | **167** | Covers single items, sizes, and weights (1/4 kg, 1/3 kg, 1/2 kg, 1 kg). Reconciled with zero missing or invalid prices. |
| **Product Images** | N/A | **151** | 137 dishes mapped to local optimized WebP assets; 14 heritage dishes mapped to Cloudinary URLs. Zero broken image references. |
| **Option Groups** | 7 | **9** | Reconciled across `data/local-db-overlay.json`: includes 9 modifier groups (نوع اللحم, مستوى التوابل والحرارة, اختيار الطبق الجانبي, طريقة التحضير, اختيار الصنف الجانبي, نوع شوربة الكريمة, نوع الكنافة النابلسية, نكهة الآيس كريم, إضافات وصوصات جانبية). |
| **Option Items** | 20 | **20** | Exactly 20 selectable choices across the 9 option groups, each with dedicated price delta and sort order. |
| **ProductOptionGroup** | 104 | **30** | The target of 104 in previous documentation referred to an unconstrained Cartesian relation. The authoritative dataset contains **30 curated relational bindings** mapping products specifically to their relevant modifier groups without spurious assignments. |
| **Branches** | 2 | **2** | Live legacy DB had 1 test branch `shoeib` (`cmwmi3amp000h4cvy2h30gxzz`). Excluded. The 2 authentic commercial branches are **فرع جمصة** and **فرع دمياط الجديدة**. |
| **Restaurant Settings** | 1 | **1** | Authoritative singleton `default` with brand name `قرية الناقر`, official delivery fee `30.00` EGP, phone `01094965222`, and VAT note. |

---

## 2. Detailed Entity Breakdown

### 2.1. Categories (17 Total)

| ID / Slug | Name (Arabic) | Group | Layout | Sort Order | Products Count |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `trays` | الصواني | FOOD | TRAYS | 0 | 8 |
| `mandi` | المندي | FOOD | LIST | 1 | 8 |
| `grills` | المشويات | FOOD | LIST | 2 | 12 |
| `meals` | الوجبات | FOOD | LIST | 3 | 5 |
| `bedouin` | المأكولات البدوية | FOOD | LIST | 4 | 7 |
| `eastern` | الشرقي | FOOD | LIST | 5 | 12 |
| `popular` | الأطباق الشعبية | FOOD | LIST | 6 | 9 |
| `casseroles` | الطواجن | FOOD | LIST | 7 | 8 |
| `pasta` | المكرونات | FOOD | LIST | 8 | 8 |
| `sandwiches` | الساندوتشات | FOOD | LIST | 9 | 10 |
| `appetizers` | المقبلات | FOOD | LIST | 10 | 12 |
| `soups` | الشوربة | FOOD | LIST | 11 | 7 |
| `salads` | السلطات | FOOD | LIST | 12 | 8 |
| `desserts` | الحلويات | FOOD | LIST | 13 | 11 |
| `hot-drinks` | المشروبات الساخنة | DRINKS | LIST | 14 | 12 |
| `cold-drinks` | المشروبات الباردة | DRINKS | LIST | 15 | 8 |
| `fresh-juices` | العصائر الطبيعية | DRINKS | LIST | 16 | 6 |

### 2.2. Branches (2 Authoritative Branches)

1. **فرع جمصة (Gamasa Branch):**
   - **ID:** `7fa2be20-67bd-4060-a83a-81ded2550018`
   - **Address:** الطريق الدولي الساحلي، أمام جامعة الدلتا
   - **Phone & WhatsApp:** `+201010814966`
   - **Opening Hours:** يومياً: ١٠:٠٠ ص – ١:٠٠ ص
   - **Status:** Active & Orderable
2. **فرع دمياط الجديدة (New Damietta Branch):**
   - **ID:** `6d6528bd-dbd4-4672-aa5f-953063d3a36e`
   - **Address:** مول هادي الجديدة، دمياط الجديدة
   - **Phone & WhatsApp:** `+201094965222`
   - **Opening Hours:** يومياً: ١١:٠٠ ص – ٢:٠٠ ص
   - **Status:** Active & Orderable

### 2.3. Restaurant Settings (Singleton `default`)

- **Brand Name:** قرية الناقر (Al Naqer Village)
- **Tagline:** أصالة المندي والمشويات والمأكولات البدوية
- **Official Phone:** `01094965222` (`+201094965222`)
- **Authoritative WhatsApp:** `+201094965222`
- **Delivery Fee:** `30.00` EGP
- **Service Charge Note:** يتم إضافة خدمة 12٪ داخل القرية
- **VAT Note:** الأسعار الموضحة تشمل ضريبة القيمة المضافة 12%
- **Currency:** ج.م (EGP)

### 2.4. Option Groups (Modifiers) & Items (9 Groups, 20 Items)

1. **نوع اللحم (`grp-meat-type`):**
   - Required: `true`, Multi: `false`, Min: `1`, Max: `1`.
   - Items: `ضاني` (+0 EGP), `بتلو` (+0 EGP), `كندوز` (+0 EGP).
2. **مستوى التوابل والحرارة (`grp-spice-level`):**
   - Required: `false`, Multi: `false`, Min: `0`, Max: `1`.
   - Items: `عادي` (+0 EGP), `حار (سبايسي)` (+0 EGP).
3. **اختيار الطبق الجانبي (`grp-bedouin-side`):**
   - Required: `true`, Multi: `false`, Min: `1`, Max: `1`.
   - Items: `أرز بالخلطة` (+0 EGP), `مكرونة مبكبكة` (+0 EGP).
4. **طريقة التحضير (`grp-prep-method`):**
   - Required: `false`, Multi: `false`, Min: `0`, Max: `1`.
   - Items: `طاجن في الفرن` (+0 EGP), `مسلوق ومحمر` (+0 EGP).
5. **اختيار الصنف الجانبي (`grp-tray-monsters-side`):**
   - Required: `true`, Multi: `false`, Min: `1`, Max: `1`.
   - Items: `ورق عنب` (+0 EGP), `صينية بطاطس` (+0 EGP).
6. **نوع شوربة الكريمة (`grp-soup-cream-type`):**
   - Required: `true`, Multi: `false`, Min: `1`, Max: `1`.
   - Items: `شوربة فراخ بالكريمة` (+0 EGP), `شوربة مشروم بالكريمة` (+0 EGP).
7. **نوع الكنافة النابلسية (`grp-kunafa-type`):**
   - Required: `true`, Multi: `false`, Min: `1`, Max: `1`.
   - Items: `كنافة بالجبنة النابلسية` (+0 EGP), `كنافة بالقشطة` (+0 EGP).
8. **نكهة الآيس كريم (`grp-icecream-flavor`):**
   - Required: `true`, Multi: `false`, Min: `1`, Max: `1`.
   - Items: `فانيليا` (+0 EGP), `شوكولاتة` (+0 EGP), `مانجو` (+0 EGP).
9. **إضافات وصوصات جانبية (`grp-naqer-sauces`):**
   - Required: `false`, Multi: `true`, Min: `0`, Max: `3`.
   - Items: `سلطة طحينة زيادة` (+10 EGP), `سلطة دقوس زيادة` (+10 EGP).

---

## 3. Relational & Foreign Key Validation Audit

A full automated relational integrity run (`node scripts/validate-dataset-integrity.mjs`) verified:
- **Primary Key Uniqueness:** 100% unique IDs across all 10 tables.
- **Section -> Category References:** 26/26 valid; 0 orphans.
- **Product -> Section References:** 151/151 valid; 0 orphans.
- **ProductVariant -> Product References:** 167/167 valid; 0 orphans.
- **ProductImage -> Product References:** 151/151 valid; 0 orphans.
- **OptionItem -> OptionGroup References:** 20/20 valid; 0 orphans.
- **ProductOptionGroup -> Product & OptionGroup:** 30/30 valid; 0 orphans.
- **Test Data Exclusions:** Verified 0 occurrences of category `سبانخ` or branch `shoeib`.
