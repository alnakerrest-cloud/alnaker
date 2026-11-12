# Naqer Menu — Pre-Deployment Safety Checklist & Release Lock

**Project:** Naqer Menu (قرية النقر للمشويات والأسماك والمأكولات الشعبية)  
**Repository:** `E:\real projects\naqer-menu`  
**Execution Timestamp:** 2026-11-08  
**Pre-Deployment Safety Status:** **LOCKED & VERIFIED FOR PRODUCTION**  
**Git Baseline Commit:** `7b058dab4d0ddcb6c710809db0b4241ab88c49c8`  

---

## 1. Safe OWNER Account Provisioning Workflow

- **Script:** [`scripts/provision-owner.mjs`](file:///e:/real%20projects/naqer-menu/scripts/provision-owner.mjs) (`npm run db:provision-owner`).
- **Idempotent Logic:**
  1. Checks if the requested email already exists in `AdminUser`.
  2. If the user does not exist: creates a new account with role `OWNER`, active status `true`, and 12-round bcrypt hash.
  3. If the user already exists: **STOPS IMMEDIATELY** with a warning and exits without modifying credentials.
  4. In production (`NODE_ENV === 'production'`), overwriting an existing account is strictly blocked unless both `ALLOW_OWNER_OVERWRITE=1` and `CONFIRM_PRODUCTION_OVERWRITE=<target_email>` are supplied.
  5. Under no circumstances are passwords or hash strings printed or written to console logs.

---

## 2. Cryptographic Security & Session Hardening

- **Keyed Hashing:** Session token hashing in `lib/auth.ts` uses HMAC-SHA256 (`crypto.createHmac("sha256", secret)`) salted with `SESSION_SECRET`.
- **Session Tokens:** 32 cryptographically secure random bytes generated per login.
- **Cookies:** `httpOnly: true`, `secure: true` (production), `sameSite: "lax"`, `maxAge: 7 days`.
- **RBAC:** Server actions enforce `requireAdmin(["OWNER"])` for branch and restaurant settings.

---

## 3. Production Database Connection & Non-Destructive Deployment

- **Connection Layer:** `lib/prisma.ts` utilizes `@prisma/adapter-pg` driver adapter with pooled `pg.Pool`.
- **Pooler Configuration:**
  - `max: 5` concurrent connections (optimized for serverless environments).
  - `connectionTimeoutMillis: 15_000` (handles cold-start compute auto-suspend).
  - `idleTimeoutMillis: 30_000`.
  - `keepAlive: true`.
- **Driver Retry:** Exponential backoff with `withDbRetry` handles transient connectivity codes (`ECONNREFUSED`, `ETIMEDOUT`, `57P01`, `P1001`).
- **Zero Schema Migrations on Deploy:**
  - Deployment command runs `next build`.
  - Dependency installation triggers `postinstall: prisma generate`, which **only** generates local TypeScript types and performs zero database operations.
  - Destructive commands (`prisma db push`, `prisma migrate reset`) are disabled in `package.json`.
  - Existing restaurant catalog (151 products, 18 categories, 27 sections, 167 variants, 2 branches) will not be overwritten or reset.

---

## 4. Database Backup & Isolated Restore Procedure

1. **Logical Backup Created:**
   - Script: `scripts/verify-backup-and-restore.mjs`
   - Dump file: `backups/backup-naqer-verified.json` (184.4 KB)
2. **Isolated Validation Restore Executed:**
   - Restored into temporary sandbox schema `isolated_restore_test`.
   - Verified 151 products, 18 categories, 27 sections, 167 variants, 2 branches, 0 orphans.
   - Restored schema cleanly dropped; production database was completely untouched.

---

## 5. Environment Variables Verification

All seven required environment variables are actively consumed by the application source code:

| Variable | Consuming File | Functional Role |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | `lib/site.ts` | Canonical base URL for QR codes, sitemap, SEO metadata. |
| `DATABASE_URL` | `lib/prisma.ts` | Authenticated pooled PostgreSQL connection string. |
| `SESSION_SECRET` | `lib/auth.ts` | Secret key for HMAC-SHA256 session token hashing. |
| `CLOUDINARY_CLOUD_NAME` | `lib/cloudinary.ts` | Cloudinary tenant identifier for dish image storage. |
| `CLOUDINARY_API_KEY` | `lib/cloudinary.ts` | Public API key for authenticated server actions. |
| `CLOUDINARY_API_SECRET` | `lib/cloudinary.ts` | Secret key for Cloudinary asset upload/delete operations. |
| `CLOUDINARY_SECURE_FOLDER` | `lib/cloudinary.ts` | Namespace isolation prefix (`naqer-menu/...`). |

---

## 6. LiveSync Smoke Test Safety Protocol

- **Customer Safety Standard:** **Never** modify, rename, or alter prices of live dishes during smoke tests on production.
- **Testing Protocol:**
  - Create a designated temporary draft product in `/admin/products`.
  - Confirm public menu detects content-version bump within 4 seconds.
  - Delete the draft product immediately.
  - Shopping carts of active customers remain fully preserved.
  - Verified passing in `tests/12-final-release-smoke.spec.ts`.

---

## 7. Remaining Client-Owned Launch Requirements

Deployment will proceed once the client or system administrator provides or confirms:
1. Production domain DNS routing (`CNAME` / `A` record to Vercel).
2. Production database credentials populated in hosting environment variables.
3. Production Cloudinary credentials populated in hosting environment variables.
4. Official WhatsApp phone numbers for Damietta and Gamasa branches.
5. Explicit authorization to trigger live deployment.
