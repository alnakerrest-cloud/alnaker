# Naqer Menu — Master Documentation Index

**Project Name:** Naqer Menu (قائمة طعام قرية الناقر الرقمية)  
**Production URL:** [https://alnaker.vercel.app](https://alnaker.vercel.app)  
**Primary Repositories:**
- Development / Origin: `https://github.com/EbrahimShoeib1999/naqer-menu.git`
- Production / Client Mirror: `https://github.com/alnakerrest-cloud/alnaker.git`  
**Verified Baseline Commit:** `213f47f975e5f58c7081702d7fe8ffcb697e153b`  
**Documentation Version:** 2.0 (Post-Production Architectural Hardening)  
**Last Updated:** November 23, 2026  

---

## 1. نبذة عن المشروع (Project Abstract)

مشروع **Naqer Menu** هو نظام متكامل لقائمة طعام رقمية تفاعلية ثنائية اللغة (عربي / إنجليزي) مصممة خصيصاً لمطاعم **قرية الناقر** (فرعي جمصة ودمياط الجديدة). يتضمن النظام منصة عامة للعملاء (Customer Facing) مع دعم الطلب عبر الواتساب واستعراض الأصناف والإضافات، ولوحة تحكم إدارية متقدمة (Admin Dashboard) لإدارة المنتجات، الأقسام، العروض، الفروع، الصور، الطلبات، وصلاحيات الموظفين، معتمدة على قاعدة بيانات Neon Serverless PostgreSQL مع دعم تشغيل محلي بدون اتصال.

---

## 2. خريطة مستندات التوثيق (Documentation Map)

| الرقم | اسم المستند | الرابط | الموضوع والهدف | الفئة المستهدفة | حالة التوثيق |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **00** | **Master Index** | [README.md](./README.md) | الفهرس الرئيسي وخريطة الوصول ودليل التوثيق | الجميع | **مكتمل ومُحدث** |
| **01** | **Project Overview** | [01-project-overview.md](./01-project-overview.md) | الرؤية، الأهداف، المعمارية، المكدس التقني، والقرارات الهندسية | المطورون، الإدارة | **مكتمل ومُحدث** |
| **02** | **Installation & Setup** | [02-installation-guide.md](./02-installation-guide.md) | دليل تثبيت وتشغيل المشروع من الصفر محلياً واختباره | المطورون، DevOps | **مكتمل ومُحدث** |
| **03** | **Environment & Secrets** | [03-environment-and-secrets.md](./03-environment-and-secrets.md) | دليل متغيرات البيئة والأسرار وإعداد بيئات النشر | DevOps، الإدارة | **مكتمل ومُحدث** |
| **04** | **Accounts & Access** | [04-accounts-and-access.md](./04-accounts-and-access.md) | إدارة الحسابات، مصفوفة الصلاحيات، وإجراءات الجلسات | مدراء النظام، HR | **مكتمل ومُحدث** |
| **05** | **Email System Audit** | [05-email-system.md](./05-email-system.md) | الفحص الفعلي لنظام البريد الإلكتروني وخطة التكامل المستقبلية | المطورون، الإدارة | **مكتمل ومُحدث** |
| **06** | **Database & Data Guide** | [06-database-guide.md](./06-database-guide.md) | معمارية البيانات، المخطط (Schema)، وحل مشكلة الـ EROFS | المطورون، DBA | **مكتمل ومُحدث** |
| **07** | **Admin User Manual** | [07-admin-user-guide.md](./07-admin-user-guide.md) | الدليل الإرشادي الشامل والخطوات العملية لمدير النظام | المسؤولون، موظفو الإدخال | **مكتمل ومُحدث** |
| **08** | **Customer User Guide** | [08-customer-user-guide.md](./08-customer-user-guide.md) | تجربة الزبائن، التصفح، والطلب عبر الواتساب | الإدارة، خدمة العملاء | **مكتمل ومُحدث** |
| **09** | **Media & Cloudinary** | [09-media-management.md](./09-media-management.md) | إدارة الصور، الربط السحابي مع Cloudinary، والتحسينات | مسؤولو المحتوى | **مكتمل ومُحدث** |
| **10** | **Deployment & Hosting** | [10-deployment-guide.md](./10-deployment-guide.md) | استراتيجية النشر على Vercel، إدارة المستودعات، والتحقق | DevOps، المطورون | **مكتمل ومُحدث** |
| **11** | **Testing & Troubleshooting** | [11-testing-and-troubleshooting.md](./11-testing-and-troubleshooting.md) | الاختبارات الآلية، سجل الأخطاء المحلولة، وإجراءات التحقق | مهندسو الجودة، الدعم | **مكتمل ومُحدث** |
| **12** | **Security & Recovery** | [12-security-and-recovery.md](./12-security-and-recovery.md) | السياسات الأمنية، التشفير، والتعافي من الكوارث | ضباط الأمان، DevOps | **مكتمل ومُحدث** |
| **13** | **Maintenance & Handover** | [13-maintenance-and-handover.md](./13-maintenance-and-handover.md) | بروتوكول تسليم المشروع، المهام الدورية، والمسائل المعلومة | المطور الجديد، المالك | **مكتمل ومُحدث** |

---

## 3. الملفات المساندة خارج مسار Git الرئيسي

- **[ACCOUNT_REGISTER.md](../../ACCOUNT_REGISTER.md):** سجل الحسابات المكتشفة، الأدوار، ومستويات الوصول (بدون أي أسرار).
- **[OWNER_PRIVATE_CREDENTIALS_TEMPLATE.md](../../OWNER_PRIVATE_CREDENTIALS_TEMPLATE.md):** قالب بيانات الاعتماد والأسرار الخاص بالمالك (غير مخصص للنشر ويجب حفظه في Password Manager).

---

## 4. إرشادات القراءة (Who Should Read What)

1. **المالك والمشرف العام (Business Owner / General Manager):**
   - ابدأ بـ [01-project-overview.md](./01-project-overview.md) لفهم النظام ومكوناته.
   - راجع [04-accounts-and-access.md](./04-accounts-and-access.md) لمعرفة كيفية ضبط وصيانة حسابات الموظفين.
   - استخدم [07-admin-user-guide.md](./07-admin-user-guide.md) لتدريب المسؤولين وموظفي المطعم.
   - احتفظ بـ `OWNER_PRIVATE_CREDENTIALS_TEMPLATE.md` في مكان مشفر وآمن.

2. **المطور المستلم للمشروع (Incoming Lead Developer):**
   - اقرأ [02-installation-guide.md](./02-installation-guide.md) لإعداد بيئة العمل المحلية.
   - اقرأ [06-database-guide.md](./06-database-guide.md) لفهم معمارية `lib/persistence-mode.ts` والتفريق بين الـ Local Mock و Neon Live.
   - اقرأ [11-testing-and-troubleshooting.md](./11-testing-and-troubleshooting.md) قبل عمل أي Pull Request.
   - راجع [13-maintenance-and-handover.md](./13-maintenance-and-handover.md) للاطلاع على المهام المتبقية ونقاط القوة والضعف.

3. **مسؤول النشر والعمليات (DevOps / Release Engineer):**
   - التزم بما ورد في [03-environment-and-secrets.md](./03-environment-and-secrets.md) لضبط متغيرات البيئة في Vercel.
   - اتبع دليل النشر في [10-deployment-guide.md](./10-deployment-guide.md).
   - طبق إجراءات الحماية والتعافي في [12-security-and-recovery.md](./12-security-and-recovery.md).
