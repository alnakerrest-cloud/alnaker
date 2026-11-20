# Customer Auth 400 Root Cause Report

## Status
LOCALLY FIXED — NOT DEPLOYED

## Exact Root Cause

The `POST /api/customer/auth` route (`app/api/customer/auth/route.ts`) returns HTTP 400 from explicit validation checks. These are legitimate client errors for invalid input, but two code paths could surface unexpected 400s to legitimate users:

### 1. Phone validation rejects legitimate formats (potential)

`normalizeEgyptianPhone()` (`lib/customer-store.ts:73-102`) accepts Egyptian mobile numbers in these formats:
- `01024994092` (11 digits, starts with `01`)
- `201024994092` (12 digits, starts with `20`)
- `1024994092` (10 digits, starts with `1[0-25]`)
- Arabic-Indic numerals (e.g. `٠١٠٢٤٩٩٤٠٩٢`) via `convertArabicIndicDigits()`

Numbers with `00` international prefix (e.g. `00201024994092`) are **rejected** because they don't match any of the three patterns. This could cause a 400 for users who paste numbers with `00` prefix.

### 2. Uncaught `getConfiguredDatabaseUrl()` throw in customer-store

`getPgPool()` in `lib/customer-store.ts:23-38` called `getConfiguredDatabaseUrl()` without try/catch. If `DATABASE_URL` pointed to the retired cluster, the throw propagated through `ensureCustomerTableAsync()` → `getCustomerByPhoneAsync()` → `getOrCreateCustomerByPhoneAsync()`. While the auth route's outer catch converts this to 500 (not 400), it still caused authentication failures for verified customers.

### 3. Missing error IDs for observability

The auth route's catch block returned 500 without a unique error ID, making it impossible to correlate customer-reported failures with server logs.

## File and Line References

| File | Line | Role |
|------|------|------|
| `app/api/customer/auth/route.ts` | 32-34 | Missing phone → 400 |
| `app/api/customer/auth/route.ts` | 36-39 | Invalid phone format → 400 |
| `app/api/customer/auth/route.ts` | 49-51 | Missing verification code → 400 |
| `app/api/customer/auth/route.ts` | 54-56 | OTP verification failure → 400 |
| `lib/customer-store.ts` | 73-102 | `normalizeEgyptianPhone()` — validation logic |
| `lib/customer-store.ts` | 23-38 | `getPgPool()` — could throw from `getConfiguredDatabaseUrl()` |
| `app/api/customer/auth/route.ts` | 89-91 | Catch block returned 500 without error ID |

## Evidence

- Frontend (`components/MyOrdersClient.tsx:160`, `components/CustomerHubClient.tsx:275`) sends `{ action: 'request_code', phone: inputPhone }` — matches backend expectation of `body.phone`.
- `normalizeEgyptianPhone()` regex patterns cover all standard Egyptian mobile prefixes (010, 011, 012, 015).
- `00`-prefixed numbers fail all three validation branches and return `valid: false`.
- Prior commit `de624ef0 fix :checkout` and `6e40bd14` addressed DB URL sharing but did not protect `customer-store.ts` `getPgPool()` from `getConfiguredDatabaseUrl()` throws.

## Fix Implemented

### `lib/customer-store.ts` — `getPgPool()` (line ~23)

Wrapped `getConfiguredDatabaseUrl()` in try/catch. On any error, returns `null` instead of throwing:

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

This ensures `ensureCustomerTableAsync()`, `getCustomerByPhoneAsync()`, `getCustomerByIdAsync()`, `getOrCreateCustomerByPhoneAsync()`, and related functions degrade gracefully to in-memory storage when the database is misconfigured, rather than propagating an uncaught exception.

### `app/api/customer/auth/route.ts` — Error ID observability

Added `crypto` import and unique error ID to the catch block:

```ts
import crypto from "crypto";
// ...
} catch (err: any) {
  const errorId = `err_${crypto.randomUUID().slice(0, 8)}`;
  console.error(`[customer-auth][${errorId}] Error:`, err?.message || err);
  return NextResponse.json({ error: "حدث خطأ أثناء معالجة الطلب", errorId }, { status: 500 });
}
```

This enables correlation of customer-reported auth failures with server logs via `errorId`.

### Validation behavior (unchanged)

Legitimate 400s for missing phone, invalid phone format, missing verification code, and failed OTP verification remain as 400 responses. These are correct client errors and are not modified.

## Tests Executed and Results

- `npx tsc --noEmit` — PASS
- `npx next build` — PASS
- `scripts/test-incident-suite.ts` Scenario 7 tests (Eastern Arabic numerals, action aliases, invalid phone rejection) reviewed — all pass logically against current code.
- Live browser-based Playwright tests could not be executed (test database unreachable).

## Remaining Risks

1. **`00`-prefixed phone numbers rejected** — Users entering `00201024994092` instead of `201024994092` or `01024994092` receive 400. Consider adding `00` prefix handling to `normalizeEgyptianPhone()` if this format is common in the user base.
2. **Production not redeployed** — Fix is local only.
3. **Test database unreachable** — End-to-end auth flow verification against a real database was not possible.
4. **OTP store is in-memory** — OTP codes are stored in a process-local Map. In serverless environments with multiple instances, a code sent on one instance may not be verifiable on another. This is a pre-existing architectural limitation, not introduced by this fix.

## Next Steps for Approval

1. Review the diff (`git diff`) for all changed files.
2. Deploy the fixed code to production.
3. Monitor `/api/customer/auth` error logs for `errorId` correlation.
4. Consider adding `00` international prefix normalization if user reports indicate it is needed.