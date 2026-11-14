# 11 — النشر والإطلاق في بيئة الإنتاج (Production Deployment & Operations)

يوثق هذا الدليل إجراءات نشر وإطلاق تطبيق «ناقر منيو» (Naqer Menu) على منصة Vercel مع قاعدة بيانات Neon، وربط النطاق المخصص، وفحص الجاهزية التشغيلية بعد النشر.

---

## 1. متطلبات بيئة الإنتاج الأساسية (Production Prerequisites)

1. حساب مفعل على منصة **Vercel** (مربوط بمستودع GitHub للمشروع).
2. قاعدة بيانات سحابية عاملة على **Neon Serverless PostgreSQL**.
3. حساب **Cloudinary** مع مجلد إنتاج مخصص (مثلاً: `naqer-menu/production`).
4. اسم نطاق مخصص محجوز مع إمكانية إدارة سجلات الـ DNS (مثلاً عبر Cloudflare أو Namecheap).

---

## 2. إعداد مشروع Vercel والمتغيرات البيئية (Vercel Project Setup)

### الخطوة 1: استيراد المشروع (Import Project)
* من لوحة تحكم Vercel، اختر **Add New... -> Project**.
* اختر مستودع Git الخاص بالمشروع (`naqer-menu`).
* **Framework Preset:** تأكد من تحديد `Next.js`.
* **Root Directory:** اتركه الافتراضي (`./`).
* **Build and Output Settings:**
  * Build Command: `npm run build` (أو تخصيصه ليشمل تطبيق ترحيلات بريزما: `npx prisma migrate deploy && npm run build`).
  * Install Command: `npm install`.

### الخطوة 2: ضبط المتغيرات البيئية (Environment Variables)
في إعدادات المشروع داخل Vercel (`Settings -> Environment Variables`)، يجب إضافة المتغيرات الـ 7 التالية مع تفعيل نطاقات (Production و Preview):

| اسم المتغير | الوصف والقيمة المطلوبة |
| :--- | :--- |
| `DATABASE_URL` | رابط اتصال Neon المجمع (Pooled Connection String الذي يحتوي على `-pooler`). |
| `SESSION_SECRET` | مفتاح تشفير عشوائي آمن بطول 64 حرفاً كحد أدنى تم إنشاؤه عبر `openssl rand -hex 32`. |
| `CLOUDINARY_CLOUD_NAME` | اسم الحساب السحابي في Cloudinary. |
| `CLOUDINARY_API_KEY` | مفتاح الـ API العام من Cloudinary. |
| `CLOUDINARY_API_SECRET` | المفتاح السري الحساس من Cloudinary. |
| `CLOUDINARY_SECURE_FOLDER` | اسم المجلد المعزول المخصص لصور الإنتاج (مثلاً: `naqer-menu/production`). |
| `NEXT_PUBLIC_SITE_URL` | الرابط الكامل للموقع مع النطاق الرسمي (مثلاً: `https://menu.naqer.com`). |

---

## 3. هندسة الاتصال بقاعدة بيانات Neon: المجمع مقابل المباشر (Connection Pooling)

تدعم قاعدة بيانات Neon نوعين من روابط الاتصال:

1. **الرابط المجمع (Pooled Connection String - يحتوي على `-pooler`):**
   * **الاستخدام:** يُعين لقيمة `DATABASE_URL` لتشغيل التطبيق والـ Serverless Functions على Vercel.
   * **الهدف:** إدارة آلاف الاتصالات اللحظية عبر تقنية PgBouncer المدمجة في Neon دون استنزاف ذاكرة الخادم، ومنع خطأ `too many connections`.
2. **الرابط المباشر (Direct Connection String - بدون `-pooler`):**
   * **الاستخدام:** يُستخدم فقط عند تنفيذ ترحيلات Prisma المعقدة التي تتطلب أقفالاً على الجداول (Advisory Locks) عبر `DIRECT_URL` إذا تطلب الأمر.

---

## 4. سياسة الترحيل الآمن عند النشر (Safe Migration Deployment)

لتفادي أي انقطاع في الخدمة أثناء ترقية النظام:

1. تُطبق الترحيلات التراكمية فقط عبر أمر Prisma الرسمي:
   ```bash
   npx prisma migrate deploy
   ```
2. **قاعدة عدم الكسر (Zero-Downtime Rule):**
   * لا تقم بحذف أي عمود في قاعدة البيانات قبل إطلاق نسخة التطبيق التي أوقفت استخدامه مسبقاً.
   * أضف الأعمدة الجديدة كأعمدة اختيارية (Optional / Nullable) أو ذات قيم افتراضية (Default Values).

---

## 5. ربط النطاق المخصص وشهادة الأمان (Custom Domain & SSL Setup)

1. في لوحة تحكم Vercel، انتقل إلى: `Settings -> Domains`.
2. أضف النطاق المطلوب (مثلاً: `menu.naqer.com` أو النطاق الجذري `naqermenu.com`).
3. توجه إلى لوحة إدارة الـ DNS لدى مسجل النطاق (مثل Cloudflare أو GoDaddy):
   * **للنطاق الفرعي (Subdomain مثل menu):** أضف سجل `CNAME` يوجه إلى `cname.vercel-dns.com`.
   * **للنطاق الجذري (Apex Domain):** أضف سجل `A` يوجه إلى عنوان Vercel IP: `76.76.21.21`.
4. تتحقق Vercel تلقائياً من صحة السجلات وتصدر شهادة أمان SSL/TLS مشفرة عبر Let's Encrypt خلال دقائق معدودة مجاناً.

---

## 6. إجراءات التحقق السريع بعد الإطلاق (Post-Deployment Smoke Test)

بمجرد اكتمال النشر، ينفذ المطور أو المشرف فحص التحقق التالي:

1. **فحص الواجهة العامة العربية:**
   * فتح `https://your-domain.com/ar` والتأكد من تحميل الصفحة خلال أقل من ثانيتين مع محاذاة RTL صحيحة.
2. **فحص الواجهة العامة الإنجليزية:**
   * فتح `https://your-domain.com/en` والتأكد من سلاسة التبديل والترجمة الإنجليزية ومحاذاة LTR.
3. **فحص نقطة نهاية المزامنة الحية (LiveSync Engine):**
   * طلب `https://your-domain.com/api/content-version` والتأكد من إرجاع كود `200 OK` وكائن JSON يحتوي على `version` صالح.
4. **فحص تحميل الصور:**
   * التحقق من ظهور صور الوجبات المحسنة بسلاسة بدون أي صور مكسورة (Broken Images).
5. **فحص سلة الطلبات وتوجيه واتساب:**
   * إضافة وجبة إلى السلة، فتح نافذة السلة، اختيار الفرع، والضغط على "إرسال الطلب عبر واتساب".
   * التأكد من فتح تطبيق واتساب مع رسالة تحتوي على تفاصيل الصنف والفرع.
6. **فحص لوحة التحكم الإدارية:**
   * فتح `https://your-domain.com/admin/login`.
   * تسجيل الدخول والتحقق من لوحة الإحصائيات وسجل التدقيق.
