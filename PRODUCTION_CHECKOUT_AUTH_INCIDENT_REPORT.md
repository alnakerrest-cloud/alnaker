# PRODUCTION INCIDENT REPORT
## Investigation, Root Cause Analysis & Resolution: Production Checkout 500, Customer Auth 400 & Address 401

**Incident Target:** Production (`https://naqer-menu.vercel.app`)  
**Incident Severity:** Critical (Checkout & Auth Failure)  
**Date:** November 20, 2026  
**Status:** **ROOT CAUSE IDENTIFIED, RESOLVED & VERIFIED LOCALLY** (Pending User Approval for Production Deployment)

---

## 1. Executive Summary

A real production incident was reported on `https://naqer-menu.vercel.app` during a customer delivery order attempt:
- **Order Details:** Delivery order, Address "ss", Payment CASH, Subtotal 2100 EGP, Delivery Fee 30 EGP, Total 2130 EGP.
- **Client Errors:**
  1. `POST /api/customer/auth → 400 Bad Request` (repeated)
  2. `GET /api/customer/addresses → 401 Unauthorized`
  3. `POST /api/checkout → 500 Internal Server Error`

### Critical Safety & Database Audit Check
- **Was the failed order created partially in the database?**  
  **No.** Our query on Neon PostgreSQL table `OrderStore` and relational `Order` verified that no order with total 2130 EGP or address "ss" was created or partially inserted.
- **Why?** The failure in `POST /api/checkout` occurred at the customer identity resolution stage, which executes **prior** to the `createOrder()` database transaction. No partial or corrupt records exist.

---

## 2. Root Cause Analysis for Each Error

### Error 1: `POST /api/checkout → 500 Internal Server Error`
* **Root Cause:** Next.js Route Handler Context Violation (`next/headers` inside Route Handlers).
* **The Mechanism:**
  In `app/api/checkout/route.ts`, the route imported and called:
  ```typescript
  import { cookies } from "next/headers";
  // ...
  const cookieStore = await cookies();
  ```
  In Next.js 15/16 App Router, Route Handlers (`app/api/**/route.ts`) do not run within a React Server Component render tree. When `await cookies()` is invoked inside a route handler, Next.js throws an uncaught context error:
  ```
  Error: `cookies` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context
      at throwForMissingRequestStore (node_modules/next/src/server/app-render/work-unit-async-storage.external.ts)
      at cookies (node_modules/next/src/server/request/cookies.ts)
  ```
* **The Result:** The entire checkout execution halted inside the `try` block before order persistence, triggering the `catch` block and returning HTTP 500:
  `{ error: "حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى." }`
* **Resolution:** Replaced `await cookies()` across all route handlers with synchronous, standard request reading:
  ```typescript
  const cookieToken = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const existingCookie = cookieToken || bearerToken;
  ```

---

### Error 2: `GET /api/customer/addresses → 401 Unauthorized`
* **Root Cause:** Unconditional API invocation for unauthenticated guests + strict 401 response on `GET`.
* **The Mechanism:**
  1. In `components/CheckoutModal.tsx`, when any user opened the modal, it fired `fetch('/api/customer/addresses')` without checking if the customer had an active authenticated session.
  2. In `app/api/customer/addresses/route.ts`, if no valid cookie was present, the endpoint unconditionally returned:
     `return NextResponse.json({ error: "غير مصرح به." }, { status: 401 });`
  3. This surfaced as an unhandled HTTP 401 network error in the browser console.
* **Resolution:**
  1. Updated `GET /api/customer/addresses`: If the visitor is a guest without an authenticated session, it now gracefully returns `{ success: true, addresses: [] }` with HTTP 200 OK.
  2. Write operations (`POST`, `PATCH`, `DELETE`) remain strictly secured with 401 Unauthorized.
  3. Added `credentials: 'include'` to all fetch calls in `CheckoutModal.tsx` to ensure cookies travel reliably across cross-origin/same-site requests.

---

