# Final Release & Security Status — Naqer Menu

**Date:** 2026-11-13
**Scope:** Git history purge, credential de-hardcoding, publication of the cleaned
history, and post-push verification.

> This document contains **no secret values**. Anything marked "rotation
> required" has **not** been performed by this release process.

---

## 1. Current Release

| Item | Value |
| --- | --- |
| Clean application/security commit | `b4acc0fb441fab4ac5ccf861f54974aa1e64ca06` |
| Previous release commit (old `main`) | `f2b6e67ebf40446b0ad631d91ad3c37c27de556a` |
| Recovery snapshot reference | `pre-purge-snapshot` → `f2b6e67ebf40446b0ad631d91ad3c37c27de556a` |
| Remote branch | `origin/main` |
| Push mechanism | `git push --force-with-lease=main:f2b6e67…` (succeeded) |
| Push timestamp | 2026-11-13 ~13:49 +02:00 (local push completion) |
| Commits reachable from `origin/main` | 11 at force-push time (the 9 preserved release commits + audit commit + credential-hardening commit); 12 including this status document |
| Application tree hash | `2ee38124ddfe72f96d9424180c76836fc2548103` (identical locally and on `origin/main`) |

The status document commit is added on top of `b4acc0f`; the final
`origin/main` tip after publishing this document is the commit that adds this
file (visible with `git log -1 -- docs/FINAL_RELEASE_SECURITY_STATUS.md`).

---

## 2. Historical Cleanup

### 2.1 Artifact purge

| Metric | Result |
| --- | --- |
| Unwanted historical paths removed | **615** (exact match against `remove-paths.txt` inventory) |
| Historical payload removed | **~145.5 MiB** |
| Repository size before | ~**261.81 MB** pack |
| Cleaned branch bundle | ~**3.54 MiB** (measured with `git bundle create`) |
| Production database export (`backups/backup-naqer-verified.json`) | **removed from reachable history** |
| Playwright traces / QA logs / screenshots / PDF-image artifacts | **removed from reachable history** |
| `.phase1-backup/` | **removed from reachable history** |
| Preserved commits / merge / authors / dates / messages | **yes** (graph and metadata preserved) |

### 2.2 Additional credential scrub (beyond the artifact purge)

The prepared clean baseline (`5d85c31113db70721c0b6328f1894da4b1b51097`) still
contained the formerly hardcoded demo passwords in *historical* revisions of
eight source files, plus a 64-hex `SESSION_SECRET` sample and a Cloudinary key
sample in `PRODUCTION_DEPLOYMENT_GUIDE.md`.

Because Phase 4 requires that **no real credentials remain in reachable Git
history**, the cleaned commit chain was rewritten a second time to replace those
byte strings in every reachable commit:

- 8 source blobs containing the demo passwords were rewritten.
- The documentation sample secret/key were replaced with placeholders.
- Commit count, topology, merge structure, author/committer identities,
  timestamps, and commit messages were preserved.
- The **final application tree is byte-identical** to the tree before the scrub
  (verified: `2ee38124ddfe72f96d9424180c76836fc2548103`).

Mapping of the prepared baseline through the scrub:

| Stage | Commit |
| --- | --- |
| Prepared clean baseline | `5d85c31113db70721c0b6328f1894da4b1b51097` → `ed014fb560c4686d665861b650f3c2f94dc19697` |
| Audit documentation commit | `5f38d92…` → `9084edb5c7e2c4cd468f9cd6c7df13927d963356` |
| Credential-hardening commit | `0301eda…` → `b4acc0fb441fab4ac5ccf861f54974aa1e64ca06` |

### 2.3 Verification result

- Unwanted paths present in reachable history: **0 / 615**
- `backups/backup-naqer-verified.json` reachable from `origin/main`: **no**
- Playwright traces reachable: **no**
- `.env` / `.env.local` / `.env.production` tracked at HEAD: **no**
- Prisma migrations tracked at HEAD: **3**
- Pattern-level artifact scan (backups, traces, QA logs, screenshots, PDFs):
  **0 hits**
- Formerly hardcoded demo passwords reachable from `origin/main`: **0**
  (working tree **0**, all 11 commits **0**)
- Historical 64-hex `SESSION_SECRET` sample reachable: **0**
- Historical Cloudinary sample key reachable: **0**

The Git-native scanner (same rules used for the audit) reports only placeholder
or `process.env.*` matches at HEAD; no live credential value was found.

---

## 3. Credential Security

Both administrative accounts are **database rows** seeded by scripts. The
passwords are hashes in the `AdminUser` table; `SESSION_SECRET` is an
environment-provided HMAC key used by `lib/auth.ts`.

