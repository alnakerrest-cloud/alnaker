// scripts/activation-core.mjs
// ==============================================================================
// Core Reusable Transaction Logic for Account Activation & Session Purge
// ==============================================================================
// Shared between:
// 1. scripts/activate-default-owner-prod.mjs (Production Activation)
// 2. scripts/test-critical-activation-concurrency.mjs (Staging Integration Test)
// ==============================================================================

import bcrypt from 'bcryptjs';

/**
 * Executes the atomic activation transaction:
 * 1. Acquires exclusive row-level lock on AdminUser (SELECT ... FOR UPDATE).
 * 2. Verifies account identity (id, role, isActive).
 * 3. Updates AdminUser passwordHash and sets mustChangePassword = true.
 * 4. Purges all active and stored sessions for this user from the Session table.
 * 5. Asserts in-transaction integrity (0 remaining sessions).
 */
export async function executeActivationTransaction(client, {
  targetEmail,
  expectedAccountId,
  expectedRole = 'OWNER',
  targetPassword,
  bcryptRounds = 12,
  onLockAcquired = null,
}) {
  // 1. Exclusive Row Lock via SELECT ... FOR UPDATE (targeting exact ID and Email)
  let selectQuery = `SELECT id, email, role, "isActive", "mustChangePassword", "passwordHash"
                     FROM "AdminUser"
                     WHERE email = $1
                     FOR UPDATE`;
  let selectParams = [targetEmail];

  if (expectedAccountId) {
    selectQuery = `SELECT id, email, role, "isActive", "mustChangePassword", "passwordHash"
                   FROM "AdminUser"
                   WHERE id = $1 AND email = $2
                   FOR UPDATE`;
    selectParams = [expectedAccountId, targetEmail];
  }

  const selectRes = await client.query(selectQuery, selectParams);

  if (selectRes.rows.length === 0) {
    throw new Error(`Account "${targetEmail}" does not exist in the database.`);
  }

  if (selectRes.rows.length > 1) {
    throw new Error(`CRITICAL INTEGRITY ERROR: Found ${selectRes.rows.length} records matching "${targetEmail}".`);
  }

  const admin = selectRes.rows[0];

  // 2. Identity & State Checks
  if (expectedAccountId && admin.id !== expectedAccountId) {
    throw new Error(`Account ID mismatch: expected "${expectedAccountId}", got "${admin.id}".`);
  }

  if (admin.role !== expectedRole) {
    throw new Error(`Role mismatch: expected "${expectedRole}", got "${admin.role}".`);
  }

  if (!admin.isActive) {
    throw new Error(`Account is disabled (isActive === false). Activation aborted.`);
  }

  // Hook for testing concurrency: called when row lock is held
  if (onLockAcquired) {
    await onLockAcquired(admin);
  }

  // 3. Update AdminUser Credentials & Flags
  const newPasswordHash = await bcrypt.hash(targetPassword, bcryptRounds);
  const updateRes = await client.query(
    `UPDATE "AdminUser"
     SET "passwordHash" = $1,
         "mustChangePassword" = true,
         "updatedAt" = now()
     WHERE id = $2`,
    [newPasswordHash, admin.id]
  );

  if (updateRes.rowCount !== 1) {
    throw new Error(`Update affected ${updateRes.rowCount} rows (expected exactly 1).`);
  }

  // 4. Invalidate All Sessions For This User
  const deleteSessionsRes = await client.query(
    `DELETE FROM "Session"
     WHERE "adminId" = $1`,
    [admin.id]
  );
  const deletedCount = deleteSessionsRes.rowCount ?? 0;

  // 5. Post-Modification In-Transaction Integrity Assertions
  const postSessionCheck = await client.query(
    `SELECT count(*)::int as remaining FROM "Session" WHERE "adminId" = $1`,
    [admin.id]
  );
  const remainingSessions = postSessionCheck.rows[0]?.remaining ?? -1;
  if (remainingSessions !== 0) {
    throw new Error(`Integrity check failed: ${remainingSessions} sessions remain for user after purge.`);
  }

  const postAdminCheck = await client.query(
    `SELECT id, email, role, "isActive", "mustChangePassword", "passwordHash"
     FROM "AdminUser"
     WHERE id = $1`,
    [admin.id]
  );
  if (postAdminCheck.rows.length !== 1) {
    throw new Error('Integrity check failed: AdminUser record could not be re-verified.');
  }

  const verifiedAdmin = postAdminCheck.rows[0];
  if (verifiedAdmin.mustChangePassword !== true || verifiedAdmin.role !== expectedRole || !verifiedAdmin.isActive) {
    throw new Error('Integrity check failed: AdminUser state mismatch after update.');
  }

  return {
    admin: verifiedAdmin,
    deletedSessionsCount: deletedCount,
    newPasswordHash,
  };
}
