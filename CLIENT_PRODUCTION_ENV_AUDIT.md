# CLIENT PRODUCTION ENVIRONMENT AUDIT — NAQER MENU

**Audit Date:** 2026-11-23T15:20:00+02:00  
**Target Release Platform:** Vercel (Free Domain: `https://alnaker.vercel.app`)  
**Production Runtime:** Next.js 16.4.5 (App Router, Turbopack)  
**Database:** Neon Serverless PostgreSQL  
**Audit Mode:** STRICT READ-ONLY ENVIRONMENT AUDIT (Zero Secrets Exposed)

---

## 1. Executive Summary

This audit establishes complete environment consistency and configuration readiness for deploying **Naqer Menu** to its official Vercel production domain:

$$\mathbf{Production\ Base\ URL:}\quad \text{\texttt{https://alnaker.vercel.app}}$$

All application URLs, sitemaps, robots.txt, metadata bases, QR codes, WhatsApp order dispatch links, and client fallbacks have been audited and unified to reference this canonical production domain.

---

## 2. Complete Environment Variable Inventory

Every variable accessed via `process.env` in the runtime application codebase (`app/`, `components/`, `lib/`) has been inventoried below. **No secret values are printed.**

| Variable Name | Used In | Required in Prod? | Visibility | Required Vercel Scope | Expected Value / Source | Configured in Local? |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **`NEXT_PUBLIC_SITE_URL`** | `lib/site.ts`<br>`app/api/checkout/route.ts`<br>`app/[locale]/receipt/[orderNumber]/page.tsx`<br>`app/[locale]/layout.tsx`<br>`app/sitemap.ts`<br>`app/robots.ts`<br>`components/JsonLd.tsx`<br>`app/[locale]/qr/page.tsx` | **YES** | Public (`NEXT_PUBLIC_`) | Production, Preview, Development | `https://alnaker.vercel.app` | Configured |
| **`DATABASE_URL`** | `lib/database-url.ts`<br>`lib/prisma.ts`<br>`lib/generated/prisma/...` | **YES** | Secret (Server-only) | Production, Preview | Pooled Neon PostgreSQL connection string: `postgresql://neondb_owner:***@ep-***-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require` | Configured |
| **`SESSION_SECRET`** | `lib/auth.ts`<br>`lib/customer-session.ts`<br>`lib/otp-provider.ts` | **YES** | Secret (Server-only) | Production, Preview | Cryptographically strong 32+ character hex string generated via `openssl rand -hex 32` | Configured |
| **`CLOUDINARY_CLOUD_NAME`** | `lib/cloudinary.ts` | **YES** | Public / Non-secret | Production, Preview | Client-owned Cloudinary account: `tifawhcs` | Configured |
| **`CLOUDINARY_API_KEY`** | `lib/cloudinary.ts` | **YES** | Secret (Server-only) | Production, Preview | Client Cloudinary API key (from Cloudinary dashboard) | Configured |
| **`CLOUDINARY_API_SECRET`** | `lib/cloudinary.ts` | **YES** | Secret (Server-only) | Production, Preview | Client Cloudinary API secret (from Cloudinary dashboard) | Configured |
| **`CLOUDINARY_SECURE_FOLDER`** | `lib/cloudinary.ts` | Optional | Non-secret | Production: `naqer-menu`<br>Preview: `naqer-menu-staging` | Base asset folder in Cloudinary. Defaults to `"naqer-menu"` | Configured |
| **`USE_BACKUP_DATA`** | `lib/menu-db.ts`<br>`lib/content-version.ts`<br>`lib/prisma.ts`<br>`lib/site-db.ts` | **YES** | Non-secret | Production, Preview | **`false`** (Forces direct Neon PostgreSQL querying; disables offline JSON mock engine) | Configured |
| **`NAQER_ACTIVE_DATABASE_URL`** | `lib/database-url.ts` | Optional | Secret (Server-only) | Optional | Server-side fallback database URL if `DATABASE_URL` is missing or points to retired cluster | Optional |
| **`NODE_ENV`** | Next.js Core Runtime | System | System | Production | Automatically set to `"production"` by Vercel and Next.js | Automatic |
| **`VERCEL`** | `lib/orders-store.ts` | System | System | Production, Preview | Automatically set to `"1"` by Vercel platform | Automatic |

---

## 3. URL Consistency & Centralization Audit

All application-generated URLs, canonical tags, and external integration links have been verified against the official domain `https://alnaker.vercel.app`:

### A. Centralized Authority: `lib/site.ts`
- **Definition:**
  ```typescript
  export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alnaker.vercel.app').replace(/\/$/, '');
  ```
- **Function:** Serves as the single source of truth for all metadata, sitemaps, robots, QR codes, and canonical link generation.

### B. Consumer Components & Routes
1. **Metadata & OpenGraph (`app/[locale]/layout.tsx`):**
   - `metadataBase: new URL(SITE_URL)` $\implies$ Resolves all OpenGraph and Twitter card images to `https://alnaker.vercel.app/...`.
   - `canonical: /${locale}` $\implies$ Generates `<link rel="canonical" href="https://alnaker.vercel.app/ar" />` and `/en`.
2. **Search Engine Sitemaps (`app/sitemap.ts`):**
   - Arabic: `https://alnaker.vercel.app/ar`
   - English: `https://alnaker.vercel.app/en`
3. **Robots Exclusion Standard (`app/robots.ts`):**
   - Directs crawlers to: `sitemap: https://alnaker.vercel.app/sitemap.xml`.
   - Protects internal paths (`/ar/qr`, `/en/qr`).
4. **QR Code Generation (`app/[locale]/qr/page.tsx`):**
   - Dine-in / table-top QR encodes: `https://alnaker.vercel.app/?src=qr`.
   - Human-readable URL pill displays: `alnaker.vercel.app`.
5. **Search Engine JSON-LD (`components/JsonLd.tsx`):**
   - Schema.org Restaurant `url`: `https://alnaker.vercel.app/${locale}`.
   - Schema.org Restaurant `hasMenu`: `https://alnaker.vercel.app/${locale}`.
6. **WhatsApp Order Dispatch (`app/api/checkout/route.ts`):**
   - Appends live customer receipt link directly into the WhatsApp summary message:
     `https://alnaker.vercel.app/${locale}/receipt/${orderNumber}?token=${verificationToken}`.
   - Default fallback updated from localhost to `https://alnaker.vercel.app`.
7. **Customer Receipt Verification (`app/[locale]/receipt/[orderNumber]/page.tsx`):**
   - QR code on customer digital receipt encodes:
     `https://alnaker.vercel.app/api/orders/${orderNumber}/verify?token=${verificationToken}`.
   - Default fallback updated from localhost to `https://alnaker.vercel.app`.

---

## 4. Zero Localhost / Development URLs in Production

- **Audit Result:** `PASS`
- No development port (`:3000`, `:3001`, `:3002`), no loopback address (`127.0.0.1`, `localhost`), and no retired domains exist in any production path.
- Localhost references remain exclusively inside developer test runners (`tests/`, `scripts/`, `playwright.config.ts`), where local server binding is strictly required.

---

## 5. Storage and Database Isolation

1. **Neon PostgreSQL Database:**
   - Production points to the dedicated production project.
   - Staging (`ep-ancient-hill-beec491j`) and retired clusters (`ep-withered-bread-bemwq8ns`) are blocked by connection guards.
2. **Cloudinary Asset Storage:**
   - Production uploads target client account `tifawhcs` with base folder `naqer-menu`.
   - Retired account `damc35hfo` is blocked by runtime guard (`RETIRED_CLOUDINARY_ACCOUNT`).
   - Staging guard in `destroyImage()` blocks accidental deletion of production assets.
3. **Storage Fallback Engine:**
   - `USE_BACKUP_DATA=false` is enforced for production, guaranteeing that data is read and written directly to PostgreSQL.
