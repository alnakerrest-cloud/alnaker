# NAQER MENU — Security Remediation & Controlled Deployment Readiness

Date: 2026-11-20
Repository: `EbrahimShoeib1999/naqer-menu` · Branch: `main`
Local commits created: `6e40bd141c961edb5bd4f048f87263c737562009` (code fix) plus follow-up report commits (see `git log`).
Reported original HEAD: `de624ef04373722df40dc3a7b9ffa0668aaa8628`

Status vocabulary used below: **VERIFIED**, **NOT VERIFIED**, **BLOCKED**, **NOT APPLICABLE**.

## Overall status: DEPLOYMENT BLOCKED — DO NOT DEPLOY

No deployment was performed. No credential was rotated by this work. No production database was contacted or modified. No secret value is printed in this document or in any log produced by this work.

---

## Status summary

| Required status item | Status | Detail |
|---|---|---|
| No credentials hardcoded in new code or build | **VERIFIED** | 0 `npg_` tokens in tracked source, 0 in client bundles/fresh build |
| All committed credentials treated as compromised | **VERIFIED** | Policy applied; see Phase 1 |
| Old Neon credential rotated | **BLOCKED** | Not performed — requires Neon console access and owner action |
| Production database confirmed by owner | **BLOCKED** | Owner has not identified it; repository docs conflict |
| Vercel configuration (Production/Preview/Development) | **BLOCKED** | No Vercel project access available locally |
| Working-tree diff reviewed and clean | **VERIFIED** | See Phase 4 |
| All local checks passed | **VERIFIED** | Resolver, checkout, idempotency, TypeScript, build, migration, secret scan |
| Git commits created locally | **VERIFIED** | Code fix: `6e40bd141c961edb5bd4f048f87263c737562009`; report commits: see `git log` |
| Git push | **BLOCKED** | Not pushed — push to `main` may trigger Vercel auto-deploy; requires approval |
| Deployment approval | **BLOCKED** | No explicit approval given |
| Deployment result | **NOT APPLICABLE** | No deployment executed |
| Post-deployment verification | **NOT APPLICABLE** | No deployment to verify |

---

## PHASE 1 — Credential remediation

### 1.1 Files inspected
- `lib/database-url.ts` (new)
- `lib/prisma.ts`
- All four DB client sites: `lib/prisma.ts`, `lib/orders-store.ts`, `lib/customer-store.ts`, `lib/customer-hub-store.ts`

### 1.2 No hardcoded credentials in new code — **VERIFIED**
`lib/database-url.ts` contains no connection string, host, or password. Every value comes from server-side environment variables. `lib/prisma.ts` now calls `resolveDatabaseUrl()` and contains no literal URL. Static assertion in `scratch/verify-database-url.mjs` checks this directly.

### 1.3 Committed history inspection — **VERIFIED**
| Finding | Evidence (no values shown) |
|---|---|
| Credential introduced in commit | `d3af9ac1ebd7b375a87ede3b0543a679d6fba719` (2026-11-19) — commit subject explicitly references providing Neon credentials |
| Credential still present at original HEAD | `git grep -l -E 'npg_…' HEAD` → `HEAD:lib/prisma.ts` (1 occurrence) |
| Credential also present in `origin/main` | `origin/main:lib/prisma.ts` |
| Commit that changed the token occurrences | `7c0ec271bcc7466c2cf5e64a44dfb9eac327ab85` |
| Working tree after fix | No tracked file contains an `npg_` token |
| Prepared purge branches exist | `security/history-purge` and `origin/pre-purge-snapshot` contain no token, but are **not** on `main`. Not applied — history rewrite requires explicit owner approval. |
| Stale audit docs | `docs/FINAL_RELEASE_SECURITY_STATUS.md` and `docs/FINAL_GIT_HISTORY_SECURITY_AUDIT.md` (last modified 2026-11-13) state the Neon password was "not found in history". They predate the 2026-11-19 credential commit and are therefore superseded by direct `git grep` evidence. |

### 1.4 Credential treated as compromised — **VERIFIED**
The committed token is treated as valid and compromised regardless of whether it is still live. No attempt was made to test it.

### 1.5 Exact rotation steps (prepared, NOT executed) — **VERIFIED (steps only)**

1. In the **Neon Console**, select the project/branch that owns the exposed role.
2. Open **Connection Details** and regenerate/rotate that role's password (or create a new least-privilege role and grant only the required privileges).
3. Copy the new connection string **directly** from the Neon console into the Vercel environment-variable UI. Do not paste it into chat, source, docs, scratch files, or commit messages.
4. Update Vercel env vars `DATABASE_URL` and (if used) `NAQER_ACTIVE_DATABASE_URL` for the environments that need them. Do not delete or overwrite unrelated existing values.
5. Update the gitignored local env files (`.env.local`, `.env.test.local`, `.env.prod.bak`, `.env.staging.local`) locally, outside the commit flow. They are all confirmed gitignored.
6. Redeploy so serverless instances pick up the new value; then confirm the old password is rejected and the new one works.
7. Coordinate timing: rotating the password **before** updating Vercel will temporarily break the currently deployed build.
8. Record rotation evidence (Neon console/audit timestamp) without recording the secret itself.
9. Do **not** apply `security/history-purge` or force-push to rewrite history without explicit owner approval.

