# منيو قرية الناقر — Al Naqer Village Digital Menu & Ordering System

نظام رقمي تفاعلي متكامل لإدارة وعرض قائمة الطعام والطلب المباشر عبر واتساب لمطاعم وقرية الناقر، مصمم وفق أحدث معايير الويب ومعمارية خوادم Serverless فائقة السرعة.

> 📖 **التوثيق الشامل ودليل التسليم للعميل:**  
> يتوفر توثيق هندسي وإداري متكامل ومفصل في 16 كُتيباً رسمياً داخل المجلد [`docs/handbook/`](docs/handbook/README.md).  
> يُرجى مراجعة [فهرس الدليل الإرشادي الشامل (Master Handbook)](docs/handbook/README.md) للاطلاع على كافة التفاصيل المعمارية، تكاليف الخدمات السحابية، دليل لوحة التحكم، وإجراءات النشر والتسليم.

---

## أبرز مميزات النظام (Key Features)

* **ثنائي اللغة بالكامل (Bilingual Experience):** دعم كامل للغة العربية (RTL مع خط Cairo) والإنجليزية (LTR) مع تبديل لحظي سلس.
* **البحث السريع والتنقل اللحظي:** محرك بحث عربي متقدم يتعامل بذكاء مع الألف والهمزات والتاء المربوطة والتشكيل.
* **سلة طلبات ذكية وربط واتساب:** تجميع الوجبات وخيارات الأحجام والإضافات وتوجيه الطلب بنقرة واحدة لفرع المطعم الأقرب عبر واتساب مجاناً.
* **لوحة تحكم إدارية مركزية (Admin Dashboard):** تحكم كامل في إضافة وحذف وإخفاء المنتجات، تعديل الأسعار، إدارة الفروع، ورفع الصور السحابية.
* **نظام صلاحيات صارم (RBAC):** تمييز دقيق بين رتبة المالك (`OWNER`) ورتبة المحرر (`EDITOR`).
* **مزامنة حية لحظية (LiveSync Engine):** تحديث محتوى شاشات الزبائن فوراً عند تعديل الأسعار أو نفاد صنف دون الحاجة لإعادة تحميل الصفحة.
* **صور محسنة وفائقة السرعة:** تكامل سحابي مع Cloudinary و Next.js Image Optimization لعرض صور الوجبات بجودة استثنائية وأقل حجم للبيانات.

---

## البنية التقنية (Tech Stack)

* **الإطار البرمجي:** [Next.js 16](https://nextjs.org/) (App Router & Serverless Functions) مع [React 19](https://react.dev/).
* **لغة التطوير:** [TypeScript 5.9](https://www.typescriptlang.org/) مع تفعيل النمط الصارم (Strict Mode).
* **قاعدة البيانات:** PostgreSQL سحابية مدعومة بواسطة [Neon Serverless](https://neon.tech/) مع إدارة التجميع (Connection Pooling).
* **طبقة البيانات (ORM):** [Prisma 7.10](https://www.prisma.io/).
* **فحص التحقق والأمان:** [Zod 4](https://zod.dev/) مع جسر التوافق `zod/v3`.
* **التخزين السحابي للوسائط:** [Cloudinary](https://cloudinary.com/) للرفع التلقائي والتحويل لنسخ WebP/AVIF.
* **إطار التنسيق:** [Tailwind CSS](https://tailwindcss.com/) مع خطوط Google Fonts (Cairo & Playfair Display).
* **منظومة الاختبارات:** [Playwright E2E](https://playwright.dev/) مع 14 جناح فحص مؤتمت يغطي كافة وظائف النظام.

---

## التشغيل السريع محلياً (Quick Start)

```bash
# 1. تثبيت الاعتماديات
npm install

# 2. إعداد المتغيرات البيئية
cp .env.example .env.local

# 3. توليد عميل بريزما
npx prisma generate

# 4. تشغيل خادم التطوير المحلي
npm run dev
```

افتح المتصفح على:
* الواجهة العامة: [http://localhost:3000/ar](http://localhost:3000/ar)
* لوحة التحكم: [http://localhost:3000/admin](http://localhost:3000/admin)

للاطلاع على دليل التطوير المحلي المفصل، راجع: [`docs/handbook/10-LOCAL-DEVELOPMENT.md`](docs/handbook/10-LOCAL-DEVELOPMENT.md).

---

## فهرس كتيبات التوثيق والتسليم (Documentation & Handover Index)

1. [01 — نظرة عامة على المشروع والمنتج](docs/handbook/01-PROJECT-OVERVIEW.md)
2. [02 — البنية التقنية والمعمارية البرمجية](docs/handbook/02-TECHNICAL-ARCHITECTURE.md)
3. [03 — قاموس قاعدة البيانات وهندسة الجداول](docs/handbook/03-DATABASE-DICTIONARY.md)
4. [04 — دليل استخدام لوحة التحكم الإدارية](docs/handbook/04-ADMIN-DASHBOARD-MANUAL.md)
5. [05 — دليل الحسابات والمصادقة والتسليم الآمن](docs/handbook/05-ACCOUNT-ACCESS.md)
6. [06 — تجربة المنيو العام وسلة الطلبات والواتساب](docs/handbook/06-PUBLIC-MENU-AND-ORDERING.md)
7. [07 — المتغيرات البيئية والتكاملات السحابية](docs/handbook/07-ENVIRONMENT-AND-INTEGRATIONS.md)
8. [08 — الخدمات الخارجية، الاشتراكات والتكاليف](docs/handbook/08-SERVICES-SUBSCRIPTIONS-AND-COSTS.md)
9. [09 — متطلبات العميل وقائمة التجهيز التشغيلي](docs/handbook/09-CLIENT-REQUIREMENTS.md)
10. [10 — دليل التطوير المحلي والإعداد الهندسي](docs/handbook/10-LOCAL-DEVELOPMENT.md)
11. [11 — النشر والإطلاق في بيئة الإنتاج](docs/handbook/11-DEPLOYMENT-AND-PRODUCTION.md)
12. [12 — النسخ الاحتياطي، الاستعادة والصيانة](docs/handbook/12-BACKUP-RECOVERY-MAINTENANCE.md)
13. [13 — منظومة الاختبارات وضمان الجودة](docs/handbook/13-TESTING-AND-QA.md)
14. [14 — دليل حل المشكلات والأخطاء الشائعة](docs/handbook/14-TROUBLESHOOTING.md)
15. [15 — وثيقة التسليم النهائي ومحضر الاستلام](docs/handbook/15-CLIENT-HANDOVER.md)
16. [16 — مصفوفة ملكية الخدمات والمسؤوليات المالية](docs/handbook/16-SERVICE-OWNERSHIP-AND-BILLING.md)
17. [الدليل الإرشادي الشامل (README Master Index)](docs/handbook/README.md)
