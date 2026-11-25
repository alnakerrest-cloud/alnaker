# 01 — Project Overview & Architecture

**Project:** Naqer Menu  
**Scope:** Architecture, Tech Stack, Domain Context, and Strategic Decisions  
**Target Audience:** Lead Developers, Software Architects, Technical Decision Makers  

---

## 1. رؤية المشروع وأهدافه (Vision & Objectives)

مشروع **Naqer Menu** صُمم ليكون الواجهة الرقمية الرسمية لسلسلة مطاعم **قرية الناقر** في مصر (فرعي جمصة السياحي ومدينة دمياط الجديدة). أهداف النظام الأساسية هي:
1. **قائمة طعام رقمية تفاعلية ثنائية اللغة (Arabic / English):** تقديم تجربة تصفح بصرية سلسة وسريعة للزبائن عبر مسح رمز الاستجابة السريعة (QR Code) أو تصفح الرابط المباشر، متوافقة كلياً مع جميع أحجام الشاشات الذكية.
2. **تجربة طلب ذكية ومباشرة (WhatsApp Ordering Pipeline):** تمكين الزبون من تخصيص طلبه (اختيار الأحجام، الصواني، درجات التسوية، الإضافات، والصوصات)، ثم تكوين طلب متكامل يتم توجيهه مباشرةً إلى رقم الواتساب الرسمي للفرع مع تفاصيل الفاتورة والموقع الجغرافي.
3. **لوحة تحكم إدارية شاملة ومستقلة (Self-hosted CMS Dashboard):** تمكين إدارة المطعم من التحكم الكامل بالأسعار، إتاحة أو إخفاء الأصناف، إنشاء عروض ترويجية متعددة الأشكال، إدارة صور الأطباق على السحابة، وضبط ساعات العمل وبيانات التواصل دون الحاجة للرجوع لمطورين.
4. **المرونة العالية في التخزين (Zero-Downtime Resilience):** دعم التشغيل الكامل بدون خادم قاعدة بيانات أثناء التطوير المحلي (Offline JSON Mock)، مع التحول التلقائي الصارم لقاعدة بيانات Neon PostgreSQL السحابية في بيئة الإنتاج الحية.

---

## 2. النطاق والمستخدمون المستهدفون (User Personas)

1. **الزبون / العميل (Public Customer):**
   - يتصفح المنيو عبر الهاتف داخل صالة المطعم أو من المنزل.
   - يختار اللغة (العربية افتراضية، مع إمكانية التبديل للإنجليزية).
   - يضيف الأطباق إلى السلة، يحدد الإضافات المطلوبة، ويؤكد الطلب عبر الواتساب.
2. **مدير المطعم / المالك (Owner / Super Admin):**
   - يمتلك صلاحيات مطلقة: إنشاء وتعديل الأصناف، ضبط الفروع، إنشاء حسابات الموظفين وصلاحياتهم، وضبط نسب الرسوم والضرائب، وإلغاء جلسات الموظفين.
3. **مشرف العمليات والمحتوى (Editor / Manager):**
   - يدير المنيو، يحدث الأسعار، ينشئ العروض الترويجية، ويرفع الصور الجديدة.
4. **موظف استقبال وتجهيز الطلبات (Orders Staff):**
   - يتابع تدفق الطلبات، يغير حالات الطلبات (مستلم، قيد التجهيز، خرج للتوصيل، مكتمل)، ويتحقق من فواتير الزبائن.

---

## 3. المكدس التقني المعتمد (Approved Tech Stack)

