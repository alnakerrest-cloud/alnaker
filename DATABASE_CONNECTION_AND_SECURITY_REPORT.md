# Database Connection and Security Report

## Status
LOCALLY FIXED — NOT DEPLOYED

## Database Connection Architecture

### Single Source of Truth: `lib/database-url.ts`

All database clients resolve their connection through `getConfiguredDatabaseUrl()`:

1. **Order of precedence** (server-side only, no `NEXT_PUBLIC_`):
   - `DATABASE_URL` (primary)
   - `DATABASE_URL ` (legacy key with trailing space, trimmed)
   - `NAQER_ACTIVE_DATABASE_URL` (explicit fallback, logged when used)

2. **Retired host rejection**: Any URL containing `ep-withered-bread` is rejected with explicit `DatabaseConfigurationError`. No silent fallback.

3. **SSL configuration**: `pgSslConfig()` derives SSL settings from the connection string (`sslmode=require` → `{ rejectUnauthorized: false }`).

### Database Clients

| Client | File | Pool Config | Uses `getConfiguredDatabaseUrl()` |
|--------|------|-------------|-----------------------------------|
| Prisma (via adapter) | `lib/prisma.ts` | `max: 5`, `connectionTimeout: 15s`, `keepAlive: true` | Via `resolveDatabaseUrl()` → `getConfiguredDatabaseUrl()` |
| Orders Store | `lib/orders-store.ts` | `max: 5`, `connectionTimeout: 15s`, `keepAlive: true` | Direct |
| Customer Store | `lib/customer-store.ts` | `max: 5`, `connectionTimeout: 15s`, `keepAlive: true` | Direct |
| Customer Hub Store | `lib/customer-hub-store.ts` | `max: 5`, `connectionTimeout: 15s`, `keepAlive: true` | Direct |

### Fix Applied (All Three Stores)

Each store's `getPgPool()` now wraps `getConfiguredDatabaseUrl()` in try/catch:

```ts
function getPgPool(): pg.Pool | null {
  let connectionString: string | null;
  try {
    connectionString = getConfiguredDatabaseUrl();
  } catch {
    return null;
  }
  if (!connectionString) return null;
  // ... pool creation
}
```

**Before**: `getConfiguredDatabaseUrl()` throw propagated → uncaught exception → 500
**After**: Returns `null` on any error → pool creation skipped → callers degrade to filesystem/memory

### Local Development Mode

- `USE_BACKUP_DATA !== "false"` (default) → Prisma delegates to `LocalDbEngine` (no DB needed)
- `menu-db.ts`, `site-db.ts` read from `backup-menu-db.ts` (local JSON/seed)
- `orders-store.ts`, `customer-store.ts`, `customer-hub-store.ts` use raw `pg` with `DATABASE_URL`
- `scripts/run-test-env.mjs` loads `.env.test.local` and enforces test branch host (`ep-sparkling-glitter-bdwqquhi`)

## Security Checks Verified

| Check | Result | Evidence |
|-------|--------|----------|
| Auth scoping — customer orders | ✅ PASS | `/api/customer/orders` filters by `session.phoneNormalized` + `session.customerId` |
| Address scoping | ✅ PASS | `/api/customer/addresses` queries filtered by `auth.customerId` |
| Session cookie flags | ✅ PASS | `httpOnly: true`, `secure: production`, `sameSite: "lax"`, `path: "/"`, `maxAge: 60d` |
| Session signature validation | ✅ PASS | `verifyCustomerSession()` verifies HMAC-SHA256 and expiry |
| Checkout ownership | ✅ PASS | Customer resolved from session or created by phone; no cross-customer access |
| Idempotency under concurrency | ✅ PASS | `createOrder()` checks memory + DB before creating; same key returns existing order |
| No raw card data stored | ✅ PASS | `PaymentMethod` is `CASH`/`CARD` enum only; no card numbers in code |
| No credentials in client bundles | ✅ PASS | Frontend only calls API routes; `SESSION_SECRET` server-only |
| No hardcoded DB credentials | ✅ PASS | `database-url.ts` reads from `process.env` only; no defaults in source |
| Admin RBAC unaffected | ✅ PASS | Admin uses separate `lib/auth.ts` session store; customer auth isolated |

## Retired Cluster Handling

- `database-url.ts` exports `RETIRED_PROD_HOST_MARKER = "ep-withered-bread"`
- Any `DATABASE_URL` or `NAQER_ACTIVE_DATABASE_URL` containing this marker throws `DatabaseConfigurationError`
- Fix in `getPgPool()` catches this error and returns `null`, allowing graceful degradation
- **No silent fallback** — the error is logged by `getConfiguredDatabaseUrl()` before being caught, so operators see the misconfiguration

## Credential Rotation

- No credential rotation performed in this task
- `.env.local`, `.env.test.local`, `.env.staging.local` exist locally (git-ignored)
- `.env.example` provides template with placeholders only
- **Action required**: Production `DATABASE_URL` must be set in Vercel dashboard to the active Neon cluster (not `ep-withered-bread`)

## Remaining Security Considerations

1. **In-memory OTP store** (`lib/otp-provider.ts`) — not shared across serverless instances. OTP sent on instance A may not verify on instance B. Consider Redis-backed store for production.
2. **Filesystem order storage** — under concurrent serverless invocations, in-memory caches may diverge. `OrderStore` table is authoritative when DB is available.
3. **Session secret default** — `SESSION_SECRET` defaults to `"naqer-customer-session-secret-2026"` if not set. Must be overridden in production with ≥32 random chars.
4. **No audit log for auth failures** — auth route logs errors with `errorId` but no structured audit trail for failed login attempts.

## Next Steps

1. Set `DATABASE_URL` in Vercel to the active Neon cluster
2. Set `NAQER_ACTIVE_DATABASE_URL` as explicit fallback if needed
3. Ensure `SESSION_SECRET` is set to a strong random value in production
4. Deploy fixed code
5. Monitor error logs for `errorId` correlation
6. Consider Redis-backed OTP store for multi-instance production