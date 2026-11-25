# 05 — Email System Audit & Integration Status

**Project:** Naqer Menu  
**Scope:** Email Infrastructure Audit, Notification Strategy, and Future Roadmap  
**Target Audience:** Lead Developers, System Architects, Product Managers  

---

## 1. الفحص الفعلي للشيفرة المصدرية (Codebase Audit Findings)

> [!IMPORTANT]
> **النتيجة الصريحة للفحص:**  
> **لا يوجد نظام بريد إلكتروني فعلي (No Active Email Integration) في المشروع حالياً.**

تم إجراء فحص شامل للشيفرة المصدرية والمكتبات المثبتة في [package.json](file:///e:/real%20projects/naqer-menu/package.json):
1. **لا توجد مكتبات إرسال بريد مثبتة:** تم البحث عن `resend`، `nodemailer`، `@sendgrid/mail`، `postmark`، أو مكتبات بروتوكول `smtp`، وجميعها **غير موجودة**.
2. **استخدام الإيميل مقتصر على المصادقة:** حقل `email` في جدول `AdminUser` يُستخدم كمعرّف وحيد (Unique Identifier / Username) لتسجيل دخول المسؤولين فقط، ولا يتم إرسال أي رسائل ترحيبية أو إشعارات إليه.
3. **استعادة كلمة المرور (Password Reset):** لا توجد آلية استعادة كلمة المرور عبر رابط يُرسل بالبريد (Magic Link أو Reset Token). إدارة كلمات المرور تتم داخلياً عبر المشرفين والمالك من صفحة `/admin/users` أو عبر واجهة `/admin/change-password`.
4. **إشعارات الزبائن والطلبات:** قناة التواصل والإشعار الوحيدة المعتمدة والفعالة في المشروع هي **WhatsApp Direct Messaging** ورابط الفاتورة المباشر.

---

## 2. التدقيق الفعلي لقنوات التواصل، الإشعارات، والـ OTP

بناءً على فحص كافة مسارات الإرسال والتحقق في الكود المصدري، يوضح الجدول التالي حقيقة كل قناة:

| قناة التواصل (Channel) | الحالة الفعلية في الكود | آلية العمل البرمجية المثبتة (Source Evidence) | التصنيف الصارم |
| :--- | :---: | :--- | :---: |
| **Email Providers (البريد الإلكتروني)** | **غير موجود مطلقاً** | لا توجد أي مكتبة إرسال (مثل Nodemailer, Resend, SendGrid) ولا إعدادات SMTP في `.env`. | **Verified in Source Code** (Zero Email) |
| **SMS Providers (رسائل SMS)** | **غير موجود مطلقاً** | لا يوجد أي ربط ببوابات SMS خارجية (مثل Twilio, Unifonic, VictoryLink). | **Verified in Source Code** (Zero SMS) |
| **OTP Provider (رمز التحقق للهاتف)** | **محاكي محلي في الذاكرة (Mock)** | يعتمد على فئة `DefaultLocalOtpProvider` في [lib/otp-provider.ts](file:///e:/real%20projects/naqer-menu/lib/otp-provider.ts)؛ يقوم بتوليد رمز 4 أرقام وتخزينه في `Map` مؤقتة بالذاكرة وإرجاعه مباشرة في استجابة الـ JSON عبر حقل `debugCode`. **لا يتم إرسال أي رسالة نصية لهاتف العميل.** | **Verified in Source Code** (Mock In-Memory OTP) |
| **WhatsApp Integration (الواتساب)** | **توجيه بالمتصفح (URL Scheme)** | مسار [app/api/checkout/route.ts](file:///e:/real%20projects/naqer-menu/app/api/checkout/route.ts) يقوم بتوليد رابط متصفح بصيغة `https://wa.me/<PHONE>?text=<MESSAGE>` ليفتحه الزبون من جهازه. **ليس WhatsApp Business Cloud API خلفي ولا Webhook آلي.** | **Verified in Source Code** (Client URL Redirect) |
| **Customer Notifications (الإشعارات)** | **سجلات داخلية (In-App Polling)** | يتم حفظ إشعارات الطلبات في جدول/مخزن محلي واسترجاعها عبر استدعاء GET لنقطة `/api/customer/notifications` عند فتح العميل للموقع. **ليست Web Push ولا SMS.** | **Verified in Source Code** (In-App Store Only) |

---

## 3. خطة وإرشادات دمج نظام البريد الإلكتروني مستقبلاً (Future Email Roadmap)

إذا رغبت إدارة المطعم في المستقبل بتفعيل إرسال تقارير المبيعات اليومية أو استعادة كلمات المرور عبر البريد:

### مزود الخدمة الموصى به (Recommended Provider: Resend)
- **سبب التوصية:** يدعم مكتبات Next.js و React Email بشكل مدمج، ويعمل بكفاءة عالية على خوادم Vercel Serverless.

### خطوات التثبيت المستقبلية (Implementation Steps):
1. **تثبيت الحزم:**
   ```bash
   npm install resend @react-email/components
   ```
2. **إضافة المتغيرات البيئية إلى Vercel و `.env.local`:**
   ```env
   RESEND_API_KEY=re_123456789...
   EMAIL_FROM="مطعم قرية الناقر <noreply@alnaker-menu.com>"
   ```
3. **ضبط سجلات النطاق (DNS Configuration):**
   - إضافة سجلات **SPF** لمنع وصول الرسائل لصندوق السبام.
   - إضافة مفاتيح **DKIM** للتحقق من هوية المرسل.
   - ضبط سياسة **DMARC** لحماية سمعة النطاق.
4. **تفعيل دالة استعادة كلمة المرور:** إنشاء مسار `app/admin/forgot-password` يولد رمز توكن عشوائي ينتهي خلال 15 دقيقة ويتم إرساله لرابط المشرف.
