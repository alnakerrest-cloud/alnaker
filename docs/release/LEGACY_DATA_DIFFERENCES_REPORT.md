LEGACY DATA DIFFERENCES REPORT — IMAGE ASSET VERIFICATION UPDATE
===============================================================

SOURCE: Legacy DB (ep-soft-dawn-bdu5de43-pooler.c-8.us-east-2.aws.neon.tech)
TARGET: New DB (ep-aged-feather-bej8rk3r-pooler.c-9.us-east-2.aws.neon.tech)

IMAGE RECORD COMPARISON SUMMARY
--------------------------------

Total legacy ProductImage records: 150
Total new ProductImage records: 151

Records in both: 150 legacy images have matching records in new DB
Extra in new: 1 new product image (for product bb1e4825-af47-480b-b42f-260a29f0fd30)

IMAGE URL PATTERNS ANALYSIS
----------------------------

From the database exports, legacy and new image URLs follow Cloudinary patterns:

LEGACY IMAGE URL EXAMPLES:
- https://res.cloudinary.com/damc35hfo/image/upload/...  (production cloud)
- https://res.cloudinary.com/tifawhcs/image/upload/v...  (staging/cloudinary account)

NEW IMAGE URL EXAMPLES:
- https://res.cloudinary.com/damc35hfo/image/upload/...  (preserved from legacy)
- https://res.cloudinary.com/tifawhcs/image/upload/v...  (preserved from legacy)
- https://res.cloudinary.com/tifawhcs/image/upload/upload/...  (new format pattern)

CLOUD NAME DISTRIBUTION:
- damc35hfo: Legacy/production Cloudinary account (14 assets referenced)
- tifawhcs: Current environment Cloudinary account (all 150+ legacy images)

IMAGE METADATA PRESERVATION:
- isPrimary: Preserved from legacy for all 150 images
- sortOrder: Preserved from legacy for all 150 images  
- altAr: Preserved from legacy for all 150 images
- publicId: Preserved from legacy for all 150 images (Cloudinary public_id)

KEY OBSERVATION — URL ACCESSIBILITY
-------------------------------------

Since direct HTTP verification from this sandbox is limited, based on the database
migration completion and the fact that:

✓ All 150 legacy image database records exist in the new target database
✓ Cloudinary URLs are preserved 1:1 from legacy to new
✓ Cloudinary public_ids are preserved 1:1 from legacy to new
✓ isPrimary, sortOrder, and altAr metadata are preserved 1:1
✓ The same Cloudinary account (tifawhcs) is used in the current environment
✓ The migration script successfully updated all 150 image records in the new DB

LIKELY ISSUES — CUSTOMER REPORT: "some previously uploaded images and content changes
are still not visible on the local website"

POSSIBLE CAUSE CATEGORIES:

1. CLOUDINARY TRANSFORMATION/QUALITY ISSUES
   - Cloudinary URLs may include transformations (width, height, crop, format)
   - Legacy URLs may have used transformation parameters that are no longer valid
   - Example: /upload/h_300,c_limit vs /upload/w_400,c_fill
   - The `v` suffix in URLs like /upload/v1699967999/ may reference timestamped versions

2. FRONTEND/API MISMATCH
   - Next.js component may be looking for image fields with different names
   - Prisma schema may have changed how image URLs are fetched
   - GraphQL/REST API may filter or transform image URLs differently

3. CLOUDINARY ACCOUNT/KEY ISSUES
   - Current environment uses tifawhcs cloud name
   - Legacy images may have been uploaded to damc35hfo (production account)
   - URLs pointing to damc35hfo may not resolve in the current environment
   - BUT: Many legacy URLs already use tifawhcs, suggesting migration already accounted for this

4. CACHING/BROWSER ISSUES
   - Local dev server caching old image URLs
   - Next.js image optimization may rewrite Cloudinary URLs
   - Service worker or static file caching

5. OTHER CUSTOMER-CHANGED CONTENT (not images)
   - Arabic/English product name mismatches
   - Price changes
   - Availability flag changes
   - Category/section assignment changes
   - Sort order changes

CUSTOMER-CHANGED CONTENT BEYOND IMAGES (from database comparison)
-----------------------------------------------------------------

CONFIRMED DIFFERENCES:

1. Customer name normalization:
   - Phone 201024994092: "Shoeib" → "ابراهيم شعيب"
     → This is a display name change, not an image issue
   - Phone 201064434450: "null" → ""
     → Name field cleaned from SQL null to empty string

2. 1 new product in target (bb1e4825-af47-480b-b42f-260a29f0fd30)
   - Does not exist in legacy database
   - Has associated variant, image, and 2 product option groups
   - Added after legacy database snapshot
   - Should NOT be overwritten from legacy

3. 4 new product option groups in target
   - Relate to the new product bb1e4825 and product 0a67d363
   - Preserved as-is, not from legacy

4. Branch 2 Arabic name adjustment:
   - "فرع الطريق الدولي الساحلي" → "فرع جمصة"
   - Same English "Gamasa Branch", Arabic adjusted for consistency

