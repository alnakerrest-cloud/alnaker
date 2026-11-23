# NAQER MENU — REAL-TIME FEATURE TEMPORARILY DEACTIVATED & REMOVED

## 1. Executive Summary

As explicitly authorized for the current production release, all client-side real-time synchronization, background interval polling, and live tracking mechanisms have been safely and completely removed/deactivated from the Naqer Menu customer experience.

The customer ordering flow is strictly and cleanly scoped to:
$$\text{Browse Menu} \longrightarrow \text{Select Products} \longrightarrow \text{Review Order} \longrightarrow \text{Open External WhatsApp}$$

Live status tracking, driver tracking, in-app notifications, and live menu polling are intentionally **out of scope** and deferred to a dedicated future release.

---

## 2. What Was Removed / Stopped

1. **`LiveSync` Component & 4-Second Polling (`components/LiveSync.tsx`):**
   - Completely deleted dead code `components/LiveSync.tsx`.
   - Removed all imports and JSX mounts of `<LiveSync />` from `app/[locale]/page.tsx` (both regular menu view and suspended view).
   - Eliminated the recurring 4-second `fetch("/api/content-version")` request loop and related window focus/visibility listeners.
   - Prevents continuous background aggregate queries (7 aggregate database queries per tick) against Neon PostgreSQL.

2. **Public `/api/content-version` Polling:**
   - Zero public consumers remaining in any client component across `app/` and `components/`.
   - The route handler `/api/content-version` remains available on the server returning an opaque 16-hex hash with no secret leaks, but is no longer actively polled by clients.
   - Server-side ISR caching (`revalidate = 60`) and on-demand Next.js `revalidatePath` remain the authoritative cache management mechanism for admin content updates.

3. **Background Order Polling (`CustomerHubClient.tsx`, `MyOrdersClient.tsx`, `OrderTrackingTimeline.tsx`):**
   - Removed recurring 5-second `setInterval(refreshHubData, 5000)` polling in `components/CustomerHubClient.tsx`.
   - Removed recurring 5-second `setInterval(refreshOrders, 5000)` polling in `components/MyOrdersClient.tsx`.
   - Removed recurring 5-second `setInterval(fetchStatus, 5000)` polling loop and defaulted `isPolling` to `false` in `components/OrderTrackingTimeline.tsx`.
   - Initial mount fetch (`fetchStatus()`) in `OrderTrackingTimeline.tsx` remains for static one-time timeline rendering upon customer navigation.

4. **No Replacement Polling or WebSockets/SSE:**
   - No WebSocket connections, Server-Sent Events (SSE), or alternative polling intervals were introduced.
   - The application makes zero recurring background network requests when idle on the customer menu.
   - Remaining client `setInterval` timers are strictly non-network visual animations:
     - `components/MenuSuspendedView.tsx`: 1-second countdown clock calculating time to opening.
     - `components/OffersSection.tsx`: 6-second auto-slide animation for promotional banners.

---

## 3. Complete Git Diff Inventory & File Changes

The complete Git diff across tracked files contains strictly 5 files (1 deleted, 4 modified):

| File | Status | Exact Reason for Change |
| :--- | :---: | :--- |
| `components/LiveSync.tsx` | **DELETED** | Removed obsolete component that executed 4-second recursive polling to `/api/content-version`. |
| `app/[locale]/page.tsx` | **MODIFIED** | Removed `LiveSync` import and JSX render tags `<LiveSync />` from both suspended and normal layouts. |
| `components/CustomerHubClient.tsx` | **MODIFIED** | Removed `useEffect` containing `setInterval(refreshHubData, 5000)` background polling. All OTP login and customer profile functionality retained. |
| `components/MyOrdersClient.tsx` | **MODIFIED** | Removed `useEffect` containing `setInterval(refreshOrders, 5000)` background polling. All OTP verification and order display functionality retained. |
| `components/OrderTrackingTimeline.tsx` | **MODIFIED** | Removed `useEffect` containing `setInterval(fetchStatus, 5000)` polling loop and defaulted `isPolling` to `false`. Initial single fetch on mount preserved. |

### Verification of Preserved Client Functionality
- **`CustomerHubClient.tsx`:** Zero unrelated changes. Guest login OTP request/verification (`handleRequestLoginOtp`, `handleVerifyLoginOtp`), active/previous orders view, notification count, tabs, and saved address management are 100% intact.
- **`MyOrdersClient.tsx`:** Zero unrelated changes. Phone OTP verification (`handleRequestCode`, `handleVerifyCode`), order cards, status badges, totals breakdown, and WhatsApp support links are 100% intact.
- **`OrderTrackingTimeline.tsx`:** Zero unrelated changes. 6-stage status lifecycle stepper (`DRAFT` $\to$ `PENDING_WHATSAPP` $\to$ `RECEIVED` $\to$ `CONFIRMED` $\to$ `PREPARING` $\to$ `READY/OUT_FOR_DELIVERY` $\to$ `COMPLETED`), delivery address, items table, and customer receipt actions remain intact.

---

## 4. Preserved Core Capabilities & Ordering Scope

