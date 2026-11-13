# Final Git History Security Audit — Naqer Menu

**Audit date:** 2026-11-13
**Repository:** `E:\real projects\naqer-menu` (spec referenced `E:\naqer-menu`, which does not exist)
**Remote:** `https://github.com/EbrahimShoeib1999/naqer-menu.git`
**Branch audited:** `main`

> This document contains no secret values. All credential material is referenced by
> location, type, and status only. Values are redacted.

---

## 1. Repository, Branch and Baseline

| Item | Value |
|---|---|
| Repository root | `E:\real projects\naqer-menu` |
| Current branch | `main` |
| HEAD at start of audit | `f2b6e67ebf40446b0ad631d91ad3c37c27de556a` |
| `origin/main` at start of audit | `f2b6e67` (identical, not ahead/behind) |
| Remote HEAD after `git fetch --prune --tags` | `f2b6e67` |
| Tags | none |
| Local branches | `main`, `backup/pre-history-cleanup-f2b6e67` (both `f2b6e67`) |
| Remote branches | `origin/main` → `f2b6e67` |
| Commits in history | 9 |
| Rebase / merge commits | 1 merge (`e8b6867`, 2 parents) |
| Repository visibility | **Private** (anonymous GitHub API/web returns 404; authenticated `ls-remote` succeeds) |
| Working tree at start | clean except untracked `b.txt` (a stray, non-committed `next build` log — not a credential file) |
| Audit deliverables | committed locally on `main` (one commit ahead of `origin/main`) — **not pushed** |

Release history (oldest → newest):

```
7b058da  first commit
55b3559  first commit
36f016a  release: finalize Naqer Menu production baseline
e8b6867  Merge: integrate remote changes for release baseline   <-- artifacts introduced here
f27dbda  release: finalize Naqer Menu production baseline
cd43ad8  fix: resolve release blockers and verify Naqer Menu
92d2e32  chore: strengthen gitignore to prevent artifact and backup commits
c3cf8ea  docs: add final post-release acceptance report
f2b6e67  fix: resolve release blockers and verify Naqer Menu    <-- release baseline
```

---

## 2. Recovery Point (verified before any rewrite)

| Item | Value |
|---|---|
| Recovery directory | `E:\naqer-menu-recovery-20261113-131451` |
| Bare mirror | `E:\naqer-menu-recovery-20261113-131451\naqer-menu.git` |
| Full-history bundle | `E:\naqer-menu-recovery-20261113-131451\naqer-menu-all-refs.bundle` (147,573,511 bytes) |
| Refs captured | `refs/heads/main`, `refs/heads/backup/pre-history-cleanup-f2b6e67`, `refs/remotes/origin/main`, `refs/remotes/origin/HEAD`, `HEAD` |
| Bundle integrity | `git bundle verify` → "The bundle records a complete history" / "is okay" |
| Mirror integrity | `git fsck` → no missing/corrupt objects (10 dangling local blobs only, pre-existing) |

The recovery copy lives outside the repository, preserves every ref and object, and was
created fresh (no existing recovery copy was overwritten). No destructive operation was
performed before this verification.

---

## 3. Complete Historical Inventory

Method: `git rev-list --all` → `git ls-tree -r -l` for every commit, aggregated by path.
This covers all branches, merges, and files that existed in blobs but are absent from HEAD.

| Metric | Value |
|---|---|
| Commits examined | 9 |
| Tree entries examined | 3,534 |
| Unique paths ever committed | 985 |
| Paths present at HEAD | 370 |
| **Paths absent from HEAD (historical artifacts)** | **615** |
| Aggregate size of those paths (unique max-version sizes) | **152,590,915 bytes (~145.5 MiB)** |
| Tree size, `f27dbda` | 983 files / 164,332,467 bytes |
| Tree size, `f2b6e67` (HEAD) | 370 files / 11,906,873 bytes |

**Introducing commit:** all 615 paths first appear in **`e8b6867`** (the merge commit), whose
tree jumps from 30 files to 983 files. `f27dbda` re-committed the same 983-file tree; later
commits removed the artifacts from the tracked tree. No artifact is reachable from `HEAD`.

Full per-file inventory (path, category, type, size, introducing commit, HEAD presence,
sensitivity, recommended action) is in:

