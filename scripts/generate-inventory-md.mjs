import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'product-inventory-data.json'), 'utf8'));

let md = `# Naqer Menu — Product Image Inventory

**Date:** 2026-11-05  
**Total Products:** ${data.length}  
**Total Food Products:** ${data.filter(p => p.group === 'FOOD').length}  
**Total Drink Products:** ${data.filter(p => p.group === 'DRINKS').length}  
**Products with Existing Images:** ${data.filter(p => p.currentImage).length}  
**Products Requiring Real Photography:** ${data.filter(p => !p.currentImage).length}  

---

## 1. Executive Summary

This inventory audits every active product in the Naqer Menu database, categorizing each item by culinary division (Drinks vs. Foods), category classification, current image status, and photography requirement.

### Culinary Group Distribution
- **Drinks (المشروبات):** 72 products across 8 categories (العصائر, الكوكتيلات, القهوة, المثلجات, الميلك شيك, المشروبات الساخنة, سوفت درينكز, الحلويات).
- **Foods (الأطعمة):** 80 products across 9 categories (الصواني, المندي, المشويات, الوجبات, المأكولات البدوية, الشرقي, الأطباق الشعبية, الشوربة, المقبلات).

---

## 2. Drinks Inventory (المشروبات) — 72 Products

`;

const drinksCategories = [
  'العصائر',
  'الكوكتيلات',
  'القهوة',
  'المثلجات',
  'الميلك شيك والسموزي',
  'المشروبات الساخنة',
  'سوفت درينكز',
  'الحلويات',
];

for (const catName of drinksCategories) {
  const items = data.filter(p => p.categoryNameAr === catName);
  if (!items.length) continue;
  md += `### ${catName} (${items.length} أصناف)\n\n`;
  md += `| # | Product ID | الاسم العربي | English Name | السعر | الحالة الحالية | نوع الصورة المطلوبة |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  items.forEach((item, idx) => {
    const status = item.currentImage ? '✅ متوفرة (PDF)' : '⚠️ لا توجد صورة (Placeholder)';
    md += `| ${idx + 1} | \`${item.id}\` | **${item.nameAr}** | ${item.nameEn || '—'} | ${item.price} ج.م | ${status} | تصوير مشروب احترافي عالي الجودة |\n`;
  });
  md += `\n`;
}

md += `---

## 3. Foods Inventory (الأطعمة) — 80 Products

`;

const foodCategories = [
  'الصواني',
  'المندي',
  'المشويات',
  'الوجبات',
  'المأكولات البدوية',
  'الشرقي',
  'الأطباق الشعبية',
  'الشوربة',
  'المقبلات',
];

for (const catName of foodCategories) {
  const items = data.filter(p => p.categoryNameAr === catName);
  if (!items.length) continue;
  md += `### ${catName} (${items.length} أصناف)\n\n`;
  md += `| # | Product ID | الاسم العربي | English Name | السعر | الحالة الحالية | نوع الصورة المطلوبة |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  items.forEach((item, idx) => {
    const status = item.currentImage ? '✅ متوفرة (PDF أصلي)' : '⚠️ لا توجد صورة (Placeholder)';
    md += `| ${idx + 1} | \`${item.id}\` | **${item.nameAr}** | ${item.nameEn || '—'} | ${item.price} ج.م | ${status} | تصوير أطباق ومأكولات احترافي |\n`;
  });
  md += `\n`;
}

fs.writeFileSync(path.resolve(__dirname, '..', 'PRODUCT_IMAGE_INVENTORY.md'), md, 'utf8');
console.log('Generated PRODUCT_IMAGE_INVENTORY.md successfully.');

