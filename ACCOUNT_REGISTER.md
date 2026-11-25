# ACCOUNT REGISTER — سجل الحسابات والخدمات المكتشفة

**Project:** Naqer Menu (منيو قرية الناقر الرقمي)  
**Compilation Date:** November 2026  
**Audited Git Baseline:** Commit `213f47f9`  
**Security Classification:** Non-Sensitive Public Register (Zero Secret Exposure)  

---

## 1. نبذة عن السجل (Purpose)

يحتوي هذا المستند على فهرس رسمي لكافة الحسابات، الخدمات السحابية، والبوابات الخارجية التي تم اكتشافها وتوثيقها استناداً إلى فحص ملفات التكوين والشيفرة المصدرية غير الحساسة في مشروع «ناقر منيو».  
**لا يحتوي هذا السجل على أي كلمات مرور، مفاتيح API سرية، أو توكنات وصول.**

---

## 2. سجل الخدمات السحابية والمنصات الخارجية (External Cloud Services Registry)

| اسم الخدمة (Service) | رابط الدخول (Login URL) | البريد / المعرف المكتشف | الغرض من الحساب (Purpose) | مستوى الصلاحية (Access Level) | تصنيف حالة التحقق (Verification Status) |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Vercel** | https://vercel.com/login | حساب المالك المسجل عليه مشروع `alnaker` | استضافة الواجهة والخدمات السحابية (Serverless Next.js Hosting) | Full Cloud Admin | **Verified in Production** (الموقع العام يعمل ومستضاف على `alnaker.vercel.app`) |
| **Neon PostgreSQL** | https://console.neon.tech | حساب المالك في مشروع ep-YOUR-PROJECT | قاعدة البيانات السحابية المعتمدة (PostgreSQL v16) | DBA / Full Access | **Verified in Source Code** (معرف في `prisma/schema.prisma` و `.env.example`؛ لم يتم الاتصال بقاعدة الإنتاج التزاماً بقواعد التدقيق) |
| **Cloudinary** | https://cloudinary.com/users/login | اسم السحابة: `tifawhcs`<br>(المجلد: `naqer-menu`) | استضافة وتحسين وتوزيع صور الوجبات والأقسام | Media Storage Admin | **Verified in Source Code & Assets** (روابط الصور الحية في المنيو تشير إلى سحابة `tifawhcs`) |
| **Cloudinary (السابق المتقاعد)** | https://cloudinary.com | اسم السحابة: `damc35hfo` | حساب تجريبي قديم تم إيقافه واستبعاده برمجياً لحماية أصول العميل | Retired / Deprecated | **Verified in Source Code** (الكود يرفضه صراحة عبر `RETIRED_CLOUDINARY_ACCOUNT`) |
| **GitHub (مستودع العميل)** | https://github.com/login | المؤسسة: `alnakerrest-cloud`<br>المستودع: `alnaker` | مستودع مرآة الإنتاج والنسخ الاحتياطي السحابي الخاص بالعميل | Repository Owner | **Verified in Source Code** (`alnaker` موجود كـ Git Remote) |
| **GitHub (مستودع المطور)** | https://github.com/login | المستخدم: `EbrahimShoeib1999`<br>المستودع: `naqer-menu` | مستودع التطوير والمتابعة والتحكم في الإصدارات | Repository Maintainer | **Verified in Source Code** (`origin` مربوط بـ `main`) |
| **WhatsApp Direct Link** | https://web.whatsapp.com | أرقام الهواتف الرسمية لفروع المطعم (جمصة ودمياط) | فتح تطبيق الواتساب بنص الطلب المنسق (`wa.me/...`) | Client-side URL Scheme | **Verified in Source Code** (توجيه عبر رابط المتصفح؛ ليس API إرسال خلفي تلقائي) |

---

## 3. سجل الحسابات الإدارية المكتشفة في النظام (System Admin Accounts Registry)