- [`docs/FINAL_GIT_HISTORY_ARTIFACT_INVENTORY.csv`](FINAL_GIT_HISTORY_ARTIFACT_INVENTORY.csv) — all 615 rows

### 3.1 Category summary

| Category | Files | Size (MiB) |
|---|---:|---:|
| D — Playwright QA screenshots/artifacts (`qa-premium/`) | 101 | 57.58 |
| D — Final QA evidence (`qa-final/`) | 69 | 41.90 |
| D — PDF image extraction (`pdf-images/`) | 145 | 24.88 |
| D — Playwright test artifacts/traces (`test-results/`) | 212 | 8.25 |
| D — Root-level QA/E2E screenshots | 62 | 6.57 |
| E — Client menu PDF (`50500.pdf`) | 1 | 4.88 |
| D — Logs | 12 | 0.61 |
| D — Playwright HTML report | 1 | 0.51 |
| E — Business catalog JSON exports | 3 | 0.09 |
| **E — Production database backup** | **1** | **0.18** |
| D — `.phase1-backup/` source snapshot | 3 | 0.04 |
| D — Temporary PowerShell runners (`run-*.ps1`) | 5 | <0.01 |
| **Total** | **615** | **145.5** |

### 3.2 Reconciliation with the previous audit's "605"

This audit found **615** paths, not 605. The most likely explanation is that the previous
count excluded 10 items that are not screenshots/traces/backups:

- `.phase1-backup/` (3 files: `.gitignore`, `package.json`, `package-lock.json`)
- `run-full.ps1`, `run-ls.ps1`, `run-ls4.ps1`, `run-ls-45.ps1`, `run-rest.ps1` (5)
- `50500.pdf` (1)
- `qa-final/_invalid-upload.txt` (1)

**3 + 5 + 1 + 1 = 10.** Every one of the 615 is individually listed in the CSV, so no
artifact is uncounted or undifferentiated.

---

## 4. Historical Secret Scanning

### 4.1 Tools actually available