| الطبقة (Layer) | التقنية (Technology) | الإصدار (Version) | الغرض وسبب الاختيار |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.4.5` (Turbopack) | أداء فائق في الـ SSR والـ Static Generation، دعم Server Actions الأصلي، وسرعة البناء. |
| **Runtime & Language**| Node.js / TypeScript | Node `20+` / TS `5.9.0` | كتابة شيفرة آمنة من الأخطاء النوعية (Type-safe) وموحدة عبر العميل والخادم. |
| **UI & Styling** | React 19 + Modern CSS | React `19.1.0` | واجهات تفاعلية حديثة، استجابة سريعة للموبايل بدون مكتبات CSS ضخمة تبطئ التحميل. |
| **Database** | Neon PostgreSQL | Serverless v16 | قاعدة بيانات سحابية متقدمة تدعم Serverless Pooling وتفصل الـ Compute عن الـ Storage. |
| **ORM & Data Layer** | Prisma 7 + `@prisma/adapter-pg` | `7.10.1` | إدارة الـ Schema وإنشاء عميل متوافق تماماً مع Serverless Pooling واتصالات Neon. |
| **Media Hosting** | Cloudinary API | `2.5.1` | استضافة ومعالجة صور الأطباق السحابية وتوليد روابط سريعة ومحسنة (WebP/AVIF). |
| **Authentication** | Custom Session Store + bcryptjs | `3.0.2` | تشفير كلمات المرور بـ 12 Salt Rounds، وإدارة جلسات مخزنة كـ Hash في قاعدة البيانات. |
| **Validation** | Zod | `4.6.7` | التحقق الصارم من مدخلات النماذج والـ API Requests في الواجهة والخلفية. |
| **Hosting & Edge** | Vercel Serverless | Edge/Node Lambda | استضافة عالمية بدون خوادم ثابتة، مدمجة مباشرة مع بيئة Next.js. |

---

## 4. المعمارية العامة للنظام (Architecture Overview)

```
                            [ Public Internet ]
                                     │
                                     ▼
                      [ Vercel Edge / CDN Proxy ]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │                                                   │
           ▼                                                   ▼
   [ /[locale] - Public Menu ]                     [ /admin - Admin Dashboard ]
   - MenuView SSR / Static Cache                   - Auth Guard (Ironclad Sessions)
   - Cart & Customization Drawer                   - Products / Categories Actions
   - WhatsApp Order Payload Engine                 - Offers & Promos Engine
   - Content Version Realtime Sync                 - User RBAC & Branch Settings
           │                                                   │
           └─────────────────────────┬─────────────────────────┘
                                     │
                                     ▼
                          [ Application Logic ]
                ├── lib/persistence-mode.ts (Strict Boundary)
                ├── lib/prisma.ts (Neon Client Singleton + Pooling)
                └── lib/local-db-engine.ts (Offline Dev Engine Only)
                                     │
                    ┌────────────────┴────────────────┐
                    │ (Production: VERCEL=1)          │ (Local Dev: Offline)
                    ▼                                 ▼
         [ Neon PostgreSQL Pooler ]        [ Local JSON Mock / Overlay ]
         - Branch / Category / Product     - backup-naqer-verified.json
         - Offer / OrderStore / Users      - local-db-overlay.json
