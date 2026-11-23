# ENVIRONMENT VARIABLES GUIDE

This document provides a comprehensive dictionary of all environment variables used by **Naqer Menu** across Development, Staging, Preview, and Production environments.

---

## 1. Security Principles

1. **Server-Side Exclusivity:** Variables without the `NEXT_PUBLIC_` prefix are accessible **only** within Node.js runtime environments (API routes, Server Components, server actions). They are **never** bundled into the client-side JavaScript.
2. **Never Commit Secrets:** Do not commit `.env`, `.env.local`, `.env.production.local`, or any file containing real database passwords or Cloudinary secrets to Git.
3. **Environment Isolation:** Never use production database credentials or production Cloudinary API keys in local development, staging, or automated test runs.

---

## 2. Exhaustive Variable Reference

| Variable Name | Required | Target Environment | Scope | Description & Syntax |
| :--- | :---: | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | Dev / Staging / Prod | Server | PostgreSQL connection string with SSL required. Format: `postgresql://[user]:[password]@[host]/[dbname]?sslmode=require` |
| `DIRECT_URL` | Optional | Staging / Prod | Server | Direct connection string bypassing pooler (useful for Neon migrations if using pgBouncer). Format: `postgresql://[user]:[password]@[direct-host]/[dbname]?sslmode=require` |
| `SESSION_SECRET` | **Yes** | Dev / Staging / Prod | Server | Cryptographic key used to sign and verify administrative session tokens. Minimum 32 random characters. |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | Dev / Staging / Prod | Server | Cloudinary account cloud name (Client account: `tifawhcs`). |
| `CLOUDINARY_API_KEY` | **Yes** | Dev / Staging / Prod | Server | Cloudinary API Key for authenticated uploads and deletions. |
| `CLOUDINARY_API_SECRET` | **Yes** | Dev / Staging / Prod | Server | Cloudinary API Secret. Keep strictly confidential. |
| `CLOUDINARY_FOLDER` | Optional | Dev / Staging / Prod | Server | Cloudinary target folder prefix. Defaults to `naqer-menu` in production, `naqer-menu-staging` in staging. |
| `NEXT_PUBLIC_APP_URL` | Optional | Dev / Preview / Prod | Client/Server | Canonical URL of the deployment (e.g. `https://naqermenu.com`). |
| `NEXT_PUBLIC_DEFAULT_LOCALE`| Optional | Dev / Preview / Prod | Client/Server | Default fallback locale (`ar`). |
| `NODE_ENV` | Automatic | Dev / Preview / Prod | Client/Server | Set automatically by Vercel/Node (`development`, `test`, `production`). |

---

## 3. Environment Specific Configuration

### Production (Client Vercel Project)
Set in **Vercel Project Settings $\to$ Environment Variables** (Scope: **Production only**):
```env
DATABASE_URL="postgresql://naqer_prod_user:[PROD_PASSWORD]@ep-naqer-prod.us-east-2.aws.neon.tech/neondb?sslmode=require"
SESSION_SECRET="[STRONG_64_CHAR_HEX_RANDOM_SECRET]"
CLOUDINARY_CLOUD_NAME="tifawhcs"
CLOUDINARY_API_KEY="[CLIENT_CLOUDINARY_API_KEY]"
CLOUDINARY_API_SECRET="[CLIENT_CLOUDINARY_API_SECRET]"
CLOUDINARY_FOLDER="naqer-menu"
NEXT_PUBLIC_APP_URL="https://[CLIENT_PRIMARY_DOMAIN]"
```

### Staging / Preview
Set in **Vercel Project Settings $\to$ Environment Variables** (Scope: **Preview only**):
```env
DATABASE_URL="postgresql://[STAGING_USER]:[STAGING_PASSWORD]@ep-ancient-hill-beec491j-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require"
SESSION_SECRET="[STAGING_RANDOM_SECRET]"
CLOUDINARY_CLOUD_NAME="tifawhcs"
CLOUDINARY_API_KEY="[CLIENT_CLOUDINARY_API_KEY]"
CLOUDINARY_API_SECRET="[CLIENT_CLOUDINARY_API_SECRET]"
CLOUDINARY_FOLDER="naqer-menu-staging"
STAGING_CLOUDINARY_ENABLED="1"
```

### Automated Testing (Local / CI)
Configured via `.env.test.local` or `.env.staging.local`:
```env
NAQER_TEST_ENV="staging"
NAQER_ALLOW_NON_LOCAL_TEST="true"
STAGING_DATABASE_URL="postgresql://..."
STAGING_CLOUDINARY_ENABLED="1"
E2E_ADMIN_EMAIL="qa-owner@naqer-menu.local"
E2E_ADMIN_PASSWORD="[QA_PASSWORD]"
E2E_EDITOR_EMAIL="qa-editor@naqer-menu.local"
E2E_EDITOR_PASSWORD="[QA_PASSWORD]"
```

---

## 4. Troubleshooting Missing Variables

- **Database Connection Error (`P1000` / `P1001`):** Check that `DATABASE_URL` is configured for the active environment and ends with `?sslmode=require`.
- **Admin Session Rejection (`401` / Immediate Logout):** Ensure `SESSION_SECRET` is defined and does not change between serverless function invocations.
- **Image Upload Failures:** Verify `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are properly assigned in Vercel settings and the Cloudinary account `tifawhcs` is active.
