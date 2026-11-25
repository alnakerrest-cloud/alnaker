# Naqer Menu — Pre-Cutover Final Snapshot

**Date:** 2026-11-24  
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Scope:** Immediate Pre-Cutover Final Read-Only Snapshot  
**Execution Status:** **STRICTLY READ-ONLY (VERIFIED)**  

---

## 1. Candidate Database Verification (`naqer_merged_staging`)

Direct queries against the target candidate database confirm exact identity and required table counts:

- **Database Name:** `naqer_merged_staging`
- **Host Cluster:** `ep-aged-feather-bej8rk3r.c-9.us-east-2.aws.neon.tech`
- **PostgreSQL Version:** PostgreSQL 18.7 (3190d2f) on aarch64-unknown-linux-gnu, 64-bit
- **Prisma Migrations Applied:** **5**

### Exact Table Counts:
| Table Name | Target / Expected | Snapshot Actual | Status |
| :--- | :---: | :---: | :---: |
| **`Product`** | 151 | **151** | **PASS** |
| **`ProductImage`** | 151 | **151** | **PASS** |
| **`Category`** | 17 | **17** | **PASS** |
| **`ProductVariant`** | 167 | **167** | **PASS** |
| **`ProductOptionGroup`** | 28 | **28** | **PASS** |
| **`Customer`** | 9 | **9** | **PASS** |
| **`CustomerAddress`** | 22 | **22** | **PASS** |
| **`CustomerNotification`** | 86 | **86** | **PASS** |
| **`Order`** | 2 | **2** | **PASS** |
| **`OrderStore`** | 84 | **84** | **PASS** |
| **`AdminUser`** | 7 | **7** | **PASS** |
| **`AuditLog`** | 134 | **134** | **PASS** |
| **`Session`** | 9 | **9** | **PASS** |
| **`Offer`** | 0 | **0** | **PASS** |
| **`OfferProductTarget`** | 0 | **0** | **PASS** |
| **`RestaurantSettings`** | 1 | **1** | **PASS** |

---

## 2. Critical Identity Records Verification

All critical identity records were queried directly and verified intact:

### 2.1 Administrators & Owners (No hashes exposed):
- **Client General Manager OWNER:**
  - Email: `admin@naqer.com`
  - ID: `1373831b-8ae4-475a-a340-574d8aa25f53`
  - Display Name: `إبراهيم شعيب (مدير عام المطعم)`
  - Role: `OWNER`
  - Active: `true` | Password Change Required: `true`
  - Status: **VERIFIED INTACT**
- **Preserved Production Owners:**
  - `admin@naqer-restaurant.local` (`usr-admin-owner-001`, أحمد الناقر, `OWNER`) — **VERIFIED INTACT**
  - `ibrahimshoeib255@gmail.com` (`usr-3c6214fb-1f65-4156-b21a-b2b762aa22db`, shoeib, `OWNER`) — **VERIFIED INTACT**

### 2.2 Critical Menu & Product Records:
- **Known Baseline Product (`bb1e4825-af47-480b-b42f-260a29f0fd30`):**
  - Name: `ديك بلدي`
  - Section ID: `047773fe-36ae-475d-b57d-5729fc5f7d6a`
  - Price: `470.00 EGP`
  - Available: `true`
  - Status: **VERIFIED INTACT**
- **Critical Category (`cdba4eea-17a5-4cb6-a605-e183b8622a6e` / `mandi`):**
  - Name: `المندي`
  - Slug: `mandi`
  - Image URL: `https://res.cloudinary.com/tifawhcs/image/upload/v1795535257/naqer-menu/categories/pdf-mandi.jpg`
  - Public ID: `naqer-menu/categories/pdf-mandi`
  - Status: **VERIFIED INTACT**

---

## 3. Cloudinary State Verification

A database-wide read-only scan confirms:
- **Residual `damc35hfo` References:** Exactly **0** across all tables (`ProductImage`, `Category`, `Offer`, `RestaurantSettings`).
- **Migrated ProductImages:** Exactly **14** records queried by manifest IDs.
- **Client Account Verification:** 100% of migrated ProductImages point to client account `tifawhcs`.
- **Mandi Category Banner:** Points to `tifawhcs` under public ID `naqer-menu/categories/pdf-mandi`.

---

## 4. Source Production Identity Verification

Source production was queried read-only:
- **Host Cluster:** `ep-soft-dawn-bdu5de43-pooler.c-8.us-east-2.aws.neon.tech` (Matched `ep-soft-dawn-bdu5de43`)
- **Database Name:** `neondb`
- **Schema:** `public`
- **PostgreSQL Version:** PostgreSQL 18.7 (3190d2f) on aarch64
- **State:** **UNTOUCHED & READ-ONLY**

---

## 5. Backups Verification

The physical backup files on disk were checked for existence and verified against cryptographic SHA256 checksums:

| Backup File Path | File Size | Verified SHA256 Checksum | Checksum Match |
| :--- | :---: | :--- | :---: |
| `backups/naqer_prod_source_backup_20261124.dump` | 163,516 bytes | `b6633ceba8aacf2fc5cc79d30cfc8dad02133797f3db300435ca1bd170348266` | **100% MATCH** |
| `backups/naqer_destination_preservation_backup_20261124.dump` | 100,999 bytes | `0ca884051f69b9d2e2480598a387e181dda08eed3eb897da2caf27ea054937cb` | **100% MATCH** |

---

## 6. Git Working Tree State

- **Current Branch:** `main`
- **Current HEAD Commit:** `213f47f9cbe950fdfba9efe4bc36b16bdb5d0171`
- **Working Tree Status:** Clean of any application, schema, or migration edits.
  - Tracked modifications: `FINAL_DATABASE_INTEGRITY_REPORT.md` and `app/globals.css` (verified card footer clipping fix).
  - All source code, API routes, and schema files remain pristine.

---

## 7. Vercel & Deployment State

- **Deployments Triggered:** **0**
- **Environment Variable Modifications:** **0**
- **Vercel Project Settings Changes:** **0**
- **DNS / Routing Changes:** **0**

---

## 8. Verification of Zero Accidental Writes

A strict review of all execution logs and scripts confirms:
- **INSERT operations:** **0**
- **UPDATE operations:** **0**
- **DELETE operations:** **0**
- **DDL / Migration operations:** **0**
- **Cloudinary writes / uploads / deletions:** **0**
- **Vercel modifications:** **0**

---

## 9. Final Decision & Stop Condition

### Exact Verified Staging Database Identity:
- **Cluster:** `ep-aged-feather-bej8rk3r.c-9.us-east-2.aws.neon.tech`
- **Database:** `naqer_merged_staging`
- **User:** `neondb_owner`

### Verified Backup Checksums for Rollback:
- **Source Prod Backup:** `b6633ceba8aacf2fc5cc79d30cfc8dad02133797f3db300435ca1bd170348266`
- **Client Dest Backup:** `0ca884051f69b9d2e2480598a387e181dda08eed3eb897da2caf27ea054937cb`

---

### SNAPSHOT PASS — SAFE TO EXECUTE AUTHORIZED CUTOVER
