# Critical Pre-Deployment Review

## Date
2026-11-20

## Status
**BLOCKED — DATA LOSS OR FALSE SUCCESS RISK**

---

## 1. Filesystem Fallback Investigation

### Code References

| Component | File:Line | Role |
|-----------|-----------|------|
| `persistOrderToDb()` | `lib/orders-store.ts:173` | Persists order to PostgreSQL `OrderStore` table |
| `createOrder()` | `lib/orders-store.ts:468` | Orchestrates idempotency check → DB persist → filesystem save |
| `loadOrders()` / `saveOrders()` | `lib/orders-store.ts:297-302` | Reads/writes `orders-store.json` to `data/orders/` or `/tmp/naqer-orders/` |
| `getPgPool()` | `lib/orders-store.ts:154` | Creates raw `pg.Pool` via `getConfiguredDatabaseUrl()` |
| Order retrieval (local) | `lib/orders-store.ts:616-709` | `getOrderByNumberAsync()`, `getOrderByIdAsync()`, `getOrderByVerificationAsync()` |
| Order retrieval (customer) | `app/api/customer/orders/route.ts:42` | `getOrdersByCustomerPhoneAsync()` |
| Admin order list | `app/admin/(shell)/orders/page.tsx` | Reads via `listOrdersAsync()` |
| Customer hub | `app/api/customer/hub/route.ts:56` | `getOrdersByCustomerPhoneAsync()` |
| Prisma sync | `app/api/checkout/route.ts:588` | `prisma.order.create()` (wrapped in try/catch, non-fatal) |

### Answers to Critical Questions

**1. Does checkout return success when Neon persistence fails?**

**No (after current revert).** `createOrder()` calls `await persistOrderToDb(newOrder)` at `lib/orders-store.ts:554`. If the database is unavailable, `persistOrderToDb()` throws:
- If `getPgPool()` returns `null` (no DB URL or config error): throws `"DATABASE_URL is not configured - unable to persist order to database"` (production only)
- If pool exists but query fails after 3 retries: throws `"Failed to commit order ... to database after 3 attempts"`

This propagates through `createOrder()` → `POST /api/checkout` → caught by the route's catch block at `app/api/checkout/route.ts:683` → returns HTTP 500 with `errorId`. The filesystem save at `lib/orders-store.ts:557-559` never executes because `persistOrderToDb()` throws first.

**2. Is the order saved only to local filesystem in that situation?**

**No.** Because `persistOrderToDb()` throws before the filesystem save, the order is not saved anywhere. `createOrder()` does not catch the error — it propagates to the checkout route.

**3. Is filesystem storage durable and shared across Vercel serverless instances?**

**No.** Filesystem storage has two modes:
- Local: `data/orders/orders-store.json` (writable on local dev, read-only on Vercel)
- Serverless: `/tmp/naqer-orders/orders-store.json` (writable on Vercel, but ephemeral per-instance)

On Vercel serverless:
- `/tmp` is per-instance and cleared on cold start, redeployment, or instance recycling.
- `data/orders/` is part of the deployment bundle (read-only).
- In-memory cache (`globalForOrders.__cachedOrders`) is per-instance.

**Conclusion**: Filesystem storage is **NOT durable** across serverless instances or deployments.

**4. Can an order accepted by checkout disappear after an instance restart or deployment?**

**Not currently (after revert)**, because checkout does not accept orders when DB is unavailable — it returns 500. However, if the original (pre-fix) code path were used where `persistOrderToDb()` silently returned, orders saved only to `/tmp` would disappear on instance restart. The current code prevents this by throwing.

**5. Can the customer see an order that the admin dashboard cannot see?**

**Partially.** The customer order history (`/api/customer/orders`) and admin dashboard (`/admin/orders`) both read from the same sources:
1. In-memory cache (`globalForOrders.__cachedOrders`)
2. Filesystem (`data/orders/orders-store.json` or `/tmp/naqer-orders/`)
3. Database (if available, via `getOrdersByCustomerPhoneAsync` / `listOrdersAsync`)

If an order is saved to the filesystem on instance A but the admin dashboard is served from instance B, the admin may not see it until DB sync occurs. `listOrdersAsync()` at `lib/orders-store.ts:1003` attempts to sync from DB first, but if DB is down, it falls back to local cache.

**6. Can retries create duplicate orders?**