### 1.6 Rotation actually performed — **BLOCKED**
**NOT PERFORMED.** No Neon console access was available, and no credential was changed. Do not claim rotation until steps 1–8 above are executed and evidenced by the owner.

### 1.7 Secret handling — **VERIFIED**
No secret value was printed, logged, copied into source, or included in any report. All scan output is redacted. Error messages from the resolver were explicitly tested to exclude both the URL and the password.

### 1.8 / 1.9 Single configuration and fail-safe behaviour — **VERIFIED**
`node scratch/verify-database-url.mjs` → **12/12 PASS**, covering:
- All four DB clients import the shared resolver; none creates a pool directly from `process.env`.
- Missing config → `null` for degradable callers, visible `DatabaseConfigurationError` for required callers.
- Retired host without explicit fallback → explicit refusal ("Refusing to redirect silently").
- Retired host + explicit `NAQER_ACTIVE_DATABASE_URL` → uses fallback and logs a visible warning.
- Retired fallback → rejected. Host detection uses hostname only, so a password containing the marker text is not a false positive.
- `pgSslConfig()` derives TLS solely from the configured URL.

---

## PHASE 2 — Production database confirmation

### Overall status: **BLOCKED**

The owner has **not** explicitly identified the intended active production Neon database. Per the strict stop condition, this phase is stopped and no database target was selected.

### Why confirmation is required — conflicting repository evidence
| Source | Claim |
|---|---|
| `docs/PRODUCTION_DATABASE_LIVE_VERIFICATION.md`, `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`, `docs/DATABASE_MIGRATION_AND_ROLLBACK.md`, `docs/STAGING_TEST_INVENTORY.md` | `ep-withered-…` = Production; `ep-soft-…` = Staging |
| `docs/PRODUCTION_DATABASE_REAL_DATA_VERIFICATION.md` | `ep-soft-…` = "Live Primary Production"; `ep-withered-…` = old quota cluster |

Selecting either based on hostname, availability, or documentation alone is explicitly disallowed. No connection string was printed.

### Owner confirmation checklist — all **NOT VERIFIED**
| Item | Status |
|---|---|
| Correct Neon project | **NOT VERIFIED** |
| Correct database | **NOT VERIFIED** |
| Correct schema | **NOT VERIFIED** |
| Migration status against the confirmed production DB | **NOT VERIFIED** |
| Required tables present in production | **NOT VERIFIED** |
| Expected production data present | **NOT VERIFIED** |
| Connection permissions (least privilege) | **NOT VERIFIED** |
| No accidental connection to a test or retired DB | **NOT VERIFIED** |

Note: `npx prisma migrate status` returned "4 migrations found / Database schema is up to date!" for the **locally configured** database only. This is not evidence about the owner-confirmed production database and must not be used as such.

---

## PHASE 3 — Vercel environment configuration

### Overall status: **BLOCKED**

| Check | Result |
|---|---|
| `vercel.json` present | No |
| `.vercel/` project link present | No |
| `vercel` CLI on PATH | No |
| Local `vercel` package | No |
| `VERCEL_*` env var names present locally | None |

No Vercel project, deployment, or environment settings could be inspected. No value was invented, replaced, or printed.

| Environment | Status |
|---|---|
| Production env vars | **NOT VERIFIED** |
| Preview env vars | **NOT VERIFIED** |
| Development env vars | **NOT VERIFIED** |

### Required variable names for the current resolver (names only)
`DATABASE_URL`, `NAQER_ACTIVE_DATABASE_URL` (optional explicit fallback), `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_SECURE_FOLDER`.

Database variables must remain server-side; never use a `NEXT_PUBLIC_` prefix for them.

---

## PHASE 4 — Code and Git verification

### Diff review — **VERIFIED**
| Check | Result |
|---|---|
| No credentials in diff | **VERIFIED** — 0 `npg_` tokens; all review output redacted |
| No schema/migration changes | **VERIFIED** — no paths under `prisma/schema.prisma` or `prisma/migrations/` changed |
| No destructive operations | **VERIFIED** — no `DROP`, `TRUNCATE`, `DELETE FROM`, force-push, or history rewrite in the candidate diff |
| No unrelated code modifications | **VERIFIED** — only the 6 intended code files, `.env.example`, and 2 report files changed. `data/local-db-overlay.json` was pre-existing and explicitly excluded from the commit |
| No broken checkout behaviour | **VERIFIED** — browser matrix passes |
| No inconsistent DB client configuration | **VERIFIED** — all four clients use the shared resolver |

