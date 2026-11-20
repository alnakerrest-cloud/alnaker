# Checkout HTTP 500 — Root Cause and Fix Report

Date: 2026-11-20

## 1. Executive summary

The production `POST /api/checkout` 500 is **not** a menu, pricing, cart, cookie, or OTP bug. It is a **database connection-resolution regression** in the order persistence path.

`lib/prisma.ts` automatically routes away from the retired/suspended Neon project `ep-withered-bread-…` to the active project `ep-soft-dawn-…`. The raw `pg` pools used by `lib/orders-store.ts` (and the customer stores) did **not** share that logic after commit `7c0ec271`. In production, where the deployed environment still references the retired host, menu reads succeeded (backup/Prisma path) but `persistOrderToDb()` was the one awaited, unguarded operation and threw after three failed attempts. The checkout catch block converted that into the observed generic 500 with a correlation ID.

The fix introduces one shared database-URL resolver used by all four server-side `pg`/Prisma pool creation sites, restores the SSL option that was removed with the regression, and also fixes a secondary `OrderItem_pkey` collision that silently prevented relational order-item rows. The fix was verified in a real browser under the exact production-like conditions (backup menu data + retired `DATABASE_URL`) and in normal DB mode. Production deployment was **not** performed because no Vercel project link/credentials or explicit deployment approval are available.

## 2. Evidence the failure was reproduced first

### 2.1 Real production browser reproduction

Script: `scratch/prod-checkout-repro.mjs`

- Request: `POST https://naqer-menu.vercel.app/api/checkout`
- Product: `5580e943-c91a-41b4-9a62-b8591af1fc3e` (صينية الملوك), qty 1
- Branch: `7fa2be20-67bd-4060-a83a-81ded2550018`, `DELIVERY`, `CASH`
- Test phone: `01000000002`; server-calculated total shown in the UI: `2130` (2100 + 30 delivery)
- Response: `500`
- Body: `{"error":"حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.","errorId":"err_37f6d320"}`

Immediate DB inspection (`scratch/db-incident-check.mjs`) found **no** partial `OrderStore` row for that phone/address/total. Only earlier test orders existed.

The `err_<8 hex>` format was introduced in commit `de624ef0`, which is therefore present in the deployed build.

### 2.2 The only unguarded throw in the checkout route

Inspection of `app/api/checkout/route.ts`:

- Menu-mode read (`getMenuSettingsAsync`) catches DB errors and falls back to bundled settings.
- Menu, branch, prices, discounts and totals are computed from the active menu source.
- Customer lookup/creation is wrapped in `try/catch` (line ~502–518).
- Address auto-save and notifications are fire-and-forget `.catch(() => {})`.
- Relational `prisma.order.create` is wrapped in `try/catch` (line ~587–623).
- The **only** awaited, unguarded persistence call is `createOrder()` → `persistOrderToDb()` (line ~524).

`persistOrderToDb()` (`lib/orders-store.ts`) creates a pool from raw `process.env.DATABASE_URL` (or the legacy key with a trailing space), retries three times, then throws:

```
Failed to commit order <number> to database after 3 attempts: <driver error>
```

If the variable is absent entirely, it throws immediately in production/Vercel mode.

### 2.3 Regression history

- `41437a6a` and `d3af9ac1` added `getSanitizedDbUrl()` to `lib/orders-store.ts`, replacing the retired `ep-withered-bread` host and setting explicit Neon SSL.
- `7c0ec271` ("fix :check out") **removed** that function and the SSL option from `lib/orders-store.ts`, leaving only `process.env.DATABASE_URL`. It is an ancestor of the deployed HEAD.
- `lib/prisma.ts` kept its equivalent failover, so reads kept working while order writes failed.
- `tests/staging-env.ts` marks `ep-withered-bread-bemwq8ns` as the production project ID; `docs/PRODUCTION_DATABASE_REAL_DATA_VERIFICATION.md` records that cluster as suspended/quota-exceeded (`53000`).
- Production `/api/content-version` returns `backup-naqer-unified-1540000000000`, confirming production runs in backup mode (`USE_BACKUP_DATA !== "false"`), which further explains why Prisma/menu reads never exposed a DB error.

