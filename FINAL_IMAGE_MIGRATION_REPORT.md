# Naqer Menu — Final Image Migration Report
## Image Inventory, Verification Evidence & Client Cloudinary Migration Package

**Date:** 2026-11-22  
**Status:** MIGRATION READY — EXECUTION GATED BY OWNER APPROVAL  
**Client Cloudinary Account:** `tifawhcs`  
**Retired Cloudinary Account:** `damc35hfo`  

---

## 1. Complete Image Architecture & Inventory

The Naqer Menu visual asset architecture uses a dual-tier strategy designed for high performance and zero monthly CDN costs:

1. **Local High-Performance WebP Assets (137 Dishes):**
   - Stored in the Next.js static asset tree (`public/images/products/...`).
   - Served directly by Vercel's global Edge CDN at zero additional cost.
   - 100% verified present on disk across all 17 categories.
   - Recommended and retained locally per Section E guidelines.
2. **Cloudinary Heritage Dish Photography (14 Signature Dishes):**
   - High-definition scans of signature trays and traditional clay-pot casseroles extracted from the authentic printed menu (`50500.pdf`).
   - Currently point to the retired development Cloudinary account (`damc35hfo`).
   - 100% recovered and verified in local high-resolution backup at `pdf-images/upload/`.
   - Ready to be uploaded to client-owned account `tifawhcs` upon explicit approval.

---

## 2. Inventory of the 14 Heritage Dishes to Migrate

