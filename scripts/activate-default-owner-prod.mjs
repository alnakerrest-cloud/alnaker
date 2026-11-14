// scripts/activate-default-owner-prod.mjs
// ==============================================================================
// Safe Production Transactional Activation Script for Default OWNER
// ==============================================================================
// Verification & Safety Specifications:
// 1. Database Identity Guard:
//    - Strictly verifies hostname === "ep-withered-bread-bemwq8ns-pooler.c-9.us-east-2.aws.neon.tech"
//    - Strictly verifies database === "neondb"
//    - Zero credentials, secrets, or connection strings printed.
// 2. Account Identity Guard:
//    - Strictly verifies email === "admin@naqer-menu.local"
//    - Strictly verifies id === "8d8f3d43-f6da-41cd-ba25-7c54dd49b48a"
//    - Strictly verifies role === "OWNER" and isActive === true
//    - Rejects if row count !== 1 or account is already activated unexpectedly.
// 3. Concurrency & Atomicity:
//    - Runs within an explicit PostgreSQL transaction (BEGIN ... COMMIT / ROLLBACK).
//    - Uses SELECT ... FOR UPDATE to hold an exclusive row lock on AdminUser.
//    - Unidirectional lock ordering (AdminUser -> Session) guarantees deadlock freedom.
// 4. Session Invalidation:
//    - Deletes all sessions for this user within the transaction.
//    - Strictly verifies remaining sessions count === 0 before COMMIT.
//    - Strictly verifies AdminUser state post-update before COMMIT.
// 5. Post-Commit Verification:
//    - STRICTLY READ-ONLY sanity assertion. No SQL mutations outside the transaction.
//    - Transaction rollback is never attempted after successful commit.
// 6. Execution Guard:
//    - Halts immediately unless CONFIRM_ACTIVATE_DEFAULT_OWNER="admin@naqer-menu.local".
// ==============================================================================

import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { executeActivationTransaction } from './activation-core.mjs';

dotenv.config({ path: '.env.local', quiet: true });

// Expected Production Identity Targets
const EXPECTED_HOST = 'ep-withered-bread-bemwq8ns-pooler.c-9.us-east-2.aws.neon.tech';
const EXPECTED_DB = 'neondb';
const EXPECTED_ACCOUNT_ID = '8d8f3d43-f6da-41cd-ba25-7c54dd49b48a';
const TARGET_EMAIL = 'admin@naqer-menu.local';
// Strictly hardcoded temporary credential:
const TARGET_PASSWORD = 'test1234';
const BCRYPT_ROUNDS = 12;

async function activateDefaultOwner() {
  console.log('================================================================');
  console.log(' [SECURITY AUDIT] Pre-flight Activation Safety Verification');
  console.log('================================================================');

  // 1. Explicit Execution Guard
  const confirmation = process.env.CONFIRM_ACTIVATE_DEFAULT_OWNER;
  if (confirmation !== TARGET_EMAIL) {
    console.error(' [GUARD REJECTION] Execution aborted.');
    console.error(` This operation requires explicit confirmation for "${TARGET_EMAIL}".`);
    console.error(' Pass the following environment variable to authorize:');
    console.error(`   CONFIRM_ACTIVATE_DEFAULT_OWNER="${TARGET_EMAIL}"`);
    console.error('================================================================');
    process.exit(1);
  }

  // 2. Database Identity Guard (URL Inspection)
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(' [FATAL] DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  let actualHost = '';
  let actualDb = '';
  try {
    const parsed = new URL(databaseUrl);
    actualHost = parsed.hostname.toLowerCase();
    actualDb = parsed.pathname.replace(/^\//, '').toLowerCase();
  } catch {
    console.error(' [FATAL] DATABASE_URL is not a valid connection URL.');
    process.exit(1);
  }

  if (actualHost !== EXPECTED_HOST) {
    console.error(' [DB IDENTITY GUARD REJECTED] Host mismatch.');
    console.error(` Expected: ${EXPECTED_HOST}`);
    console.error(` Actual  : ${actualHost}`);
    process.exit(1);
  }

  if (actualDb !== EXPECTED_DB) {
    console.error(' [DB IDENTITY GUARD REJECTED] Database name mismatch.');
    console.error(` Expected: ${EXPECTED_DB}`);
    console.error(` Actual  : ${actualDb}`);
    process.exit(1);
  }

  console.log(` [DB GUARD OK] Target host: ${actualHost}`);
  console.log(` [DB GUARD OK] Target db  : ${actualDb}`);

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: true,
    connectionTimeoutMillis: 10000,
  });

  // Verify DB via SQL query before starting transaction
  try {
    const dbCheck = await pool.query('SELECT current_database() as db');
    if (dbCheck.rows[0]?.db !== EXPECTED_DB) {
      console.error(` [DB GUARD REJECTED] SQL current_database() returned "${dbCheck.rows[0]?.db}". Aborting.`);
      await pool.end();
      process.exit(1);
    }
  } catch (err) {
    console.error(' [DB CONNECTION ERROR] Failed to connect to database:', err.message);
    await pool.end();
    process.exit(1);
  }

  const client = await pool.connect();
  let inTransaction = false;

  try {
    console.log(' [TRANSACTION] Starting atomic transaction (BEGIN)...');
    await client.query('BEGIN');
    inTransaction = true;

    // 3, 4, 5, 6: Execute Atomic Activation Transaction & Verification
    const { admin, deletedSessionsCount } = await executeActivationTransaction(client, {
      targetEmail: TARGET_EMAIL,
      expectedAccountId: EXPECTED_ACCOUNT_ID,
      expectedRole: 'OWNER',
      targetPassword: TARGET_PASSWORD,
      bcryptRounds: BCRYPT_ROUNDS,
    });

    // 7. Commit Transaction
    await client.query('COMMIT');
    inTransaction = false;

    console.log('================================================================');
    console.log(' [TRANSACTION COMMITTED] Activation successfully completed.');
    console.log(` - Target Email      : ${TARGET_EMAIL}`);
    console.log(` - Target User ID    : ${admin.id}`);
    console.log(' - Default Password  : Active (temporary)');
    console.log(' - mustChangePassword: true');
    console.log(` - Sessions Purged   : ${deletedSessionsCount} (Remaining: 0)`);
    console.log('================================================================');

    // 8. Post-Commit Read-Only Verification (STRICTLY READ-ONLY)
    const postCommitCheck = await pool.query(
      `SELECT count(*)::int as count FROM "Session" WHERE "adminId" = $1`,
      [admin.id]
    );
    const postCommitSessionCount = postCommitCheck.rows[0]?.count ?? 0;
    if (postCommitSessionCount !== 0) {
      throw new Error(`CRITICAL POST-COMMIT MISMATCH: ${postCommitSessionCount} active session(s) detected after commit.`);
    }
    console.log(' [POST-COMMIT VERIFICATION OK] Confirmed 0 active/stored sessions remaining.');

  } catch (err) {
    if (inTransaction) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('================================================================');
      console.error(' [TRANSACTION ROLLED BACK] An error occurred. All changes reverted.');
      console.error(' Reason:', err.message);
      console.error('================================================================');
    } else {
      console.error(' [POST-COMMIT ERROR]:', err.message);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

activateDefaultOwner();
