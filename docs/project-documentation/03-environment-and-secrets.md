# 03 — Environment Variables & Secrets Guide

**Project:** Naqer Menu  
**Scope:** Configuration Management, Secrets Hygiene, and Environment Matrix  
**Target Audience:** DevOps Engineers, Cloud Administrators, Lead Developers  

---

## 1. سياسة الأمان والسرية (Security Policy)

> [!CAUTION]
> يُحظر تماماً حفظ أو كتابة القيم الحقيقية للأسرار، مفاتيح الـ API، أو بيانات اتصال قاعدة البيانات داخل أي ملف يتم تتبعه عبر Git.
> جميع القيم في هذا المستند والمستودع تظهر على هيئة Placeholders فقط.

---

## 2. جدول متغيرات البيئة الشامل (Environment Variables Matrix)

| اسم المتغير (Variable Name) | الوظيفة والهدف (Purpose) | إلزامي / اختياري | البيئات المطلوبة | أين يُستخدم في الكود؟ | كيفية الحصول على القيمة وطريقة التحقق |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `DATABASE_URL` | رابط اتصال PostgreSQL المشفر من Neon (مع خيار الـ Pooler) | **إلزامي في الإنتاج** | Production, Preview, Staging | `lib/database-url.ts`, `lib/prisma.ts` | لوحة Neon Console $\rightarrow$ Dashboard $\rightarrow$ Connection Details (اختر pooled connection). |
| `NEXT_PUBLIC_SITE_URL` | الرابط العام المعتمد للموقع لروابط الـ SEO والواتساب | **إلزامي** | جميع البيئات | `lib/site.ts`, `app/api/checkout/` | في الإنتاج: `https://alnaker.vercel.app`. محلياً: `http://localhost:3000`. |
| `USE_BACKUP_DATA` | التحكم في تفعيل وضع التخزين الاحتياطي المحلي | اختياري (موصى بضبطه) | Development, Staging | `lib/persistence-mode.ts` | ضبط `false` يضمن استخدام Neon. في الإنتاج، الكود يفرض `false` معمارياً حتى لو غاب المتغير. |
| `SESSION_SECRET` | مفتاح التشفير العشوائي لجلسات المشرفين والتحقق | **إلزامي في الإنتاج** | جميع البيئات | `lib/auth.ts`, `lib/users-store.ts` | توليد نص عشوائي قوي عبر الأمر: `openssl rand -hex 32`. |
| `CLOUDINARY_CLOUD_NAME` | اسم حساب التخزين السحابي على Cloudinary | **إلزامي لرفع الصور** | جميع البيئات | `app/admin/(shell)/images/actions.ts` | حساب Cloudinary للعميل (المعرف المعتمد: `tifawhcs`). |
| `CLOUDINARY_API_KEY` | المفتاح البرمجي العام للرفع السحابي | **إلزامي لرفع الصور** | جميع البيئات | `app/admin/(shell)/images/actions.ts` | Cloudinary Dashboard $\rightarrow$ Settings $\rightarrow$ Access Keys. |
| `CLOUDINARY_API_SECRET` | المفتاح السري البرمجي للرفع السحابي | **إلزامي لرفع الصور** | جميع البيئات | `app/admin/(shell)/images/actions.ts` | Cloudinary Dashboard $\rightarrow$ Settings $\rightarrow$ Access Keys. |
| `CLOUDINARY_SECURE_FOLDER` | المجلد السحابي لحفظ صور المطعم | اختياري (افتراضي `naqer-menu`) | جميع البيئات | `app/admin/(shell)/images/actions.ts` | اسم المجلد داخل حساب Cloudinary (القيمة المعتمدة: `naqer-menu`). |
| `NAQER_ACTIVE_DATABASE_URL`| رابط قاعدة بيانات بديل صريح يُستخدم للطوارئ | اختياري | بيئات الاختبار/الإنقاذ | `lib/database-url.ts` | في حال الرغبة بتجاوز `DATABASE_URL` برمجياً في حالات الصيانة الطارئة. |

---

## 3. الفرق بين ملفات البيئة المختلفة (.env files)

1. **`.env.example`:**
   - ملف عام مُتتبع ومرفوع إلى Git.
   - يحتوي فقط على أسماء المتغيرات وقيم افتراضية عامة ونصوص توضيحية (Placeholders).
2. **`.env.local`:**
   - ملف محلي خاص بجهاز المطور (مدرج في `.gitignore` ومستثنى من الرفع).
   - يحتوي على إعدادات المطور الفردية أو اتصالات الاختبار المعزولة.
3. **`.env.production` / `.env.preview`:**
   - لا تُخزن كملفات في المستودع. يتم إدخالها مباشرة في لوحة تحكم **Vercel Project Settings** $\rightarrow$ **Environment Variables**.
4. **`.env.lock` / `.env.test.local`:**
   - ملفات اختبار مؤقتة مستثناة في `.gitignore` لمنع أي تسريب.

---

## 4. نموذج الإعدادات الخالي من الأسرار (.env.example Blueprint)

```env
# ==============================================================================
# NAQER MENU ENVIRONMENT CONFIGURATION BLUEPRINT
# ==============================================================================

# Public URL (Production: https://alnaker.vercel.app | Dev: http://localhost:3000)
NEXT_PUBLIC_SITE_URL=https://alnaker.vercel.app

# Neon PostgreSQL Connection String (Use -pooler endpoint for Serverless)
DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@ep-<YOUR-PROJECT>-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require

# Data Provider Mode:
# 'false' forces PostgreSQL direct execution (Enforced automatically on Vercel)
# 'true' enables offline JSON mock engine for local laptop development
USE_BACKUP_DATA=false

# Session Cryptographic Secret (32+ bytes random hex string)
SESSION_SECRET=<GENERATE_WITH_OPENSSL_RAND_HEX_32>

# Cloudinary Media Configuration
CLOUDINARY_CLOUD_NAME=tifawhcs
CLOUDINARY_API_KEY=<YOUR_CLOUDINARY_API_KEY>
CLOUDINARY_API_SECRET=<YOUR_CLOUDINARY_API_SECRET>
CLOUDINARY_SECURE_FOLDER=naqer-menu
```

---

## 5. التحقق من صحة المتغيرات (Validation Protocol)

- **فحص الاتصال بقاعدة البيانات:** عند تشغيل التطبيق في وضع `USE_BACKUP_DATA=false`، إذا كانت قيمة `DATABASE_URL` خاطئة أو غير معينة، سيرمي التطبيق فوراً خطأ `PrismaClientKnownRequestError (P1001)` ولن يقوم بإنشاء جلسات وهمية.
- **فحص رفع الصور:** إذا كانت مفاتيح Cloudinary غير صحيحة، ستفشل عملية الرفع داخل صفحة `/admin/images` مع إظهار رسالة خطأ واضحة `فشل رفع الصورة إلى الخادم السحابي`.