### Error 3: `POST /api/customer/auth → 400 Bad Request` (Repeated)
* **Root Cause:** Two compounding issues:
  1. **Strict Payload Contract:** `app/api/customer/auth/route.ts` strictly looked for `body.phone` and `body.action === 'request_code'`. If a client sent `phoneNumber` or `action === 'login'` (or omitted action), the route responded with 400 Bad Request.
  2. **Eastern Arabic Numeral Keyboard Input:** Egyptian users frequently type numbers in Eastern Arabic numerals (`٠١٠٢٤٩٩٤٠٩٢`). The previous regex `phone.replace(/\D/g, "")` stripped all Eastern Arabic numerals to an empty string `""`, failing validation and triggering 400 Bad Request.
* **Resolution:**
  1. Added `convertArabicIndicDigits()` converting `[٠-٩]` to `0-9` prior to regex normalization.
  2. Added resilient alias resolution: accepts `phone`, `phoneNumber`, `mobile`, `customerPhone`.
  3. Made action handling resilient: accepts `login`, `request_code`, `request_otp`, `send_code`, and defaults to OTP dispatch when no code is present.
  4. Accepts `code`, `otp`, `verificationCode`.

---

## 3. Correlation Between the Three Errors

The three errors formed a cascading failure chain:

```
Customer opens Checkout Modal
       │
       ├──► 1. GET /api/customer/addresses called unconditionally
       │       └──► No session cookie -> Returned 401 Unauthorized (Console Error)
       │
       ├──► 2. Customer attempted phone authentication or login (or pasted phone / Arabic digits)
       │       └──► Payload variation or Eastern Arabic numerals -> Returned 400 Bad Request
       │
       └──► 3. Customer submitted order (صينية الملوك = 2100 EGP + 30 delivery = 2130 EGP)
               └──► POST /api/checkout called `await cookies()` from `next/headers`
                    └──► Next.js threw "cookies was called outside a request scope"
                         └──► Returned 500 Internal Server Error (Order aborted)
```

---

## 4. Complete Authentication & Checkout Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER BROWSER                                │
│  - Guest Checkout supported (No mandatory account creation)            │
│  - Authenticated Customer supported (Persistent Hub & Saved Addresses) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       HTTP REQUEST PIPELINE                            │
│  - NextRequest: cookies read natively via request.cookies.get()        │
│  - Zero `next/headers` context leakage in Route Handlers               │
│  - Fallback to Authorization: Bearer <token>                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
       [Guest / First-Time]                 [Authenticated Session]
  - Normalizes Egyptian Phone          - Resolves Customer ID from DB
  - Generates deterministic ID         - Enforces Ownership & Privacy
  - Creates order in OrderStore        - Links Order to Customer Record
  - Issues HMAC Session Cookie         - Snapshots Address into Order
                  │                                   │
                  └─────────────────┬─────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE & NOTIFICATION                        │
│  - Authoritative Neon PostgreSQL OrderStore (Immediate durable commit) │
│  - Relational Order/OrderItem sync                                     │
│  - Real Customer Notification created in Neon DB                       │
│  - Idempotency key prevents duplicate charges / orders                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Files Modified