| Tool | Status |
|---|---|
| Gitleaks | **Not installed**; `winget`/`scoop`/`choco` unavailable on this host |
| TruffleHog | Not installed |
| `git-filter-repo` | Not runnable (the host's `python` is a Microsoft Store stub that hangs) |
| Docker | Not installed |
| A custom **git-native blob scanner** (Node.js + `git cat-file --batch`) | **Executed** — see below |

No repository content was uploaded to any external service. All scanning was local.

### 4.2 Scanner design and coverage

- Enumerates every reachable blob via `git rev-list --objects --all` (892 blobs).
- Streams contents through `git cat-file --batch`; skips binaries (581 image/font/PDF blobs),
  scans 311 text blobs.
- Rules: private-key blocks, PostgreSQL/MySQL/MongoDB/Redis URIs, Neon hosts, Cloudinary
  URL/kv/legacy signature patterns, AWS keys, GitHub/Slack/Stripe/Google/SendGrid tokens,
  JWT literals, `AUTH_SECRET`/`SESSION_SECRET`/`JWT_SECRET`, DB passwords, `DATABASE_URL`,
  admin/seed passwords, bearer tokens, plus PII patterns (email, E.164 phone) for awareness.
- Placeholder-aware: values matching `<...>`, `your_*`, `changeme`, `${VAR}`,
  `process.env.*`, sequential digit strings, etc. are flagged as placeholders, not secrets.
- Every hit is reported with **rule, severity, blob, path, commits, occurrence count, and a
  masked sample** (`abc********xyz (len=N)`); values are never emitted.

### 4.3 Scan results — original history

- **54 rule hits** across 311 text blobs.
- 8 hits vanished after the purge; 46 remain (all at HEAD; see §7).

Additional targeted checks executed:

| Check | Result |
|---|---|
| Live `DATABASE_URL` value present anywhere in history | **No** |
| Live `SESSION_SECRET` value present anywhere in history | **No** |
| Live `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` present anywhere | **No** |
| `.env`, `.env.local`, `.env.production`, keys/certs (`*.pem`, `*.key`, `id_rsa`, `*.p12`, `*.pfx`) ever committed | **No** — only `.env.example` (placeholder-only) |
| Connection strings in historical logs (`dev.log`, `server.log`, `build*.log`, `pw-*.log`, `diag.log`) | **None** (0 env-key mentions, 0 `postgres://` URIs) |
| Credential values in historical docs | Placeholders only (verified structurally, §7) |
| Historical DB backup contents | Real export — **2 bcrypt admin password hashes**, 151 products, 18 categories, 2 branches, settings, image records |
| Plaintext passwords in current source vs. backup hashes | **BCRYPT MATCH** for both admin accounts — see §6 |

Limitations: no commercial scanner was available, so results are from the documented custom
scanner plus `git cat-file` inspection; binary blobs (images, PDF) are not text-scanned —
they were manually classified by path/type and are not expected to carry credentials.

---

## 5. Actual Exposure Assessment

| # | Finding | Introduced | At HEAD? | Pushed to GitHub? | Real or placeholder? | Status |
|---|---|---|---|---|---|---|
| 1 | Production DB export `backups/backup-naqer-verified.json` (2 `AdminUser` bcrypt hashes, catalog, branches, settings; export timestamp `2026-11-08T20:17:56Z`) | `e8b6867` | No (removed) | Yes (in `f27dbda`/`e8b6867`) | **Real production data** | Sensitive historical exposure |
| 2 | Plaintext demo credentials for the two admin accounts, hardcoded in `scripts/seed-admin.mjs`, `scripts/seed-editor.mjs`, `tests/helpers.ts`, `tests/05-crud-acceptance.spec.ts` | earliest source commit, still present | **Yes** | Yes | **Real** — bcrypt-verified against the backup hashes | **Confirmed active-secret exposure** |
| 3 | Playwright trace + HTML report with login form values, demo emails, session/network metadata | `e8b6867` | No | Yes | Real captured UI/session data | Sensitive historical exposure |
| 4 | Full product catalog / image-mapping JSON + `50500.pdf` (client menu) | `e8b6867` | No | Yes | Real client business data (no credentials) | Business-data exposure |
| 5 | `SESSION_SECRET`-looking 64-hex value in `PRODUCTION_DEPLOYMENT_GUIDE.md` | `e8b6867` | Yes | Yes | Real-looking, **differs** from the current live value | Historical secret exposure, validity unknown |

**Exposure scope:** the GitHub repository is private, so the artifacts were not publicly
indexed. Anyone with repository access, forks, CI logs, or a local clone could still read
them. Findings 2 and 5 are present at HEAD and therefore survive any history rewrite.

### 5.1 Why finding 2 is confirmed (and not a test fixture)

The historical backup contains two `AdminUser` rows (roles `OWNER` and `EDITOR`) with bcrypt
hashes. Using `bcryptjs` locally, the **plaintext passwords committed in the current tree
match those hashes** (four independent matches across the seed scripts and tests). The seed
scripts that set them are only gated by `NODE_ENV === "production"` plus an
`ALLOW_DEMO_ADMIN=1` override — a guard that was evidently bypassed when the database was
seeded, because the live database's own export contains those hashes.

Validity was **not** verified against the live database (connecting to it is prohibited by
the task constraints). Treat the credentials as valid until rotated.

---

## 6. Credential Rotation Recommendations

**History cleanup is not a substitute for rotation.** Finding 2 exists at HEAD; rewriting
history does not remove it.

| Priority | Action | Where | Notes |
|---|---|---|---|
| **P0 — do now** | Change the password of the `OWNER` account (`admin@naqer-menu.local`) | Production DB via `npm run db:provision-owner` with a new `OWNER_PASSWORD`, or the admin UI | Demo account with a publicly known password; bcrypt-verified match |
| **P0 — do now** | Change or disable the `EDITOR` account (`editor@naqer-menu.local`) | Production DB / admin UI | Same exposure |
| **P1 — do now** | Rotate `SESSION_SECRET` | Vercel → Environment Variables; local `.env.local`; CI | Invalidates all existing sessions and any session material captured in the historical Playwright traces |
| **P1** | Remove hardcoded demo passwords from `scripts/seed-admin.mjs`, `scripts/seed-editor.mjs`, `tests/helpers.ts`, `tests/05-crud-acceptance.spec.ts` | Source | Read from `E2E_ADMIN_PASSWORD` / `SEED_ADMIN_PASSWORD` etc., fail closed if unset, and refuse to seed in production without explicit env-provided values |
| **P2** | Rotate the `SESSION_SECRET` sample if it was ever used in production | Provider | Value differs from the current one, so it is either stale or an example; rotating is cheap |
| **Not required by evidence** | `DATABASE_URL` / Neon password, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | — | The current live values never appear in any reachable blob; rotate only as general hygiene |

Host environment variables that must be updated after rotation: `SESSION_SECRET` (Vercel
Production/Preview + local `.env.local` + CI secrets). Database account passwords are rows
in `AdminUser`, not environment variables. No provider account was accessed during this
audit, and **no credential is claimed to have been revoked**.

---

## 7. False Positives (retained, not secrets)

| Hit | Location | Why it is not a secret |
|---|---|---|
| `process.env.CLOUDINARY_API_KEY` / `_SECRET` | `lib/cloudinary.ts`, `scripts/tmp-*.mjs`, `scripts/verify-cloudinary.mjs`, `tests/06-image-lifecycle.spec.ts` | Environment-variable references, not literal values (length/suffix analysis confirms) |
| `<random-secure-32-character-secret>`, `<cloudinary-api-secret>`, `<cloudinary-api-key>`, `your_cloudinary_api_secret_here` | `DELIVERY_AND_OPERATIONS_MANUAL.md`, `PRODUCTION_DEPLOYMENT_GUIDE.md` | Documentation placeholders |
| `postgresql://<user>:<password>@<host>.neon.tech/...`-style strings | Same docs | Structural analysis: username literally `user`, password literally `password`, host literally `host.neon.tech` — placeholder, not a real connection string |
| Numeric Cloudinary key/secret examples (`123...345`, 15/23/31 chars) | Same docs | Sequential/placeholder examples, not the live key |
| `CLOUDINARY_SECURE_FOLDER` / `CLOUDINARY_CLOUD_NAME` string matches across many files | App + docs | Folder/cloud identifiers, not credentials (cloud name is visible in public image URLs by design) |
| Business phone number and `@naqer-menu.local` demo emails | `lib/site.ts`, tests, docs | Public business contact / local demo addresses |
| Prisma internal `user@example.com` strings | `lib/generated/prisma/**` | Generated client boilerplate |

---

## 8. Decision: Is History Rewriting Necessary?

### **HISTORY PURGE REQUIRED**

Reasons (Section 6 criteria met):

1. **A real production database export** with admin password hashes and full business data is
   in history (`backups/backup-naqer-verified.json`).
2. **Playwright traces and the HTML report** capture login/session material.
3. Real client business data and a client document are in history.
4. 145.5 MiB of generated artifacts inflate the pack to **261.8 MB**, making every clone and
   CI checkout ~70× larger than necessary (cleaned pack: **3.59 MB**).

A purge alone is **not sufficient**, because the plaintext admin credentials are still at
HEAD. Rotation (§6) is mandatory regardless of the rewrite.

---

## 9. Prepared Cleanup (local only, not published)

Performed in an isolated clone: `E:\naqer-menu-history-clean\work`.
The original repository was not rewritten in place; its history still ends at `f2b6e67`.

| Item | Value |
|---|---|
| Tool | `git filter-branch --index-filter` (built-in; `git-filter-repo` unavailable because Python is broken on this host) |
| Branch rewritten | `main` only (backup branch and `origin/*` untouched) |
| Paths removed | exactly the 615 paths in `docs/FINAL_GIT_HISTORY_ARTIFACT_INVENTORY.csv`, selected by full path (never by blanket directory) |
| Excluded paths | none of `app/`, `components/`, `lib/`, `prisma/`, `public/`, `tests/`, `scripts/`, `package*.json`, docs, or any tracked-at-HEAD file |
| Result branch | `security/history-purge` (local branch in the original repo) |
| Cleaned baseline commit | **`5d85c31113db70721c0b6328f1894da4b1b51097`** (cleaned equivalent of `f2b6e67`) |
| Commit count | 9 → 9 (structure, authors, dates, messages, and the merge commit's two parents preserved) |
| Rewritten commit map | `f2b6e67→5d85c31`, `c3cf8ea→44e613b`, `92d2e32→3513644`, `cd43ad8→22bfbce`, `f27dbda→c0fa267`, `e8b6867→c0e3f38`, `36f016a→36f016a`*, `55b3559→55b3559`*, `7b058da→7b058da`* |

\* Commits whose trees contained none of the 615 paths keep their original hashes.

### 9.1 Verification results

| Check | Result |
|---|---|
| Cleaned HEAD tree vs. release tree | **identical** `7dbe6e4b88bfe4f397999178bebc5815e1327d46` (both `f2b6e67^{tree}` and `5d85c31^{tree}`) |
| `git diff f2b6e67^{tree} 5d85c31^{tree}` | empty |
| File count at cleaned HEAD | 370 (same as `f2b6e67`) |
| Commit messages / authors / dates | preserved (verified line-by-line) |
| Merge commit | still a 2-parent merge (`c0e3f38`) |
| Unwanted paths reachable from cleaned refs | **0** |
| DB backup blob reachable | **No** (`git cat-file -e` → not a valid object) |
| Trace/report blobs reachable | **No** |
| Secret scan re-run on cleaned history | 46 hits, all originating at HEAD: documentation placeholders, `process.env.*` references, public contact data, and the hardcoded demo credentials of finding 2. The 8 artifact-borne hits (DB backup, traces, report) are gone |
| `npm run typecheck` | **PASS** (0 errors, on the identical tree) |
| `npm run build` | **PASS** — executed on the audited tree with `DATABASE_URL` deliberately overridden to an unreachable local address (`127.0.0.1:5999`) so **no production connection occurred**: exit 0, "Compiled successfully", full route table emitted. The release log `b.txt` (2026-11-12 23:24, after `f2b6e67`) independently records a passing build |
| E2E (9 passing) | **Not executed in this audit** — the suite logs into `admin@…` and performs reads/writes against the database in `.env.local`, which is a Neon cloud/pooler database. Connecting to or mutating it is explicitly prohibited. Prior acceptance evidence records 9 passed (security, responsive, smoke), and the cleaned tree is byte-identical, so no regression is possible from the rewrite |
| Pack size | **261.81 MB → 3.59 MB** (98.6% reduction); 892 → 312 blobs |
| Working application | untouched (`git status` shows no source modifications from the cleanup) |

If any of these checks had failed, the recovery copy was to be restored and the operation
stopped. None failed.

---

## 10. `.gitignore` and Current Tree

`.gitignore` already blocked SQL dumps, backups, logs, Playwright output, QA folders,
`pdf-images/`, screenshots, build output, and `node_modules`. One gap was found and fixed:

```diff
-.env
-.env.local
-.env*.local
+# Environment files: real values must never be committed.
+# Example templates stay trackable via the negations below.
+.env
+.env.*
+!.env.example
+!*.env.example
```

A second gap was found: `*.sql` (added to block database dumps) also ignored **required
Prisma migrations**, so a newly generated migration would silently stay untracked. Fixed
with a scoped negation placed after the dump rules:

```diff
 *.sql
 *.dump
 *.backup
+
+# Prisma migration SQL is required source — keep it trackable even though `*.sql`
+# above targets database dumps.
+!prisma/migrations/**/*.sql
```

Verified: `prisma/migrations/*.sql` is no longer ignored, while `dump.sql`, `backups/*`,
`.env.*`, and `.env.local` remain ignored and `.env.example` remains trackable.

| Check | Result |
|---|---|
| Sensitive file tracked at HEAD | None (`.env.example` is placeholder-only) |
| Generated artifact tracked at HEAD | None |
| Required source accidentally ignored | No — after adding the `prisma/migrations/**/*.sql` exception, required source and migrations are trackable (`git ls-files` unchanged; only env/ignore rules changed) |
| Secrets in frontend bundles | No — Cloudinary/DB access is server-side; `.env.example` exposes only `NEXT_PUBLIC_SITE_URL` |
| `.env.example` contents | `NEXT_PUBLIC_SITE_URL=https://menu.example.com` only |

Remaining stray item: untracked `b.txt` (a build log). It is not tracked and not a secret;
delete it at will.

Pre-existing inconsistency (not introduced by this audit): 27 files under
`lib/generated/prisma/` are tracked even though `.gitignore` marks that directory as
generated. They contain no secrets. Untracking them would change the release tree and is
left as a separate, deliberate decision.

---

## 11. Remaining Risks

1. **Active admin/editor passwords remain at HEAD** until rotated and removed from source.
   This is the highest-severity open item and cannot be fixed by history rewriting.
2. **Remote GitHub history remains un-purged** until owner-approved force-push.
3. Even after a force-push, GitHub retains unreachable objects for a period; a complete
   server-side purge may require GitHub Support. Forks (if any) keep their own copies.
4. Local clones contain the old objects until `gc`/re-clone; the recovery copy intentionally
   keeps them.
5. `.git/objects` currently contains ~26 MB of pre-existing `tmp_obj_*` garbage from earlier
   interrupted Git operations (local only; harmless, removable with `git gc`).
6. Playwright `trace`/`screenshot` capture is enabled (`trace: "retain-on-failure"`,
   `screenshot: "on"`); despite `test-results/` being ignored, this will keep generating
   credential-bearing artifacts on disk. Consider disabling traces or masking form values.

---

## 12. Force-Push Authorization Package (NOT EXECUTED)

| Item | Value |
|---|---|
| Original remote HEAD | `f2b6e67ebf40446b0ad631d91ad3c37c27de556a` |
| Proposed cleaned HEAD | `5d85c31113db70721c0b6328f1894da4b1b51097` (`security/history-purge`) |
| Refs whose history changes | `refs/heads/main` only |
| Refs unchanged | `backup/pre-history-cleanup-f2b6e67` (local), all tags (none exist) |
| Remote branches deleted | none |

Exact commands that would be used **only after explicit owner approval**:

```bash
# 1. Safety snapshot of the old remote tip (normal, non-destructive push)
git push origin f2b6e67:refs/heads/pre-purge-snapshot

# 2. Replace main with the cleaned history
git push --force-with-lease=main:f2b6e67 origin security/history-purge:main

# 3. Replay the local audit commit(s) (report + .gitignore hardening) onto cleaned main
git rebase --onto security/history-purge f2b6e67 main
git push origin main
```

Rollback (old objects are preserved locally and in the recovery bundle):

```bash
git push --force-with-lease=main:5d85c31 origin f2b6e67:main
# or restore locally:
git fetch "E:\naqer-menu-recovery-20261113-131451\naqer-menu-all-refs.bundle" main
git update-ref refs/heads/main f2b6e67
```

Collaborator impact: every existing clone must be re-cloned (or hard-reset to the new
`main`); open PRs/branches based on old commits must be rebased; commit hashes change for
all commits from `e8b6867` onward; GitHub will show the old history as unreachable.

---

## 13. Status Summary

| Dimension | Status |
|---|---|
| Current repository cleanliness | **Not clean** — demo admin credentials hardcoded at HEAD; also a stray build log |
| Historical repository cleanliness | **Dirty** — DB export, traces, business data in history |
| Prepared local cleanup | **Ready and verified** (`security/history-purge`, tree-identical to release) |
| Credential rotation | **Not performed** (owner/provider action required) |
| Remote GitHub cleanup | **Not performed** (approval required) |
| Deployment readiness | **Blocked** until rotation + purge approval |

## 14. Recommended Next Action

1. Rotate the OWNER and EDITOR passwords and `SESSION_SECRET` **now** (§6).
2. Review this report and the 615-row CSV.
3. Approve (or reject) the force-push package in §12.
4. After approval: execute §12, then remove the demo passwords from source and switch tests
   to env-provided credentials, re-run typecheck/build/E2E against an isolated staging DB.
5. Delete the local recovery copy only after the new remote history is verified by a fresh
   clone.

---

## FINAL VERDICT

# `HISTORY PURGE PREPARED — OWNER APPROVAL REQUIRED`

A local, verified history purge is ready on branch `security/history-purge`. The repository
is **not** considered secure yet: real production admin credentials remain exposed at HEAD
and the remote still serves the un-purged history. Nothing was pushed, force-pushed, deleted
remotely, or deployed.
