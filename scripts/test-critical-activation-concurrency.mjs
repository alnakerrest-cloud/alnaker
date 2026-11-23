// scripts/test-critical-activation-concurrency.mjs
// ==============================================================================
// الفحص الحرج لتزامن تسجيل الدخول مع تفعيل الحساب (Concurrency & Serialization)
// ==============================================================================
// الهدف:
// إعادة تشغيل السيناريو الحرج المطلوب في البند 7 و 8:
// 1. تشغيل Login transaction كاملة (بمنطق createAtomicLoginSession المطابق لـ lib/auth.ts)
// 2. بالتزامن التام مع Activation transaction (المطابقة لـ scripts/activate-default-owner-prod.mjs)
// 3. التحقق الرياضي والعملي من أن:
//    أ) Activation ينتظر (Blocks) على قفل الصف أثناء تنفيذ Login
//    ب) Login يكمل وينشئ الجلسة
//    ج) Activation يستيقظ ويحذف الجلسة فوراً قبل Commit التفعيل
//    د) النتيجة النهائية: صفر جلسات باقية للحساب القديم
// 4. اختبار الترتيب المعاكس:
//    أ) Activation يمسك القفل أولاً
//    ب) Login يصل للـ CAS وينتظر
//    ج) بعد Commit التفعيل، يستيقظ Login ويكتشف تغير الهاش فيرفض إنشاء أي جلسة
// ==============================================================================

import { Pool, Client } from 'pg';
import bcrypt from 'bcryptjs';
import { createHmac } from 'node:crypto';
import dotenv from 'dotenv';
import { executeActivationTransaction } from './activation-core.mjs';

dotenv.config({ path: '.env.staging.local', quiet: true });

const APPROVED_STAGING_PREFIX = 'ep-ancient-hill-beec491j';
const FORBIDDEN_TARGETS = ['ep-soft-dawn-bdu5de43', 'ep-withered-bread-bemwq8ns'];
const STAGING_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!STAGING_URL || !STAGING_URL.includes(APPROVED_STAGING_PREFIX) || !SESSION_SECRET) {
  console.error(`[FATAL] Concurrency audit must strictly run on approved Staging database (${APPROVED_STAGING_PREFIX}) with valid environment variables!`);
  process.exit(1);
}
for (const forbidden of FORBIDDEN_TARGETS) {
  if (STAGING_URL.includes(forbidden)) {
    console.error(`[FATAL] Concurrency audit refused: database matches forbidden target: ${forbidden}`);
    process.exit(1);
  }
}

function hashToken(raw) {
  return createHmac('sha256', SESSION_SECRET).update(raw).digest('hex');
}

const TEST_ID = '99999999-9999-4999-a999-999999999999';
const TEST_EMAIL = 'critical-concurrency@naqer-menu.local';
const P_INITIAL = 'InitialOwnerPass123!';
const P_ACTIVATION = 'test1234';

