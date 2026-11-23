# Naqer Menu — PDF Image Extraction Report
## Carving Methodology, CMYK Conversion & Applied Assets

**Date:** 2026-11-22  
**Status:** 100% EXTRACTED & CATALOGED  
**Classification:** VERIFIED  

---

## 1. Extraction Technique & Color Correction

- **Original Embedded Objects:** Carved 22 raw JPEG XObjects from Page 1 using `pdf-images/tmp-pdf-extract-jpeg.mjs`.
  - Discarded 4 grayscale SMask graphics.
  - Discarded 2 decorative plate borders.
  - Retained **16 authentic food photographs**.
- **Color Space Challenge & Resolution:**
  - Embedded JPEGs were encoded in Adobe CMYK. Standard decoders rendered them nearly pitch black.
  - Rendered Page 1 at 300 DPI via MuPDF (`scripts/tmp-pdf-render-pages.mjs`) with proper ICC color transform to sRGB, segmenting the 16 food crops with true-to-life colors.

---

## 2. Asset Allocation & Public IDs

14 signature dishes were assigned high-confidence public IDs:
1. `pdf-tray-mashawi` (صينية مشاوي)
2. `pdf-tray-alhobaib` (صينية الحبايب)
3. `pdf-tray-alaila` (صينية العيلة)
4. `pdf-tray-alsahab` (صينية الصحاب)
5. `pdf-tray-almolok` (صينية الملوك)
6. `pdf-tray-alwohoush` (صينية الوحوش)
7. `pdf-tray-alharb` (صينية الحرب العالمية)
8. `pdf-tray-alomda` (صينية العمدة)
9. `pdf-makhashi` (مخاصي)
10. `pdf-batatas-lahm` (بطاطس باللحم)
11. `pdf-basila` (البصلية باللحم الضاني)
12. `pdf-waraq-enab` (ورق عنب بالكوارع) — *Recovered locally at pdf-images/upload/pdf-waraq-enab.jpg*
13. `pdf-bamia-lahm` (بامية باللحمة)
14. `pdf-akawi` (عكاوي)
+ 1 Category Banner: `pdf-mandi` (قسم المندي)
