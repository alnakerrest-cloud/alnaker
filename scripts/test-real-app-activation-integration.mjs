// scripts/test-real-app-activation-integration.mjs
// ==============================================================================
// REAL APPLICATION INTEGRATION TEST: Next.js Server Action + Activation Core
// ==============================================================================

import { chromium } from 'playwright';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { executeActivationTransaction } from './activation-core.mjs';

dotenv.config({ path: '.env.staging.local', quiet: true });

const EXPECTED_STAGING_HOST = 'ep-soft-dawn-bdu5de43-pooler.c-8.us-east-2.aws.neon.tech';
const databaseUrl = process.env.DATABASE_URL;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3001';

if (!databaseUrl || !databaseUrl.includes(EXPECTED_STAGING_HOST)) {
  console.error('[FATAL] Real Integration Test must strictly run on Staging database!');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl, ssl: true });

const INTEGRATION_USER = {
  id: 'b0000000-0000-0000-0000-000000000099',
  email: 'real-app-integration@naqer-menu.local',
  passwordInitial: 'InitialPassword123!',
  passwordActivated: 'ActivatedPassword123!',
  role: 'OWNER',
};

async function resetTestUser() {
  const hash = await bcrypt.hash(INTEGRATION_USER.passwordInitial, 10);
  await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [INTEGRATION_USER.id]);
  await pool.query('DELETE FROM "AdminUser" WHERE id = $1', [INTEGRATION_USER.id]);
  await pool.query(
    `INSERT INTO "AdminUser" (id, email, "displayName", role, "isActive", "mustChangePassword", "passwordHash", "createdAt", "updatedAt")
     VALUES ($1, $2, 'Real Integration Admin', $3, true, false, $4, now(), now())`,
    [INTEGRATION_USER.id, INTEGRATION_USER.email, INTEGRATION_USER.role, hash]
  );
}

