# 10 — Deployment, Hosting, & Remotes Architecture

**Project:** Naqer Menu  
**Scope:** Vercel Hosting, Git Remotes Topology, Production Pipeline, and Rollback  
**Target Audience:** DevOps Engineers, Release Managers, Fullstack Developers  

---

## 1. طوبولوجيا مستودعات Git (Git Remotes Mapping)

يحتوي المشروع على ريموتين معتمدين يتم المزامنة بينهما:

```text
               ┌────────────────────────────────────────────────────────┐
               │              Local Workstation (main)                  │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
      [ Remote: origin ]                         [ Remote: alnaker ]
      https://github.com/                        https://github.com/
      EbrahimShoeib1999/naqer-menu.git           alnakerrest-cloud/alnaker.git
      (مستودع التطوير والمتابعة)                 (مستودع الإنتاج ومرآة العميل)
```

- **`origin`:** مستودع المطور الرئيسي، يُستخدم للتطوير، الفحص، وفروع الميزات (Feature Branches).
- **`alnaker`:** مستودع العميل السحابي (Organization Repository).
- **الفرع الإنتاجي المعتمد:** فرع `main`.

---

## 2. بيئة الاستضافة على Vercel (Vercel Production Deployment)

- **رابط الإنتاج الحي (Live Production URL):** [https://alnaker.vercel.app](https://alnaker.vercel.app)
- **إعدادات البناء الافتراضية (Build Settings):**
  - **Framework Preset:** Next.js
  - **Build Command:** `next build` (أو `npm run build`)
  - **Output Directory:** `.next`
  - **Install Command:** `npm install` (يقوم بتشغيل `prisma generate` تلقائياً عبر `postinstall`).
  - **Node.js Version:** `20.x`
- **التشغيل الآلي (Automated CI/CD):**
  - عند دفع أي Commit جديد إلى فرع `main` على المستودع المرتبط بمشروع Vercel، تبدأ عملية البناء والنشر التلقائي فوراً وتستغرق عادة بين 45 إلى 70 ثانية.

---

## 3. متغيرات بيئة الإنتاج في Vercel (Production Environment Setup)

يجب التأكد من وجود المتغيرات التالية داخل **Vercel Project Settings** $\rightarrow$ **Environment Variables**:

1. `DATABASE_URL`: رابط Neon المشفر مع الـ Pooler (`-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require`).
2. `NEXT_PUBLIC_SITE_URL`: `https://alnaker.vercel.app`.
3. `USE_BACKUP_DATA`: `false` (للتأكيد الصريح، علماً بأن الكود يفرضه تلقائياً في الإنتاج).
4. `SESSION_SECRET`: مفتاح تشفير عشوائي قوي 64 حرفاً.
5. `CLOUDINARY_CLOUD_NAME`: `tifawhcs`.
6. `CLOUDINARY_API_KEY`: مفتاح الـ API.
7. `CLOUDINARY_API_SECRET`: المفتاح السري.
8. `CLOUDINARY_SECURE_FOLDER`: `naqer-menu`.

---

## 4. مراقبة السجلات والتشغيل (Logs & Observability)

- **Vercel Runtime Logs:**
  - يتم استعراضها مباشرة من لوحة Vercel $\rightarrow$ Deployments $\rightarrow$ [اختر الـ Deployment الحالي] $\rightarrow$ **Logs**.
  - تسجل أي استثناء أو خطأ غير متوقع مصحوباً برقم الـ Digest لمطابقته ومعالجته.
- **Neon Metrics:**
  - من لوحة Neon، يمكن متابعة عدد الاتصالات النشطة، حجم استهلاك الـ Compute، وحالة الاستيقاظ التلقائي من الخمول.

---

## 5. خطة التراجع السريع عند الطوارئ (Rollback Procedure)

في حال حدوث أي خطأ حرج غير متوقع بعد نشر إصدار جديد:
1. افتح لوحة تحكم **Vercel** واذهب إلى قسم **Deployments**.
2. حدد آخر إصدار مستقر كان يعمل بنجاح (Stable Deployment).
3. اضغط على القائمة الجانبية (ثلاث نقاط) واختر **"Instant Rollback"** (أو **"Promote to Production"**).
4. خلال ثوانٍ معدودة، تعود حركة المرور فوراً للإصدار السابق المستقر دون الحاجة لإعادة البناء البرمجي.