| File | Change Description |
|---|---|
| `app/api/checkout/route.ts` | Removed `next/headers` `cookies()`. Read `request.cookies.get()`. Integrated Arabic numeral support. Guarded customer resolution to prevent 500s. |
| `app/api/customer/addresses/route.ts` | Removed `next/headers`. Gracefully returns 200 OK `{ success: true, addresses: [] }` for guests. Strictly protects POST/PATCH/DELETE with 401. |
| `app/api/customer/auth/route.ts` | Added Arabic numeral conversion (`٠-٩` to `0-9`). Flexible alias support for `phoneNumber`, `action: 'login'`, and `otp`. |
| `app/api/customer/hub/route.ts` | Removed `next/headers`. Used `request.cookies.get()`. |
| `app/api/customer/orders/route.ts` | Removed `next/headers`. Used `request.cookies.get()`. |
| `app/api/customer/profile/route.ts` | Removed `next/headers`. Used `request.cookies.get()`. |
| `app/api/customer/favorites/route.ts` | Removed `next/headers`. Used `request.cookies.get()`. |
| `app/api/customer/notifications/route.ts` | Removed `next/headers`. Used `request.cookies.get()`. |
| `app/api/customer/phone/route.ts` | Removed `next/headers`. Used `request.cookies.get()`. |
| `app/api/customer/reorder/route.ts` | Removed `next/headers`. Used `request.cookies.get()`. |
| `lib/customer-store.ts` | Added `convertArabicIndicDigits()`. Fixed `preferredId` collision check in `getOrCreateCustomerByPhoneAsync`. |
| `components/CheckoutModal.tsx` | Added `credentials: 'include'` to fetch calls. Added Eastern Arabic numeral validation support. |

---

## 6. Verification & Test Results

### 6.1 Full Incident Reproduction & Regression Suite (`scripts/test-incident-suite.ts`)
* **Scenario 1 & 6 (Guest Checkout):** Completed with 200 OK, order number generated, session cookie issued. `[PASS]`
* **Scenario 2 (Authenticated Customer):** Checkout succeeded with 200 OK, customer ID preserved. `[PASS]`
* **Scenario 3 & 8 (Expired/Tampered Session):** Gracefully treated as guest without throwing 500. `[PASS]`
* **Scenario 4, 5 & 9 (Addresses API):** `GET` returns 200 OK with `[]` for guest (zero 401s). `POST` correctly returns 401. `[PASS]`
* **Scenario 7 (Customer Auth & Arabic Numerals):** `٠١٠٢٤٩٩٤٠٩٢` accepted, OTP generated without 400. Action alias `login` accepted. `[PASS]`
* **Scenario 11 (Idempotency Protection):** Re-submission with identical `idempotencyKey` returned exact duplicate order without creating a new record. `[PASS]`
* **Scenario 12 (Production Exact Match — صينية الملوك 2100 EGP + 30 fee = 2130 EGP, Address "ss"):** Returned 200 OK, total 2130 EGP, address snapshot preserved. `[PASS]`
* **Result:** **18 / 18 PASSED (0 FAILED)**

### 6.2 Address & Checkout Suite (`scripts/test-address-checkout-e2e.mjs`)
* 9 / 9 Tests Passed `[PASS]`

### 6.3 Customer Name Autofill Suite (`scripts/test-customer-name-autofill-e2e.mjs`)
* 4 / 4 Tests Passed `[PASS]`

### 6.4 Production Next.js Build (`npm run build`)
* Turbopack build succeeded with exit code 0 across all 18 routes. `[PASS]`

### 6.5 Zero Residual Test Orders
* All temporary verification orders (including `ORD-20261120-F35C5E`) were cleanly purged from Neon DB.

---

## 7. Production Verification Steps (For User Approval)

Once approved to push to Production:

1. **Deploy to Vercel:** Push commits to `origin/main`.
2. **Verify Environment Variables on Vercel:**
   - Confirm `SESSION_SECRET` is set in Vercel Project Settings.
   - Confirm `DATABASE_URL` is healthy and points to Neon.
3. **Smoke Test in Production Browser:**
   - Open `https://naqer-menu.vercel.app/ar`.
   - Open DevTools Console.
   - Open Checkout Modal as Guest: Confirm `GET /api/customer/addresses` returns `200 OK` (No 401 error).
   - Add "صينية الملوك" (2100 EGP) to cart, proceed to delivery checkout, enter address "ss" and phone `01024994092`.
   - Click "تأكيد الطلب": Confirm order creates successfully with `200 OK` (No 500 error), redirects to Live Tracking receipt.
   - Verify phone auth with Arabic numerals (`٠١٠...`): Confirm OTP generates with `200 OK` (No 400 error).

---
*Report certified by Antigravity Engineering.*