async function runRealIntegrationSuite() {
  console.log('================================================================');
  console.log(' [REAL APPLICATION INTEGRATION AUDIT] Server Action + Activation Core');
  console.log(` Target Site URL : ${BASE_URL}`);
  console.log(` Staging Database: ${EXPECTED_STAGING_HOST}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // =========================================================================
    // SCENARIO 1: Real Login Completes First -> Activation Purges Session & Evicts Browser
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('SCENARIO 1: Real Login lands on Dashboard -> Activation runs -> Session Purged -> Browser Evicted');
    console.log('----------------------------------------------------------------');
    await resetTestUser();

    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // 1. Perform Real Login via UI & Server Action
    console.log('  [Step 1] Submitting real Login via Next.js Server Action...');
    await page1.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await page1.fill('input[name="email"]', INTEGRATION_USER.email);
    await page1.fill('input[name="password"]', INTEGRATION_USER.passwordInitial);
    await page1.click('button[type="submit"]');

    await page1.waitForURL('**/admin/dashboard', { timeout: 10000 });
    console.log('  ✔ Real Login succeeded and landed on /admin/dashboard.');

    // 2. Verify Session exists in DB
    const dbSess1 = (await pool.query('SELECT count(*)::int as cnt FROM "Session" WHERE "adminId" = $1', [INTEGRATION_USER.id])).rows[0].cnt;
    console.log(`  ✔ DB Verified: Exactly ${dbSess1} session row created by createAtomicLoginSession.`);
    if (dbSess1 !== 1) throw new Error(`Expected 1 session in DB, got: ${dbSess1}`);

    // 3. Run executeActivationTransaction concurrently
    console.log('  [Step 2] Executing executeActivationTransaction on same account...');
    const clientAct1 = await pool.connect();
    try {
      await clientAct1.query('BEGIN');
      const actRes1 = await executeActivationTransaction(clientAct1, {
        targetEmail: INTEGRATION_USER.email,
        expectedAccountId: INTEGRATION_USER.id,
        expectedRole: 'OWNER',
        targetPassword: INTEGRATION_USER.passwordActivated,
        bcryptRounds: 10,
      });
      await clientAct1.query('COMMIT');
      console.log(`  ✔ Activation committed. Purged ${actRes1.deletedSessionsCount} session(s).`);
    } finally {
      clientAct1.release();
    }

    // 4. Verify DB state after Activation
    const dbSessAfterAct1 = (await pool.query('SELECT count(*)::int as cnt FROM "Session" WHERE "adminId" = $1', [INTEGRATION_USER.id])).rows[0].cnt;
    const userAfterAct1 = (await pool.query('SELECT "mustChangePassword", "passwordHash", "isActive" FROM "AdminUser" WHERE id = $1', [INTEGRATION_USER.id])).rows[0];

    console.log(`  [DB Audit] Remaining sessions in DB: ${dbSessAfterAct1}`);
    console.log(`  [DB Audit] mustChangePassword: ${userAfterAct1.mustChangePassword}`);
    console.log(`  [DB Audit] isActive: ${userAfterAct1.isActive}`);

    if (dbSessAfterAct1 !== 0) throw new Error(`FAILURE: ${dbSessAfterAct1} sessions survived after activation!`);
    if (!userAfterAct1.mustChangePassword) throw new Error('FAILURE: mustChangePassword was not set to true!');
    const passMatchesAct = await bcrypt.compare(INTEGRATION_USER.passwordActivated, userAfterAct1.passwordHash);
    if (!passMatchesAct) throw new Error('FAILURE: passwordHash does not match activated password!');

    // 5. Verify Browser is evicted upon next navigation
    console.log('  [Step 3] Browser attempts navigation to protected /admin/products...');
    await page1.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle' });
    const evictedUrl = page1.url();
    if (!evictedUrl.includes('/admin/login')) {
      throw new Error(`CRITICAL SECURITY FAILURE: Browser was NOT evicted! Current URL: ${evictedUrl}`);
    }
    console.log('  ✔ VERIFIED: Browser with old session was instantly evicted and redirected to /admin/login.');
    console.log('  🎉 SCENARIO 1 100% PASSED!\n');

    await context1.close();

    // =========================================================================
    // SCENARIO 2: Activation Holds Lock -> Real Login Attempt Blocks & Fails CAS
    // =========================================================================
    console.log('----------------------------------------------------------------');
    console.log('SCENARIO 2: Activation holds lock -> Real Login blocks -> Activation commits -> Real Login CAS fails (0 sessions)');
    console.log('----------------------------------------------------------------');
    await resetTestUser();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Prepare login page in browser
    await page2.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await page2.fill('input[name="email"]', INTEGRATION_USER.email);
    await page2.fill('input[name="password"]', INTEGRATION_USER.passwordInitial);

    // Start Activation and acquire exclusive lock
    console.log('  [Step 1] Activation acquires row lock via executeActivationTransaction...');
    const clientAct2 = await pool.connect();
    let lockAcquired = false;
    let releaseLock = null;
    const lockWait = new Promise((resolve) => { releaseLock = resolve; });

    let actError = null;
    const actPromise2 = (async () => {
      try {
        await clientAct2.query('BEGIN');
        await executeActivationTransaction(clientAct2, {
          targetEmail: INTEGRATION_USER.email,
          expectedAccountId: INTEGRATION_USER.id,
          expectedRole: 'OWNER',
          targetPassword: INTEGRATION_USER.passwordActivated,
          bcryptRounds: 10,
          onLockAcquired: async () => {
            lockAcquired = true;
            console.log('  ✔ Activation holds exclusive row lock open.');
            await lockWait;
          },
        });
        await clientAct2.query('COMMIT');
        console.log('  ✔ Activation transaction committed successfully.');
      } catch (err) {
        actError = err;
        await clientAct2.query('ROLLBACK').catch(() => {});
      } finally {
        clientAct2.release();
      }
    })();

    while (!lockAcquired) {
      await new Promise((r) => setTimeout(r, 50));
    }

    // Submit Real Login form while Activation holds lock!
    console.log('  [Step 2] Submitting real login form while lock is held (Server Action will block on DB)...');
    const loginClickPromise = page2.click('button[type="submit"]');

    // Wait 300ms to ensure Next.js Server Action is actively blocked waiting on Postgres row lock
    await new Promise((r) => setTimeout(r, 300));
    console.log('  ✔ Server Action confirmed blocked waiting for row lock release.');

    // Release Activation lock to commit
    console.log('  [Step 3] Releasing Activation lock to complete and COMMIT...');
    releaseLock();
    await actPromise2;
    if (actError) throw actError;

    // Await Server Action response
    await loginClickPromise;

    // Verify Server Action rejected login with CAS mismatch error
    const errLocator = page2.locator('.admin-error');
    await errLocator.waitFor({ state: 'visible', timeout: 5000 });
    const errText = await errLocator.textContent();
    console.log(`  ✔ Real Server Action returned expected error: "${errText}"`);
    if (!errText?.includes('بيانات الدخول غير صحيحة')) {
      throw new Error(`Unexpected error message from Server Action: "${errText}"`);
    }

    // Verify DB: Exactly 0 sessions created
    const postActSessions = (await pool.query('SELECT count(*)::int as cnt FROM "Session" WHERE "adminId" = $1', [INTEGRATION_USER.id])).rows[0].cnt;
    const finalUserState = (await pool.query('SELECT "mustChangePassword", "passwordHash", "isActive" FROM "AdminUser" WHERE id = $1', [INTEGRATION_USER.id])).rows[0];

    console.log(`  [DB Audit] Final session count: ${postActSessions}`);
    console.log(`  [DB Audit] mustChangePassword: ${finalUserState.mustChangePassword}`);
    console.log(`  [DB Audit] isActive: ${finalUserState.isActive}`);

    if (postActSessions !== 0) throw new Error(`CRITICAL FAILURE: ${postActSessions} session(s) created despite CAS failure!`);
    if (!finalUserState.mustChangePassword) throw new Error('FAILURE: mustChangePassword was not set to true!');
    const passMatchesAct2 = await bcrypt.compare(INTEGRATION_USER.passwordActivated, finalUserState.passwordHash);
    if (!passMatchesAct2) throw new Error('FAILURE: passwordHash does not match activated password!');

    console.log('  🎉 SCENARIO 2 100% PASSED!\n');

    await context2.close();

    // Cleanup test user
    await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [INTEGRATION_USER.id]);
    await pool.query('DELETE FROM "AdminUser" WHERE id = $1', [INTEGRATION_USER.id]);
    console.log('✔ Pristine cleanup of test user completed.');

    console.log('================================================================');
    console.log('🏆 REAL APPLICATION INTEGRATION TEST 100% VERIFIED SUCCESSFUL!');
    console.log('================================================================');
  } finally {
    await browser.close();
    await pool.end();
  }
}

runRealIntegrationSuite().catch((err) => {
  console.error('\n❌ REAL INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
