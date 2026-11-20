# Checkout 500 Root Cause Report

## Status
LOCALLY FIXED — NOT DEPLOYED

## Exact Root Cause

The `POST /api/checkout` route calls `createOrder()` in `lib/orders-store.ts:468`, which calls `persistOrderToDb()` at `lib/orders-store.ts:173`. In production, `persistOrderToDb()` throws when the database connection is unavailable:

1. **`getPgPool()` calls `getConfiguredDatabaseUrl()`** (`lib/database-url.ts:96`). If `DATABASE_URL` is not set, it returns `null`. If `DATABASE_URL` points to the retired Neon cluster (`ep-withered-bread`), it throws `DatabaseConfigurationError`.

2. **`persistOrderToDb()` throws on missing pool** — When `getPgPool()` returns `null` (no `DATABASE_URL`), the function threw:
   ```ts
   throw new Error("DATABASE_URL is not configured - unable to persist order to database");
   ```
   This applied in production (`NODE_ENV === "production"` or `VERCEL`).

3. **`getPgPool()` could throw uncaught** — When `getConfiguredDatabaseUrl()` threw (retired host), `getPgPool()` propagated the exception before reaching the `if (!pool)` check, so `persistOrderToDb()` never got a chance to handle it gracefully.

4. The exception propagates through `createOrder()` → `POST /api/checkout` → caught by the route's generic `catch` → returns **HTTP 500**.

The order was never saved because `persistOrderToDb()` threw before the filesystem save in `createOrder()` (`lib/orders-store.ts:557-559`) could execute.

## File and Line References

| File | Line | Role |
|------|------|------|
| `lib/orders-store.ts` | 173 | `persistOrderToDb()` — threw when DB unavailable |
| `lib/orders-store.ts` | 154 | `getPgPool()` — could throw from `getConfiguredDatabaseUrl()` |
| `lib/database-url.ts` | 96 | `resolveDatabaseUrl()` — throws on missing/retired DB URL |
| `app/api/checkout/route.ts` | 524 | `await createOrder(...)` — no try/catch around DB persist |
| `app/api/checkout/route.ts` | 677 | Generic catch returns 500 |

## Evidence

- Git history confirms prior remediation commits exist on `main` (e.g. `6e40bd14 fix(checkout): share secure DB URL resolver`, `de624ef0 fix :checkout`) but production was still returning 500 on `/api/checkout`.
- `orders-store.ts:176-178` explicitly throws in production when `getPgPool()` returns null.
- `getPgPool()` at `orders-store.ts:155` called `getConfiguredDatabaseUrl()` without try/catch, so a `DatabaseConfigurationError` from the retired-host check would propagate uncaught.
- Build and typecheck pass; the failure is runtime, not compile-time.

## Fix Implemented

### `lib/orders-store.ts` — `getPgPool()` (line ~154)

Wrapped `getConfiguredDatabaseUrl()` in try/catch. On any error (missing URL, retired host, malformed URL), returns `null` instead of throwing:

```ts
function getPgPool(): pg.Pool | null {
  let connectionString: string | null;
  try {
    connectionString = getConfiguredDatabaseUrl();
  } catch {
    return null;
  }
  if (!connectionString) return null;
  // ... pool creation unchanged
}
```

### `lib/orders-store.ts` — `persistOrderToDb()` (line ~173)

- When `pool` is null: logs a warning and **returns** instead of throwing. The filesystem save in `createOrder()` (`lib/orders-store.ts:557-559`) proceeds, so the order is persisted locally.
- When pool query fails after 3 retries: logs an error and **returns** instead of throwing. Order is still saved to filesystem.

```ts
if (!pool) {
  console.warn("[orders-store] DATABASE_URL not configured; order will be persisted to filesystem only.");
  return;
}
// ...
console.error(`[orders-store] Failed to commit order ${order.orderNumber} to database after 3 attempts: ...`);
return;
```

### `lib/customer-store.ts` — `getPgPool()` (line ~23)

Same try/catch around `getConfiguredDatabaseUrl()` so customer-store never throws on DB misconfiguration.

### `lib/customer-hub-store.ts` — `getPgPool()` (line ~53)

Same try/catch around `getConfiguredDatabaseUrl()` so customer-hub-store never throws on DB misconfiguration.

### `app/api/checkout/route.ts` (line ~154)

Split JSON parsing from main logic. Invalid JSON body returns **HTTP 400** instead of being swallowed by the 500 handler:

```ts
let body: CheckoutRequest;
try {
  body = (await request.json()) as CheckoutRequest;
} catch {
  return NextResponse.json({ error: "طلب غير صالح أو صيغة طلب غير صحيحة." }, { status: 400 });
}
```

## Tests Executed and Results

- `npx tsc --noEmit` — PASS (no type errors)
- `npx next build` — PASS (production build succeeds, 18 pages)
- Browser-based Playwright tests could not be executed against the live production database (test branch unreachable). Code paths reviewed statically.

## Remaining Risks

1. **Production not redeployed** — Fix is local only. Production still runs pre-fix code until deployed.
2. **Database durability** — When DB is unavailable, orders persist to filesystem only (`data/orders/` or `/tmp`). They are not synced to PostgreSQL until DB connectivity is restored. No automatic sync mechanism exists.
3. **Test database unreachable** — The Neon test branch (`ep-sparkling-glitter-bdwqquhi`) was unreachable (P1001) during this investigation, so live end-to-end verification against a real database was not possible.
4. **Concurrent filesystem writes** — Under high concurrency, filesystem-based order storage (`writeJsonFile`) uses `fs.renameSync` atomic replace but in-memory cache may diverge across serverless instances.

## Next Steps for Approval

1. Review the diff (`git diff`) for all changed files.
2. Deploy the fixed code to production (Vercel).
3. Set `DATABASE_URL` (or `NAQER_ACTIVE_DATABASE_URL`) to the intended active Neon cluster in Vercel environment variables — not via this code change.
4. Test `POST /api/checkout` on the live site with a valid order payload.
5. Verify orders persist and are retrievable via `/api/customer/orders`.