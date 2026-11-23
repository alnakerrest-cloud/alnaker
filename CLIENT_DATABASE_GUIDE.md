# Client Guide: Production PostgreSQL Database Setup & Operations

**Date:** 2026-11-22  
**Database Engine:** PostgreSQL 16+ (Serverless Neon Recommended)  

---

## 1. Overview & Connection Architecture

Naqer Menu is built for low-cost, serverless database hosting using PostgreSQL.

### Critical Rule: Connection Pooling (`-pooler`)
In serverless environments like Vercel, every incoming web request can spin up an ephemeral Node.js function. Without a connection pooler, concurrent visitors could quickly exhaust PostgreSQL's maximum connection limit.
- **Always use the Pooled connection string** provided by Neon (contains `-pooler` in the hostname).
- Example format:
  ```text
  postgresql://[user]:[password]@[project-id]-pooler.[region].aws.neon.tech/[dbname]?sslmode=require
  ```

---

## 2. Step-by-Step Production Database Provisioning

### Step 2.1: Create Neon Project
1. Log into [neon.tech](https://neon.tech) and create a new project (e.g., `naqer-menu-production`).
2. Region: Choose `AWS / us-east-2` or `eu-central-1` (closest to your audience).
3. Copy the pooled connection string from the Neon dashboard.

### Step 2.2: Apply Schema Migrations
From your local terminal, run the official Prisma migration deploy command targeting the new production database:
```bash
DATABASE_URL="postgresql://[user]:[password]@[project-id]-pooler.../neondb?sslmode=require" npx prisma migrate deploy
```
> [!NOTE]
> `prisma migrate deploy` executes the 4 version-controlled migration files in `prisma/migrations/`. It is 100% deterministic, non-destructive, and creates all 22 required tables and 10 custom PostgreSQL enum types.

### Step 2.3: Import Authoritative Menu Data
Run the idempotent import script created for this release:
```bash
DATABASE_URL="postgresql://[user]:[password]@[project-id]-pooler.../neondb?sslmode=require" node scripts/import-authoritative-dataset.mjs
```
The script will insert:
- 1 RestaurantSettings record (Brand: قرية الناقر, Delivery Fee: 30 EGP)
- 2 Branches (فرع جمصة & فرع دمياط الجديدة)
- 17 Categories (excluding test data)
- 26 Sections
- 151 Products (100% visible and available)
- 167 Price Variants
- 151 ProductImage rows
- 9 OptionGroups & 20 OptionItems
- 30 Product-to-Modifier relational bindings

### Step 2.4: Provision Owner Admin Account
Run the secure owner provisioning script:
```bash
DATABASE_URL="postgresql://[user]:[password]@[project-id]-pooler.../neondb?sslmode=require" node scripts/provision-owner.mjs
```
The script will prompt for or generate a secure temporary password, hash it with bcrypt (12 rounds), set `mustChangePassword=true`, and write the record to `AdminUser`.

---

## 3. Database Indexes & Constraints Verification

The Prisma schema and PostgreSQL migrations enforce essential database integrity:
- **Foreign Keys:** Cascade deletion from Category $\to$ Section $\to$ Product $\to$ Variants / Images / Options.
- **Composite Unique Constraint:** `ProductOptionGroup (productId, groupId)` prevents duplicate modifier assignments.
- **Unique Constraint:** `Category.slug` ensures stable SEO URLs.
- **Indexes:**
  - `Category(group, isVisible, sortOrder)`
  - `Product(sectionId, sortOrder)`
  - `ProductVariant(productId, sortOrder)`
  - `ProductImage(productId, sortOrder)`
  - `Session(tokenHash)`, `Session(adminId)`, `Session(expiresAt)`
  - `AuditLog(entityType, entityId)`, `AuditLog(createdAt)`

---

## 4. Neon Auto-Suspend & Keep-Alive Tuning

Neon automatically pauses compute resources after 5 minutes of inactivity to conserve free-tier hours.
The application codebase already incorporates built-in resilience:
- `lib/prisma.ts` initializes `pg.Pool` with `connectionTimeoutMillis: 15_000` (allowing compute time to awaken).
- `withDbRetry` helper automatically retries transient cold-start network errors (`P1001`, `ECONNREFUSED`, `57P01`) with exponential backoff for up to 7 seconds.
- Public menu pages utilize Next.js ISR (`revalidate = 60`) so ordinary customer browsing hits cached HTML at the Edge rather than generating database queries on every page hit.
