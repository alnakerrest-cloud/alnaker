# تقرير تطوير وتحديث تجربة طلب العميل (Customer Ordering Experience Upgrade)
## مشروع منيو قرية الناقر — Naqer Menu

**التاريخ:** 18 نوفمبر 2026  
**الإصدار:** Production-Ready Live Candidate (`v2.4.0`)  
**البيئة:** Local Isolated DB Overlay (`backup-naqer-verified.json`)  
**حالة الاختبارات:** ✅ 36/36 اختبار آلي ناجح بنسبة 100%

---

## 1. ملخص تنفيذي (Executive Summary)

تم بنجاح ترقية وتطوير **تجربة طلب العميل بالكامل** في مشروع منيو قرية الناقر لتضاهي كبرى منصات طلب الطعام العالمية (QR Ordering & Food Delivery Platforms)، مع الالتزام التام بالهوية الأصيلة لقرية الناقر والمحافظة الصارمة على سلامة البيانات:

1. **البيانات الأصلية محفوظة بنسبة 100%:** لم يتم إجراء أي مساس أو تعديل على الـ 151 منتجاً والـ 18 قسماً المعتمدة في `backup-naqer-verified.json`.
2. **صفر كتابة على السحابة:** لم يتم إجراء أي عمليات كتابة أو Migration على Neon Production أو Staging.
3. **أمان عالي لمنع التلاعب:** جميع الحسابات المالية، والتحقق من صلاحية الفروع والمنتجات، وحدود الخيارات الأدنى والأقصى، تتم على خوادم الـ Backend ولا يتم الوثوق بأسعار العميل إطلاقاً.
4. **تتبع مباشر وآمن للطلب:** صفحة تتبع حية للعميل برابط مشفر وتوكن غير قابل للتخمين (Verification Token) مع تحديث تلقائي كل 5 ثوانٍ لحالة الطلب.

---

## 2. تفاصيل المنظومات المطورة

### أولاً: نظام البحث الذكي والفلترة (Smart Search & Dynamic Filters)
* **بحث فوري مزدوج اللغة (AR & EN):**
  * محرك بحث فوري بدون أي تأخير (Zero Lag) يعتمد على `normalize` العربي والإنجليزي.
  * يبحث في: اسم المنتج، القسم، الوصف، والمكونات.
  * زر مسح البحث الفوري بنقرة واحدة (Clear) مع استعادة موضع التصفح.
* **التبويبات الديناميكية والفلاتر السريعة:**
  * **🍽️ الكل (All):** عرض كامل أصناف المنيو مصنفة حسب الأقسام.
  * **🔥 الأكثر طلباً (Most Ordered):** مبني حصرياً على إحصائيات الطلبات المؤكدة والمنفذة السابقة في `orders-store.json` (بدون أرقام وهمية).
  * **✨ المميز والجديد (Signature & New):** يبرز أطباق الناقر الحصرية والمميزة والأطباق التي تحمل شارات مميزة.
  * **✅ المتاح فقط (Available Only):** يفلتر الأطباق المتوفرة فوراً ويستبعد الأطباق المعطلة.
* **فلاتر الأسعار والترتيب:**
  * فلاتر نطاق الأسعار: أقل من 100 ج.م، 100 إلى 300 ج.م، أكثر من 300 ج.م.
  * الترتيب الفوري: السعر من الأقل للأعلى، السعر من الأعلى للأقل، الأكثر طلباً.
  * مزامنة حالة الفلاتر في الـ URL (`window.history.replaceState`) لضمان عدم فقدان الفلاتر عند الرجوع أو التحديث.
* **واجهة خالية من النتائج راقية (Polished Empty State):**
  * بطاقة تفاعلية توضح عدم وجود نتائج مع زر "إعادة ضبط الفلاتر وعرض المنيو" للعودة لكامل الأصناف فوراً.

---

### ثانياً: تخصيص المنتجات واستبعاد المكونات (Product Customization & Add-ons)
* **استبعاد المكونات التفاعلي (Interactive Ingredient Exclusion):**
  * يتيح للعميل استبعاد أي مكون من وجبته بنقرة واحدة (مثل: "بدون بصل"، "بدون شطة"، "بدون ممبار").
  * تصميم بصري واضح: شطب باللون الأحمر وعلامة `✕ بدون [المكون]`.
  * حفظ المكونات المستبعدة `removedIngredients` في كود الصنف بالسلة، وتمريرها في رسالة الواتساب، وإدراجها في إيصال وتفاصيل الطلب للداشبورد والمطبخ لمنع أي خطأ في التحضير.
