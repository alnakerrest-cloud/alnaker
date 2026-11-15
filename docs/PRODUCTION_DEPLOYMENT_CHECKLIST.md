# NAQER MENU — PRODUCTION DEPLOYMENT CHECKLIST

**Target Environment:** Vercel Serverless / Node.js Production Host  
**Release Version:** Naqer Menu 1.0.0 Release Candidate  
**Target Git Branch:** `main`  
**Neon Database Cluster:** `ep-withered-bread-bemwq8ns-pooler.c-9.us-east-2.aws.neon.tech`  

---

## 1. PRE-DEPLOYMENT PREREQUISITES

Execute these checks before triggering any deployment:

- [ ] **1.1 Git Commit State:**
  - Verify working tree is clean on `origin/main`.
  - Confirm latest release commit hash matches the verified release build.
- [ ] **1.2 Secrets & Environment Variables:**
  - Verify the following production environment variables are configured in the hosting provider (e.g. Vercel Project Settings):
    - `DATABASE_URL`: Connection string pointing to Neon pooler (`sslmode=require`).
    - `DIRECT_URL`: Direct unpooled Neon connection string for migrations.
    - `ADMIN_SESSION_SECRET`: Cryptographically strong random string (>= 32 characters).
    - `CLOUDINARY_CLOUD_NAME`: Production Cloudinary cloud name.
    - `CLOUDINARY_API_KEY`: Production Cloudinary API key.
    - `CLOUDINARY_API_SECRET`: Production Cloudinary API secret.
    - `CLOUDINARY_SECURE_FOLDER`: `naqer-menu` (or designated prod folder).
    - `NEXT_PUBLIC_SITE_URL`: Production canonical domain (e.g., `https://menu.naqer.com`).
- [ ] **1.3 Database Backup:**
  - Confirm a snapshot or backup exists for the Production Neon database before initiating deployment.

---

## 2. DATABASE PREPARATION & MIGRATION

- [ ] **2.1 Migration Status Check:**
  - Run Prisma migration status in a secure CI/CD or deployment runner:
    ```bash
    npx prisma migrate status
    ```
  - Verify that no unapplied migrations exist, or apply pending migrations using:
    ```bash
    npx prisma migrate deploy
    ```
  - *(Note: Never run `prisma db push` or `prisma migrate reset` in production!)*
- [ ] **2.2 Connection Pooling:**
  - Ensure `DATABASE_URL` connects through the Neon PgBouncer pooler (`-pooler` suffix) to prevent serverless connection exhaustion.

---

## 3. DEPLOYMENT EXECUTION

- [ ] **3.1 Production Build Verification:**
  - Confirm build completes with zero errors:
    ```bash
    npm run build
    ```
  - Expected output: All 27 routes pre-rendered statically or dynamically mapped.
- [ ] **3.2 Vercel / Hosting Deployment:**
  - Push changes to `main` branch to trigger automated production deployment pipeline.
  - Monitor deployment build logs for successful Turbopack bundling and Prisma client generation.

---

## 4. POST-DEPLOYMENT SMOKE TEST PROTOCOL

Conduct live smoke testing immediately following deployment:

- [ ] **4.1 Public Menu (Arabic):**
  - Navigate to `https://<domain>/ar`.
  - Confirm hero banner, branch status, and categories render.
  - Test on mobile device or responsive emulator (375px) — verify 0px horizontal scroll.
- [ ] **4.2 Public Menu (English):**
  - Navigate to `https://<domain>/en`.
  - Confirm English localization and LTR layout.
- [ ] **4.3 Product Modal & Customization:**
  - Click any food item; verify modal opens with price and description.
- [ ] **4.4 Cart & WhatsApp Link Generation:**
  - Add an item to the cart; open cart drawer.
  - Verify subtotal and service charges.
  - Click WhatsApp checkout button; confirm browser prompts to open WhatsApp with encoded order text.
- [ ] **4.5 Tabletop QR Route:**
  - Navigate to `https://<domain>/ar/qr`.
  - Verify high-resolution QR code renders clearly for scanning.
- [ ] **4.6 LiveSync Cache Invalidation:**
  - Query `GET https://<domain>/api/content-version`.
  - Verify HTTP 200 response with valid `contentVersion` string.
- [ ] **4.7 Admin Dashboard Authentication:**
  - Navigate to `https://<domain>/admin/login`.
  - Sign in with authorized production OWNER credentials.
  - Verify successful redirect to `/admin/dashboard`.
- [ ] **4.8 Admin Responsive Cards:**
  - Inspect `/admin/products` and `/admin/categories` on mobile viewport; confirm vertical cards display with status badges and edit links.
- [ ] **4.9 Media Asset Delivery:**
  - Inspect product images; verify images load from Cloudinary CDN without 404 or broken icons.

---

## 5. MONITORING & ROLLBACK READINESS

- [ ] **5.1 Error Monitoring:**
  - Monitor Vercel Runtime Logs and Serverless Function metrics for any uncaught 500 errors.
- [ ] **5.2 Rollback Plan:**
  - In the event of an unforeseen production regression:
    1. Instant rollback via Vercel Dashboard: Click "Promote to Production" on the previous stable deployment.
    2. Refer to [DATABASE_MIGRATION_AND_ROLLBACK.md](file:///C:/Users/ibrah/.gemini/antigravity/brain/c80176dd-bad0-4a03-9018-f631103b1647/DATABASE_MIGRATION_AND_ROLLBACK.md) for database recovery steps.
