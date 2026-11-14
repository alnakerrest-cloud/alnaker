# STAGING TEST SUITE INVENTORY

**Audit Date:** 2026-11-14T10:59:28.201Z  
**Repository:** `E:\real projects\naqer-menu`  
**Target Environment:** Isolated Neon Staging Database (`ep-soft-dawn-bdu5de43`)  
**Total Test Files:** 12  
**Total Test Cases:** 57  

---

## 1. Summary of Test Files & Scope

| # | Test File | Test Count | Primary Scope & Focus |
|---|-----------|------------|-----------------------|
| 1 | `tests/01-live-sync.spec.ts` | 6 | Dual-context LiveSync, real-time polling updates without page reload |
| 2 | `tests/02-crud.spec.ts` | 4 | Product CRUD, image management, form validation |
| 3 | `tests/03-responsive.spec.ts` | 2 | Mobile, tablet, and desktop responsive layouts & RTL rendering |
| 4 | `tests/04-security.spec.ts` | 4 | Access control, unauthenticated redirects, role isolation (OWNER vs EDITOR) |
| 5 | `tests/05-crud-acceptance.spec.ts` | 6 | Comprehensive end-to-end CRUD acceptance with visual verification |
| 6 | `tests/06-image-lifecycle.spec.ts` | 1 | Image upload, replacement, deletion, and Cloudinary lifecycle safety |
| 7 | `tests/07-interactive-cart.spec.ts` | 8 | Customer cart, item quantity, addon calculations, WhatsApp order format |
| 8 | `tests/08-addons-and-branches.spec.ts` | 6 | Branch selection, branch availability, addon groups and modifiers |
| 9 | `tests/09-card-layouts-and-offers.spec.ts` | 6 | Menu card display variants, badge rendering, promotional banners |
| 10 | `tests/10-live-offers-and-visual-fix.spec.ts` | 4 | Offer activation/deactivation synchronization and styling stability |
| 11 | `tests/11-financial-calculations.spec.ts` | 6 | Precision pricing, discounts, tax/rounding verification, order totals |
| 12 | `tests/12-final-release-smoke.spec.ts` | 4 | Fast smoke check across public routes, admin entry, and API endpoints |

---

## 2. Granular Test Case Inventory