**Yes, potentially.** `createOrder()` at `lib/orders-store.ts:468` checks idempotency by:
1. In-memory: `orders.find(o => o.idempotencyKey === params.idempotencyKey)` — only works within the same instance
2. DB: `SELECT "data" FROM "OrderStore" WHERE "data"->>'idempotencyKey' = $1` — works across instances if DB is available

If DB is unavailable, idempotency relies on in-memory cache, which is per-instance. A retry on a different instance would create a duplicate order. The idempotency key is generated client-side (`CheckoutModal.tsx:270`) as `'checkout-' + Date.now() + '-' + Math.random()`, so retries from the same client use the same key, but across different instances the check fails.

**7. Is there a reliable reconciliation mechanism?**

**No.** There is no background reconciliation job or automatic sync. Orders saved to filesystem (when DB is down) are never automatically pushed to PostgreSQL when DB becomes available. The only sync is:
- `listOrdersAsync()` reads from DB and merges into local cache
- `getOrderByNumberAsync()` reads from DB if not in local cache

But these are read-path syncs, not write-path reconciliation. Orders written only to filesystem are never pushed back to DB.

**8. Does the API distinguish database-persisted orders from filesystem-only orders?**

**No.** The `OrderRecord` interface (`lib/orders-store.ts:67-121`) has no field tracking persistence method. All orders look identical regardless of whether they were saved to DB, filesystem, or both.

---

## 2. Required Order Acceptance Guarantee

**Current guarantee (after revert):** Checkout returns 200 **only** when `persistOrderToDb()` succeeds (DB persist confirmed). If DB is unavailable, checkout returns 500. Orders are never saved to ephemeral storage alone.

**Assessment:** This satisfies the requirement — no false success. However, the 500 response is generic and may not clearly communicate the issue to the user or operator.

**Recommendation:** Consider returning HTTP 503 (Service Unavailable) with a specific message when the database is unreachable, to distinguish infrastructure failure from application error. This is a UX improvement, not a storage architecture change.

---

## 3. Customer Authentication Review

### Code Paths

| Component | File:Line | Role |
|-----------|-----------|------|
| Auth route | `app/api/customer/auth/route.ts:14-93` | POST handler |
| Phone validation | `lib/customer-store.ts:73-102` | `normalizeEgyptianPhone()` |
| OTP provider | `lib/otp-provider.ts:34-87` | `DefaultLocalOtpProvider` |
| Customer store (DB) | `lib/customer-store.ts:145-256` | `getCustomerByPhoneAsync()`, `getOrCreateCustomerByPhoneAsync()` |
| Session signing | `lib/customer-session.ts:26-32` | `signCustomerSession()` |
| Frontend caller | `components/MyOrdersClient.tsx:157-163` | `handleRequestCode()` |
| Frontend caller | `components/CustomerHubClient.tsx:272-278` | `handleRequestLoginOtp()` |

### Root Cause Analysis

The auth route returns 400 from **four explicit validation checks** (not from database errors):

1. `lib/orders-store.ts:32-34` (auth route line 32-34): Missing/empty phone → 400 `"رقم الهاتف مطلوب"`
2. `app/api/customer/auth/route.ts:36-39`: Invalid phone format → 400 with validation error
3. `app/api/customer/auth/route.ts:49-51`: Missing verification code (verify action) → 400 `"رمز التحقق مطلوب"`
4. `app/api/customer/auth/route.ts:54-56`: OTP verification failure → 400 with OTP error

**Database errors do NOT cause 400.** The outer catch block at `app/api/customer/auth/route.ts:89-92` returns 500 for any uncaught exception, including database errors. After my `getPgPool()` fix in `lib/customer-store.ts`, `getConfiguredDatabaseUrl()` errors are caught and return `null`, allowing `getOrCreateCustomerByPhoneAsync()` to fall back to in-memory storage.

### Does the fix address the auth 400?

**Partially.** The `getPgPool()` fix prevents database configuration errors from crashing the auth flow, but the 400s are primarily from phone validation. The actual root cause of the reported production 400 is likely:

