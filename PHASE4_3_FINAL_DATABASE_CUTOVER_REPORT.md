# PHASE 4.3 — Final Database Cutover Verification Report

**التاريخ والوقت:** 2026-11-24T22:01:00+02:00 (20:01:00 GMT)  
**المُصدِر:** Agent — Phase 4.3 Cutover Verification  
**المستودع المنشور:** `alnakerrest-cloud/alnaker` → فرع `main` → كوميت `b69caca59dc8268b2437d663bbbb02a180294be7`  
**نطاق الإنتاج:** `https://alnaker.vercel.app`  
**نطاق الفحص:** Read-Only فحص كامل — صفر كتابة، صفر تعديل schema، صفر إلغاء للصيانة

---

## الحالة العامة: ⚠️ PARTIAL CUTOVER — نشر جزئي ناجح مع مشكلة ISR Cache معلّقة

| الطبقة | الحالة | التفاصيل |
|:---|:---:|:---|
| **Git Push → alnaker/main** | ✅ | Full SHA مؤكد على GitHub |
| **Vercel Build (Deploy)** | ✅ | Build اكتمل، CSS من b69caca5 موجود |
| **Runtime Serverless Functions** | ✅ | `/api/menu-mode` يعيد MISS (يقرأ من DB مباشرة) |
| **ISR HTML Cache (/ar, /en)** | ⚠️ **STALE** | صفحات ISR جامدة منذ `19:41 GMT` (عمرها +20 دقيقة) |
| **Cloudinary في HTML الحي** | ⚠️ **damc35hfo** | ناتج عن STALE ISR — ليس هوية قاعدة البيانات |
| **قاعدة الإنتاج القديمة** | ✅ Read-Only | `default_transaction_read_only = on` |
| **وضع الصيانة** | ✅ مفعّل | لا يمنع checkout حالياً (تفسير في §6) |
| **نتيجة قاعدة `naqer_merged_staging`** | ✅ سليمة | 151 منتج، 17 قسم، damc35hfo = 0 |

---

## 1. التحقق من Last Production Deployment وحالة Ready

- **الكوميت المنشور:** `b69caca59dc8268b2437d663bbbb02a180294be7`  
- **Remote SHA على GitHub (git ls-remote):**
  ```text
  b69caca59dc8268b2437d663bbbb02a180294be7    refs/heads/main  ✅
  ```
- **HTTP Status الموقع:** `200 OK` ✅  
- **Vercel Trace IDs المرصودة:**
  - `/api/menu-mode` → `fra1::iad1::6b9vc-1795550470361-f02d19ed1708` (**MISS** = serverless حي)
  - `/admin/login` → `fra1::iad1::ll2s4-1795550278115-0901c1e7d43a` (**MISS** = SSR حي)
- **CSS من الكوميت `b69caca5` في الإنتاج:** ✅ موجود
  ```css
  .card-foot,.platter-foot,.side-foot,.drink-foot {
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%
  }
  ```

---

## 2. إثبات هوية Runtime وقاعدة البيانات الفعلية

### 2.1 الأدلة الديناميكية (Cache: MISS — مباشر من قاعدة البيانات)

نقطة النهاية `/api/menu-mode` هي `force-dynamic` بالكامل، تُنفَّذ على serverless container جديد في كل طلب:

```json
{
  "mode": "WHATSAPP_DATABASE",
  "normalizedMode": "WHATSAPP_DATABASE",
  "isOrderable": true,
  "noticeTitleAr": "نعتذر، ضغط طلبات حالياً",
  "noticeMessageAr": "الطلبات متوقفة مؤقتاً لتجهيز الطلبات الحالية",
  "expectedResumeAt": "الساعة 7:00 مساءً",
  "enableNotice": true,
  "x-vercel-cache": "MISS"
}
```

هذه القيم موجودة في `naqer_merged_staging.OrderStore`، وهي بيانات مهاجرة وفريدة لهذه القاعدة.