* **خيارات وإضافات المنتجات (Option Groups & Addons):**
  * يدعم خيارات إجبارية واختيارية (`isRequired`).
  * يدعم خيارات فردية ومتعددة (`isMulti`).
  * فحص وفرض حدود الاختيار الأدنى والأقصى (`minSelect` / `maxSelect`) في الواجهة والـ Backend.
  * احتساب ديناميكي فوري للسعر الإجمالي: `(سعر الحجم + مجموع الإضافات) × الكمية`.
* **ملاحظات الصنف:**
  * حقل مخصص لكتابة أي تعليمات خاصة للشيف (مثل: "تسوية زيادة"، "أرز زيادة").

---

### ثالثاً: السلة الاحترافية والـ Checkout المقاوم للتلاعب
* **معرف الصنف المركب المستقر (`buildCartItemId`):**
  * تمييز الأصناف حسب: (معرف المنتج + الحجم + الإضافات المختارة + المكونات المستبعدة).
  * في حال اختيار نفس الصنف بنفس التخصيصات يتم دمج الكمية، أما في حال اختلاف التخصيصات (مثلاً: أحدهما بدون بصل والآخر عادي) يظلان كبندين منفصلين بالسلة.
* **استمرارية السلة عبر التحديث (LocalStorage Persistence):**
  * بقاء السلة حتى لو قام العميل بتحديث الصفحة أو التنقل.
  * مصالحة بيانات السلة (`reconcileCart`) لضمان صحة الأسعار وتطابقها مع المنيو.
* **منع التلاعب بالأسعار (Backend Price Recalculation):**
  * يقوم مسار `/api/checkout` بإعادة حساب سعر كل صنف وخياراته ورسوم التوصيل والخصومات استناداً لقاعدة البيانات الأصلية فقط.
  * التحقق الصارم من رقم الهاتف المصري (شبكات 010, 011, 012, 015).
  * قفل الطلبات فوراً في حال تفعيل وضع العرض فقط `VIEW_ONLY` أو الإغلاق المؤقت.

---

### رابعاً: نظام التتبع المباشر وحماية الخصوصية (Live Order Tracking & Token Guard)
* **حماية بيانات العميل برمز التحقق (Token Security):**
  * لا يمكن فتح صفحة التتبع `/ar/receipt/[orderNumber]` إلا بوجود `token` صالح تم إنشاؤه مشفراً من الخادم.
  * في حال محاولة فتح الصفحة بدون التوكن أو برمز غير صالح، تظهر صفحة حظر وصول أمني واضحة لمنع تخمين أرقام الطلبات أو تسريب بيانات العملاء.
* **التايم لاين الديناميكي التفاعلي (`OrderTrackingTimeline`):**
  * يوضح المراحل الست لدورة حياة الطلب:
    1. **قيد المراجعة (Pending Review):** الطلب مسجل وبانتظار اعتماد المطعم.
    2. **تم الاستلام (Received):** استلم المطعم تفاصيل الطلب.
    3. **تم التأكيد (Confirmed):** تم اعتماد الطلب رسمياً وإصدار الإيصال المعتمد وكود التحقق.
    4. **جاري التجهيز (Preparing):** الشيف يقوم بإعداد وتغليف الطلب في المطبخ.
    5. **جاهز / خرج للتوصيل (Ready / Out for Delivery):** الطلب في الطريق أو جاهز للاستلام.
    6. **تم التسليم (Delivered):** اكتمال الطلب بنجاح.
  * في حال الرفض أو الإلغاء، يظهر تنبيه بارز باللون الأحمر مع سبب الرفض الدقيق.
* **التحديث اللحظي التلقائي (Live Polling كل 5 ثوانٍ):**
  * شارة خضراء نابضة `🟢 مباشر (تحديث كل 5ث)` مع توقيت آخر تحديث.
  * توقف الاستعلام التلقائي فور وصول الطلب لحالته النهائية لتوفير الموارد.
  * عرض سجل أحداث الطلب الموثق زمنيًا (Audit Timeline History).

---

