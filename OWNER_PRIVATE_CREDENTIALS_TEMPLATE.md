# OWNER PRIVATE CREDENTIALS TEMPLATE
# نموذج بيانات الاعتماد والأسرار الخاصة بمالك المشروع

> [!CAUTION]
> **وثيقة سرية للغاية — لا تُرفع إلى GitHub إطلاقاً!**
> 
> - هذا الملف عبارة عن **قالب تنظيمي فارغ (Template)** صُمم خصيصاً لمالك مشروع «ناقر منيو» لحفظ ومتابعة بيانات الاعتماد والأسرار الخاصة بكافة الخدمات السحابية.
> - **ممنوع رفع هذا الملف أو أي نسخة تحتوي على أسرار حقيقية إلى مستودعات Git (سواء العامة أو الخاصة).**
> - يُحفظ هذا الملف محلياً على جهاز المالك الشخصي فقط في مكان مشفر، أو يُنقل محتواه إلى مدير كلمات مرور آمن (مثل 1Password, Bitwarden, أو Dashlane).
> - لا تشارك هذه البيانات مع المطورين إلا عند الضرورة القصوى وحسب حدود المسؤولية والصلاحيات الممنوحة.
> 
> *(ملاحظة أمان: يُوصى بإضافة `*CREDENTIALS*.md` إلى ملف `.gitignore` كطبقة حماية إضافية تمنع ارتكاب خطأ الرفع السهو).*

---

## 1. استضافة الواجهة الخلفية والخوادم السحابية (Hosting & Cloud Infrastructure)

| Service | Login URL | Account Email | Username | Password Manager Reference | 2FA Status | Owner Notes |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Vercel** (Production Hosting) | https://vercel.com/login | `[OWNER_EMAIL]` | `[VERCEL_USERNAME]` | `Vault::Naqer/Vercel` | [ ] مفعل<br>[ ] غير مفعل | المشروع: `alnaker` (نطاق: alnaker.vercel.app) |
| **Neon** (Serverless PostgreSQL) | https://console.neon.tech | `[OWNER_EMAIL]` | `[NEON_USERNAME]` | `Vault::Naqer/NeonDB` | [ ] مفعل<br>[ ] غير مفعل | قاعدة بيانات `neondb` (AWS Ohio us-east-2) |

---

## 2. إدارة الشيفرة المصدرية والمستودعات (Source Code & Repositories)

| Service | Login URL | Account Email | Username | Password Manager Reference | 2FA Status | Owner Notes |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **GitHub** (Client Org Remote) | https://github.com/login | `[OWNER_EMAIL]` | `alnakerrest-cloud` | `Vault::Naqer/GitHub-Org` | [ ] مفعل<br>[ ] غير مفعل | المستودع: `alnakerrest-cloud/alnaker` |
| **GitHub** (Lead Developer Remote) | https://github.com/login | `mrboo9779@gmail.com` | `EbrahimShoeib1999` | `Vault::Naqer/GitHub-Dev` | [ ] مفعل<br>[ ] غير مفعل | مستودع التطوير: `naqer-menu` |

---

## 3. الوسائط والتخزين السحابي (Media & Cloud Storage)

| Service | Login URL | Account Email | Username / Cloud Name | Password Manager Reference | 2FA Status | Owner Notes |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Cloudinary** (Image CDN) | https://cloudinary.com/users/login | `[OWNER_EMAIL]` | `tifawhcs` | `Vault::Naqer/Cloudinary` | [ ] مفعل<br>[ ] غير مفعل | المجلد المعتمد: `naqer-menu` |

---

## 4. النطاق وإدارة الـ DNS (Domain Name & DNS Registrar)

| Service | Login URL | Account Email | Domain Name | Password Manager Reference | 2FA Status | Owner Notes |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Domain Registrar** (GoDaddy / Cloudflare / Namecheap) | `[REGISTRAR_LOGIN_URL]` | `[OWNER_EMAIL]` | `alnaker.com` / `[CUSTOM_DOMAIN]` | `Vault::Naqer/DNS` | [ ] مفعل<br>[ ] غير مفعل | سجلات الـ DNS موجهة لـ Vercel (`cname.vercel-dns.com`) |

