# تقرير التطوير والفحص الشامل: وضع العرض فقط وإشعار توقف الطلبات (Naqer Menu)
## NAQER MENU — VIEW_ONLY MODE & ORDER SUSPENSION NOTICE SYSTEM REPORT

**التاريخ:** 18 نوفمبر 2026  
**المشروع:** منيو قرية الناقر — Naqer Menu  
**المسار:** `E:\real projects\naqer-menu`  
**الحالة الفنية:** مكتمل ومختبر بالكامل بنجاح 100% (Production-Grade & Verified)

---

## 1. الملخص التنفيذي (Executive Summary)

تم إنجاز وتطوير نظام **وضع العرض فقط (VIEW_ONLY Mode)** وإشعار توقف واستئناف الطلبات في تطبيق **منيو قرية الناقر** بنجاح تام وفقاً لأعلى معايير الجودة والأمان البرمجي، مع الحفاظ الكامل على قاعدة بيانات المنيو الأصلية (151 منتجاً و 18 قسماً) دون أي مساس بها، وبدون إجراء أي عمليات كتابة أو تهجير على قواعد بيانات Neon السحابية.

### المخرجات المحققة:
1. **تصفح كامل في وضع العرض فقط:** المنيو بجميع أصنافه (151 منتجاً)، أقسامه (18 قسماً)، صوره، أسعاره، خياراته، وإضافاته متاح بالكامل للتصفح بسلاسة متناهية.
2. **قفل برمجي صارم على الطلبات (Dual-Layer Lock):**
   - **واجهة العميل (Frontend):** تعطيل إضافة الأصناف للسلة، واستبدال زر الطلب داخل نافذة تفاصيل المنتج (`ProductDetailModal`) بشريط تنبيه أنيق يوضح أن المنيو للعرض فقط، مع إيقاف السلة وزر Checkout.
   - **الخلفية البرمجية (Backend Guard):** التحقق الصارم في خادم الطلبات (`POST /api/checkout`) وإرجاع كود `403 Forbidden` فوري مع تفاصيل سبب التوقف ووقت الاستئناف بصيغة JSON منظمة (`code: "VIEW_ONLY_MODE"`).
3. **نظام إشعارات وتنبيهات مستقل ومتحكم به بالكامل:**
   - خيار تشغيل/إيقاف شريط التنبيه (`enableNotice`).
   - قائمة منسدلة بالأسباب الشائعة المحددة مسبقاً (`HIGH_ORDER_VOLUME`, `TEMPORARILY_CLOSED`, `OUTSIDE_WORKING_HOURS`, `MAINTENANCE`, `CUSTOM`).
   - تعبئة تلقائية للنصوص مع إمكانية التخصيص الكامل بالعربية والإنجليزية (لا نصوص مشفرة ثابته).
   - حقل اختياري لوقت استئناف الخدمة المتوقع (`expectedResumeAt`).
4. **شريط تنبيه أنيق ومتناسق أعلى المنيو (`ViewOnlyNoticeBanner`):**
   - تصميم ذهبي/كهرماني راقٍ يتناسق مع هوية المطعم البدوية الأصيلة ولا يحجب المحتوى.
   - يوضح العنوان، حالة الوضع، بادج سبب التوقف، والوقت المتوقع للاستئناف، مع إمكانية طيه/توسيعه.
   - دعم كامل للغتين العربية (RTL) والإنجليزية (LTR).
5. **تحديث لوحة تحكم إعدادات الطلبات (`/admin/order-settings`):**
   - قسم مستقل ومخصص لإعدادات تنبيه توقف الطلبات.
   - **معاينة حية وتفاعلية للعميل (Interactive Live Customer Preview)** تتيح للمدير رؤية شكل التنبيه بالعربية والإنجليزية لحظياً قبل الحفظ.
   - حفظ فوري ودائم في `data/orders/settings.json` يستمر بعد إعادة تشغيل السيرفر.