### 2.4 Controlled reproduction of the exact mechanism (before the fix)

A local dev server on port 3101 was started with **production-shaped** settings: `USE_BACKUP_DATA=true` and `DATABASE_URL` pointing at the retired `ep-withered-bread` host (`scratch/dev-runner-stale-db.mjs`).

Direct checkout POST (fresh idempotency key):

- `status=500`, elapsed 12.1 s
- Body: `{"error":…,"errorId":"err_9f024526"}`

Server log for that error ID:

```
[orders-store] DB persist attempt 1/2/3 warning: password authentication failed …
[checkout][err_9f024526] Error creating order: {
  message: "Failed to commit order ORD-20261120-0CE414 to database after 3 attempts: …",
  name: 'Error',
  stack: "… at persistOrderToDb (…orders-store.ts…)"
}
 POST /api/checkout 500
```

This is the same failure class as production (different driver detail because the simulated retired host was reached with a deliberately invalid password; production credentials/logs are not locally accessible). No order row was created.

## 3. Permanent fix

### 3.1 Shared DB URL resolution (revised during pre-deployment audit)

> **Note:** an earlier version of this fix hardcoded the active Neon URL in source. That version was rejected by the security audit and replaced before any deployment. The description below reflects the final implementation.

New file `lib/database-url.ts`:

- **No connection string, host or password is stored in source code.** All values come from server-side environment variables (`DATABASE_URL`, legacy `"DATABASE_URL "`, and the optional explicit `NAQER_ACTIVE_DATABASE_URL`).
- `getConfiguredDatabaseUrl()` returns `null` when nothing is configured, preserving the graceful-degradation contract in the three raw `pg` pools; `resolveDatabaseUrl()` throws a visible `DatabaseConfigurationError` where a DB is required (Prisma).
- The retired `ep-withered-bread` host is **rejected explicitly**, not silently rewritten. The only permitted redirect is to an operator-configured `NAQER_ACTIVE_DATABASE_URL`, and that use is logged at runtime. Errors/logs never contain the URL or password.
- `pgSslConfig()` restores explicit Neon-compatible TLS.

Applied to every server-side pool creation site:

- `lib/prisma.ts`
- `lib/orders-store.ts`
- `lib/customer-store.ts`
- `lib/customer-hub-store.ts`

This removes the read/write asymmetry: all DB clients now use the same configured target, and the intended production target must be set in Vercel rather than baked into the code. Failures are still thrown and still produce a 500 when the authoritative database is genuinely unavailable — no success-on-failure masking, no auth bypass, no fake orders.


### 3.2 Secondary persistence defect: non-unique `OrderItem` IDs

During DB-mode verification, `prisma.order.create` was silently failing with `Unique constraint failed on the constraint: OrderItem_pkey`. `verifiedItems[].id` is `item-<product>-<variant>-<index>`, which repeats across orders.

`app/api/checkout/route.ts` now uses `` `${order.id}:${vi.id}` `` for relational `OrderItem` rows, making them unique per order. After this change, a DB-mode checkout produced both an `Order` row and its `OrderItem` row.

## 4. Verification matrix (executed checks)

