# PRODUCTION DEPLOYMENT & RELEASE OPERATIONAL CHECKLIST

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-14  
**Project:** Naqer Menu  
**Repository:** `E:\real projects\naqer-menu`  
**Classification:** Authoritative Release Handbook for DevOps / Release Lead  

---

## 1. Production Environment Variables (The Exact 7 Keys)

Configure these exact 7 environment variables in your production hosting platform (e.g., Vercel Project Settings > Environment Variables). **Never commit secret values to version control.**

| # | Environment Variable Key | Scope | Description & Requirements |
|---|--------------------------|-------|----------------------------|
| 1 | `DATABASE_URL` | Server | Production Neon PostgreSQL pooled connection string (`postgres://...sslmode=verify-full`). Must point to the production database (`ep-withered-bread-bemwq8ns`). |
| 2 | `SESSION_SECRET` | Server | High-entropy cryptographic string (≥64 characters) used as HMAC-SHA256 secret key for hashing admin session tokens. |
| 3 | `CLOUDINARY_CLOUD_NAME` | Server | Cloudinary account identifier for media storage and dynamic transformation. |
| 4 | `CLOUDINARY_API_KEY` | Server | Cloudinary API access key for authenticated uploads and deletions. |
| 5 | `CLOUDINARY_API_SECRET` | Server | Cloudinary API secret key. Server-only; never exposed to browser bundles. |
| 6 | `CLOUDINARY_SECURE_FOLDER`| Server | Root folder prefix inside Cloudinary (e.g., `naqer-menu`). Isolates restaurant media into subfolders (`/products`, `/categories`, `/branding`, `/offers`). |
| 7 | `NEXT_PUBLIC_SITE_URL` | Universal | Fully qualified public canonical URL (e.g., `https://menu.naqer.com`). Used for OpenGraph metadata, QR code deep linking, and sitemap generation. |

---

## 2. Pre-Deployment Database Preparation (Non-Destructive)

> [!IMPORTANT]
> Never execute `prisma db push --force-reset` or `prisma migrate reset` against production.

1. **Verify Database Connection:**
   Ensure `DATABASE_URL` connects to the production Neon project (`ep-withered-bread-bemwq8ns`).
2. **Apply Migrations Safely:**
   Execute standard forward-only migration deployment:
   ```bash
   npx prisma migrate deploy
   ```
   *Expected Result:* `All migrations have been successfully applied.`
3. **Verify Database Record Count:**
   Confirm that all 151 restaurant products, 17 categories, and 2 active branches are preserved intact:
   ```bash
   node scripts/verify-final-db-integrity.mjs
   ```

---

## 3. Initial OWNER Account Provisioning

If the production database does not yet have an OWNER account:
1. Run the safe provisioning script in a secure administrative shell:
   ```bash
   OWNER_EMAIL="client-owner@naqer.com" OWNER_PASSWORD="<generated-secure-passphrase>" node scripts/provision-owner.mjs
   ```
2. Verify that the script outputs `OWNER account created successfully.` without echoing credentials.
3. Test login at `https://<production-domain>/admin/login`.

---

## 4. Vercel Hosting Configuration

1. **Build & Development Settings:**
   - Framework Preset: `Next.js`
   - Build Command: `next build` (or leave default)
   - Output Directory: `.next`
   - Node.js Version: `20.x` or `22.x`
2. **Root Turbopack Setting:**
   In `next.config.mjs`, external server packages are configured:
   ```js
   serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "cloudinary"],
   experimental: { serverActions: { bodySizeLimit: "8mb" } }
   ```

---

## 5. Domain, DNS & SSL Configuration

1. In DNS registrar, create a CNAME record:
   - Host: `menu` (or `@` for apex)
   - Value: `cname.vercel-dns.com`
2. In Vercel, assign domain `menu.naqer.com` and verify automatic TLS/SSL certificate issuance.

---

## 6. Branch-Specific WhatsApp Verification

Verify that each branch's WhatsApp ordering number is configured in `Branch` records:
- **Gamasa Branch:** `01094965222` (+201094965222)
- **New Damietta Branch:** `01094965222` (+201094965222)
Confirm that test orders click through to `https://wa.me/201094965222?text=...` with correct URL-encoded order details.

---

## 7. Post-Deployment 12-Point Smoke Test Protocol

This 12-point smoke test distinguishes tests already verified in the isolated staging environment from the live checks required on the production domain immediately upon launch:

| # | Smoke Test Checkpoint | Staging Verification Evidence | Production Domain Verification Procedure |
|---|-----------------------|-------------------------------|------------------------------------------|
| 1 | **Public Menu Arabic RTL** | PASSED (`tests/00-baseline.spec.ts`) | Load `https://menu.naqer.com/ar`. Confirm Arabic headings, RTL layout, 17 categories, and 151 dish cards render with photography. |
| 2 | **English LTR Toggle** | PASSED (`tests/00-baseline.spec.ts`) | Click English language toggle. Confirm route switches to `/en`, LTR alignment applies cleanly, and product names/descriptions render. |
| 3 | **Hidden Products & Categories Filtering** | PASSED (`tests/03-hidden-filtering.spec.ts`) | Verify hidden/unavailable products do not render on public menu and cannot be fetched via client payload. |
| 4 | **Cart & WhatsApp Ordering** | PASSED (`tests/07-interactive-cart.spec.ts`) | Add items, select add-on options, choose branch, verify sticky drawer total, click WhatsApp button, verify `wa.me/201094965222` URL payload. |
| 5 | **LiveSync Polling & Freshness** | PASSED (`tests/01-live-sync.spec.ts` - 425ms-5.3s) | Inspect browser Network tab on `/ar`. Verify `/api/content-version` responds with `{ "v": "..." }` HTTP 200 every 15s. |
| 6 | **Admin Login & Secure Cookie** | PASSED (`tests/04-security.spec.ts`) | Access `/admin/login`, submit valid credentials. Confirm redirect to `/admin/dashboard` and verify `__Host-` or `admin_session` cookie is `HttpOnly`, `Secure`, and `SameSite=Lax`. |
| 7 | **Role Separation (OWNER vs EDITOR)** | PASSED (`tests/04-security.spec.ts`) | Log in as EDITOR. Confirm access to products/categories/offers. Verify user management (`/admin/users`) and deletion buttons return 403 or are withheld. |
| 8 | **Product CRUD Workflow** | PASSED (`tests/05-crud-acceptance.spec.ts`) | Create test dish, edit details, toggle availability, and soft-delete/hide. Confirm public menu reflects changes without server restart. |
| 9 | **Image Upload & Replacement** | *SKIPPED on staging via safety lock* | Upload a test dish image in Admin, verify Cloudinary CDN delivery, replace image, and verify thumbnail in public menu. *(First live test of Cloudinary API keys)*. |
| 10 | **Offers & Add-ons Rendering** | PASSED (`tests/09-card-layouts-and-offers.spec.ts`) | Confirm promotional banner displays active discount/offer, and product add-ons (extra cheese, sauces) appear in modal and add to cart price. |
| 11 | **Branch Selector & Store Context** | PASSED (`tests/08-addons-and-branches.spec.ts`) | Switch between "Gamasa" and "New Damietta" branches. Verify branch phone, hours, and WhatsApp redirect target update. |
| 12 | **Admin Logout & Session Invalidation** | PASSED (`tests/04-security.spec.ts`) | Click Logout in admin navbar. Confirm cookie deletion, redirection to `/admin/login`, and that pressing back button does not grant dashboard access. |