---

## 5. مزود خدمة البريد الإلكتروني (Email Provider - إن وجد مستقبلاً)

| Service | Login URL | Account Email | Sending Domain | Password Manager Reference | 2FA Status | Owner Notes |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Email Service** (Resend / SES / SendGrid) | `[EMAIL_PROVIDER_LOGIN_URL]` | `[OWNER_EMAIL]` | `orders@alnaker.com` | `Vault::Naqer/Email` | [ ] مفعل<br>[ ] غير مفعل | غير مفعّل حالياً في المشروع (الاعتماد على الواتساب) |

---

## 6. الحسابات الإدارية للوحة التحكم (Admin Users & Staff)

| Account Role | Login URL | Login Email | Initial / Temp Password Reference | Forced Password Reset | Assigned Person | Notes |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **OWNER** (المالك الرئيسي) | https://alnaker.vercel.app/admin/login | `admin@naqer-restaurant.local` | `Vault::Naqer/Admin-Owner` | [ ] نعم<br>[x] تم التغيير | إبراهيم شعيب (مدير عام المطعم) | الحساب التأسيسي الكامل |
| **ADMIN** (مدير العمليات) | https://alnaker.vercel.app/admin/login | `manager@naqer.com` | `Vault::Naqer/Admin-Manager` | [x] نعم<br>[ ] تم التغيير | مشرف العمليات والتشغيل | يتطلب تأكيد وتعيين كلمة المرور |
| **ORDERS_STAFF** (كاشير الصالة) | https://alnaker.vercel.app/admin/login | `cashier@naqer.com` | `Vault::Naqer/Staff-Cashier` | [x] نعم<br>[ ] تم التغيير | أمين الصندوق | مخصص للطلبات والفواتير |
| **ORDERS_STAFF** (فريق التجهيز) | https://alnaker.vercel.app/admin/login | `orders@naqer.com` | `Vault::Naqer/Staff-Kitchen` | [x] نعم<br>[ ] تم التغيير | إدارة وتجهيز الطلبات | مخصص للمطبخ والتوصيل |
| **ORDERS_STAFF** (حساب تجارب الصالة) | https://alnaker.vercel.app/admin/login | `orders-staff@naqer-restaurant.local` | `Vault::Naqer/Staff-Testing` | [ ] نعم<br>[x] تم التغيير | موظف استقبال الطلبات | حساب تشغيلي محلي |

---

## 7. أرقام وهواتف استقبال طلبات الواتساب (WhatsApp Branch Numbers)

| Branch Name | WhatsApp Number (International) | Local Phone | Handled By | Active? | Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **فرع جمصة السياحي** | `+2010XXXXXXXX` | `010XXXXXXXX` | كاشير فرع جمصة | [x] نعم | مربوط بصفحة المنيو والطلبات |
| **فرع دمياط الجديدة** | `+2010XXXXXXXX` | `010XXXXXXXX` | كاشير فرع دمياط | [x] نعم | مربوط بصفحة المنيو والطلبات |

---

## 8. إرشادات التعامل مع الطوارئ وتدوير الأسرار

1. **عند حدوث أي اشتباه بتسريب بيانات:**
   - ادخل فوراً للوحة Vercel وغيّر `SESSION_SECRET` لطرد كافة الجلسات فورياً.
   - ادخل للوحة Neon وغيّر كلمة مرور قاعدة البيانات.
   - ادخل للوحة Cloudinary وأعد توليد المفتاح السري `CLOUDINARY_API_SECRET`.
2. **عند مغادرة أي موظف:**
   - ادخل لشاشة `/admin/users`، وألغِ تفعيل حسابه فوراً أو اضغط على "إلغاء كافة الجلسات النشطة".
