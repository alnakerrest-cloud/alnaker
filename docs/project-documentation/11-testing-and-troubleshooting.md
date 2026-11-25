# 11 — Testing, Verification, & Troubleshooting Guide

**Project:** Naqer Menu  
**Scope:** Automated Test Suites, Local vs Production Invariants, and Post-Mortem Analysis  
**Target Audience:** QA Engineers, Software Testers, Reliability Engineers  

---

## 1. منظومة الفحص والاختبار (Testing Frameworks)

يحتوي المشروع على حزم اختبار وتحقق متعددة المستويات:

1. **فحص الأنواع الصارم (Static Type Checking):**
   ```bash
   npm run typecheck
   ```
   يفحص كافة أنواع TypeScript والواجهات البرمجية عبر التطبيق والـ Server Actions والـ Prisma Models.
2. **فحص بناء بيئة الإنتاج (Production Build Compilation):**
   ```bash
   npm run build
   ```
   يتحقق من قدرة Next.js على تصدير الصفحات الثابتة والديناميكية وضمان عدم وجود أخطاء في الـ SSR.
3. **حزمة اختبار حراس بيئة الإنتاج (Persistence Invariants Suite):**
   ```bash
   node scripts/verify-persistence-guards.mjs
   npx tsx scripts/verify-production-invariants.mjs
   ```
   تتحقق من أن نظام الملفات لا يُمس في بيئة الإنتاج، وأن أي فشل لقاعدة البيانات يرمي خطأ صريح ولا يسجل نجاحاً وهمياً.

---

## 2. تحليل الأخطاء التاريخية الكبرى وحلولها (Historical Post-Mortems)

### الحادثة 1: انهيار إنشاء العروض والمنتجات بخطأ `EROFS` (Digest 1376294436)
- **الأعراض:** عند محاولة المشرف إضافة عرض جديد في صفحة `/admin/offers/new`، تفشل العملية بـ HTTP 500 وظهور `Minified React error #441` أو خطأ في الـ Admin Error Boundary.
- **السبب الجذري:** كان التطبيق في الإنتاج يفوض العمليات إلى `LocalDbEngine` في غياب تعيين صريح لـ `USE_BACKUP_DATA=false`. عند استدعاء `saveOverlay()` حاول المحرك إنشاء ملف مؤقت في `/var/task/data/local-db-overlay.json...tmp`. وبما أن نظام تشغيل Vercel Serverless يمنع الكتابة على حزمة الكود (`read-only file system`)، انهار التنفيذ بـ `EROFS`.
- **الحل النهائي المعتمد في الـ Commit `94887ff9`:**
  - إنشاء [lib/persistence-mode.ts](file:///e:/real%20projects/naqer-menu/lib/persistence-mode.ts).
  - إجبار `shouldUseLocalBackup()` على إرجاع `false` في أي بيئة إنتاج أو سيرفرلس.
  - وضع حراس `assertNotProduction` في كل دوال الكتابة المحلية.
  - إرسال 100% من العمليات مباشرة لقاعدة بيانات Neon PostgreSQL.

### الحادثة 2: الإقلاع البارد لقاعدة بيانات Neon وانقطاع الاتصال (Prisma P1001)
- **الأعراض:** عند زيارة لوحة التحكم أو المنيو بعد فترة خمول طويلة للمطعم في الليل، كان يظهر خطأ `Can't reach database server`.
- **السبب:** ميزة الـ Auto-Suspend في خوادم Neon المجانية أو التجريبية تعلق الـ Compute بعد 5 دقائق من الخمول، فيستغرق استيقاظ الخادم 2 إلى 4 ثوانٍ تسبق انتهاء مهلة الاتصال الافتراضية للـ Driver.
- **الحل:**
  - رفع مهلة الاتصال في بركة الاتصال إلى `connectionTimeoutMillis: 15_000` (15 ثانية).
  - تفعيل `keepAlive: true` في إعدادات عميل `pg.Pool` في [lib/prisma.ts](file:///e:/real%20projects/naqer-menu/lib/prisma.ts).
  - إضافة دالة إعادة محاولة ذكية للأخطاء الشبكية المؤقتة.

---

## 3. قائمة التحقق بعد النشر (Post-Deployment Verification Checklist)

بعد نشر أي تحديث على رابط الإنتاج `https://alnaker.vercel.app`:

- [ ] افتح المتصفح وتأكد من عمل الصفحة الرئيسية باللغة العربية (`/ar`) والإنجليزية (`/en`).
- [ ] اضغط على عدة أقسام في شريط التنقل وتأكد من سلاسة التمرير وعرض الأطباق والصور.
- [ ] أضف طبقاً إلى السلة، خصص الحجم، وافتح درج السلة.
- [ ] سجل الدخول بحساب المشرف وافتح لوحة التحكم `/admin/dashboard`.
- [ ] افتح صفحة إنشاء العروض `/admin/offers/new` وتأكد من تحميل قائمة الفروع والمنتجات بدون أي انهيار في الـ Error Boundary.
- [ ] راجع سجلات Vercel Runtime Logs للتأكد من عدم وجود أي خطأ Digest جديد.