async function main() {
  console.log('================================================================');
  console.log(' [CRITICAL CONCURRENCY AUDIT] Login vs Activation Transactions');
  console.log(` Target DB: ${STAGING_URL.split('@')[1]?.split('/')[0]}`);
  console.log('================================================================\n');

  const pool = new Pool({ connectionString: STAGING_URL });
  const clientLogin = new Client({ connectionString: STAGING_URL });
  const clientActivation = new Client({ connectionString: STAGING_URL });

  await clientLogin.connect();
  await clientActivation.connect();

  async function resetUser() {
    const pHash = await bcrypt.hash(P_INITIAL, 10);
    await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [TEST_ID]);
    await pool.query('DELETE FROM "AdminUser" WHERE id = $1', [TEST_ID]);
    await pool.query(
      `INSERT INTO "AdminUser" (id, email, "displayName", role, "isActive", "mustChangePassword", "passwordHash", "createdAt", "updatedAt")
       VALUES ($1, $2, 'Critical QA Admin', 'OWNER', true, false, $3, now(), now())`,
      [TEST_ID, TEST_EMAIL, pHash]
    );
  }

  try {
    // =========================================================================
    // PART 1: LOGIN STARTS FIRST, ACTIVATION BLOCKS ON ROW LOCK, THEN PURGES S1
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('PART 1: Login holds row lock -> Activation BLOCKS -> Login commits S1 -> Activation wakes up and PURGES S1');
    console.log('----------------------------------------------------------------');
    await resetUser();

    // 1. Fetch user to verify credentials
    const initialUser = (await pool.query('SELECT * FROM "AdminUser" WHERE id = $1', [TEST_ID])).rows[0];
    const passOk = await bcrypt.compare(P_INITIAL, initialUser.passwordHash);
    if (!passOk) throw new Error('Setup password verification failed');

    console.log('  [Step 1] Client Login begins transaction and acquires row lock via CAS...');
    await clientLogin.query('BEGIN');
    const loginCas = await clientLogin.query(
      'UPDATE "AdminUser" SET "lastLoginAt" = now() WHERE id = $1 AND "passwordHash" = $2 AND "isActive" = true',
      [initialUser.id, initialUser.passwordHash]
    );
    if (loginCas.rowCount !== 1) throw new Error('Login CAS failed unexpectedly');
    console.log('  ✔ Client Login holds exclusive row lock on AdminUser.');

    // 2. Client Activation attempts executeActivationTransaction concurrently
    console.log('  [Step 2] Client Activation initiates transaction with executeActivationTransaction...');
    await clientActivation.query('BEGIN');

    let activationBlocked = true;
    const activationPromise = (async () => {
      console.log('    ⏳ Client Activation: executing executeActivationTransaction (waiting for lock)...');
      const actResult = await executeActivationTransaction(clientActivation, {
        targetEmail: TEST_EMAIL,
        expectedAccountId: TEST_ID,
        expectedRole: 'OWNER',
        targetPassword: P_ACTIVATION,
        bcryptRounds: 10,
        onLockAcquired: () => {
          activationBlocked = false;
          console.log('    ⚡ Client Activation: lock acquired inside executeActivationTransaction!');
        },
      });
      console.log(`    🗑️  Client Activation: purged ${actResult.deletedSessionsCount} session(s) before COMMIT.`);
      await clientActivation.query('COMMIT');
      console.log('    ✔ Client Activation: transaction COMMITTED successfully.');
    })();

    // 3. Verify that Activation is genuinely blocked by the database engine
    await new Promise((r) => setTimeout(r, 200));
    if (!activationBlocked) {
      throw new Error('FAILURE: Client Activation was NOT blocked by row lock! Lock serialization failed.');
    }
    console.log('  ✔ VERIFIED: Client Activation is confirmed BLOCKED waiting on PostgreSQL row lock.');

    // 4. Client Login completes session insertion while Activation is blocked
    console.log('  [Step 3] Client Login inserts new Session (S1) and COMMITS...');
    const tokHash1 = hashToken('token_login_1');
    await clientLogin.query(
      'INSERT INTO "Session" (id, "adminId", "tokenHash", "expiresAt", "createdAt") VALUES (gen_random_uuid(), $1, $2, now() + interval \'30 days\', now())',
      [TEST_ID, tokHash1]
    );
    await clientLogin.query('COMMIT');
    console.log('  ✔ Client Login COMMITTED S1. Lock released to Client Activation.');

    // 5. Wait for Client Activation to finish its unblocked work
    await activationPromise;

    // 6. Verification: How many sessions survive?
    const survivingSessions = (await pool.query('SELECT count(*)::int as cnt FROM "Session" WHERE "adminId" = $1', [TEST_ID])).rows[0].cnt;
    const finalUser = (await pool.query('SELECT "mustChangePassword", "passwordHash" FROM "AdminUser" WHERE id = $1', [TEST_ID])).rows[0];

    console.log(`  [Audit Results] Surviving Sessions in DB: ${survivingSessions}`);
    console.log(`  [Audit Results] mustChangePassword: ${finalUser.mustChangePassword}`);

    if (survivingSessions !== 0) {
      throw new Error(`CRITICAL FAILURE: ${survivingSessions} session(s) survived after activation!`);
    }
    if (!finalUser.mustChangePassword) {
      throw new Error('CRITICAL FAILURE: mustChangePassword was not set to true!');
    }
    const finalPassValid = await bcrypt.compare(P_ACTIVATION, finalUser.passwordHash);
    if (!finalPassValid) {
      throw new Error('CRITICAL FAILURE: Activated password hash does not match target password!');
    }
    console.log('  🎉 PART 1 PASSED: Activation successfully waited for Login, unblocked, and purged S1 before committing!\n');

    // =========================================================================
    // PART 2: ACTIVATION STARTS FIRST, LOGIN CAS FAILS UPON UNBLOCKING (0 SESSIONS)
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('PART 2: Activation holds lock -> Login CAS waits -> Activation commits -> Login CAS returns 0 -> 0 Sessions');
    console.log('----------------------------------------------------------------');
    await resetUser();

    const uBeforeAct = (await pool.query('SELECT * FROM "AdminUser" WHERE id = $1', [TEST_ID])).rows[0];

    console.log('  [Step 1] Client Activation begins transaction and acquires lock with executeActivationTransaction...');
    await clientActivation.query('BEGIN');

    let activationLockAcquired = false;
    let releaseActivationLock = null;
    const lockWaitPromise = new Promise((resolve) => { releaseActivationLock = resolve; });

    const actPromise2 = executeActivationTransaction(clientActivation, {
      targetEmail: TEST_EMAIL,
      expectedAccountId: TEST_ID,
      expectedRole: 'OWNER',
      targetPassword: P_ACTIVATION,
      bcryptRounds: 10,
      onLockAcquired: async () => {
        activationLockAcquired = true;
        console.log('  ✔ Client Activation holds exclusive row lock open.');
        await lockWaitPromise;
      },
    });

    while (!activationLockAcquired) {
      await new Promise((r) => setTimeout(r, 50));
    }

    console.log('  [Step 2] Client Login attempts CAS with OLD passwordHash...');
    let loginBlocked = true;
    let loginCasRows = -1;
    const loginPromise = (async () => {
      console.log('    ⏳ Client Login: executing CAS UPDATE (waiting for Activation lock)...');
      await clientLogin.query('BEGIN');
      const res = await clientLogin.query(
        'UPDATE "AdminUser" SET "lastLoginAt" = now() WHERE id = $1 AND "passwordHash" = $2 AND "isActive" = true',
        [TEST_ID, uBeforeAct.passwordHash]
      );
      loginBlocked = false;
      loginCasRows = res.rowCount;
      console.log(`    ⚡ Client Login: unblocked! CAS matched rows = ${loginCasRows}.`);
      if (loginCasRows === 1) {
        await clientLogin.query(
          'INSERT INTO "Session" (id, "adminId", "tokenHash", "expiresAt", "createdAt") VALUES (gen_random_uuid(), $1, $2, now() + interval \'30 days\', now())',
          [TEST_ID, hashToken('token_login_survived')]
        );
      }
      await clientLogin.query('COMMIT');
    })();

    // Verify Login is blocked
    await new Promise((r) => setTimeout(r, 200));
    if (!loginBlocked) {
      throw new Error('FAILURE: Client Login was NOT blocked by Activation row lock!');
    }
    console.log('  ✔ VERIFIED: Client Login is confirmed BLOCKED waiting for Activation to commit.');

    // Now release Activation to finish updating passwordHash and purge sessions
    console.log('  [Step 3] Releasing Activation to finish and COMMIT...');
    releaseActivationLock();
    await actPromise2;
    await clientActivation.query('COMMIT');
    console.log('  ✔ Client Activation COMMITTED.');

    // Await Login to unblock and process
    await loginPromise;

    if (loginCasRows !== 0) {
      throw new Error(`CRITICAL FAILURE: Login CAS matched ${loginCasRows} rows instead of 0!`);
    }

    const postActSessions = (await pool.query('SELECT count(*)::int as cnt FROM "Session" WHERE "adminId" = $1', [TEST_ID])).rows[0].cnt;
    console.log(`  [Audit Results] Sessions created by Client Login: ${postActSessions}`);
    if (postActSessions !== 0) {
      throw new Error('CRITICAL FAILURE: Session was created after password hash changed!');
    }
    console.log('  🎉 PART 2 PASSED: Login CAS rejected stale hash upon unblocking, creating ZERO sessions!\n');

    // =========================================================================
    // CLEANUP
    // =========================================================================
    await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [TEST_ID]);
    await pool.query('DELETE FROM "AdminUser" WHERE id = $1', [TEST_ID]);
    console.log('✔ Cleaned up temporary test user from Staging DB.');
    console.log('================================================================');
    console.log('🏆 ALL CRITICAL CONCURRENCY SCENARIOS VERIFIED 100% SUCCESSFUL!');
    console.log('================================================================');
  } finally {
    await clientLogin.end();
    await clientActivation.end();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\n❌ CRITICAL CONCURRENCY AUDIT FAILED:', err);
  process.exit(1);
});
