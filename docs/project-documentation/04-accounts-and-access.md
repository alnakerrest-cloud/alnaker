# 04 — Accounts, Roles, & Access Management Guide

**Project:** Naqer Menu  
**Scope:** Authentication, Role-Based Access Control (RBAC), and Session Lifecycle  
**Target Audience:** System Administrators, Restaurant Managers, HR Operations  

---

## 1. نموذج الصلاحيات (Role-Based Access Control - RBAC)

يعتمد نظام لوحة التحكم في **Naqer Menu** على أربعة أدوار إدارية محددة بدقة في نموذج `AdminRole` داخل [prisma/schema.prisma](file:///e:/real%20projects/naqer-menu/prisma/schema.prisma):

| الدور (Role) | الوصف العام (Description) | الصفحات والوظائف المتاحة | العمليات الممنوعة |
| :--- | :--- | :--- | :--- |
| **`OWNER`** (المالك / المدير العام) | أعلى مستوى صلاحية في النظام. يمتلك التحكم المطلق في كافة العمليات البرمجية والإدارية. | كافة صفحات لوحة التحكم بدون استثناء: المنتجات، الأقسام، الصور، الفروع، الإعدادات، العروض، المستخدمين، الطلبات، وسجلات التدقيق (Audit Logs). | لا توجد قيود. |
| **`ADMIN`** (مدير النظام والعمليات) | إدارة تشغيلية كاملة للمطعم. | جميع الصفحات باستثناء تعديل بيانات حسابات الـ `OWNER` أو إلغاء جلسات المالك. | لا يمكنه ترقية مستخدم لدور أعلى من دوره، ولا يمكنه حذف سجلات النظام. |
| **`EDITOR`** (مشرف المحتوى والمنيو) | مخصص لمسؤولي إدخال وتعديل الأطباق والأسعار. | المنتجات (`/admin/products`)، الأقسام (`/admin/categories`)، الصور (`/admin/images`)، والعروض (`/admin/offers`). | ممنوع من دخول إعدادات الفروع، الإعدادات العامة للضريبة، إدارة المستخدمين، وإدارة الطلبات. |
| **`ORDERS_STAFF`** (موظف تجهيز واستقبال الطلبات) | مخصص لطاقم المطبخ، الكاشير، وموظفي الدليفري. | صفحة إدارة الطلبات الحية (`/admin/orders`) وتفاصيل كل طلب وتحديث حالته التشغيلية. | ممنوع تماماً من تعديل الأسعار، المنيو، الأقسام، الإعدادات، أو رؤية بيانات المستخدمين الآخرين. |

---

## 2. مصفوفة الوصول إلى المسارات (Route Access Matrix)

| المسار (Path) | الغرض | `OWNER` | `ADMIN` | `EDITOR` | `ORDERS_STAFF` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `/admin/dashboard` | الصفحة الرئيسية والإحصائيات | مسموح | مسموح | مسموح | محول تلقائياً إلى `/admin/orders` |
| `/admin/products/*` | إضافة/تعديل الأصناف والأسعار | مسموح | مسموح | مسموح | **محظور (403)** |
| `/admin/categories/*`| إدارة أقسام المنيو والترتيب | مسموح | مسموح | مسموح | **محظور (403)** |
| `/admin/offers/*` | إنشاء وتعديل العروض والخصومات | مسموح | مسموح | مسموح | **محظور (403)** |
| `/admin/addons/*` | مجموعات الخيارات والإضافات | مسموح | مسموح | مسموح | **محظور (403)** |
| `/admin/images` | رفع وحذف صور الأطباق السحابية | مسموح | مسموح | مسموح | **محظور (403)** |
| `/admin/orders/*` | استعراض وتحديث حالات الطلبات | مسموح | مسموح | **محظور (403)** | مسموح |
| `/admin/order-settings`| تبديل وضع المنيو (عرض/طلب مباشر)| مسموح | مسموح | **محظور (403)** | **محظور (403)** |
| `/admin/branches/*` | بيانات الفروع وأرقام الواتساب | مسموح | مسموح | **محظور (403)** | **محظور (403)** |
| `/admin/settings` | الإعدادات العامة والضريبة والخدمة | مسموح | مسموح | **محظور (403)** | **محظور (403)** |
| `/admin/users/*` | إنشاء وتعديل وإلغاء حسابات الموظفين| مسموح | مسموح (لمستواه) | **محظور (403)** | **محظور (403)** |
| `/admin/audit` | سجل العمليات الإدارية والتدقيق | مسموح | مسموح | **محظور (403)** | **محظور (403)** |

---

## 3. دورة حياة الجلسات والأمان (Session Lifecycle)

1. **تسجيل الدخول (`POST /admin/login`):**
   - يدخل المستخدم البريد الإلكتروني وكلمة المرور.
   - يتم تطبيق محدد محاولات الدخول (Rate Limiting) لمنع هجمات التخمين (Brute-Force).
   - يتم التحقق من تطابق كلمة المرور عبر `bcrypt.compare` مقابل الـ `passwordHash` المحفوظ.
2. **إنشاء الجلسة (Database-Backed Session):**
   - يتم توليد رمز عشوائي آمن بطول 64 حرفاً.
   - يتم حفظ تجزئة الرمز (`tokenHash` عبر SHA-256) في جدول `Session` في PostgreSQL، مع وقت انتهاء صلاحية محدد (افتراضياً 7 أيام).
   - يُرسل الكوكي إلى المتصفح بخواص: `HttpOnly`, `Secure`, `SameSite=Lax`.
3. **التحقق من تغيير كلمة المرور الإجباري (`mustChangePassword`):**
   - إذا تم إنشاء حساب الموظف بواسطة المشرف وعُلِّمت خانة `mustChangePassword=true`، يتم تحويل الموظف فور تسجيل الدخول إلى صفحة `/admin/change-password` ويُمنع من استخدام النظام حتى يقوم بتعيين كلمة مرور خاصة به.
4. **تسجيل الخروج وإلغاء الجلسات (Revocation):**
   - عند الضغط على "تسجيل الخروج"، يتم حذف سجل الجلسة فوراً من جدول `Session`، مما يبطل الكوكي حتى لو حاول أحد إعادة استخدامه.
   - يستطيع المالك من صفحة `/admin/users` الضغط على "إلغاء كافة الجلسات النشطة" لموظف معين لطرده فوراً من جميع الأجهزة.

---

## 4. جدول الحسابات الإدارية المكتشفة وتصنيف تدقيقها (Audited Account Inventory)

> [!IMPORTANT]
> **ملاحظة أمان وتدقيق:**  
> - كلمات المرور وهاشات bcrypt لا تُعرض أبداً في أي وثيقة.
> - نظراً لعدم إجراء استعلامات كتابة أو اتصال مباشر بقاعدة بيانات الإنتاج أثناء التدقيق، تم تصنيف كافة الحسابات المكتشفة محلياً بأنها **NOT VERIFIED IN PRODUCTION** بانتظار التأكيد الميداني من المالك.

| البريد الإلكتروني (Email) | الاسم الظاهر (Display Name) | الدور (Role) | مصدر الاكتشاف | تغيير كلمة المرور عند أول دخول | تصنيف حالة التدقيق الصارمة (Audit Status) |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `admin@naqer-restaurant.local` | إبراهيم شعيب (مدير عام المطعم) | `OWNER` | `data/users/users.json` | لا | **NOT VERIFIED IN PRODUCTION** (Verified by Local Source) |
| `orders-staff@naqer-restaurant.local`| موظف استقبال وتجهيز الطلبات | `ORDERS_STAFF` | `data/users/users.json` | لا | **NOT VERIFIED IN PRODUCTION** (Verified by Local Source) |
| `manager@naqer.com` | مشرف العمليات والتشغيل | `ADMIN` | `data/users/users.json` و `credentials/` | نعم | **NOT VERIFIED IN PRODUCTION** (Requires Owner Confirmation) |
| `orders@naqer.com` | إدارة وتجهيز الطلبات | `ORDERS_STAFF` | `data/users/users.json` و `credentials/` | نعم | **NOT VERIFIED IN PRODUCTION** (Requires Owner Confirmation) |
| `cashier@naqer.com` | أمين الصندوق (الكاشير) | `ORDERS_STAFF` | `data/users/users.json` و `credentials/` | نعم | **NOT VERIFIED IN PRODUCTION** (Requires Owner Confirmation) |
| `admin@naqer-menu.local` | حساب التهيئة الافتراضي | `OWNER` | `scripts/seed-admin.mjs` | نعم | **NOT VERIFIED IN PRODUCTION** (Seed Script Template Only) |
