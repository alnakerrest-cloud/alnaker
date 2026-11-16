# NAQER Product Options & Notes Audit (Menu-Driven)

**Generated (local):** 2026-11-16  
**Data source inspected:** Database snapshot via `scripts/dump-options-audit.ts` (reads Prisma `Product`, `ProductOptionGroup`, `OptionGroup`, `OptionItem`, variants, categories/sections). Also cross-referenced `data/menu.ts` (static menu copy) and current UI plumbing (`lib/menu-db.ts`, `lib/menu-view.ts`, `components/ProductDetailModal.tsx`, cart/checkout/receipt/WA flow).

## Non-negotiable rules (applied)
- **Menu/DB is source of truth for what exists.** No invented generic add-ons were added by this audit; options shown to customers are only those **attached to each product in the database** (OptionGroup assignments). If a product has no assigned groups, the UI shows no customization block (see implementation).  
- **Do not assume same options across a category.** Each product row below lists its own assigned groups.  
- **“NEEDS BUSINESS CONFIRMATION”** means the DB has no attached option groups (or the group set looks ambiguous) and no explicit justification exists in code beyond admin assignment — product remains orderable as-is with variants/notes only unless confirmed.  
- **Existing catalog preserved.** No product/category/price/image/menu-content changes were made in this audit step.

## How options/notes flow (current code)
- Public menu: `lib/menu-db.ts` maps `Product.optionGroups` (active groups with active options) into `VItem.optionGroups`; `ProductDetailModal.tsx` renders required/multi rules, prices, and item notes (`t.itemNotesLabel` / `t.itemNotesPlaceholder`).  
- Cart: `CartContext` + `lib/cart.ts` store `selectedOptions` and `notes` per line (`buildCartItemId` includes option IDs).  
- Checkout API: `app/api/checkout/route.ts` verifies options against current menu data, recalculates prices server-side, stores `selectedOptions`/`notes` on `OrderItem`.  
- Receipt (HTML/JSON): `app/[locale]/receipt/[orderNumber]/route.ts` displays add-ons and notes when present.  
- Dashboard orders list: `app/admin/(shell)/orders/page.tsx` shows recent orders (basic list); detailed line items/options are persisted in DB and visible via API/receipt flow (full order detail UI not fully expanded in this page — noted in acceptance report).  
- WhatsApp: `lib/cart.ts` / checkout message builders include add-ons and notes where present.

## Summary counts (from clean dump)
- **Products reviewed (DB dump): 42** (all products returned by dump query).  
- **Products with ≥1 attached OptionGroup:** 28 (66.7%).  
- **Products with 0 attached OptionGroup:** 14 (33.3%) — marked **NEEDS BUSINESS CONFIRMATION** for “should any customization exist?” unless implied elsewhere (none shown in DB).  
- **Customer-facing tray numbering:** removed in `components/MenuView.tsx` (no `platter-num` overlay). Internal IDs unchanged.

## Per-product audit (every product in dump)

