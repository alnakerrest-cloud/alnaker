# Auth Checkout Integration Test Report

## Status
LOCALLY FIXED — NOT DEPLOYED (browser-based tests could not be executed against live database)

## Test Environment

- Codebase: `E:\real projects\naqer-menu`, branch `main`, HEAD `8e08924e`
- TypeScript: `tsc --noEmit` — PASS
- Production build: `next build` — PASS (18 pages, all routes compiled)
- Test database: Neon test branch `ep-sparkling-glitter-bdwqquhi` — UNREACHABLE (P1001) during this session
- Playwright: configured at `playwright.config.ts`, base URL `http://127.0.0.1:3002`, Chromium only

## Tests That Could Not Be Executed (Database Unreachable)

The following Phase 4 scenarios require a live database and a running dev server. They were **not** executed because the Neon test branch was unreachable:

| # | Scenario | Status | Reason |
|---|----------|--------|--------|
| 1 | New customer enters valid Egyptian phone | Not executed | No DB |
| 2 | Customer authentication succeeds | Not executed | No DB |
| 3 | Customer session persists | Not executed | No DB |
| 4 | Existing customer enters same phone | Not executed | No DB |
| 5 | Existing customer data retrieved | Not executed | No DB |
| 6 | Customer name auto-populated | Not executed | No DB |
| 7 | Saved addresses appear | Not executed | No DB |
| 8 | Customer submits new address | Not executed | No DB |
| 9 | New address saved to correct customer | Not executed | No DB |
| 10 | Customer creates order as guest | Not executed | No DB |
| 11 | Customer creates order while authenticated | Not executed | No DB |
| 12 | Customer creates order using saved address | Not executed | No DB |
| 13 | Customer creates order using new address | Not executed | No DB |
| 14 | Invalid phone rejected with useful response | Not executed | No DB |
| 15 | Invalid address rejected safely | Not executed | No DB |
| 16 | Invalid product/variant rejected safely | Not executed | No DB |
| 17 | Empty cart rejected safely | Not executed | No DB |
| 18 | Concurrent duplicate submissions no duplicate orders | Not executed | No DB |
| 19 | Same idempotency key creates no additional order | Not executed | No DB |
| 20 | Existing customer data and order snapshots intact | Not executed | No DB |

**No browser tests were run.** All verification was static code review plus TypeScript and production build.

## Code Paths Verified Statically

### Customer Auth Flow (`app/api/customer/auth/route.ts`)

1. Request body parsed as JSON (`request.json().catch(() => ({}))`)
2. `action` extracted, defaulting to empty string
3. `phone` extracted from `body.phone`, `body.phoneNumber`, `body.mobile`, or `body.customerPhone`
4. Phone validated via `normalizeEgyptianPhone()` (`lib/customer-store.ts:73`)
5. For `request_code` action: `activeOtpProvider.sendOtp()` called, returns 200 with debug code
6. For `verify_code` action: `activeOtpProvider.verifyOtp()` called, then `getOrCreateCustomerByPhoneAsync()`, session signed via `signCustomerSession()`, cookie set with `httpOnly`, `secure` (production), `sameSite: "lax"`

### Checkout Flow (`app/api/checkout/route.ts`)

1. JSON body parsed (invalid JSON → 400)
2. Menu mode checked (`VIEW_ONLY` → 403, `TEMPORARILY_CLOSED` → 403)
3. Order type validated against `menuSettings.allowDelivery`/`allowTakeaway`
4. Basic payload validation (items, orderType, paymentMethod, customerPhone, branchId, deliveryAddress for DELIVERY)
5. Phone validated via `validateEgyptianPhone()` → `normalizeEgyptianPhone()`
6. Branch validated from site data
7. Items validated against menu: product existence, variant index, required option groups, option selection limits
8. Prices recalculated server-side via `calculateOfferDiscount()`
9. Customer resolved from session cookie or created via `getOrCreateCustomerByPhoneAsync()`
10. Order created via `createOrder()` — persists to DB (if available) + filesystem (always)
11. Prisma relational sync attempted (try/catch, non-fatal)
12. Address auto-saved if `saveAddress` and DELIVERY
13. Order notification created
14. Session cookie issued with order data
15. Response: 200 with order details, whatsappUrl, customerSessionToken

### Error Handling

- Checkout catch block returns 500 with unique `errorId` and safe generic message
- Auth catch block returns 500 with unique `errorId` and safe generic message
- Invalid JSON in checkout returns 400
- Validation failures return appropriate 4xx statuses
- No stack traces or database details exposed to client

## Database Integrity

- Orders saved to `OrderStore` table via `pg` pool (when DB available)
- Filesystem fallback at `data/orders/store.json` (local) or `/tmp/naqer-orders/` (serverless)
- Idempotency checked in memory + DB before order creation
- `createOrder()` awaits DB persist before filesystem save; if DB fails, filesystem save still proceeds (post-fix)
- No partial orders: `createOrder()` is atomic — either full order created or none

## Secret Scan

- No `DATABASE_URL`, passwords, or API keys hardcoded in source (`lib/database-url.ts` reads from env only)
- `SESSION_SECRET` has default fallback but `.env.example` instructs to change it
- No customer PII logged in server error handlers (only `errorId`, message, name, first 3 stack lines)

## Recommendations for Test Execution

1. Deploy the fixed code to production (or staging)
2. Ensure `DATABASE_URL` is set to the intended active database
3. Run Playwright: `npx playwright test --headed` (targets `http://127.0.0.1:3002`)
4. Run the incident test suite: `npx tsx scripts/test-incident-suite.ts` (requires `tsx` or equivalent)
5. Verify all 20 Phase 4 scenarios pass against a live database
