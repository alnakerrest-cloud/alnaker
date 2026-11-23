# CLIENT HANDOVER & OPERATIONAL MANUAL

**Restaurant:** قرية الناقر (Naqer Village)  
**System:** Naqer Menu — Digital Ordering & Admin Platform  
**Target Release:** Release Candidate 1.0 (Production-Ready)  

---

## 1. System Overview

Naqer Menu is a bilingual (Arabic & English), responsive digital menu and ordering platform tailored for **قرية الناقر**. It allows diners to explore categories, customize dish variants, select modifiers and sides, and construct an order that is instantly formatted and submitted directly to the branch's WhatsApp ordering dispatch line.

---

## 2. Restaurant Branches & Contact Numbers

| Branch Name (Arabic) | Branch Name (English) | WhatsApp Ordering Number | Default Status |
| :--- | :--- | :--- | :---: |
| **فرع جمصة** | Gamasa Branch | `01094965222` | Active |
| **فرع دمياط الجديدة** | New Damietta Branch | `01094965222` | Active |

---

## 3. Public Customer Journey

```
[ Browse Categories & Sections ]
              ↓
[ Select Product & Customizations (Variants / Addons / Modifiers) ]
              ↓
[ Add to Cart & Choose Branch ]
              ↓
[ Review Cart & Enter Delivery Details (Name, Phone, Address) ]
              ↓
[ Submit Order -> Launches Branch WhatsApp with Structured Text ]
```

### WhatsApp Order Message Format
When a customer clicks **تأكيد الطلب عبر واتساب**, the application constructs an automated Arabic summary:
```text
طلب جديد من موقع قرية الناقر:
- الاسم: إبراهيم محمد
- الهاتف: 01012345678
- الفرع: فرع دمياط الجديدة
- العنوان: الحي الرابع - بجوار المسجد
-------------------------
الطلبات:
• 1x كباب وريش ضاني (نصف كيلو) - [نوع اللحم: لحم بلدي طازج] (350 ج.م)
• 2x سلطة طحينة (30 ج.م)
-------------------------
المجموع الفرعي: 380 ج.م
خدمة التوصيل: 30 ج.م
ضريبة القيمة المضافة: 45.6 ج.م
الإجمالي المطلوب: 455.6 ج.م
```

---

## 4. Admin Management Dashboard

### Accessing the Dashboard
- **URL:** `https://[your-domain]/admin` (or `/login`)
- **Authentication:** Email & Password with secure HTTP-only session cookies.
- **Forced Password Change:** Any newly created staff account flagged with `mustChangePassword` is automatically prompted to update their password before gaining access to admin functions.

### Available Admin Modules

1. **قائمة المنتجات (Products):**
   - Add, edit, or hide menu items.
   - Assign categories, sub-sections, base prices, preparation times, and badges (e.g. الأكثر طلباً, جديد).
   - Link modifier groups (e.g. نوع اللحم, مستوى التوابل).
2. **التصنيفات والأقسام (Categories & Sections):**
   - Reorder menu categories and section headers.
   - Toggle visibility of seasonal categories.
3. **الفروع (Branches):**
   - Manage branch operating status, address details, and dedicated WhatsApp numbers.
4. **المجموعات والخيارات (Options & Modifiers):**
   - Configure single-choice or multi-choice options with price modifiers (e.g. +15 EGP for extra sauce).
5. **إعدادات المطعم (Settings):**
   - Update restaurant brand name, primary phone, delivery fee (currently 30 EGP), and VAT rate (currently 12%).
6. **سجل العمليات (Audit Log):**
   - View an audit trail of changes made by administrative users.

---

## 5. Staff Roles & Permissions

- **OWNER:** Full platform authority (manage products, branches, settings, user accounts, and view audit logs).
- **ADMIN:** Operational management (products, categories, options, branches, settings).
- **EDITOR:** Menu updates only (product edits, prices, images, availability). Cannot modify system settings or users.

---

## 6. Image Management Best Practices

1. **Format:** WebP is strongly recommended for optimal loading speeds. PNG or high-quality JPG are also accepted.
2. **Aspect Ratio:** 4:3 or 1:1 square ratio with food centered.
3. **Dimensions:** 800 x 600 or 1000 x 750 pixels. Keep file sizes under 200 KB.
4. **Direct Uploads:** Images uploaded through the Admin dashboard are stored securely in your client Cloudinary account (`naqer-menu` folder).

---

## 7. Operational Support & Emergency Actions

- **Change Branch Phone Number:** Go to **Admin $\to$ إعدادات المطعم (Settings)** or **الفروع (Branches)** and update the WhatsApp phone number. Changes take effect immediately.
- **Mark an Item Out of Stock:** In **Admin $\to$ المنتجات (Products)**, toggle the product's availability switch to "غير متوفر" (Unavailable). The item remains listed on the menu with an "نفذت الكمية" badge, preventing customers from ordering it.
- **Emergency Menu Pause:** If the kitchen is overloaded, branches can be temporarily marked inactive in the Branches tab.
