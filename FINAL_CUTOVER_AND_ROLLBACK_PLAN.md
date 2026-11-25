# Naqer Menu — Final Cutover & Rollback Plan
**Document Purpose:** Production Cutover Runbook for Switching to Client Neon Database  
**Current Execution State:** **READY WITH DOCUMENTED LIMITATIONS (PENDING EXPLICIT USER AUTHORIZATION)**  
**Verified Target Database:** `naqer_merged_staging` on `ep-aged-feather-bej8rk3r.c-9.us-east-2.aws.neon.tech`  
**Last Audit Timestamp:** November 24, 2026 15:44:00 UTC

---

## 1. Overview & Strategy

The smart merged staging database (`naqer_merged_staging`) has been fully provisioned, reconciled, and validated with an isolated Next.js process on port 3005 (Content Version API, Arabic & English menus, and routing verified).

### Realistic Cutover Window:
* **Expected Window:** **3 to 5 minutes** (allowing for pre-cutover delta check, Vercel environment update, and serverless cold deployment).
* **Recommended Timing:** Schedule during low-traffic hours (03:00 AM – 05:00 AM local time).

---

## 2. Pre-Cutover Verification Status

- [x] Target database `naqer_merged_staging` created and verified (27 tables, 151 products, 7 admins).
- [x] Product "ديك بلدي" uploaded to Cloudinary (`tifawhcs`) and returning HTTP 200 OK.
- [x] All 5 Prisma migrations applied with valid checksums.
- [x] Original production database (`ep-soft-dawn-bdu5de43`) verified online and untouched.
- [x] Original destination database (`neondb`) verified online and untouched.
- [x] Zero drift detected between production snapshot and current production state.
- [ ] Explicit user authorization to begin cutover.

---

## 3. Step-by-Step Production Cutover Runbook

### Phase 1: Write-Freeze & Final Delta Check (1 minute)
1. **Announce Temporary Maintenance:**
   Notify operational staff that the dashboard will be in read-only maintenance for 3-5 minutes.
2. **Execute Delta Check Script:**
   Query the live production database (`ep-soft-dawn-bdu5de43`):
   ```sql
   SELECT count(*) FROM "Order" WHERE "createdAt" > '2026-11-24 14:49:00Z';
   SELECT count(*) FROM "Customer" WHERE "createdAt" > '2026-11-24 14:49:00Z';
   SELECT count(*) FROM "AuditLog" WHERE "createdAt" > '2026-11-24 14:49:00Z';
   ```
   * If all counts are 0, proceed immediately to Phase 2.
   * If any new orders or customers exist, run the delta copy script to sync them to `naqer_merged_staging` before proceeding.

### Phase 2: Fresh Pre-Cutover Logical Dump (1 minute)
Take an immediate timestamped backup of the current production database:
```bash
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" \
  --host ep-soft-dawn-bdu5de43.c-8.us-east-2.aws.neon.tech \
  --port 5432 \
  --username neondb_owner \
  --dbname neondb \
  --format custom \
  --file backups/naqer_prod_immediate_pre_cutover.dump
```

### Phase 3: Update Vercel Environment Variables (1 minute)
1. Navigate to **Vercel Dashboard > Project naqer-menu > Settings > Environment Variables**.
2. Edit **`DATABASE_URL`** for **Production** and **Preview**:
   * **New Value:**
     ```
     postgresql://neondb_owner:[CLIENT_PASSWORD]@ep-aged-feather-bej8rk3r-pooler.c-9.us-east-2.aws.neon.tech/naqer_merged_staging?sslmode=require&channel_binding=require
     ```
3. Click **Save**.

### Phase 4: Trigger Redeployment (1-2 minutes)
1. In Vercel **Deployments** tab, select the latest production deployment.
2. Click **... > Redeploy** (ensure "Use existing build cache" is unchecked).
3. Monitor build logs until deployment state is **Ready**.

---

## 4. Post-Cutover Verification Smoke Tests (Immediate)

Run these checks within 60 seconds of deployment:

1. **Live Content Version Probe:**
   ```bash
   curl -s "https://alnaker.vercel.app/api/content-version"
   ```
   * Expected: `{"v":"..."}` with a 16-character hex hash.
   * Fail condition: `"unavailable"` or `"backup-mode"`.
2. **Live Menu Probe:**
   * Open `https://alnaker.vercel.app/ar` in a web browser.
   * Verify all categories render.
   * Verify **"ديك بلدي"** appears in the menu with price 470 EGP and image loaded from Cloudinary.
3. **Admin Dashboard Login Probe:**
   * Navigate to `https://alnaker.vercel.app/admin/login`.
   * Log in using owner credentials (`ibrahimshoeib255@gmail.com` or `admin@naqer.com`).
   * Confirm successful dashboard redirection.
4. **Order Placement Probe:**
   * Place one test order via WhatsApp checkout / cart UI.
   * Confirm order appears in the admin orders view.

---

## 5. Rollback Procedure (Emergency Fallback)

If any critical issue occurs (database connection timeout, serverless error 500 on all routes, or deployment failure):

### Step-by-Step Rollback:
1. Open **Vercel Dashboard > Settings > Environment Variables**.
2. Revert `DATABASE_URL` back to the original production database:
   ```
   postgresql://neondb_owner:[OLD_SECRET]@ep-soft-dawn-bdu5de43-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Click **Save**.
4. In **Deployments**, redeploy the previous working deployment.
5. **Rollback Duration:** Under 90 seconds.
6. Verify `https://alnaker.vercel.app/api/content-version` returns HTTP 200.

---

## 6. Known Documented Limitations to Acknowledge

1. **Product Images:** 40 images are served from Cloudinary CDN; 111 images are served from Next.js static files (`public/images/products/...`). This matches current production behavior.
2. **One Legacy 404 Image:** The image `pdf-waraq-enab.jpg` points to the retired `damc35hfo` cloud and returns 404 in both production and staging.
3. **Admin Plaintext Passwords:** Plaintext passwords are held privately by the owner and staff.

---

## 7. Approval Gate

**STOP:** Awaiting explicit human confirmation before executing Phase 1 through Phase 4.