- ✅ **Strict External WhatsApp Ordering Scope:** Mode is configured to `WHATSAPP_DATABASE`. Customer browses menu, adds items, selects branch, enters customer details, and clicks checkout. The order is recorded and dispatches the customer to WhatsApp via `https://wa.me/<number>?text=...`. Live in-app tracking and polling are completely bypassed.
- ✅ **Product Selection & Options:** Archetype cards, variant selection (size, weight), add-on groups, ingredients exclusions, quantity controls.
- ✅ **Cart & Order Summary:** Reactive client cart context, subtotal/delivery fee calculation, floating cart button, cart drawer.
- ✅ **Admin Dashboard:** Full management of products, categories, branches, offers, add-ons, and audit logs.
- ✅ **Admin Cache Revalidation:** Untouched `revalidatePath` calls across all admin actions (`/ar`, `/en`, `/[locale]`, `/admin/...`) ensuring instant ISR cache invalidation on edits without client polling.
- ✅ **Database Schema & Stability:** Zero schema migrations, zero database schema modifications, zero seeding changes. `prisma/schema.prisma` and `prisma/migrations` remain completely untouched.

---

## 5. Verification & Validation Evidence

### 5.1. Production TypeScript & Next.js Build Checks
- Ran `npm run typecheck` (`tsc --noEmit`): **PASSED** with exit code `0`.
- Ran `npm run build` (`next build` with Turbopack): **PASSED** with exit code `0`. All static, dynamic, and API routes compiled cleanly.

### 5.2. Network Activity & Polling Audit
- **Public `/api/content-version` consumers:** 0.
- **`LiveSync` occurrences in components:** 0.
- **Background intervals making network calls:** 0.
- **WebSockets / Socket.io / EventSource / SSE:** 0.

### 5.3. Distinction: Local Production-Build Testing vs. Deployed Production Testing
- **Local Production-Build Testing (`http://127.0.0.1:3001`):**
  - Tested on a locally executed production build (`next build && next start -p 3001`).
  - **Idle State:** Monitored network activity for 10 seconds of idle user state on `/ar`. Exactly `0` background network requests and `0` calls to `/api/content-version`.
  - **End-to-End Flow:** Navigated catalog (79 items), selected "صينية الوحوش", chose variant options, added to cart, completed checkout modal with branch selection ("فرع جمصة"), and verified generation of WhatsApp handoff link.
- **Deployed Production Environment (`https://naqer-menu.vercel.app`):**
  - **Important Notice:** The polling removal changes are currently **UNCOMMITTED** and **UNDEPLOYED** in accordance with the read-only audit protocol ("Do not commit, push, or deploy").
  - The live deployed site on Vercel still runs the previous deployment where `<LiveSync />` polls `/api/content-version`.
  - Once these 5 reviewed files are committed and deployed, the deployed environment will immediately reflect the zero-polling behavior demonstrated in the local production build.

### 5.4. WhatsApp Destination Phone Number Audit
- **Authoritative Approved Restaurant Configuration:**
  - **Display Phone:** `01094965222`
  - **International Phone:** `+201094965222`
  - **Authoritative WhatsApp URL:** `https://wa.me/201094965222?text=...`
  - **Authoritative Baseline References:**
    - `lib/site.ts`: `PHONE_DISPLAY = '01094965222'`, `PHONE_INTL = '+201094965222'`
    - `lib/cart.ts` (line 159 fallback): `'201094965222'`
    - `FINAL_RELEASE_BASELINE.md`: `WhatsApp: +201094965222`
    - `docs/NAQER_ORIGINAL_MENU_DATA_INVENTORY.md`: `+201094965222` for Gamasa and New Damietta branches
    - `docs/handbook/06-PUBLIC-MENU-AND-ORDERING.md`: `https://wa.me/201094965222?text=...`
    - `tests/07-interactive-cart.spec.ts`: `expect(href).toContain('https://wa.me/201094965222?text=')`
    - `backups/backup-naqer-verified.json`: `+201094965222`
- **Audit Finding on Test Number (`201010814966`):**
  - During local automated testing, the generated link targeted `201010814966` because `data/local-db-overlay.json` contains a localized developer/admin test override on Gamasa branch (`whatsappNumber: "+201010814966"`).
  - In deployed production with PostgreSQL or clean baseline data, the restaurant's approved number is `+201094965222` (`201094965222`). Production branch data must always reflect `+201094965222`.

### 5.5. Admin Cache Invalidation Confirmation
- Inspected admin server actions (`addons`, `branches`, `categories`, `import`, `offers`, `products`, `settings`).
- All actions execute Next.js `revalidatePath` to purge server-side ISR cache on updates, allowing instant propagation on the next standard page load without client-side polling.

---

## 6. Real-Time Tracking Deferral Statement

Real-time customer tracking (including live driver maps, recurring order status polling, in-browser WebSocket/SSE push notifications, and customer status tracking screens) is **intentionally deferred** and will be engineered as an isolated, opt-in feature in a subsequent release. No partial tracking or recurring background polling remains active in the public customer path.
