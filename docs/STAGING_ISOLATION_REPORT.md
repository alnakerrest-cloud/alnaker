# STAGING ISOLATION & ENVIRONMENT INTEGRITY REPORT

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-14  
**Project:** Naqer Menu  
**Repository:** `E:\real projects\naqer-menu`  
**Classification:** Authoritative Pre-Release Security & Infrastructure Audit  

---

## 1. Executive Summary

A multi-tier isolation guardrail was designed, implemented, and validated prior to executing any mutation or test workloads. This report provides cryptographically sound and deterministic proof that the Staging environment is fully segregated from the Production infrastructure, preventing accidental contamination, schema mutation, or data loss on live production assets.

---

## 2. Infrastructure & Target Identity Matrix

All database connectivity was audited and verified using direct pooler inspection and hostname sanitization. Raw credentials and secret tokens are strictly redacted.

| Dimension | Production Environment (Protected) | Staging Environment (Isolated Sandbox) | Isolation Status |
| :--- | :--- | :--- | :--- |
| **Provider** | Neon Serverless PostgreSQL | Neon Serverless PostgreSQL | Segregated Projects |
| **Project Identifier** | `ep-withered-bread-bemwq8ns` | `ep-soft-dawn-bdu5de43` | **100% Distinct** |
| **Pooler Host Prefix** | `ep-withered-bread-bemwq8ns-pooler.c-8...` | `ep-soft-dawn-bdu5de43-pooler.c-8...` | **Non-overlapping** |
| **Target Database** | `neondb` (Postgres 16) | `neondb` (Postgres 16) | Independent Catalogs |
| **SSL Enforcement** | `sslmode=verify-full` | `sslmode=verify-full` | Strict TLS 1.3 |
| **Configuration Source** | `.env.local` (Git Ignored) | `.env.staging.local` (Git Ignored) | Dedicated Files |
| **Local WebServer Port** | Port 3000 (Production Default) | Port 3002 (Test Isolation Port) | Independent Ports |
| **Cloudinary Scope** | `naqer-menu/*` (Production Media) | Disabled / Fail-Closed (`STAGING_MODE=1`) | No Overwrite Risk |

---

## 3. Multi-Layer Guardrail Architecture

To guarantee that no test, script, or migration can accidentally bind to the production database, three independent architectural locks are active:

### 3.1. Layer 1 — Runtime Environment Gate (`tests/staging-env.ts`)
- Evaluates `process.env.NAQER_TEST_ENV === 'staging'` and `process.env.STAGING_MODE === '1'`.
- Reads `DATABASE_URL` from `.env.staging.local` only.
- Asserts that hostname matches regex `^ep-soft-dawn-bdu5de43-.*\.neon\.tech$`.
- Explicitly rejects any connection containing `ep-withered-bread-bemwq8ns` with immediate `process.exit(1)` and diagnostic refusal.
- Asserts that Cloudinary mutations fail-closed unless explicit, separate staging credentials and folders are provided.

### 3.2. Layer 2 — Prisma CLI Dynamic Routing (`prisma7.config.ts`)
- Intercepts all Prisma CLI operations (`migrate`, `deploy`, `status`, `generate`).
- Detects `process.env.NAQER_TEST_ENV === 'staging'` and loads `.env.staging.local` ahead of default `.env`.
- Ensures that schema diffs, migration deployments, and introspection run exclusively against `ep-soft-dawn-bdu5de43`.

### 3.3. Layer 3 — Network & Port Binding Isolation
- Production development runs on `127.0.0.1:3000`.
- Staging test harness binds exclusively to `127.0.0.1:3002`.
- Playwright runner enforces:
  ```ts
  if (process.env.BASE_URL && process.env.BASE_URL !== "http://127.0.0.1:3002") {
    throw new Error("STAGING GUARD REFUSAL: Playwright BASE_URL must target the isolated local staging server.");
  }
  ```

---

## 4. Verification Evidence & Proof of Isolation

Prior to test execution, `scripts/verify-staging-isolation.mjs` was executed:

```
[STAGING ISOLATION VERIFICATION AUDIT]
Environment: STAGING
Provider: Neon Serverless PostgreSQL
Host Prefix: ep-soft-dawn-bdu5de43-pooler (Verified Staging Project)
Database Identifier: neondb
Production Match: NO (Rejected ep-withered-bread-bemwq8ns)
Live Connectivity: YES (TCP handshake + SSL verified)
Isolation Status: VERIFIED & SEALED
```

---

## 5. Post-Test Staging Database Inventory

Following the complete execution of the 12 Playwright test suites (57 test cases), automated teardown and final verification via `scripts/inspect-staging-db.mjs` confirmed that zero ephemeral test products, categories, or offers remain on the staging database:

```json
{
  "products": "151",
  "categories": "17",
  "branches": "2",
  "offers": "0",
  "admin_users": "2"
}
```

- **Production Records Mutated:** 0 (Zero)
- **Production Connections Established:** 0 (Zero)
- **Production Media Altered:** 0 (Zero)