### خامساً: تكامل واتساب المعتمد (WhatsApp Click-to-Chat Integration)
* تنسيق رسالة واتساب أنيقة وموثوقة تتضمن:
  * رقم الطلب ونوعه والفرع المستهدف.
  * اسم العميل ورقم هاتفه وعنوان التوصيل المفصل.
  * قائمة الأصناف مع الأحجام والإضافات والمكونات المستبعدة بوضوح (`🚫 بدون: ...`).
  * المجموع الفرعي، الخصومات المطبقة، رسوم التوصيل، والإجمالي النهائي.
  * **رابط التتبع المباشر المشفر بالتوكن** لتمكين العميل وإدارة المطعم من متابعة الطلب بنقرة واحدة.
  * تنبيه شفاف بأن الطلب لا يعتبر مقبولاً نهائياً إلا بعد موافقة إدارة المطعم.

---

### سادساً: الصلاحيات وتكامل لوحة التحكم (Dashboard & RBAC Integration)
* **إدارة خيارات وإضافات المنتجات (`/admin/addons`):**
  * محصورة فقط لأدوار `OWNER` و `ADMIN`.
  * حظر موظفي الطلبات `ORDERS_STAFF` من التعديل مع رسالة رفض واضحة.
* **شاشة تفاصيل الطلبات في الداشبورد:**
  * عرض تخصيصات كل صنف وإضافاته والمكونات المستبعدة.
  * التحكم في تغيير حالة الطلب وتسجيل سبب الرفض/الإلغاء في السجل الزمني.

---

## 3. نتائج الاختبارات الآلية الشاملة (Automated Test Execution)

تم تنفيذ الجناح الاختباري `scratch/test-customer-ordering-experience.mjs`:

```
=======================================================
   NAQER MENU — CUSTOMER ORDERING EXPERIENCE QA SUITE   
=======================================================

👉 Test Group 1: Menu Data Source & Categories
  ✅ PASS: Menu mode API is responsive
  ✅ PASS: Arabic menu page renders with 200 OK
  ✅ PASS: Arabic menu contains brand name
  ✅ PASS: Arabic menu displays 'الأكثر طلباً' dynamic tab
  ✅ PASS: Arabic menu displays 'المميز والجديد' dynamic tab
  ✅ PASS: Arabic menu displays 'المتاح فقط' filter
  ✅ PASS: English menu page renders with 200 OK
  ✅ PASS: English menu displays 'Most Ordered' dynamic tab
  ✅ PASS: English menu displays 'Signature & New' tab

👉 Test Group 2: Customization & Add-on Option Groups
  ✅ PASS: Admin Option Groups page (/admin/addons) is accessible to OWNER/ADMIN
  ✅ PASS: ORDERS_STAFF is forbidden from managing Option Groups (/admin/addons)

👉 Test Group 3: Checkout Tamper-Resistance & Bounds
  ✅ PASS: Checkout rejects empty cart payload with 400
  ✅ PASS: Checkout rejects invalid phone number with 400

👉 Test Group 4: Order Creation with Ingredient Removal & Token
  ✅ PASS: Valid checkout creates order successfully with 200 OK
  ✅ PASS: Order number generated: ORD-20261118-7DCF18
  ✅ PASS: Order contains secure verificationToken
  ✅ PASS: Verification token has strong entropy (>= 32 chars)
  ✅ PASS: OrderItemRecord snapshots removedIngredients ('٦ أرباع فراخ مندي')
  ✅ PASS: WhatsApp message explicitly formats excluded ingredients ('بدون: ٦ أرباع فراخ مندي، ½ ك ضاني مندي')
  ✅ PASS: WhatsApp message contains direct verification tracking link with token

👉 Test Group 5: Live Order Tracking API Security & Lifecycle
  ✅ PASS: Tracking API rejects request without token with 401 Unauthorized
  ✅ PASS: Tracking API rejects invalid token with 403 Forbidden
  ✅ PASS: Tracking API returns order status when valid token is supplied
  ✅ PASS: Tracking data matches order number
  ✅ PASS: Initial order status is PENDING_WHATSAPP

👉 Test Group 6: Receipt Tracking Page Token Guard
  ✅ PASS: Receipt page blocks viewing customer details without valid token
  ✅ PASS: Receipt page loads successfully with valid token
  ✅ PASS: Receipt page embeds Live Order Tracking Timeline
  ✅ PASS: Receipt page itemizes excluded ingredients ('استبعاد مكونات')
  ✅ PASS: Receipt page shows '٦ أرباع فراخ مندي' in excluded ingredients

👉 Test Group 7: Admin Status Management & Timeline Audit
  ✅ PASS: Admin confirms order via PATCH /api/admin/orders/[id]/status
  ✅ PASS: Order status transitioned to CONFIRMED in live polling
  ✅ PASS: Order audit timeline includes CONFIRMED event with timestamp
  ✅ PASS: Admin transitions order to PREPARING
  ✅ PASS: Tracking API reflects PREPARING stage

👉 Test Group 8: Real Most-Ordered Product Calculation
  ✅ PASS: Orders store has verified confirmed orders

=======================================================
QA SUMMARY: 36 PASSED, 0 FAILED
=======================================================
```