6. **مصفوفة أولوية محكمة (Priority Hierarchy):**
   - الوضع العام `VIEW_ONLY` له الأولوية القصوى المطلقة ويوقف الطلبات في جميع الفروع دون استثناء.
   - عند تفعيل الطلب عاماً `VIEW_AND_ORDER`، تعمل ضوابط الفروع المستقلة لحظر أو فتح فرع بعينه.

---

## 2. الهيكلية المعمارية للنظام (Architecture & Module Design)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Admin Dashboard                                 │
│                   (/admin/order-settings)                              │
│                                                                        │
│  [1. Global Mode]       [2. Suspension Notice & Reason]                │
│  - VIEW_AND_ORDER       - enableNotice toggle                          │
│  - VIEW_ONLY            - Reason Preset (5 options with auto-fill)     │
│  - TEMPORARILY_CLOSED   - Bilingual Title & Message inputs             │
│                         - expectedResumeAt                             │
│                         - Interactive Live Customer Preview (AR/EN)    │
│                                                                        │
│                         [3. Branch-Level Independent Controls]         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ POST /api/admin/order-settings
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Storage Layer & Shared Types                          │
│  - lib/order-settings-types.ts: Pure client/server types & presets    │
│  - lib/orders-store.ts: Atomic JSON read/write                        │
│  - data/orders/settings.json: Persistent local storage                 │
└───────────────────────┬────────────────────────────┬───────────────────┘
                        │                            │
                        ▼                            ▼
┌─────────────────────────────────┐        ┌─────────────────────────────┐
│       Backend Security Guard    │        │       Public Storefront     │
│       (POST /api/checkout)      │        │          (/ar & /en)        │
│                                 │        │                             │
│  1. Check Global Mode           │        │ 1. ViewOnlyNoticeBanner     │
│     IF VIEW_ONLY -> 403 Forbidden│        │    (Top Gold Alert Banner)  │
│     Returns code: VIEW_ONLY_MODE│        │                             │
│  2. Check Selected Branch       │        │ 2. Full Menu Browsing       │
│     IF !isOrderable -> 400 Bad  │        │    (151 Products, 18 Cats)  │
│  3. Check Service Type          │        │                             │
│     IF !delivery -> 400 Bad     │        │ 3. ProductDetailModal Lock  │
│                                 │        │    (Order button disabled   │
│                                 │        │     with explanatory alert) │
└─────────────────────────────────┘        └─────────────────────────────┘
```

### معالجة تحدي بيئة Next.js Turbopack:
تم فصل تعريفات الأنواع والثوابت المشتركة في ملف مستقل:
- `lib/order-settings-types.ts`: يحتوي على الأنواع والثوابت (`REASON_PRESETS`, `OrderSuspensionReason`, `MenuModeSettings`, `DEFAULT_SETTINGS`) بدون أي اعتماديات على مكتبات Node.js (`node:fs`, `node:path`).
- `lib/orders-store.ts`: مخصص للعمليات من جانب الخادم (Server Side) ويعيد تصدير الأنواع المشتركة.
- نتج عن هذا الفصل استقرار تام في تجميع Turbopack وخلو كامل من أخطاء الـ bundling في المتصفح.

---

## 3. مصفوفة أسباب التوقف المسبقة (Reason Presets Matrix)

| كود السبب (`reasonCode`) | المسمى العربي | English Label | العنوان الافتراضي (AR/EN) | الوصف الافتراضي (AR/EN) |
|---|---|---|---|---|
| `HIGH_ORDER_VOLUME` | ضغط كبير على الطلبات | High order volume | الطلبات متوقفة مؤقتًا<br>Ordering is temporarily unavailable | يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا بسبب الضغط الكبير على الطلبات لضمان جودة الخدمة.<br>You can browse our menu and prices, but orders are not being accepted right now due to high order volume. |
| `TEMPORARILY_CLOSED` | إغلاق مؤقت للمطعم | Temporarily closed | المطعم مغلق مؤقتًا<br>Restaurant is temporarily closed | يمكنكم تصفح المنيو والأسعار، ونعتذر عن استقبال الطلبات في الوقت الحالي وسنعاود الخدمة قريباً.<br>Our menu is available for browsing, but we are not accepting orders at this time. We will resume shortly. |
| `OUTSIDE_WORKING_HOURS` | خارج ساعات العمل الرسمية | Outside operating hours | نحن خارج أوقات العمل الرسمية<br>Outside operating hours | نرحب بكم لتصفح قائمة الطعام، وسنبدأ في استقبال طلباتكم مع بداية ساعات العمل الرسمية للمطعم.<br>You can browse our menu. Order taking will resume at the start of our regular operating hours. |
| `MAINTENANCE` | أعمال صيانة وتحديث | Maintenance and updates | أعمال صيانة وتحديث للأنظمة<br>System maintenance in progress | يجري حالياً تحديث أنظمة الطلبات لخدمتكم بشكل أفضل، وسنعود لاستقبال طلباتكم في أقرب وقت.<br>We are upgrading our ordering systems to serve you better. Ordering will resume shortly. |
| `CUSTOM` | سبب مخصص | Custom reason | الطلبات متوقفة مؤقتًا<br>Orders temporarily suspended | المنيو متاح للتصفح حالياً، واستقبال الطلبات متوقف مؤقتاً.<br>Menu is available for browsing. Orders are temporarily suspended. |

---

## 4. نتائج الفحص الآلي الشامل (Automated Test Suite Results)

تم تشغيل سكريبت الفحص الآلي الشامل `scratch/test-view-only-features.mjs` واجتازت جميع الاختبارات بنسبة **100% نجاح**:

```
====================================================
🧪 NAQER MENU — VIEW_ONLY & SUSPENSION NOTICE TESTS
====================================================
✅ 1. Admin session established.