- Users entering phone numbers in formats that `normalizeEgyptianPhone()` rejects (e.g., `00201024994092` with `00` prefix, or numbers with spaces/dashes that aren't fully cleaned)
- Frontend sending empty `inputPhone` (no client-side validation before fetch)

**The `getPgPool()` fix does NOT directly fix the 400.** It fixes a potential 500 caused by database misconfiguration, not the 400.

### Test Cases (Static Analysis)

| Test Case | Expected | Code Path |
|-----------|----------|-----------|
| Valid new phone `01024994092` | 200 (OTP sent) | `normalizeEgyptianPhone()` → valid → `sendOtp()` |
| Existing phone `01024994092` | 200 (OTP sent) | Same path; DB lookup happens at verify time |
| Arabic numerals `٠١٠٢٤٩٩٤٠٩٢` | 200 (OTP sent) | `convertArabicIndicDigits()` → `01024994092` → valid |
| Invalid phone `12345` | 400 | `normalizeEgyptianPhone()` → invalid |
| Missing phone | 400 | `!rawPhone` check |
| Missing code (verify) | 400 | `!rawCode` check |
| Wrong OTP code | 400 | `verifyOtp()` → hash mismatch |
| DB unavailable | 200 (OTP sent) / 500 (verify) | `getPgPool()` returns null; auth falls back to memory for sendOtp; verify creates customer in memory |
| Existing customer with profile | 200 (verify) | `getOrCreateCustomerByPhoneAsync()` → `getCustomerByPhoneAsync()` → memory or DB |

---

## 4. Database Error Handling Review

### Modified `getPgPool()` Implementations

All three stores (`orders-store.ts:154`, `customer-store.ts:23`, `customer-hub-store.ts:53`) now wrap `getConfiguredDatabaseUrl()` in try/catch and return `null` on any error.

### Behavior Analysis

| Scenario | `getConfiguredDatabaseUrl()` | `getPgPool()` | Caller Behavior |
|----------|------------------------------|---------------|-----------------|
| No `DATABASE_URL` set | Returns `null` | Returns `null` | Caller degrades to filesystem/memory |
| `DATABASE_URL` points to retired cluster | Throws `DatabaseConfigurationError` | Returns `null` (caught) | Caller degrades to filesystem/memory |
| `DATABASE_URL` set but DB unreachable | Returns URL | Creates pool (no connection yet) | `pool.query()` fails at runtime → caught by caller's try/catch or retry logic |
| `DATABASE_URL` valid and DB reachable | Returns URL | Creates pool | Normal operation |

### Error Swallowing Assessment

**`getPgPool()` itself does not swallow errors silently.** The error from `getConfiguredDatabaseUrl()` is logged by `getConfiguredDatabaseUrl()` itself before being caught. The `catch` block in `getPgPool()` simply returns `null` without additional logging, but the upstream function already logged the warning/error.

**However**, the caller receives `null` and must handle it. In the current code:
- `persistOrderToDb()`: throws in production (after revert) — **does not swallow**
- `getCustomerByPhoneAsync()`: falls back to memory — **does not swallow** (returns null from DB path, then memory fallback)
- `getCustomerAddressesAsync()`: falls back to memory array — **does not swallow**
- `getMenuSettingsAsync()`: falls back to `getMenuSettings()` (file-based) — **does not swallow**

**All raw PostgreSQL clients use `getConfiguredDatabaseUrl()`** — verified by grep. No client reads `DATABASE_URL` directly except through `getConfiguredDatabaseUrl()` or `resolveDatabaseUrl()` (which calls `getConfiguredDatabaseUrl()`).

**No client can silently connect to a different database.** `getConfiguredDatabaseUrl()` enforces a single resolution path with explicit retired-host rejection.

### Distinguishability of Infrastructure vs Validation Errors

| Error Type | HTTP Status | Source |
|------------|-------------|--------|
| Missing phone | 400 | `app/api/customer/auth/route.ts:32` |
| Invalid phone format | 400 | `app/api/customer/auth/route.ts:36` |
| Missing verification code | 400 | `app/api/customer/auth/route.ts:49` |
| OTP verification failure | 400 | `app/api/customer/auth/route.ts:54` |
| Empty cart | 400 | `app/api/checkout/route.ts:242` |
| Invalid product/variant | 400 | `app/api/checkout/route.ts:337-341` |
| Missing branch | 400 | `app/api/checkout/route.ts:258` |
| Invalid JSON body | 400 | `app/api/checkout/route.ts:156-160` |
| DB unavailable (checkout) | 500 | `app/api/checkout/route.ts:683` (via `persistOrderToDb()` throw) |
| DB unavailable (auth) | 500 (if uncaught) or graceful degradation | `app/api/customer/auth/route.ts:89` |
| Unexpected error | 500 with `errorId` | Both auth and checkout catch blocks |

**Infrastructure failures remain distinguishable from validation errors** — validation errors are 400, infrastructure errors are 500 with `errorId`.

---

## 5. Test Evidence and Gaps

### Tests Executed

| Test | Command | Result |
|------|---------|--------|
| TypeScript typecheck | `npx tsc --noEmit` | ✅ PASS (no errors) |
| Production build | `npx next build` | ✅ PASS (18 pages compiled) |
| Git diff review | `git diff` | ✅ 5 files, 29 insertions, 6 deletions |

### Tests NOT Executed (Gaps)

| Test | Reason |
|------|--------|
| Browser-based Playwright tests | Neon test branch unreachable (P1001) |
| Live checkout flow | No running database |
| Concurrent duplicate submissions | No running database |
| Admin order visibility | No running database |
| Customer order history visibility | No running database |
| Database unavailable scenario | Requires DB to be stopped (not possible against cloud DB) |
| Invalid database URL scenario | Requires env var change (not allowed per safety rules) |

**A successful build is NOT evidence of successful checkout.** All verification is static code analysis + typecheck + build. No live end-to-end testing was possible.

---

## 6. Required Changes Before Release

### Critical (Must Fix Before Deploy)

1. **Database URL must be set in Vercel** — `DATABASE_URL` must point to the active Neon cluster (NOT `ep-withered-bread`). Without this, checkout will return 500 for every order (after revert, `persistOrderToDb()` throws when DB is unavailable).

2. **Session secret must be set** — `SESSION_SECRET` must be ≥32 random chars in Vercel. Default is insecure.

### Recommended (Should Fix Before Deploy)

3. **Return 503 instead of 500 for DB unavailability** — Currently checkout returns generic 500 when DB is down. A 503 with a clear message would better communicate the issue. This is a UX improvement, not a storage change.

4. **Add client-side phone validation** — Frontend (`MyOrdersClient.tsx`, `CustomerHubClient.tsx`) sends phone to API without pre-validation. Adding client-side validation would prevent unnecessary 400s.

### Not Addressed (Out of Scope)

5. **In-memory OTP store** — Not shared across serverless instances. Requires Redis-backed store for production reliability.
6. **No automatic DB reconciliation** — Orders saved to filesystem when DB is down are never synced to DB. Requires reconciliation job.
7. **No auth failure audit log** — Cannot track brute-force attempts.
8. **`00`-prefixed phones rejected** — Users pasting `002010...` receive 400.

---

## 7. Final Decision

### Can the current implementation falsely report successful checkout?

**No (after revert).** `persistOrderToDb()` throws when the database is unavailable, and `createOrder()` does not catch the error. The checkout route returns HTTP 500. The order is not saved to filesystem or any other ephemeral storage.

### Is the authentication 400 genuinely fixed?

**The 400 itself is not "fixed" — it is legitimate validation.** The `getPgPool()` fix prevents database configuration errors from crashing the auth flow (which would have been a 500, not a 400). The actual 400 root cause is phone validation rejecting certain formats. The fix does not change phone validation behavior.

### Is the filesystem fallback safe?

**No.** Filesystem storage (`/tmp` on Vercel) is ephemeral and per-instance. It is NOT durable across restarts, deployments, or instance recycling. The current code (after revert) does NOT use filesystem as a fallback for failed DB persistence — it throws and returns 500. This is the correct behavior.

---

## Final Status

**BLOCKED — DATA LOSS OR FALSE SUCCESS RISK**

**Reason:** While the code no longer falsely reports success (after revert), the following risks remain:
1. Production database URL may still point to the retired cluster → all checkouts return 500 until fixed
2. No live end-to-end testing was possible (test DB unreachable)
3. No browser-based verification of auth or checkout flows
4. Filesystem fallback is ephemeral and could cause data loss if re-enabled

**Required before release:**
- Set `DATABASE_URL` to active Neon cluster in Vercel
- Set `SESSION_SECRET` to strong random value in Vercel
- Deploy and verify live checkout returns 200 with valid order
- Run browser-based Playwright tests against production

**Do not push, deploy, or modify production configuration. Stop after local fixes and verified tests, then present the evidence and exact next steps for approval.**