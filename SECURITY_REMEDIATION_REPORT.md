# Security Remediation Report — Database Credential Exposure

**Date:** 2026-11-20 · **Status:** **PARTIAL** (code remediated; rotation **BLOCKED**)

## Scope

Complete review of database connection resolution: hardcoded hosts/strings/usernames/passwords, fallback URLs, legacy env names (including whitespace variants), all Prisma and raw `pg` paths, server/client boundary, build output and browser bundles, Git history, logs/error responses, and diagnostic scripts.

## 1. Findings and current state

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Hardcoded connection string / password / username in source | **VERIFIED clean** | `lib/database-url.ts:1-112` contains no URL/host/password. `lib/prisma.ts:13,46,51-57` calls `resolveDatabaseUrl()` and `pgSslConfig()`. `lib/orders-store.ts:5,155-164`, `lib/customer-store.ts:9,24-34`, `lib/customer-hub-store.ts:9,54-64` all use `getConfiguredDatabaseUrl()` |
| 2 | Client-bundle / build secret leakage | **VERIFIED clean** | `scratch/security-scan.mjs` → 0 `npg_` tokens, 0 client-bundle findings after a fresh `npm run build` |
| 3 | Legacy env key with whitespace | **VERIFIED handled** | `lib/database-url.ts:54` reads `DATABASE_URL` then `process.env["DATABASE_URL "]` |
| 4 | Unsafe hardcoded fallback | **VERIFIED removed** | Only operator-configured `NAQER_ACTIVE_DATABASE_URL` is honored; its use is logged at runtime (`database-url.ts:71-79`). No default value exists |
| 5 | Retired host silently rewritten | **VERIFIED rejected** | `RETIRED_PROD_HOST_MARKER = "ep-withered-bread"` (`:24`); `isRetiredHost()` checks hostname only (`:34-41`); retired primary without explicit fallback throws (`:81-87`); retired fallback throws (`:60-65`) |
| 6 | Missing config fails safely | **VERIFIED** | `getConfiguredDatabaseUrl()` returns `null` for degradable raw-pg callers; `resolveDatabaseUrl()` throws `DatabaseConfigurationError` (`:96-105`). Prisma uses strict variant; raw pools preserve null handling |
| 7 | Errors/logs leak internals | **VERIFIED** | Error messages contain only the host *marker string* and variable names, never the URL or password. Verified by `scratch/verify-database-url.mjs` (12/12) |
| 8 | SSL for Neon | **VERIFIED** | `pgSslConfig()` (`:108-112`) derives TLS from configured URL only; all four clients apply it |
| 9 | Server/client boundary | **VERIFIED** | Database vars are server-side names only; `.env.example:15` explicitly warns never to use `NEXT_PUBLIC_` |

## 2. Committed credential — exposed and compromised

| Item | Evidence (no secret values) |
|---|---|
| Introduced | `d3af9ac1ebd7b375a87ede3b0543a679d6fba719` — "fix(orders): provide authoritative active Neon cluster credentials for serverless execution" (2026-11-19) |
| Present at reported HEAD | `de624ef0:lib/prisma.ts` — 1 `npg_` token |
| Present on `origin/main` | same file |
| Removed from new code | commit `6e40bd141c961edb5bd4f048f87263c737562009` — no `npg_` token in tree or in any of the 3 new commits |
| Prepared purge branch | `security/history-purge` (no token in tip tree) — **not applied**; requires explicit owner approval for history rewrite |
| Stale docs | `docs/FINAL_RELEASE_SECURITY_STATUS.md` / `docs/FINAL_GIT_HISTORY_SECURITY_AUDIT.md` (last modified 2026-11-13) predate the credential commit; their "not found in history" claim is superseded by direct `git grep` evidence |

The credential is treated as compromised regardless of whether it is still live. No attempt was made to connect with it or test it.

## 3. Exact rotation steps (prepared, NOT executed)

1. Neon Console → select the project/branch owning the exposed role.
2. Regenerate/rotate that role's password, or create a new least-privilege role with only required grants.
3. Copy the new connection string **directly** from Neon into the Vercel Environment Variables UI — never into chat, source, docs, scratch files, or commit messages.
4. Update `DATABASE_URL` (and `NAQER_ACTIVE_DATABASE_URL` if used) in Vercel for the environments that need them; do not overwrite unrelated values.
5. Update gitignored local env files (`.env.local`, `.env.test.local`, `.env.prod.bak`, `.env.staging.local` — all confirmed gitignored) outside the commit flow.
6. Redeploy so serverless instances pick up the new value; confirm the new credential works.
7. **Only then** revoke the old credential; confirm dependent services still work and record the Neon audit timestamp (no secret value).
8. Do not apply `security/history-purge` or force-push without explicit owner approval.

**Rotation actually performed: NO.** No Neon console/API/token access was available. Do not claim rotation until steps 1–7 are evidenced by the owner.

## 4. Additional open risks

- **BLOCKED** — Production DB identity unconfirmed (see `DATABASE_CONFIGURATION_AUDIT.md`).
- **BLOCKED** — Vercel env values unknown; no overwrite was attempted.
- Open — Next.js 16.4.2 security advisory nudge on first build (second identical build succeeds). Isolate any upgrade; do not bundle it into this remediation.
- Open — Stale security docs should be corrected after rotation.

## 5. Final statement

Every code-level security control requested is implemented and **VERIFIED** by re-executed tests. No secret appears in source, build output, browser bundles, reports, or terminal output produced by this work. **Credential rotation was not performed and is not claimed.**