```

---

## 5. هيكل المجلدات والملفات الرئيسية (Directory Structure)

```text
naqer-menu/
├── app/                              # Next.js App Router
│   ├── [locale]/                     # الواجهة العامة متعددة اللغات (/ar, /en)
│   │   ├── account/                  # شاشة حساب العميل وسجل طلباته
│   │   ├── orders/                   # صفحة متابعة الطلب النشط
│   │   ├── qr/                       # مولد رموز الاستجابة السريعة للمطعم
│   │   ├── receipt/[orderNumber]/    # الفاتورة الإلكترونية القابلة للمشاركة
│   │   ├── layout.tsx                # المخطط العام، الخطوط، وتنسيقات RTL/LTR
│   │   └── page.tsx                  # صفحة المنيو التفاعلية الرئيسية
│   ├── admin/                        # لوحة التحكم الإدارية
│   │   ├── (shell)/                  # المسارات المحمية بإطار التحكم الموحد
│   │   │   ├── addons/               # إدارة مجموعات الإضافات والخيارات
│   │   │   ├── branches/             # إدارة الفروع وساعات العمل وأرقام الهواتف
│   │   │   ├── categories/           # إدارة أقسام المنيو والترتيب
│   │   │   ├── dashboard/            # نظرة عامة وإحصائيات سريعة
│   │   │   ├── images/               # إدارة الصور وربطها بالأطباق
│   │   │   ├── offers/               # إدارة وتفعيل العروض والخصومات
│   │   │   ├── order-settings/       # تبديل وضع المنيو (عرض فقط / طلب مباشر)
│   │   │   ├── orders/               # متابعة ومعالجة الطلبات الحية
│   │   │   ├── products/             # إدارة الأصناف، الأسعار، والأحجام
│   │   │   ├── settings/             # الإعدادات العامة لقرية الناقر والضريبة
│   │   │   └── users/                # إدارة المشرفين، الأدوار، وكلمات المرور
│   │   ├── login/                    # شاشة تسجيل دخول المسؤول
│   │   └── change-password/          # شاشة فرض تغيير كلمة المرور للمستخدمين الجدد
│   └── api/                          # واجهات RESTful Backend APIs
│       ├── admin/                    # مسارات API خاصة بالعمليات الإدارية
│       ├── checkout/                 # إنشاء ومعالجة الطلب وتجهيز رسالة الواتساب
│       ├── customer/                 # مسارات العميل (المفضلة، العناوين، الجلسة)
│       └── content-version/          # بصمة المنيو لتحديث أجهزة العملاء لحظياً
├── backups/                          # النسخ الاحتياطية المعتمدة للمشروع
│   └── backup-naqer-verified.json    # النسخة الاحتياطية الكاملة (151 صنف معتمد)
├── data/                             # البيانات الثابتة والمخازن المحلية للتطوير
│   ├── menu.ts                       # المصدر المرجعي للترجمة الإنجليزية
│   ├── local-db-overlay.json         # طبقة التعديلات المحلية (Offline Dev Only)
│   └── users/                        # مخزن حسابات التطوير المحلي
├── lib/                              # مكتبات ووحدات النظام المشتركة
│   ├── generated/prisma/             # عميل Prisma المولد رسمياً
│   ├── auth.ts                       # التحقق من جلسات المشرفين وصلاحيات الـ RBAC
│   ├── customer-session.ts           # جلسة العميل المجهولة (بدون إيميل/كلمة سر)
│   ├── database-url.ts               # حل وتأمين الروابط وضبط SSL لـ Neon
│   ├── local-db-engine.ts            # محرك قاعدة البيانات المحلي (للتطوير بدون نت)
│   ├── menu-db.ts                    # استعلامات المنيو ودمج النصوص الإنجليزية
│   ├── orders-store.ts               # تخزين ومعالجة الطلبات في PostgreSQL
│   ├── persistence-mode.ts           # الحارس المعماري الصارم لمنع الكتابة المحلية بالإنتاج
│   ├── prisma.ts                     # الـ Singleton الموحد لاتصالات Neon
│   └── users-store.ts                # إدارة بيانات وحسابات وجلسات المشرفين
├── prisma/                           # تهيئة قاعدة البيانات
│   ├── schema.prisma                 # نموذج قاعدة البيانات الشامل
│   └── migrations/                   # سجل تعديلات وهجرة الجداول (SQL Migrations)
└── scripts/                          # أدوات وسكربتات الإدارة، الفحص، والتحقق
```

---

## 6. أهم القرارات المعمارية التاريخية (Key Architectural Decisions)

1. **الاعتماد على العربية أولاً (Arabic-First Schema):**
   - قرار معتمد: قاعدة بيانات PostgreSQL تخزن النصوص والأسماء باللغة العربية حصراً لضمان دقة وسرعة البحث المحلي. النصوص الإنجليزية يتم استدعاؤها ديناميكياً من `data/menu.ts` بالربط عبر المفاتيح المستقرة (`slug` و `nameAr`).
2. **استئصال الكتابة المحلية في السيرفرلس (Elimination of EROFS):**
   - قرار معتمد: في بيئة الإنتاج على Vercel، نظام الملفات `/var/task` للقراءة فقط. تم إنشاء [lib/persistence-mode.ts](file:///e:/real%20projects/naqer-menu/lib/persistence-mode.ts) لمنع استخدام `LocalDbEngine` في الإنتاج نهائياً وتوجيه 100% من العمليات لـ Neon PostgreSQL.
3. **الجلسات المشفرة بدون حالة عميل (Stateless Hashed Session Token):**
   - بدلاً من تخزين بيانات المشرف في كوكيز JWT غير قابلة للإلغاء الفوري، يتم توليد رمز عشوائي قوي مشفر بـ Cryptographic Hash في الكوكيز ومطابقته مع جدول `Session` في قاعدة البيانات، مما يسمح بإلغاء جلسة أي مشرف فورياً في أي لحظة.
4. **تكامل الطلبات عبر الواتساب (WhatsApp Direct Protocol):**
   - نظراً لطبيعة السوق المحلي في منطقتي جمصة ودمياط، تم اعتماد تدفق طلب هجين: العميل يجمع الطلب وتخصيصاته في المتصفح، ويتم تسجيل نسخة مدققة ومحصنة في قاعدة بيانات `OrderStore`، ثم فتح تطبيق WhatsApp مع نص مهيأ بدقة يحتوي رقم الطلب وتفاصيل الأصناف وعنوان العميل.
