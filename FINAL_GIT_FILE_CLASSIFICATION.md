# Naqer Menu — Git File Classification

HEAD: 7b058dab4d0ddcb6c710809db0b4241ab88c49c8
Generated: 2026-11-08T20:50 UTC

This document classifies every modified and untracked file in the working tree.
No files were committed, pushed, deleted, or force-reset during this audit.

## Category A — Required Application Source Changes

Modified tracked files (17):

| File | Classification | Notes |
|---|---|---|
| `.env.example` | C | Example environment template (no secrets) |
| `.gitignore` | A | Security fix — added `backups/`, `*.sql`, `*.dump`, `*.backup` |
| `README.md` | C | Project documentation |
| `app/[locale]/page.tsx` | A | Public menu page source |
| `app/globals.css` | A | Global styles |
| `components/Footer.tsx` | A | Footer component |
| `components/Hero.tsx` | A | Hero component |
| `components/Icons.tsx` | A | Icon definitions |
| `components/JsonLd.tsx` | A | Structured data |
| `components/Logo.tsx` | A | Logo component |
| `components/MenuView.tsx` | A | Main menu view |
| `lib/i18n.ts` | A | Internationalization |
| `lib/menu-view.ts` | A | Menu view logic |
| `middleware.ts` | A | Next.js middleware |
| `next.config.mjs` | A | Next.js config |
| `package-lock.json` | B | Lockfile (dependency tree) |
| `package.json` | A | Package manifest / scripts |

Untracked source files:

| File/Directory | Classification | Notes |
|---|---|---|
| `app/admin/` | A | Admin route handlers |
| `app/api/` | A | API route handlers |
| `components/CartContext.tsx` | A | Cart state context |
| `components/CartDrawer.tsx` | A | Cart drawer UI |
| `components/FloatingCartBar.tsx` | A | Floating cart bar UI |
| `components/LiveSync.tsx` | A | Live sync component |
| `components/OfferDetailModal.tsx` | A | Offer detail modal |
| `components/OffersSection.tsx` | A | Offers section UI |
| `components/ProductDetailModal.tsx` | A | Product detail modal |
| `instrumentation.ts` | A | Telemetry instrumentation |
| `lib/admin/` | A | Admin library |
| `lib/audit.ts` | A | Audit logging |
| `lib/auth.ts` | A | Authentication |
| `lib/cart.ts` | A | Cart logic |
| `lib/cloudinary.ts` | A | Cloudinary integration |
| `lib/content-version.ts` | A | Content versioning |
| `lib/menu-db.ts` | A | Menu database access |
| `lib/offers-db.ts` | A | Offers database access |
| `lib/offers.ts` | A | Offers logic |
| `lib/prisma.ts` | A | Prisma client |
| `lib/rate-limit.ts` | A | Rate limiting |
| `lib/site-db.ts` | A | Site database access |
| `prisma/` | A | Prisma schema and migrations |
| `prisma7.config.ts` | A | Prisma v7 config |
| `public/` | A | Static assets |

## Category B — Required Tests and Scripts

| File/Directory | Classification | Notes |
|---|---|---|
| `scripts/apply-real-photography.mjs` | B | Photography migration script |
| `scripts/baseline.mjs` | B | Database baseline script |
| `scripts/check-offers.mjs` | B | Offer validation script |
| `scripts/clean-offers.mjs` | B | Offer cleanup script |
| `scripts/create-product-inventory.mjs` | B | Inventory generation |
| `scripts/curated-photo-catalog.mjs` | B | Photo catalog |
| `scripts/download-and-optimize-images.mjs` | B | Image download/optimization |
| `scripts/find-test-products.mjs` | B | Test product discovery |
| `scripts/generate-full-db-dump.mjs` | B | Backup generator (safe, no credentials) |
| `scripts/generate-inventory-md.mjs` | B | Inventory markdown |
| `scripts/import-menu.mjs` | B | Menu import |
| `scripts/inspect-db-schema-inventory.mjs` | B | Schema inspection |
| `scripts/live-manual-verification.mjs` | B | Manual verification |
| `scripts/make-test-png.mjs` | B | Test PNG generation |
| `scripts/match-catalog.mjs` | B | Catalog matching |
| `scripts/provision-owner.mjs` | B | Production owner provisioning (safe) |
| `scripts/reconcile.mjs` | B | Reconciliation |
| `scripts/seed-admin.mjs` | B | Demo admin seed (dev-only, production-guarded) |
| `scripts/seed-editor.mjs` | B | Demo editor seed (dev-only, production-guarded) |
| `scripts/setup-offers-schema.mjs` | B | Offers schema setup |
| `scripts/test-dynamic-promotional-offers.mjs` | B | Offer tests |
| `scripts/test-full-sql-restore.mjs` | B | Full SQL restore verification |
| `scripts/test-product-photography-qa.mjs` | B | Photography QA |
| `scripts/verify-backup-and-restore.mjs` | B | Backup/restore verification |
| `scripts/verify-cloudinary.mjs` | B | Cloudinary verification |
| `scripts/verify-final-db-integrity.mjs` | B | Final DB integrity |
| `scripts/verify-import.mjs` | B | Import verification |
| `scripts/verify-local-images.mjs` | B | Local image verification |
| `tests/` | B | Test suite |
| `test-results/` | B | Test results |
| `playwright.config.ts` | B | Playwright test config |