| # | Check | Environment | Result |
|---|-------|-------------|--------|
| 1 | Reproduce production 500 in a real browser | `https://naqer-menu.vercel.app` (Playwright) | PASS — 500, `err_37f6d320`, no partial row |
| 2 | Capture real failing stack without deploying | Local 3101, backup data + retired DB host | PASS — `persistOrderToDb` after 3 attempts, 500 `err_9f024526` |
| 3 | Same production-shaped config after fix | Local 3101 (real browser/API POST) | PASS — 200, `ORD-20261120-D40B52`, total 2130, 1 item |
| 4 | Guest checkout, real browser | Local 3101 | PASS — 200, `ORD-20261120-F48C02` |
| 5 | Duplicate submission (same idempotency key) | Local 3101 | PASS — second POST 200, same order number; DB contains exactly **1** row for that key |
| 6 | Authenticated customer + new saved address | Local 3101 (OTP + browser) | PASS — 200, `ORD-20261120-7528B3`, `saveAddress=true`, `CustomerAddress` rows created |
| 7 | Existing customer + saved-address autofill | Local 3101 (OTP + browser) | PASS — 200, `ORD-20261120-806F70`, autofilled saved address used |
| 8 | Server-authoritative totals | DB inspection of rows from #3–#7 | PASS — subtotal 2100, delivery 30, total 2130, CASH, DELIVERY, 1 embedded item each |
| 9 | Relational `Order` + `OrderItem` persistence | Local 3100 DB mode, browser checkout `ORD-20261120-575E36` | PASS — 1 `Order` row (PENDING), 1 `OrderItem` row |
| 10 | Empty-cart validation regression | Local 3101 | PASS — 400 (expected), no order |
| 11 | Typecheck | `npx tsc --noEmit` | PASS |
| 12 | Production build | `npm run build` | PASS (after the Next.js security-nudge retry) |
| 13 | Test-data cleanup | Configured DB + local order file | PASS — 9 test orders, 4 test customers and dependent rows removed; no test phone rows remain |

Database rows checked on host `ep-soft-dawn-bdu5de43-pooler.c-8.us-east-2.aws.neon.tech`. Evidence files: `scratch/prod-checkout-repro-result.json`, `scratch/browser-matrix-result.json`, `scratch/verify-fix-db-result.json`, `scratch/dev3101-stale.log`, `scratch/dev3101-stale-fixed.log`.

The matrix above was executed against the earlier implementation (before the security revision). After the resolver was rewritten to remove the hardcoded credential, the full matrix was re-executed with the same production-shaped setup plus the explicit `NAQER_ACTIVE_DATABASE_URL` fallback: guest `ORD-20261120-A4D002`, authenticated new address `ORD-20261120-090260`, saved address `ORD-20261120-61C5CA`, empty cart 400, duplicate idempotency (1 row), and DB-mode relational `ORD-20261120-BCEEC6` with 1 `Order` + 1 `OrderItem`. All passed, and 12/12 explicit resolver checks passed. See `PRE_DEPLOYMENT_CHECKLIST.md` for the final evidence.

## 5. Outstanding work (not executed)

- **Production deployment was not performed.** There is no `.vercel` project link, no authenticated Vercel CLI, and no explicit approval to deploy or modify production. The production site therefore still serves the pre-fix build and will keep returning 500 until this diff is deployed.
- A post-deploy browser checkout on `https://naqer-menu.vercel.app` and the corresponding production DB row check remain to be run after deployment approval.
- The actual Vercel runtime log line for `err_37f6d320` could not be retrieved (Vercel logs are not exposed by the deployed app). The root cause is established from the deployed code path, the regression commit, the environment evidence, and an exact production-shaped local reproduction that yielded the same response shape and the same throwing function.

## 6. Cleanup

Deleted only verification records: order numbers `11206C`, `1C8D58`, `991CCB`, `D40B52`, `F48C02`, `7528B3`, `806F70`, `D0388E`, `575E36` (first round) and `A4D002`, `090260`, `61C5CA`, `BCEEC6` (post-audit round); customers `cust_baead716c8b621c9`, `cust_0ef5b346957096df`, `cust_8a38fe59320e41d0`, `cust_4e03b9aec043f591`, `cust_033c4cdfa3946447`, `cust_aa8f112c1c3432f0`, `cust_d200b3a1d761cdda`; their `CustomerAddress`, `CustomerFavorite`, `CustomerNotification`, `Order` and `OrderItem` rows. `data/orders/orders-store.json` was filtered back to its committed content. Final inspection returned zero orders and zero customers for all verification phone numbers. No unrelated order was modified.

## 7. Final status

FINAL STATUS: PARTIAL. See `PRE_DEPLOYMENT_CHECKLIST.md` for the final release gate — deployment is blocked pending explicit approval, Vercel access, confirmation of the intended production database, and rotation of the credential that was committed in `lib/prisma.ts` at HEAD.
