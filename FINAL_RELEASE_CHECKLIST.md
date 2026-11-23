# Naqer Menu — Final Release Checklist
## Step-by-Step Production Release & Verification Gates

**Date:** 2026-11-22  
**Target Release:** Production Release Candidate 1.0.0  

---

## 1. Pre-Deployment Verification Gates

- [x] **Git Tree Cleanliness:** No uncommitted unwanted modifications. Polling deactivation confirmed across public components.
- [x] **Type Safety:** `npm run typecheck` passes with 0 errors.
- [x] **Production Compilation:** `npm run build` succeeds with 0 errors; all static routes generated.
- [x] **Authoritative Dataset Validation:** `CLIENT_DATABASE_IMPORT_DATASET.json` passes all 10 integrity checks.
- [x] **Test Data Exclusion:** Zero instances of test category `سبانخ` or test branch `shoeib`.
- [x] **Staging Database Verification:** Schema migrations deployed to `ep-ancient-hill-beec491j`; 151 products, 17 categories, 2 branches imported.
- [x] **Browser Acceptance Tests:** Playwright E2E passes 12/12 tests with 0 console or uncaught errors.
- [x] **Security Validation:** Protected routes redirect unauthenticated users to `/admin/login`; sessions rotate on password change.
- [x] **Cloudinary Connectivity:** Read-only ping to client account `tifawhcs` verified; 14 heritage photos verified on disk.
- [ ] **Owner Approval 1:** Explicit client approval to copy the 14 heritage photos to client Cloudinary account.
- [ ] **Owner Approval 2:** Explicit client approval for production deployment on new Vercel project.

---

## 2. Production Deployment Execution Steps

### Step 1: Provision Production Database
1. Create a fresh PostgreSQL database project on Neon (separate from staging branch).
2. Record the pooled connection string (`-pooler.c-...`).
3. Deploy Prisma migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Import authoritative menu dataset:
   ```bash
   ENV_FILE=.env.production.local node scripts/import-authoritative-dataset.mjs
   ```
5. Provision initial client Owner account with forced password change:
   ```bash
   node scripts/provision-owner.mjs
   ```

### Step 2: Migrate Heritage Cloudinary Assets (Post-Approval)
1. Run the asset migration tool:
   ```bash
   APPROVE_CLOUDINARY_MIGRATION=true ENV_FILE=.env.production.local node scripts/execute-cloudinary-migration.mjs
   ```
2. Verify all 14 images are live in client Cloudinary account (`tifawhcs`).

### Step 3: Deploy to Vercel
1. In the client-owned Vercel account, create a new project linked to the GitHub repository.
2. Select Framework Preset: `Next.js`.
3. Root Directory: `./`.
4. Configure all environment variables per `ENVIRONMENT_VARIABLES_GUIDE.md`:
   - `DATABASE_URL` (production pooled connection string)
   - `SESSION_SECRET` (new random 32-byte hex)
   - `CLOUDINARY_CLOUD_NAME` (`tifawhcs`)
   - `CLOUDINARY_API_KEY` (client API key)
   - `CLOUDINARY_API_SECRET` (client API secret)
   - `CLOUDINARY_SECURE_FOLDER` (`naqer-menu`)
   - `USE_BACKUP_DATA` (`false`)
   - `NEXT_PUBLIC_SITE_URL` (production domain, e.g., `https://menu.naqer.com`)
5. Deploy project.

---

## 3. Post-Deployment Smoke Verification

Within 15 minutes of deployment:
- [ ] Visit `https://<domain>/ar` and verify:
  - Header branding: "قرية الناقر".
  - Phone link: `01094965222`.
  - Categories: all 17 categories displayed in carousel.
  - Platter category: "صينية الوحوش" rendered with photo.
  - Modal: clicking product opens modal with variants and ingredients.
- [ ] Visit `https://<domain>/en` and verify English translations and LTR layout.
- [ ] Add item to cart, click checkout, select branch (فرع دمياط الجديدة), and inspect generated WhatsApp link:
  - Destination number: `201094965222`.
  - Message text: structured order details with items, subtotal, and branch.
- [ ] Visit `https://<domain>/admin/login`:
  - Log in with temporary credentials.
  - Verify forced redirect to `/admin/change-password`.
  - Set new secure password; verify redirect to `/admin/dashboard`.
  - Log out; verify old temporary password fails; log in with new password.

---

## 4. Rollback Plan

If any critical blocker is identified post-deployment:
1. **Application Rollback:** In Vercel Project Dashboard $\to$ Deployments $\to$ click the previous stable deployment $\to$ click "Promote to Production" (instant rollback).
2. **Database Rollback:** Neon provides Point-In-Time Restore (PITR) allowing 1-click branch restoration to any exact second within the retention window.
3. **Image Rollback:** Run `node scripts/prepare-cloudinary-migration.mjs` which created `CLOUDINARY_14_ASSETS_ROLLBACK.json`. No old assets on `damc35hfo` are ever deleted.
