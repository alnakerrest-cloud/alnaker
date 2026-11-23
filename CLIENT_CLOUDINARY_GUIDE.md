# Client Guide: Cloudinary Integration, Security & Image Management

**Date:** 2026-11-22  
**Target Account:** `tifawhcs`  

---

## 1. Overview & Account Architecture

Naqer Menu integrates with Cloudinary to allow restaurant managers to upload new product photos, update category banners, and change the restaurant logo directly from the Admin Dashboard without developer intervention.

### Folders Structure in Client Account (`tifawhcs`)
Assets are organized in dedicated namespaced directories based on environment:
- **Production Folder:** `naqer-menu/`
  - `naqer-menu/products/` — Product photos.
  - `naqer-menu/categories/` — Category header banners.
  - `naqer-menu/branding/` — Restaurant logos.
- **Staging / Preview Folder:** `naqer-menu-staging/`
  - Isolated from production assets. Prevents test runs from overwriting live media.

---

## 2. API Credentials Setup

In the client's Cloudinary Dashboard at [cloudinary.com](https://cloudinary.com):
1. Navigate to **Settings** $\to$ **Access Keys**.
2. Copy your:
   - **Cloud Name:** `tifawhcs`
   - **API Key:** `(20-digit number)`
   - **API Secret:** `(random string)`
3. Add these credentials to your Vercel Environment Variables:
   - `CLOUDINARY_CLOUD_NAME=tifawhcs`
   - `CLOUDINARY_API_KEY=...`
   - `CLOUDINARY_API_SECRET=...`
   - `CLOUDINARY_SECURE_FOLDER=naqer-menu`

> [!CAUTION]
> The `CLOUDINARY_API_SECRET` must **never** be exposed in client-side code or git commits. In Next.js, all upload and deletion actions are executed server-side via Server Actions (`uploadImage` and `destroyImage` in `lib/cloudinary.ts`).

---

## 3. Upload & Deletion Security Policy

The application enforces strict file upload security in `lib/cloudinary.ts`:
- **Allowed Formats:** Modern raster images only (`image/jpeg`, `image/png`, `image/webp`).
- **Forbidden Formats:** SVGs (`image/svg+xml`), PDFs, executables, or HTML files are explicitly rejected to prevent XSS (Cross-Site Scripting) vectors.
- **Size Limits:** Max 5 MB per image (enforced via Next.js serverAction body limit and client-side validation).
- **Safe Asset Deletion:** Deletions only occur when an existing image is replaced or an item is deleted. Staging environments include a safety guard refusing deletion of assets outside `naqer-menu-staging/`.

---

## 4. Migrating the 14 Heritage Photos

To copy the 14 signature dish photos into your account:
1. Ensure your `.env.local` contains your active `tifawhcs` credentials.
2. Review the generated mapping in `CLOUDINARY_14_ASSETS_MIGRATION_MAPPING.csv`.
3. Execute the migration script:
   ```bash
   APPROVE_CLOUDINARY_MIGRATION=true node scripts/execute-cloudinary-migration.mjs
   ```
4. Verify the uploaded images appear in your Cloudinary Media Library under `naqer-menu/products/`.
5. Rollback mapping is preserved in `CLOUDINARY_14_ASSETS_ROLLBACK.json`.
