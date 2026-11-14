# 10 — دليل التطوير المحلي والإعداد الهندسي (Local Development & Engineering Guide)

يوفر هذا الدليل للمطورين الجدد دليلاً شاملاً خطوة بخطوة لتثبيت، إعداد، تشغيل، واختبار مشروع «ناقر منيو» (Naqer Menu) محلياً على بيئة العمل الخاصة بهم.

---

## 1. المتطلبات التقنية المسبقة (Prerequisites)

قبل البدء، تأكد من تثبيت الأدوات التالية على جهازك:

* **Node.js:** الإصدار **20.x LTS** فما فوق (تم التحقق والتطوير على Node.js v20/v22).
* **مدير الحزم (Package Manager):** `npm` الإصدار 10 فما فوق (مدمج مع Node.js).
* **نظام التحكم في الإصدارات:** `git` الإصدار 2.40+.
* **قاعدة بيانات PostgreSQL:**
  * إما قاعدة بيانات محلية (Local PostgreSQL) أو فرع تطوير سحابي مجاني على **Neon** (موصى به لمحاكاة بيئة الإنتاج بدقة).
* **محرر الأكواد الموصى به:** Visual Studio Code مع إضافات (Prisma, Tailwind CSS IntelliSense, ESLint).

---

## 2. خطوات التثبيت والإعداد الأولي (Setup Steps)

### الخطوة 1: استنساخ المستودع (Clone Repository)

```bash
git clone https://github.com/ibrahim/naqer-menu.git
cd naqer-menu
```

### الخطوة 2: تثبيت الاعتماديات (Install Dependencies)

```bash
npm install
```

> [!NOTE]
> تأكد من استخدام `npm install` بدقة للحفاظ على ترابط الحزم كما هو محدد في `package-lock.json`، خصوصاً حزم React 19 و Next.js 16 و Prisma 7.

### الخطوة 3: إعداد ملف المتغيرات البيئية المحلية (`.env.local`)

قم بإنشاء ملف باسم `.env.local` في المجلد الرئيسي للمشروع (يمكنك نسخ القالب من `docs/handbook/07-ENVIRONMENT-AND-INTEGRATIONS.md`):

```bash
cp .env.example .env.local
```

قم بملء المتغيرات بالقيم المناسبة لبيئة التطوير الخاصة بك:
```env
# رابط اتصال قاعدة البيانات (يمكن استخدام رابط فرع التطوير في Neon)
DATABASE_URL="postgresql://user:password@ep-dev-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# مفتاح تشفير الجلسات (سلسلة نصية عشوائية بطول 64 حرفاً على الأقل)
SESSION_SECRET="dev-secret-string-at-least-32-characters-long-for-local-testing"

# بيانات Cloudinary (يمكن تركها فارغة أو استخدام مجلد تطوير مستقل)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_SECURE_FOLDER="naqer-menu/dev"

# رابط التطبيق المحلي
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### الخطوة 4: توليد عميل بريزما (Generate Prisma Client)

قبل تشغيل التطبيق أو محرر الأكواد، يجب توليد أنواع TypeScript الخاصة بـ Prisma:

```bash
npx prisma generate
```

---

## 3. تشغيل خادم التطوير (Running the Development Server)

لتشغيل خادم التطوير المحلي مع ميزة التحديث اللحظي (Hot Module Replacement):

```bash
npm run dev
```

* **المنفذ الافتراضي:** سيعمل التطبيق على المنفذ `3000` (أو المنفذ `3001` إذا كان `3000` مشغولاً).
* **رابط الواجهة العامة:** [http://localhost:3000/ar](http://localhost:3000/ar) أو [http://localhost:3000/en](http://localhost:3000/en)
* **رابط لوحة التحكم:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 4. سياسة إدارة قاعدة البيانات والترحيلات (Prisma Migrations Policy)

نظراً لأهمية سلامة بيانات الإنتاج، يجب التقيد بالقواعد الصارمة التالية:

* **في بيئة التطوير المحلية (Local Development):**
  * لإنشاء ترحيل جديد بعد تعديل `schema.prisma`:
    ```bash
    npx prisma migrate dev --name describe_change_here
    ```
  * لعرض وتعديل البيانات محلياً عبر واجهة بصرية سريعة:
    ```bash
    npx prisma studio
    ```
* **في بيئة الإنتاج أو الاستضافة (Production/Staging):**
  * **يمنع منعاً باتاً** تشغيل `prisma migrate dev` أو `prisma db push` على قاعدة بيانات الإنتاج.
  * يتم تطبيق الترحيلات التراكمية فقط عبر الأمر:
    ```bash
    npx prisma migrate deploy
    ```

---

## 5. التحقق البرمجي وفحص الجودة (Quality Assurance Commands)

قبل إرسال أي كود أو إنشاء Pull Request، يجب التأكد من اجتياز الأوامر التالية محلياً:

### 1. فحص الأنواع الصارمة في TypeScript:
```bash
npm run typecheck
```
*المتوقع:* انتهاء الفحص بكود خروج `0` بدون أي أخطاء `TSXXXX`.

### 2. بناء حزمة الإنتاج محلياً (Production Build Verification):
```bash
npm run build
```
*المتوقع:* تجميع كافة الصفحات الثابتة والديناميكية وظهور جدول مسارات Next.js بنجاح.

### 3. تشغيل اختبارات E2E المتكاملة بواسطة Playwright:
```bash
npx playwright test
```
*لتشغيل اختبار محدد بالواجهة الرسومية:*
```bash
npx playwright test tests/13-post-cleanup-public-verification.spec.ts --ui
```

---

## 6. اعتبارات خاصة ببيئة Windows و PowerShell (Windows/PowerShell Notes)

إذا كنت تعمل على نظام تشغيل Windows عبر PowerShell، انتبه للممارسات التالية:

1. **تمرير متغيرات البيئة المؤقتة في سطر واحد:**
   * في Bash/Linux: `DATABASE_URL="..." node script.js`
   * في PowerShell، استخدم بناء الجملة الخاص بها:
     ```powershell
     $env:DATABASE_URL="postgresql://..."; node script.js
     ```
2. **التعامل مع علامات التنصيص (Quote Escaping):**
   * عند تمرير نصوص تحتوي على مسافات أو علامات تنصيص إلى نصوص Node.js، استخدم علامات تنصيص مفردة خارجية ومزدوجة داخلية لتفادي حذف PowerShell للأقواس.
3. **أذونات تنفيذ الأوامر (Execution Policy):**
   * إذا ظهر خطأ `File cannot be loaded because running scripts is disabled on this system`:
     ```powershell
     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
     ```
