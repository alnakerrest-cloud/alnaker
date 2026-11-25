# Naqer Menu — Phase 4: Production Deployment & Verification Report

**Date & Time:** 2026-11-24T21:02:00+02:00  
**Status:** **STOP CONDITION TRIGGERED — AWAITING REDEPLOYMENT / REPO ALIGNMENT**  
**Repository:** `E:\real projects\naqer-menu`  
**Target Candidate Database:** `naqer_merged_staging` on Neon cluster `ep-aged-feather-bej8rk3r-pooler`  
**Source Production Database:** `neondb` on Neon cluster `ep-soft-dawn-bdu5de43` (Strict Read-Only)  
**Production Site URL:** `https://alnaker.vercel.app`  

---

## 1. Executive Summary

In accordance with Phase 4 authorization:
1. **Final Git Gate:** Verified branch `main`, verified clean working tree, extracted full SHA `b69caca59dc8268b2437d663bbbb02a180294be7`, and confirmed diff contains strictly `app/globals.css` (+28 lines for responsive card footers and chip wrapping).
2. **Push to `origin/main`:** Pushed cleanly to `https://github.com/EbrahimShoeib1999/naqer-menu.git` (exit code 0).
3. **Target Database Audit:** Verified `naqer_merged_staging` remains 100% intact (151 products, 17 categories, 2 orders, 134 audit logs) and locked in maintenance mode (`DISPLAY_ONLY`).
4. **Source Production Protection:** Verified `neondb` on `ep-soft-dawn-bdu5de43` remains in read-only mode (`default_transaction_read_only = on`) with zero writes.
5. **Live Production Smoke Tests:** Tested live domain `https://alnaker.vercel.app`. While the site is accessible (HTTP 200) and displays the maintenance notice, image inspection reveals the active production container is **still serving data from the old database** (`damc35hfo` Cloudinary URL instead of `tifawhcs`).
6. **Mandatory Stop Condition Triggered:** Under Section 2 and Section 4 rules (*"توقف فورًا إذا لم تكن قاعدة البيانات المستخدمة هي naqer_merged_staging"* and *"إذا لم يكن النشر التلقائي من Git مفعّلًا، توقف"*), execution was immediately halted.

---

## 2. Git Gate & Commit Verification

- **Branch:** `main`
- **Full Commit SHA:** `b69caca59dc8268b2437d663bbbb02a180294be7`
- **Commit Message:** `fix(ui): responsive card footers and prevent price chip clipping on mobile`
- **Files Changed:** `app/globals.css` (28 insertions, 0 deletions)
- **Push Execution:**
  ```text
  git push origin main
  To https://github.com/EbrahimShoeib1999/naqer-menu.git
     213f47f9..b69caca5  main -> main
  ```
  *Result: Exit Code 0 (Success)*

---

## 3. Database Identity & Integrity Audit

### Target Candidate Database (`naqer_merged_staging`)
- **Connection:** Verified via pooled connection string from `.env.local` (zero credentials exposed).
- **Authentication:** `SUCCESS` (Connected cleanly).
- **Host:** `ep-aged-feather-bej8rk3r-pooler.c-9.us-east-2.aws.neon.tech`.
- **Row Counts:**
  - `Product`: **151** (includes "ديك بلدي" `bb1e4825`)
  - `Category`: **17** (Mandi banner upgraded to `tifawhcs`)
  - `ProductImage`: **151** (40 `tifawhcs` + 111 local WebP)
  - `AdminUser`: **7** (includes `admin@naqer.com`)
  - `Order`: **2** | `OrderStore`: **84**
  - `AuditLog`: **134** | `Offer`: **0**
- **Maintenance State:** `DISPLAY_ONLY` (`MAINTENANCE`) — **ACTIVE**

### Source Production Database (`neondb` on `ep-soft-dawn-bdu5de43`)
- **State:** **READ-ONLY LOCKED** (`default_transaction_read_only = on`).
- **Physical Write Rejection:** Confirmed (PostgreSQL Error 25006).
- **Counts:** `Order = 2`, `AuditLog = 143` (Zero incoming writes).

---

## 4. Live Production Smoke Test Findings

Live browser tests conducted against `https://alnaker.vercel.app`:

| Test Parameter | Target Endpoint | Result | Detail |
| :--- | :--- | :---: | :--- |
| **Public HTTP Status** | `GET https://alnaker.vercel.app/ar` | **200 OK** | Page loads cleanly. |
| **Maintenance Banner** | Top banner on `/ar` | **PASS** | *"أعمال صيانة وتحديث للأنظمة"* is rendered. |
| **Ordering Block** | Checkout API `/api/checkout` | **PASS** | Returns HTTP 403 Forbidden with maintenance reason. |
| **English Page (LTR)** | `GET https://alnaker.vercel.app/en` | **200 OK** | English layout and maintenance notice rendered. |
| **Admin Login Page** | `GET https://alnaker.vercel.app/admin/login` | **200 OK** | Login form rendered with restaurant branding. |
| **Mobile Viewport** | 390x844 responsive layout | **PASS** | Header, banner, and categories render properly. |
| **Runtime Database Identity**| Mandi Banner Asset URL | **FAIL / OLD DB** | Category banner image URL returns `damc35hfo` instead of `tifawhcs`. |

### Root Cause Analysis for Database Identity Mismatch
The live Vercel container is still serving the previous deployment connected to the old database because:
1. **Repository Mismatch:** The Vercel project `alnaker` is likely connected to GitHub repository `alnakerrest-cloud/alnaker` (remote `alnaker`) rather than `EbrahimShoeib1999/naqer-menu` (remote `origin`).
2. **Or Manual Redeploy Required:** When updating `DATABASE_URL` in the Vercel Dashboard, Vercel requires triggering a **Redeploy** on the latest deployment for the new environment variable to take effect on the serverless functions and pre-rendered pages.

---

## 5. Artifacts & Evidence Captured

The following visual and data artifacts were captured during Phase 4:
- [live_production_ar.png](file:///e:/real%20projects/naqer-menu/artifacts/live_production_ar.png) (Arabic Home with Maintenance Notice)
- [live_mandi_category.png](file:///e:/real%20projects/naqer-menu/artifacts/live_mandi_category.png) (Mandi category view)
- [live_production_en.png](file:///e:/real%20projects/naqer-menu/artifacts/live_production_en.png) (English LTR Home)
- [live_mobile_responsive.png](file:///e:/real%20projects/naqer-menu/artifacts/live_mobile_responsive.png) (Mobile 390px Viewport)
- [live_admin_login.png](file:///e:/real%20projects/naqer-menu/artifacts/live_admin_login.png) (Admin Login Page)
- Raw test data in [scratch/smoke_test_results.json](file:///e:/real%20projects/naqer-menu/scratch/smoke_test_results.json).

---

## 6. Stop Condition & Next Steps for User

Execution is **HALTED**. In accordance with instructions:
- Maintenance mode remains **ACTIVE**.
- Source production remains **READ-ONLY**.
- No test orders, writes, or mutations were made.

### Action Required to Complete Cutover:
To apply the new `DATABASE_URL` and deploy commit `b69caca5`:
1. In the **Vercel Dashboard** (`alnaker` project):
   - Go to **Deployments**.
   - Click the three dots `...` on the latest production deployment and select **Redeploy** (ensure "Use existing build cache" is unchecked).
   - *OR* If Vercel is connected to `alnakerrest-cloud/alnaker`, authorize pushing commit `b69caca5` to `alnaker/main` (`git push alnaker main`).
2. Once the redeployment finishes on Vercel, notify me to run the final 60-second verification and verify the runtime database identity switch.