| # | Product ID | Dish Name (Arabic) | Category | Local Backup File | File Size | Old URL (`damc35hfo`) | Target Client URL (`tifawhcs`) |
| :-: | :--- | :--- | :---: | :--- | :-: | :--- | :--- |
| 1 | `0a67d363-e9fa-4854-981b-89d3b214260f` | صينية الوحوش | الصواني | `pdf-images/upload/pdf-tray-alwohoush.jpg` | 117 KB | `.../damc35hfo/.../pdf-tray-alwohoush.jpg` | `.../tifawhcs/.../pdf-tray-alwohoush.jpg` |
| 2 | `5580e943-c91a-41b4-9a62-b8591af1fc3e` | صينية الملوك | الصواني | `pdf-images/upload/pdf-tray-almolok.jpg` | 118 KB | `.../damc35hfo/.../pdf-tray-almolok.jpg` | `.../tifawhcs/.../pdf-tray-almolok.jpg` |
| 3 | `c14570a8-5fb2-4b70-8e4c-e9e4d36c89a0` | صينية الصحاب | الصواني | `pdf-images/upload/pdf-tray-alsahab.jpg` | 123 KB | `.../damc35hfo/.../pdf-tray-alsahab.jpg` | `.../tifawhcs/.../pdf-tray-alsahab.jpg` |
| 4 | `70e810f5-41d5-464e-83b3-f34e76523f81` | صينية العيلة | الصواني | `pdf-images/upload/pdf-tray-alaila.jpg` | 121 KB | `.../damc35hfo/.../pdf-tray-alaila.jpg` | `.../tifawhcs/.../pdf-tray-alaila.jpg` |
| 5 | `99b88b58-a108-4820-b004-2e31a4f4e03d` | صينية الحبايب | الصواني | `pdf-images/upload/pdf-tray-alhobaib.jpg` | 112 KB | `.../damc35hfo/.../pdf-tray-alhobaib.jpg` | `.../tifawhcs/.../pdf-tray-alhobaib.jpg` |
| 6 | `8cd30623-2fcf-4ef5-bc59-fff32b7315e0` | صينية مشاوي | الصواني | `pdf-images/upload/pdf-tray-mashawi.jpg` | 122 KB | `.../damc35hfo/.../pdf-tray-mashawi.jpg` | `.../tifawhcs/.../pdf-tray-mashawi.jpg` |
| 7 | `db1d25c3-c497-4386-94b2-06c4126ecf5f` | صينية العمدة | الصواني | `pdf-images/upload/pdf-tray-alomda.jpg` | 120 KB | `.../damc35hfo/.../pdf-tray-alomda.jpg` | `.../tifawhcs/.../pdf-tray-alomda.jpg` |
| 8 | `9eca542a-156c-4211-a971-a34ce69335ae` | صينية الحرب العالمية | الصواني | `pdf-images/upload/pdf-tray-alharb.jpg` | 127 KB | `.../damc35hfo/.../pdf-tray-alharb.jpg` | `.../tifawhcs/.../pdf-tray-alharb.jpg` |
| 9 | `f8e7993b-dcc9-4679-9cdc-17380097b0dd` | بامية باللحمة | الأطباق الشعبية | `pdf-images/upload/pdf-bamia-lahm.jpg` | 23 KB | `.../damc35hfo/.../pdf-bamia-lahm.jpg` | `.../tifawhcs/.../pdf-bamia-lahm.jpg` |
| 10 | `6a58694d-4b4f-434e-b6f0-823a721097b9` | بطاطس باللحم | الأطباق الشعبية | `pdf-images/upload/pdf-batatas-lahm.jpg` | 25 KB | `.../damc35hfo/.../pdf-batatas-lahm.jpg` | `.../tifawhcs/.../pdf-batatas-lahm.jpg` |
| 11 | `fa678752-63b1-4922-b9eb-cb40ec42940d` | عكاوي | الأطباق الشعبية | `pdf-images/upload/pdf-akawi.jpg` | 24 KB | `.../damc35hfo/.../pdf-akawi.jpg` | `.../tifawhcs/.../pdf-akawi.jpg` |
| 12 | `e5259930-d19c-4418-b106-2c2d137414f3` | ورق عنب بالكوارع | الأطباق الشعبية | `pdf-images/upload/pdf-waraq-enab.jpg` | 30 KB | `.../damc35hfo/.../pdf-waraq-enab.jpg` (404) | `.../tifawhcs/.../pdf-waraq-enab.jpg` |
| 13 | `86e5f810-3af5-4744-8d9d-c0758c638893` | البصلية باللحم الضاني | الأطباق الشعبية | `pdf-images/upload/pdf-basila.jpg` | 22 KB | `.../damc35hfo/.../pdf-basila.jpg` | `.../tifawhcs/.../pdf-basila.jpg` |
| 14 | `30d72b30-3bdf-4b01-b086-5007f31c56a4` | مخاصي | الأطباق الشعبية | `pdf-images/upload/pdf-makhashi.jpg` | 23 KB | `.../damc35hfo/.../pdf-makhashi.jpg` | `.../tifawhcs/.../pdf-makhashi.jpg` |

> [!NOTE]
> Item 12 (`ورق عنب بالكوارع`) returned HTTP 404 on the old developer CDN, but its authentic 30 KB JPEG file was successfully recovered in the project repository at `pdf-images/upload/pdf-waraq-enab.jpg` and verified with matching dimensions.

---

## 3. Artifact Files Generated

1. **Mapping CSV:** `CLOUDINARY_14_ASSETS_MIGRATION_MAPPING.csv` (contains product IDs, names, local file status, old URLs, and target URLs).
2. **Rollback JSON:** `CLOUDINARY_14_ASSETS_ROLLBACK.json` (contains exact previous URLs and public IDs to restore previous state in 1 second if needed).
3. **Execution Script:** `scripts/execute-cloudinary-migration.mjs` (automated copy tool gated by `APPROVE_CLOUDINARY_MIGRATION=true`).

---

## 4. Execution Plan (Post-Approval)

When the owner provides explicit approval:
1. Run:
   ```bash
   APPROVE_CLOUDINARY_MIGRATION=true node scripts/execute-cloudinary-migration.mjs
   ```
2. The script uploads all 14 files to `naqer-menu/products/<publicId>` in `tifawhcs`.
3. Update `ProductImage` records in the production database with the new URLs.
4. Old assets on `damc35hfo` will **never** be deleted, ensuring zero risk.
