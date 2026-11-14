# 14 — دليل حل المشكلات والأخطاء الشائعة (Troubleshooting & Known Resolutions)

يوثق هذا الدليل المشاكل التقنية الحقيقية والتحديات الهندسية التي تمت مواجهتها وحلها بنجاح خلال مراحل تطوير، تدقيق، وتصليد نظام «ناقر منيو» (Naqer Menu). يهدف هذا السجل إلى تزويد أي مطور حالي أو مستقبلي بالحلول الموثقة والمباشرة عند ظهور أي أعراض مشابهة.

---

## 1. جدول المشكلات التشخيصي السريع (Diagnostic Matrix)

| العَرَض (Symptom) | السبب الجذري (Root Cause) | الحل والآلية المعتمدة (Resolution) |
| :--- | :--- | :--- |
| خطأ `DATABASE_URL is not set` أثناء بناء المشروع `npm run build` | قيام Next.js 16 بفحص المسارات ومحاولة تهيئة Prisma أثناء تجميع المسارات الثابتة قبل توفر متغيرات البيئة. | تحويل تهيئة `prisma` في `lib/prisma.ts` إلى نمط **Lazy Proxy** بحيث لا يتم استدعاء قاعدة البيانات إلا عند طلب استعلام فعلي. |
| بطء خفيف (1-2 ثانية) أو خطأ اتصال مؤقت بعد خمول الموقع | دخول معالج Neon Compute المجاني في وضع الإسبات (Scale-to-zero) لتوفير الموارد. | تغليف استعلامات قاعدة البيانات بدالة إعادة المحاولة الذكية `withDbRetry` في `lib/prisma-retry.ts` لتكرار المحاولة تلقائياً. |
| خطأ توافق الحزم عند ترقية Zod إلى الإصدار 4 | حدوث تعارض في الأنواع بين الإصدار الجديد وبعض الواجهات التي تعتمد على `zod v3`. | استخدام جسر التوافق الرسمي `zod/v3` للحفاظ على استقرار الفحص ومنع الثغرة الأمنية GHSA-mrhx-c7xc-m3w5 بنجاح. |
| أخطاء في تمرير المتغيرات والأقواس في PowerShell على Windows | قيام PowerShell بتجريد علامات التنصيص المزدوجة ومحاولة تفسير نصوص JSON. | تغليف الوسائط بعلامات تنصيص مفردة خارجية ومزدوجة داخلية واستخدام `$env:VARIABLE="value"`. |
| فشل اختبار Playwright: `strict mode violation: locator('text=...') resolved to multiple elements` | تكرار النص العربي في كل من زر الشريحة (Tab Button) وعنوان القسم الرئيسي (Section Heading). | تخصيص المحدد البرمجي بدقة، مثل: `page.locator('button:has-text("...")').first()`. |
| ظهور أصناف تجريبية تبدأ بـ `ZZ` في قاعدة بيانات الإنتاج | بقايا بيانات اختبارية من دورات فحص سابقة. | إلغاء تفعيل السجلات المعنية بأمان داخل معاملة ذرية (Atomic Transaction) دون حذفها فيزيائياً لضمان سلامة العلاقات. |

---

## 2. دراسات حالة وحلول تفصيلية (Detailed Case Studies)

### المشكلة 1: خطأ بناء Next.js عند غياب `DATABASE_URL` (Build-Time Lazy Prisma Initialization)

* **الأعراض:**
  عند تنفيذ أمر البناء على Vercel أو في بيئة CI/CD لا تحتوي على رابط قاعدة البيانات الحقيقي أثناء خطوة التجميع:
  ```text
  Error: Failed to collect configuration for /api/content-version
  [cause]: Error: DATABASE_URL is not set at lib/prisma.ts:17:32
  ```
* **التحليل الهندسي:**
  في Next.js 16، تقوم عملية البناء بتقييم وتجميع ملفات المسارات (Route Handlers) لقراءة الإعدادات الثابتة مثل `dynamic = 'force-dynamic'`. وكان ملف `lib/prisma.ts` ينشئ كائن الاتصال فور تحميل الملف (Eager Module Evaluation)، مما يسبب انهيار التجميع إن لم يكن المتغير متوفراً لحظتها.
* **الحل المنفذ:**
  تمت إعادة صياغة `lib/prisma.ts` ليعتمد على نمط **Proxy** الذي يؤجل إنشاء اتصال Prisma حتى لحظة تنفيذ أول دالة أو استعلام فعلي (Lazy Initialization):
  ```typescript
  // lib/prisma.ts
  export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
      const client = getOrCreateClient();
      const value = (client as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  });
  ```
  هذا التعديل يتيح اكتمال خطوة `next build` محلياً وسحابياً دون أي انقطاع.

---

### المشكلة 2: إدارة الإسبات السحابي لـ Neon (Neon Cold Starts & Retry Logic)

* **الأعراض:**
  عند فتح الموقع لأول مرة بعد ساعات من الخمول، قد يفشل أول اتصال بقاعدة البيانات بخطأ `Connection terminated unexpectedly` أو يتأخر الرد.
* **التحليل الهندسي:**
  تعتمد خطة Neon المجانية على ميزة إسبات الحوسبة (Scale-to-zero) لتوفير التكاليف، ويحتاج الخادم إلى ما بين ثانية إلى ثانيتين للاستيقاظ واستقبال الاتصالات مجدداً.
* **الحل المنفذ:**
  تم بناء وحدة مساعدة `withDbRetry` في `lib/prisma-retry.ts` تقوم باعتراض أخطاء الاتصال الناتجة عن إسبات الخادم وإعادة المحاولة مرتين تلقائياً مع فاصل زمني تصاعدي (Exponential Backoff):
  ```typescript
  export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      if (retries > 0 && isConnectionError(err)) {
        await sleep(500);
        return withDbRetry(fn, retries - 1);
      }
      throw err;
    }
  }
  ```

---

### المشكلة 3: تنظيف البيانات التجريبية بطريقة غير هدامة (Non-Destructive Safe Deactivation)

* **الأعراض:**
  وجود 15 سجلاً تجريبياً تبدأ بـ `ZZ` في قاعدة البيانات ناتجة عن اختبارات قديمة (7 منتجات، 4 تصنيفات، 4 فروع).
* **التحليل الهندسي:**
  حذف السجلات فيزيائياً بواسطة `DELETE` قد يؤدي إلى كسر المفاتيح الخارجية، تشويه سجلات التدقيق التاريخية (Audit Logs)، أو حذف صور بالخطأ إن وُجدت علاقات متتالية (Cascading Deletes).
* **الحل المنفذ:**
  تم تنفيذ عملية تنظيف آمنة وغير هدامة بتعيين خاصية `isAvailable = false` و `isActive = false` فقط داخل معاملة ذرية موثقة في `scripts/deactivate-zz-records.mjs`. تم الحفاظ على كافة البيانات التاريخية وسجلات التدقيق مع اختفاء تام لكافة السجلات التجريبية من واجهات الزوار والمشرفين.