| File | Line | Test Name | Mutation & Execution Profile |
|------|------|-----------|------------------------------|
| `01-live-sync.spec.ts` | L59 | ls-1 إنشاء منتج + فتح سياق جديد | DB Delete, DB Write, Auth / Session, Cleanup Routine, Browser Interaction |
| `01-live-sync.spec.ts` | L102 | ls-2 تعديل اسم منتج (قديم يختفي وجديد يظهر) | DB Delete, DB Write, Auth / Session, Cleanup Routine, Browser Interaction |
| `01-live-sync.spec.ts` | L138 | ls-3 تغيير السعر ينعكس وحده (تحقق مستقل عن الاسم) | DB Delete, DB Write, Auth / Session, Cleanup Routine, Browser Interaction |
| `01-live-sync.spec.ts` | L193 | ls-4 صورة المنتج: رفع → تظهر في Context A → حذف → تختفي (Cloudinary) | Cloudinary Mutation, DB Delete, DB Write, Auth / Session, Cleanup Routine, Browser Interaction |
| `01-live-sync.spec.ts` | L252 | ls-5 فئة: تغيير اسم ينعكس ثم يُعاد لأصله | DB Write, Auth / Session, Cleanup Routine, Browser Interaction |
| `01-live-sync.spec.ts` | L287 | ls-6 إعدادات: الوصف المختصر ينعكس ثم يُعاد لأصله | DB Write, Auth / Session, Cleanup Routine, Browser Interaction |
| `02-crud.spec.ts` | L13 | منتج: إنشاء/تعديل/variants/إخفاء/إظهار/حذف | DB Delete, DB Write, Auth / Session, Browser Interaction |
| `02-crud.spec.ts` | L59 | فئة: إنشاء/تعديل/ترتيب/إخفاء/صورة/حذف | DB Delete, DB Write, Auth / Session, Browser Interaction |
| `02-crud.spec.ts` | L124 | فرع: إنشاء/تعديل/حذف | DB Delete, DB Write, Auth / Session, Browser Interaction |
| `02-crud.spec.ts` | L160 | إعدادات + شعار: تعديل حقل (مع الإعادة) ورفع/استبدال/إزالة الشعار | Cloudinary Mutation, DB Delete, DB Write, Auth / Session, Browser Interaction |
| `03-responsive.spec.ts` | L56 | المنيو العام + صفحة الدخول عبر كل المقاسات | Auth / Session, Browser Interaction |
| `03-responsive.spec.ts` | L77 | لوحة التحكم عبر كل المقاسات | Auth / Session, Browser Interaction |
| `04-security.spec.ts` | L27 | صفحات الإدارة محميّة: تحويل إلى صفحة الدخول بدون جلسة | Auth / Session, Browser Interaction |
| `04-security.spec.ts` | L35 | دخول ببيانات خاطئة: رسالة خطأ بلا جلسة | DB Write, Auth / Session, Browser Interaction |
| `04-security.spec.ts` | L45 | نقطة content-version لا تكشف إلا بصمة بلا معنى | Read-Only / UI Verification |
| `04-security.spec.ts` | L53 | لا أسرار في HTML العام أو صفحة الدخول أو الحزمة | Auth / Session, Browser Interaction |
| `05-crud-acceptance.spec.ts` | L43 | PRODUCTS: create/edit/desc/price/variants/image/hide/delete + public sync | Cloudinary Mutation, DB Delete, DB Write, Auth / Session, Browser Interaction |
| `05-crud-acceptance.spec.ts` | L146 | CATEGORIES: create/edit(name+desc)/order/hide/image/delete | Cloudinary Mutation, DB Delete, DB Write, Auth / Session, Browser Interaction |
| `05-crud-acceptance.spec.ts` | L204 | SETTINGS: edit tagline -> public reflects -> restore | DB Write, Auth / Session, Browser Interaction |
| `05-crud-acceptance.spec.ts` | L225 | BRANCHES: shared-menu verified; test branch CRUD; real branches untouched | DB Write, Auth / Session, Browser Interaction |
| `05-crud-acceptance.spec.ts` | L266 | MEDIA LIBRARY: /admin/images lists assets + usage links (incl. PDF-derived) | Auth / Session, Browser Interaction |
| `05-crud-acceptance.spec.ts` | L280 | AUTH: logout/protected/session-persistence/OWNER-only-delete | DB Delete, DB Write, Auth / Session, Cleanup Routine, Browser Interaction |
| `06-image-lifecycle.spec.ts` | L95 | failed upload keeps old · successful upload does not disturb old · public reflects primary · delete cleans Cloudinary (no orphan) | Cloudinary Mutation, DB Delete, DB Write, Auth / Session, Cleanup Routine, Browser Interaction |
| `07-interactive-cart.spec.ts` | L16 | 1. Card Archetypes are interactive and tags button does not trigger modal | Browser Interaction |
| `07-interactive-cart.spec.ts` | L50 | 2. Product Detail Modal on Desktop (open, variant selection, qty, notes, escape, close) | DB Write, Browser Interaction |
| `07-interactive-cart.spec.ts` | L88 | 3. Mobile Bottom Sheet on 390px Viewport | Browser Interaction |
| `07-interactive-cart.spec.ts` | L106 | 4. Add to Cart, Persistence across reload, and Floating Bar calculation | Browser Interaction |
| `07-interactive-cart.spec.ts` | L137 | 5. Cart Drawer Management: Quantity, Delete, and Clear with Confirmation | DB Delete, Browser Interaction |
| `07-interactive-cart.spec.ts` | L189 | 6. WhatsApp Order Formatting, Number Normalization & Safe Link Generation | DB Write, Browser Interaction |
| `07-interactive-cart.spec.ts` | L234 | 7. English Locale Rendering (/en) & LTR WhatsApp Message | Browser Interaction |
| `07-interactive-cart.spec.ts` | L268 | 8. Viewport Overflow Verification across 7 Breakpoints with Floating Cart | Browser Interaction |
| `08-addons-and-branches.spec.ts` | L58 | 1. Admin Add-ons Management: create, list, and verify in DB | DB Write, Auth / Session, Browser Interaction |
| `08-addons-and-branches.spec.ts` | L120 | 2. Customer Combobox search, selection, min/max limits & live price in modal | DB Write, Browser Interaction |
| `08-addons-and-branches.spec.ts` | L173 | 3. Cart item customization isolation & editing an item | DB Write, Browser Interaction |
| `08-addons-and-branches.spec.ts` | L240 | 4. Branch Selection & WhatsApp message generation per branch | Browser Interaction |
| `08-addons-and-branches.spec.ts` | L289 | 5. Branch ordering availability warning disables checkout | DB Write, Auth / Session, Browser Interaction |
| `08-addons-and-branches.spec.ts` | L347 | 6. Appetizers & Drinks visual repair: 64x64 thumbnail, non-wrapping price, line-clamped description, 0px overflow | Browser Interaction |
| `09-card-layouts-and-offers.spec.ts` | L78 | 1. Full Card Layout Audit: vertical hierarchy, no overlap, zero horizontal overflow across 6 viewports | Browser Interaction |
| `09-card-layouts-and-offers.spec.ts` | L143 | 2. Admin Offers: create inactive-by-default offer, list, toggle active, and verify DB | DB Write, Auth / Session, Browser Interaction |
| `09-card-layouts-and-offers.spec.ts` | L222 | 3. Public Offers Experience: promotional section, strike-through price, modal, cart badge & discount breakdown | Browser Interaction |
| `09-card-layouts-and-offers.spec.ts` | L291 | 4. Branch Targeting: discount applies only to eligible branch, dynamic recalculation on switch | DB Write, Auth / Session, Browser Interaction |
| `09-card-layouts-and-offers.spec.ts` | L356 | 5. Inactive / Expired Offers: graceful hiding of promotional section when no active offers | Auth / Session, Browser Interaction |
| `09-card-layouts-and-offers.spec.ts` | L388 | 6. Admin Offers Deletion: delete test offer with confirmation and cascade targets | DB Delete, Auth / Session, Browser Interaction |
| `10-live-offers-and-visual-fix.spec.ts` | L54 | 1. Visual Audit of all 4 card archetypes across 7 viewports + Arabic & English | Browser Interaction |
| `10-live-offers-and-visual-fix.spec.ts` | L123 | 2. Admin Dashboard: create "عرض اختبار الناقر" with 10% discount and upload banner | Cloudinary Mutation, DB Delete, DB Write, Auth / Session, Cleanup Routine, Browser Interaction |
| `10-live-offers-and-visual-fix.spec.ts` | L206 | 3. Public Menu: verify "عروض قرية الناقر" section appears, modal details, and cart discount | Browser Interaction |
| `10-live-offers-and-visual-fix.spec.ts` | L292 | 4. Toggle deactivation from Dashboard: hides from public menu, re-enabling restores it | Auth / Session, Browser Interaction |
| `11-financial-calculations.spec.ts` | L14 | 1. Base price parsing and numeric normalization | Read-Only / UI Verification |
| `11-financial-calculations.spec.ts` | L22 | 2. Single item price calculation without addons or discounts | Read-Only / UI Verification |
| `11-financial-calculations.spec.ts` | L42 | 3. Variant and multiple add-ons accumulation | Read-Only / UI Verification |
| `11-financial-calculations.spec.ts` | L67 | 4. Discount and promotional offer reduction arithmetic | Read-Only / UI Verification |
| `11-financial-calculations.spec.ts` | L93 | 5. Prevent negative price and invalid quantities in cart reconciliation | Read-Only / UI Verification |
| `11-financial-calculations.spec.ts` | L157 | 6. Consistency between calculated totals and formatted WhatsApp message | Read-Only / UI Verification |
| `12-final-release-smoke.spec.ts` | L9 | 1. Bilingual Navigation (Arabic & English) and Branch Access | Browser Interaction |
| `12-final-release-smoke.spec.ts` | L33 | 2. Product Browsing, Card Modal, and Cart Checkout Flow | Browser Interaction |
| `12-final-release-smoke.spec.ts` | L67 | 3. Admin Authentication, Dashboard Access and Protected Routes | Auth / Session, Browser Interaction |
| `12-final-release-smoke.spec.ts` | L81 | 4. LiveSync Smoke Test with Temporary Isolated Draft Product | Direct SQL, DB Delete, DB Write, Cleanup Routine, Browser Interaction |

---

## 3. Staging Execution Safety Constraints

1. **Isolation Enforced:** All tests execute against `http://127.0.0.1:3002` connected strictly to the Neon staging database (`ep-soft-dawn-bdu5de43`).
2. **Production Immunity:** Production project `ep-withered-bread-bemwq8ns` is completely inaccessible and protected by hard assertions in `tests/staging-env.ts`.
3. **Deterministic Cleanup:** All mutating tests prefix temporary entities with identifiable test markers (`ZZ-` or unique timestamp tokens) and execute teardown routines upon completion.
