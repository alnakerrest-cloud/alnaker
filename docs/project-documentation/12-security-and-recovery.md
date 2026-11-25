# 12 — Security, Incident Response, & Disaster Recovery Guide

**Project:** Naqer Menu (منيو قرية الناقر)  
**Scope:** Security Posture, Cryptography, Key Rotation, Disaster Recovery, and Incident Playbooks  
**Target Audience:** Security Officers, Lead DevOps Engineers, System Administrators  
**Last Updated:** November 2026 (Verified on Git commit `213f47f9`)  

---

## 1. البنية الأمنية الشاملة (Security Architecture Overview)

صُممت منصة «ناقر منيو» وفق معايير دفاعية متعددة الطبقات (Defense in Depth) لضمان حماية بيانات المطعم، الزبائن، والعمليات الإدارية:

```
[ Internet Traffic ]
        │
        ▼ (HTTPS / TLS 1.3 Strict Enforcement)
[ Vercel Edge Shield / Anti-DDoS ]
        │
        ▼ (HttpOnly, Secure, SameSite=Lax Session Cookies)
[ Application Security Gate ]
  ├── CSRF / Origin Verification
  ├── Rate Limiting on /admin/login
  ├── Password Hashing (bcrypt, 12 Salt Rounds)
  ├── Session Tokens Hashed via HMAC-SHA256
  └── Role-Based Access Control (RBAC) Enforcement
        │
        ▼ (SSL / TLS Encrypted Connection Pooling)
[ Neon PostgreSQL Security Perimeter ]
  └── Strict Read-Only Filesystem Guarantee (Zero EROFS Risk)
```

---

## 2. إدارة الهوية والمصادقة (Authentication & Identity Security)

### أ. تشفير كلمات المرور (Password Hashing)
- تُشفر كافة كلمات المرور الإدارية باستخدام خوارزمية **bcrypt** مع 12 دورة تعقيد (`rounds: 12`).
- هذه القوة تمنع فك التشفير عبر القواميس أو جداول Rainbow Tables، وتجعل استخراج النص الصريح مستحيلاً عملياً حتى في حال الحصول على نسخة من قاعدة البيانات.

### ب. حماية الجلسات والرموز (Session Security & Keyed Hashing)
- **لا يتم تخزين التوكن الخام أبداً:** عند تسجيل دخول المشرف، يتم إنشاء توكن عشوائي بطول 64 حرفاً عبر مكتبة التشفير العشوائي لنظام التشغيل (`crypto.randomBytes`).
- يتم تجزئة التوكن باستخدام بصمة **Keyed HMAC-SHA256** معتمدة على `SESSION_SECRET` وتخزين الهاش فقط في جدول `Session`.
- يضمن هذا الأسلوب أنه في حال حدوث تسريب لقاعدة البيانات، لا يمكن للمهاجم استخدام الهاشات المسربة لانتحال شخصية المشرفين.
- **كوكيز الجلسة (`naqer_admin`):**
  - `httpOnly: true`: يمنع وصول نصوص JavaScript الخبيثة للكوكي (الحماية من XSS).
  - `secure: true`: تُرسل فقط عبر اتصالات HTTPS المشفرة.
  - `sameSite: "lax"`: يمنع إرسال الكوكي عبر الطلبات العابرة للمواقع (الحماية من CSRF).

### ج. سياسة التغيير الإجباري لكلمات المرور (Forced Password Rotation)
- الحسابات المنشأة بواسطة سكريبتات أو المشرفين تُعلّم بـ `mustChangePassword: true`.
- يعترض النظام أي محاولة للوصول لأي شاشة أو استدعاء أي إجراء برمجي، ويجبر المشرف على تعيين كلمة مرور قوية وخاصة به قبل فتح لوحة التحكم.

---

## 3. حماية المتغيرات البيئية والأسرار (Secrets Hygiene)

- **الحظر الصارم للرفع على Git:**
  - كافة ملفات `.env*` مستثناة تماماً في `.gitignore` (باستثناء `.env.example` الذي يحتوي على قوالب فارغة فقط).
  - لا يتم تضمين أي مفاتيح API أو كلمات مرور أو عناوين سرية في الكود المصدري.
- **عزل أسرار بيئة الإنتاج:**
  - يتم إدخال المتغيرات الحساسة (`DATABASE_URL`, `SESSION_SECRET`, `CLOUDINARY_API_SECRET`) يدوياً ومباشرةً داخل إعدادات **Vercel Project Settings**.
  - لا يمكن للمطورين المبتدئين أو الواجهات العامة استعراض هذه الأسرار، وتقتصر صلاحية رؤيتها على مالك الحساب الإداري في Vercel.

---

## 4. خطة تدوير المفاتيح الأمنية (Key Rotation Playbook)

يجب تدوير المفاتيح بصورة دورية كل 6 أشهر، أو فوراً عند الاشتباه في أي تسريب:

### أ. تدوير مفتاح الجلسات (`SESSION_SECRET`)
1. قم بتوليد مفتاح عشوائي جديد قوي عبر الطرفية:
   ```bash
   openssl rand -hex 32
   ```
2. ادخل إلى لوحة Vercel: `Project Settings` $\rightarrow$ `Environment Variables`.
3. قم بتحديث قيمة `SESSION_SECRET` بالمفتاح الجديد.
4. أعد النشر (Redeploy).
5. **النتيجة الأمنية:** سيتم فوراً إبطال جميع جلسات المشرفين المفتوحة حالياً وإجبارهم على إعادة تسجيل الدخول بكلمات مرورهم، مع إبطال أي توكن قديم كان مخزناً في المتصفحات.

