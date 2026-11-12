# منيو قرية الناقر — Al Naqer Village Digital Menu

منيو إلكتروني ثنائي اللغة (عربي / English) — **Next.js 15 (App Router) + TypeScript** — ريسبونسيف بالكامل، بحث فوري، تنقل بين الأقسام، أنيميشن خفيف، وصفحة QR جاهزة للطباعة.

## التشغيل

```bash
npm install
cp .env.example .env.local     # ثم عدّل NEXT_PUBLIC_SITE_URL للدومين الحقيقي
npm run dev                    # http://127.0.0.1:3001
npm run build && npm start     # نسخة الإنتاج (3001)
```

## هيكل المشروع

```
app/[locale]/page.tsx      صفحة المنيو (ar / en)
app/[locale]/qr/page.tsx   صفحة الـ QR (طباعة / تحميل SVG)
data/menu.ts               ⭐ كل الأصناف والأسعار (عربي + إنجليزي) — هنا بتعدّل
components/MenuView.tsx    البحث، التابات، شريط الأقسام، الأنيميشن
lib/i18n.ts                نصوص الواجهة بالعربي والإنجليزي
lib/site.ts                الفروع ورقم التليفون
middleware.ts              تحويل / إلى /ar أو /en حسب لغة الجهاز (أو آخر اختيار)
app/globals.css            الألوان والخطوط والستايل (متغيرات CSS في أول الملف)
```

## تعديل المنيو

افتح `data/menu.ts` وعدّل السعر أو الاسم أو أضف صنف جديد داخل القسم المناسب:

```ts
item(['بيبسي', 'Pepsi'], [P(25)])                              // سعر واحد
item(['كباب', 'Kebab'], [P(395, THIRD), P(570, HALF)])          // أكثر من سعر
item(['وجبة X', 'Meal X'], [P(120)], ['وصف', 'Description'])    // مع وصف
```

لإضافة قسم جديد: أنشئ `Category` جديد وضعه في مصفوفة `menu` في آخر الملف.

## الـ QR Code

1. انشر المشروع (Vercel مثلًا) واضبط `NEXT_PUBLIC_SITE_URL`.
2. افتح `/ar/qr` للطباعة مباشرة، أو شغّل:
   ```bash
   NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run qr
   ```
   فيطلع `public/qr/naqer-menu-qr.svg` و `.png` (2048px) جاهزين للمطابع.

الـ QR بيفتح `/` فيتحوّل تلقائيًا للغة الزائر (عربي افتراضيًا)، ومعاه `?src=qr` لو حبيت تتابع الزيارات.

## اللوجو

حاليًا فيه شعار مؤقت (نجمة ثمانية) في `components/Logo.tsx`. حط ملف اللوجو في `public/` واستبدل محتوى المكوّن بـ `<Image src="/logo.png" … />`، واستبدل `app/icon.svg` بأيقونة الموقع.

## ملاحظات

- الخطوط (Cairo / Reem Kufi / Playfair Display) بتتحمل من Google Fonts في المتصفح.
- الأسعار شاملة القيمة المضافة، وبتتضاف خدمة 12٪ داخل القرية (زي المنيو المطبوع) — النص ده في `lib/i18n.ts`.
- الترجمة الإنجليزية لأسماء الأطباق الشعبية (عكاوي، مخاصي، تحميرة، شمبري…) مكتوبة بالنطق الحرفي — راجعها مع صاحب المطعم.