تم فحص مصدر كل حساب بدقة من ملفات التكوين والتهيئة المحلية:

| البريد الإلكتروني (Email) | الاسم المعروض (Display Name) | الدور (Role) | مصدر الاكتشاف في المشروع | تغيير كلمة المرور عند أول دخول | تصنيف حالة التحقق الصارمة (Audit Status) |
| :--- | :--- | :---: | :--- | :---: | :---: |
| `admin@naqer-restaurant.local` | إبراهيم شعيب (مدير عام المطعم) | `OWNER` | `data/users/users.json` (ملف محلي) | `false` | **NOT VERIFIED IN PRODUCTION**<br>*(Verified by Local Source)* |
| `orders-staff@naqer-restaurant.local` | موظف استقبال وتجهيز الطلبات | `ORDERS_STAFF` | `data/users/users.json` (ملف محلي) | `false` | **NOT VERIFIED IN PRODUCTION**<br>*(Verified by Local Source)* |
| `manager@naqer.com` | مشرف العمليات والتشغيل | `ADMIN` | `data/users/users.json` و `credentials/` | `true` | **NOT VERIFIED IN PRODUCTION**<br>*(Requires Owner Confirmation)* |
| `orders@naqer.com` | إدارة وتجهيز الطلبات | `ORDERS_STAFF` | `data/users/users.json` و `credentials/` | `true` | **NOT VERIFIED IN PRODUCTION**<br>*(Requires Owner Confirmation)* |
| `cashier@naqer.com` | أمين الصندوق (الكاشير) | `ORDERS_STAFF` | `data/users/users.json` و `credentials/` | `true` | **NOT VERIFIED IN PRODUCTION**<br>*(Requires Owner Confirmation)* |
| `admin@naqer-menu.local` | حساب التهيئة الافتراضي (Seed) | `OWNER` | `scripts/seed-admin.mjs` (سكريبت تهيئة) | `true` | **NOT VERIFIED IN PRODUCTION**<br>*(Seed Script Only)* |

---

## 4. فحص تكامل البريد الإلكتروني (Email Integration Audit)

- **هل يوجد مزود بريد إلكتروني نشط؟**  
  **كلا، تم التأكد تماماً من عدم وجود أي تكامل مع بوابات SMTP أو بريد سحابي (No Nodemailer, No Resend, No SendGrid).**
- **طريقة التواصل والتحقق المعتمدة بدلاً من البريد:**
  - طلبات الزبائن وتأكيد الفواتير: تتم بالكامل عبر **WhatsApp Direct Links**.
  - التحقق من هوية العملاء: تتم عبر **Phone OTP Provider** قابل للتوصيل.
  - استعادة حسابات الإدارة: تتم يدوياً بواسطة مالك النظام (`OWNER`) أو عبر سكريبتات الطرفية الآمنة.

---

## 5. البيانات التي تحتاج إلى تأكيد من مالك المشروع (Needs Owner Confirmation)

لإتمام الإطلاق النهائي بأعلى درجات الموثوقية، يُرجى من مالك المشروع مراجعة وتأكيد الآتي:
1. **كلمات المرور الخاصة بالحسابات التشغيلية الثلاثة (`manager@naqer.com`, `orders@naqer.com`, `cashier@naqer.com`):**
   - هل تم استلامها وتعيينها من قبل الموظفين الفعليين عبر شاشة التغيير الإجباري؟
2. **أرقام هواتف فروع الواتساب في جدول الفروع (`Branch`):**
   - التحقق من مطابقة الأرقام في قاعدة البيانات للأرقام الفعلية لأجهزة هواتف الكاشير في فرع جمصة وفرع دمياط الجديدة لاستقبال الرسائل بدون تأخير.
3. **بيانات اعتماد مسجل النطاق (DNS Registrar):**
   - تأكيد اسم المزود (Cloudflare / Namecheap / GoDaddy) لتوثيقه في القالب المشفر الخاص بالمالك.