---

## 4. الأدلة البصرية الموثقة (Visual Evidence)

تم التقاط الأدلة البصرية عبر أداة Playwright وتم حفظها في مسار الأدلة:

| الرقم | الملف | الوصف |
| :--- | :--- | :--- |
| **01** | `01-public-menu-filters-tabs.png` | واجهة المنيو مع تبويبات "الأكثر طلباً"، "المميز والجديد"، "المتاح فقط"، وفلاتر الأسعار والترتيب |
| **02** | `02-public-menu-instant-search.png` | محرك البحث الفوري السريع للأطباق والأقسام والمكونات بالعربية والإنجليزية |
| **03** | `03-product-modal-ingredient-exclusion.png` | نافذة الصنف التفاعلية مع شطب واستبعاد المكونات (`✕ بدون ...`) وتحديد الأحجام والإضافات |
| **04** | `04-cart-drawer-customized-items.png` | سلة التسوق مع إبراز الأصناف المخصصة والإضافات وقائمة المكونات المستبعدة |
| **05** | `05-order-tracking-live-timeline.png` | صفحة التتبع المباشر بمؤشر النبض اللحظي والتايم لاين سداسي المراحل |
| **06** | `06-order-tracking-token-denied.png` | حماية الخصوصية وحظر فتح بيانات الطلب دون التوكن الأصلي |
| **07** | `07-admin-addons-management.png` | لوحة إدارة خيارات وإضافات المنتجات (`/admin/addons`) مع حماية RBAC |
| **08** | `08-mobile-customer-ordering-375.png` | تجربة التتبع المباشر على شاشات الهواتف المحمولة (375px) بتصميم متجاوب وسلس |

---

## 5. قائمة التحقق للاعتماد (Final Acceptance Checklist)

- [x] البحث الفوري (Instant Search) فائق السرعة ويدعم العربية والإنجليزية في الاسم والقسم والوصف والمكونات.
- [x] تبويب "الأكثر طلباً" يعتمد على إحصائيات حقيقية من الطلبات المؤكدة والمنفذة السابقة.
- [x] تبويب "المميز والجديد" وفلتر "المتاح فقط" وفلاتر نطاقات الأسعار والترتيب.
- [x] واجهة خالية من النتائج (Empty State) مع زر استعادة وضبط الفلاتر بنقرة واحدة.
- [x] نافذة تخصيص الوجبات مع دعم استبعاد المكونات تفاعلياً (`removedIngredients`).
- [x] فرض حدود الخيارات الأدنى والأقصى (`minSelect`/`maxSelect`) في الواجهة والخادم.
- [x] منع دمج الأصناف المختلفة التخصيص في السلة وإبقاؤها كبنود منفصلة.
- [x] استمرارية السلة عبر الـ LocalStorage والتحقق منها عند الـ Checkout.
- [x] خادم الـ Checkout يعيد احتساب الأسعار ولا يثق بمدخلات العميل المالية.
- [x] صفحة تتبع مباشرة برابط مشفر وتوكن غير قابل للتخمين مع حظر الوصول غير المصرح.
- [x] تايم لاين مباشر يوضح دورة حياة الطلب مع تحديث تلقائي كل 5 ثوانٍ بدون إعادة تحميل.
- [x] رسالة واتساب واضحة تتضمن تفاصيل الطلب والمكونات المستبعدة ورابط التتبع.
- [x] حماية صلاحيات RBAC للأدمن والمدير مقابل موظف الطلبات.
- [x] خلو الكود من أي أخطاء برمجية (`npx tsc --noEmit` كود 0).
- [x] نجاح جميع الاختبارات الآلية (36/36 بنسبة 100%).
