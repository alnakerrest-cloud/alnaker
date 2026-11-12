# Naqer Menu — Client Delivery & Operations Manual

## 1. System Overview
**Naqer Menu** is an interactive bilingual (Arabic/English) digital restaurant ordering system built for **Al Naqer Village (قرية الناقر)** with branches in Damietta and Gamasa.
- **Frontend / Framework:** Next.js 16 (App Router, Turbopack, Server Actions) + React 19.
- **Styling:** Vanilla CSS design system with fluid typography, responsive layout across 7 device viewports (360px – 1920px), zero horizontal overflow, and native RTL/LTR support.
- **Database:** Neon PostgreSQL with Prisma ORM.
- **Image Pipeline:** 151 production items (137 local optimized WebP commercial photos, 14 signature dishes preserved from original PDF menu via Cloudinary).
- **Interactive Ordering:** Real-time modal selection, product options/customization, quantity selector, multi-branch targeting, localized interactive cart drawer, and formatted WhatsApp order dispatching.
- **Promotional Engine:** Dynamic promotional section with multi-state layout (Graceful hide when 0 offers, Hero Spotlight Banner when 1 offer, responsive grid when 2+ offers).
- **Admin Dashboard:** Role-based access control (OWNER / EDITOR) for managing products, categories, branches, settings, images, and offers.

---

## 2. Environment Configuration
The application requires the following environment variables configured in `.env.local` (local) or your hosting provider dashboard (production):

```bash
# Database (Neon PostgreSQL connection string with SSL)
DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"

# Admin Authentication Secret (32+ chars random string)
ADMIN_JWT_SECRET="<random-secure-32-character-secret>"

# Cloudinary Storage (For admin image uploads and legacy PDF dishes)
CLOUDINARY_CLOUD_NAME="<cloudinary-cloud-name>"
CLOUDINARY_API_KEY="<cloudinary-api-key>"
CLOUDINARY_API_SECRET="<cloudinary-api-secret>"

# Base URL (Optional, defaults to deployed host)
NEXT_PUBLIC_SITE_URL="https://naqer-menu.com"
```

---

## 3. Database Setup & Migrations
1. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```
2. **Apply Migrations (Production-Safe):**
   ```bash
   npx prisma migrate deploy
   ```
   *(Note: `db:push` is intentionally disabled to safeguard production data).*
3. **Verify Database Records:**
   ```bash
   node scripts/find-test-products.mjs
   ```
   Confirms exact production baseline: 151 products and 18 categories.

---

## 4. Admin Access & User Setup
To initialize or reset administrator credentials:
- **Seed Owner Account:**
  ```bash
  npm run db:seed-admin
  ```
  *(Configured with OWNER role, full administrative capabilities including deletion).*
- **Seed Editor Account:**
  ```bash
  node scripts/seed-editor.mjs
  ```
  *(Configured with EDITOR role, product/category content management without deletion rights).*
- **Admin Login Route:** Access `/admin/login` from any browser. Session is secured via `httpOnly`, `sameSite=lax` cookies.

---

## 5. Image & Photography Pipeline
- **Local WebP Assets:** High-resolution commercial photos reside in `public/images/products/<category>/<filename>.webp`. Average file size is 66.2 KB for maximum performance on mobile networks.
- **Cloudinary Integration:** Used for dynamic uploads in `/admin/products/[id]` and `/admin/categories/[id]`. Supports up to 5 MB per asset with automatic format optimization and cleanup on delete.
- **Media Library:** Accessible at `/admin/images` showing active asset inventory and product usage links.

---

## 6. Build & Deployment Instructions
### Local Production Execution:
```bash
# 1. Typecheck
npm run typecheck

# 2. Production build
npm run build

# 3. Start production server
npm run start
```

### Cloud Deployment (Vercel / Railway / Node Docker):
1. Connect Git repository to hosting provider.
2. Set Environment Variables as outlined in Section 2.
3. Build Command: `npm run build`
4. Start Command: `npm run start`
5. Root Directory: `./`
6. Output: Next.js standalone / server-rendered application.

---

## 7. Client Operating Guidelines
1. **Managing Products:**
   - Go to `/admin/products`.
   - Use the toggle switch to instantly hide or show products on the live menu without deleting them.
   - Use the edit button to update prices, descriptions, ingredients, and variant price options.
2. **Managing Offers & Discounts:**
   - Go to `/admin/offers`.
   - Create a discount with percentage or fixed amount deduction.
   - Attach target products and eligible branches.
   - Use the one-click "تفعيل" (Activate) / "إيقاف" (Deactivate) button.
   - If zero offers are active, the public section automatically disappears with zero whitespace.
   - If one offer is active, it automatically renders as a prominent Hero Spotlight Banner.
3. **Branches & WhatsApp Orders:**
   - Go to `/admin/branches` to update phone numbers or orderable status.
   - When customers order via WhatsApp, the message automatically routes to the chosen branch with detailed itemization and discounts.

