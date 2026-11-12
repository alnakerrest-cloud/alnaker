# Naqer Menu — Production Deployment Guide

This guide describes how to deploy, configure, and maintain the Naqer Menu digital menu application in a live production environment.

---

## 1. System Requirements

- **Runtime:** Node.js `>= 20.9.0` (LTS recommended) or Next.js-compatible serverless environment (Vercel, AWS Amplify, Railway, VPS).
- **Package Manager:** `npm` (v10+)
- **Database:** PostgreSQL `>= 15` (e.g. Neon, Supabase, AWS RDS) with SSL support.
- **Media CDN:** Cloudinary account for dynamic uploads and signature dish imagery.

---

## 2. Environment Variables Specification

Create the production environment configuration using `.env.example` as a template. Set these in your hosting dashboard:

```env
# Public domain URL (used for QR code, canonical SEO, sitemaps)
NEXT_PUBLIC_SITE_URL=https://menu.naqer.com

# PostgreSQL Connection String (Use pooled connection for serverless hosting)
DATABASE_URL=postgresql://user:password@host.neon.tech/neondb?sslmode=require

# Session Signing Secret (Must be 32+ cryptographically random characters)
SESSION_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_SECRET

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME=naqer-menu
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here
CLOUDINARY_SECURE_FOLDER=naqer-menu
```

---

## 3. Deployment Procedures

### Option A: Vercel Deployment (Recommended)

1. **Connect Repository:**
   - Link the GitHub/GitLab repository to Vercel.
   - Framework preset: **Next.js**.
   - Root directory: `./`
2. **Configure Environment Variables:**
   - Add all 7 variables listed above under **Project Settings -> Environment Variables**.
3. **Build & Output Settings:**
   - Build Command: `npm run build` (runs `prisma generate && next build`)
   - Output Directory: `.next`
   - Install Command: `npm install`
4. **Deploy:**
   - Trigger initial deployment. Vercel automatically runs Next.js Turbopack build and deploys to global Edge network.

---

### Option B: Linux VPS / Docker Deployment

1. **Clone & Setup:**
   ```bash
   git clone <REPO_URL> /var/www/naqer-menu
   cd /var/www/naqer-menu
   npm install --production=false
   ```

2. **Generate Database Client & Build:**
   ```bash
   npm run db:generate
   npm run build
   ```

3. **Process Management with PM2:**
   ```bash
   pm2 start npm --name "naqer-menu" -- run start
   pm2 save
   pm2 startup
   ```

4. **Nginx Reverse Proxy Configuration:**
   ```nginx
   server {
       server_name menu.naqer.com;

       location / {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **SSL Certificate (Let's Encrypt Certbot):**
   ```bash
   sudo certbot --nginx -d menu.naqer.com
   ```

---

## 4. Production OWNER Account Provisioning

To safely create the primary administrative OWNER account in production without using default passwords or risking accidental credential overwrite:

```bash
# Provide client-chosen credentials
OWNER_EMAIL="owner@naqer.com" \
OWNER_PASSWORD="<STRONG_CLIENT_CHOSEN_PASSWORD>" \
OWNER_NAME="إدارة مطاعم النقر" \
npm run db:provision-owner
```

*Note:* If the account already exists, the script safely stops and will not overwrite credentials unless explicitly instructed with `ALLOW_OWNER_OVERWRITE=1`.

---

## 5. Post-Deployment Verification (Smoke Test Checklist)

Execute these checks immediately following live deployment:

1. **Public Menu Verification:**
   - Open `https://<YOUR_DOMAIN>/ar` -> confirm food & drinks tabs, categories, and images render.
   - Open `https://<YOUR_DOMAIN>/en` -> confirm English translation and LTR layout.
2. **Ordering & WhatsApp Generation:**
   - Add an item with variant and addon to cart.
   - Open cart drawer -> click *"إرسال الطلب عبر واتساب"*.
   - Verify WhatsApp opens with the formatted message and correct branch phone number.
3. **Admin Dashboard Login:**
   - Navigate to `https://<YOUR_DOMAIN>/admin/login`.
   - Log in with the provisioned OWNER account.
   - Verify access to Products, Categories, Offers, Branches, and Settings.
4. **Safe LiveSync Validation (Zero Impact on Live Menu):**
   - In Admin Dashboard, create a temporary isolated draft product (or toggle an inactive item's internal note in staging).
   - Observe customer menu in another tab update the content version within 4 seconds without manual refresh.
   - Delete the temporary test product immediately.
   - **Never edit live customer-facing prices or dishes during public production hours.**

---

## 6. Rollback Procedure

If unexpected issues arise during deployment:
- **Vercel:** In the Vercel Dashboard, go to **Deployments** -> select the previous stable deployment -> click **Promote to Production** (instant zero-downtime rollback).
- **VPS/Node Server:** Run `git checkout <PREVIOUS_COMMIT_TAG> && npm run build && pm2 reload naqer-menu`.