### Checks executed
| Check | Result |
|---|---|
| Resolver tests (12 cases) | **VERIFIED** — 12/12 PASS |
| Checkout tests (guest, new address, saved address, empty cart) | **VERIFIED** — 200 / 200 / 200 / 400 as expected |
| Idempotency test (duplicate key) | **VERIFIED** — same order number returned, exactly 1 DB row for the key |
| TypeScript (`npm run typecheck`) | **VERIFIED** — PASS |
| Production build (`npm run build`) | **VERIFIED** — PASS after the standard Next.js security-advisory retry |
| Migration check (`npx prisma migrate status`) | **VERIFIED** — 4 migrations, schema up to date (local config only) |
| Secret scan (tracked source + fresh build) | **VERIFIED** — 0 `npg_` tokens, 0 client-bundle findings |
| Lint | **NOT APPLICABLE** — Next.js 16 removed `next lint`; repository has no ESLint config/dependency |

Test records created during verification were removed; a final query returned zero orders and zero customers for all verification phone numbers.

### Git status — **VERIFIED (commit) / BLOCKED (push)**
- Code fix commit: `6e40bd141c961edb5bd4f048f87263c737562009`; additional report commits: see `git log`.
- Branch `main` is **3 commits ahead** of `origin/main`; **not pushed**.
- Push is **BLOCKED**: pushing to `main` may trigger a Vercel production deployment, and no deployment approval exists.
- History rewrite / force-push: **NOT APPLICABLE** — not performed. The prepared `security/history-purge` branch was left untouched.

---

## PHASE 5 — Deployment preparation

| Requirement | Status / detail |
|---|---|
| Vercel project access | **BLOCKED** — required and unavailable |
| Environment variables | Names listed in Phase 3; values must be set by the owner in Vercel, never printed |
| Neon configuration | **BLOCKED** — intended production project must be confirmed; old password must be rotated |
| Migration steps | None required: schema is current (4 migrations). Run `npx prisma migrate status` against the confirmed production DB before deploying as a read-only check. Do not run destructive migration commands. |
| Rollback procedure | Revert the Vercel deployment to the previous successful deployment (the pre-fix build at `de624ef0`). Rollback restores the old checkout 500 — it is a safety fallback, not a fix. If the new credential was rotated, also restore the previous Neon password only if the rollback deployment requires it. |
| Post-deployment verification | Defined in Phase 6 below; mandatory before claiming a fix |
| Deployment approval | **BLOCKED** — not given |

Manual deployment sequence once all blockers are cleared:
1. Owner confirms the intended production Neon database and rotates the exposed credential.
2. Owner sets the confirmed connection string via `DATABASE_URL` (or `NAQER_ACTIVE_DATABASE_URL`) in Vercel; verifies env var names across Production/Preview/Development.
3. Owner explicitly approves deployment.
4. Push `main` (or deploy the exact commit `6e40bd14…`).
5. Wait for deployment readiness, then execute Phase 6.

---

## PHASE 6 — Post-deployment acceptance

### Overall status: **NOT APPLICABLE** — no deployment occurred.

The following checks are mandatory before any claim that production checkout is fixed:

| # | Check | Status |
|---|---|---|
| 1 | Production site loads | NOT APPLICABLE |
| 2 | Guest checkout | NOT APPLICABLE |
| 3 | Checkout with a new customer address | NOT APPLICABLE |
| 4 | Checkout with a saved address | NOT APPLICABLE |
| 5 | Empty-cart validation | NOT APPLICABLE |
| 6 | Duplicate idempotency keys | NOT APPLICABLE |
| 7 | Correct order totals | NOT APPLICABLE |
| 8 | Exactly one order per idempotency key | NOT APPLICABLE |
| 9 | `Order` and `OrderItem` persistence | NOT APPLICABLE |
| 10 | Customer address persistence | NOT APPLICABLE |
| 11 | No secrets in browser bundles, logs, or error responses | NOT APPLICABLE |

Use only synthetic test data. Delete only records created by this verification — never genuine customer or order records.

---

## Remaining security risks

| Risk | Status | Notes |
|---|---|---|
| Exposed Neon credential still valid | **BLOCKED** | Rotation not performed; treat as compromised until proven otherwise |
| Committed credential remains in `main`/`origin/main` history | **BLOCKED** | Purge branch exists but applying it requires explicit owner approval and a coordinated force-push |
| Production database ambiguity | **BLOCKED** | Conflicting docs; owner confirmation absent |
| Production/Preview/Development env configuration unknown | **BLOCKED** | No Vercel access |
| Next.js 16.4.2 security advisory | Open | Build requires a retry after the upgrade nudge. Recommended follow-up in a separate worktree: `next upgrade --agent=security --internal-nudge-id=e6bd784a-b54e-4cd9-953a-2b042dc6aedc` |
| No ESLint configured | Open | Lint unavailable; typecheck is the only static check |
| Stale security docs claim no Neon password in history | Open | Superseded by direct evidence; should be corrected |

---

## Final statement

The code fix is complete, locally verified, and committed locally as `6e40bd141c961edb5bd4f048f87263c737562009`. **Nothing was pushed or deployed.** The live site at `https://naqer-menu.vercel.app` still serves the pre-fix build and remains broken.

Deployment is blocked until all of the following are true: the owner confirms the intended production Neon database, the exposed credential is actually rotated, Vercel access confirms environment configuration, explicit deployment approval is given, and post-deployment browser plus database verification pass. No credential rotation, push, deployment, or production verification is claimed by this document.
