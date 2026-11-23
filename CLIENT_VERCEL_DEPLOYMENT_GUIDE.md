# Client Guide: Deploying Naqer Menu to a New Vercel Project

**Date:** 2026-11-22  
**Target Platform:** Vercel (Client-Owned Account)  

---

## 1. Project Prerequisites

1. An active Vercel account owned by the client (Hobby or Pro plan).
   > [!IMPORTANT]
   > Ensure the Vercel account has no outstanding billing flags or payment disputes. Previously an attempt returned `402 / DEPLOYMENT_DISABLED`, which occurs if a Vercel team has exceeded its trial limits or has an unpaid invoice. A clean, independent client Vercel account or free personal account completely avoids this.
2. Access to the client's Git repository (GitHub / GitLab / Bitbucket).
3. Production database credentials on Neon (see `CLIENT_DATABASE_GUIDE.md`).
4. Client Cloudinary account credentials (see `CLIENT_CLOUDINARY_GUIDE.md`).

---

## 2. Vercel Project Creation & Settings

1. Log into your Vercel Dashboard at [vercel.com](https://vercel.com).
2. Click **Add New...** $\to$ **Project**.
3. Import your Git repository `naqer-menu`.
4. In the **Configure Project** screen, configure the following exact settings:
   - **Project Name:** `naqer-menu` (or your chosen name)
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** Leave as default (`next build`) or override with `npm run build`
   - **Output Directory:** Leave as default (`.next`)
   - **Install Command:** Leave as default (`npm install`)
   - **Node.js Version:** `20.x` or `22.x`

---

## 3. Environment Variables Configuration

In the Vercel project configuration, expand **Environment Variables** and add the following keys:

| Variable Name | Environments | Value / Description | Example |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Production, Preview | Pooled PostgreSQL connection string from Neon. | `postgresql://neondb_owner:***@ep-***-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `SESSION_SECRET` | Production, Preview | Random 32+ character hex string for signing admin session cookies. | `Generate with: openssl rand -hex 32` |
| `CLOUDINARY_CLOUD_NAME` | Production, Preview | Client Cloudinary account cloud name. | `tifawhcs` |
| `CLOUDINARY_API_KEY` | Production, Preview | Client Cloudinary API key. | `(from Cloudinary dashboard)` |
| `CLOUDINARY_API_SECRET` | Production, Preview | Client Cloudinary API secret (Server-only). | `(from Cloudinary dashboard)` |
| `CLOUDINARY_SECURE_FOLDER` | Production | Base folder for uploaded assets in production. | `naqer-menu` |
| `CLOUDINARY_SECURE_FOLDER` | Preview | Base folder for preview deployments. | `naqer-menu-staging` |
| `USE_BACKUP_DATA` | Production, Preview | Set to `false` so the app queries PostgreSQL directly. | `false` |
| `NEXT_PUBLIC_SITE_URL` | Production | The public URL of the restaurant's menu. | `https://menu.alnaqer.com` |

> [!CAUTION]
> Never prepend `NEXT_PUBLIC_` to `DATABASE_URL`, `SESSION_SECRET`, or `CLOUDINARY_API_SECRET`. Those variables must remain strictly server-side.

---

## 4. Custom Domain & DNS Setup

To attach the restaurant's custom domain (e.g., `menu.alnaqer.com` or `alnaqer.com`):
1. In the Vercel Project Dashboard, navigate to **Settings** $\to$ **Domains**.
2. Click **Add** and enter your domain name.
3. Vercel will display the required DNS records:
   - For a subdomain (e.g., `menu.alnaqer.com`): Add a `CNAME` record pointing to `cname.vercel-dns.com`.
   - For an apex domain (e.g., `alnaqer.com`): Add an `A` record pointing to `76.76.21.21`.
4. Vercel automatically provisions and renews a free Let's Encrypt SSL certificate within 5–10 minutes of DNS propagation.

---

## 5. First Deployment & Verification

1. Click **Deploy**.
2. Vercel will run `npm install`, compile all 18 routes with Turbopack, and deploy to their global Edge network.
3. Once completed, visit the generated URL and run the verification checks listed in `FINAL_RELEASE_CHECKLIST.md`.
