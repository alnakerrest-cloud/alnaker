# Naqer Menu — Final Deployment Checklist
## Pre-Flight Verification Gates, Migration Protocol & Rollback Procedures

**Date:** 2026-11-22  
**Target:** Client Production (Vercel + Neon Free + Cloudinary Free)  
**Status:** READY FOR STAGED EXECUTION (PENDING USER APPROVAL)  

---

## Pre-Flight Gates

- [x] **Data Authority Certified:** 151 Products, 17 Categories, 2 Branches, 167 Variants verified.
- [x] **Test Data Excluded:** Test category `سبانخ` and test branch `shoeib` stripped.
- [x] **Images Audited:** 14 Cloudinary URLs verified (1 recovered locally), 137 local WebP files on disk.
- [ ] **Implementation Gate 1 (Code Change):** Remove/disable `<LiveSync />` in `app/[locale]/page.tsx`.
- [ ] **Implementation Gate 2 (Cloudinary Sync):** Upload `pdf-images/upload/pdf-waraq-enab.jpg` to client Cloudinary.
- [ ] **Implementation Gate 3 (Database Provisioning):** Apply Prisma schema & import `CLIENT_DATABASE_IMPORT_DATASET.json` into the new client Neon database.
- [ ] **Implementation Gate 4 (Vercel Environment Setup):** Set `USE_BACKUP_DATA="false"` and assign client secrets in Vercel project settings.
- [ ] **Implementation Gate 5 (Final Deployment):** Deploy to Vercel production domain.

---

## Rollback Protocol

If any anomaly occurs post-deployment:
1. Re-enable `USE_BACKUP_DATA="true"` in Vercel Environment Variables.
2. Trigger instant redeploy. Application immediately falls back to in-memory/JSON engine serving all 151 items without depending on Neon.