| Credential | Status | Evidence | Action |
| --- | --- | --- | --- |
| `OWNER` (`admin@naqer-menu.local`) | **Compromised — rotation required** | Formerly hardcoded password was bcrypt-verified against the hash in the historical production export | Rotate via `npm run db:provision-owner` with `ALLOW_OWNER_OVERWRITE=1` and `CONFIRM_PRODUCTION_OVERWRITE=<email>`; use a new strong password supplied only through the environment |
| `EDITOR` (`editor@naqer-menu.local`) | **Compromised — rotation required** | Same exposure, same bcrypt verification | Rotate with `scripts/seed-editor.mjs` plus `SEED_EDITOR_PASSWORD` (production-gated) **or** deactivate the account if unused |
| `SESSION_SECRET` | **Rotation required** | Environment key for session HMAC; a historical 64-hex sample existed in docs; all sessions must be invalidated | Generate a fresh value (e.g. `openssl rand -hex 32`), set it in the hosting provider and local/CI environments, redeploy |
| `DATABASE_URL` / Neon password | Not found in history | Live value never appeared in any reachable blob | Rotate as general hygiene if desired |
| Cloudinary API key/secret | Not found in history | Live values never appeared in any reachable blob | Rotate as general hygiene if desired |

Hardcoded credentials were removed from source:

- `app/admin/login/page.tsx` — no longer displays a demo password.
- `scripts/seed-admin.mjs` / `scripts/seed-editor.mjs` — require
  `SEED_ADMIN_PASSWORD` / `SEED_EDITOR_PASSWORD` (min 12 chars); the editor
  script no longer logs the password.
- `scripts/live-manual-verification.mjs`,
  `scripts/test-dynamic-promotional-offers.mjs`,
  `scripts/test-product-photography-qa.mjs` — require `QA_ADMIN_PASSWORD`.
- `tests/helpers.ts` — non-production fixtures (`test-only-*`), overridable with
  `E2E_ADMIN_*` / `E2E_EDITOR_*`.
- `tests/05-crud-acceptance.spec.ts` — reuses the shared fixtures.
- `.env.example` and `PRODUCTION_DEPLOYMENT_GUIDE.md` — placeholders only,
  including `SESSION_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_SECRET`.

**No credential was rotated by this task.** No production database connection,
migration, or record modification was performed.

---

## 4. Verification

| Check | Result |
| --- | --- |
| Repository root | `E:\real projects\naqer-menu` |
| Branch before publication | `security/history-purge` |
| Remote `main` before push | `f2b6e67ebf40446b0ad631d91ad3c37c27de556a` (unchanged; no new refs) |
| `npm run typecheck` | **PASS** (exit 0) |
| `npm run build` | **PASS** (exit 0) against an **unreachable local `DATABASE_URL`**, so no production DB was contacted |
| `git diff --check` | **PASS** (exit 0) |
| Working tree before push | clean |
| Historical Git-native scanner | **PASS** — no live credentials, no backup, no artifact paths |
| Unwanted-path verification | **PASS** — 0 / 615 in reachable history |
| `pre-purge-snapshot` push | **PASS** — `f2b6e67` |
| Force-with-lease push | **PASS** — old release was still `f2b6e67` |
| Remote verification | **PASS** — `origin/main` = `b4acc0fb441fab4ac5ccf861f54974aa1e64ca06`; remote tree = local tree; backup path absent |
| Recovery copy | Retained at `E:\naqer-menu-recovery-20261113-131451` (mirror + bundle) |

Application tree preservation: `git diff --name-status 5d85c31 HEAD` lists only
the intended security/configuration files (8 credential files, `.env.example`,
`PRODUCTION_DEPLOYMENT_GUIDE.md`, `FINAL_GIT_FILE_CLASSIFICATION.md`, `.gitignore`,
and the two audit documents). No application source file disappeared.

---

## 5. E2E Limitation

- **9 safe read-only E2E tests previously passed** on the unchanged
  application tree.
- **46 write-path tests remain unexecuted.** They were deliberately not run
  because `.env.local` points at a live (Neon) database, and the task forbids
  destructive tests against production.
- These tests must be executed later against **isolated staging
  infrastructure** before a production write-path sign-off.

Write-path E2E has **not** been validated against production and must not be
claimed as passing.

---

## 6. Deployment Prerequisites

Complete these in order **before** deploying. None of them has been done yet.

1. **Set production environment variables securely** in the hosting dashboard
   (never in Git): `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `SESSION_SECRET`,
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
   `CLOUDINARY_SECURE_FOLDER`.
2. **Rotate the `OWNER` password** with `npm run db:provision-owner`
   (`ALLOW_OWNER_OVERWRITE=1`, `CONFIRM_PRODUCTION_OVERWRITE=<owner email>`,
   new password supplied via environment only).
3. **Rotate or deactivate the `EDITOR` account** as described in
   `PRODUCTION_DEPLOYMENT_GUIDE.md` §4.
4. **Generate a new `SESSION_SECRET`** (≥ 32 random characters) and set it in
   every environment; this invalidates all existing sessions.
5. **Provision/verify Cloudinary credentials** for the production account.
6. **Verify the production `DATABASE_URL`** (pooled connection, SSL) and take a
   fresh backup.
7. **Run `npx prisma migrate deploy`** only after the backup and a staging
   verification. No migration has been run by this task.
8. **Deploy** the application (`b4acc0f` or the later status-document commit).
9. **Run post-deployment smoke tests** (public menu AR/EN, WhatsApp ordering,
   admin login with the rotated OWNER account, LiveSync).

---

## 7. Explicit Non-Actions

- No deployment was performed.
- No production migration was run.
- No production database record was read, modified, or written by this task
  (the build used an unreachable placeholder database).
- No credential was created, displayed, or rotated.
- No secret value appears in this document or in any reachable Git object.