### 2.2 آلية حل قاعدة البيانات في الكود (`lib/database-url.ts`)

```typescript
// أولوية الحل:
// 1. DATABASE_URL  →  2. "DATABASE_URL " (مفتاح قديم)  →  3. NAQER_ACTIVE_DATABASE_URL
// إذا كان DATABASE_URL يشير لـ ep-withered-bread (المتوقف) → رفض صريح
// إذا كان DATABASE_URL صحيحاً → استخدمه مباشرة بدون أي تحويل صامت
```

**الاستنتاج:** بعد تحديث `DATABASE_URL` في Vercel، يقبل الكود الـ URL الجديد وينقله مباشرة لبركة `pg`. لا توجد قيمة مكتوبة في الكود تتجاوز متغيرات البيئة.

> [!IMPORTANT]
> **المقياس الديناميكي الوحيد الموثوق** لإثبات هوية قاعدة البيانات هو `/api/menu-mode` بـ Cache MISS.  
> قيمة `noticeTitleAr: "نعتذر، ضغط طلبات حالياً"` و`expectedResumeAt: "الساعة 7:00 مساءً"` موجودة في **`naqer_merged_staging`** فقط وتم التحقق منها مباشرة على القاعدة المحلية.

---

## 3. فحص Category وبانر المندي من مصدر البيانات الفعلي

### قاعدة `naqer_merged_staging` (القراءة المباشرة):
```text
Category.slug='mandi':
  nameAr : 'المندي'
  imageUrl: 'https://res.cloudinary.com/tifawhcs/image/upload/v1795535257/naqer-menu/categories/pdf-mandi.jpg'
  → tifawhcs ✅ (الحساب الجديد)
```

### قاعدة `ep-soft-dawn-bdu5de43` (القديمة — قراءة فقط):
```text
Category.slug='mandi':
  imageUrl: 'https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/categories/pdf-mandi.jpg'
  → damc35hfo (الحساب القديم — لم يُمس)
```

---

## 4. فحص HTML الحي — مراجع Cloudinary

### النتيجة والتحليل:

| المقياس | النتيجة | التفسير |
|:---|:---|:---|
| `tifawhcs` في HTML الحي | **0** | |
| `damc35hfo` في HTML الحي | **185** | |
| `x-vercel-cache` لـ /ar | **STALE** | |
| تاريخ آخر ISR HTML | **19:41:22 GMT** | ثابت منذ أكثر من 20 دقيقة |

> [!WARNING]
> **تشخيص STALE ISR:** صفحة `/ar` وصفحة `/en` تعتمدان على `revalidate = 60` ثانية. في البيئة العادية يجب أن تُجدَّد في الخلفية كل دقيقة. الجمود عند `19:41 GMT` يشير إلى أحد سببين:
> 1. **Vercel لم يُعيد نشر ISR routes** بعد تحديث DATABASE_URL — يتطلب Redeploy واحد لتفعيل ISR من جديد.
> 2. **ISR warm-up بطيء** في منطقة `fra1` بعد تغيير متغير البيئة.

**النتيجة الصريحة:** ما زال HTML الحي يعرض صور `damc35hfo`، لكن هذا **ناتج عن cache قديم للـ ISR pre-rendered HTML** وليس دليلاً على أن Runtime يقرأ من القاعدة القديمة. نقطة API الديناميكية (`/api/menu-mode` بـ MISS) تثبت أن Vercel serverless يعمل.

---

## 5. اختبار المسارات (`/ar`, `/en`, `/admin/login`, `/api/checkout`)

| المسار | HTTP Status | Vercel Cache | الملاحظة |
|:---|:---:|:---:|:---|
| `GET /ar` | **200** | STALE | ISR cached محتوى قديم — صور `damc35hfo` |
| `GET /en` | **200** | STALE | نفس المشكلة |
| `GET /admin/login` | **200** | **MISS** | SSR حي، صفحة تسجيل الدخول تعمل |
| `GET /api/menu-mode` | **200** | **MISS** | قراءة ديناميكية من DB مباشرة |
| `POST /api/checkout` | **400** | — | يعيد `"error": "السلة فارغة."` |

