# NAQER ORDERING SYSTEM — Final Acceptance (continued from 74bd665)

Generated: 2026-11-17 (local). Branch: `main` (work continued on this branch).

## Production safety / environment (addendum — verified in this pass)
- Git: `git status` inspected; branch `main`, commits include `a068065`, `74bd665`. Unrelated modified/untracked files remain (not deleted/overwritten by me).
- `.env.local` present with Neon `DATABASE_URL` (hosted). **I did not change env files.** I did **not** run migrations/seeds/cleanup/imports/destructive commands. I did **not** deploy. **Production vs isolated staging not positively verified by me** — per addendum, if not positively verified, DB write testing must stop. No test orders were created by me against any DB.
- Confirmation checklist (to be filled by operator who ran any tests): no production deploy; no production DB writes; no production menu/products/categories/prices/orders/settings changed; state DB used (redacted).

## Flagged option-group assignments (from `NAQER_PRODUCT_OPTIONS_AUDIT.md`)
See the new “Flagged assignments table” in `NAQER_PRODUCT_OPTIONS_AUDIT.md`. Summary: “إضافات” group observed as single-select in dump (needs business decision for multi-select); several products have likely mismatched attachments (e.g. `أرز مندي سادة`, `دقوس`, `سجق مشوي`, some mandi items) — **do not auto-fix**; require business approval and isolated-DB test. Some menu-noted choices (`كبدة ضاني` style, `موزة ضاني` rice) not modeled as DB groups — NEEDS BUSINESS CONFIRMATION before adding anything.

## A. Summary
- Continued from commit `74bd665` (pushed). Preserved existing work; did **not** run reset/clean.
- Added **menu-driven product options audit** (DB-backed dump of all 42 products): `NAQER_PRODUCT_OPTIONS_AUDIT.md`. Includes per-product attached OptionGroups, variants, notes on mismatched assignments, and “NEEDS BUSINESS CONFIRMATION” flags. No invented options added in code.
- Fixed scripts: `scripts/check-products.ts` now uses `lib/prisma` (resolves TS/build issue reported earlier).
- Added helper `scripts/dump-options-audit.ts` (local audit generation).
- No changes to core ordering/checkout/WhatsApp API behavior in this pass except audit + report + script fixes (service-charge removals and orders admin page remained as in prior commit).

## B. Product catalog (audit)
- **Total products reviewed (from DB dump): 42.** Full list in `NAQER_PRODUCT_OPTIONS_AUDIT.md`.
- **Tray numbering:** removed from customer UI in `components/MenuView.tsx` (prior commit). Internal IDs preserved.
- **Products with ≥1 OptionGroup attached:** 28. **With 0:** 14 (flagged NEEDS BUSINESS CONFIRMATION).
- **Examples (from DB):** Grills by weight often have groups `حجم المشويات`, `نوع الأرز`, `درجة الحرارة`, `إضافات` (attached in DB). Trays often have `نوع الصينية`, `نوع الأرز`, `إضافات`. Many items (e.g. several وجبات/أطباق شعبية/مقبلات-style items in dump set) have **no groups** in DB — UI shows no customization block (correct if none intended).
- **Risks noted (data):** `إضافات` group appears as **single-select** (`maxSelect 1`) in observed assignments — confirm if multi-select is required. Some assignments look semantically wrong (e.g. `أرز مندي سادة`, `دقوس`, possibly `سجق مشوي`) — must be fixed in **admin/data** after business confirmation, not by inventing code rules.
- **Menu text hints not modeled as DB groups** (examples in audit): `كبدة ضاني` style note, `موزة ضاني` rice choice — NEEDS BUSINESS CONFIRMATION to add targeted groups if required.

## C. Ordering (code/flow)
- DELIVERY / TAKEAWAY present in `CheckoutModal.tsx` and `app/api/checkout/route.ts` (unchanged structurally in this pass).
- Cart preserves `selectedOptions` and notes (`lib/cart.ts`, `CartContext.tsx`) with composite keys.
- **Service charge:** removed from public UI/message paths per prior commit (verified by grep in touched files). No service charge in checkout totals logic beyond existing fields removed from display.
- **Delivery fee:** from settings (`site.deliveryFee`), applied only when `orderType === "DELIVERY"` in API; stored on order. Admin can edit in settings (service-charge fields removed from settings UI in prior commit).
- **Payment:** CASH/CARD only in UI/API validation.
- Egyptian phone validation: server-side `validateEgyptianPhone` in checkout route (local +20 forms) — **not re-tested in visible browser in this pass**.

## D. Backend
- Checkout recalculates prices/options from menu + offers server-side; stores historical snapshots on `OrderItem` (existing). Idempotency key supported (`idempotencyKey` unique). **Not load/duplicate-tested in this pass.**

## E. Receipt
- `app/[locale]/receipt/[orderNumber]/route.ts` exists (HTML + JSON paths). Displays items, options, notes, totals, delivery fee when applicable. **Not verified in browser in this pass.**

## F. WhatsApp (prepared `wa.me` only)
- No WhatsApp Business API/webhooks/bots/auto-send implemented (code inspection). Messages built from cart/checkout flows; service charge removed from message text paths.  
- **Test rule:** use **01024994092** only in controlled isolated testing; never real customers. Before opening link, verify recipient in generated URL. Opening link ≠ message sent. **Not executed in this pass.**

## G. Dashboard
- Admin “Orders” page added (`app/admin/(shell)/orders/page.tsx`) — recent list (basic). Full search/filters/status workflow beyond basics: **not completed** (see limitations).

## H. Visible browser evidence
- **NONE produced in this pass.** No screenshots under `acceptance-evidence/naqer-ordering/` added by me. Required flows (DELIVERY/TAKEAWAY, negative tests, RTL/LTR, viewports 320–1440) are **NOT VERIFIED**.

## I. Responsive / J. Arabic–English
- **NOT VERIFIED** in browser this pass.

## K. Automated tests
- `npm run typecheck`: **PASS** (after fixing `scripts/check-products.ts`).
- `npm run build`: **PASS** (Next build completed successfully in local run).

## L. Known limitations (explicit)
- No visible browser testing performed; all browser-dependent checklist items remain **NOT VERIFIED**.
- Order persistence, duplicate protection under retry/double-click, receipt download/print UX, WhatsApp URL recipient verification with test number: **NOT VERIFIED** without isolated test run.
- Dashboard orders: basic list only; no full detail view, search, status updates workflow verified end-to-end in this pass.
- Product option **assignments** in DB contain likely mismatches (see audit) — data cleanup requires admin/business action in an isolated environment.
- `scripts/check-products.ts`/`dump-options-audit.ts` were added as audit helpers; they are **not** part of normal app typecheck surface except being fixed to use `lib/prisma`.
- Unrelated working-tree changes remain (generated Prisma files, other untracked files) — **not committed** by this follow-up except audit files listed in commit.

## M. Production safety confirmation (fill at test time)
- [ ] No production deployment performed.
- [ ] No production DB writes performed (state isolated DB used: __________________).
- [ ] No production menu/products/categories/prices/orders/settings changed.

## Git (this follow-up)
- Files added/committed in this step: `NAQER_PRODUCT_OPTIONS_AUDIT.md`, `scripts/dump-options-audit.ts` (and any report updates committed together). See git log after commit.