| # | Product (AR) | Category (AR) | Section | Variants (from DB) | Attached OptionGroups (DB) | Relevant selectable notes (UI) | Current display (expected) | Ambiguity / action |
|---|--------------|---------------|---------|-------------------|----------------------------|-------------------------------|----------------------------|-------------------|
| 1 | كباب (ضاني أو بتلو) | المشويات | بالوزن | ثلث كيلو 395; نصف كيلو 570 | **حجم المشويات** (required, single): سنجل 0, ميديام +35, عائلة +70. **نوع الأرز** (optional, single): بسمتي أبيض 0, بسمتي مع زعفران +15, مندي (مع زيت) +10. **درجة الحرارة** (optional, single): عادية/حارة/حارة جداً 0. **إضافات** (optional, single in DB: maxSelect 1): خبز إضافي +5, صوص طحينة +3, صوص ثوم +3, سلطة خضراء صغيرة +8 | Item notes textarea (“ملاحظات إضافية على الصنف”) always available when modal open | Product modal shows these 4 groups + notes + quantity + price calc (base variant + option prices). | DB shows **إضافات** as `maxSelect 1` (single-select) in dump — if business wants multiple extras, admin must change group to multi with min/max; **NEEDS BUSINESS CONFIRMATION** if multi-select intended. |
| 2 | وجبة الأطفال | الوجبات | (none) | (single variant per dump row) | **(none)** | Item notes only | No customization groups shown; direct add to cart with notes/quantity/variant as defined. | No explicit options in DB/menu text shown in dump — **NEEDS BUSINESS CONFIRMATION** only if menu implies choices not modeled (e.g. side choices) not present in data. |
| 3 | موزة فتة (ضاني أو بتلو) | الشرقي | (none) | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION** if any customization expected. |
| 4 | نفر لحم مندي (ضاني) | المندي | (none) | — | **حجم المشويات**, **نوع الأرز**, **درجة الحرارة**, **إضافات** (same set as row 1 in dump) | Item notes only | Groups shown as attached. | Same as row 1 re: **إضافات** single vs multi — **NEEDS BUSINESS CONFIRMATION**. Also verify these groups are semantically correct for “نفر لحم مندي (ضاني)” (menu says mandi portions) — **NEEDS BUSINESS CONFIRMATION** if mismatched. |
| 5 | ضاني | المأكولات البدوية | ٥٥٠ جم | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |
| 6 | صينية الوحوش | الصواني | (none) | — | **نوع الصينية** (optional, single): عادية 0, مكرونة مبكبكة +40, أرز مندي +30. **نوع الأرز** (optional, single): بسمتي أبيض 0, بسمتي مع زعفران +15, مندي (مع زيت) +10. **إضافات** (optional, single in DB): same extras set as row 1 | Item notes only | Tray options shown as attached. | **إضافات** single-select in DB — **NEEDS BUSINESS CONFIRMATION** if multi desired. |
| 7 | شمبري | المأكولات البدوية | ٥٥٠ جم | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |
| 8 | صينية الملوك | الصواني | (none) | — | **نوع الصينية**, **نوع الأرز**, **إضافات** | Item notes only | As above. | Same extras note. |
| 9 | وجبة توفير | الوجبات | (none) | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |
| 10 | ورقة لحمة | الشرقي | (none) | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |
| 11 | ريش (ضاني أو بتلو) | المشويات | بالوزن | ثلث 440; نصف 640 | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Extras single-select in DB — **NEEDS BUSINESS CONFIRMATION**. Semantic fit — **NEEDS BUSINESS CONFIRMATION**. |
| 12 | نفر لحم مندي (كندوز) | المندي | (none) | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Same notes as row 4/11. |
| 13 | صينية الصحاب | الصواني | (none) | — | **نوع الصينية, نوع الأرز, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 14 | وجبة كفتة مشوية | الوجبات | (none) | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |
| 15 | موزة ضاني مندي | المندي | (none) | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Same as row 4. |
| 16 | ديك بلدي | المأكولات البدوية | ٥٥٠ جم | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |
| 17 | فلتو | المشويات | بالوزن | ثلث 375; نصف 540 | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 18 | وجبة شيش طاووق | الوجبات | (none) | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |
| 19 | صينية العيلة | الصواني | (none) | — | **نوع الصينية, نوع الأرز, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 20 | موزة بتلو مندي | المندي | (none) | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Same as row 4. |
| 21 | شيش طاووق | المشويات | بالوزن | ثلث 215; نصف 320 | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 22 | طرب | المشويات | بالوزن | ثلث 315; نصف 450 | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 23 | صينية الحبايب | الصواني | (none) | — | **نوع الصينية, نوع الأرز, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 24 | ضلع مندي (ضاني) | المندي | (none) | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Same as row 4. |
| 25 | وجبة الأكيل | الوجبات | (none) | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |
| 26 | وجبة دجاج مندي | المندي | (none) | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Same as row 4 (note semantic fit). |
| 27 | كفتة | المشويات | بالوزن | ثلث 305; نصف 430 | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 28 | صينية مشاوي | الصواني | (none) | — | **نوع الصينية, نوع الأرز, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 29 | مشكل | المشويات | بالوزن | ثلث 325; نصف 470 | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 30 | أرز مندي سادة | المندي | (none) | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Groups likely inappropriate for plain rice — **NEEDS BUSINESS CONFIRMATION / fix in admin** (remove wrong assignments). |
| 31 | صينية العمدة | الصواني | (none) | — | **نوع الصينية, نوع الأرز, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 32 | صينية الحرب العالمية | الصواني | (none) | — | **نوع الصينية, نوع الأرز, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 33 | دقوس | المندي | (none) | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Groups almost certainly inappropriate for a sauce — **NEEDS BUSINESS CONFIRMATION / fix in admin** (remove wrong assignments). |
| 34 | كبدة ضاني | المأكولات البدوية | ٦٠٠ جم | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION** (menu shows style note “بدوي أو اسكندراني” in `data/menu.ts` — not modeled as DB option groups here; if required, must be added as proper OptionGroup assigned only to this product). |
| 35 | ميكس جريل | المشويات | أطباق مشوية | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 36 | موزة ضاني مشوية | المشويات | أطباق مشوية | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 37 | موزة ضاني | المأكولات البدوية | ٦٠٠ جم | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION** (rice choice implied in menu text “أرز أحمر أو مكرونة مبكبكة” in `data/menu.ts` — **not** present as DB option groups for this product in dump; if required by business, add targeted OptionGroup). |
| 38 | ضلع (ضاني أو بتلو) | المشويات | أطباق مشوية | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Extras single-select — **NEEDS BUSINESS CONFIRMATION**. |
| 39 | سجق مشوي | المشويات | أطباق مشوية | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Likely wrong groups for sausage plate — **NEEDS BUSINESS CONFIRMATION / fix in admin**. |
| 40 | وجبة نصف فرخة مشوية | المشويات | أطباق مشوية | — | **حجم المشويات, نوع الأرز, درجة الحرارة, إضافات** | Item notes only | Groups shown. | Verify relevance (size/spice/rice/extras) — **NEEDS BUSINESS CONFIRMATION**. |
| 41 | تحميرة | المأكولات البدوية | (none) | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |
| 42 | طبق مبكبكة | المأكولات البدوية | (none) | — | **(none)** | Item notes only | No groups. | **NEEDS BUSINESS CONFIRMATION**. |

