# Checkout Regression Test Report

**Date:** 2026-11-20
**Environment:** local isolated DB-mode/backup-mode server on `127.0.0.1:3101`, started via `scratch/dev-runner-explicit-fallback.mjs` (production-shaped: `USE_BACKUP_DATA=true`, retired `DATABASE_URL`, active test DB via explicit `NAQER_ACTIVE_DATABASE_URL`). Real Playwright browser sessions used for the core matrix. **No production traffic was generated.**

## 1. Executed and re-verified this session

| Gate | Status | Evidence |
|---|---|---|
| Shared resolver unit assertions | **VERIFIED** | `node scratch/verify-database-url.mjs` → 12/12 PASS |
| Guest checkout (browser) | **VERIFIED** | `200`, `ORD-20261120-A9BEC8` |
| Authenticated checkout, new address (browser) | **VERIFIED** | `200`, `ORD-20261120-5E4E2C` |
| Existing customer, saved address (browser) | **VERIFIED** | `200`, `ORD-20261120-E898B1` |
| Empty cart validation | **VERIFIED** | `400`, no order created |
| Duplicate idempotency key | **VERIFIED** | second POST `200`, same order number; DB has exactly **1** row for the key |
| Correct totals | **VERIFIED** | all 3 orders: subtotal 2100, delivery 30, total **2130**, 1 item each |
| Order persistence | **VERIFIED** | all 3 order numbers found in configured DB (`scratch/verify-fix-db-result.json`) |
| OrderItem persistence | **VERIFIED** | 1 item per order; relational DB-mode check earlier produced 1 `Order` + 1 `OrderItem` (`ORD-20261120-BCEEC6`, `CHECKOUT_500_ROOT_CAUSE_FINAL_REPORT.md:121,129`) |
| Customer address persistence | **VERIFIED** | 2 `CustomerAddress` rows for the authenticated test customers |
| TypeScript | **VERIFIED** | `npm run typecheck` → exit 0 |
| Production build | **VERIFIED** | `npm run build` → exit 0 on retry |
| Migration validation (local config) | **VERIFIED** | 4 migrations, schema up to date |
| Secret scan | **VERIFIED** | 0 `npg_` tokens, 0 client-bundle findings |
| Test-data cleanup | **VERIFIED** | 3 test orders + 2 test customers and dependents deleted; local orders file restored; no test phone rows remain |

Browser output (verbatim result lines) and DB result JSON are in `scratch/browser-matrix-fix.mjs` / `scratch/verify-fix-db-result.json` / `scratch/security-scan-result.json` / `scratch/build-audit.log`.

## 2. Coverage of the 20 requested regression items

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Guest checkout | **VERIFIED** | browser matrix |
| 2 | Authenticated checkout | **VERIFIED** | browser matrix (new + saved address) |
| 3 | New customer address | **VERIFIED** | `ORD-20261120-5E4E2C`, 2 addresses found |
| 4 | Existing saved address | **VERIFIED** | `ORD-20261120-E898B1` |
| 5 | Customer information autofill | **VERIFIED** | exercised in saved-address browser flow |
| 6 | Saved address autofill | **VERIFIED** | exercised in saved-address browser flow |
| 7 | Invalid address / validation errors | **NOT VERIFIED** | no dedicated negative-address test executed |
| 8 | Empty cart | **VERIFIED** | 400 |
| 9 | Invalid product / variant | **NOT VERIFIED** | no dedicated test executed |
| 10 | Availability / price validation | **VERIFIED (partial)** | server-authoritative total 2130 confirmed; price-tamper rejection not separately tested |
| 11 | Subtotal/discount/tax/delivery/total | **VERIFIED (partial)** | subtotal 2100 + delivery 30 = 2130; no discount/tax scenario exercised |
| 12 | Order persistence | **VERIFIED** | DB rows found |
| 13 | OrderItem persistence | **VERIFIED** | 1 item per order; relational mode 1:1 confirmed |
| 14 | Customer persistence | **VERIFIED** | 2 test customers created and verified |
| 15 | Customer address persistence | **VERIFIED** | 2 addresses |
| 16 | Idempotency (same key) | **VERIFIED** | exactly 1 row per key |
| 17 | Concurrent requests / duplicate prevention | **NOT VERIFIED** | sequential duplicate tested; no concurrent-load test |
| 18 | DB connection failure handling | **VERIFIED** | retired-host + missing-config paths throw clear errors; `/api/checkout` returns safe 500 without leaking internals (reproduction in root-cause report §2.2/2.4) |
| 19 | API error handling | **VERIFIED** | safe generic error + correlation ID; no secret in response |
| 20 | Previously affected endpoints regression | **VERIFIED (partial)** | checkout, customer auth, address endpoints covered by matrix; admin/other endpoints out of scope |

Items marked **NOT VERIFIED** or **VERIFIED (partial)** remain as known test-coverage gaps. They do not affect the security gate but should be closed before treating the suite as exhaustive.

## 3. Fix under test

- Shared server-side resolver `lib/database-url.ts` used by all four DB clients.
- Retired host explicitly rejected; no silent rewrite; no hardcoded fallback.
- `OrderItem` ID prefixed with order id at `app/api/checkout/route.ts:606-609` to avoid `OrderItem_pkey` collisions.

## 4. Cleanup

Deleted only verification records: orders `ORD-20261120-A9BEC8`, `ORD-20261120-5E4E2C`, `ORD-20261120-E898B1` and customers `cust_98f8c484f80fc678`, `cust_26e3af3b4f0ea360` with dependent rows; local orders file restored. No genuine customer or order data was touched.

## 5. Final statement

Checkout fix **VERIFIED** in local browser + DB tests. These results are **not** production acceptance — see `POST_DEPLOYMENT_ACCEPTANCE_REPORT.md` (**NOT APPLICABLE**, no deployment).