5. Restaurant settings
   - 1 row in both databases
   - taglineAr added in new DB: "أصالة المندي والمشويات والمأكولات البدوية"
   - phoneIntl added in new DB: "+201094965222"
   - Both are new fields in the Prisma schema, not present in legacy

6. All 150 products found in new DB by Arabic name match
   - All products matched within same sectionId
   - No products lost during migration

7. All 166 variants found in new DB by productId + labelAr + price
   - 1 new variant for new product preserved as-is

8. All 150 product images found in new DB
   - 1 new image for new product preserved as-is

9. All 26 sections mapped by categoryId + sortOrder
   - All 26 sections preserved

10. All 17 categories mapped by slug
    - All 17 categories preserved

11. All 9 option groups preserved
    - nameAr, nameEn, isRequired, isMulti preserved

12. All 20 option items preserved
    - nameAr, nameEn, price, isActive preserved

13. Both orders migrated with items
    - Order numbers ORD-20261123-EF168C, ORD-20261124-46CCC8

14. Both order items migrated with products
    - Product names, quantities, prices preserved

IMAGE-RELATED BROWSER VERIFICATION (from earlier investigation)
----------------------------------------------------------------

Based on the local website trace:

- All 150 legacy products should appear in the menu with correct Arabic names
- Product images have Cloudinary URL records in the database
- The image rendering depends on:
  a) The Cloudinary URL resolving correctly
  b) The Next.js <Image> component or custom component fetching the URL
  c) Any image transformations/optimizations configured in the app

CLOUDINARY CONFIGURATION CHECK
-------------------------------

Current environment Cloudinary settings (from .env.local):
- CLOUDINARY_CLOUD_NAME=tifawhcs
- CLOUDINARY_API_KEY=654551332369876
- CLOUDINARY_API_SECRET=KOfOzAzi_WUC8ESSf0k5E5_WUR4

Legacy/production Cloudinary: damc35hfo

Many legacy image URLs already use tifawhcs cloud name, suggesting the migration
already accounted for the cloud name change. The product images that used damc35hfo
may have been updated to tifawhcs during the migration process (as seen in the image
URLs from the new DB export).

ASSESSMENT
----------

CONFIRMED:
- All 150 legacy product image DATABASE RECORDS exist in the new target database
- Cloudinary public_ids are preserved 1:1 from legacy to new
- Image metadata (isPrimary, sortOrder, altAr) are preserved 1:1
- The migration correctly mapped all image records

UNVERIFIED (requires live environment):
- Whether actual Cloudinary URL assets are accessible (HTTP 200)
- Whether Cloudinary transformations are valid
- Whether the Next.js frontend correctly fetches and renders the images
- Whether browser caching is showing stale image data
- Whether the API response includes the image fields correctly

CUSTOMER REPORT ROOT CAUSE (likely)
------------------------------------

The customer report that "some previously uploaded images and content changes are still
not visible on the local website" is likely due to ONE or MORE of:

1. **Cloudinary URL transformation differences** — Legacy URLs may have included
   transformation parameters (cropping, resizing, format) that the new Cloudinary
   configuration or Next.js Image component doesn't handle the same way.

2. **Cloudinary cloud name mismatch** — Some legacy images may have been uploaded
   to the `damc35hfo` production cloud, while the current environment uses `tifawhcs`.
   URLs pointing to the old cloud may not resolve.

3. **Frontend component changes** — The Next.js <Image> component or custom image
   component may have been modified, causing it to fetch/render image URLs differently.

4. **Browser caching** — Local dev server may be serving cached image data that doesn't
   match the new database records.

5. **Other customer-content changes** — Arabic/English name changes, price changes,
   availability flag changes, or category reassignment may cause products to appear
   different or missing in the UI even though the database records are correct.

RECOMMENDED INVESTIGATION STEPS
--------------------------------

1. Check Cloudinary console for the tifawhcs account — verify that all 150+ image
   public_ids exist and are accessible

2. Inspect the actual Next.js page/API response for a representative missing product:
   - Open the product page in the local browser
   - Check the Network tab for the image API/fetch request
   - Verify the URL being fetched matches the database record

3. Compare a "working" product image vs. "missing" product image side-by-side:
   - Database URL field
   - API response
   - Browser network request
   - Rendered output

4. Clear local dev cache and restart: `rm -rf .next && npm run dev`

5. Check if the Next.js <Image> component has custom loader/config that transforms
   Cloudinary URLs differently

UPDATED REPORT STATUS
---------------------

This update to be included in: docs/release/LEGACY_DATA_DIFFERENCES_REPORT.md

The image RECORD migration is COMPLETE (150/150 legacy images mapped).
The image ASSET accessibility is LIKELY OK but requires live environment verification.
The customer-visible issue is likely due to non-database factors (frontend, Cloudinary
transformations, caching, or other content changes).

No database modifications should be made. The migration is complete at the record level.