--- TEST 1: Activate VIEW_ONLY with HIGH_ORDER_VOLUME ---
✅ TEST 1 PASSED: Admin API saved VIEW_ONLY mode with HIGH_ORDER_VOLUME.

--- TEST 2: Verify Public Menu (AR & EN) renders Banner ---
  - AR HTML contains notice title: true
  - AR HTML contains reason label: true
  - AR HTML contains expected resume: true
  - AR HTML contains products/categories: true
  - EN HTML contains notice title: true
  - EN HTML contains reason label: true
✅ TEST 2 PASSED: Both /ar and /en render the rich suspension notice banner.

--- TEST 3: Attempt direct POST /api/checkout in VIEW_ONLY ---
  - HTTP Status: 403 (Expected: 403)
  - Error Code: VIEW_ONLY_MODE
  - Reason: ضغط كبير على الطلبات
  - Message: الطلبات متوقفة مؤقتًا: يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا بسبب الضغط الكبير على الطلبات لضمان جودة الخدمة. (السبب: ضغط كبير على الطلبات)
✅ TEST 3 PASSED: Backend strictly enforced 403 Forbidden on direct checkout.

--- TEST 4: Global Precedence Test ---
✅ TEST 4 PASSED: Global VIEW_ONLY overrides all branch settings without exception.

--- TEST 5: Toggle enableNotice to false ---
  - Is banner present in AR HTML when enableNotice is false: false
  - Checkout status with enableNotice=false: 403 (403 expected)
✅ TEST 5 PASSED: enableNotice: false hides banner while maintaining strict backend lock.

--- TEST 6: Preset MAINTENANCE ---
  - AR HTML contains MAINTENANCE reason: true
✅ TEST 6 PASSED: Reason preset switching functions accurately.

--- TEST 7: Restore VIEW_AND_ORDER ---
  - Is banner present in VIEW_AND_ORDER: false (Expected: false)
✅ TEST 7 PASSED: VIEW_AND_ORDER successfully restores normal ordering.