## Notes on “product-specific notes” (clickable predefined notes)
- **Current implementation:** the customer-facing UI provides a free-text **item notes** field (`itemNotesLabel` / `itemNotesPlaceholder`) in `ProductDetailModal.tsx` and general order notes in cart/checkout flows. There is **no DB-driven predefined note chips/tags** system exposed on the public product modal in the inspected codebase beyond option groups and free text.  
- **Recommendation (no code change in this audit):** if predefined notes are required (e.g. “بدون بصل”), implement via either (a) a dedicated OptionGroup named for notes assigned per product, or (b) a future `ProductNoteTemplate` model — both must be menu-driven and assigned selectively. Until then, record as **NEEDS BUSINESS CONFIRMATION** per product where predefined notes are expected.

## High-priority data/assignment issues flagged (from audit)
1. **“إضافات” group is single-select in DB (`maxSelect: 1`)** for all assignments observed — contradicts common “extras/add-ons” expectation (multi). **NEEDS BUSINESS CONFIRMATION**; fix in Admin → Add-ons if multi is intended.
2. **Likely incorrect group assignments** (examples): `أرز مندي سادة` (row 30) has grill/mandi-style groups attached; `دقوس` (33) sauce has heavy groups; `سجق مشوي` (39) may be mismatched. These are **data issues in DB/admin assignments**, not missing UI features — **must be corrected in admin (or via controlled DB change) after business confirmation**. Do **not** “fix” by inventing options in code.
3. **Menu implies choices not modeled as DB option groups** for some Bedouin items in `data/menu.ts` text (e.g. `كبدة ضاني` “بدوي أو اسكندراني”, `موزة ضاني` “أرز أحمر أو مكرونة مبكبكة”). These appear with **no option groups** in dump → **NEEDS BUSINESS CONFIRMATION** whether to add targeted groups per product.
4. **Grills/Mandi trays: semantic fit of “حجم المشويات/نوع الأرز/درجة الحرارة/إضافات”** on some products (e.g. plain rice, certain mandi items) is questionable — **NEEDS BUSINESS CONFIRMATION** per business rules.

## Verification status for this audit artifact
- **Reviewed (data-backed):** All 42 products listed above with their actual DB variant counts and DB option-group attachments.  
- **Not verified by live browser here:** Whether every public card opens modal correctly for each of these 42 in a running app (requires running server + DB). Use this table as the checklist for QA.

## Files produced/updated by this audit step
- `NAQER_PRODUCT_OPTIONS_AUDIT.md` (this file) — **created/updated** in repo (see commit).  
- Temporary analysis artifacts under `scratch/` may exist locally; do not commit secrets. (If you want them excluded, add to `.gitignore` separately.)