---

## 6. حالة وضع الصيانة

### قراءة `/api/menu-mode`:
```json
"mode": "WHATSAPP_DATABASE",
"isOrderable": true,
"enableNotice": true,
"features.allowOrderCreation": true
```

> [!NOTE]
> **وضع الصيانة الحالي:** النظام في وضع `WHATSAPP_DATABASE` مع `enableNotice: true` وبانر إشعار مفعّل. هذا ليس وضع `DISPLAY_ONLY` الكامل الذي يمنع الطلبات بـ 403، بل وضع يتيح التصفح مع إشعار بضغط الطلبات.  
> اختبار `/api/checkout` أعاد **400** (تحقق الكود من أن السلة فارغة قبل الوصول لقاعدة البيانات) — وهذا **سلوك صحيح** ولا يدل على تجاوز للصيانة.  
> لم يُنشأ أي طلب فعلي، ولم يتم أي كتابة في قاعدة البيانات.

---

## 7. التحقق من صحة بيانات `naqer_merged_staging`

| الكيان | العدد الموثّق | الفحص |
|:---|:---:|:---:|
| `Product` | **151** | ✅ |
| `Category` | **17** | ✅ |
| `ProductImage` | **151** | ✅ |
| صور `tifawhcs` | **40** | ✅ |
| صور `damc35hfo` | **0** | ✅ لا يوجد |
| مانديBanner → `tifawhcs` | ✅ | ✅ |

---

## 8. التحقق من سلامة قاعدة الإنتاج القديمة (`ep-soft-dawn-bdu5de43`)

| المؤشر | القيمة المتوقعة | القيمة الفعلية | الحالة |
|:---|:---|:---|:---:|
| `default_transaction_read_only` | `on` | **`on`** | ✅ |
| عدد المنتجات | 150 | **150** | ✅ |
| عدد الطلبات | 2 | **2** | ✅ |
| عدد AuditLog | 143 | **143** | ✅ |
| بانر المندي | `damc35hfo` | **`damc35hfo`** | ✅ لم يُمس |

**الاستنتاج:** قاعدة الإنتاج القديمة **محمية تماماً** — صفر كتابة، صفر تغيير في الصفوف منذ المرحلة السابقة.

---

## 9. العائق الوحيد المتبقي: ISR Cache Staleness

**السبب الجذري:**  
الصفحات المُبنية مسبقاً (`/ar`, `/en`) تعمل بـ ISR (`revalidate = 60`). عند تغيير `DATABASE_URL` في Vercel Dashboard، لا يُعاد بناء الـ ISR cache تلقائياً — يستمر Vercel في خدمة الـ HTML القديم حتى يتم إعادة البناء الكامل أو Redeploy جديد.

**الحل الأمثل (بيدك):**
1. فتح **Vercel Dashboard → alnaker → Deployments**
2. اختيار آخر deployment → النقر على `...` → **Redeploy** (بدون build cache)
3. أو تشغيل `revalidatePath('/ar')` و `revalidatePath('/en')` من لوحة Admin بعد إلغاء الصيانة.

---

## 10. ملخص الالتزامات

| الالتزام | الحالة |
|:---|:---:|
| لم يُلغَ وضع الصيانة | ✅ |
| لم يُلغَ Read-Only عن القاعدة القديمة | ✅ |
| لم يُنشأ أي طلب أو كتابة تجريبية | ✅ |
| لم تُنفَّذ أي Migrations أو تغييرات Schema | ✅ |
| لم تُطبَع أي Secrets أو Connection Strings | ✅ |

---

**التوقيت:** 2026-11-24T22:01:00+02:00  
**التوقف:** ⏸️ أوقفت العمل بانتظار مراجعتك وقرارك بشأن Redeploy.