### ب. تدوير رابط اتصال قاعدة البيانات (`DATABASE_URL`)
1. ادخل إلى لوحة تحكم **Neon Console** $\rightarrow$ اختر المشروع $\rightarrow$ `Settings` $\rightarrow$ `Roles`.
2. قم بإعادة تعيين كلمة المرور لدور `neondb_owner` (Reset Password).
3. انسخ رابط الاتصال المجمع الجديد (`-pooler`).
4. حدث قيمة `DATABASE_URL` في Vercel فوراً.
5. أعد النشر للتحقق من عودة الاتصال بنجاح.

### ج. تدوير مفاتيح Cloudinary (`CLOUDINARY_API_SECRET`)
1. ادخل إلى لوحة Cloudinary: `Settings` $\rightarrow$ `Access Keys`.
2. قم بتوليد مفتاح سري جديد (Generate New API Secret).
3. حدث المتغير `CLOUDINARY_API_SECRET` في Vercel.
4. احذف المفتاح القديم من Cloudinary بعد التأكد من نجاح رفع الصور الجديدة في صفحة `/admin/images`.

---

## 5. خطط التعافي من الكوارث وحالات الطوارئ (Disaster Recovery Plans)

### السيناريو 1: تعطل قاعدة بيانات Neon أو انقطاع خدمة PostgreSQL
- **المؤشرات:** ظهور أخطاء `PrismaClientKnownRequestError` أو `Can't reach database server` في سجلات Vercel.
- **إجراءات الإنقاذ:**
  1. ادخل إلى صفحة حالة Neon الرسمية ([neonstatus.com](https://neonstatus.com)) للتأكد مما إذا كان العطل عاماً.
  2. إذا كان العطل خاصاً بالـ Compute فقط: اضغط على `Restart Compute` من لوحة Neon لإعادة تشغيل الحاوية السحابية.
  3. إذا تعرضت البيانات للتلف:
     - استخدم سكريبت الاستعادة المعتمد:
       ```bash
       npm run db:baseline
       ```
     - أو استعد آخر نسخة احتياطية من خلال الأمر:
       ```bash
       pg_restore --clean --no-owner --dbname="<DATABASE_URL>" backups/naqer_prod_backup_YYYY-MM-DD.dump
       ```

### السيناريو 2: تعطل منصة Cloudinary أو حظر النطاق
- **المؤشرات:** عدم ظهور صور الوجبات على المنيو وظهور أيقونة الشعار الافتراضي.
- **إجراءات الطوارئ:**
  1. واجهة العميل مزودة بنظام حماية تلقائي (Image Fallback Handler): لا تنهار الصفحة إطلاقاً، بل تستعرض الشعار الرسمي لمطعم قرية الناقر واسم الطبق بخلفية جمالية بديلة.
  2. خدمة الطلبات وتصفح الأسعار والواتساب تستمر في العمل بنسبة 100% دون أي توقف.
  3. فور عودة Cloudinary للعمل، تستعيد الصور ظهورها السحابي تلقائياً دون الحاجة لإعادة نشر التطبيق.

### السيناريو 3: تعطل استضافة Vercel
- **المؤشرات:** رسائل خطأ HTTP 502/503 على النطاق `https://alnaker.vercel.app`.
- **إجراءات الطوارئ:**
  1. تحقق من صفحة [vercel-status.com](https://vercel-status.com).
  2. استعادة سريعة (Instant Rollback): من لوحة تحكم Vercel $\rightarrow$ `Deployments` $\rightarrow$ اختر آخر نسخة سابقة ناجحة $\rightarrow$ اضغط `Instant Rollback`.
  3. في حال حدوث عطل دائم بالمنصة، الكود مجهز للنشر على أي منصة حاويات سحابية أخرى (مثل Railway, Render, أو Docker على VPS) عبر تنفيذ:
     ```bash
     npm run build
     npm start
     ```

---

## 6. استعادة الوصول الإداري للحساب الرئيسي (Emergency Admin Access Recovery)

في حال فقدان كلمة المرور الخاصة بحساب المالك الرئيسي (`OWNER`) أو عدم القدرة على الدخول:

1. افتح بيئة التطوير المحلية المربوطة بنفس قاعدة البيانات الإنتاجية (عبر وضع `DATABASE_URL` الخاص بالإنتاج في ملف `.env.local` مؤقتاً).
2. قم بتنفيذ سكريبت التهيئة الصارم:
   ```bash
   OWNER_EMAIL="emergency_admin@alnaker.com" \
   OWNER_PASSWORD="<NEW_ULTRA_STRONG_PASSWORD>" \
   OWNER_NAME="إدارة الطوارئ" \
   ALLOW_OWNER_OVERWRITE=1 \
   node scripts/provision-owner.mjs
   ```
3. ادخل فوراً إلى لوحة التحكم عبر البريد وكلمة المرور الجديدة:
   `https://alnaker.vercel.app/admin/login`
4. ادخل إلى `/admin/users` وألغِ تفعيل أي حسابات مشبوهة، وقم بتدوير الجلسات المفتوحة.
5. احذف المتغير من `.env.local` فور الانتهاء وأعد تعيين البيئة المحلية لوضع التطوير المنفصل.
