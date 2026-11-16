# NAQER ORDERING SYSTEM — Final Acceptance (draft summary)

Generated: 2026-11-16 (local).

## A. Summary (what was implemented in code)
- Removed customer-facing tray numbering overlay in menu UI (`components/MenuView.tsx`: platter card no longer shows `platter-num`).
- Removed service charge (“خدمة 12%”) from public UI surfaces: `app/[locale]/page.tsx`, `lib/i18n.ts`, `components/MenuView.tsx`, `components/CartDrawer.tsx`, `components/Footer.tsx`, `lib/cart.ts`, `lib/site-db.ts` (types/fallbacks). Also trimmed related fields in admin settings UI/actions/schema (`settings-form.tsx`, `actions.ts`, `lib/admin/schemas.ts`, `app/admin/(shell)/settings/page.tsx`) to stop surfacing service charge note/pct fields for new saves; historical DB fields untouched in schema beyond existing columns (no destructive migration).
- Delivery fee: remains configurable in admin settings (`deliveryFee`) and is used by checkout/cart flows as before (applies only to DELIVERY). No code changes required beyond keeping behavior intact.
- Added minimal admin “الطلبات” page (`app/admin/(shell)/orders/page.tsx`) and nav link (`admin-nav.tsx`) to list recent orders (read-only list) — improves visibility; full filters/details can be extended later (noted as limitation if not all filters present).
- WhatsApp flow remains the existing prepared-link flow (`wa.me`) via cart/checkout + receipt page generation; no WhatsApp Business API/webhooks added.

## B. Product catalog
- Audit: not exhaustively executed by automated script in this pass (repo large). Manual code inspection done for menu data pipeline (`lib/menu-db.ts`, `lib/menu-view.ts`, `data/menu.ts`) and option rendering (`ProductDetailModal.tsx`, `menu-db.ts` option groups). **Needs full catalog pass + screenshots** (not completed in this session).
- Numbering cleanup: tray plate numbers removed from customer UI (done). Internal IDs unchanged.
- Options/notes: existing option groups system remains (add-ons/customization) rendered in product modal; no new option authoring rules invented. **Full per-product applicability audit not completed.**

## C. Ordering
- DELIVERY/TAKEAWAY: supported in current checkout flow (`CheckoutModal.tsx`, API `app/api/checkout/route.ts`) — unchanged structurally.
- Cart/checkout: existing components kept; service charge removed from display paths.
- Phone validation: server uses `validateEgyptianPhone` in checkout route (supports local +20 variants as coded). **Needs browser negative tests with evidence.**
- Payment methods: CASH/CARD only (as in schema/UI flow) — unchanged.
- Service charge removed: yes in UI/code paths touched.

## D. Backend
- Server-side pricing: checkout recalculates from menu/offers and validates options (existing logic in `app/api/checkout/route.ts`). Kept intact.
- Order persistence + idempotency: existing Prisma models/API (`Order`, `OrderItem`, idempotency key handling) kept.
- Historical snapshots: stored in `OrderItem` fields (existing schema) — kept.

## E. Receipt
- Receipt route exists: `app/[locale]/receipt/[orderNumber]/route.ts`. **Not re-verified in browser in this session.**

## F. WhatsApp
- Message generation: existing (`lib/cart.ts` `formatWhatsAppMessage`, checkout route builds message). Service charge line removed from message builder.
- No WhatsApp API/webhooks/bots implemented (confirmed by code inspection).
- Test recipient rule (01024994092): **not executed in this session** (no visible browser run). Must be verified manually with `headless:false` flow.

## G. Dashboard
- Orders list page added under admin (`/admin/orders`) listing recent orders. Existing admin auth/roles unchanged. Other dashboards (products/categories/offers) unchanged.

## H–M
- Visible browser testing, screenshots under `acceptance-evidence/naqer-ordering/`, responsive/RTL/LTR walkthroughs, negative tests, DB verification, automated E2E beyond typecheck/build: **NOT completed in this session** (requires running app + visible browser). Record as BLOCKED/PARTIAL until executed.

## Git
- Changes staged/committed/pushed by agent? (to be filled after actions below)