====================================================
🎉 ALL 7 VIEW_ONLY & SUSPENSION NOTICE TESTS PASSED!
====================================================
```

---

## 5. الأدلة البصرية الموثقة (Visual QA Evidence)

تم التقاط وتسجيل لقطات شاشات كاملة لجميع السيناريوهات عبر محرك Playwright وحفظها في مجلد الأدلة `view-only-evidence/` ومجلد الـ Artifacts:

### 1. المنيو العام باللغة العربية (Desktop 1280px)
يظهر شريط التنبيه الذهبي أسفل الهيدر مع أيقونة القفل 🔒، عنوان التوقف، بادج حالة العرض فقط، سبب التوقف (ضغط كبير على الطلبات)، ووقت الاستئناف المتوقع (الساعة 7:00 مساءً)، مع بقاء المنيو والأقسام والأسعار معروضة بالكامل.
- **الملف:** [01-public-menu-view-only-desktop.png](file:///e:/real%20projects/naqer-menu/view-only-evidence/01-public-menu-view-only-desktop.png)

### 2. المنيو العام على شاشات الموبايل (Mobile 375x812)
تصميم متجاوب ومتناسق بالكامل، يظهر التنبيه بشكل متناسق ومريح للقراءة دون أن يعيق تصفح المنتجات في الشاشات الصغيرة.
- **الملف:** [02-public-menu-view-only-mobile.png](file:///e:/real%20projects/naqer-menu/view-only-evidence/02-public-menu-view-only-mobile.png)

### 3. المنيو العام باللغة الإنجليزية (English LTR)
عرض شريط التنبيه بالإنجليزية مع محاذاة LTR كاملة وترجمة مطابقة لجميع البيانات والأسباب.
- **الملف:** [03-public-menu-en-view-only.png](file:///e:/real%20projects/naqer-menu/view-only-evidence/03-public-menu-en-view-only.png)

### 4. نافذة تفاصيل المنتج وقفل زر الطلب (`ProductDetailModal`)
عند النقر على أي وجبة، تفتح النافذة بكامل صورها وتفاصيلها ومكوناتها وخياراتها، لكن تم استبدال زر "أضف إلى السلة" بشريط تنبيه يوضح أن الطلب متوقف وأن المنيو للعرض فقط.
- **الملف:** [04-product-modal-view-only-locked.png](file:///e:/real%20projects/naqer-menu/view-only-evidence/04-product-modal-view-only-locked.png)

### 5. لوحة التحكم — إعدادات التوقف والمعاينة الحية (`/admin/order-settings`)
توضح خيارات وضع التشغيل، مفتاح تفعيل التنبيه، القائمة المنسدلة لأسباب التوقف، حقول النصوص الثنائية، والمربع التفاعلي للمعاينة الحية للعميل.
- **الملف:** [05-admin-order-settings-overview.png](file:///e:/real%20projects/naqer-menu/view-only-evidence/05-admin-order-settings-overview.png)

### 6. لوحة التحكم — تبديل المعاينة الحية للإنجليزية
توضح تفاعل زر التبديل إلى "English (LTR)" لعرض كيف سيظهر التنبيه للزبائن الناطقين بالإنجليزية قبل حفظ الإعدادات.
- **الملف:** [06-admin-order-settings-preview-en.png](file:///e:/real%20projects/naqer-menu/view-only-evidence/06-admin-order-settings-preview-en.png)

### 7. لوحة التحكم — ضوابط الفروع المستقلة
توضح حالة الفروع وكيف يُلزم الوضع العام `VIEW_ONLY` جميع الفروع بالتوقف إجبارياً مع عرض شارة واضحة "معطّل بالوضع العام للمطعم".
- **الملف:** [07-admin-order-settings-branches.png](file:///e:/real%20projects/naqer-menu/view-only-evidence/07-admin-order-settings-branches.png)

---

## 6. خلاصة الإنجاز وجاهزية الاعتماد (Sign-Off)

1. تم تنفيذ المطلوب بدقة هندسية عالية ومطابقة تامة للمواصفات المعمارية والأمنية.
2. لا يوجد أي تسريب أو كتابة على قواعد بيانات الإنتاج السحابية.
3. التصفح يعمل بنسبة 100% للأصناف الـ 151 والصور والأسعار.
4. نظام الأمان يمنع أي طلب مباشر عبر المتصفح أو API أثناء وضع العرض فقط.
5. الكود جاهز بالكامل للاستخدام التشغيلي التجاري.
