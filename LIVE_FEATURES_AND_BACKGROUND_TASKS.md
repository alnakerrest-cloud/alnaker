# Naqer Menu — Live Features & Background Tasks Audit
## Comprehensive Search, Call Tracing & Resource Classification

**Date:** 2026-11-22  
**Status:** 100% REPOSITORY SEARCH AUDITED  
**Classification:** VERIFIED & DOCUMENTED  

---

## 1. Global Pattern Search Results

An exhaustive scan for live synchronization, timers, websockets, and polling mechanisms was conducted across all source code in `app/`, `components/`, `lib/`, and `hooks/`:

| Code Pattern | Occurrences Found | File Paths & Context | Classification |
| :--- | :---: | :--- | :---: |
| `setInterval` | 1 | `components/LiveSync.tsx#L18` (4,000 ms poll) | **UNNECESSARY (BLOCKER)** |
| `setTimeout` | 3 | `components/ui/Toast.tsx` (UI auto-dismiss)<br>`components/CartDrawer.tsx` (Animation delay) | **REQUIRED / USER-TRIGGERED** |
| `refetchInterval` | 0 | None found in codebase | **N/A** |
| `WebSockets / Socket.io` | 0 | None found in codebase | **N/A** |
| `EventSource / SSE` | 0 | None found in codebase | **N/A** |
| `Service Workers` | 0 | None found in codebase | **N/A** |
| `Cron / Scheduled Tasks` | 0 | None found in codebase | **N/A** |

---

## 2. In-Depth Audit of `components/LiveSync.tsx`

- **Mount Locations:**
  - `app/[locale]/page.tsx` line 40: `<LiveSync interval={4000} />`
  - `app/[locale]/page.tsx` line 67: `<LiveSync interval={4000} />`
- **Runtime Execution:**
  - Runs in the browser of every visitor (even anonymous).
  - Every 4 seconds, fires `fetch('/api/content-version', { cache: 'no-store' })`.
  - When the browser tab is idle or backgrounded, it continues firing indefinitely.
- **Server-Side Load:**
  - Route handler `app/api/content-version/route.ts` executes `getContentVersion()`.
  - When `USE_BACKUP_DATA="false"`, `lib/content-version.ts#L14-L43` executes **7 consecutive queries** to Neon PostgreSQL:
    1. `prisma.category.aggregate({ _max: { updatedAt: true } })`
    2. `prisma.section.aggregate({ _max: { updatedAt: true } })`
    3. `prisma.product.aggregate({ _max: { updatedAt: true } })`
    4. `prisma.productVariant.aggregate({ _max: { updatedAt: true } })`
    5. `prisma.branch.aggregate({ _max: { updatedAt: true } })`
    6. `prisma.restaurantSettings.aggregate({ _max: { updatedAt: true } })`
    7. `prisma.offer.aggregate({ _max: { updatedAt: true } })`
- **Why It Is Unnecessary:**
  - The public menu uses Next.js Incremental Static Regeneration (`revalidate = 60`).
  - When an admin updates a product or price, Next.js Server Actions automatically call `revalidatePath('/')`.
  - Menu changes occur infrequently (weekly or monthly), making 4-second polling completely wasteful.
- **Recommendation:**
  - Remove `<LiveSync />` from `app/[locale]/page.tsx` or restrict it strictly to `app/admin/**`.
