# Database Configuration Audit

**Date:** 2026-11-20 · **Status:** **BLOCKED** — production identity cannot be positively confirmed.

## 1. Resolver implementation — VERIFIED

`lib/database-url.ts` is the single approved server-side configuration mechanism:

- Priority: `DATABASE_URL` → legacy `DATABASE_URL ` (trailing space) → explicit `NAQER_ACTIVE_DATABASE_URL` (`:47,54-55`).
- Retired marker `ep-withered-bread` rejected explicitly; hostname-only detection (`:24,34-41`).
- Retired primary + no explicit fallback → `DatabaseConfigurationError` (`:81-87`).
- Retired fallback → error (`:60-65`).
- Explicit fallback use is logged in clear text (`:71-79`).
- No URL/password is ever printed in errors or logs.
- `pgSslConfig()` derives TLS from the configured URL (`:108-112`).

All four clients use it:
| Client | Evidence |
|---|---|
| Prisma | `lib/prisma.ts:13,46,51-57` (strict `resolveDatabaseUrl()`) |
| Orders | `lib/orders-store.ts:5,155-164` (nullable `getConfiguredDatabaseUrl()`) |
| Customer store | `lib/customer-store.ts:9,24-34` |
| Customer hub | `lib/customer-hub-store.ts:9,54-64` |

`node scratch/verify-database-url.mjs` → **12/12 PASS**, including missing-config, retired-host, invalid-fallback and no-secret-in-source assertions.

## 2. Root cause (reproduced from code + history)

- `lib/prisma.ts` historically routed away from retired/suspended `ep-withered-bread-…` to `ep-soft-dawn-…`.
- Commit `7c0ec271` removed the equivalent logic from `lib/orders-store.ts` (raw `pg`), leaving direct `process.env.DATABASE_URL`.
- Result: menu reads (Prisma/backup) succeeded while `persistOrderToDb()` threw after retries → checkout 500. See `CHECKOUT_500_ROOT_CAUSE_FINAL_REPORT.md:30-55`.
- Secondary defect: `OrderItem_pkey` collision from repeated `vi.id`; fixed at `app/api/checkout/route.ts:606-609` with `` id: `${order.id}:${vi.id}` ``.

## 3. Production database identity — BLOCKED

The owner has **not** explicitly identified the intended active production Neon database. Per the strict stop condition, selection by hostname, availability, or repository documentation is not permitted.

Conflicting authoritative-looking sources:

| Source | Claim |
|---|---|
| `docs/PRODUCTION_DATABASE_LIVE_VERIFICATION.md`, `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`, `docs/DATABASE_MIGRATION_AND_ROLLBACK.md`, `docs/STAGING_TEST_INVENTORY.md`, `tests/staging-env.ts` | `ep-withered-bread-…` = production; `ep-soft-dawn-…` = staging |
| `docs/PRODUCTION_DATABASE_REAL_DATA_VERIFICATION.md` | `ep-soft-dawn-…` = "Live Primary Production"; `ep-withered-bread-…` = suspended/quota-exceeded |
| `CHECKOUT_500_ROOT_CAUSE_FINAL_REPORT.md:9,54` | treats `ep-soft-dawn-…` as active and `ep-withered-bread-…` as retired |

| Confirmation item | Status |
|---|---|
| Correct Neon project | **NOT VERIFIED** |
| Correct database name | **NOT VERIFIED** |
| Branch / environment | **NOT VERIFIED** |
| Schema | **NOT VERIFIED** |
| Existing tables | **NOT VERIFIED** |
| Applied migrations against confirmed production DB | **NOT VERIFIED** |
| Expected production data | **NOT VERIFIED** |
| Role and permissions | **NOT VERIFIED** |
| Not a test/backup/retired DB | **NOT VERIFIED** |

`npx prisma migrate status` → "4 migrations found / Database schema is up to date!" was re-run this session, but applies **only to the locally configured database** and is **not** evidence about production.

## 4. Local regression target (not production)

Browser regression used `.env.test.local` via `scratch/dev-runner-explicit-fallback.mjs` on port 3101 with `USE_BACKUP_DATA=true`, a simulated retired `DATABASE_URL`, and the configured test DB supplied through `NAQER_ACTIVE_DATABASE_URL`. DB verification (`scratch/verify-fix-db-result.json`) confirmed orders on the configured test host `ep-soft-dawn-bdu5de43-pooler.c-8.us-east-2.aws.neon.tech`. **This host is a test target for this work and is not thereby authorized as production.**

## 5. Required configuration contract for deployment

- Server-side variables only: `DATABASE_URL` (primary), optional `NAQER_ACTIVE_DATABASE_URL` (explicit fallback). Never `NEXT_PUBLIC_`.
- Value must point to the owner-confirmed production database; no guessing.
- Production must not use the retired marker host.
- Preview/Development must use their own isolated targets.
- Rotation of the exposed credential must precede deployment (see `SECURITY_REMEDIATION_REPORT.md`).

## 6. Final statement

Configuration **mechanism** is VERIFIED secure and consistent. Production **identity** is BLOCKED. No connection string or credential is reproduced in this document.
