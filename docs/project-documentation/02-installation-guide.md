# 02 — Installation & Local Development Guide

**Project:** Naqer Menu  
**Scope:** Developer Setup, Dependency Installation, Local Execution, and Testing  
**Target Audience:** Frontend/Backend Developers, QA Automation Engineers  

---

## 1. المتطلبات الأساسية (Prerequisites)

قبل تشغيل المشروع، تأكد من توفر الأدوات التالية على بيئة عملك:

- **Node.js:** الإصدار `20.x` أو أعلى (يوصى بـ LTS مثل v20.18+ أو v22).
  - تحقق بالأمر: `node -v`
- **npm:** الإصدار `9.x` أو `10.x`.
  - تحقق بالأمر: `npm -v`
- **Git:** الإصدار `2.40` أو أعلى.
  - تحقق بالأمر: `git --version`
- **نظام التشغيل:** يدعم Windows (PowerShell/CMD)، macOS، وLinux.

---

## 2. استنساخ المستودع (Clone Repository)

```bash
# استنساخ المستودع الرئيسي
git clone https://github.com/EbrahimShoeib1999/naqer-menu.git
cd naqer-menu

# التحقق من الفروع الحالية
git status
git branch --show-current
```

---

## 3. تثبيت الحزم والمكتبات (Install Dependencies)

يستخدم المشروع مكتبة Prisma 7 التي تقوم بتوليد العميل تلقائياً عند انتهاء التثبيت (`postinstall: prisma generate`):

```bash
npm install
```

> **ملاحظة هامة:** إذا لم يُولد عميل Prisma تلقائياً لسبب ما، نفذ:
> ```bash
> npm run db:generate
> ```

---

## 4. إعداد ملف البيئة المحلي (.env.local)

قم بنسخ ملف الإعدادات الاسترشادي:

```bash
# على أنظمة Windows PowerShell:
Copy-Item .env.example .env.local

# على أنظمة Linux/macOS:
cp .env.example .env.local
```

افتح ملف `.env.local`، واضبط المتغيرات حسب طريقة العمل التي تفضلها:

### الخيار أ: وضع التطوير غير المتصل (Offline Mock Mode - الموصى به محلياً)
لا تحتاج لأي اتصال إنترنت أو قاعدة بيانات خارجية. اترك الإعدادات كالتالي:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
USE_BACKUP_DATA=true
SESSION_SECRET=local_super_secret_dev_key_at_least_32_chars_long
```
في هذا الوضع، سيقرأ المشروع بيانات المنيو الأصلية (151 طبق معتمد) من [backups/backup-naqer-verified.json](file:///e:/real%20projects/naqer-menu/backups/backup-naqer-verified.json) ومخزن [data/local-db-overlay.json](file:///e:/real%20projects/naqer-menu/data/local-db-overlay.json).

### الخيار ب: وضع التطوير المتصل بقاعدة بيانات Neon الحقيقية
إذا كنت تريد فحص الاتصال الحقيقي بقاعدة بيانات PostgreSQL:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@ep-<PROJECT>-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require
USE_BACKUP_DATA=false
SESSION_SECRET=<YOUR_LOCAL_SESSION_SECRET>
```

---

## 5. تشغيل خادم التطوير (Run Development Server)

```bash
npm run dev
```

- **الواجهة العامة للمنيو (العميل):**  
  [http://127.0.0.1:3000/ar](http://127.0.0.1:3000/ar) أو [http://127.0.0.1:3000/en](http://127.0.0.1:3000/en)
- **لوحة التحكم الإدارية (Admin Login):**  
  [http://127.0.0.1:3000/admin/login](http://127.0.0.1:3000/admin/login)

---

## 6. أوامر الفحص والاختبار المعتمدة (CLI & Verification Scripts)

تطابق هذه الأوامر ما تم تعريفه في [package.json](file:///e:/real%20projects/naqer-menu/package.json):

```bash
# 1. فحص الأنواع الصارم (TypeScript Check)
npm run typecheck

# 2. فحص بناء الإنتاج الكامل (Production Build Check)
npm run build

# 3. تشغيل نسخة الإنتاج محلياً بعد البناء
npm run start

# 4. تشغيل اختبارات حراس بيئة الإنتاج الآلية
node scripts/verify-persistence-guards.mjs
npx tsx scripts/verify-production-invariants.mjs
```

---

## 7. أشهر مشاكل التثبيت الشائعة وحلولها (Troubleshooting)

### المشكلة 1: خطأ `Prisma Client not found` أو `Cannot find module '@/lib/generated/prisma'`
- **السبب:** لم يتم توليد عميل Prisma المحلي داخل المسار المخصص.
- **الحل:**
  ```bash
  npx prisma generate
  ```

### المشكلة 2: خطأ `SSL connection / verify-full` في نافذة الأوامر
- **السبب:** مكتبة `pg` الحديثة تنبه حول معايير أمان SSL الافتراضية مع Neon.
- **الحل:** تم ضبط إعدادات الاتصال مسبقاً في `lib/database-url.ts` و `lib/prisma.ts`. هذا التنبيه آمن ولا يعطل النظام، ولن يظهر في الواجهة.

### المشكلة 3: خطأ في منفذ التشغيل `Port 3000 is already in use`
- **السبب:** وجود عملية Node سابقة تعمل في الخلفية.
- **الحل:**
  ```powershell
  # على PowerShell لإيجاد العملية وإنهائها:
  Get-Process node | Stop-Process -Force
  ```