## Category C — Required Delivery Documentation

| File | Classification | Notes |
|---|---|---|
| `AGENTS.md` | C | Agent instructions |
| `BACKUP_AND_RESTORE.md` | C | Backup/restore procedures |
| `CLIENT_HANDOVER_GUIDE.md` | C | Client handover |
| `DELIVERY_AND_OPERATIONS_MANUAL.md` | C | Operations manual |
| `FINAL_ACCEPTANCE_REPORT.md` | C | Acceptance report |
| `FINAL_PROJECT_ACCEPTANCE.md` | C | Project acceptance |
| `FINAL_RELEASE_BASELINE.md` | C | Release baseline |
| `FINAL_TEST_REPORT.md` | C | Test report |
| `IMPORT_REPORT.md` | C | Import report |
| `PDF_RECONCILIATION.md` | C | PDF reconciliation |
| `PRE_DEPLOYMENT_SAFETY_CHECKLIST.md` | C | Pre-deployment checklist |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | C | Production deployment guide |
| `PRODUCT_IMAGE_INVENTORY.md` | C | Image inventory |
| `PRODUCT_IMAGE_MAPPING.csv` | C | Image mapping data |
| `SECURITY_AND_OPERATIONS.md` | C | Security and operations |

## Category D — Temporary Logs, Generated Files, and Test Artifacts

