# VERCEL PRODUCTION ENVIRONMENT SETUP GUIDE

**Target Production Platform:** Vercel Dashboard  
**Official Production Domain:** `https://alnaker.vercel.app`  
**Restaurant:** قرية الناقر (Al Naqer Village)  

---

## 1. Quick-Start Instructions for the Client / Owner

To deploy **Naqer Menu** to the official free Vercel domain (`https://alnaker.vercel.app`):

1. Log into your Vercel Dashboard at [vercel.com](https://vercel.com).
2. Open or create the project named **`alnaker`** (or import the GitHub repository `EbrahimShoeib1999/naqer-menu`).
3. Navigate to **Project Settings** $\longrightarrow$ **Environment Variables**.
4. Add the **7 Essential Variables** listed below.
5. Click **Redeploy** or trigger deployment.

---

## 2. Production Environment Variables Checklist

Add the following exact environment variables in the Vercel Dashboard:

### 1. `NEXT_PUBLIC_SITE_URL`
- **Scope:** Production, Preview, Development
- **Type:** Plain Text (Public)
- **Exact Value:**
  ```text
  https://alnaker.vercel.app
  ```
- **Description:** Central canonical domain for customer QR codes, sitemaps, robots.txt, metadata, and WhatsApp tracking links.

### 2. `DATABASE_URL`
- **Scope:** Production, Preview
- **Type:** Secret (Server-only)
- **Exact Format:**
  ```text
  postgresql://neondb_owner:[PASSWORD]@[PRODUCTION-NEON-HOST]-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```
- **Description:** The pooled PostgreSQL connection string from your Neon console. Ensure `-pooler` is included in the hostname for serverless connection pooling.
- **Status:** **Action Required by Owner** — Provide the production Neon password and host.

### 3. `USE_BACKUP_DATA`
- **Scope:** Production, Preview
- **Type:** Plain Text (Non-secret)
- **Exact Value:**
  ```text
  false
  ```
- **Description:** Disables local offline mock JSON storage and enforces direct querying to the Neon PostgreSQL database.

### 4. `SESSION_SECRET`
- **Scope:** Production, Preview
- **Type:** Secret (Server-only)
- **Exact Format:**
  ```text
  [64-character random hex string]
  ```
- **Generation Helper:**
  Run in terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Description:** High-entropy secret used for cryptographic signing of administrator and customer session cookies.
- **Status:** **Action Required by Owner** — Generate a fresh random key for production.

### 5. `CLOUDINARY_CLOUD_NAME`
- **Scope:** Production, Preview
- **Type:** Plain Text (Non-secret)
- **Exact Value:**
  ```text
  tifawhcs
  ```
- **Description:** The client-owned Cloudinary account cloud name.

### 6. `CLOUDINARY_API_KEY`
- **Scope:** Production, Preview
- **Type:** Secret (Server-only)
- **Exact Format:**
  ```text
  [Your Cloudinary API Key from Cloudinary Dashboard]
  ```
- **Description:** Cloudinary API key for asset uploads.
- **Status:** **Action Required by Owner** — Retrieve from Cloudinary console.

### 7. `CLOUDINARY_API_SECRET`
- **Scope:** Production, Preview
- **Type:** Secret (Server-only)
- **Exact Format:**
  ```text
  [Your Cloudinary API Secret from Cloudinary Dashboard]
  ```
- **Description:** Cloudinary API secret key. Never prefix with `NEXT_PUBLIC_`.
- **Status:** **Action Required by Owner** — Retrieve from Cloudinary console.

---

## 3. Optional Environment Variables

| Variable Name | Environments | Recommended Value | Notes |
| :--- | :---: | :---: | :--- |
| `CLOUDINARY_SECURE_FOLDER` | Production | `naqer-menu` | Default folder where product and category images are uploaded. |
| `CLOUDINARY_SECURE_FOLDER` | Preview | `naqer-menu-staging` | Isolates staging uploads from production photography. |
| `NAQER_ACTIVE_DATABASE_URL` | Production | *(Optional)* | Server-side backup connection string if `DATABASE_URL` is omitted. |

---

## 4. Summary of Code-Level URL Corrections

The codebase has already been aligned and verified:
1. **Centralized Base Domain:** `lib/site.ts` default fallback updated to `https://alnaker.vercel.app`.
2. **WhatsApp Order Links:** `app/api/checkout/route.ts` default fallback updated to `https://alnaker.vercel.app`.
3. **Receipt QR Verification:** `app/[locale]/receipt/[orderNumber]/page.tsx` default fallback updated to `https://alnaker.vercel.app`.
4. **Environment Template:** `.env.example` updated with `USE_BACKUP_DATA=false` and `https://alnaker.vercel.app`.
