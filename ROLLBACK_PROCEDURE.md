# Rollback Procedure — Naqer Menu Checkout Remediation

**Date:** 2026-11-20 · **Status:** **VERIFIED (documented)** — not executed (no deployment).

## 0. Constraints (never violate)

- **Never** reset, truncate, drop, or recreate the production database.
- **Never** delete or modify genuine customer, order, address, or menu data as a rollback step.
- **Never** rewrite Git history or force-push as a rollback step.
- Preserve logs and evidence before changing anything.
- Stop risky testing immediately when an incident is detected.

## 1. Pre-deployment prerequisites (complete before any release)

1. Record the exact current successful Vercel Production deployment ID and its commit SHA (expected pre-fix build: `de624ef0`).
2. Record the owner-confirmed production Neon project / database / branch / schema / role.
3. Record (without printing values) which secure env vars will be changed and their intended targets.
4. Confirm `npx prisma migrate status` against the confirmed production DB is clean and no migration is pending.
5. Keep the previous deployment available for instant rollback.

## 2. Decision tree

| Symptom after deployment | Likely cause | Action |
|---|---|---|
| Checkout 500 / DB connection error | Env var wrong or credential rotated before update | Fix env var / credential first; if unresolved, roll back deployment |
| Incorrect totals | Application defect | Roll back deployment |
| Duplicate orders / duplicate `OrderItem` | Application defect | Roll back deployment; **do not** delete data automatically — investigate first |
| Customer data corruption | Application or DB issue | Stop all testing; preserve evidence; escalate; do **not** delete rows |
| Auth failures | `SESSION_SECRET` rotation invalidated cookies | Coordinate secret rotation + redeploy; roll back if unresolved |
| Unexpected production errors | Unknown | Stop, preserve evidence, investigate, then roll back if safe |

## 3. Application rollback steps (Vercel)

1. In Vercel → Project → Deployments, locate the last known-good **Production** deployment (recorded in §1).
2. Use **Promote to Production** on that deployment (preferred) or use the deployment's rollback action.
3. Confirm the production domain immediately serves the previous build; check `/api/content-version` and a read-only page load.
4. If env values were changed as part of the release and the old deployment requires the previous values, restore the previous secure env values in Vercel (values supplied by the owner; never printed) and redeploy the previous deployment.
5. Record the rollback deployment ID, timestamp, and verification results.

**Known trade-off:** rolling back restores the pre-fix build, which reintroduces the checkout 500. Rollback is a containment measure, not a fix. Re-apply the fix only after the root cause of the failed release is corrected and gates are re-run.

## 4. Database rollback

- No schema migration is part of this remediation (`prisma/migrations` unchanged; 4 migrations already applied). Therefore **no database rollback action is required or permitted**.
- If a future migration is introduced, its rollback SQL must be inspected and approved before deployment; never reset the database.
- If the credential was rotated as part of the release, coordinate with Neon: restore the prior credential only if the rolled-back deployment still depends on it, then revoke it again when the fix is re-applied. Never print either value.

## 5. Data incident handling

1. Freeze further test traffic.
2. Export/preserve relevant logs, error IDs, and DB row IDs (no secrets).
3. Identify affected records by idempotency key / order number; determine scope.
4. Correct application/config first; restore data only from an approved backup with owner authorization and a tested procedure.
5. Report exact recovery status. Never claim data integrity without a DB verification query.

## 6. Post-rollback verification

| Check | Status to require |
|---|---|
| Production site loads | VERIFIED |
| Checkout behaviour documented (expected broken on old build) | VERIFIED |
| No new duplicate/partial orders attributable to the release | VERIFIED by DB query |
| Rollback deployment ID recorded | VERIFIED |
| Incident report written | VERIFIED |

## 7. Final statement

Procedure documented and **VERIFIED as written**. It was **NOT APPLICABLE** in this work because no deployment occurred.
