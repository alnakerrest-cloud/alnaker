# Naqer Menu — Data Exclusion & Retention Report
## Cleansing Protocol, Test Record Removal & Authoritative Boundary

**Date:** 2026-11-22  
**Status:** RECONCILED & FILTERED  
**Classification:** VERIFIED  

---

## 1. Excluded Records (Do NOT Import to Client Production)

| Entity / Table | Excluded Identifier | Reason for Exclusion | Impact on Production |
| :--- | :--- | :--- | :--- |
| **Category** | `cmw1374a7001m0svy6pq8l0xh` (`سبانخ`) | Test category created during admin UI debugging; contains 0 products. | Prevents empty test category from cluttering menu navigation. |
| **Section** | Section linked to `cmw1374a7001m0svy6pq8l0xh` | Empty test section. | Clean schema. |
| **Branch** | `test-shoeib-branch-id` (`shoeib`) | Test branch artifact from previous local tests. | Prevents customers from selecting a fake test branch. |
| **AuditLog / Order** | Historical dev orders & logs | Development artifacts from checkout simulations. | Gives the client a completely fresh, clean production database. |

---

## 2. Retained Authoritative Records (In `CLIENT_DATABASE_IMPORT_DATASET.json`)

- **RestaurantSettings:** 1 record (Restaurant branding, tax, service fees, operating hours).
- **Branch:** 2 authentic branches:
  1. `فرع جمصة` (`7fa2be20-67bd-4060-a83a-81ded2550018`)
  2. `فرع دمياط الجديدة` (`6d6528bd-dbd4-4672-aa5f-953063d3a36e`)
- **Categories:** 17 authentic categories (المشويات, الوجبات, الشوربة, المقبلات, الشرقي, المثلجات, الحلويات, الصواني, الأطباق الشعبية, الميلك شيك والسموزي, المشروبات الساخنة, المندي, سوفت درينكز, المأكولات البدوية, الكوكتيلات, العصائر, القهوة).
- **Sections:** 26 structured sections.
- **Products:** 151 complete dishes.
- **ProductVariants:** 167 pricing variants (weights, sizes, servings).
- **ProductImages:** 151 images (14 Cloudinary + 137 local WebP).
- **OptionGroups & Items:** 9 modifier groups, 20 items, 30 product links.