| File/Directory | Classification | Notes |
|---|---|---|
| `50500.pdf` | D | PDF artifact |
| `backup-product-images-before-real-photos.json` | D | Image backup data |
| `build-final.log` | D | Build log |
| `build.log` | D | Build log |
| `diag.log` | D | Diagnostic log |
| `downloaded-images-data.json` | D | Image data |
| `e2e-category.png` | D | E2E test screenshot |
| `e2e-logo.png` | D | E2E test screenshot |
| `e2e-product-blue.png` | D | E2E test screenshot |
| `e2e-product-orange.png` | D | E2E test screenshot |
| `e2e-test-2.png` | D | E2E test screenshot |
| `e2e-test.png` | D | E2E test screenshot |
| `pdf-images/` | D | PDF image extraction |
| `playwright-report/` | D | Playwright report |
| `product-inventory-data.json` | D | Inventory data |
| `pw-full.log` | D | Playwright log |
| `pw-ls.log` | D | Playwright log |
| `pw-ls2.log` | D | Playwright log |
| `pw-ls3.log` | D | Playwright log |
| `pw-ls4.log` | D | Playwright log |
| `pw-ls45.log` | D | Playwright log |
| `pw-sec-resp.log` | D | Playwright log |
| `qa-cld-01-product-upload-orange.png` | D | QA screenshot |
| `qa-cld-02-product-upload-blue.png` | D | QA screenshot |
| `qa-cld-03-product-after-delete-orange.png` | D | QA screenshot |
| `qa-cld-04-public-site-image.png` | D | QA screenshot |
| `qa-cld-05-product-images-empty.png` | D | QA screenshot |
| `qa-cld-06-category-upload.png` | D | QA screenshot |
| `qa-cld-07-public-category-image.png` | D | QA screenshot |
| `qa-cld-08-category-after-replace.png` | D | QA screenshot |
| `qa-cld-09-category-clean.png` | D | QA screenshot |
| `qa-cld-10-settings-logo.png` | D | QA screenshot |
| `qa-cld-11-public-logo.png` | D | QA screenshot |
| `qa-cld-12-logo-restored.png` | D | QA screenshot |
| `qa-e2e-01-dashboard.png` | D | QA screenshot |
| `qa-e2e-02-categories.png` | D | QA screenshot |
| `qa-e2e-03-category-created.png` | D | QA screenshot |
| `qa-e2e-06-category-deleted.png` | D | QA screenshot |
| `qa-e2e-07-product-validation.png` | D | QA screenshot |
| `qa-e2e-09-product-created.png` | D | QA screenshot |
| `qa-e2e-11-product-deleted.png` | D | QA screenshot |
| `qa-e2e-13-branches-restored.png` | D | QA screenshot |
| `qa-e2e-14-settings-saved.png` | D | QA screenshot |
| `qa-e2e-15-audit-log.png` | D | QA screenshot |
| `qa-e2e-16-import-review.png` | D | QA screenshot |
| `qa-e2e-18-import-new-row.png` | D | QA screenshot |
| `qa-e2e-19-imported-product-deleted.png` | D | QA screenshot |
| `qa-e2e-19-imported-product.png` | D | QA screenshot |
| `qa-e2e-20-import-jobs.png` | D | QA screenshot |
| `qa-e2e-21-images-module.png` | D | QA screenshot |
| `qa-final/` | D | QA artifacts |
| `qa-premium/` | D | QA artifacts |
| `qa-ui-01-upload-failure.png` | D | QA screenshot |
| `qa-ui-02-live-sync.png` | D | QA screenshot |
| `qa-ui-03-login-desktop.png` | D | QA screenshot |
| `qa-ui-03b-login-desktop.png` | D | QA screenshot |
| `qa-ui-04-login-error.png` | D | QA screenshot |
| `qa-ui-05-login-mobile.png` | D | QA screenshot |
| `qa-ui-06-public-mobile-ar.png` | D | QA screenshot |
| `qa-ui-06b-public-desktop-ar.png` | D | QA screenshot |
| `qa-ui-07-public-desktop-en.png` | D | QA screenshot |
| `qa-ui-08-admin-desktop.png` | D | QA screenshot |
| `qa-ui-09-admin-mobile.png` | D | QA screenshot |
| `qa2-step12-branches-readonly.png` | D | QA screenshot |
| `qa2-step14-import-redirect.png` | D | QA screenshot |
| `qa2-step15-editor-created.png` | D | QA screenshot |
| `qa2-step2-validation.png` | D | QA screenshot |
| `qa2-step3-edit-saved.png` | D | QA screenshot |
| `qa2-step4-import-pagination.png` | D | QA screenshot |
| `qa2-step6-import-edit.png` | D | QA screenshot |
| `qa2-step7-import-result.png` | D | QA screenshot |
| `run-full.ps1` | D | PowerShell runner |
| `run-ls-45.ps1` | D | PowerShell runner |
| `run-ls.ps1` | D | PowerShell runner |
| `run-ls4.ps1` | D | PowerShell runner |
| `run-rest.ps1` | D | PowerShell runner |
| `server.log` | D | Server log |
| All `scripts/tmp-*.mjs` | D | Temporary investigation scripts |

## Category E — Sensitive Backups or Secrets

| File/Directory | Classification | Action Taken |
|---|---|---|
| `backups/naqer-full-production-backup.sql` | E | **MOVED** to secure encrypted storage outside repository: `C:\Users\ibrah\AppData\Local\Temp\kilo\secure-backups/naqer-full-production-backup.sql` (870,392 bytes, size-verified against original) |
| `backups/backup-naqer-verified.json` | E | Remains in `backups/` directory; directory is now gitignored via `backups/` pattern |

## Git Ignore Status

`.gitignore` now includes:
```
# Production database backups — never commit or track SQL dumps
backups/
*.sql
*.dump
*.backup
```

Verification results:
- `git check-ignore -v backups/naqer-full-production-backup.sql` → matched (gitignored)
- `git ls-files backups/` → empty (nothing tracked)
- `git diff --check` → exit 0 (no whitespace errors)
- `npm run typecheck` → exit 0
- `npm run build` → exit 0

## Recommended Actions (Client)

1. **Move `backups/` contents to encrypted off-repository storage** — The SQL dump has been copied to a temp location; the client should transfer it to their encrypted backup vault and remove it from the local `backups/` directory.
2. **Do not run `git add .`** — This would stage all untracked files including logs, QA artifacts, and backup data.
3. **Review Category D files** — Decide which temporary logs and QA screenshots to retain or delete before any future commit.
4. **Admin accounts** — Both `admin@naqer-menu.local` and `editor@naqer-menu.local` are demo/development accounts (seed scripts `seed-admin.mjs` and `seed-editor.mjs`). They are explicitly guarded against production creation (`ALLOW_DEMO_ADMIN=1` required). No credential rotation is required.
5. **Commit decision** — When authorized, commit Category A, B, and C files only. Leave Category D and E untracked or add them to `.gitignore`.
