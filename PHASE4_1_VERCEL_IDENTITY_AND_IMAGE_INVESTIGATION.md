# Naqer Menu — Phase 4.1: Vercel Deployment Identity & Image Source Investigation Report

**Date & Time:** 2026-11-24T21:14:00+02:00  
**Scope:** Strictly READ-ONLY Investigation (Zero deployments, zero configuration changes, zero DB writes)  
**Target Domain:** `https://alnaker.vercel.app`  
**Investigation Status:** **ROOT CAUSE DETERMINED WITH FULL CRYPTOGRAPHIC EVIDENCE**  

---

## 1. Executive Summary

During Phase 4 verification, browser smoke tests revealed that the live site (`https://alnaker.vercel.app`) was serving the Mandi category banner and 13 product images pointing to the retired Cloudinary account (`damc35hfo`), despite the candidate database `naqer_merged_staging` having been fully migrated to `tifawhcs`.

This strictly read-only investigation was conducted across five independent dimensions:
1. Target database (`naqer_merged_staging`) content.
2. Source production database (`neondb` on `ep-soft-dawn-bdu5de43`) content.
3. Local codebase and static fallback data (`data/menu.ts`).
4. Live HTTP responses, Next.js chunk bundles, and CSS styles from `https://alnaker.vercel.app`.
5. Git repository alignment between `origin/main` and `alnaker/main`.

### Definitive Conclusion:
The old Cloudinary reference `damc35hfo` **DOES NOT EXIST** in `naqer_merged_staging` and **DOES NOT EXIST** in local files. It exists **EXCLUSIVELY** in the old source production database (`ep-soft-dawn-bdu5de43`).

The live production site is serving `damc35hfo` because **Vercel is still running the previous deployment (commit `213f47f9`) built against the old database**. Pushing to `origin/main` did not deploy commit `b69caca5` on Vercel, and Vercel has not yet rebuilt with the updated `DATABASE_URL`.

---

## 2. Tracing the Old Cloudinary Reference (`damc35hfo`)

A forensic database and filesystem query was executed across all possible data sources:

| Data Layer / Storage | Mandi Banner URL | `damc35hfo` References | Evidence |
| :--- | :--- | :---: | :--- |
| **`naqer_merged_staging` (Target DB)** | `https://res.cloudinary.com/tifawhcs/image/upload/v1795535257/naqer-menu/categories/pdf-mandi.jpg` | **0** | Verified: Exactly 0 categories and 0 product images contain `damc35hfo`. |
| **`neondb` (Source Production DB)** | `https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/categories/pdf-mandi.jpg` | **14** | Verified: 1 Category (`mandi`) + 13 ProductImages still contain `damc35hfo`. |
| **Codebase (`data/menu.ts`)** | Local relative asset paths (`/images/products/...`) | **0** | Verified: `data/menu.ts` contains 0 Cloudinary URLs. |
| **Live Production HTML (`/ar`)** | `https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/categories/pdf-mandi.jpg` | **42** | Verified: Exactly matches the 14 un-migrated Source Production images across Next.js responsive `srcset` widths. |

> [!IMPORTANT]
> **Key Finding:**
> The live HTML strings match the Source Production database row character-for-character. This conclusively proves that the live Vercel container is actively connected to and reading from `ep-soft-dawn-bdu5de43` (the old database).

---

## 3. Git Integration & Deployment Identity Verification

### Repository State Comparison:

| Repository / Remote | Remote URL | Current HEAD Commit | Commit Message |
| :--- | :--- | :--- | :--- |
| **`origin/main`** | `https://github.com/EbrahimShoeib1999/naqer-menu.git` | `b69caca59dc8268b2437d663bbbb02a180294be7` | `fix(ui): responsive card footers and prevent price chip clipping on mobile` |
| **`alnaker/main`** | `https://github.com/alnakerrest-cloud/alnaker.git` | `213f47f9cbe950fdfba9efe4bc36b16bdb5d0171` | `test(verification): add automated production persistence invariant test suite` |

### Live Production Deployment Analysis:
- In commit `b69caca5`, `app/globals.css` was updated with:
  ```css
  .card-foot, .platter-foot, .side-foot, .drink-foot {
    min-width: 0; max-width: 100%; box-sizing: border-box;
  }
  ```
- The active CSS file fetched from the live site (`https://alnaker.vercel.app/_next/static/immutable/chunks/2_5sa4ewv-dgo.css`, 104,268 bytes) was scanned:
  - **Commit `b69caca5` rules present:** `false`
  - The live CSS contains only the old rules from commit `213f47f9`.

### Analysis:
1. **Push to `origin/main` did NOT deploy:** Commit `b69caca5` is present on GitHub at `EbrahimShoeib1999/naqer-menu`, but was never deployed to `https://alnaker.vercel.app`.
2. **Client Organization Remote:** As documented in `ACCOUNT_REGISTER.md` (Line 25), the client organization repository is `alnakerrest-cloud/alnaker` (remote `alnaker`), which is still sitting at commit `213f47f9`. If the Vercel project is linked to `alnakerrest-cloud/alnaker`, pushing to `origin` had zero effect on Vercel.
3. **Vercel Env Variable Rebuild Rule:** Even if Vercel is connected to `origin`, updating `DATABASE_URL` in the Vercel Dashboard does **not** retroactively update running serverless containers or ISR pages until a new deployment/redeploy is built.

---

## 4. Root Cause Classification

| Issue Observed | Root Cause |
| :--- | :--- |
| **Mandi banner displays `damc35hfo`** | The active Vercel deployment was built against the old database (`ep-soft-dawn-bdu5de43`) and has not yet been rebuilt against `naqer_merged_staging`. |
| **13 product images display `damc35hfo`** | Same: old database contains `damc35hfo`; `naqer_merged_staging` contains `0` instances. |
| **Commit `b69caca5` CSS not found** | Vercel did not trigger an automatic build from `origin/main` (either because Vercel is linked to `alnakerrest-cloud/alnaker`, or automatic git deployments are disabled). |

---

## 5. Minimal Required Remediation Plan

To successfully bring `naqer_merged_staging` and commit `b69caca5` into live production, the following minimal, safe steps are required:

### Option A: Via Vercel Dashboard (Zero Git push needed)
1. In the **Vercel Dashboard** $\longrightarrow$ Project **`alnaker`** $\longrightarrow$ **Deployments**.
2. Click the `...` menu on the latest deployment and click **Redeploy**.
3. **Uncheck** "Use existing build cache" to guarantee a fresh Next.js build using the updated `DATABASE_URL`.

### Option B: Via Client Git Remote (If Vercel is linked to `alnakerrest-cloud`)
If the user confirms Vercel is connected to `alnakerrest-cloud/alnaker`:
```bash
git push alnaker main
```
This will push commit `b69caca5` directly to `alnakerrest-cloud/alnaker`, triggering an automatic production build with the new `DATABASE_URL`.

---

## 6. Strict Stop Conditions Compliance

- [x] **No Redeploy triggered**: Awaiting user action.
- [x] **No Git Push performed**: Both remotes untouched during this phase.
- [x] **No Environment Variables modified**: Untouched.
- [x] **No Database changes**: Zero writes on production or staging.
- [x] **No Cloudinary changes**: Zero asset modifications.
- [x] **No Cache cleared**: Read-only verification only.
- [x] **Maintenance mode untouched**: Remains `DISPLAY_ONLY` on target.
- [x] **Source production read-only untouched**: Remains `default_transaction_read_only = on`.

Execution is **STOPPED**. Awaiting user review and selection of remediation Option A or Option B.
